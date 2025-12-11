'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface WaterQualityData {
  coliform?: 'present' | 'absent';
  ecoli?: 'present' | 'absent';
  nitrate?: number;
  arsenic?: number;
  lead?: number;
  iron?: number;
  manganese?: number;
  hardness?: number;
  ph?: number;
  tds?: number;
  labName?: string;
  labDateReceived?: string;
  labPdfUrl?: string;
}

interface WaterQualityTabProps {
  jobId: string;
  initialData?: WaterQualityData;
  onSave?: () => void;
}

export default function WaterQualityTab({
  jobId,
  initialData,
  onSave,
}: WaterQualityTabProps) {
  const [data, setData] = useState<WaterQualityData>(initialData || {});
  const [saving, setSaving] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  // Auto-save debounce
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setData((prev) => {
      const updated = {
        ...prev,
        [name]: name.includes('Date') || name.includes('Name')
          ? value
          : value === '' || value === 'present' || value === 'absent'
          ? value
          : parseFloat(value) || undefined,
      };
      
      // Auto-save after 1 second of no changes
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        handleAutoSave(updated);
      }, 1000);
      
      return updated;
    });
  };

  const handleAutoSave = async (dataToSave: WaterQualityData) => {
    try {
      const { error } = await supabase
        .from('well_reports')
        .upsert(
          {
            job_id: jobId,
            water_quality: dataToSave,
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPdf(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${jobId}/lab-report-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('well-report-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('well-report-photos').getPublicUrl(fileName);

      setData((prev) => ({ ...prev, labPdfUrl: publicUrl }));
      toast.success('Lab PDF uploaded!');
    } catch (error: any) {
      console.error('Error uploading PDF:', error);
      toast.error('Failed to upload PDF');
    } finally {
      setUploadingPdf(false);
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
            water_quality: data,
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: 'job_id' }
        );

      if (error) throw error;

      toast.success('Water quality data saved!');
      onSave?.();
    } catch (error: any) {
      console.error('Error saving water quality:', error);
      toast.error('Failed to save water quality data');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Coliform / E.coli */}
      <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          Coliform
        </label>
        <select
          name="coliform"
          value={data.coliform || ''}
          onChange={handleChange}
          className="w-full px-4 py-3 text-lg border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent bg-[#1A1B2C] text-white"
        >
          <option value="" className="bg-[#1A1B2C]">Select</option>
          <option value="present" className="bg-[#1A1B2C]">Present</option>
          <option value="absent" className="bg-[#1A1B2C]">Absent</option>
        </select>
      </div>

      <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          E.coli
        </label>
        <select
          name="ecoli"
          value={data.ecoli || ''}
          onChange={handleChange}
          className="w-full px-4 py-3 text-lg border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent bg-[#1A1B2C] text-white"
        >
          <option value="" className="bg-[#1A1B2C]">Select</option>
          <option value="present" className="bg-[#1A1B2C]">Present</option>
          <option value="absent" className="bg-[#1A1B2C]">Absent</option>
        </select>
      </div>

      {/* Chemical Tests */}
      {[
        { name: 'nitrate', label: 'Nitrate (mg/L)' },
        { name: 'arsenic', label: 'Arsenic (mg/L)' },
        { name: 'lead', label: 'Lead (mg/L)' },
        { name: 'iron', label: 'Iron (mg/L)' },
        { name: 'manganese', label: 'Manganese (mg/L)' },
        { name: 'hardness', label: 'Hardness (mg/L)' },
        { name: 'ph', label: 'pH' },
        { name: 'tds', label: 'TDS (mg/L)' },
      ].map((test) => (
        <div key={test.name} className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            {test.label}
          </label>
          <input
            type="number"
            name={test.name}
            value={data[test.name as keyof WaterQualityData] || ''}
            onChange={handleChange}
            step="0.01"
            className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white placeholder-gray-500"
            placeholder="0.00"
            inputMode="decimal"
          />
        </div>
      ))}

      {/* Lab Info */}
      <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          Lab Name
        </label>
        <input
          type="text"
          name="labName"
          value={data.labName || ''}
          onChange={handleChange}
          className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white placeholder-gray-500"
          placeholder="Lab name"
        />
      </div>

      <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          Date Received
        </label>
        <input
          type="date"
          name="labDateReceived"
          value={data.labDateReceived || ''}
          onChange={handleChange}
          className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white"
        />
      </div>

      {/* PDF Upload */}
      <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          Lab PDF Report
        </label>
        <input
          type="file"
          accept=".pdf"
          onChange={handlePdfUpload}
          disabled={uploadingPdf}
          className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#FF6B35] file:text-white hover:file:bg-[#e55a2b]"
        />
        {uploadingPdf && (
          <p className="text-sm text-gray-400 mt-2">Uploading...</p>
        )}
        {data.labPdfUrl && (
          <a
            href={data.labPdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#FF6B35] text-sm mt-2 block hover:underline"
          >
            View uploaded PDF →
          </a>
        )}
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full max-w-md mx-auto block bg-[#FF6B35] hover:bg-[#e55a2b] text-white font-bold text-xl py-4 px-6 rounded-lg shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving...' : 'Save Water Quality Data'}
      </button>
    </div>
  );
}
