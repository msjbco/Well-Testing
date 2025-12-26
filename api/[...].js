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
app.use(cors());
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
    try {
      jobs = await readDataFile('jobs.json');
    } catch (error) {}
    
    if (supabase) {
      try {
        const { data } = await supabase.from('jobs').select('*').order('created_at', { ascending: false });
        if (data) {
          for (const supJob of data) {
            if (!jobs.find(j => j.id === supJob.id)) {
              jobs.push(supJob);
            }
          }
        }
      } catch (error) {}
    }
    
    res.json(jobs);
  } catch (error) {
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
    if (!newJob.id) newJob.id = `job-${Date.now()}`;
    newJob.created_at = new Date().toISOString();
    newJob.updated_at = new Date().toISOString();
    
    try {
      const jobs = await readDataFile('jobs.json');
      jobs.push(newJob);
      await writeDataFile('jobs.json', jobs);
    } catch (error) {}
    
    if (supabase) {
      try {
        const { data } = await supabase.from('jobs').insert(newJob).select().single();
        if (data) newJob.id = data.id;
      } catch (error) {}
    }
    
    res.status(201).json(newJob);
  } catch (error) {
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
    try {
      reports = await readDataFile('reports.json');
    } catch (error) {}
    
    if (supabase) {
      try {
        const { data } = await supabase.from('well_reports').select('*').order('created_at', { ascending: false });
        if (data) {
          reports = data.map(r => ({
            id: r.id,
            jobId: r.job_id,
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
      } catch (error) {}
    }
    
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let report = null;
    
    try {
      const reports = await readDataFile('reports.json');
      report = reports.find(r => r.id === id);
    } catch (error) {}
    
    if (!report && supabase) {
      try {
        const { data } = await supabase.from('well_reports').select('*').eq('id', id).single();
        if (data) {
          report = {
            id: data.id,
            jobId: data.job_id,
            flow_readings: data.flow_readings,
            water_quality: data.water_quality,
            photos: data.photos,
            notes: data.notes,
            recommendations: data.recommendations,
            well_basics: data.well_basics,
            system_equipment: data.system_equipment,
            created_at: data.created_at,
            updated_at: data.updated_at,
          };
        }
      } catch (error) {}
    }
    
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/reports/job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    let report = null;
    
    try {
      const reports = await readDataFile('reports.json');
      report = reports.find(r => r.jobId === jobId);
    } catch (error) {}
    
    if (!report && supabase) {
      try {
        const { data } = await supabase.from('well_reports').select('*').eq('job_id', jobId).single();
        if (data) {
          report = {
            id: data.id,
            jobId: data.job_id,
            flow_readings: data.flow_readings,
            water_quality: data.water_quality,
            photos: data.photos,
            notes: data.notes,
            recommendations: data.recommendations,
            well_basics: data.well_basics,
            system_equipment: data.system_equipment,
            created_at: data.created_at,
            updated_at: data.updated_at,
          };
        }
      } catch (error) {}
    }
    
    if (!report) return res.status(404).json({ error: 'Report not found for this job' });
    res.json(report);
  } catch (error) {
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
// Vercel expects a handler function, not the app directly
module.exports = (req, res) => {
  // Handle the request with Express app
  return app(req, res);
};

