import React, { useState } from 'react';
import { Key, AlertCircle, Loader } from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => Promise<void>;
  error?: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, error }) => {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await onLogin();
    } catch (error) {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-6">
      <div className="card max-w-md w-full text-center">
        <div className="mb-6">
          <Key size={48} className="mx-auto mb-4 text-accent" />
          <h1 className="text-2xl font-bold mb-2">Hengdang Drive</h1>
          <p className="text-secondary">
            Sign in with your Nostr extension to access your files
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-error/10 text-error border border-error/20 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="btn btn-primary w-full"
        >
          {loading ? (
            <>
              <Loader size={16} className="animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <Key size={16} />
              Sign in with Nostr
            </>
          )}
        </button>

        <div className="mt-4 text-sm text-muted">
          <p>Need a Nostr extension?</p>
          <div className="flex gap-2 justify-center mt-2">
            <a 
              href="https://getalby.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Alby
            </a>
            <span>•</span>
            <a 
              href="https://chromewebstore.google.com/detail/nos2x/kpgefcfmnafjgpblomihpgmejjdanjjp" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              nos2x
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
