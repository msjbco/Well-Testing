const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const fsSync = require('fs'); // For synchronous file checks
const path = require('path');

// Import utility modules
const { readDataFile, writeDataFile, ensureDataDir, DATA_DIR } = require('./utils/dataFiles');
const { uploadBase64PhotosToStorage } = require('./utils/storage');

// Try to load dotenv (optional - server will work without it)
const envPath = path.join(__dirname, '.env.local');

// Function to manually parse .env.local file
function loadEnvManually(filePath) {
  try {
    if (!fsSync.existsSync(filePath)) return false;
    
    const content = fsSync.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    }
    return true;
  } catch (error) {
    console.warn('⚠️  Error manually loading .env.local:', error.message);
    return false;
  }
}

// Try to use dotenv package first
let dotenvLoaded = false;
try {
  const dotenv = require('dotenv');
  
  // Check if file exists
  if (fsSync.existsSync(envPath)) {
    console.log(`📄 Found .env.local at: ${envPath}`);
    const result = dotenv.config({ path: envPath });
    if (result.error) {
      console.warn('⚠️  dotenv.config() error:', result.error.message);
      console.warn('   Trying manual parsing...');
      dotenvLoaded = loadEnvManually(envPath);
    } else {
      console.log('✅ .env.local loaded successfully (via dotenv)');
      dotenvLoaded = true;
    }
  } else {
    // Try current directory
    const currentDirPath = path.join(process.cwd(), '.env.local');
    if (fsSync.existsSync(currentDirPath)) {
      console.log(`📄 Found .env.local at: ${currentDirPath}`);
      const result = dotenv.config({ path: currentDirPath });
      if (result.error) {
        console.warn('⚠️  dotenv.config() error:', result.error.message);
        dotenvLoaded = loadEnvManually(currentDirPath);
      } else {
        console.log('✅ .env.local loaded successfully (via dotenv)');
        dotenvLoaded = true;
      }
    } else {
      console.warn(`⚠️  .env.local not found at: ${envPath}`);
      console.warn(`   Also checked: ${currentDirPath}`);
    }
  }
  
  // If dotenv didn't work, try manual parsing
  if (!dotenvLoaded && fsSync.existsSync(envPath)) {
    console.log('   Attempting manual parsing...');
    dotenvLoaded = loadEnvManually(envPath);
    if (dotenvLoaded) {
      console.log('✅ .env.local loaded successfully (manual parsing)');
    }
  }
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND') {
    console.warn('⚠️  dotenv package not found in node_modules');
    console.warn('   Attempting manual parsing of .env.local...');
    if (fsSync.existsSync(envPath)) {
      dotenvLoaded = loadEnvManually(envPath);
      if (dotenvLoaded) {
        console.log('✅ .env.local loaded successfully (manual parsing)');
      }
    }
  } else {
    console.warn('⚠️  Error requiring dotenv:', error.message);
    // Try manual parsing as fallback
    if (fsSync.existsSync(envPath)) {
      dotenvLoaded = loadEnvManually(envPath);
      if (dotenvLoaded) {
        console.log('✅ .env.local loaded successfully (manual parsing fallback)');
      }
    }
  }
}

// Try to load Supabase client (optional)
let createClient;
try {
  createClient = require('@supabase/supabase-js').createClient;
} catch (error) {
  console.warn('⚠️  @supabase/supabase-js not found - Supabase syncing will be disabled');
  createClient = null;
}

const app = express();
const PORT = 3003;
// DATA_DIR is now imported from utils/dataFiles.js

// Initialize Supabase client (optional - will gracefully fail if env vars missing)
// IMPORTANT: Use SERVICE_ROLE_KEY for server-side operations (bypasses RLS)
// The anon key is for client-side operations where RLS should apply
let supabase = null;
if (createClient) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Try service role key first (for server-side operations that bypass RLS)
    // Fall back to anon key if service role not available
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const usingServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Debug: Log what we found
    if (supabaseUrl) {
      console.log(`📋 Found SUPABASE_URL: ${supabaseUrl.substring(0, 30)}...`);
    } else {
      console.warn('⚠️  NEXT_PUBLIC_SUPABASE_URL not found in process.env');
    }
    
    if (supabaseKey) {
      if (usingServiceRole) {
        console.log(`📋 Found SUPABASE_SERVICE_ROLE_KEY: ${supabaseKey.substring(0, 20)}... (${supabaseKey.length} chars)`);
        console.log('   Using SERVICE_ROLE_KEY - RLS will be bypassed for server operations');
      } else {
        console.log(`📋 Found NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseKey.substring(0, 20)}... (${supabaseKey.length} chars)`);
        console.warn('   ⚠️  Using ANON_KEY - RLS policies will apply. Consider adding SUPABASE_SERVICE_ROLE_KEY to .env.local');
      }
    } else {
      console.warn('⚠️  No Supabase key found (neither SERVICE_ROLE_KEY nor ANON_KEY)');
    }
    
    if (supabaseUrl && supabaseKey) {
      supabase = createClient(supabaseUrl, supabaseKey);
      console.log('✅ Supabase client initialized for job syncing');
    } else {
      console.warn('⚠️  Supabase credentials not found in environment variables');
      console.warn('   Make sure .env.local has:');
      console.warn('   - NEXT_PUBLIC_SUPABASE_URL');
      console.warn('   - SUPABASE_SERVICE_ROLE_KEY (recommended for server) or NEXT_PUBLIC_SUPABASE_ANON_KEY');
      console.warn('   Jobs will only save to local JSON until Supabase is configured');
    }
  } catch (error) {
    console.warn('⚠️  Failed to initialize Supabase client:', error.message);
  }
} else {
  console.warn('⚠️  @supabase/supabase-js package not found');
  console.warn('   Run: npm install @supabase/supabase-js');
  console.warn('   Jobs will only save to local JSON until Supabase is configured');
}

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Increased limit for photo data
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// /find-my-report is now served as a static HTML file (find-my-report.html)

// ========== FIND REPORT API ==========

// Helper functions for find report
function normalizePhone(phone) {
  return phone.replace(/\D/g, '');
}

function isEmail(input) {
  return input.includes('@') && input.includes('.');
}

function extractStreetNumber(address) {
  if (!address) return null;
  const match = address.match(/^(\d+)/);
  return match ? match[1] : null;
}

