'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface SystemEquipmentData {
  pressureTankSize?: number;
  prechargePSI?: number;
  storageTanks?: number;
  pumpMakeModel?: string;
  pumpCondition?: string;
  pressureTankCondition?: string;
  wiringCondition?: string;
  wellCapCondition?: string;
  wellPumpLocation?: string;
  waterTreatment?: string[] | string;
  waterTreatmentOther?: string;
}

interface SystemEquipmentTabProps {
  jobId: string;
  initialData?: SystemEquipmentData;
  onSave?: () => void;
}

const CONDITION_OPTIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'Not Visible'];
const WATER_TREATMENT_OPTIONS = [
  'None',
  'Water Softener',
  'Reverse Osmosis System',
  'Carbon Filter',
  'Sediment Filter',
  'Iron Filter',
  'Manganese Filter',
  'UV Sterilizer',
  'Chlorination System',
  'Acid Neutralizer',
  'Arsenic Removal System',
  'Nitrate Removal System',
  'Whole House Filter',
  'Point of Use Filter',
  'Aeration System',
  'Other',
];

export default function SystemEquipmentTab({
  jobId,
  initialData,
  onSave,
}: SystemEquipmentTabProps) {
  const [data, setData] = useState<SystemEquipmentData>(initialData || {});
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (initialData) {
      // Handle waterTreatment - convert string to array if needed
      const waterTreatment = initialData.waterTreatment;
      const treatmentArray = Array.isArray(waterTreatment)
        ? waterTreatment
        : typeof waterTreatment === 'string' && waterTreatment
        ? waterTreatment.split(',').map((t) => t.trim()).filter(Boolean)
        : [];
      
      setData({ ...initialData, waterTreatment: treatmentArray });
    }
  }, [initialData]);

  const handleChange = (field: keyof SystemEquipmentData, value: any) => {
    const newData = { ...data, [field]: value };
    setData(newData);

    // Auto-save after 1 second of no changes
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      handleAutoSave(newData);
    }, 1000);
  };

  const handleWaterTreatmentChange = (value: string, checked: boolean) => {
    const current = Array.isArray(data.waterTreatment) ? data.waterTreatment : [];
    let newTreatment: string[];
    
    if (value === 'None') {
      newTreatment = checked ? ['None'] : [];
    } else {
      newTreatment = checked
        ? [...current.filter((t) => t !== 'None'), value]
        : current.filter((t) => t !== value);
    }

    handleChange('waterTreatment', newTreatment);
  };

  const handleAutoSave = async (dataToSave: SystemEquipmentData) => {
    try {
      // Convert waterTreatment array to string for storage (or keep as array)
      const saveData = {
        ...dataToSave,
        waterTreatment: Array.isArray(dataToSave.waterTreatment)
          ? dataToSave.waterTreatment.join(',')
          : dataToSave.waterTreatment || '',
      };

      const { error } = await supabase
        .from('well_reports')
        .upsert(
          {
            job_id: jobId,
            system_equipment: saveData,
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

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const waterTreatmentArray = Array.isArray(data.waterTreatment)
    ? data.waterTreatment
    : typeof data.waterTreatment === 'string' && data.waterTreatment
    ? data.waterTreatment.split(',').map((t) => t.trim()).filter(Boolean)
    : [];
  const showOtherInput = waterTreatmentArray.includes('Other');

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="bg-[#24253B] rounded-lg shadow-md p-6 border border-[#2D2E47]">
        <h2 className="text-xl font-bold text-white mb-4">System Equipment</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Pressure Tank Size (gallons)
            </label>
            <input
              type="number"
              value={data.pressureTankSize || ''}
              onChange={(e) => handleChange('pressureTankSize', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white placeholder-gray-500"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Pre-charge PSI
            </label>
            <input
              type="number"
              step="0.1"
              value={data.prechargePSI || ''}
              onChange={(e) => handleChange('prechargePSI', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white placeholder-gray-500"
              placeholder="0.0"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Storage Tanks Total (gallons)
            </label>
            <input
              type="number"
              value={data.storageTanks || ''}
              onChange={(e) => handleChange('storageTanks', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white placeholder-gray-500"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Pump Make/Model/HP
            </label>
            <input
              type="text"
              value={data.pumpMakeModel || ''}
              onChange={(e) => handleChange('pumpMakeModel', e.target.value)}
              className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white placeholder-gray-500"
              placeholder="Enter pump details"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Pump Condition
            </label>
            <select
              value={data.pumpCondition || ''}
              onChange={(e) => handleChange('pumpCondition', e.target.value)}
              className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white"
            >
              <option value="">Select</option>
              {CONDITION_OPTIONS.map((opt) => (
                <option key={opt} value={opt} className="bg-[#1A1B2C]">
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Pressure Tank Condition
            </label>
            <select
              value={data.pressureTankCondition || ''}
              onChange={(e) => handleChange('pressureTankCondition', e.target.value)}
              className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white"
            >
              <option value="">Select</option>
              {CONDITION_OPTIONS.filter((opt) => opt !== 'Not Visible').map((opt) => (
                <option key={opt} value={opt} className="bg-[#1A1B2C]">
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Wiring Condition
            </label>
            <select
              value={data.wiringCondition || ''}
              onChange={(e) => handleChange('wiringCondition', e.target.value)}
              className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white"
            >
              <option value="">Select</option>
              {CONDITION_OPTIONS.filter((opt) => opt !== 'Not Visible').map((opt) => (
                <option key={opt} value={opt} className="bg-[#1A1B2C]">
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Well Cap Condition
            </label>
            <select
              value={data.wellCapCondition || ''}
              onChange={(e) => handleChange('wellCapCondition', e.target.value)}
              className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white"
            >
              <option value="">Select</option>
              {CONDITION_OPTIONS.filter((opt) => opt !== 'Not Visible').map((opt) => (
                <option key={opt} value={opt} className="bg-[#1A1B2C]">
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Well Pump Location
            </label>
            <input
              type="text"
              value={data.wellPumpLocation || ''}
              onChange={(e) => handleChange('wellPumpLocation', e.target.value)}
              className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white placeholder-gray-500"
              placeholder="e.g., Basement, Well house, Pit"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Water Treatment Equipment
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto bg-[#1A1B2C] p-3 rounded-lg border border-[#2D2E47]">
              {WATER_TREATMENT_OPTIONS.map((option) => (
                <label
                  key={option}
                  className="flex items-center space-x-2 text-gray-300 cursor-pointer hover:text-white"
                >
                  <input
                    type="checkbox"
                    checked={waterTreatmentArray.includes(option)}
                    onChange={(e) => handleWaterTreatmentChange(option, e.target.checked)}
                    className="w-4 h-4 text-[#FF6B35] bg-[#1A1B2C] border-[#2D2E47] rounded focus:ring-[#FF6B35]"
                  />
                  <span className="text-sm">{option}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">Select all that apply</p>
          </div>

          {showOtherInput && (
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Treatment Equipment (Other)
              </label>
              <input
                type="text"
                value={data.waterTreatmentOther || ''}
                onChange={(e) => handleChange('waterTreatmentOther', e.target.value)}
                className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white placeholder-gray-500"
                placeholder="Specify other treatment equipment"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
