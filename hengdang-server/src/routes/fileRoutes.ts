import { Router, Request, Response } from "express";
import { db } from "../db";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";

const router = Router();

interface EncryptedFilePayload {
  encryptedContent: string;
  encryptedMetadata: string;
  encryptedFileKey: string;
}

// POST /files endpoint to store encrypted file
router.post("/upload", async (req: Request, res: Response) => {
  const payload = req.body as EncryptedFilePayload;
  
  if (!payload.encryptedContent || !payload.encryptedMetadata || !payload.encryptedFileKey) {
    res.status(400).json({ error: "Missing required encrypted data" });
    return;
  }

  const fileId = randomUUID();
  const now = new Date().toISOString();
  const uploadsPath = path.join(__dirname, "..", "..", "uploads");

  try {
    // Save encrypted content
    const contentPath = path.join(uploadsPath, `${fileId}.content`);
    fs.writeFileSync(contentPath, Buffer.from(payload.encryptedContent, 'base64'));

    // Save encrypted metadata
    const metadataPath = path.join(uploadsPath, `${fileId}.metadata`);
    fs.writeFileSync(metadataPath, Buffer.from(payload.encryptedMetadata, 'base64'));

    // Save encrypted file key
    const keyPath = path.join(uploadsPath, `${fileId}.key`);
    fs.writeFileSync(keyPath, Buffer.from(payload.encryptedFileKey, 'base64'));

    // Store record in database
    await db
      .insertInto("files")
      .values({
        id: fileId,
        original_filename: fileId,
        stored_filename: fileId,
        size: Buffer.from(payload.encryptedContent, 'base64').length,
        uploaded_at: now,
      })
      .executeTakeFirst();

    res.status(200).json({ 
      message: "File stored successfully", 
      filename: fileId 
    });
    return;
  } catch (error) {
    console.error("Error storing file:", error);
    res.status(500).json({ error: "Internal Server Error" });
    return;
  }
});

// GET /files/:id endpoint to retrieve encrypted file
router.get("/files/:id", async (req: Request, res: Response) => {
  const fileId = req.params.id;
  const uploadsPath = path.join(__dirname, "..", "..", "uploads");

  try {
    // Check if file exists in database
    const fileRecord = await db
      .selectFrom("files")
      .selectAll()
      .where("id", "=", fileId)
      .executeTakeFirst();

    if (!fileRecord) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    // Read encrypted content
    const contentPath = path.join(uploadsPath, `${fileId}.content`);
    const encryptedContent = fs.readFileSync(contentPath).toString('base64');

    // Read encrypted metadata
    const metadataPath = path.join(uploadsPath, `${fileId}.metadata`);
    const encryptedMetadata = fs.readFileSync(metadataPath).toString('base64');

    // Read encrypted file key
    const keyPath = path.join(uploadsPath, `${fileId}.key`);
    const encryptedFileKey = fs.readFileSync(keyPath).toString('base64');

    res.status(200).json({
      encryptedContent,
      encryptedMetadata,
      encryptedFileKey
    });
  } catch (error) {
    console.error("Error retrieving file:", error);
    res.status(500).json({ error: "Internal Server Error" });
    return;
  }
});

export default router;
