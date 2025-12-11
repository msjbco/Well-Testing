'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen bg-[#1A1B2C] flex items-center justify-center p-4">
          <div className="bg-[#24253B] border border-[#2D2E47] rounded-lg shadow-lg p-8 max-w-md w-full text-white">
            <h2 className="text-2xl font-bold mb-4 text-[#FF6B35]">Something went wrong!</h2>
            <p className="text-gray-300 mb-6">{error.message || 'An unexpected error occurred'}</p>
            <button
              onClick={reset}
              className="w-full bg-[#FF6B35] hover:bg-[#e55a2b] text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
