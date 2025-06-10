import { Router, Request, Response } from "express";
import { NostrEvent, AuthResponse } from "../types";
import {
  verifyEventSignature,
  validateAuthEvent,
  extractPermissions,
  extractAppName,
} from "../utils/nostr";
import { sessionStorage } from "../storage/sessions";

const router = Router();

// Get owner pubkey from environment
const OWNER_PUBKEY = process.env.OWNER_PUBKEY_HEX;

if (!OWNER_PUBKEY) {
  console.warn("WARNING: No OWNER_PUBKEY_HEX set in environment variables");
}

/**
 * POST /session - Create new session with Nostr auth
 */
router.post("/session", async (req: Request, res: Response) => {
  try {
    const event: NostrEvent = req.body;

    // Validate event structure
    if (
      !event ||
      !event.pubkey ||
      !event.sig ||
      !event.kind ||
      !Array.isArray(event.tags)
    ) {
      return res.status(400).json({
        error: "Invalid Nostr event",
        message: "Event must contain pubkey, sig, kind, and tags",
      });
    }

    // Ensure owner pubkey is configured
    if (!OWNER_PUBKEY) {
      return res.status(500).json({
        error: "Server configuration error",
        message: "Owner pubkey not configured",
      });
    }

    // Check if pubkey matches owner
    if (event.pubkey !== OWNER_PUBKEY) {
      return res.status(403).json({
        error: "Unauthorized",
        message: "Only the server owner can create sessions",
      });
    }

    // Verify signature
    if (!verifyEventSignature(event)) {
      return res.status(401).json({
        error: "Invalid signature",
        message: "Event signature verification failed",
      });
    }

    // Validate auth event for session creation
    const expectedUrl = `${req.protocol}://${req.get("host")}/auth/session`;
    if (!validateAuthEvent(event, expectedUrl, "POST")) {
      return res.status(400).json({
        error: "Invalid auth event",
        message: "Event does not match expected URL and method",
      });
    }

    // Extract permissions and app info
    const permissions = extractPermissions(event);
    const appName = extractAppName(event);

    // Create session
    const session = await sessionStorage.createSession(
      event.pubkey,
      permissions,
      appName
    );

    // Set session cookie
    res.cookie("hengdang_session", session.sessionId, {
      httpOnly: true,
      secure: req.protocol === "https",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const response: AuthResponse = {
      sessionId: session.sessionId,
      permissions: session.permissions,
      expiresAt: session.expiresAt,
    };

    res.status(201).json(response);
  } catch (error) {
    console.error("Session creation error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to create session",
    });
  }
});

/**
 * GET /session - Get current session info
 */
router.get("/session", async (req: Request, res: Response) => {
  try {
    const sessionId =
      req.cookies.hengdang_session ||
      req.headers.authorization?.replace("Bearer ", "");

    if (!sessionId) {
      return res.status(401).json({
        error: "No session",
        message: "No session cookie or authorization header found",
      });
    }

    const session = await sessionStorage.getSession(sessionId);
    if (!session) {
      return res.status(401).json({
        error: "Invalid session",
        message: "Session not found or expired",
      });
    }

    // Update last used
    await sessionStorage.updateLastUsed(sessionId);

    res.json({
      sessionId: session.sessionId,
      permissions: session.permissions,
      appName: session.appName,
      createdAt: session.createdAt,
      lastUsed: session.lastUsed,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error("Session retrieval error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to retrieve session",
    });
  }
});

/**
 * DELETE /session - Delete current session (logout)
 */
router.delete("/session", async (req: Request, res: Response) => {
  try {
    const sessionId =
      req.cookies.hengdang_session ||
      req.headers.authorization?.replace("Bearer ", "");

    if (!sessionId) {
      return res.status(401).json({
        error: "No session",
        message: "No session to delete",
      });
    }

    const deleted = await sessionStorage.deleteSession(sessionId);

    // Clear cookie
    res.clearCookie("hengdang_session");

    if (deleted) {
      res.status(204).end();
    } else {
      res.status(404).json({
        error: "Session not found",
        message: "Session was already deleted or expired",
      });
    }
  } catch (error) {
    console.error("Session deletion error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to delete session",
    });
  }
});

/**
 * GET /sessions - List all active sessions (for session management)
 */
router.get("/sessions", async (req: Request, res: Response) => {
  try {
    const sessionId =
      req.cookies.hengdang_session ||
      req.headers.authorization?.replace("Bearer ", "");

    if (!sessionId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Must be authenticated to list sessions",
      });
    }

    const currentSession = await sessionStorage.getSession(sessionId);
    if (!currentSession) {
      return res.status(401).json({
        error: "Invalid session",
        message: "Current session not found or expired",
      });
    }

    // Get all sessions for the owner
    const sessions = await sessionStorage.getSessionsForPubkey(
      currentSession.pubkey
    );

    const sessionList = sessions.map((session) => ({
      sessionId: session.sessionId,
      appName: session.appName,
      permissions: session.permissions,
      createdAt: session.createdAt,
      lastUsed: session.lastUsed,
      expiresAt: session.expiresAt,
      isCurrent: session.sessionId === currentSession.sessionId,
    }));

    res.json({ sessions: sessionList });
  } catch (error) {
    console.error("Sessions listing error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to list sessions",
    });
  }
});

/**
 * DELETE /sessions/:sessionId - Revoke a specific session
 */
router.delete("/sessions/:sessionId", async (req: Request, res: Response) => {
  try {
    const currentSessionId =
      req.cookies.hengdang_session ||
      req.headers.authorization?.replace("Bearer ", "");
    const targetSessionId = req.params.sessionId;

    if (!currentSessionId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Must be authenticated to revoke sessions",
      });
    }

    const currentSession = await sessionStorage.getSession(currentSessionId);
    if (!currentSession) {
      return res.status(401).json({
        error: "Invalid session",
        message: "Current session not found or expired",
      });
    }

    // Get target session to verify ownership
    const targetSession = await sessionStorage.getSession(targetSessionId);
    if (!targetSession) {
      return res.status(404).json({
        error: "Session not found",
        message: "Target session does not exist",
      });
    }

    // Only allow revoking your own sessions
    if (targetSession.pubkey !== currentSession.pubkey) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Can only revoke your own sessions",
      });
    }

    const deleted = await sessionStorage.deleteSession(targetSessionId);

    if (deleted) {
      res.status(204).end();
    } else {
      res.status(404).json({
        error: "Session not found",
        message: "Session was already deleted",
      });
    }
  } catch (error) {
    console.error("Session revocation error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to revoke session",
    });
  }
});

export default router;
