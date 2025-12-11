// Helper script to create .env.local file
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔧 Supabase Environment Setup\n');
console.log('Please provide your Supabase credentials.\n');
console.log('You can find these in your Supabase project settings:\n');
console.log('  - Project URL: https://your-project.supabase.co');
console.log('  - Anon Key: Found in Settings > API\n');

rl.question('Enter your Supabase Project URL: ', (url) => {
  rl.question('Enter your Supabase Anon Key: ', (key) => {
    const envContent = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=${url}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${key}
`;

    const envPath = path.join(__dirname, '.env.local');
    fs.writeFileSync(envPath, envContent);
    
    console.log('\n✅ Created .env.local file!');
    console.log('📝 Make sure to add .env.local to .gitignore (already done)');
    rl.close();
  });
});
