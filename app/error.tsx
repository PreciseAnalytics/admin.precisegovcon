'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-900 via-slate-900 to-orange-900 px-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-red-500/50">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-red-100/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">
              Something went wrong!
            </h1>
            <p className="text-slate-400 text-sm">
              {error.message || 'An unexpected error occurred'}
            </p>
          </div>

          <button
            onClick={reset}
            className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>

          <p className="text-xs text-slate-500 text-center mt-6">
            If the problem persists, please contact support at support@precisegovcon.com
          </p>
        </div>
      </div>
    </div>
  );
}
