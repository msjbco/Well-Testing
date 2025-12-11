'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, getCurrentUser } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function NewJobPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  // Get today's date and set default time to 1:00 PM
  const getDefaultScheduledDate = () => {
    const today = new Date();
    today.setHours(13, 0, 0, 0); // 1:00 PM
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const hours = String(today.getHours()).padStart(2, '0');
    const minutes = String(today.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    streetAddress: '',
    city: '',
    state: '',
    zip: '',
    county: '',
    userRole: '',
    otherRoleText: '',
    hasCistern: '',
    equipmentInspection: false,
    waterQualityTesting: false,
    wellPermitNumber: '',
    willBePresent: '',
    accessInstructions: '',
    scheduledDate: getDefaultScheduledDate(),
    notes: '',
  });

  useEffect(() => {
    async function checkAuth() {
      const user = await getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);
    }
    checkAuth();
  }, [router]);

  // Format phone number as user types
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const phoneNumber = value.replace(/\D/g, '');
    
    // Limit to 10 digits
    if (phoneNumber.length <= 10) {
      // Format as (XXX) XXX-XXXX
      if (phoneNumber.length <= 3) {
        return phoneNumber.length > 0 ? `(${phoneNumber}` : phoneNumber;
      } else if (phoneNumber.length <= 6) {
        return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
      } else {
        return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
      }
    }
    // If more than 10 digits, keep the formatted version of first 10
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const target = e.target as HTMLInputElement;
    if (target.type === 'checkbox') {
      setFormData({
        ...formData,
        [target.name]: target.checked,
      });
    } else if (target.name === 'phone') {
      // Format phone number
      const formatted = formatPhoneNumber(target.value);
      setFormData({
        ...formData,
        phone: formatted,
      });
    } else {
      setFormData({
        ...formData,
        [e.target.name]: e.target.value,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!userId) {
        toast.error('Not authenticated');
        return;
      }

      // Build full address
      const fullAddress = [
        formData.streetAddress,
        formData.city,
        formData.state,
        formData.zip,
      ]
        .filter(Boolean)
        .join(', ');

      const clientName = `${formData.firstName} ${formData.lastName}`.trim();
      
      // Clean phone number (remove formatting for storage)
      const cleanPhone = formData.phone.replace(/\D/g, '');

      // Create job
      const { data: newJob, error: jobError } = await supabase
        .from('jobs')
        .insert({
          address: fullAddress,
          client_name: clientName,
          status: 'in-progress',
          assigned_tech_id: userId,
          // Store additional fields
          email: formData.email || null,
          phone: cleanPhone || null,
          city: formData.city || null,
          state: formData.state || null,
          zip: formData.zip || null,
          county: formData.county || null,
          role: formData.userRole === 'other' ? formData.otherRoleText : (formData.userRole || null),
          notes: formData.notes || null,
          wellPermitNumber: formData.wellPermitNumber || null,
          hasCistern: formData.hasCistern || null,
          equipmentInspection: formData.equipmentInspection ? 'yes' : null,
          willBePresent: formData.willBePresent || null,
          accessInstructions: formData.willBePresent === 'no' ? (formData.accessInstructions || null) : null,
          scheduledDate: formData.scheduledDate ? (formData.scheduledDate.includes('T') ? `${formData.scheduledDate}:00` : `${formData.scheduledDate}T00:00:00`) : null,
        } as any)
        .select()
        .single();

      if (jobError) throw jobError;

      const job = newJob as any;

      // Auto-create well_reports entry
      const { error: reportError } = await supabase.from('well_reports').insert({
        job_id: job.id,
        flow_readings: [],
        water_quality: {},
        photos: [],
        notes: '',
      } as any);

      if (reportError) {
        console.error('Error creating report:', reportError);
        // Don't fail the whole operation, just log it
      }

      toast.success('Job created successfully!');
      router.push(`/field-tech/${job.id}/edit`);
    } catch (error: any) {
      console.error('Error creating job:', error);
      toast.error(error.message || 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1B2C] pb-24">
      {/* Header */}
      <div className="bg-[#24253B] border-b border-[#2D2E47] text-white p-6 shadow-lg">
        <h1 className="text-2xl font-bold">New Job</h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Client Name */}
        <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Client First Name *
          </label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
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
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white placeholder-gray-500"
            placeholder="Last Name"
          />
        </div>

        {/* Contact Info */}
        <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white placeholder-gray-500"
            placeholder="email@example.com"
            inputMode="email"
          />
        </div>

        <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Phone
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            maxLength={14}
            className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white placeholder-gray-500"
            placeholder="(555) 123-4567"
            inputMode="tel"
          />
        </div>

        {/* Address */}
        <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Street Address *
          </label>
          <input
            type="text"
            name="streetAddress"
            value={formData.streetAddress}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white placeholder-gray-500"
            placeholder="123 Main St"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              City
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white placeholder-gray-500"
              placeholder="City"
            />
          </div>

          <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              State
            </label>
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleChange}
              maxLength={2}
              className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white placeholder-gray-500"
              placeholder="CO"
            />
          </div>

          <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              ZIP
            </label>
            <input
              type="text"
              name="zip"
              value={formData.zip}
              onChange={handleChange}
              maxLength={5}
              className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white placeholder-gray-500"
              placeholder="80202"
              inputMode="numeric"
            />
          </div>
        </div>

        {/* County */}
        <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            County <span className="text-red-500">*</span>
          </label>
          <select
            name="county"
            value={formData.county}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white"
          >
            <option value="" className="bg-[#1A1B2C]">Select a county</option>
            {[
              'Adams', 'Alamosa', 'Arapahoe', 'Archuleta', 'Baca', 'Bent', 'Boulder', 'Broomfield',
              'Chaffee', 'Cheyenne', 'Clear Creek', 'Conejos', 'Costilla', 'Crowley', 'Custer',
              'Delta', 'Denver', 'Dolores', 'Douglas', 'Eagle', 'El Paso', 'Elbert', 'Fremont',
              'Garfield', 'Gilpin', 'Grand', 'Gunnison', 'Hinsdale', 'Huerfano', 'Jackson',
              'Jefferson', 'Kiowa', 'Kit Carson', 'La Plata', 'Lake', 'Larimer', 'Las Animas',
              'Lincoln', 'Logan', 'Mesa', 'Mineral', 'Moffat', 'Montezuma', 'Montrose', 'Morgan',
              'Otero', 'Ouray', 'Park', 'Phillips', 'Pitkin', 'Prowers', 'Pueblo', 'Rio Blanco',
              'Rio Grande', 'Routt', 'Saguache', 'San Juan', 'San Miguel', 'Sedgwick', 'Summit',
              'Teller', 'Washington', 'Weld', 'Yuma'
            ].sort().map(county => (
              <option key={county} value={county} className="bg-[#1A1B2C]">{county}</option>
            ))}
          </select>
        </div>

        {/* Client Role */}
        <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Client Role <span className="text-red-500">*</span>
          </label>
          <select
            name="userRole"
            value={formData.userRole}
            onChange={(e) => {
              handleChange(e);
              if (e.target.value !== 'other') {
                setFormData(prev => ({ ...prev, otherRoleText: '' }));
              }
            }}
            required
            className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white"
          >
            <option value="" className="bg-[#1A1B2C]">Select one</option>
            <option value="buyer" className="bg-[#1A1B2C]">Buyer</option>
            <option value="owner" className="bg-[#1A1B2C]">Owner</option>
            <option value="inspector" className="bg-[#1A1B2C]">Inspector</option>
            <option value="buyers-agent" className="bg-[#1A1B2C]">Buyer's Agent</option>
            <option value="sellers-agent" className="bg-[#1A1B2C]">Seller's Agent</option>
            <option value="other" className="bg-[#1A1B2C]">Other</option>
          </select>
        </div>

        {/* Other Role Text */}
        {formData.userRole === 'other' && (
          <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Please specify: <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="otherRoleText"
              value={formData.otherRoleText}
              onChange={handleChange}
              required={formData.userRole === 'other'}
              className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white placeholder-gray-500"
              placeholder="Enter role"
            />
          </div>
        )}

        {/* Has Cistern */}
        <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Is there a cistern or underground storage? <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-6 mt-2">
            <label className="flex items-center cursor-pointer text-base">
              <input
                type="radio"
                name="hasCistern"
                value="yes"
                checked={formData.hasCistern === 'yes'}
                onChange={(e) => setFormData(prev => ({ ...prev, hasCistern: e.target.value }))}
                required
                className="w-5 h-5 mr-2 cursor-pointer"
              />
              Yes
            </label>
            <label className="flex items-center cursor-pointer text-base">
              <input
                type="radio"
                name="hasCistern"
                value="no"
                checked={formData.hasCistern === 'no'}
                onChange={(e) => setFormData(prev => ({ ...prev, hasCistern: e.target.value }))}
                required
                className="w-5 h-5 mr-2 cursor-pointer"
              />
              No
            </label>
          </div>
        </div>

        {/* Alternative Services (shown when cistern is Yes) */}
        {formData.hasCistern === 'yes' && (
          <div className="bg-[#2D2E47] rounded-lg shadow-md p-4 border-2 border-[#4CAF50] mt-4">
            <h3 className="text-lg font-bold text-white mb-4">Alternative Services Available</h3>
            
            {/* Well Equipment Inspection */}
            <div className="mb-4">
              <label className="flex items-start cursor-pointer text-base">
                <input
                  type="checkbox"
                  name="equipmentInspection"
                  checked={formData.equipmentInspection}
                  onChange={(e) => setFormData(prev => ({ ...prev, equipmentInspection: e.target.checked }))}
                  className="w-5 h-5 mr-3 mt-1 cursor-pointer flex-shrink-0"
                />
                <div className="flex-1">
                  <span className="text-white font-semibold">Well Equipment Inspection</span>
                  <p className="text-sm text-gray-400 mt-1">
                    $150 base fee, plus potential trip distance charges
                  </p>
                </div>
              </label>
            </div>

            {/* Water Quality Testing */}
            <div>
              <label className="flex items-start cursor-pointer text-base mb-2">
                <input
                  type="checkbox"
                  name="waterQualityTesting"
                  checked={formData.waterQualityTesting}
                  onChange={(e) => setFormData(prev => ({ ...prev, waterQualityTesting: e.target.checked }))}
                  className="w-5 h-5 mr-3 mt-1 cursor-pointer flex-shrink-0"
                />
                <div className="flex-1">
                  <span className="text-white font-semibold">Water Quality Testing</span>
                  <p className="text-sm text-gray-400 mt-1">
                    A la carte pricing, depending on chosen tests
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Well Permit Number */}
        <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Well Permit # (Optional)
          </label>
          <p className="text-sm text-gray-400 mb-2">
            Don't know your permit number?{' '}
            <a
              href="https://dwr.state.co.us/Tools/WellPermits"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#4CAF50] font-semibold underline"
            >
              Search for it here →
            </a>
          </p>
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              name="wellPermitNumber"
              value={formData.wellPermitNumber}
              onChange={handleChange}
              className="flex-1 min-w-[200px] px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white placeholder-gray-500"
              placeholder="Enter well permit number"
            />
            <a
              href="https://dwr.state.co.us/Tools/WellPermits"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#4CAF50] hover:bg-[#45a049] text-white px-6 py-3 rounded-lg font-semibold whitespace-nowrap inline-flex items-center"
            >
              Search Permit Database
            </a>
          </div>
        </div>

        {/* Will Be Present */}
        <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Will someone be there to allow access? <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-6 mt-2">
            <label className="flex items-center cursor-pointer text-base">
              <input
                type="radio"
                name="willBePresent"
                value="yes"
                checked={formData.willBePresent === 'yes'}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, willBePresent: e.target.value, accessInstructions: '' }));
                }}
                required
                className="w-5 h-5 mr-2 cursor-pointer"
              />
              Yes
            </label>
            <label className="flex items-center cursor-pointer text-base">
              <input
                type="radio"
                name="willBePresent"
                value="no"
                checked={formData.willBePresent === 'no'}
                onChange={(e) => setFormData(prev => ({ ...prev, willBePresent: e.target.value }))}
                required
                className="w-5 h-5 mr-2 cursor-pointer"
              />
              No
            </label>
          </div>
        </div>

        {/* Access Instructions */}
        {formData.willBePresent === 'no' && (
          <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Access Instructions <span className="text-red-500">*</span>
            </label>
            <textarea
              name="accessInstructions"
              value={formData.accessInstructions}
              onChange={handleChange}
              required={formData.willBePresent === 'no'}
              rows={3}
              className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent resize-none text-white placeholder-gray-500"
              placeholder="Enter access instructions (e.g., lockbox code, gate code, key location, etc.)"
            />
          </div>
        )}

        {/* Scheduled Date */}
        <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Scheduled Date (Optional)
          </label>
          <input
            type="datetime-local"
            name="scheduledDate"
            value={formData.scheduledDate}
            onChange={handleChange}
            className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-white"
          />
        </div>

        {/* Notes */}
        <div className="bg-[#24253B] rounded-lg shadow-md p-4 border border-[#2D2E47]">
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Notes (Optional)
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-3 text-lg bg-[#1A1B2C] border-2 border-[#2D2E47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent resize-none text-white placeholder-gray-500"
            placeholder="Additional notes..."
          />
        </div>

        {/* Submit Button */}
        <div className="pb-6">
          <button
            type="submit"
            disabled={loading}
            className="w-full max-w-md mx-auto block bg-[#FF6B35] hover:bg-[#e55a2b] text-white font-bold text-xl py-5 px-6 rounded-lg shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Job'}
          </button>
        </div>
      </form>
    </div>
  );
}