// Simple in-memory rate limiting
const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip) {
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

// Find report endpoint
app.post('/api/find-report', async (req, res) => {
  try {
    // Get client IP for rate limiting
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    
    // Rate limiting
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({
        success: false,
        type: 'error',
        message: 'Too many search attempts. Please try again in an hour.',
      });
    }

    const { streetNumber, zipCode, emailOrPhone } = req.body;

    // Validation
    if (!streetNumber || !zipCode || !emailOrPhone) {
      return res.status(400).json({
        success: false,
        type: 'error',
        message: 'Please fill in all fields.',
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        type: 'error',
        message: 'Service temporarily unavailable. Please try again later.',
      });
    }

    // Build query - join jobs and well_reports
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
      .ilike('address', `${streetNumber}%`)
      .eq('zip', zipCode);

    if (error) {
      console.error('Error searching for report:', error);
      return res.status(500).json({
        success: false,
        type: 'error',
        message: 'An error occurred while searching. Please try again.',
      });
    }

    // Filter results
    const isEmailInput = isEmail(emailOrPhone);
    const normalizedInputPhone = isEmailInput ? null : normalizePhone(emailOrPhone);
    
    const matchingJobs = (jobs || []).filter(job => {
      // Check address starts with street number (case-insensitive)
      const jobStreetNumber = extractStreetNumber(job.address || '');
      if (!jobStreetNumber || jobStreetNumber.toLowerCase() !== streetNumber.toLowerCase()) {
        return false;
      }

      // Check email or phone match
      if (isEmailInput) {
        const jobEmail = (job.email || '').toLowerCase().trim();
        const inputEmail = emailOrPhone.toLowerCase().trim();
        if (!jobEmail || !jobEmail.includes(inputEmail)) {
          return false;
        }
      } else {
        const normalizedJobPhone = normalizePhone(job.phone || '');
        if (!normalizedJobPhone) {
          return false;
        }
        // Match if last 10 digits match (handles country codes and formatting)
        const inputLast10 = normalizedInputPhone.slice(-10);
        const jobLast10 = normalizedJobPhone.slice(-10);
        if (inputLast10 !== jobLast10) {
          return false;
        }
      }

      return true;
    });

    // Handle results
    if (matchingJobs.length === 0) {
      return res.json({
        success: false,
        type: 'notfound',
        message: 'No completed report found with that information.',
      });
    }

    if (matchingJobs.length > 1) {
      return res.json({
        success: false,
        type: 'multiple',
        message: 'Multiple records found – please include more details or text us.',
      });
    }

    const job = matchingJobs[0];

    // Check if job is completed
    const isCompleted = job.status === 'complete' || job.status === 'completed';

    if (!isCompleted) {
      return res.json({
        success: false,
        type: 'processing',
        message: 'Your report is still being processed or payment is pending. We\'ll email it as soon as it\'s ready, or text us at 970-XXX-XXXX for an update.',
      });
    }

    // Generate signed URL for PDF
    const pdfPath = `well-report-pdfs/${job.id}.pdf`;
    
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('well-report-pdfs')
      .createSignedUrl(pdfPath, 900); // 15 minutes

    if (urlError || !signedUrlData) {
      console.error('Error generating signed URL:', urlError);
      return res.json({
        success: false,
        type: 'error',
        message: 'Report found but PDF is not available. Please contact us at 970-XXX-XXXX.',
      });
    }

    return res.json({
      success: true,
      type: 'success',
      message: 'Report found! Redirecting...',
      pdfUrl: signedUrlData.signedUrl,
    });
  } catch (error) {
    console.error('Error in find-report:', error);
    return res.status(500).json({
      success: false,
      type: 'error',
      message: 'An unexpected error occurred. Please try again.',
    });
  }
});

// Serve static files from the root directory
app.use(express.static(__dirname));

// Data directory and file functions are now imported from utils/dataFiles.js

// ========== JOBS API ==========

// Get all jobs
app.get('/api/jobs', async (req, res) => {
  try {
    // Try to get from Supabase first, fallback to local JSON
    if (supabase) {
      try {
        const { data: supabaseJobs, error: supabaseError } = await supabase
          .from('jobs')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (supabaseError) {
          console.warn('⚠️  Supabase error loading jobs:', supabaseError.message);
        } else {
          console.log(`📊 Loaded ${supabaseJobs?.length || 0} jobs from Supabase`);
          
          // Merge with local JSON to get local tech IDs
          let localJobs = [];
          try {
            localJobs = await readDataFile('jobs.json');
          } catch (localErr) {
            console.warn('⚠️  Could not load local jobs for merging:', localErr.message);
          }
          
          // Return Supabase jobs (even if empty array) - don't fallback to local JSON
          // This ensures we're always using Supabase as the source of truth
          // But merge local tech IDs from local JSON
          const mappedJobs = (supabaseJobs || []).map(job => {
            // Find matching job in local JSON to get local tech ID
            const localJob = localJobs.find(lj => lj.id === job.id);
            
            return {
              id: job.id,
              propertyAddress: job.address,
              address: job.address,
              name: job.client_name,
              client_name: job.client_name,
              firstName: job.firstName || null,
              lastName: job.lastName || null,
              email: job.email,
              phone: job.phone,
              city: job.city,
              state: job.state,
              zip: job.zip,
              county: job.county || null,
              userRole: job.role,
              role: job.role,
              notes: job.notes,
              wellPermitNumber: job.wellPermitNumber || null,
              hasCistern: job.hasCistern || null,
              equipmentInspection: job.equipmentInspection || null,
              willBePresent: job.willBePresent || null,
              accessInstructions: job.accessInstructions || null,
              scheduledDate: job.scheduledDate || null,
              status: job.status || 'in-progress',
              // Use local tech ID if available, otherwise use Supabase UUID
              assignedTechId: localJob?.assignedTechId || job.assigned_tech_id || null,
              assigned_tech_id: job.assigned_tech_id || null,
              archived: job.archived || false,
              archivedAt: job.archived_at || null,
              createdAt: job.created_at,
              created_at: job.created_at,
              updatedAt: job.updated_at,
              updated_at: job.updated_at,
            };
          });
          return res.json(mappedJobs);
        }
      } catch (supabaseErr) {
        console.warn('⚠️  Failed to load from Supabase, using local JSON:', supabaseErr.message);
      }
    }
    
    // Fallback to local JSON only if Supabase is not available
    console.log('📄 Loading jobs from local JSON (Supabase not available)');
    const jobs = await readDataFile('jobs.json');
    console.log(`📊 Loaded ${jobs.length} jobs from local JSON`);
    res.json(jobs);
  } catch (error) {
    console.error('Error reading jobs:', error);
    res.status(500).json({ error: 'Failed to read jobs' });
  }
});

