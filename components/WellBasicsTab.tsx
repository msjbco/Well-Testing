'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface WellBasicsData {
  wellPermit?: string;
  totalDepth?: number;
  casingDepth?: number;
  staticWaterLevel?: number;
  gpsLat?: number;
  gpsLong?: number;
  wellHeadLocation?: string;
  coordinates?: string;
}

interface WellBasicsTabProps {
  jobId: string;
  initialData?: WellBasicsData;
  onSave?: () => void;
}

export default function WellBasicsTab({
  jobId,
  initialData,
  onSave,
}: WellBasicsTabProps) {
  const [data, setData] = useState<WellBasicsData>(initialData || {});
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (initialData) {
      setData(initialData);
    }
  }, [initialData]);

  const handleChange = (field: keyof WellBasicsData, value: string | number) => {
    const newData = { ...data, [field]: value };
    setData(newData);

    // Auto-save after 1 second of no changes
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      handleAutoSave(newData);
    }, 1000);
  };

  const handleAutoSave = async (dataToSave: WellBasicsData) => {
    try {
      const { error } = await supabase
        .from('well_reports')
        .upsert(
          {
            job_id: jobId,
            well_basics: dataToSave,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'job_id' }
        );

      if (!error) {
        onSave?.();
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const parseCoordinates = (coordString: string) => {
    // Parse coordinates from string like "39.7392, -104.9903" or "39.7392 -104.9903"
    const cleaned = coordString.trim();
    const parts = cleaned.split(/[,\s]+/).filter(Boolean);
    
    if (parts.length >= 2) {
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        setData((prev) => ({
          ...prev,
          gpsLat: lat,
          gpsLong: lng,
          coordinates: coordString,
        }));
        handleAutoSave({ ...data, gpsLat: lat, gpsLong: lng, coordinates: coordString });
      }
    }
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="bg-[#24253B] rounded-lg shadow-md p-6 border border-[#2D2E47]">
        <h2 className="text-xl font-bold text-white mb-4">Well Basics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Well Permit #
            </label>
            <input
              type="text"
              value={data.wellPermit || ''}
              onChange={(e) => handleChange('wellPermit', e.target.value)}
              className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white placeholder-gray-500"
              placeholder="Enter permit number"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Total Depth (ft)
            </label>
            <input
              type="number"
              step="0.1"
              value={data.totalDepth || ''}
              onChange={(e) => handleChange('totalDepth', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white placeholder-gray-500"
              placeholder="0.0"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Casing Depth (ft)
            </label>
            <input
              type="number"
              step="0.1"
              value={data.casingDepth || ''}
              onChange={(e) => handleChange('casingDepth', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white placeholder-gray-500"
              placeholder="0.0"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Static Water Level (ft)
            </label>
            <input
              type="number"
              step="0.1"
              value={data.staticWaterLevel || ''}
              onChange={(e) => handleChange('staticWaterLevel', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white placeholder-gray-500"
              placeholder="0.0"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              GPS Latitude
            </label>
            <input
              type="number"
              step="0.000001"
              value={data.gpsLat || ''}
              onChange={(e) => handleChange('gpsLat', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white placeholder-gray-500"
              placeholder="39.7392"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              GPS Longitude
            </label>
            <input
              type="number"
              step="0.000001"
              value={data.gpsLong || ''}
              onChange={(e) => handleChange('gpsLong', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white placeholder-gray-500"
              placeholder="-104.9903"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Well Head Location
            </label>
            <input
              type="text"
              value={data.wellHeadLocation || ''}
              onChange={(e) => handleChange('wellHeadLocation', e.target.value)}
              className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white placeholder-gray-500"
              placeholder="e.g., Front yard, Backyard, Basement"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Coordinates
            </label>
            <input
              type="text"
              value={data.coordinates || ''}
              onChange={(e) => {
                setData((prev) => ({ ...prev, coordinates: e.target.value }));
                if (e.target.value) {
                  parseCoordinates(e.target.value);
                }
              }}
              onBlur={(e) => {
                if (e.target.value) {
                  parseCoordinates(e.target.value);
                }
              }}
              className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white placeholder-gray-500"
              placeholder="e.g., 39.7392, -104.9903"
            />
            <p className="text-xs text-gray-400 mt-1">
              Enter latitude and longitude (comma or space separated)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
