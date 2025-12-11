'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, getCurrentUser } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Job {
  id: string;
  address: string;
  client_name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
  role?: string;
  notes?: string;
  wellPermitNumber?: string;
  hasCistern?: string;
  equipmentInspection?: string;
  willBePresent?: string;
  accessInstructions?: string;
  scheduledDate?: string;
  created_at: string;
  status: string;
  assigned_tech_id?: string;
  archived?: boolean;
}

interface JobWithStatus extends Job {
  statusBadge?: { text: string; color: string };
}

export default function FieldTechHomePage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [notesPopup, setNotesPopup] = useState<{ jobId: string; notes: string } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.push('/login');
          return;
        }

        setUserId(user.id);

        // Load jobs assigned to this tech (or all if admin)
        const { data: jobsData, error: jobsError } = await supabase
          .from('jobs')
          .select('id, address, client_name, firstName, lastName, email, phone, city, state, zip, county, role, notes, wellPermitNumber, hasCistern, equipmentInspection, willBePresent, accessInstructions, scheduledDate, created_at, status, assigned_tech_id, archived')
          .order('created_at', { ascending: false });

        if (jobsError) throw jobsError;

        // Filter incomplete, non-archived jobs assigned to this tech
        const incompleteJobs = jobsData?.filter(
          (job) =>
            !job.archived && // Exclude archived jobs
            job.status !== 'completed' &&
            (job.assigned_tech_id === user.id || !job.assigned_tech_id)
        ) || [];

        // Load status badges for each job
        const jobsWithStatus: JobWithStatus[] = [];
        for (const job of incompleteJobs) {
          const badge = await getStatusBadge(job as Job);
          jobsWithStatus.push({ ...job, statusBadge: badge });
        }

        setJobs(jobsWithStatus);
      } catch (error: any) {
        console.error('Error loading jobs:', error);
        toast.error('Failed to load jobs');
      } finally {
        setLoading(false);
      }
    }

    loadData();

    // Set up real-time subscription
    const channel = supabase
      .channel('jobs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
        },
        (payload) => {
          console.log('Job changed:', payload);
          loadData(); // Reload on any change
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to job changes');
        }
      });

    // Monitor online/offline
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    // Listen for edit job event
    const handleEditJob = (event: CustomEvent) => {
      const job = event.detail as Job;
      setEditingJob(job);
      // Parse client name into firstName and lastName if needed
      const nameParts = job.client_name?.split(' ') || [];
      setEditFormData({
        firstName: job.firstName || nameParts[0] || '',
        lastName: job.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''),
        email: job.email || '',
        phone: job.phone || '',
        streetAddress: job.address?.split(',')[0] || '',
        city: job.city || '',
        state: job.state || '',
        zip: job.zip || '',
        county: job.county || '',
        userRole: job.role || '',
        notes: job.notes || '',
        wellPermitNumber: job.wellPermitNumber || '',
        hasCistern: job.hasCistern || '',
        equipmentInspection: job.equipmentInspection === 'yes',
        willBePresent: job.willBePresent || '',
        accessInstructions: job.accessInstructions || '',
        scheduledDate: job.scheduledDate ? new Date(job.scheduledDate).toISOString().slice(0, 16) : '',
      });
    };

    window.addEventListener('editJob' as any, handleEditJob as EventListener);

    return () => {
      channel.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('editJob' as any, handleEditJob as EventListener);
    };
  }, [router, userId]);

  const getStatusBadge = async (job: Job): Promise<{ text: string; color: string }> => {
    const status = job.status || 'in-progress';
    
    if (status === 'completed') {
      return { text: 'Completed', color: 'bg-green-500' };
    }

    // Check what's been completed in well_reports
    try {
      const { data: report } = await supabase
        .from('well_reports')
        .select('flow_readings, water_quality, photos, notes')
        .eq('job_id', job.id)
        .single();

      if (!report) {
        return { text: 'Not Started', color: 'bg-gray-500' };
      }

      const hasFlow = report.flow_readings && report.flow_readings.length > 0;
      const hasWaterQuality = report.water_quality && Object.keys(report.water_quality).length > 0;
      const hasPhotos = report.photos && report.photos.length > 0;
      const hasNotes = report.notes && report.notes.trim().length > 0;

      const completed = [hasFlow, hasWaterQuality, hasPhotos, hasNotes].filter(Boolean).length;
      const total = 4;

      if (completed === 0) {
        return { text: 'Not Started', color: 'bg-gray-500' };
      } else if (completed === total) {
        return { text: 'Complete', color: 'bg-green-500' };
      } else {
        const missing = [];
        if (!hasFlow) missing.push('Flow');
        if (!hasWaterQuality) missing.push('Lab');
        if (!hasPhotos) missing.push('Photos');
        if (!hasNotes) missing.push('Notes');
        return { text: `Missing: ${missing.join(', ')}`, color: 'bg-yellow-500' };
      }
    } catch (error) {
      return { text: 'In Progress', color: 'bg-yellow-500' };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingJob) return;
    setSaving(true);

    try {
      const fullAddress = [
        editFormData.streetAddress,
        editFormData.city,
        editFormData.state,
        editFormData.zip,
      ]
        .filter(Boolean)
        .join(', ');

      const clientName = `${editFormData.firstName} ${editFormData.lastName}`.trim();

      const { error } = await supabase
        .from('jobs')
        .update({
          address: fullAddress,
          client_name: clientName,
          firstName: editFormData.firstName || null,
          lastName: editFormData.lastName || null,
          email: editFormData.email || null,
          phone: editFormData.phone || null,
          city: editFormData.city || null,
          state: editFormData.state || null,
          zip: editFormData.zip || null,
          county: editFormData.county || null,
          role: editFormData.userRole === 'other' ? editFormData.otherRoleText : (editFormData.userRole || null),
          notes: editFormData.notes || null,
          wellPermitNumber: editFormData.wellPermitNumber || null,
          hasCistern: editFormData.hasCistern || null,
          equipmentInspection: editFormData.equipmentInspection ? 'yes' : null,
          willBePresent: editFormData.willBePresent || null,
          accessInstructions: editFormData.willBePresent === 'no' ? (editFormData.accessInstructions || null) : null,
          scheduledDate: editFormData.scheduledDate ? (editFormData.scheduledDate.includes('T') ? `${editFormData.scheduledDate}:00` : `${editFormData.scheduledDate}T00:00:00`) : null,
        })
        .eq('id', editingJob.id);

      if (error) throw error;

      toast.success('Job updated successfully!');
      setEditingJob(null);
      setEditFormData({});
      
      // Reload jobs
      window.location.reload();
    } catch (error: any) {
      console.error('Error updating job:', error);
      toast.error(error.message || 'Failed to update job');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading jobs...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1B2C] pb-20">
      {/* Header */}
      <div className="bg-[#24253B] border-b border-[#2D2E47] text-white p-6 shadow-lg sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Field Tech</h1>
            <p className="text-sm text-gray-400">Peak to Plains</p>
          </div>
          {!isOnline && (
            <div className="bg-yellow-500 text-yellow-900 px-3 py-1 rounded text-xs font-semibold">
              Offline
            </div>
          )}
        </div>
      </div>

      {/* New Job Button */}
      <div className="p-4">
        <Link
          href="/field-tech/new-job"
          className="block w-full max-w-md mx-auto bg-[#FF6B35] hover:bg-[#e55a2b] text-white font-bold text-xl py-5 px-6 rounded-lg shadow-lg active:scale-95 transition-transform text-center"
        >
          + New Job
        </Link>
      </div>

      {/* Jobs List */}
      <div className="px-4 max-w-4xl mx-auto">
        <h2 className="text-lg font-semibold text-white mb-4">
          Incomplete Jobs ({jobs.length})
        </h2>

        {jobs.length === 0 ? (
          <div className="bg-[#24253B] rounded-lg shadow-md p-8 text-center border border-[#2D2E47]">
            <p className="text-gray-300 text-lg mb-4">No incomplete jobs</p>
            <p className="text-gray-400 text-sm">
              Tap "+ New Job" to create your first job
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => {
              const badge = job.statusBadge || { text: 'In Progress', color: 'bg-yellow-500' };
              return (
                <Link
                  key={job.id}
                  href={`/field-tech/${job.id}/edit`}
                  className="block bg-[#24253B] rounded-lg shadow-md p-5 active:scale-98 transition-transform border border-[#2D2E47] hover:border-[#FF6B35]"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-white">
                          {job.client_name || 'No Name'}
                        </h3>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // Open edit modal
                            const event = new CustomEvent('editJob', { detail: job });
                            window.dispatchEvent(event);
                          }}
                          className="text-[#FF6B35] hover:text-[#e55a2b] transition-colors"
                          aria-label="Edit job"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-gray-400 text-sm mb-2">
                        {job.address || 'No address'}
                      </p>
                      {(job.willBePresent === 'no' && job.accessInstructions) || job.notes ? (
                        <div className="flex items-center gap-2 mb-2">
                          {job.willBePresent === 'no' && job.accessInstructions && (
                            <p className="text-gray-500 text-xs flex-1">
                              Access: {job.accessInstructions}
                            </p>
                          )}
                          {job.notes && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setNotesPopup({ jobId: job.id, notes: job.notes || '' });
                              }}
                              className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1 rounded whitespace-nowrap"
                            >
                              📝 Note
                            </button>
                          )}
                        </div>
                      ) : null}
                      <p className="text-gray-500 text-xs">
                        {formatDate(job.created_at)}
                      </p>
                    </div>
                    <span
                      className={`${badge.color} text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ml-3`}
                    >
                      {badge.text}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Notes Popup Modal */}
      {notesPopup && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setNotesPopup(null)}
        >
          <div 
            className="bg-[#24253B] rounded-lg shadow-xl max-w-md w-full border-2 border-[#2D2E47] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Note</h3>
              <button
                onClick={() => setNotesPopup(null)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="text-gray-300 whitespace-pre-wrap break-words">
              {notesPopup.notes}
            </div>
            <button
              onClick={() => setNotesPopup(null)}
              className="mt-4 w-full bg-[#FF6B35] hover:bg-[#e55a2b] text-white font-semibold py-2 px-4 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Edit Job Modal */}
      {editingJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1A1B2C] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-[#2D2E47]">
            <div className="sticky top-0 bg-[#24253B] border-b border-[#2D2E47] p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Edit Job</h2>
              <button
                onClick={() => {
                  setEditingJob(null);
                  setEditFormData({});
                }}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Client Name */}
              <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Client First Name *
                </label>
                <input
                  type="text"
                  value={editFormData.firstName || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                  required
                  className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white placeholder-gray-500"
                  placeholder="First Name"
                />
              </div>

              <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Client Last Name *
                </label>
                <input
                  type="text"
                  value={editFormData.lastName || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                  required
                  className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white placeholder-gray-500"
                  placeholder="Last Name"
                />
              </div>

              {/* Contact Info */}
              <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
                <label className="block text-sm font-semibold text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={editFormData.email || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white placeholder-gray-500"
                  placeholder="email@example.com"
                />
              </div>

              <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
                <label className="block text-sm font-semibold text-gray-300 mb-2">Phone</label>
                <input
                  type="tel"
                  value={editFormData.phone || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white placeholder-gray-500"
                  placeholder="(555) 123-4567"
                />
              </div>

              {/* Address */}
              <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
                <label className="block text-sm font-semibold text-gray-300 mb-2">Street Address *</label>
                <input
                  type="text"
                  value={editFormData.streetAddress || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, streetAddress: e.target.value })}
                  required
                  className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white placeholder-gray-500"
                  placeholder="123 Main St"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
                  <label className="block text-sm font-semibold text-gray-300 mb-2">City</label>
                  <input
                    type="text"
                    value={editFormData.city || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                    className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white placeholder-gray-500"
                    placeholder="City"
                  />
                </div>

                <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
                  <label className="block text-sm font-semibold text-gray-300 mb-2">State</label>
                  <input
                    type="text"
                    value={editFormData.state || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                    maxLength={2}
                    className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white placeholder-gray-500"
                    placeholder="CO"
                  />
                </div>

                <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
                  <label className="block text-sm font-semibold text-gray-300 mb-2">ZIP</label>
                  <input
                    type="text"
                    value={editFormData.zip || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, zip: e.target.value })}
                    maxLength={5}
                    className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white placeholder-gray-500"
                    placeholder="80202"
                  />
                </div>
              </div>

              {/* County */}
              <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
                <label className="block text-sm font-semibold text-gray-300 mb-2">County</label>
                <input
                  type="text"
                  value={editFormData.county || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, county: e.target.value })}
                  className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white placeholder-gray-500"
                  placeholder="County"
                />
              </div>

              {/* Scheduled Date */}
              <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
                <label className="block text-sm font-semibold text-gray-300 mb-2">Scheduled Date</label>
                <input
                  type="datetime-local"
                  value={editFormData.scheduledDate || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, scheduledDate: e.target.value })}
                  className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white"
                />
              </div>

              {/* Will Be Present */}
              <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Will someone be there to allow access?
                </label>
                <div className="flex gap-6 mt-2">
                  <label className="flex items-center cursor-pointer text-base">
                    <input
                      type="radio"
                      name="willBePresent"
                      value="yes"
                      checked={editFormData.willBePresent === 'yes'}
                      onChange={(e) => setEditFormData({ ...editFormData, willBePresent: e.target.value, accessInstructions: '' })}
                      className="w-5 h-5 mr-2 cursor-pointer"
                    />
                    Yes
                  </label>
                  <label className="flex items-center cursor-pointer text-base">
                    <input
                      type="radio"
                      name="willBePresent"
                      value="no"
                      checked={editFormData.willBePresent === 'no'}
                      onChange={(e) => setEditFormData({ ...editFormData, willBePresent: e.target.value })}
                      className="w-5 h-5 mr-2 cursor-pointer"
                    />
                    No
                  </label>
                </div>
              </div>

              {/* Access Instructions */}
              {editFormData.willBePresent === 'no' && (
                <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Access Instructions</label>
                  <textarea
                    value={editFormData.accessInstructions || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, accessInstructions: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent resize-none text-white placeholder-gray-500"
                    placeholder="Enter access instructions..."
                  />
                </div>
              )}

              {/* Notes */}
              <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
                <label className="block text-sm font-semibold text-gray-300 mb-2">Notes</label>
                <textarea
                  value={editFormData.notes || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent resize-none text-white placeholder-gray-500"
                  placeholder="Additional notes..."
                />
              </div>

              {/* Save Button */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setEditingJob(null);
                    setEditFormData({});
                  }}
                  className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-[#FF6B35] hover:bg-[#e55a2b] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
