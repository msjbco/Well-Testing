'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect root to admin website (main website)
    // The admin website HTML files are in public/ folder
    // They're accessible at /index.html, /admin-dashboard.html, etc.
    // For root, redirect to index.html (the main marketing site)
    if (typeof window !== 'undefined') {
      window.location.href = '/index.html';
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-xl text-gray-600">Redirecting to main website...</div>
    </div>
  );
}
