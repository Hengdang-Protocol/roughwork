import React, { useState } from 'react';
import { Key, AlertCircle, Loader, ExternalLink, Github } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-2xl flex items-center justify-center">
            <Key size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Hengdang Drive</h1>
          <p className="text-blue-100 text-sm">
            Decentralized file storage for the future
          </p>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          <div className="text-center mb-6">
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              Sign in with your Nostr extension to access your personal cloud storage. 
              Your files are stored securely and only you have access.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 mb-6 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle size={20} className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-red-700 dark:text-red-300 text-sm">{error}</div>
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg disabled:transform-none disabled:shadow-none flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <Loader size={20} className="animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Key size={20} />
                <span>Sign in with Nostr</span>
              </>
            )}
          </button>

          <div className="mt-6">
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
              Don't have a Nostr extension yet?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <a 
                href="https://getalby.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
              >
                <ExternalLink size={16} />
                Alby
              </a>
              <a 
                href="https://chromewebstore.google.com/detail/nos2x/kpgefcfmnafjgpblomihpgmejjdanjjp" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
              >
                <ExternalLink size={16} />
                nos2x
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-8 py-4 bg-gray-50 dark:bg-gray-900/50">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Powered by
            </p>
            <div className="flex items-center justify-center gap-6">
              <a 
                href="https://github.com/nostr-protocol/nips" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <Github size={14} />
                <span className="font-medium">Nostr</span>
              </a>
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
              <a 
                href="https://github.com/Hengdang-Protocol/hips" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <Github size={14} />
                <span className="font-medium">Hengdang</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
