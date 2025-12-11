// Quick script to sync a single job from local JSON to Supabase
// Usage: node sync-single-job.js "528 Captain Beam Blvd, Evergreen 28443"

require('dotenv').config({ path: require('path').join(__dirname, '.env.local') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncJobByAddress(address) {
  try {
    // Read local jobs
    const jobsPath = path.join(__dirname, 'data', 'jobs.json');
    const jobsData = await fs.readFile(jobsPath, 'utf8');
    const jobs = JSON.parse(jobsData);
    
    // Find job by address
    const job = jobs.find(j => 
      j.propertyAddress === address || 
      j.address === address ||
      (j.propertyAddress && j.propertyAddress.includes(address.split(',')[0])) ||
      (j.address && j.address.includes(address.split(',')[0]))
    );
    
    if (!job) {
      console.error(`❌ Job not found with address: ${address}`);
      console.log('\nAvailable jobs:');
      jobs.forEach(j => {
        console.log(`  - ${j.propertyAddress || j.address || 'No address'} (ID: ${j.id})`);
      });
      return;
    }
    
    console.log(`\n📋 Found job:`);
    console.log(`   ID: ${job.id}`);
    console.log(`   Address: ${job.propertyAddress || job.address}`);
    console.log(`   Client: ${job.name || job.client_name}`);
    
    // Check if already exists in Supabase
    const { data: existing } = await supabase
      .from('jobs')
      .select('id')
      .eq('id', job.id)
      .single();
    
    if (existing) {
      console.log(`\n⚠️  Job already exists in Supabase (ID: ${existing.id})`);
      console.log('   Updating...');
      
      const supabaseJob = {
        address: job.propertyAddress || job.address || null,
        client_name: job.name || job.client_name || null,
        email: job.email || null,
        phone: job.phone || null,
        city: job.city || null,
        state: job.state || null,
        zip: job.zip || null,
        role: job.userRole || job.role || null,
        notes: job.notes || null,
        status: job.status || 'in-progress',
        assigned_tech_id: job.assignedTechId || job.assigned_tech_id || null,
      };
      
      const { error } = await supabase
        .from('jobs')
        .update(supabaseJob)
        .eq('id', job.id);
      
      if (error) throw error;
      console.log('✅ Job updated in Supabase!');
    } else {
      console.log('\n➕ Inserting new job into Supabase...');
      
      const supabaseJob = {
        id: job.id, // Try to use same ID if it's a UUID
        address: job.propertyAddress || job.address || null,
        client_name: job.name || job.client_name || null,
        email: job.email || null,
        phone: job.phone || null,
        city: job.city || null,
        state: job.state || null,
        zip: job.zip || null,
        role: job.userRole || job.role || null,
        notes: job.notes || null,
        status: job.status || 'in-progress',
        assigned_tech_id: job.assignedTechId || job.assigned_tech_id || null,
      };
      
      // If ID is not a UUID, let Supabase generate one
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(supabaseJob.id)) {
        delete supabaseJob.id;
      }
      
      const { data, error } = await supabase
        .from('jobs')
        .insert(supabaseJob)
        .select()
        .single();
      
      if (error) throw error;
      console.log(`✅ Job synced to Supabase! (ID: ${data.id})`);
      
      // Auto-create well_reports entry if it doesn't exist
      const { data: existingReport } = await supabase
        .from('well_reports')
        .select('id')
        .eq('job_id', data.id)
        .single();
      
      if (!existingReport) {
        const { error: reportError } = await supabase.from('well_reports').insert({
          job_id: data.id,
          flow_readings: [],
          water_quality: {},
          photos: [],
          notes: '',
        });
        
        if (reportError) {
          console.warn('⚠️  Could not create well_reports entry:', reportError.message);
        } else {
          console.log('✅ Created well_reports entry');
        }
      }
    }
    
    console.log('\n🎉 Done! Check your PWA - the job should appear now.');
    
  } catch (error) {
    console.error('❌ Error syncing job:', error.message);
    if (error.details) console.error('   Details:', error.details);
    process.exit(1);
  }
}

// Get address from command line or use the one provided
const address = process.argv[2] || '528 Captain Beam Blvd, Evergreen 28443';
syncJobByAddress(address);
