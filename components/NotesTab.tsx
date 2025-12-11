'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface NotesTabProps {
  jobId: string;
  initialNotes?: string;
  initialRecommendations?: string;
  onSave?: () => void;
}

export default function NotesTab({
  jobId,
  initialNotes,
  initialRecommendations,
  onSave,
}: NotesTabProps) {
  const [notes, setNotes] = useState(initialNotes || '');
  const [recommendations, setRecommendations] = useState(initialRecommendations || '');
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (initialNotes !== undefined) setNotes(initialNotes);
    if (initialRecommendations !== undefined) setRecommendations(initialRecommendations);
  }, [initialNotes, initialRecommendations]);

  // Auto-save on change (debounced)
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    // Only auto-save if data has actually changed
    if (notes !== (initialNotes || '') || recommendations !== (initialRecommendations || '')) {
      saveTimeoutRef.current = setTimeout(() => {
        handleAutoSave();
      }, 1000);
    }

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [notes, recommendations, initialNotes, initialRecommendations]);

  const handleAutoSave = async () => {
    try {
      const { error } = await supabase
        .from('well_reports')
        .upsert(
          {
            job_id: jobId,
            notes: notes,
            recommendations: recommendations,
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: 'job_id' }
        );
      
      if (!error) {
        onSave?.();
      }
    } catch (error) {
      // Silent fail for auto-save
      console.error('Auto-save failed:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('well_reports')
        .upsert(
          {
            job_id: jobId,
            notes: notes,
            recommendations: recommendations,
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: 'job_id' }
        );

      if (error) throw error;

      toast.success('Notes & Recommendations saved!');
      onSave?.();
    } catch (error: any) {
      console.error('Error saving notes:', error);
      toast.error('Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={8}
          className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent resize-none text-white placeholder-gray-500"
          placeholder="Enter notes and observations..."
        />
      </div>

      <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          Recommendations
        </label>
        <textarea
          value={recommendations}
          onChange={(e) => setRecommendations(e.target.value)}
          rows={8}
          className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent resize-none text-white placeholder-gray-500"
          placeholder="Enter recommendations and next steps..."
        />
        <p className="text-xs text-gray-400 mt-1">
          HTML formatting supported (use &lt;br&gt; for line breaks, &lt;b&gt; for bold, etc.)
        </p>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full max-w-md mx-auto block bg-[#FF6B35] hover:bg-[#e55a2b] text-white font-bold text-xl py-4 px-6 rounded-lg shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving...' : 'Save Notes & Recommendations'}
      </button>
    </div>
  );
}
