const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const sharp = require('sharp');
const path = require('path');

const WIDTH = 1200;
const HEIGHT = 630;
const OUTPUT = path.join(__dirname, 'site', 'og-image.jpg');

const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext('2d');

// Background
ctx.fillStyle = '#2F2F2F';
ctx.fillRect(0, 0, WIDTH, HEIGHT);

// Element 1: top accent bar
ctx.fillStyle = '#F5E642';
ctx.fillRect(80, 100, 120, 4);

// Element 2: name
ctx.fillStyle = '#F1F1F0';
ctx.font = 'bold 72px Georgia, serif';
ctx.fillText('Radovan Grezo', 80, 220);

// Element 3: title
ctx.fillStyle = '#8C8C8A';
ctx.font = '28px Arial, sans-serif';
ctx.fillText('Creative Director & Copywriter', 80, 278);

// Element 4: divider bar
ctx.fillStyle = '#F5E642';
ctx.fillRect(80, 310, WIDTH - 160, 4);

// Element 5: location
ctx.fillStyle = '#8C8C8A';
ctx.font = '18px Arial, sans-serif';
ctx.fillText('Prague · Available worldwide', 80, 350);

// Export via sharp for JPEG quality control
const pngBuffer = canvas.toBuffer('image/png');

sharp(pngBuffer)
  .jpeg({ quality: 90 })
  .toFile(OUTPUT, (err) => {
    if (err) {
      console.error('Error saving og-image.jpg:', err);
      process.exit(1);
    }
    console.log(`og-image.jpg saved to ${OUTPUT}`);
  });