// Get single job by ID
app.get('/api/jobs/:id', async (req, res) => {
  try {
    // Try Supabase first
    if (supabase) {
      try {
        const { data: job, error: supabaseError } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', req.params.id)
          .single();
        
        if (!supabaseError && job) {
          // Map to local format
          const mappedJob = {
            id: job.id,
            propertyAddress: job.address,
            address: job.address,
            name: job.client_name,
            client_name: job.client_name,
            firstName: job.firstName || null,
            lastName: job.lastName || null,
            email: job.email,
            phone: job.phone,
            city: job.city,
            state: job.state,
            zip: job.zip,
            county: job.county || null,
            userRole: job.role,
            role: job.role,
            notes: job.notes,
            wellPermitNumber: job.wellPermitNumber || null,
            hasCistern: job.hasCistern || null,
            equipmentInspection: job.equipmentInspection || null,
            willBePresent: job.willBePresent || null,
            accessInstructions: job.accessInstructions || null,
            scheduledDate: job.scheduledDate || null,
            status: job.status || 'in-progress',
            // Check local JSON for assignedTechId if assigned_tech_id is null
            assignedTechId: job.assigned_tech_id || (async () => {
              try {
                const localJobs = await readDataFile('jobs.json');
                const localJob = localJobs.find(j => j.id === job.id);
                return localJob?.assignedTechId || job.assigned_tech_id;
              } catch {
                return job.assigned_tech_id;
              }
            })(),
            assigned_tech_id: job.assigned_tech_id,
            archived: job.archived || false,
            archivedAt: job.archived_at || null,
            createdAt: job.created_at,
            created_at: job.created_at,
            updatedAt: job.updated_at,
            updated_at: job.updated_at,
          };
          return res.json(mappedJob);
        }
      } catch (supabaseErr) {
        console.warn('⚠️  Failed to load from Supabase, using local JSON:', supabaseErr.message);
      }
    }
    
    // Fallback to local JSON
    const jobs = await readDataFile('jobs.json');
    const job = jobs.find(j => j.id === req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
  } catch (error) {
    console.error('Error reading job:', error);
    res.status(500).json({ error: 'Failed to read job' });
  }
});

// Create new job
app.post('/api/jobs', async (req, res) => {
  try {
    // Try Supabase first (primary source of truth)
    if (supabase) {
      try {
        // Map the job data to Supabase format
        // Handle both formats:
        // - Main site: sends 'name' (single field)
        // - PWA: sends 'firstName' + 'lastName' (combined into client_name)
        let clientName = req.body.client_name || req.body.name || null;
        if (!clientName && (req.body.firstName || req.body.lastName)) {
          // Combine first and last name if provided separately
          clientName = `${req.body.firstName || ''} ${req.body.lastName || ''}`.trim() || null;
        }
        
        const supabaseJob = {
          address: req.body.propertyAddress || req.body.address || null,
          client_name: clientName,
          firstName: req.body.firstName || null,
          lastName: req.body.lastName || null,
          email: req.body.email || null,
          phone: req.body.phone || null,
          city: req.body.city || null,
          state: req.body.state || null,
          zip: req.body.zip || null,
          county: req.body.county || null,
          role: req.body.userRole || req.body.role || null,
          notes: req.body.notes || null,
          wellPermitNumber: req.body.wellPermitNumber || null,
          hasCistern: req.body.hasCistern || null,
          equipmentInspection: req.body.equipmentInspection || null,
          willBePresent: req.body.willBePresent || null,
          accessInstructions: req.body.willBePresent === 'no' ? (req.body.accessInstructions || null) : null,
          scheduledDate: req.body.scheduledDate ? (req.body.scheduledDate.includes('T') ? `${req.body.scheduledDate}:00` : `${req.body.scheduledDate}T00:00:00`) : null,
          status: req.body.status || 'in-progress',
          assigned_tech_id: req.body.assignedTechId || req.body.assigned_tech_id || null,
        };
        
        // If ID is provided and is a UUID, use it; otherwise let Supabase generate one
        if (req.body.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.body.id)) {
          supabaseJob.id = req.body.id;
        }
        
        const { data: supabaseData, error: supabaseError } = await supabase
          .from('jobs')
          .insert(supabaseJob)
          .select()
          .single();
        
        if (supabaseError) {
          console.error('⚠️  Failed to create job in Supabase:', supabaseError.message);
          throw supabaseError; // Fail the request if Supabase fails
        } else {
          console.log('✅ Job created in Supabase:', supabaseData.id);
          
          // Also save to local JSON for backup
          try {
            const jobs = await readDataFile('jobs.json');
            const localJob = {
              id: supabaseData.id,
              propertyAddress: supabaseData.address,
              address: supabaseData.address,
              name: supabaseData.client_name,
              client_name: supabaseData.client_name,
              firstName: supabaseData.firstName || null,
              lastName: supabaseData.lastName || null,
              email: supabaseData.email,
              phone: supabaseData.phone,
              city: supabaseData.city,
              state: supabaseData.state,
              zip: supabaseData.zip,
              county: supabaseData.county || null,
              userRole: supabaseData.role,
              role: supabaseData.role,
              notes: supabaseData.notes,
              wellPermitNumber: supabaseData.wellPermitNumber || null,
              hasCistern: supabaseData.hasCistern || null,
              equipmentInspection: supabaseData.equipmentInspection || null,
              willBePresent: supabaseData.willBePresent || null,
              accessInstructions: supabaseData.accessInstructions || null,
              scheduledDate: supabaseData.scheduledDate || null,
              status: supabaseData.status || 'in-progress',
              assignedTechId: supabaseData.assigned_tech_id,
              assigned_tech_id: supabaseData.assigned_tech_id,
              createdAt: supabaseData.created_at,
              created_at: supabaseData.created_at,
              updatedAt: supabaseData.updated_at,
              updated_at: supabaseData.updated_at,
            };
            jobs.push(localJob);
            await writeDataFile('jobs.json', jobs);
            console.log('✅ Job also saved to local JSON backup');
          } catch (localErr) {
            console.warn('⚠️  Failed to save to local JSON (non-critical):', localErr.message);
          }
          
          // Return in the format expected by the main site
          const responseJob = {
            id: supabaseData.id,
            propertyAddress: supabaseData.address,
            address: supabaseData.address,
            name: supabaseData.client_name,
            client_name: supabaseData.client_name,
            firstName: supabaseData.firstName || null,
            lastName: supabaseData.lastName || null,
            email: supabaseData.email,
            phone: supabaseData.phone,
            city: supabaseData.city,
            state: supabaseData.state,
            zip: supabaseData.zip,
            county: supabaseData.county || null,
            userRole: supabaseData.role,
            role: supabaseData.role,
            notes: supabaseData.notes,
            wellPermitNumber: supabaseData.wellPermitNumber || null,
            hasCistern: supabaseData.hasCistern || null,
            equipmentInspection: supabaseData.equipmentInspection || null,
            willBePresent: supabaseData.willBePresent || null,
            accessInstructions: supabaseData.accessInstructions || null,
            scheduledDate: supabaseData.scheduledDate || null,
            status: supabaseData.status || 'in-progress',
            assignedTechId: supabaseData.assigned_tech_id,
            assigned_tech_id: supabaseData.assigned_tech_id,
            createdAt: supabaseData.created_at,
            created_at: supabaseData.created_at,
            updatedAt: supabaseData.updated_at,
            updated_at: supabaseData.updated_at,
          };
            return res.status(201).json(responseJob);
        }
      } catch (syncError) {
        console.error('⚠️  Error creating job in Supabase:', syncError.message);
        // Fall through to local JSON fallback
      }
    }
    
    // Fallback to local JSON only if Supabase is not available
    console.log('📄 Creating job in local JSON (Supabase not available)');
    const jobs = await readDataFile('jobs.json');
    const newJob = {
      ...req.body,
      id: req.body.id || `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: req.body.createdAt || new Date().toISOString()
    };
    jobs.push(newJob);
    await writeDataFile('jobs.json', jobs);
    console.log('✅ Job created in local JSON:', newJob.id);
    res.status(201).json(newJob);
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// Update job
app.put('/api/jobs/:id', async (req, res) => {
  try {
    console.log('📝 PUT /api/jobs/:id - Job ID:', req.params.id);
    console.log('📝 Request body keys:', Object.keys(req.body));
    console.log('📝 assignedTechId in body:', req.body.assignedTechId);
    
    // Try Supabase first (primary source of truth)
    if (supabase) {
      try {
        // First, try to get the existing job from Supabase
        const { data: existingJob, error: fetchError } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', req.params.id)
          .single();
        
        console.log('📝 Existing job from Supabase:', existingJob ? 'Found' : 'Not found');
        console.log('📝 Fetch error:', fetchError ? fetchError.message : 'None');
        
        // If job doesn't exist in Supabase, check local JSON first
        if (fetchError && fetchError.code === 'PGRST116') {
          console.log('📄 Job not found in Supabase, checking local JSON...');
          const jobs = await readDataFile('jobs.json');
          console.log('📝 Total jobs in local JSON:', jobs.length);
          const localJob = jobs.find(j => j.id === req.params.id);
          console.log('📝 Local job found:', localJob ? 'Yes' : 'No');
          
          if (!localJob) {
            console.error('❌ Job not found in local JSON either. Job ID:', req.params.id);
            return res.status(404).json({ error: 'Job not found' });
          }
          
          // Job exists in local JSON but not Supabase - update local JSON only
          const updatedJob = {
            ...localJob,
            ...req.body,
            id: req.params.id,
            updatedAt: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          // Handle assignedTechId mapping
          if (req.body.assignedTechId !== undefined) {
            updatedJob.assignedTechId = req.body.assignedTechId;
            updatedJob.assigned_tech_id = req.body.assignedTechId;
            console.log('📝 Setting assignedTechId to:', req.body.assignedTechId);
          }
          
          jobs[jobs.findIndex(j => j.id === req.params.id)] = updatedJob;
          await writeDataFile('jobs.json', jobs);
          console.log('✅ Job updated in local JSON:', updatedJob.id);
          return res.json(updatedJob);
        }
        
        if (fetchError && fetchError.code !== 'PGRST116') {
          console.warn('⚠️  Error fetching job from Supabase:', fetchError.message);
        }
        
        // Handle both name formats (main site: 'name', PWA: 'firstName' + 'lastName')
        let clientName = req.body.client_name || req.body.name || existingJob?.client_name || null;
        if (!clientName && (req.body.firstName || req.body.lastName)) {
          clientName = `${req.body.firstName || ''} ${req.body.lastName || ''}`.trim() || null;
        }
        
        // Build update object - include archived field if provided
        const supabaseJob = {
          address: req.body.propertyAddress !== undefined ? (req.body.propertyAddress || req.body.address || null) : (existingJob?.address || null),
          client_name: clientName !== undefined ? clientName : (existingJob?.client_name || null),
          firstName: req.body.firstName !== undefined ? req.body.firstName : (existingJob?.firstName || null),
          lastName: req.body.lastName !== undefined ? req.body.lastName : (existingJob?.lastName || null),
          email: req.body.email !== undefined ? req.body.email : (existingJob?.email || null),
          phone: req.body.phone !== undefined ? req.body.phone : (existingJob?.phone || null),
          city: req.body.city !== undefined ? req.body.city : (existingJob?.city || null),
          state: req.body.state !== undefined ? req.body.state : (existingJob?.state || null),
          zip: req.body.zip !== undefined ? req.body.zip : (existingJob?.zip || null),
          county: req.body.county !== undefined ? req.body.county : (existingJob?.county || null),
          role: req.body.userRole !== undefined || req.body.role !== undefined ? (req.body.userRole || req.body.role || null) : (existingJob?.role || null),
          notes: req.body.notes !== undefined ? req.body.notes : (existingJob?.notes || null),
          wellPermitNumber: req.body.wellPermitNumber !== undefined ? req.body.wellPermitNumber : (existingJob?.wellPermitNumber || null),
          hasCistern: req.body.hasCistern !== undefined ? req.body.hasCistern : (existingJob?.hasCistern || null),
          equipmentInspection: req.body.equipmentInspection !== undefined ? req.body.equipmentInspection : (existingJob?.equipmentInspection || null),
          willBePresent: req.body.willBePresent !== undefined ? req.body.willBePresent : (existingJob?.willBePresent || null),
          accessInstructions: req.body.willBePresent !== undefined && req.body.willBePresent === 'no' 
            ? (req.body.accessInstructions || null) 
            : (req.body.willBePresent === 'yes' ? null : (existingJob?.accessInstructions || null)),
          scheduledDate: req.body.scheduledDate !== undefined 
            ? (req.body.scheduledDate ? (req.body.scheduledDate.includes('T') ? `${req.body.scheduledDate}:00` : `${req.body.scheduledDate}T00:00:00`) : null)
            : (existingJob?.scheduledDate || null),
          status: req.body.status !== undefined ? req.body.status : (existingJob?.status || 'in-progress'),
          // Handle assigned_tech_id - if it's not a UUID, we'll need to resolve it later
          assigned_tech_id: req.body.assignedTechId !== undefined || req.body.assigned_tech_id !== undefined 
            ? (req.body.assignedTechId || req.body.assigned_tech_id || null) 
            : (existingJob?.assigned_tech_id || null),
        };
        
        // Store the original assignedTechId for local reference
        const originalAssignedTechId = req.body.assignedTechId || req.body.assigned_tech_id || existingJob?.assigned_tech_id || null;
        
        // If assignedTechId is provided and it's not a UUID, try to resolve it to a UUID
        if (supabaseJob.assigned_tech_id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(supabaseJob.assigned_tech_id)) {
          console.log('📝 Tech ID is not a UUID, trying to resolve to user_id...');
          try {
            const techs = await readDataFile('techs.json');
            const tech = techs.find(t => t.id === supabaseJob.assigned_tech_id || t.assignedTechId === supabaseJob.assigned_tech_id);
            
            if (tech && (tech.userId || tech.user_id)) {
              // Use the tech's user_id (UUID) for Supabase
              supabaseJob.assigned_tech_id = tech.userId || tech.user_id;
              console.log('📝 Resolved tech ID to user_id:', supabaseJob.assigned_tech_id);
            } else {
              // Tech doesn't have a user_id, can't sync to Supabase - set to null
              // But we'll store the local tech ID in local JSON
              console.warn('⚠️  Tech not found or has no user_id. Setting assigned_tech_id to null in Supabase, but will store local tech ID in local JSON.');
              supabaseJob.assigned_tech_id = null;
            }
          } catch (techLookupErr) {
            console.warn('⚠️  Error looking up tech:', techLookupErr.message);
            // If we can't resolve it, set to null
            supabaseJob.assigned_tech_id = null;
          }
        }
        
        // Include archived field if it's in the request (for archiving/unarchiving)
        if (req.body.archived !== undefined) {
          supabaseJob.archived = req.body.archived;
        }
        if (req.body.archivedAt !== undefined) {
          supabaseJob.archived_at = req.body.archivedAt;
        }
        
        // Remove null/undefined values to avoid overwriting with null
        Object.keys(supabaseJob).forEach(key => {
          if (supabaseJob[key] === null || supabaseJob[key] === undefined) {
            delete supabaseJob[key];
          }
        });
        
        const { data: supabaseData, error: supabaseError } = await supabase
          .from('jobs')
          .update(supabaseJob)
          .eq('id', req.params.id)
          .select()
          .single();
        
        if (supabaseError) {
          console.error('⚠️  Failed to update job in Supabase:', supabaseError.message);
          
          // If the error is about invalid UUID (tech ID is not a UUID), try to resolve it
          if (supabaseError.message && supabaseError.message.includes('invalid input syntax for type uuid')) {
            console.log('📝 Tech ID is not a UUID, trying to resolve...');
            
            // Try to find the tech in local JSON to get its user_id
            try {
              const techs = await readDataFile('techs.json');
              const tech = techs.find(t => t.id === req.body.assignedTechId || t.assignedTechId === req.body.assignedTechId);
              
              if (tech && (tech.userId || tech.user_id)) {
                // Use the tech's user_id (UUID) for Supabase
                const userId = tech.userId || tech.user_id;
                console.log('📝 Found tech user_id:', userId);
                
                // Retry the update with the UUID
                const retryJob = {
                  ...supabaseJob,
                  assigned_tech_id: userId
                };
                
                // Remove null/undefined values
                Object.keys(retryJob).forEach(key => {
                  if (retryJob[key] === null || retryJob[key] === undefined) {
                    delete retryJob[key];
                  }
                });
                
                const { data: retryData, error: retryError } = await supabase
                  .from('jobs')
                  .update(retryJob)
                  .eq('id', req.params.id)
                  .select()
                  .single();
                
                if (!retryError && retryData) {
                  console.log('✅ Job updated in Supabase with resolved user_id:', retryData.id);
                  
          // Also update local JSON if job exists there
          try {
            const jobs = await readDataFile('jobs.json');
            const jobIndex = jobs.findIndex(j => j.id === req.params.id);
            const localJob = {
              id: retryData.id,
              propertyAddress: retryData.address,
              address: retryData.address,
              name: retryData.client_name,
              client_name: retryData.client_name,
              email: retryData.email,
              phone: retryData.phone,
              city: retryData.city,
              state: retryData.state,
              zip: retryData.zip,
              userRole: retryData.role,
              role: retryData.role,
              notes: retryData.notes,
              status: retryData.status || 'in-progress',
              assignedTechId: originalAssignedTechId, // Keep the original tech ID for local reference
              assigned_tech_id: userId, // But store the UUID too
              archived: retryData.archived || false,
              createdAt: retryData.created_at,
              created_at: retryData.created_at,
              updatedAt: retryData.updated_at,
              updated_at: retryData.updated_at,
            };
            
            if (jobIndex !== -1) {
              jobs[jobIndex] = localJob;
            } else {
              jobs.push(localJob);
            }
            await writeDataFile('jobs.json', jobs);
            console.log('✅ Job also saved/updated in local JSON');
          } catch (localErr) {
            console.warn('⚠️  Failed to update local JSON (non-critical):', localErr.message);
          }
                  
                  // Return response
                  const responseJob = {
                    id: retryData.id,
                    propertyAddress: retryData.address,
                    address: retryData.address,
                    name: retryData.client_name,
                    client_name: retryData.client_name,
                    firstName: retryData.firstName || null,
                    lastName: retryData.lastName || null,
                    email: retryData.email,
                    phone: retryData.phone,
                    city: retryData.city,
                    state: retryData.state,
                    zip: retryData.zip,
                    county: retryData.county || null,
                    userRole: retryData.role,
                    role: retryData.role,
                    notes: retryData.notes,
                    wellPermitNumber: retryData.wellPermitNumber || null,
                    hasCistern: retryData.hasCistern || null,
                    equipmentInspection: retryData.equipmentInspection || null,
                    willBePresent: retryData.willBePresent || null,
                    accessInstructions: retryData.accessInstructions || null,
                    scheduledDate: retryData.scheduledDate || null,
                    status: retryData.status || 'in-progress',
                    assignedTechId: req.body.assignedTechId, // Return the original tech ID for frontend
                    assigned_tech_id: userId,
                    archived: retryData.archived || false,
                    createdAt: retryData.created_at,
                    created_at: retryData.created_at,
                    updatedAt: retryData.updated_at,
                    updated_at: retryData.updated_at,
                  };
                  return res.json(responseJob);
                }
              } else {
                console.warn('⚠️  Tech not found in local JSON or has no user_id. Tech ID:', req.body.assignedTechId);
              }
            } catch (techLookupErr) {
              console.warn('⚠️  Error looking up tech:', techLookupErr.message);
            }
          }
          
          // If update still fails, check if job exists in local JSON and update there
          try {
            const jobs = await readDataFile('jobs.json');
            const localJob = jobs.find(j => j.id === req.params.id);
            
            if (localJob) {
              // Update local JSON
              const updatedJob = {
                ...localJob,
                ...req.body,
                id: req.params.id,
                updatedAt: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              
              // Handle assignedTechId mapping
              if (req.body.assignedTechId !== undefined) {
                updatedJob.assignedTechId = req.body.assignedTechId;
                updatedJob.assigned_tech_id = req.body.assignedTechId;
              }
              
              jobs[jobs.findIndex(j => j.id === req.params.id)] = updatedJob;
              await writeDataFile('jobs.json', jobs);
              console.log('✅ Job updated in local JSON (Supabase update failed):', updatedJob.id);
              return res.json(updatedJob);
            }
          } catch (localErr) {
            console.warn('⚠️  Error checking local JSON:', localErr.message);
          }
          
          // If job doesn't exist in local JSON either, but exists in Supabase, 
          // create it in local JSON with the update
          if (existingJob) {
            console.log('📝 Job exists in Supabase but not local JSON, creating in local JSON...');
            const jobs = await readDataFile('jobs.json');
            
            // Try to resolve tech ID to user_id if needed
            let resolvedTechId = req.body.assignedTechId || existingJob.assigned_tech_id;
            if (resolvedTechId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedTechId)) {
              try {
                const techs = await readDataFile('techs.json');
                const tech = techs.find(t => t.id === resolvedTechId);
                if (tech && (tech.userId || tech.user_id)) {
                  // Keep the original tech ID for local reference, but also store the UUID
                  resolvedTechId = tech.userId || tech.user_id;
                }
              } catch (techErr) {
                console.warn('⚠️  Error resolving tech ID:', techErr.message);
              }
            }
            
            const newLocalJob = {
              id: existingJob.id,
              propertyAddress: existingJob.address,
              address: existingJob.address,
              name: existingJob.client_name,
              client_name: existingJob.client_name,
              firstName: existingJob.firstName || null,
              lastName: existingJob.lastName || null,
              email: existingJob.email,
              phone: existingJob.phone,
              city: existingJob.city,
              state: existingJob.state,
              zip: existingJob.zip,
              county: existingJob.county || null,
              userRole: existingJob.role,
              role: existingJob.role,
              notes: existingJob.notes,
              wellPermitNumber: existingJob.wellPermitNumber || null,
              hasCistern: existingJob.hasCistern || null,
              equipmentInspection: existingJob.equipmentInspection || null,
              willBePresent: existingJob.willBePresent || null,
              accessInstructions: existingJob.accessInstructions || null,
              scheduledDate: existingJob.scheduledDate || null,
              status: existingJob.status || 'in-progress',
              assignedTechId: req.body.assignedTechId || existingJob.assigned_tech_id, // Keep original for local reference
              assigned_tech_id: resolvedTechId, // Use resolved UUID
              archived: existingJob.archived || false,
              createdAt: existingJob.created_at,
              created_at: existingJob.created_at,
              updatedAt: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            jobs.push(newLocalJob);
            await writeDataFile('jobs.json', jobs);
            console.log('✅ Job created in local JSON:', newLocalJob.id);
            
            // Return in the format expected by the frontend
            const responseJob = {
              ...newLocalJob,
              assignedTechId: req.body.assignedTechId || existingJob.assigned_tech_id, // Return original for frontend
            };
            return res.json(responseJob);
          }
          
          // If job doesn't exist in local JSON either, fall through to outer catch
          throw supabaseError;
        } else {
          console.log('✅ Job updated in Supabase:', supabaseData.id);
          
          // Also update local JSON for backup
          try {
            const jobs = await readDataFile('jobs.json');
            const jobIndex = jobs.findIndex(j => j.id === req.params.id);
            
            const localJob = {
              id: supabaseData.id,
              propertyAddress: supabaseData.address,
              address: supabaseData.address,
              name: supabaseData.client_name,
              client_name: supabaseData.client_name,
              email: supabaseData.email,
              phone: supabaseData.phone,
              city: supabaseData.city,
              state: supabaseData.state,
              zip: supabaseData.zip,
              userRole: supabaseData.role,
              role: supabaseData.role,
              notes: supabaseData.notes,
              status: supabaseData.status || 'in-progress',
              assignedTechId: originalAssignedTechId || supabaseData.assigned_tech_id, // Keep original local tech ID if provided
              assigned_tech_id: supabaseData.assigned_tech_id, // Store UUID from Supabase
              archived: supabaseData.archived || false,
              archivedAt: supabaseData.archived_at || null,
              createdAt: supabaseData.created_at,
              created_at: supabaseData.created_at,
              updatedAt: supabaseData.updated_at,
              updated_at: supabaseData.updated_at,
            };
            
            if (jobIndex !== -1) {
              jobs[jobIndex] = localJob;
            } else {
              jobs.push(localJob);
            }
            await writeDataFile('jobs.json', jobs);
            console.log('✅ Job also updated in local JSON backup');
          } catch (localErr) {
            console.warn('⚠️  Failed to update local JSON (non-critical):', localErr.message);
          }
          
          // Return in the format expected by the main site
          const responseJob = {
            id: supabaseData.id,
            propertyAddress: supabaseData.address,
            address: supabaseData.address,
            name: supabaseData.client_name,
            client_name: supabaseData.client_name,
            firstName: supabaseData.firstName || null,
            lastName: supabaseData.lastName || null,
            email: supabaseData.email,
            phone: supabaseData.phone,
            city: supabaseData.city,
            state: supabaseData.state,
            zip: supabaseData.zip,
            county: supabaseData.county || null,
            userRole: supabaseData.role,
            role: supabaseData.role,
            notes: supabaseData.notes,
            wellPermitNumber: supabaseData.wellPermitNumber || null,
            hasCistern: supabaseData.hasCistern || null,
            equipmentInspection: supabaseData.equipmentInspection || null,
            willBePresent: supabaseData.willBePresent || null,
            accessInstructions: supabaseData.accessInstructions || null,
            scheduledDate: supabaseData.scheduledDate || null,
            status: supabaseData.status || 'in-progress',
            assignedTechId: supabaseData.assigned_tech_id,
            assigned_tech_id: supabaseData.assigned_tech_id,
            archived: supabaseData.archived || false,
            archivedAt: supabaseData.archived_at || null,
            createdAt: supabaseData.created_at,
            created_at: supabaseData.created_at,
            updatedAt: supabaseData.updated_at,
            updated_at: supabaseData.updated_at,
          };
          return res.json(responseJob);
        }
      } catch (syncError) {
        console.error('⚠️  Error updating job in Supabase:', syncError.message);
        // Fall through to local JSON fallback
      }
    }
    
    // Fallback to local JSON only if Supabase is not available or update failed
    console.log('📄 Updating job in local JSON (Supabase not available or update failed)');
    const jobs = await readDataFile('jobs.json');
    console.log('📝 Total jobs in local JSON:', jobs.length);
    const jobIndex = jobs.findIndex(j => j.id === req.params.id);
    console.log('📝 Job index in local JSON:', jobIndex);
    
    if (jobIndex === -1) {
      console.error('❌ Job not found in local JSON. Job ID:', req.params.id);
      console.error('❌ Available job IDs:', jobs.map(j => j.id).slice(0, 5));
      return res.status(404).json({ error: 'Job not found' });
    }
    
    const updatedJob = {
      ...jobs[jobIndex],
      ...req.body,
      id: req.params.id,
      updatedAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // Handle assignedTechId mapping
    if (req.body.assignedTechId !== undefined) {
      updatedJob.assignedTechId = req.body.assignedTechId;
      updatedJob.assigned_tech_id = req.body.assignedTechId;
      console.log('📝 Setting assignedTechId to:', req.body.assignedTechId);
    }
    
    jobs[jobIndex] = updatedJob;
    await writeDataFile('jobs.json', jobs);
    console.log('✅ Job updated in local JSON:', updatedJob.id);
    res.json(updatedJob);
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// Delete job
app.delete('/api/jobs/:id', async (req, res) => {
  try {
    const jobs = await readDataFile('jobs.json');
    const filteredJobs = jobs.filter(j => j.id !== req.params.id);
    if (jobs.length === filteredJobs.length) {
      return res.status(404).json({ error: 'Job not found' });
    }
    await writeDataFile('jobs.json', filteredJobs);
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// ========== REPORTS API ==========

// Get all reports
app.get('/api/reports', async (req, res) => {
  try {
    const reports = await readDataFile('reports.json');
    res.json(reports);
  } catch (error) {
    console.error('Error reading reports:', error);
    res.status(500).json({ error: 'Failed to read reports' });
  }
});

// Get single report by ID
app.get('/api/reports/:id', async (req, res) => {
  try {
    // Try Supabase first
    if (supabase) {
      try {
        const { data: report, error: supabaseError } = await supabase
          .from('well_reports')
          .select('*')
          .eq('id', req.params.id)
          .single();
        
        if (!supabaseError && report) {
          // Map photos: convert label to caption for main site compatibility
          const mappedPhotos = (report.photos || []).map((photo) => ({
            ...photo,
            caption: photo.caption || photo.label || '', // Use caption if exists, fallback to label
            label: photo.label || photo.caption || '', // Keep both for compatibility
          }));
          
          // Map to local format
          const mappedReport = {
            id: report.id,
            jobId: report.job_id,
            job_id: report.job_id,
            flowReadings: report.flow_readings || [],
            flow_readings: report.flow_readings || [],
            waterQuality: report.water_quality || {},
            water_quality: report.water_quality || {},
            photos: mappedPhotos,
            notes: report.notes || '',
            recommendations: report.recommendations || '',
            wellBasics: report.well_basics || {},
            well_basics: report.well_basics || {},
            systemEquipment: report.system_equipment || {},
            system_equipment: report.system_equipment || {},
            createdAt: report.created_at,
            created_at: report.created_at,
            updatedAt: report.updated_at,
            updated_at: report.updated_at,
            data: { // Wrap in 'data' for compatibility with main site
              flowReadings: report.flow_readings || [],
              waterQuality: report.water_quality || {},
              photos: mappedPhotos,
              notes: report.notes || '',
              recommendations: report.recommendations || '',
              wellBasics: report.well_basics || {},
              systemEquipment: report.system_equipment || {},
            }
          };
          return res.json(mappedReport);
        }
      } catch (supabaseErr) {
        console.warn('⚠️  Failed to load from Supabase, using local JSON:', supabaseErr.message);
      }
    }
    
    // Fallback to local JSON
    const reports = await readDataFile('reports.json');
    const report = reports.find(r => r.id === req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(report);
  } catch (error) {
    console.error('Error reading report:', error);
    res.status(500).json({ error: 'Failed to read report' });
  }
});

// Get reports by job ID
app.get('/api/reports/job/:jobId', async (req, res) => {
  try {
    // Try Supabase first
    if (supabase) {
      try {
        const { data: report, error: supabaseError } = await supabase
          .from('well_reports')
          .select('*')
          .eq('job_id', req.params.jobId)
          .single();
        
        if (!supabaseError && report) {
          // Map photos: convert label to caption for main site compatibility
          const mappedPhotos = (report.photos || []).map((photo) => ({
            ...photo,
            caption: photo.caption || photo.label || '', // Use caption if exists, fallback to label
            label: photo.label || photo.caption || '', // Keep both for compatibility
          }));
          
          // Map to local format
          const mappedReport = {
            id: report.id,
            jobId: report.job_id,
            job_id: report.job_id,
            flowReadings: report.flow_readings || [],
            flow_readings: report.flow_readings || [],
            waterQuality: report.water_quality || {},
            water_quality: report.water_quality || {},
            photos: mappedPhotos,
            notes: report.notes || '',
            recommendations: report.recommendations || '',
            wellBasics: report.well_basics || {},
            well_basics: report.well_basics || {},
            systemEquipment: report.system_equipment || {},
            system_equipment: report.system_equipment || {},
            createdAt: report.created_at,
            created_at: report.created_at,
            updatedAt: report.updated_at,
            updated_at: report.updated_at,
          };
          return res.json([mappedReport]); // Return as array for compatibility
        }
      } catch (supabaseErr) {
        console.warn('⚠️  Failed to load from Supabase, using local JSON:', supabaseErr.message);
      }
    }
    
    // Fallback to local JSON
    const reports = await readDataFile('reports.json');
    const jobReports = reports.filter(r => r.jobId === req.params.jobId);
    res.json(jobReports);
  } catch (error) {
    console.error('Error reading reports:', error);
    res.status(500).json({ error: 'Failed to read reports' });
  }
});

// Helper function to upload base64 photos to Supabase Storage
// uploadBase64PhotosToStorage is now imported from utils/storage.js

// Create new report
app.post('/api/reports', async (req, res) => {
  try {
    // Try Supabase first (primary source of truth)
    if (supabase) {
      try {
        // Process photos: upload base64 images to Supabase Storage
        const processedPhotos = await uploadBase64PhotosToStorage(
          req.body.photos || [],
          req.body.jobId || req.body.job_id
        );
        
        const supabaseReport = {
          job_id: req.body.jobId || req.body.job_id || null,
          flow_readings: req.body.flowReadings || req.body.flow_readings || [],
          water_quality: req.body.waterQuality || req.body.water_quality || {},
          photos: processedPhotos,
          notes: req.body.notes || '',
          recommendations: req.body.recommendations || '',
          well_basics: req.body.wellBasics || req.body.well_basics || {},
          system_equipment: req.body.systemEquipment || req.body.system_equipment || {},
        };
        
        // If ID is provided and is a UUID, use it; otherwise let Supabase generate one
        if (req.body.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.body.id)) {
          supabaseReport.id = req.body.id;
        }
        
        const { data: supabaseData, error: supabaseError } = await supabase
          .from('well_reports')
          .insert(supabaseReport)
          .select()
          .single();
        
        if (supabaseError) {
          console.error('⚠️  Failed to create report in Supabase:', supabaseError.message);
          throw supabaseError; // Fail the request if Supabase fails
        } else {
          console.log('✅ Report created in Supabase:', supabaseData.id);
          
          // Also save to local JSON for backup
          try {
            const reports = await readDataFile('reports.json');
            // Map photos for local JSON too
            const mappedPhotosForLocal = (supabaseData.photos || []).map((photo) => ({
              ...photo,
              caption: photo.caption || photo.label || '',
              label: photo.label || photo.caption || '',
            }));
            
            const localReport = {
              id: supabaseData.id,
              jobId: supabaseData.job_id,
              job_id: supabaseData.job_id,
              flowReadings: supabaseData.flow_readings || [],
              flow_readings: supabaseData.flow_readings || [],
              waterQuality: supabaseData.water_quality || {},
              water_quality: supabaseData.water_quality || {},
              photos: mappedPhotosForLocal,
              notes: supabaseData.notes || '',
              recommendations: supabaseData.recommendations || '',
              wellBasics: supabaseData.well_basics || {},
              well_basics: supabaseData.well_basics || {},
              systemEquipment: supabaseData.system_equipment || {},
              system_equipment: supabaseData.system_equipment || {},
              createdAt: supabaseData.created_at,
              created_at: supabaseData.created_at,
              updatedAt: supabaseData.updated_at,
              updated_at: supabaseData.updated_at,
            };
            reports.push(localReport);
            await writeDataFile('reports.json', reports);
            console.log('✅ Report also saved to local JSON backup');
          } catch (localErr) {
            console.warn('⚠️  Failed to save to local JSON (non-critical):', localErr.message);
          }
          
          // Map photos: convert label to caption for main site compatibility
          const mappedPhotos = (supabaseData.photos || []).map((photo) => ({
            ...photo,
            caption: photo.caption || photo.label || '', // Use caption if exists, fallback to label
            label: photo.label || photo.caption || '', // Keep both for compatibility
          }));
          
          // Return in the format expected by the main site
          const responseReport = {
            id: supabaseData.id,
            jobId: supabaseData.job_id,
            job_id: supabaseData.job_id,
            flowReadings: supabaseData.flow_readings || [],
            flow_readings: supabaseData.flow_readings || [],
            waterQuality: supabaseData.water_quality || {},
            water_quality: supabaseData.water_quality || {},
            photos: mappedPhotos,
            notes: supabaseData.notes || '',
            recommendations: supabaseData.recommendations || '',
            wellBasics: supabaseData.well_basics || {},
            well_basics: supabaseData.well_basics || {},
            systemEquipment: supabaseData.system_equipment || {},
            system_equipment: supabaseData.system_equipment || {},
            createdAt: supabaseData.created_at,
            created_at: supabaseData.created_at,
            updatedAt: supabaseData.updated_at,
            updated_at: supabaseData.updated_at,
          };
          return res.status(201).json(responseReport);
        }
      } catch (syncError) {
        console.error('⚠️  Error creating report in Supabase:', syncError.message);
        // Fall through to local JSON fallback
      }
    }
    
    // Fallback to local JSON only if Supabase is not available
    console.log('📄 Creating report in local JSON (Supabase not available)');
    const reports = await readDataFile('reports.json');
    const newReport = {
      ...req.body,
      id: req.body.id || `report-${Date.now()}`,
      createdAt: req.body.createdAt || new Date().toISOString()
    };
    reports.push(newReport);
    await writeDataFile('reports.json', reports);
    console.log('✅ Report created in local JSON:', newReport.id);
    res.status(201).json(newReport);
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// Update report
app.put('/api/reports/:id', async (req, res) => {
  try {
    // Try Supabase first (primary source of truth)
    if (supabase) {
      try {
        // First, try to get the existing report from Supabase
        const { data: existingReport, error: fetchError } = await supabase
          .from('well_reports')
          .select('*')
          .eq('id', req.params.id)
          .single();
        
        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
          console.warn('⚠️  Error fetching report from Supabase:', fetchError.message);
        }
        
        // Process photos: upload base64 images to Supabase Storage
        const photosToProcess = req.body.photos !== undefined 
          ? (req.body.photos || [])
          : (existingReport?.photos || []);
        
        const processedPhotos = await uploadBase64PhotosToStorage(
          photosToProcess,
          existingReport?.job_id || req.body.jobId || req.body.job_id,
          supabase
        );
        
        // Build update object
        const supabaseReport = {
          job_id: req.body.jobId !== undefined ? (req.body.jobId || req.body.job_id || null) : (existingReport?.job_id || null),
          flow_readings: req.body.flowReadings !== undefined ? (req.body.flowReadings || req.body.flow_readings || []) : (existingReport?.flow_readings || []),
          water_quality: req.body.waterQuality !== undefined ? (req.body.waterQuality || req.body.water_quality || {}) : (existingReport?.water_quality || {}),
          photos: processedPhotos,
          notes: req.body.notes !== undefined ? (req.body.notes || '') : (existingReport?.notes || ''),
          recommendations: req.body.recommendations !== undefined ? (req.body.recommendations || '') : (existingReport?.recommendations || ''),
          well_basics: req.body.wellBasics !== undefined ? (req.body.wellBasics || req.body.well_basics || {}) : (existingReport?.well_basics || {}),
          system_equipment: req.body.systemEquipment !== undefined ? (req.body.systemEquipment || req.body.system_equipment || {}) : (existingReport?.system_equipment || {}),
        };
        
        // Remove null/undefined values to avoid overwriting with null
        Object.keys(supabaseReport).forEach(key => {
          if (supabaseReport[key] === null || supabaseReport[key] === undefined) {
            delete supabaseReport[key];
          }
        });
        
        const { data: supabaseData, error: supabaseError } = await supabase
          .from('well_reports')
          .update(supabaseReport)
          .eq('id', req.params.id)
          .select()
          .single();
        
        if (supabaseError) {
          console.error('⚠️  Failed to update report in Supabase:', supabaseError.message);
          throw supabaseError; // Fail the request if Supabase fails
        } else {
          console.log('✅ Report updated in Supabase:', supabaseData.id);
          
          // Also update local JSON for backup
          try {
            const reports = await readDataFile('reports.json');
            const reportIndex = reports.findIndex(r => r.id === req.params.id);
            
            const localReport = {
              id: supabaseData.id,
              jobId: supabaseData.job_id,
              job_id: supabaseData.job_id,
              flowReadings: supabaseData.flow_readings || [],
              flow_readings: supabaseData.flow_readings || [],
              waterQuality: supabaseData.water_quality || {},
              water_quality: supabaseData.water_quality || {},
              photos: supabaseData.photos || [],
              notes: supabaseData.notes || '',
              recommendations: supabaseData.recommendations || '',
              wellBasics: supabaseData.well_basics || {},
              well_basics: supabaseData.well_basics || {},
              systemEquipment: supabaseData.system_equipment || {},
              system_equipment: supabaseData.system_equipment || {},
              createdAt: supabaseData.created_at,
              created_at: supabaseData.created_at,
              updatedAt: supabaseData.updated_at,
              updated_at: supabaseData.updated_at,
            };
            
            if (reportIndex !== -1) {
              reports[reportIndex] = localReport;
            } else {
              reports.push(localReport);
            }
            await writeDataFile('reports.json', reports);
            console.log('✅ Report also updated in local JSON backup');
          } catch (localErr) {
            console.warn('⚠️  Failed to update local JSON (non-critical):', localErr.message);
          }
          
          // Map photos: convert label to caption for main site compatibility
          const mappedPhotos = (supabaseData.photos || []).map((photo) => ({
            ...photo,
            caption: photo.caption || photo.label || '', // Use caption if exists, fallback to label
            label: photo.label || photo.caption || '', // Keep both for compatibility
          }));
          
          // Return in the format expected by the main site
          const responseReport = {
            id: supabaseData.id,
            jobId: supabaseData.job_id,
            job_id: supabaseData.job_id,
            flowReadings: supabaseData.flow_readings || [],
            flow_readings: supabaseData.flow_readings || [],
            waterQuality: supabaseData.water_quality || {},
            water_quality: supabaseData.water_quality || {},
            photos: mappedPhotos,
            notes: supabaseData.notes || '',
            recommendations: supabaseData.recommendations || '',
            wellBasics: supabaseData.well_basics || {},
            well_basics: supabaseData.well_basics || {},
            systemEquipment: supabaseData.system_equipment || {},
            system_equipment: supabaseData.system_equipment || {},
            createdAt: supabaseData.created_at,
            created_at: supabaseData.created_at,
            updatedAt: supabaseData.updated_at,
            updated_at: supabaseData.updated_at,
          };
          return res.json(responseReport);
        }
      } catch (syncError) {
        console.error('⚠️  Error updating report in Supabase:', syncError.message);
        // Fall through to local JSON fallback
      }
    }
    
    // Fallback to local JSON only if Supabase is not available
    console.log('📄 Updating report in local JSON (Supabase not available)');
    const reports = await readDataFile('reports.json');
    const reportIndex = reports.findIndex(r => r.id === req.params.id);
    
    if (reportIndex === -1) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    reports[reportIndex] = {
      ...reports[reportIndex],
      ...req.body,
      id: req.params.id,
      updatedAt: new Date().toISOString()
    };
    await writeDataFile('reports.json', reports);
    console.log('✅ Report updated in local JSON:', reports[reportIndex].id);
    res.json(reports[reportIndex]);
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// Delete report
app.delete('/api/reports/:id', async (req, res) => {
  try {
    const reports = await readDataFile('reports.json');
    const filteredReports = reports.filter(r => r.id !== req.params.id);
    if (reports.length === filteredReports.length) {
      return res.status(404).json({ error: 'Report not found' });
    }
    await writeDataFile('reports.json', filteredReports);
    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

// ========== TECHS API ==========

// Get all techs
app.get('/api/techs', async (req, res) => {
  try {
    // Always check local JSON first (since that's where new techs are saved)
    const localTechs = await readDataFile('techs.json');
    console.log('📋 GET /api/techs - Found', localTechs.length, 'techs in local JSON');
    
    // If we have local techs, return them (they're the source of truth for now)
    if (localTechs && localTechs.length > 0) {
      return res.json(localTechs);
    }
    
    // Try Supabase as fallback (for existing techs that might be in Supabase)
    if (supabase) {
      try {
        const { data: supabaseTechs, error: supabaseError } = await supabase
          .from('technicians')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (!supabaseError && supabaseTechs && supabaseTechs.length > 0) {
          console.log('📋 GET /api/techs - Found', supabaseTechs.length, 'techs in Supabase');
          // Map to local format
          const mappedTechs = (supabaseTechs || []).map(tech => ({
            id: tech.id,
            name: tech.name,
            email: tech.email || '', // Email may need to be fetched from auth.users separately
            phone: tech.phone || null,
            active: tech.active !== undefined ? tech.active : true,
            userId: tech.user_id,
            user_id: tech.user_id,
            createdAt: tech.created_at,
            created_at: tech.created_at,
          }));
          return res.json(mappedTechs);
        }
      } catch (supabaseErr) {
        console.warn('⚠️  Failed to load techs from Supabase:', supabaseErr.message);
      }
    }
    
    // Return empty array if nothing found
    console.log('📋 GET /api/techs - Returning empty array');
    res.json([]);
  } catch (error) {
    console.error('Error reading techs:', error);
    res.status(500).json({ error: 'Failed to read techs' });
  }
});

// Get single tech by ID
app.get('/api/techs/:id', async (req, res) => {
  try {
    // Try Supabase first
    if (supabase) {
      try {
        const { data: tech, error: supabaseError } = await supabase
          .from('technicians')
          .select('*')
          .eq('id', req.params.id)
          .single();
        
        if (!supabaseError && tech) {
          const mappedTech = {
            id: tech.id,
            name: tech.name,
            email: tech.email || '', // Email may need to be fetched from auth.users separately
            phone: tech.phone || null,
            active: tech.active !== undefined ? tech.active : true,
            userId: tech.user_id,
            user_id: tech.user_id,
            createdAt: tech.created_at,
            created_at: tech.created_at,
          };
          return res.json(mappedTech);
        }
      } catch (supabaseErr) {
        console.warn('⚠️  Failed to load tech from Supabase, using local JSON:', supabaseErr.message);
      }
    }
    
    // Fallback to local JSON
    const techs = await readDataFile('techs.json');
    const tech = techs.find(t => t.id === req.params.id);
    if (!tech) {
      return res.status(404).json({ error: 'Tech not found' });
    }
    res.json(tech);
  } catch (error) {
    console.error('Error reading tech:', error);
    res.status(500).json({ error: 'Failed to read tech' });
  }
});

// Create new tech
app.post('/api/techs', async (req, res) => {
  try {
    const { name, email, phone, active } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    
    // Save to local JSON
    // Note: To sync with Supabase technicians table, the user must first be created in Supabase Authentication
    // Then the technician record can be created with the user_id
    console.log('📄 Creating tech in local JSON');
    const techs = await readDataFile('techs.json');
    const newTech = {
      id: `tech-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name: name,
      email: email,
      phone: phone || null,
      active: active !== undefined ? active : true,
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    techs.push(newTech);
    await writeDataFile('techs.json', techs);
    console.log('✅ Tech created in local JSON:', newTech.id);
    console.log('📋 Total techs in file:', techs.length);
    res.status(201).json(newTech);
  } catch (error) {
    console.error('Error creating tech:', error);
    res.status(500).json({ error: 'Failed to create tech: ' + (error.message || 'Unknown error') });
  }
});

// Update tech
app.put('/api/techs/:id', async (req, res) => {
  try {
    const { name, email, phone, active } = req.body;
    
    // Try Supabase first
    if (supabase) {
      try {
        // Get existing tech
        const { data: existingTech, error: fetchError } = await supabase
          .from('technicians')
          .select('*')
          .eq('id', req.params.id)
          .single();
        
        if (fetchError || !existingTech) {
          return res.status(404).json({ error: 'Tech not found' });
        }
        
        // Update tech
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        
        const { data: supabaseTech, error: supabaseError } = await supabase
          .from('technicians')
          .update(updateData)
          .eq('id', req.params.id)
          .select()
          .single();
        
        if (supabaseError) {
          console.error('⚠️  Failed to update tech in Supabase:', supabaseError.message);
          throw supabaseError;
        }
        
        console.log('✅ Tech updated in Supabase:', supabaseTech.id);
        
        // Also update local JSON
        try {
          const techs = await readDataFile('techs.json');
          const techIndex = techs.findIndex(t => t.id === req.params.id);
          if (techIndex !== -1) {
            techs[techIndex] = {
              ...techs[techIndex],
              name: name !== undefined ? name : techs[techIndex].name,
              email: email !== undefined ? email : techs[techIndex].email,
              phone: phone !== undefined ? phone : techs[techIndex].phone,
              active: active !== undefined ? active : techs[techIndex].active,
              updatedAt: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            await writeDataFile('techs.json', techs);
            console.log('✅ Tech also updated in local JSON backup');
          }
        } catch (localErr) {
          console.warn('⚠️  Failed to update local JSON (non-critical):', localErr.message);
        }
        
        // Return updated tech
        const responseTech = {
          id: supabaseTech.id,
          name: supabaseTech.name,
          email: email || existingTech.email || '',
          phone: phone !== undefined ? phone : null,
          active: active !== undefined ? active : true,
          userId: supabaseTech.user_id,
          user_id: supabaseTech.user_id,
          createdAt: supabaseTech.created_at,
          created_at: supabaseTech.created_at,
          updatedAt: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return res.json(responseTech);
      } catch (syncError) {
        console.error('⚠️  Error updating tech in Supabase:', syncError.message);
        // Fall through to local JSON fallback
      }
    }
    
    // Fallback to local JSON
    const techs = await readDataFile('techs.json');
    const techIndex = techs.findIndex(t => t.id === req.params.id);
    if (techIndex === -1) {
      return res.status(404).json({ error: 'Tech not found' });
    }
    
    techs[techIndex] = {
      ...techs[techIndex],
      name: name !== undefined ? name : techs[techIndex].name,
      email: email !== undefined ? email : techs[techIndex].email,
      phone: phone !== undefined ? phone : techs[techIndex].phone,
      active: active !== undefined ? active : techs[techIndex].active,
      updatedAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await writeDataFile('techs.json', techs);
    res.json(techs[techIndex]);
  } catch (error) {
    console.error('Error updating tech:', error);
    res.status(500).json({ error: 'Failed to update tech' });
  }
});

// Delete tech
app.delete('/api/techs/:id', async (req, res) => {
  try {
    // Try Supabase first
    if (supabase) {
      try {
        const { error: supabaseError } = await supabase
          .from('technicians')
          .delete()
          .eq('id', req.params.id);
        
        if (supabaseError) {
          console.error('⚠️  Failed to delete tech from Supabase:', supabaseError.message);
        } else {
          console.log('✅ Tech deleted from Supabase:', req.params.id);
        }
      } catch (syncError) {
        console.warn('⚠️  Failed to delete from Supabase, using local JSON:', syncError.message);
      }
    }
    
    // Also delete from local JSON
    const techs = await readDataFile('techs.json');
    const filteredTechs = techs.filter(t => t.id !== req.params.id);
    if (techs.length === filteredTechs.length) {
      return res.status(404).json({ error: 'Tech not found' });
    }
    await writeDataFile('techs.json', filteredTechs);
    res.json({ message: 'Tech deleted successfully' });
  } catch (error) {
    console.error('Error deleting tech:', error);
    res.status(500).json({ error: 'Failed to delete tech' });
  }
});

// Initialize data directory and start server
ensureDataDir().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Data directory: ${DATA_DIR}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

