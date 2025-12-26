'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface FlowReading {
  time: number;
  gpm: number | null;
}

interface FlowTestTabProps {
  jobId: string;
  initialReadings?: FlowReading[];
  wellBasics?: {
    staticWaterLevel?: number;
    totalDepth?: number;
    pumpDepth?: number; // Optional pump depth if different from totalDepth
  };
  onSave?: () => void;
}

export default function FlowTestTab({
  jobId,
  initialReadings,
  wellBasics,
  onSave,
}: FlowTestTabProps) {
  const [pipeDiameter, setPipeDiameter] = useState<number>(6); // Default 6 inches
  const [flowReadings, setFlowReadings] = useState<FlowReading[]>([]);
  const [saving, setSaving] = useState(false);
  // Start at 15 min, go up to 120 min (8 intervals: 15, 30, 45, 60, 75, 90, 105, 120)
  const baseTimeIntervals = Array.from({ length: 8 }, (_, i) => (i + 1) * 15);
  const [additionalIntervals, setAdditionalIntervals] = useState<number[]>([]);
  
  // Combine base intervals with additional ones, sorted
  const allTimeIntervals = [...baseTimeIntervals, ...additionalIntervals].sort((a, b) => a - b);
  
  const addTimeInterval = () => {
    const maxTime = Math.max(...allTimeIntervals, 120);
    const newTime = maxTime + 15;
    setAdditionalIntervals([...additionalIntervals, newTime]);
  };

  useEffect(() => {
    const currentIntervals = [...baseTimeIntervals, ...additionalIntervals].sort((a, b) => a - b);
    if (initialReadings && initialReadings.length > 0) {
      // Merge existing readings with all intervals
      const allTimes = new Set([...currentIntervals, ...initialReadings.map(r => r.time)]);
      const merged = Array.from(allTimes).sort((a, b) => a - b).map((time) => {
        const existing = initialReadings.find((r) => r.time === time);
        return existing || { time, gpm: null };
      });
      setFlowReadings(merged);
    } else {
      setFlowReadings(
        currentIntervals.map((time) => ({ time, gpm: null }))
      );
    }
  }, [initialReadings, additionalIntervals]);

  // Auto-save debounce
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleGpmChange = (time: number, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    setFlowReadings((prev) => {
      // If this time doesn't exist, add it
      const existingIndex = prev.findIndex(r => r.time === time);
      let updated;
      if (existingIndex >= 0) {
        updated = prev.map((reading) =>
          reading.time === time ? { ...reading, gpm: numValue } : reading
        );
      } else {
        updated = [...prev, { time, gpm: numValue }].sort((a, b) => a.time - b.time);
      }
      
      // Auto-save after 1 second of no changes
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        handleAutoSave(updated);
      }, 1000);
      
      return updated;
    });
  };

  const handleAutoSave = async (readings: FlowReading[]) => {
    try {
      const readingsToSave = readings.filter((r) => r.gpm !== null);
      const { error } = await supabase
        .from('well_reports')
        .upsert(
          {
            job_id: jobId,
            flow_readings: readingsToSave,
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: 'job_id' }
        );
      
      if (!error) {
        onSave?.();
      }
    } catch (error) {
      // Silent fail for auto-save - user can manually save
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const readingsToSave = flowReadings.filter((r) => r.gpm !== null);

      const { error } = await supabase
        .from('well_reports')
        .upsert(
          {
            job_id: jobId,
            flow_readings: readingsToSave,
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: 'job_id' }
        );

      if (error) throw error;

      toast.success('Flow readings saved!');
      onSave?.();
    } catch (error: any) {
      console.error('Error saving flow readings:', error);
      toast.error('Failed to save flow readings');
    } finally {
      setSaving(false);
    }
  };

  // Memoize calculations so they update when flowReadings changes
  const calculations = useMemo(() => {
    const enteredReadings = flowReadings
      .filter((r) => r.gpm !== null && r.gpm !== undefined)
      .sort((a, b) => a.time - b.time); // Ensure sorted by time
    
    const gpmValues = enteredReadings.map((r) => r.gpm!);

    // Calculate % change for each reading (from prior reading)
    const readingsWithPercentChange = enteredReadings.map((reading, index) => {
      let percentChange: number | null = null;
      if (index > 0 && reading.gpm !== null) {
        const previousGpm = enteredReadings[index - 1].gpm;
        if (previousGpm !== null && previousGpm !== 0) {
          percentChange = ((reading.gpm! - previousGpm) / previousGpm) * 100;
        }
      }
      return { ...reading, percentChange };
    });

    const currentAverage =
      gpmValues.length > 0
        ? gpmValues.reduce((sum, val) => sum + val, 0) / gpmValues.length
        : 0;

    const lastFourReadings = gpmValues.slice(-4);
    const sustainedYield =
      lastFourReadings.length > 0
        ? lastFourReadings.reduce((sum, val) => sum + val, 0) /
          lastFourReadings.length
        : 0;

    const peakFlow = gpmValues.length > 0 ? Math.max(...gpmValues) : 0;

    // Calculate % change from final 3 readings
    let avgPercentChangeFinal3: number | null = null;
    if (gpmValues.length >= 3) {
      const final3 = gpmValues.slice(-3);
      let totalPercentChange = 0;
      let validChanges = 0;
      
      for (let i = 1; i < final3.length; i++) {
        const prev = final3[i - 1];
        const curr = final3[i];
        if (prev && prev !== 0) {
          const change = ((curr - prev) / prev) * 100;
          totalPercentChange += change;
          validChanges++;
        }
      }
      
      if (validChanges > 0) {
        avgPercentChangeFinal3 = totalPercentChange / validChanges;
      }
    }

    // Calculate volumes (in gallons)
    const volume12hr = currentAverage * 60 * 12; // GPM * 60 min/hr * 12 hr
    const volume24hr = currentAverage * 60 * 24; // GPM * 60 min/hr * 24 hr
    
    // Calculate total water discharged: sum of discharged values for each interval
    // This is calculated by summing (gpm * interval_time) for each reading
    let totalWaterDischarged = 0;
    if (enteredReadings.length > 0) {
      for (let i = 0; i < enteredReadings.length; i++) {
        const current = enteredReadings[i];
        const next = enteredReadings[i + 1];
        
        if (current.gpm !== null && current.gpm > 0 && current.time !== null && current.time !== undefined) {
          if (next && next.time !== null && next.time !== undefined) {
            // Calculate interval time in minutes
            const intervalMinutes = next.time - current.time;
            // Gallons for this interval = GPM * minutes
            totalWaterDischarged += current.gpm * intervalMinutes;
          } else if (i === enteredReadings.length - 1) {
            // Last reading: use average interval if we have multiple readings, otherwise default to 15 minutes
            const avgInterval = enteredReadings.length > 1 
              ? (current.time - enteredReadings[0].time) / (enteredReadings.length - 1)
              : 15;
            totalWaterDischarged += current.gpm * avgInterval;
          }
        }
      }
    }

    return {
      readingsWithPercentChange,
      currentAverage,
      sustainedYield,
      peakFlow,
      avgPercentChangeFinal3,
      volume12hr,
      volume24hr,
      totalWaterDischarged,
    };
  }, [flowReadings]);

  const { readingsWithPercentChange, currentAverage, sustainedYield, peakFlow, avgPercentChangeFinal3, volume12hr, volume24hr, totalWaterDischarged } = calculations;

  // Calculate Water Column Volume
  const calculateWaterColumn = () => {
    if (!wellBasics?.staticWaterLevel || !wellBasics?.totalDepth) {
      return null;
    }
    
    // Use pumpDepth if available, otherwise use totalDepth
    const pumpDepth = wellBasics.pumpDepth || wellBasics.totalDepth;
    const waterColumnHeight = pumpDepth - wellBasics.staticWaterLevel; // Height in feet
    
    if (waterColumnHeight <= 0) return null;
    
    // Convert diameter from inches to feet
    const diameterFeet = pipeDiameter / 12;
    const radiusFeet = diameterFeet / 2;
    
    // Volume in cubic feet: π * r² * h
    const volumeCubicFeet = Math.PI * radiusFeet * radiusFeet * waterColumnHeight;
    
    // Convert to gallons: 1 cubic foot = 7.48052 gallons
    const volumeGallons = volumeCubicFeet * 7.48052;
    
    return {
      height: waterColumnHeight,
      volumeGallons,
      volumeCubicFeet,
    };
  };

  const waterColumn = calculateWaterColumn();

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Flow Entry Table */}
      <div className="bg-[#24253B] rounded-lg shadow-md overflow-hidden border border-[#2D2E47]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#1A1B2C]">
              <tr>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-300 border-b border-[#2D2E47]">
                  Time (min)
                </th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-300 border-b border-[#2D2E47]">
                  GPM
                </th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-300 border-b border-[#2D2E47]">
                  Discharged
                </th>
                <th className="px-4 py-4 text-center text-sm font-semibold text-gray-300 border-b border-[#2D2E47]">
                  % Change
                </th>
              </tr>
            </thead>
            <tbody>
              {flowReadings
                .filter((r) => (r.time >= 15 && r.time <= 120) || additionalIntervals.includes(r.time))
                .sort((a, b) => a.time - b.time)
                .map((reading, index) => {
                  const readingWithChange = readingsWithPercentChange.find(r => r.time === reading.time);
                  const percentChange = readingWithChange?.percentChange ?? null;
                  
                  // Calculate discharged for this reading
                  const sortedReadings = flowReadings
                    .filter((r) => (r.time >= 15 && r.time <= 120) || additionalIntervals.includes(r.time))
                    .sort((a, b) => a.time - b.time);
                  const currentIndex = sortedReadings.findIndex(r => r.time === reading.time);
                  const nextReading = sortedReadings[currentIndex + 1];
                  
                  let discharged = 0;
                  if (reading.gpm !== null && reading.gpm > 0 && reading.time !== null) {
                    if (nextReading && nextReading.time !== null) {
                      // Calculate interval time in minutes
                      const intervalMinutes = nextReading.time - reading.time;
                      // Gallons for this interval = GPM * minutes
                      discharged = reading.gpm * intervalMinutes;
                    } else if (currentIndex === sortedReadings.length - 1) {
                      // Last reading: use average interval if we have multiple readings, otherwise default to 15 minutes
                      const avgInterval = sortedReadings.length > 1 
                        ? (reading.time - sortedReadings[0].time) / (sortedReadings.length - 1)
                        : 15;
                      discharged = reading.gpm * avgInterval;
                    }
                  }
                  
                  return (
                    <tr
                      key={reading.time}
                      className={index % 2 === 0 ? 'bg-[#24253B]' : 'bg-[#1F2035]'}
                    >
                      <td className="px-4 py-4 text-lg font-medium text-white">
                        {reading.time}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={reading.gpm ?? ''}
                          onChange={(e) => handleGpmChange(reading.time, e.target.value)}
                          placeholder="0.0"
                          step="0.1"
                          min="0"
                          className="px-4 py-3 text-lg border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent bg-[#1A1B2C] text-white font-semibold placeholder-gray-500"
                          style={{ width: '50%' }}
                          inputMode="decimal"
                        />
                      </td>
                      <td className="px-4 py-4 text-lg font-semibold text-[#FF6B35]">
                        {discharged > 0 ? `${discharged.toFixed(0)} gal` : '--'}
                      </td>
                      <td className="px-4 py-4 text-center text-lg font-semibold">
                        {percentChange !== null ? (
                          <span
                            className={
                              percentChange > 0
                                ? 'text-green-500'
                                : percentChange < 0
                                ? 'text-red-500'
                                : 'text-gray-400'
                            }
                          >
                            {percentChange > 0 ? '+' : ''}
                            {percentChange.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-gray-500">--</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        {/* Add More Time Intervals Button */}
        <div className="p-4 border-t border-[#2D2E47]">
          <button
            onClick={addTimeInterval}
            className="w-full bg-[#2D2E47] hover:bg-[#3A3B5A] text-white font-semibold py-3 px-4 rounded-lg transition-colors text-sm"
          >
            + Add 15 Minutes
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="bg-[#24253B] rounded-lg shadow-md p-6 border border-[#2D2E47]">
        <h2 className="text-lg font-bold text-white mb-4">Calculations</h2>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-2 border-b border-[#2D2E47]">
            <span className="text-gray-300 font-medium">Average Flow Rate:</span>
            <span className="text-2xl font-bold text-[#FF6B35]">
              {currentAverage.toFixed(1)}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-[#2D2E47]">
            <span className="text-gray-300 font-medium">Sustained Yield (Last 4):</span>
            <span className="text-2xl font-bold text-[#4CAF50]">
              {sustainedYield.toFixed(1)}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-[#2D2E47]">
            <span className="text-gray-300 font-medium">Peak Flow Observed:</span>
            <span className="text-2xl font-bold text-[#FF6B35]">
              {peakFlow.toFixed(1)}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-[#2D2E47]">
            <span className="text-gray-300 font-medium">% Change (Final 3):</span>
            <span
              className={`text-2xl font-bold ${
                avgPercentChangeFinal3 !== null
                  ? avgPercentChangeFinal3 > 0
                    ? 'text-green-500'
                    : avgPercentChangeFinal3 < 0
                    ? 'text-red-500'
                    : 'text-gray-400'
                  : 'text-gray-500'
              }`}
            >
              {avgPercentChangeFinal3 !== null
                ? `${avgPercentChangeFinal3 > 0 ? '+' : ''}${avgPercentChangeFinal3.toFixed(2)}%`
                : '--'}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-[#2D2E47]">
            <span className="text-gray-300 font-medium">Volume Yield (12 hr):</span>
            <span className="text-2xl font-bold text-[#FF6B35]">
              {volume12hr > 0 ? `${volume12hr.toFixed(0)} gal` : '--'}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-[#2D2E47]">
            <span className="text-gray-300 font-medium">Volume Yield (24 hr):</span>
            <span className="text-2xl font-bold text-[#FF6B35]">
              {volume24hr > 0 ? `${volume24hr.toFixed(0)} gal` : '--'}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-[#2D2E47]">
            <span className="text-gray-300 font-medium">Total Water Discharged:</span>
            <span className="text-2xl font-bold text-[#4CAF50]">
              {totalWaterDischarged > 0 ? `${totalWaterDischarged.toFixed(0)} gal` : '--'}
            </span>
          </div>
          
          {/* Water Column Calculation */}
          <div className="mt-6 pt-6 border-t-2 border-[#2D2E47]">
            <div className="mb-4">
              <label className="block text-gray-300 font-medium mb-2">
                Pipe Diameter (inches):
              </label>
              <input
                type="number"
                value={pipeDiameter}
                onChange={(e) => setPipeDiameter(parseFloat(e.target.value) || 6)}
                min="1"
                max="24"
                step="0.1"
                className="w-full px-4 py-2 border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent bg-[#1A1B2C] text-white font-semibold"
              />
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-300 font-medium">Water Available in Column:</span>
              <span className="text-2xl font-bold text-[#4CAF50]">
                {waterColumn 
                  ? `${waterColumn.volumeGallons.toFixed(0)} gal`
                  : wellBasics?.staticWaterLevel === undefined || wellBasics?.totalDepth === undefined
                  ? 'Enter Well Basics'
                  : 'Invalid'}
              </span>
            </div>
            {waterColumn && (
              <div className="mt-2 text-sm text-gray-400">
                Height: {waterColumn.height.toFixed(1)} ft | 
                Diameter: {pipeDiameter}" | 
                Volume: {waterColumn.volumeCubicFeet.toFixed(1)} ft³
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full max-w-md mx-auto block bg-[#FF6B35] hover:bg-[#e55a2b] text-white font-bold text-xl py-4 px-6 rounded-lg shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed mt-6"
      >
        {saving ? 'Saving...' : 'Save Flow Readings'}
      </button>
    </div>
  );
}
