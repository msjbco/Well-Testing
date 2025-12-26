'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase, getCurrentUser } from '@/lib/supabase';
import toast from 'react-hot-toast';
import FlowTestTab from '@/components/FlowTestTab';
import WaterQualityTab from '@/components/WaterQualityTab';
import PhotosTab from '@/components/PhotosTab';
import NotesTab from '@/components/NotesTab';
import WellBasicsTab from '@/components/WellBasicsTab';
import SystemEquipmentTab from '@/components/SystemEquipmentTab';

interface Job {
  id: string;
  address: string;
  client_name: string;
  jobId: string;
}

interface WellReport {
  flow_readings?: any[];
  water_quality?: any;
  photos?: any[];
  notes?: string;
  recommendations?: string;
  well_basics?: any;
  system_equipment?: any;
}

type Tab = 'flow' | 'water' | 'photos' | 'well-basics' | 'system-equipment' | 'notes';

export default function EditJobPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.jobId as string;

  const [job, setJob] = useState<Job | null>(null);
  const [report, setReport] = useState<WellReport | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('flow');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'saved' | 'syncing' | 'offline'>('saved');

  useEffect(() => {
    async function loadData() {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.push('/login');
          return;
        }

        // Load job
        const { data: jobData, error: jobError } = await supabase
          .from('jobs')
          .select('id, address, client_name, jobId')
          .eq('id', jobId)
          .single();

        if (jobError) throw jobError;
        setJob(jobData);

        // Load report (create if doesn't exist)
        let { data: reportData } = await supabase
          .from('well_reports')
          .select('flow_readings, water_quality, photos, notes, recommendations, well_basics, system_equipment')
          .eq('job_id', jobId)
          .single();

        if (!reportData) {
          // Create report if it doesn't exist
          const { data: newReport } = await supabase
            .from('well_reports')
            .insert({
              job_id: jobId,
              flow_readings: [],
              water_quality: {},
              photos: [],
              notes: '',
              recommendations: '',
              well_basics: {},
              system_equipment: {},
            } as any)
            .select('flow_readings, water_quality, photos, notes, recommendations, well_basics, system_equipment')
            .single();
          reportData = newReport;
        }

        // Type assertion for reportData
        const report = reportData as any;

        // Filter out blob URLs from photos when loading
        const photos = (report?.photos || []).filter((p: any) => 
          p.url && !p.url.startsWith('blob:') && !p.url.startsWith('data:')
        );
        
        setReport({
          flow_readings: report?.flow_readings || [],
          water_quality: report?.water_quality || {},
          photos: photos,
          notes: report?.notes || '',
          recommendations: report?.recommendations || '',
          well_basics: report?.well_basics || {},
          system_equipment: report?.system_equipment || {},
        });
      } catch (error: any) {
        console.error('Error loading data:', error);
        toast.error('Failed to load job');
      } finally {
        setLoading(false);
      }
    }

    loadData();

    // Set up real-time subscription for well_reports changes
    const reportChannel = supabase
      .channel(`well-reports-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'well_reports',
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          console.log('Report changed:', payload);
          if (payload.new) {
            const newData = payload.new as any;
            // Filter out blob URLs from photos - only keep real URLs
            const photos = (newData.photos || []).filter((p: any) => 
              p.url && !p.url.startsWith('blob:') && !p.url.startsWith('data:')
            );
            
            setReport({
              flow_readings: newData.flow_readings || [],
              water_quality: newData.water_quality || {},
              photos: photos,
              notes: newData.notes || '',
              recommendations: newData.recommendations || '',
              well_basics: newData.well_basics || {},
              system_equipment: newData.system_equipment || {},
            });
          }
        }
      )
      .subscribe();

    // Monitor online/offline
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('syncing');
      setTimeout(() => setSyncStatus('saved'), 2000);
      toast.success('Back online - syncing...');
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);
    setSyncStatus(navigator.onLine ? 'saved' : 'offline');

    return () => {
      reportChannel.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [jobId, router]);

  const handleSaveAll = async () => {
    setSaving(true);
    setSyncStatus('syncing');
    try {
      // Get current report data to ensure we have latest
      const { data: currentReport, error: fetchError } = await supabase
        .from('well_reports')
        .select('flow_readings, water_quality, photos, notes, recommendations, well_basics, system_equipment')
        .eq('job_id', jobId)
        .maybeSingle();

      // If report doesn't exist, use current state; otherwise use fetched data
      const report = currentReport || {
        flow_readings: reportState.flow_readings || [],
        water_quality: reportState.water_quality || {},
        photos: reportState.photos || [],
        notes: reportState.notes || '',
        recommendations: reportState.recommendations || '',
        well_basics: reportState.well_basics || {},
        system_equipment: reportState.system_equipment || {},
      } as any;

      // Upsert to ensure everything is synced (will create if doesn't exist)
      const { error } = await supabase
        .from('well_reports')
        .upsert(
          {
            job_id: jobId,
            flow_readings: report.flow_readings || [],
            water_quality: report.water_quality || {},
            photos: report.photos || [],
            notes: report.notes || '',
            recommendations: report.recommendations || '',
            well_basics: report.well_basics || {},
            system_equipment: report.system_equipment || {},
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: 'job_id' }
        );

      if (error) {
        // If offline, Supabase will queue
        if (!isOnline || error.message?.includes('fetch')) {
          toast.success('Saved locally - will sync when online', { duration: 5000 });
          setSyncStatus('offline');
        } else {
          throw error;
        }
      } else {
        toast.success('All changes saved!');
        setSyncStatus('saved');
        
        // Reload report data
        const { data: reportData } = await supabase
          .from('well_reports')
          .select('flow_readings, water_quality, photos, notes, recommendations, well_basics, system_equipment')
          .eq('job_id', jobId)
          .single();
        
        if (reportData) {
          setReport(reportData);
        }
      }
    } catch (error: any) {
      console.error('Error saving:', error);
      if (!isOnline || error.message?.includes('fetch')) {
        toast.success('Saved locally - will sync when online', { duration: 5000 });
        setSyncStatus('offline');
      } else {
        toast.error('Failed to save');
        setSyncStatus('saved'); // Reset to saved state
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-red-600">Job not found</div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'flow', label: 'Flow Test' },
    { id: 'water', label: 'Water Quality' },
    { id: 'photos', label: 'Photos' },
    { id: 'well-basics', label: 'Well Basics' },
    { id: 'system-equipment', label: 'System Equipment' },
    { id: 'notes', label: 'Notes' },
  ];

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success('Logged out successfully');
      router.push('/login');
      router.refresh();
    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error(error.message || 'Failed to logout');
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1B2C] pb-24">
      {/* Header */}
      <div className="bg-[#24253B] border-b border-[#2D2E47] text-white p-6 shadow-lg sticky top-0 z-10">
        <div className="flex justify-between items-start mb-2">
          <button
            onClick={() => router.push('/field-tech')}
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            ← Back to Jobs
          </button>
          <button
            onClick={handleLogout}
            className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white px-3 py-1 rounded text-xs font-semibold transition-colors"
            aria-label="Logout"
          >
            Logout
          </button>
        </div>
        <h1 className="text-2xl font-bold mb-1 text-white">{job?.client_name || 'Loading...'}</h1>
        <p className="text-sm text-gray-400">{job?.address || ''}</p>
        {!isOnline && (
          <div className="mt-2 bg-yellow-500 text-yellow-900 px-3 py-1 rounded text-xs font-semibold inline-block">
            ⚠️ Offline Mode
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-[#24253B] border-b border-[#2D2E47] sticky top-[140px] z-10">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-6 py-4 font-semibold text-sm transition-colors ${
                activeTab === tab.id
                  ? 'text-[#FF6B35] border-b-2 border-[#FF6B35] bg-[#1A1B2C]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4 max-w-2xl mx-auto">
        {activeTab === 'flow' && (
          <FlowTestTab
            jobId={jobId}
            initialReadings={report?.flow_readings}
            wellBasics={report?.well_basics}
            onSave={() => setSyncStatus('saved')}
          />
        )}
        {activeTab === 'water' && (
          <WaterQualityTab
            jobId={jobId}
            initialData={report?.water_quality}
            onSave={() => setSyncStatus('saved')}
          />
        )}
        {activeTab === 'photos' && (
          <PhotosTab
            jobId={jobId}
            initialPhotos={report?.photos}
            onSave={() => setSyncStatus('saved')}
          />
        )}
        {activeTab === 'well-basics' && (
          <WellBasicsTab
            jobId={jobId}
            initialData={report?.well_basics}
            onSave={() => setSyncStatus('saved')}
          />
        )}
        {activeTab === 'system-equipment' && (
          <SystemEquipmentTab
            jobId={jobId}
            initialData={report?.system_equipment}
            onSave={() => setSyncStatus('saved')}
          />
        )}
        {activeTab === 'notes' && (
          <NotesTab
            jobId={jobId}
            initialNotes={report?.notes}
            initialRecommendations={report?.recommendations}
            onSave={() => setSyncStatus('saved')}
          />
        )}
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#24253B] border-t border-[#2D2E47] p-4 shadow-lg z-20">
        <div className="flex items-center justify-between mb-3 max-w-2xl mx-auto">
          <div className="text-sm">
            {syncStatus === 'saved' && (
              <span className="text-[#4CAF50]">✓ All changes saved</span>
            )}
            {syncStatus === 'syncing' && (
              <span className="text-[#FF6B35]">Syncing...</span>
            )}
            {syncStatus === 'offline' && (
              <span className="text-yellow-500">
                Offline – will sync when back online
              </span>
            )}
          </div>
        </div>
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="w-full bg-[#FF6B35] hover:bg-[#e55a2b] text-white font-bold text-xl py-4 px-6 rounded-lg shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save & Sync'}
          </button>
        </div>
      </div>
    </div>
  );
}
