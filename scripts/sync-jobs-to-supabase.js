// Script to sync jobs from Express server (data/jobs.json) to Supabase
// Run this after creating jobs in the main site to sync them to Supabase

const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncJobs() {
  try {
    // Read jobs from Express server
    const jobsPath = path.join(__dirname, '..', 'data', 'jobs.json');
    const jobsData = await fs.readFile(jobsPath, 'utf8');
    const jobs = JSON.parse(jobsData);

    console.log(`📦 Found ${jobs.length} jobs to sync...\n`);

    if (jobs.length === 0) {
      console.log('⚠️  No jobs found in data/jobs.json');
      return;
    }

    // Get existing jobs from Supabase
    const { data: existingJobs, error: fetchError } = await supabase
      .from('jobs')
      .select('id');

    if (fetchError) {
      console.error('❌ Error fetching existing jobs:', fetchError);
      return;
    }

    const existingIds = new Set(existingJobs?.map(j => j.id) || []);
    let synced = 0;
    let skipped = 0;
    let errors = 0;

    // Sync each job
    for (const job of jobs) {
      try {
        // Check if job already exists
        if (existingIds.has(job.id)) {
          console.log(`⏭️  Skipping job ${job.id} (already exists)`);
          skipped++;
          continue;
        }

        // Prepare job data for Supabase
        // Map your Express job structure to Supabase schema
        const supabaseJob = {
          id: job.id,
          address: job.address || job.location || '',
          client_name: job.client_name || job.clientName || job.client || '',
          jobId: job.jobId || job.id,
          // Add any other fields from your job structure
          ...job,
        };

        // Insert into Supabase
        const { error: insertError } = await supabase
          .from('jobs')
          .insert(supabaseJob);

        if (insertError) {
          console.error(`❌ Error syncing job ${job.id}:`, insertError.message);
          errors++;
        } else {
          console.log(`✅ Synced job: ${job.id} - ${supabaseJob.client_name || 'No name'}`);
          synced++;
        }
      } catch (error) {
        console.error(`❌ Error processing job ${job.id}:`, error.message);
        errors++;
      }
    }

    console.log('\n📊 Sync Summary:');
    console.log(`   ✅ Synced: ${synced}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📦 Total: ${jobs.length}`);

  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error('❌ data/jobs.json not found');
      console.error('   Make sure you have jobs in your Express server first');
    } else {
      console.error('❌ Error:', error);
    }
  }
}

// Run the sync
syncJobs();
