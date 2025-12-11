// Migration script to move data from localStorage to backend
// Run this in the browser console on the admin dashboard page

async function migrateData() {
  console.log('Starting data migration...');
  
  // Get data from localStorage
  const jobs = JSON.parse(localStorage.getItem('scheduledJobs') || '[]');
  const reports = JSON.parse(localStorage.getItem('wellReports') || '[]');
  
  console.log(`Found ${jobs.length} jobs and ${reports.length} reports in localStorage`);
  
  if (jobs.length === 0 && reports.length === 0) {
    console.log('No data to migrate');
    return;
  }
  
  // Migrate jobs
  let migratedJobs = 0;
  for (const job of jobs) {
    try {
      await window.jobsAPI.create(job);
      migratedJobs++;
      console.log(`Migrated job: ${job.id}`);
    } catch (error) {
      console.error(`Failed to migrate job ${job.id}:`, error);
    }
  }
  
  // Migrate reports
  let migratedReports = 0;
  for (const report of reports) {
    try {
      await window.reportsAPI.create(report);
      migratedReports++;
      console.log(`Migrated report: ${report.id}`);
    } catch (error) {
      console.error(`Failed to migrate report ${report.id}:`, error);
    }
  }
  
  console.log(`\nMigration complete!`);
  console.log(`Migrated ${migratedJobs} jobs and ${migratedReports} reports`);
  console.log('\nYou can now clear localStorage if desired:');
  console.log('localStorage.removeItem("scheduledJobs");');
  console.log('localStorage.removeItem("wellReports");');
}

// Run migration
migrateData();

