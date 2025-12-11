'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, supabase } from '@/lib/supabase';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push('/login');
      } else {
        setUser(currentUser);
        setLoading(false);
        // Redirect to field tech home
        router.replace('/field-tech');
        return;
      }
    }
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success('Logged out successfully');
      router.push('/login');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to logout');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1B2C] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#24253B] border border-[#2D2E47] text-white p-6 rounded-lg shadow-lg mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">Peak to Plains Field App</h1>
              <p className="text-lg text-gray-400">Welcome, {user?.email || 'Technician'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white px-4 py-2 rounded-lg font-semibold transition-colors text-sm sm:text-base"
              aria-label="Logout"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="bg-[#24253B] rounded-lg shadow-md p-6 mb-6 border border-[#2D2E47]">
          <h2 className="text-2xl font-bold text-white mb-4">Quick Access</h2>
          <div className="space-y-4">
            <div className="border-2 border-[#2D2E47] rounded-lg p-4 hover:border-[#FF6B35] transition-colors">
              <h3 className="text-lg font-semibold text-white mb-2">Flow Entry</h3>
              <p className="text-gray-400 mb-4">
                Enter flow rate readings for a job. You'll need a job ID to access this page.
              </p>
              <p className="text-sm text-gray-500 mb-2">
                URL format: <code className="bg-[#1A1B2C] px-2 py-1 rounded text-gray-300">/field-tech/[jobId]/flow-entry</code>
              </p>
              <p className="text-sm text-gray-500">
                Example: <code className="bg-[#1A1B2C] px-2 py-1 rounded text-gray-300">/field-tech/123/flow-entry</code>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#24253B] border-l-4 border-[#FF6B35] p-4 rounded border border-[#2D2E47]">
          <p className="text-gray-300">
            <strong>Note:</strong> To test the flow entry page, you'll need:
          </p>
          <ul className="list-disc list-inside text-gray-400 mt-2 space-y-1">
            <li>A job ID from your <code className="bg-[#1A1B2C] px-1 rounded text-gray-300">jobs</code> table in Supabase</li>
            <li>Navigate to: <code className="bg-[#1A1B2C] px-1 rounded text-gray-300">/field-tech/[your-job-id]/flow-entry</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
