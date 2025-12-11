'use server';

import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

// Initialize Supabase client with service role for server actions
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ Supabase credentials missing for find report action');
}

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Simple in-memory rate limiting (for production, use Redis/Upstash)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

// Normalize phone number (remove all non-digits)
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

// Check if input is email or phone
function isEmail(input: string): boolean {
  return input.includes('@') && input.includes('.');
}

// Extract street number from address
function extractStreetNumber(address: string): string | null {
  if (!address) return null;
  // Match digits at the start of the address
  const match = address.match(/^(\d+)/);
  return match ? match[1] : null;
}

interface FindReportParams {
  streetNumber: string;
  zipCode: string;
  emailOrPhone: string;
}

interface FindReportResponse {
  success: boolean;
  type?: 'success' | 'error' | 'processing' | 'multiple' | 'notfound';
  message: string;
  pdfUrl?: string;
}

export async function findReport(
  params: FindReportParams
): Promise<FindReportResponse> {
  // Get client IP for rate limiting
  let clientIp = 'unknown';
  try {
    const headersList = headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    clientIp = forwardedFor?.split(',')[0] || realIp || 'unknown';
  } catch (error) {
    // If headers() fails, use unknown
    console.warn('Could not get client IP:', error);
  }

  // Rate limiting
  if (!checkRateLimit(clientIp)) {
    return {
      success: false,
      type: 'error',
      message: 'Too many search attempts. Please try again in an hour.',
    };
  }

  // Validation
  if (!params.streetNumber || !params.zipCode || !params.emailOrPhone) {
    return {
      success: false,
      type: 'error',
      message: 'Please fill in all fields.',
    };
  }

  if (!supabase) {
    return {
      success: false,
      type: 'error',
      message: 'Service temporarily unavailable. Please try again later.',
    };
  }

  try {
    // Build query - join jobs and well_reports
    // First, get all jobs that match address and zip, and have a well_report
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select(`
        id,
        address,
        zip,
        email,
        phone,
        status,
        well_reports!inner(id, job_id)
      `)
      .ilike('address', `${params.streetNumber}%`)
      .eq('zip', params.zipCode);

    if (error) {
      console.error('Error searching for report:', error);
      return {
        success: false,
        type: 'error',
        message: 'An error occurred while searching. Please try again.',
      };
    }


    // Filter results
    const isEmailInput = isEmail(params.emailOrPhone);
    const normalizedInputPhone = isEmailInput ? null : normalizePhone(params.emailOrPhone);
    
    const matchingJobs = (jobs || []).filter(job => {
      // Check address starts with street number (case-insensitive)
      const jobStreetNumber = extractStreetNumber(job.address || '');
      if (!jobStreetNumber || jobStreetNumber.toLowerCase() !== params.streetNumber.toLowerCase()) {
        return false;
      }

      // Check email or phone match
      if (isEmailInput) {
        const jobEmail = (job.email || '').toLowerCase().trim();
        const inputEmail = params.emailOrPhone.toLowerCase().trim();
        if (!jobEmail || !jobEmail.includes(inputEmail)) {
          return false;
        }
      } else {
        const normalizedJobPhone = normalizePhone(job.phone || '');
        if (!normalizedJobPhone) {
          return false;
        }
        // Match if last 10 digits match (handles country codes and formatting)
        const inputLast10 = normalizedInputPhone!.slice(-10);
        const jobLast10 = normalizedJobPhone.slice(-10);
        if (inputLast10 !== jobLast10) {
          return false;
        }
      }

      return true;
    });

    // Handle results
    if (matchingJobs.length === 0) {
      return {
        success: false,
        type: 'notfound',
        message: 'No completed report found with that information.',
      };
    }

    if (matchingJobs.length > 1) {
      return {
        success: false,
        type: 'multiple',
        message: 'Multiple records found – please include more details or text us.',
      };
    }

    const job = matchingJobs[0];

    // Check if job is completed
    const isCompleted = job.status === 'complete' || job.status === 'completed';

    if (!isCompleted) {
      return {
        success: false,
        type: 'processing',
        message: 'Your report is still being processed or payment is pending. We'll email it as soon as it's ready, or text us at 970-XXX-XXXX for an update.',
      };
    }

    // Generate signed URL for PDF
    const pdfPath = `well-report-pdfs/${job.id}.pdf`;
    
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('well-report-pdfs')
      .createSignedUrl(pdfPath, 900); // 15 minutes

    if (urlError || !signedUrlData) {
      console.error('Error generating signed URL:', urlError);
      return {
        success: false,
        type: 'error',
        message: 'Report found but PDF is not available. Please contact us at 970-XXX-XXXX.',
      };
    }

    return {
      success: true,
      type: 'success',
      message: 'Report found! Redirecting...',
      pdfUrl: signedUrlData.signedUrl,
    };
  } catch (error: any) {
    console.error('Error in findReport:', error);
    return {
      success: false,
      type: 'error',
      message: 'An unexpected error occurred. Please try again.',
    };
  }
}
