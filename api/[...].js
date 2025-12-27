// Vercel serverless function - catch-all route for Express API
// Vercel automatically handles Express apps in the api/ folder

const express = require('express');

// Import the Express app from server.js
// We need to extract just the app without the listen() call
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// Import utilities
const { readDataFile, writeDataFile } = require('../utils/dataFiles');

// Load environment variables (Vercel provides these automatically)
let createClient;
try {
  createClient = require('@supabase/supabase-js').createClient;
} catch (error) {
  createClient = null;
}

// Initialize Supabase
let supabase = null;
if (createClient) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('🔍 Supabase initialization check:');
    console.log('  - URL present:', !!supabaseUrl);
    console.log('  - Key present:', !!supabaseKey);
    console.log('  - Using service role:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    if (supabaseUrl && supabaseKey) {
      supabase = createClient(supabaseUrl, supabaseKey);
      console.log('✅ Supabase client initialized');
    } else {
      console.warn('⚠️ Supabase not initialized - missing URL or key');
      console.warn('  - NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
      console.warn('  - SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');
      console.warn('  - NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing');
    }
  } catch (error) {
    console.error('❌ Failed to initialize Supabase:', error.message);
    console.error('   Stack:', error.stack);
  }
} else {
  console.warn('⚠️ @supabase/supabase-js not available');
}

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle OPTIONS requests (CORS preflight)
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Helper functions
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

const rateLimitMap = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxRequests = 10;
  
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  const record = rateLimitMap.get(ip);
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
}

// ========== DIAGNOSTIC ROUTES ==========

