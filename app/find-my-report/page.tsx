'use client';

import { useState } from 'react';
import { findReport } from './actions';

export default function FindMyReportPage() {
  const [streetNumber, setStreetNumber] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    type: 'success' | 'error' | 'processing' | 'multiple' | 'notfound';
    message: string;
    pdfUrl?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await findReport({
        streetNumber: streetNumber.trim(),
        zipCode: zipCode.trim(),
        emailOrPhone: emailOrPhone.trim(),
      });

      if (response.success && response.pdfUrl) {
        // Redirect to PDF
        window.location.href = response.pdfUrl;
      } else {
        setResult({
          type: response.type || 'error',
          message: response.message || 'An error occurred',
        });
      }
    } catch (error: any) {
      setResult({
        type: 'error',
        message: error.message || 'An error occurred while searching for your report.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FF6B35] to-[#4CAF50]">
      {/* Header with Logo */}
      <div className="bg-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-[#1e3a5f] text-center">
            Peak to Plains Well Testing
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="bg-white rounded-lg shadow-xl p-8 mb-6">
          <h2 className="text-3xl font-bold text-[#1e3a5f] mb-4 text-center">
            Retrieve Your Well Inspection Report
          </h2>
          <p className="text-gray-600 text-center mb-8 text-lg">
            Enter the street number, ZIP code, and email or phone used when scheduling to instantly access your completed report.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Street Number */}
            <div>
              <label htmlFor="streetNumber" className="block text-sm font-semibold text-gray-700 mb-2">
                Street Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="streetNumber"
                value={streetNumber}
                onChange={(e) => setStreetNumber(e.target.value)}
                required
                placeholder="e.g., 1234"
                className="w-full px-4 py-4 text-lg bg-gray-50 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                inputMode="numeric"
              />
            </div>

            {/* ZIP Code */}
            <div>
              <label htmlFor="zipCode" className="block text-sm font-semibold text-gray-700 mb-2">
                ZIP Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="zipCode"
                value={zipCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 5);
                  setZipCode(value);
                }}
                required
                placeholder="12345"
                maxLength={5}
                className="w-full px-4 py-4 text-lg bg-gray-50 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                inputMode="numeric"
              />
            </div>

            {/* Email or Phone */}
            <div>
              <label htmlFor="emailOrPhone" className="block text-sm font-semibold text-gray-700 mb-2">
                Email or Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="emailOrPhone"
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                required
                placeholder="email@example.com or (555) 123-4567"
                className="w-full px-4 py-4 text-lg bg-gray-50 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                inputMode="email"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#4CAF50] hover:bg-[#45a049] disabled:bg-gray-400 text-white font-bold text-xl py-5 px-6 rounded-lg shadow-lg transition-colors active:scale-98"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Searching...
                </span>
              ) : (
                'Show My Report'
              )}
            </button>

            {/* Info Note */}
            <p className="text-center text-sm text-gray-500 mt-4">
              No account needed · Only completed and paid reports are available
            </p>
          </form>

          {/* Result Messages */}
          {result && (
            <div className={`mt-6 p-4 rounded-lg ${
              result.type === 'success' ? 'bg-green-50 border-2 border-green-200' :
              result.type === 'error' ? 'bg-red-50 border-2 border-red-200' :
              'bg-yellow-50 border-2 border-yellow-200'
            }`}>
              <p className={`text-center ${
                result.type === 'success' ? 'text-green-800' :
                result.type === 'error' ? 'text-red-800' :
                'text-yellow-800'
              }`}>
                {result.message}
              </p>
              {result.type === 'processing' && (
                <p className="text-center text-sm text-gray-600 mt-2">
                  Text us at{' '}
                  <a href="sms:970-XXX-XXXX" className="text-[#FF6B35] font-semibold underline hover:text-[#e55a2b]">
                    970-XXX-XXXX
                  </a>
                  {' '}for an update.
                </p>
              )}
              {result.type === 'notfound' && (
                <p className="text-center text-sm text-gray-600 mt-2">
                  Text us at{' '}
                  <a href="sms:970-XXX-XXXX" className="text-[#FF6B35] font-semibold underline hover:text-[#e55a2b]">
                    970-XXX-XXXX
                  </a>
                  {' '}and we'll send it in 2 minutes.
                </p>
              )}
              {result.type === 'multiple' && (
                <p className="text-center text-sm text-gray-600 mt-2">
                  Text us at{' '}
                  <a href="sms:970-XXX-XXXX" className="text-[#FF6B35] font-semibold underline hover:text-[#e55a2b]">
                    970-XXX-XXXX
                  </a>
                  {' '}for assistance.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
