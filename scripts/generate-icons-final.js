// Final icon generation script with error handling
const fs = require('fs');
const path = require('path');

let canvas;
try {
  const { createCanvas } = require('canvas');
  canvas = createCanvas;
} catch (error) {
  console.error('❌ Canvas library not available. Trying alternative method...');
  process.exit(1);
}

const publicDir = path.join(__dirname, '..', 'public');

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log('📁 Created public directory');
}

function createIcon(size) {
  try {
    const c = canvas(size, size);
    const ctx = c.getContext('2d');
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#FF6B35');
    gradient.addColorStop(1, '#4CAF50');
    
    // Draw rounded rectangle
    ctx.fillStyle = gradient;
    const radius = size * 0.2;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(size - radius, 0);
    ctx.quadraticCurveTo(size, 0, size, radius);
    ctx.lineTo(size, size - radius);
    ctx.quadraticCurveTo(size, size, size - radius, size);
    ctx.lineTo(radius, size);
    ctx.quadraticCurveTo(0, size, 0, size - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fill();
    
    // Add text
    ctx.fillStyle = 'white';
    ctx.font = `bold ${Math.floor(size * 0.3)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P2P', size / 2, size / 2);
    
    // Save
    const outputPath = path.join(publicDir, `icon-${size}x${size}.png`);
    const buffer = c.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    
    // Verify file was created
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      console.log(`✅ Created ${path.basename(outputPath)} (${Math.round(stats.size / 1024)}KB)`);
      return true;
    } else {
      console.error(`❌ File not found after creation: ${outputPath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error creating ${size}x${size} icon:`, error.message);
    return false;
  }
}

console.log('🎨 Generating PWA icons...\n');

const sizes = [192, 512];
let allSuccess = true;

for (const size of sizes) {
  if (!createIcon(size)) {
    allSuccess = false;
  }
}

if (allSuccess) {
  console.log('\n✅ All icons generated successfully!');
  console.log('📁 Location: public/ directory');
  console.log('   - icon-192x192.png');
  console.log('   - icon-512x512.png\n');
} else {
  console.log('\n⚠️  Some icons failed to generate');
  console.log('💡 Alternative: Open scripts/setup-pwa-icons.html in your browser');
  process.exit(1);
}
