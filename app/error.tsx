'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#1A1B2C] flex items-center justify-center p-4">
      <div className="bg-[#24253B] border border-[#2D2E47] rounded-lg shadow-lg p-8 max-w-md w-full text-white">
        <h2 className="text-2xl font-bold mb-4 text-[#FF6B35]">Something went wrong!</h2>
        <p className="text-gray-300 mb-6">{error.message || 'An unexpected error occurred'}</p>
        <div className="flex gap-4">
          <button
            onClick={reset}
            className="flex-1 bg-[#FF6B35] hover:bg-[#e55a2b] text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.href = '/field-tech'}
            className="flex-1 bg-[#2D2E47] hover:bg-[#3A3B5A] text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