// Diagnostic endpoint to check if report exists for a job
app.get('/api/diagnostic/report/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const diagnostic = {
      jobId,
      timestamp: new Date().toISOString(),
      supabaseAvailable: !!supabase,
      checks: {}
    };
    
    if (supabase) {
      // Check if job exists
      try {
        const { data: jobData, error: jobError } = await supabase
          .from('jobs')
          .select('id, address, client_name')
          .eq('id', jobId)
          .single();
        
        diagnostic.checks.jobExists = !jobError && !!jobData;
        diagnostic.checks.jobData = jobData || null;
        diagnostic.checks.jobError = jobError ? { message: jobError.message, code: jobError.code } : null;
      } catch (err) {
        diagnostic.checks.jobExists = false;
        diagnostic.checks.jobError = { message: err.message };
      }
      
      // Check if report exists
      try {
        const { data: reportData, error: reportError } = await supabase
          .from('well_reports')
          .select('id, job_id, created_at, updated_at, flow_readings, water_quality, photos, notes')
          .eq('job_id', jobId)
          .maybeSingle();
        
        diagnostic.checks.reportExists = !reportError && !!reportData;
        diagnostic.checks.reportData = reportData ? {
          id: reportData.id,
          job_id: reportData.job_id,
          created_at: reportData.created_at,
          updated_at: reportData.updated_at,
          hasFlowReadings: !!(reportData.flow_readings && reportData.flow_readings.length > 0),
          hasWaterQuality: !!(reportData.water_quality && Object.keys(reportData.water_quality).length > 0),
          hasPhotos: !!(reportData.photos && reportData.photos.length > 0),
          hasNotes: !!reportData.notes,
        } : null;
        diagnostic.checks.reportError = reportError ? { message: reportError.message, code: reportError.code } : null;
      } catch (err) {
        diagnostic.checks.reportExists = false;
        diagnostic.checks.reportError = { message: err.message };
      }
    } else {
      diagnostic.checks.supabaseNotAvailable = true;
    }
    
    res.json(diagnostic);
  } catch (error) {
    res.status(500).json({ 
      error: 'Diagnostic failed', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ========== API ROUTES ==========

// Find Report
app.post('/api/find-report', async (req, res) => {
  try {
    const { searchTerm } = req.body;
    
    if (!searchTerm || searchTerm.trim().length === 0) {
      return res.status(400).json({ error: 'Search term is required' });
    }
    
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.ip || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    
    const search = searchTerm.trim().toLowerCase();
    let reports = [];
    
    try {
      reports = await readDataFile('reports.json');
    } catch (error) {
      // Ignore
    }
    
    if (supabase) {
      try {
        const { data } = await supabase.from('well_reports').select('*, jobs(*)');
        if (data) {
          reports = data.map(r => ({
            id: r.id,
            jobId: r.job_id,
            job: r.jobs ? {
              id: r.jobs.id,
              address: r.jobs.address,
              client_name: r.jobs.client_name,
              email: r.jobs.email,
              phone: r.jobs.phone,
            } : null,
            flow_readings: r.flow_readings,
            water_quality: r.water_quality,
            photos: r.photos,
            notes: r.notes,
            recommendations: r.recommendations,
            well_basics: r.well_basics,
            system_equipment: r.system_equipment,
            created_at: r.created_at,
            updated_at: r.updated_at,
          }));
        }
      } catch (error) {
        // Ignore
      }
    }
    
    const matches = reports.filter(report => {
      if (!report.job) return false;
      const job = report.job;
      const normalizedSearch = search.toLowerCase();
      
      if (isEmail(normalizedSearch)) {
        return (job.email || '').toLowerCase() === normalizedSearch;
      }
      
      const normalizedPhone = normalizePhone(search);
      if (normalizedPhone.length >= 10) {
        const reportPhone = normalizePhone(job.phone || '');
        return reportPhone.includes(normalizedPhone) || normalizedPhone.includes(reportPhone);
      }
      
      const reportAddress = (job.address || '').toLowerCase();
      if (reportAddress.includes(normalizedSearch)) return true;
      
      const streetNumber = extractStreetNumber(search);
      if (streetNumber && extractStreetNumber(job.address) === streetNumber) return true;
      
      if ((job.client_name || '').toLowerCase().includes(normalizedSearch)) return true;
      
      return false;
    });
    
    if (matches.length === 0) {
      return res.status(404).json({ error: 'No reports found matching your search' });
    }
    
    res.json({ reports: matches.slice(0, 10) });
  } catch (error) {
    console.error('Error finding report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Jobs API
app.get('/api/jobs', async (req, res) => {
  try {
    let jobs = [];
    
    // Primary: Get jobs from Supabase (this is what works on Vercel)
    if (supabase) {
      try {
        const { data, error } = await supabase.from('jobs').select('*').order('created_at', { ascending: false });
        if (error) {
          console.error('Error loading jobs from Supabase:', error);
        } else if (data && data.length > 0) {
          // Map Supabase format to expected format
          jobs = data.map(job => ({
            id: job.id,
            address: job.address || null,
            name: job.client_name || job.name || null,
            client_name: job.client_name || job.name || null,
            firstName: job.firstName || null,
            lastName: job.lastName || null,
            email: job.email || null,
            phone: job.phone || null,
            city: job.city || null,
            state: job.state || null,
            zip: job.zip || null,
            county: job.county || null,
            role: job.role || null,
            userRole: job.role || null,
            notes: job.notes || null,
            wellPermitNumber: job.wellPermitNumber || job.well_permit_number || null,
            hasCistern: job.hasCistern || null,
            equipmentInspection: job.equipmentInspection || null,
            willBePresent: job.willBePresent || null,
            accessInstructions: job.accessInstructions || null,
            scheduledDate: job.scheduledDate || job.scheduled_date || null,
            status: job.status || 'pending',
            assignedTechId: job.assigned_tech_id || job.assignedTechId || null,
            assigned_tech_id: job.assigned_tech_id || job.assignedTechId || null,
            archived: job.archived || false,
            created_at: job.created_at,
            createdAt: job.created_at,
            updated_at: job.updated_at,
            updatedAt: job.updated_at,
          }));
          console.log(`✅ Loaded ${jobs.length} jobs from Supabase`);
          return res.json(jobs);
        }
      } catch (supabaseErr) {
        console.error('Supabase error loading jobs:', supabaseErr);
      }
    }
    
    // Fallback: Try local JSON (development only)
    try {
      const localJobs = await readDataFile('jobs.json');
      if (localJobs && localJobs.length > 0) {
        console.log(`✅ Loaded ${localJobs.length} jobs from local JSON`);
        return res.json(localJobs);
      }
    } catch (localErr) {
      console.log('Local file system not available (expected on Vercel)');
    }
    
    console.log('⚠️ No jobs found in Supabase or local storage');
    res.json([]);
  } catch (error) {
    console.error('Error in /api/jobs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let job = null;
    
    try {
      const jobs = await readDataFile('jobs.json');
      job = jobs.find(j => j.id === id);
    } catch (error) {}
    
    if (!job && supabase) {
      try {
        const { data } = await supabase.from('jobs').select('*').eq('id', id).single();
        if (data) job = data;
      } catch (error) {}
    }
    
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/jobs', async (req, res) => {
  try {
    const newJob = req.body;
    const now = new Date().toISOString();
    
    // Prepare job data for Supabase
    const supabaseJob = {
      address: newJob.propertyAddress || newJob.address || null,
      client_name: newJob.client_name || newJob.name || null,
      firstName: newJob.firstName || null,
      lastName: newJob.lastName || null,
      email: newJob.email || null,
      phone: newJob.phone || null,
      city: newJob.city || null,
      state: newJob.state || null,
      zip: newJob.zip || null,
      county: newJob.county || null,
      role: newJob.userRole || newJob.role || null,
      notes: newJob.notes || null,
      wellPermitNumber: newJob.wellPermitNumber || null,
      hasCistern: newJob.hasCistern || null,
      equipmentInspection: newJob.equipmentInspection || null,
      willBePresent: newJob.willBePresent || null,
      accessInstructions: newJob.accessInstructions || null,
      scheduledDate: newJob.scheduledDate || null,
      status: newJob.status || 'pending',
      assigned_tech_id: newJob.assignedTechId || newJob.assigned_tech_id || null,
      archived: newJob.archived || false,
      created_at: newJob.created_at || now,
      updated_at: now,
    };
    
    // Primary: Save to Supabase first (this is what works on Vercel)
    if (!supabase) {
      console.error('❌ Supabase client is null - cannot create job');
      return res.status(500).json({ 
        error: 'Supabase not available. Please check environment variables in Vercel settings.' 
      });
    }
    
    try {
      console.log('📝 Attempting to create job in Supabase:', {
        address: supabaseJob.address,
        client_name: supabaseJob.client_name,
        status: supabaseJob.status
      });
      
      const { data, error } = await supabase
        .from('jobs')
        .insert(supabaseJob)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Supabase error creating job:', error);
        console.error('   Error code:', error.code);
        console.error('   Error message:', error.message);
        console.error('   Error details:', error.details);
        return res.status(400).json({ 
          error: `Failed to create job: ${error.message}`,
          details: error.details || error.hint || ''
        });
      }
      
      if (data) {
        console.log('✅ Job created successfully in Supabase:', data.id);
        // Map back to expected format
        const createdJob = {
          id: data.id,
          address: data.address || null,
          name: data.client_name || null,
          client_name: data.client_name || null,
          firstName: data.firstName || null,
          lastName: data.lastName || null,
          email: data.email || null,
          phone: data.phone || null,
          city: data.city || null,
          state: data.state || null,
          zip: data.zip || null,
          county: data.county || null,
          role: data.role || null,
          userRole: data.role || null,
          notes: data.notes || null,
          wellPermitNumber: data.wellPermitNumber || null,
          hasCistern: data.hasCistern || null,
          equipmentInspection: data.equipmentInspection || null,
          willBePresent: data.willBePresent || null,
          accessInstructions: data.accessInstructions || null,
          scheduledDate: data.scheduledDate || null,
          status: data.status || 'pending',
          assignedTechId: data.assigned_tech_id || null,
          assigned_tech_id: data.assigned_tech_id || null,
          archived: data.archived || false,
          created_at: data.created_at,
          createdAt: data.created_at,
          updated_at: data.updated_at,
          updatedAt: data.updated_at,
        };
        return res.status(201).json(createdJob);
      }
    } catch (supabaseErr) {
      console.error('❌ Exception creating job in Supabase:', supabaseErr);
      console.error('   Stack:', supabaseErr.stack);
      return res.status(500).json({ 
        error: `Failed to create job: ${supabaseErr.message}` 
      });
    }
    
    // Fallback: Save to local JSON (development only)
    try {
      if (!newJob.id) newJob.id = `job-${Date.now()}`;
      newJob.created_at = now;
      newJob.updated_at = now;
      const jobs = await readDataFile('jobs.json');
      jobs.push(newJob);
      await writeDataFile('jobs.json', jobs);
      return res.status(201).json(newJob);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to create job. Supabase not available.' });
    }
  } catch (error) {
    console.error('Error in POST /api/jobs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedJob = { ...req.body, updated_at: new Date().toISOString() };
    
    try {
      const jobs = await readDataFile('jobs.json');
      const index = jobs.findIndex(j => j.id === id);
      if (index !== -1) {
        jobs[index] = { ...jobs[index], ...updatedJob };
        await writeDataFile('jobs.json', jobs);
      }
    } catch (error) {}
    
    if (supabase) {
      try {
        await supabase.from('jobs').update(updatedJob).eq('id', id);
      } catch (error) {}
    }
    
    res.json(updatedJob);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    try {
      const jobs = await readDataFile('jobs.json');
      const filtered = jobs.filter(j => j.id !== id);
      await writeDataFile('jobs.json', filtered);
    } catch (error) {}
    
    if (supabase) {
      try {
        await supabase.from('jobs').delete().eq('id', id);
      } catch (error) {}
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reports API (simplified - similar pattern)
app.get('/api/reports', async (req, res) => {
  try {
    let reports = [];
    
    // Primary: Get reports from Supabase (this is what works on Vercel)
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('well_reports')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error loading reports from Supabase:', error);
        } else if (data && data.length > 0) {
          // Map Supabase format to expected format
          reports = data.map(r => ({
            id: r.id,
            jobId: r.job_id,
            job_id: r.job_id,
            flow_readings: r.flow_readings || [],
            flowReadings: r.flow_readings || [],
            water_quality: r.water_quality || {},
            waterQuality: r.water_quality || {},
            photos: r.photos || [],
            notes: r.notes || '',
            recommendations: r.recommendations || '',
            well_basics: r.well_basics || {},
            wellBasics: r.well_basics || {},
            system_equipment: r.system_equipment || {},
            systemEquipment: r.system_equipment || {},
            created_at: r.created_at,
            createdAt: r.created_at,
            updated_at: r.updated_at,
            updatedAt: r.updated_at,
          }));
          console.log(`✅ Loaded ${reports.length} reports from Supabase`);
          return res.json(reports);
        }
      } catch (supabaseErr) {
        console.error('Supabase error loading reports:', supabaseErr);
      }
    }
    
    // Fallback: Try local JSON (development only)
    try {
      const localReports = await readDataFile('reports.json');
      if (localReports && localReports.length > 0) {
        console.log(`✅ Loaded ${localReports.length} reports from local JSON`);
        return res.json(localReports);
      }
    } catch (localErr) {
      console.log('Local file system not available (expected on Vercel)');
    }
    
    console.log('⚠️ No reports found in Supabase or local storage');
    res.json([]);
  } catch (error) {
    console.error('Error in /api/reports:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let report = null;
    
    // Primary: Get report from Supabase (this is what works on Vercel)
    if (supabase) {
      try {
        console.log(`🔍 Attempting to load report ${id} from Supabase...`);
        const { data, error } = await supabase
          .from('well_reports')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) {
          console.error('❌ Error loading report from Supabase:', error);
          console.error('   Error code:', error.code);
          console.error('   Error message:', error.message);
          console.error('   Error details:', error.details);
          console.error('   Error hint:', error.hint);
        } else if (data) {
          console.log(`✅ Found report ${id} in Supabase`);
          // Map Supabase format to expected format (with data property for admin site compatibility)
          report = {
            id: data.id,
            jobId: data.job_id,
            job_id: data.job_id,
            createdAt: data.created_at,
            created_at: data.created_at,
            updatedAt: data.updated_at,
            updated_at: data.updated_at,
            // Wrap report fields in 'data' property for admin site compatibility
            data: {
              flowReadings: data.flow_readings || [],
              flow_readings: data.flow_readings || [],
              waterQuality: data.water_quality || {},
              water_quality: data.water_quality || {},
              photos: data.photos || [],
              notes: data.notes || '',
              recommendations: data.recommendations || '',
              wellBasics: data.well_basics || {},
              well_basics: data.well_basics || {},
              systemEquipment: data.system_equipment || {},
              system_equipment: data.system_equipment || {},
            },
            // Also include fields directly for backward compatibility
            flow_readings: data.flow_readings || [],
            flowReadings: data.flow_readings || [],
            water_quality: data.water_quality || {},
            waterQuality: data.water_quality || {},
            photos: data.photos || [],
            notes: data.notes || '',
            recommendations: data.recommendations || '',
            well_basics: data.well_basics || {},
            wellBasics: data.well_basics || {},
            system_equipment: data.system_equipment || {},
            systemEquipment: data.system_equipment || {},
          };
          console.log(`✅ Loaded report ${id} from Supabase`);
          return res.json(report);
        }
      } catch (supabaseErr) {
        console.error('Supabase error loading report:', supabaseErr);
      }
    }
    
    // Fallback: Try local JSON (development only)
    try {
      const reports = await readDataFile('reports.json');
      report = reports.find(r => r.id === id);
      if (report) {
        console.log(`✅ Loaded report ${id} from local JSON`);
        return res.json(report);
      }
    } catch (error) {
      console.log('Local file system not available (expected on Vercel)');
    }
    
    console.log(`⚠️ No report found with ID ${id}`);
    return res.status(404).json({ error: 'Report not found' });
  } catch (error) {
    console.error('Error in /api/reports/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/reports/job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    let report = null;
    
    // Primary: Get report from Supabase (this is what works on Vercel)
    if (supabase) {
      try {
        console.log(`🔍 Attempting to load report for job ${jobId} from Supabase...`);
        const { data, error } = await supabase
          .from('well_reports')
          .select('*')
          .eq('job_id', jobId)
          .single();
        
        if (error) {
          console.error('❌ Error loading report from Supabase:', error);
          console.error('   Error code:', error.code);
          console.error('   Error message:', error.message);
          console.error('   Error details:', error.details);
          console.error('   Error hint:', error.hint);
        } else if (data) {
          console.log(`✅ Found report for job ${jobId} in Supabase (report ID: ${data.id})`);
          // Map Supabase format to expected format (with data property for admin site compatibility)
          report = {
            id: data.id,
            jobId: data.job_id,
            job_id: data.job_id,
            createdAt: data.created_at,
            created_at: data.created_at,
            updatedAt: data.updated_at,
            updated_at: data.updated_at,
            // Wrap report fields in 'data' property for admin site compatibility
            data: {
              flowReadings: data.flow_readings || [],
              flow_readings: data.flow_readings || [],
              waterQuality: data.water_quality || {},
              water_quality: data.water_quality || {},
              photos: data.photos || [],
              notes: data.notes || '',
              recommendations: data.recommendations || '',
              wellBasics: data.well_basics || {},
              well_basics: data.well_basics || {},
              systemEquipment: data.system_equipment || {},
              system_equipment: data.system_equipment || {},
            },
            // Also include fields directly for backward compatibility
            flow_readings: data.flow_readings || [],
            flowReadings: data.flow_readings || [],
            water_quality: data.water_quality || {},
            waterQuality: data.water_quality || {},
            photos: data.photos || [],
            notes: data.notes || '',
            recommendations: data.recommendations || '',
            well_basics: data.well_basics || {},
            wellBasics: data.well_basics || {},
            system_equipment: data.system_equipment || {},
            systemEquipment: data.system_equipment || {},
          };
          console.log(`✅ Loaded report for job ${jobId} from Supabase`);
          return res.json(report);
        }
      } catch (supabaseErr) {
        console.error('Supabase error loading report:', supabaseErr);
      }
    }
    
    // Fallback: Try local JSON (development only)
    try {
      const reports = await readDataFile('reports.json');
      report = reports.find(r => r.jobId === jobId);
      if (report) {
        console.log(`✅ Loaded report for job ${jobId} from local JSON`);
        return res.json(report);
      }
    } catch (error) {
      console.log('Local file system not available (expected on Vercel)');
    }
    
    console.log(`⚠️ No report found for job ${jobId}`);
    return res.status(404).json({ error: 'Report not found for this job' });
  } catch (error) {
    console.error('Error in /api/reports/job/:jobId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/reports', async (req, res) => {
  try {
    const newReport = req.body;
    if (!newReport.id) newReport.id = `report-${Date.now()}`;
    newReport.created_at = new Date().toISOString();
    newReport.updated_at = new Date().toISOString();
    
    try {
      const reports = await readDataFile('reports.json');
      reports.push(newReport);
      await writeDataFile('reports.json', reports);
    } catch (error) {}
    
    if (supabase && newReport.jobId) {
      try {
        const { data } = await supabase.from('well_reports').insert({
          job_id: newReport.jobId,
          flow_readings: newReport.flow_readings || [],
          water_quality: newReport.water_quality || {},
          photos: newReport.photos || [],
          notes: newReport.notes || '',
          recommendations: newReport.recommendations || '',
          well_basics: newReport.well_basics || {},
          system_equipment: newReport.system_equipment || {},
        }).select().single();
        if (data) newReport.id = data.id;
      } catch (error) {}
    }
    
    res.status(201).json(newReport);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedReport = { ...req.body, updated_at: new Date().toISOString() };
    
    try {
      const reports = await readDataFile('reports.json');
      const index = reports.findIndex(r => r.id === id);
      if (index !== -1) {
        reports[index] = { ...reports[index], ...updatedReport };
        await writeDataFile('reports.json', reports);
      }
    } catch (error) {}
    
    if (supabase && updatedReport.jobId) {
      try {
        await supabase.from('well_reports').update({
          flow_readings: updatedReport.flow_readings,
          water_quality: updatedReport.water_quality,
          photos: updatedReport.photos,
          notes: updatedReport.notes,
          recommendations: updatedReport.recommendations,
          well_basics: updatedReport.well_basics,
          system_equipment: updatedReport.system_equipment,
          updated_at: updatedReport.updated_at,
        }).eq('id', id);
      } catch (error) {}
    }
    
    res.json(updatedReport);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    try {
      const reports = await readDataFile('reports.json');
      const filtered = reports.filter(r => r.id !== id);
      await writeDataFile('reports.json', filtered);
    } catch (error) {}
    
    if (supabase) {
      try {
        await supabase.from('well_reports').delete().eq('id', id);
      } catch (error) {}
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Techs API - Use Supabase as primary source (Vercel doesn't have persistent file system)
app.get('/api/techs', async (req, res) => {
  try {
    let techs = [];
    
    // Primary: Try Supabase first (this is what works on Vercel)
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('technicians')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error loading techs from Supabase:', error);
        } else if (data && data.length > 0) {
          // Map Supabase format to expected format
          techs = data.map(tech => ({
            id: tech.id,
            name: tech.name || '',
            email: tech.email || '',
            phone: tech.phone || null,
            active: tech.active !== undefined ? tech.active : true,
            userId: tech.user_id,
            user_id: tech.user_id,
            createdAt: tech.created_at,
            created_at: tech.created_at,
            updatedAt: tech.updated_at,
            updated_at: tech.updated_at,
          }));
          console.log(`✅ Loaded ${techs.length} techs from Supabase`);
          return res.json(techs);
        }
      } catch (supabaseErr) {
        console.error('Supabase error loading techs:', supabaseErr);
      }
    }
    
    // Fallback: Try local JSON (only works in development, not on Vercel)
    try {
      const localTechs = await readDataFile('techs.json');
      if (localTechs && localTechs.length > 0) {
        console.log(`✅ Loaded ${localTechs.length} techs from local JSON`);
        return res.json(localTechs);
      }
    } catch (localErr) {
      // File system not available (expected on Vercel)
      console.log('Local file system not available (expected on Vercel)');
    }
    
    // Return empty array if nothing found
    console.log('⚠️ No techs found in Supabase or local storage');
    res.json([]);
  } catch (error) {
    console.error('Error in /api/techs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/techs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let tech = null;
    
    // Primary: Try Supabase first
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('technicians')
          .select('*')
          .eq('id', id)
          .single();
        
        if (!error && data) {
          tech = {
            id: data.id,
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || null,
            active: data.active !== undefined ? data.active : true,
            userId: data.user_id,
            user_id: data.user_id,
            createdAt: data.created_at,
            created_at: data.created_at,
            updatedAt: data.updated_at,
            updated_at: data.updated_at,
          };
          return res.json(tech);
        }
      } catch (supabaseErr) {
        console.error('Supabase error loading tech:', supabaseErr);
      }
    }
    
    // Fallback: Try local JSON
    try {
      const techs = await readDataFile('techs.json');
      tech = techs.find(t => t.id === id);
      if (tech) return res.json(tech);
    } catch (error) {
      // File system not available (expected on Vercel)
    }
    
    return res.status(404).json({ error: 'Technician not found' });
  } catch (error) {
    console.error('Error in /api/techs/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/techs', async (req, res) => {
  try {
    const techData = req.body;
    const now = new Date().toISOString();
    
    // Prepare tech data for Supabase
    const supabaseTech = {
      name: techData.name || '',
      email: techData.email || '',
      phone: techData.phone || null,
      active: techData.active !== undefined ? techData.active : true,
      user_id: techData.user_id || techData.userId || null,
      created_at: techData.created_at || now,
      updated_at: now,
    };
    
    // Primary: Save to Supabase first
    if (!supabase) {
      console.error('❌ Supabase client is null - cannot create tech');
      console.error('   Check environment variables in Vercel:');
      console.error('   - NEXT_PUBLIC_SUPABASE_URL');
      console.error('   - SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
      return res.status(500).json({ 
        error: 'Supabase not available. Please check environment variables in Vercel settings.' 
      });
    }
    
    try {
      console.log('📝 Attempting to create tech in Supabase:', {
        name: supabaseTech.name,
        email: supabaseTech.email,
        hasUserId: !!supabaseTech.user_id
      });
      
      const { data, error } = await supabase
        .from('technicians')
        .insert(supabaseTech)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Supabase error creating tech:', error);
        console.error('   Error code:', error.code);
        console.error('   Error message:', error.message);
        console.error('   Error details:', error.details);
        return res.status(400).json({ 
          error: `Failed to create tech: ${error.message}`,
          details: error.details || error.hint || ''
        });
      }
      
      if (data) {
        console.log('✅ Tech created successfully in Supabase:', data.id);
        const createdTech = {
          id: data.id,
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || null,
          active: data.active !== undefined ? data.active : true,
          userId: data.user_id,
          user_id: data.user_id,
          createdAt: data.created_at,
          created_at: data.created_at,
          updatedAt: data.updated_at,
          updated_at: data.updated_at,
        };
        return res.status(201).json(createdTech);
      }
    } catch (supabaseErr) {
      console.error('❌ Exception creating tech in Supabase:', supabaseErr);
      console.error('   Stack:', supabaseErr.stack);
      return res.status(500).json({ 
        error: `Failed to create tech: ${supabaseErr.message}` 
      });
    }
    
    // Fallback: Save to local JSON (development only)
    try {
      if (!techData.id) techData.id = `tech-${Date.now()}`;
      techData.created_at = now;
      techData.updated_at = now;
      
      const techs = await readDataFile('techs.json');
      techs.push(techData);
      await writeDataFile('techs.json', techs);
      return res.status(201).json(techData);
    } catch (localErr) {
      // File system not available (expected on Vercel)
      return res.status(500).json({ error: 'Failed to create tech. Supabase not available.' });
    }
  } catch (error) {
    console.error('Error in POST /api/techs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/techs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedTech = { ...req.body, updated_at: new Date().toISOString() };
    
    try {
      const techs = await readDataFile('techs.json');
      const index = techs.findIndex(t => t.id === id);
      if (index !== -1) {
        techs[index] = { ...techs[index], ...updatedTech };
        await writeDataFile('techs.json', techs);
      }
    } catch (error) {}
    
    if (supabase) {
      try {
        await supabase.from('technicians').update(updatedTech).eq('id', id);
      } catch (error) {}
    }
    
    res.json(updatedTech);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/techs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!supabase) {
      console.error('❌ Supabase client is null - cannot delete tech');
      return res.status(500).json({ 
        error: 'Supabase not available. Please check environment variables in Vercel settings.' 
      });
    }
    
    // Primary: Delete from Supabase
    try {
      console.log('🗑️ Attempting to delete tech from Supabase:', id); 
      
      // First check if tech exists
      const { data: existingTech, error: checkError } = await supabase
        .from('technicians')
        .select('id')
        .eq('id', id)
        .single();
      
      if (checkError || !existingTech) {
        console.error('❌ Tech not found in Supabase:', id);
        return res.status(404).json({ 
          error: 'Tech not found' 
        });
      }
      
      // Delete the tech - don't use .select() as it may cause issues
      const { error, status, statusText } = await supabase
        .from('technicians')
        .delete()
        .eq('id', id);
      
      if (error) {
        // Log everything about the error
        const errorInfo = {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          status: status,
          statusText: statusText,
          fullError: String(error)
        };
        
        console.error('❌ Supabase error deleting tech:', JSON.stringify(errorInfo, null, 2));
        console.error('   Raw error:', error);
        
        // Try to get a meaningful error message
        let errorMsg = 'Unknown error occurred';
        if (error.message) {
          errorMsg = error.message;
        } else if (error.code) {
          errorMsg = `Error code: ${error.code}`;
        } else if (error.details) {
          errorMsg = error.details;
        } else if (typeof error === 'string') {
          errorMsg = error;
        }
        
        return res.status(400).json({ 
          error: `Failed to delete tech: ${errorMsg}`,
          message: errorMsg,
          code: error.code || '',
          details: error.details || error.hint || '',
          status: status || 400
        });
      }
      
      // If no error, deletion was successful
      console.log('✅ Tech deleted successfully from Supabase:', id);
      return res.json({ success: true, message: 'Tech deleted successfully' });
    } catch (supabaseErr) {
      console.error('❌ Exception deleting tech from Supabase:', supabaseErr);
      console.error('   Stack:', supabaseErr.stack);
      return res.status(500).json({ 
        error: `Failed to delete tech: ${supabaseErr.message}` 
      });
    }
    
    // Fallback: Try local JSON (development only)
    try {
      const techs = await readDataFile('techs.json');
      const filtered = techs.filter(t => t.id !== id);
      if (filtered.length < techs.length) {
        await writeDataFile('techs.json', filtered);
        return res.json({ success: true });
      }
      return res.status(404).json({ error: 'Tech not found' });
    } catch (localErr) {
      // File system not available (expected on Vercel)
      return res.status(500).json({ error: 'Failed to delete tech. Supabase not available.' });
    }
  } catch (error) {
    console.error('Error in DELETE /api/techs/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export as Vercel serverless function
// Vercel expects a handler function that receives (req, res)
// The file name [...].js means it catches all routes under /api/*
module.exports = (req, res) => {
  // Vercel serverless functions need to handle the request/response
  // Express app can handle this directly
  return app(req, res);
};

