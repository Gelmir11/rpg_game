/**
 * Legend of Duskhollow — HD Sprite Generator
 * Uses @napi-rs/canvas for anti-aliased, high-quality PNG sprite sheets
 * Run: node scripts/generate-sprites.js
 */
const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'assets');

// ============================================================
//  UTILITY HELPERS
// ============================================================

function saveCanvas(canvas, relPath) {
  const fullPath = path.join(OUTPUT_DIR, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(fullPath, buffer);
  console.log(`  ✓ ${relPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

function hexToRgba(hex, alpha = 1) {
  const r = (hex >> 16) & 0xFF;
  const g = (hex >> 8) & 0xFF;
  const b = hex & 0xFF;
  return `rgba(${r},${g},${b},${alpha})`;
}

function darken(hex, factor = 0.7) {
  const r = Math.floor(((hex >> 16) & 0xFF) * factor);
  const g = Math.floor(((hex >> 8) & 0xFF) * factor);
  const b = Math.floor((hex & 0xFF) * factor);
  return (r << 16) | (g << 8) | b;
}

function lighten(hex, factor = 1.3) {
  const r = Math.min(255, Math.floor(((hex >> 16) & 0xFF) * factor));
  const g = Math.min(255, Math.floor(((hex >> 8) & 0xFF) * factor));
  const b = Math.min(255, Math.floor((hex & 0xFF) * factor));
  return (r << 16) | (g << 8) | b;
}

/** Draw ellipse with anti-aliasing */
function ellipse(ctx, cx, cy, rx, ry, color, alpha = 1) {
  ctx.fillStyle = hexToRgba(color, alpha);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Draw rounded rect */
function roundRect(ctx, x, y, w, h, r, color, alpha = 1) {
  ctx.fillStyle = hexToRgba(color, alpha);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

/** Draw gradient rect (vertical) */
function gradRect(ctx, x, y, w, h, c1, c2) {
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, hexToRgba(c1));
  grad.addColorStop(1, hexToRgba(c2));
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
}

/** Draw outline around shape */
function strokeRound(ctx, x, y, w, h, r, color, lineWidth = 1) {
  ctx.strokeStyle = hexToRgba(color);
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.stroke();
}

/** Anime-style eye */
function drawEye(ctx, cx, cy, size, irisColor, pupilColor = 0x1a1a2a) {
  const s = size;
  // Eye white
  roundRect(ctx, cx - s, cy - s, s * 2, s * 2.2, s * 0.3, 0xFFFFFF);
  // Iris
  roundRect(ctx, cx - s * 0.7, cy - s * 0.6, s * 1.4, s * 2, s * 0.3, irisColor);
  // Pupil
  roundRect(ctx, cx - s * 0.35, cy + s * 0.1, s * 0.7, s * 1.0, s * 0.2, pupilColor);
  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.ellipse(cx - s * 0.35, cy - s * 0.3, s * 0.35, s * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  // Top eyelid shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(cx - s, cy - s, s * 2, s * 0.4);
}

// ============================================================
//  NPC SPRITE GENERATORS
// ============================================================
function generateNPCs() {
  console.log('\n📦 Generating NPC sprites...');
  const fw = 64, fh = 96;

  // === NPC ELDER (Yaşlı Bilge) ===
  {
    const c = createCanvas(fw, fh);
    const ctx = c.getContext('2d');

    // Shadow
    ellipse(ctx, 32, 90, 18, 5, 0x000000, 0.25);

    // Feet (sandals)
    roundRect(ctx, 16, 82, 12, 6, 2, 0x5a3a1a);
    roundRect(ctx, 36, 82, 12, 6, 2, 0x5a3a1a);

    // Legs
    ctx.fillStyle = hexToRgba(0xB8860B);
    ctx.fillRect(20, 72, 8, 12);
    ctx.fillRect(36, 72, 8, 12);

    // Robe body (golden gradient)
    gradRect(ctx, 12, 38, 40, 36, 0xDAA520, 0xB8860B);
    // Robe center line
    ctx.fillStyle = hexToRgba(0xFFD700, 0.3);
    ctx.fillRect(30, 38, 4, 36);
    // Belt
    roundRect(ctx, 14, 56, 36, 4, 1, 0x8B6508);
    ellipse(ctx, 32, 58, 3, 3, 0xFFD700); // buckle
    // Robe outline
    strokeRound(ctx, 12, 38, 40, 36, 2, darken(0xB8860B, 0.6), 1.5);
    // Robe bottom trim
    for (let i = 0; i < 5; i++) {
      roundRect(ctx, 14 + i * 8, 70, 6, 3, 1, 0xFFD700, 0.4);
    }

    // Arms (wide sleeves)
    roundRect(ctx, 4, 40, 12, 22, 3, 0xDAA520);
    roundRect(ctx, 48, 40, 12, 22, 3, 0xDAA520);
    strokeRound(ctx, 4, 40, 12, 22, 3, darken(0xDAA520, 0.6), 1);
    strokeRound(ctx, 48, 40, 12, 22, 3, darken(0xDAA520, 0.6), 1);

    // Hands
    ellipse(ctx, 10, 64, 4, 4, 0xDEB887);
    ellipse(ctx, 54, 64, 4, 4, 0xDEB887);

    // Staff (right hand)
    ctx.fillStyle = hexToRgba(0x5a3a1a);
    ctx.fillRect(52, 24, 3, 48);
    ctx.fillStyle = hexToRgba(0x3a1a0a);
    ctx.fillRect(51, 26, 5, 2);
    // Crystal orb on staff
    const grad = ctx.createRadialGradient(54, 20, 1, 54, 20, 7);
    grad.addColorStop(0, 'rgba(200,255,255,0.95)');
    grad.addColorStop(0.4, 'rgba(0,255,255,0.7)');
    grad.addColorStop(1, 'rgba(0,180,200,0.2)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(54, 20, 7, 0, Math.PI * 2);
    ctx.fill();
    // Crystal sparkle
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(52, 18, 1.5, 0, Math.PI * 2); ctx.fill();

    // Neck
    ctx.fillStyle = hexToRgba(0xDEB887);
    ctx.fillRect(27, 28, 10, 12);

    // Head
    roundRect(ctx, 18, 8, 28, 24, 7, 0xDEB887);
    strokeRound(ctx, 18, 8, 28, 24, 7, darken(0xDEB887, 0.65), 1.5);

    // Beard (long, white)
    roundRect(ctx, 22, 26, 20, 16, 5, 0xDDDDDD);
    // Beard strands
    ctx.fillStyle = hexToRgba(0xEEEEEE, 0.6);
    for (let i = 0; i < 4; i++) ctx.fillRect(24 + i * 5, 28, 2, 14);
    // Beard tip
    ctx.beginPath();
    ctx.moveTo(26, 40); ctx.lineTo(32, 50); ctx.lineTo(38, 40);
    ctx.fillStyle = hexToRgba(0xCCCCCC, 0.8); ctx.fill();

    // Hair (white, sides)
    roundRect(ctx, 16, 4, 32, 14, 5, 0xCCCCCC);
    ctx.fillStyle = hexToRgba(0xCCCCCC);
    ctx.fillRect(16, 10, 5, 16);
    ctx.fillRect(43, 10, 5, 16);

    // Wizard hat
    ctx.fillStyle = hexToRgba(0x8B6508);
    ctx.fillRect(10, 8, 44, 5); // brim
    // Hat body
    ctx.beginPath();
    ctx.moveTo(32, -10); ctx.lineTo(16, 10); ctx.lineTo(48, 10);
    ctx.fillStyle = hexToRgba(0xB8860B); ctx.fill();
    // Hat highlight
    ctx.beginPath();
    ctx.moveTo(32, -8); ctx.lineTo(22, 8); ctx.lineTo(42, 8);
    ctx.fillStyle = hexToRgba(0xDAA520, 0.4); ctx.fill();
    // Star on hat tip
    ellipse(ctx, 32, -8, 3, 3, 0xFFD700);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(31, -9, 1, 0, Math.PI * 2); ctx.fill();

    // Eyes
    drawEye(ctx, 26, 17, 3.5, 0x6aAACC);
    drawEye(ctx, 38, 17, 3.5, 0x6aAACC);

    // Eyebrows
    ctx.strokeStyle = hexToRgba(0xAAAAAA);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(22, 13); ctx.lineTo(30, 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(34, 12); ctx.lineTo(42, 13); ctx.stroke();

    // Quest marker (!)
    roundRect(ctx, 27, -22, 10, 12, 2, 0xFFD700);
    roundRect(ctx, 29, -8, 6, 4, 1, 0xFFD700);

    saveCanvas(c, 'sprites/npcs/npc_elder.png');
  }

  // === NPC HEALER (Şifacı) ===
  {
    const c = createCanvas(fw, fh);
    const ctx = c.getContext('2d');

    ellipse(ctx, 32, 90, 18, 5, 0x000000, 0.25);

    // Feet
    roundRect(ctx, 18, 82, 10, 6, 2, 0x2a3a7a);
    roundRect(ctx, 36, 82, 10, 6, 2, 0x2a3a7a);

    // Legs
    ctx.fillStyle = hexToRgba(0x3a4a9a);
    ctx.fillRect(20, 72, 8, 12); ctx.fillRect(36, 72, 8, 12);

    // Robe body (blue gradient)
    gradRect(ctx, 12, 36, 40, 38, 0x4169E1, 0x2a4aAA);
    strokeRound(ctx, 12, 36, 40, 38, 2, darken(0x2a4aAA, 0.6), 1.5);

    // Cross symbol on chest
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(29, 42, 6, 16);
    ctx.fillRect(25, 48, 14, 6);

    // Belt
    roundRect(ctx, 14, 60, 36, 3, 1, 0x3a5a9a);

    // Medicine bag
    roundRect(ctx, 48, 54, 10, 12, 3, 0x8B4513);
    ctx.fillStyle = hexToRgba(0xFF2222, 0.8);
    ctx.fillRect(51, 57, 4, 6); ctx.fillRect(49, 59, 8, 2);

    // Arms
    roundRect(ctx, 4, 38, 12, 22, 3, 0x4169E1);
    roundRect(ctx, 48, 38, 12, 22, 3, 0x4169E1);

    // Hands + healing glow
    const healGlow = ctx.createRadialGradient(10, 62, 1, 10, 62, 10);
    healGlow.addColorStop(0, 'rgba(0,255,136,0.4)');
    healGlow.addColorStop(1, 'rgba(0,255,136,0)');
    ctx.fillStyle = healGlow;
    ctx.beginPath(); ctx.arc(10, 62, 10, 0, Math.PI * 2); ctx.fill();
    ellipse(ctx, 10, 62, 4, 4, 0xF0E0D0);

    const healGlow2 = ctx.createRadialGradient(54, 62, 1, 54, 62, 10);
    healGlow2.addColorStop(0, 'rgba(0,255,136,0.3)');
    healGlow2.addColorStop(1, 'rgba(0,255,136,0)');
    ctx.fillStyle = healGlow2;
    ctx.beginPath(); ctx.arc(54, 62, 10, 0, Math.PI * 2); ctx.fill();
    ellipse(ctx, 54, 62, 4, 4, 0xF0E0D0);

    // Neck
    ctx.fillStyle = hexToRgba(0xF0E0D0);
    ctx.fillRect(27, 28, 10, 10);

    // Head
    roundRect(ctx, 18, 6, 28, 24, 7, 0xF0E0D0);
    strokeRound(ctx, 18, 6, 28, 24, 7, darken(0xF0E0D0, 0.65), 1.5);

    // Hair (brown)
    roundRect(ctx, 16, 2, 32, 14, 5, 0x8B4513);
    ctx.fillStyle = hexToRgba(0x8B4513);
    ctx.fillRect(16, 10, 4, 12); ctx.fillRect(44, 10, 4, 12);
    // Braids
    ctx.fillStyle = hexToRgba(0x6B3503);
    ctx.fillRect(16, 18, 3, 10); ctx.fillRect(45, 18, 3, 10);

    // Eyes
    drawEye(ctx, 26, 16, 3.5, 0x00AA44);
    drawEye(ctx, 38, 16, 3.5, 0x00AA44);

    // Smile
    ctx.strokeStyle = hexToRgba(0xBB7766);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(32, 22, 5, 0.2, Math.PI - 0.2); ctx.stroke();

    // Quest marker
    roundRect(ctx, 27, -22, 10, 12, 2, 0xFFD700);
    roundRect(ctx, 29, -8, 6, 4, 1, 0xFFD700);

    saveCanvas(c, 'sprites/npcs/npc_healer.png');
  }

  // === NPC GUARD (Muhafız) ===
  {
    const c = createCanvas(fw, fh);
    const ctx = c.getContext('2d');

    ellipse(ctx, 32, 90, 18, 5, 0x000000, 0.25);

    // Boots
    roundRect(ctx, 16, 80, 12, 8, 2, 0x3a3a3a);
    roundRect(ctx, 36, 80, 12, 8, 2, 0x3a3a3a);

    // Leg armor
    gradRect(ctx, 18, 64, 10, 18, 0x5a5a5a, 0x3a3a3a);
    gradRect(ctx, 36, 64, 10, 18, 0x5a5a5a, 0x3a3a3a);
    // Knee pads
    roundRect(ctx, 19, 68, 8, 5, 2, 0x6a6a6a);
    roundRect(ctx, 37, 68, 8, 5, 2, 0x6a6a6a);

    // Body armor
    gradRect(ctx, 12, 32, 40, 34, 0x6a6a6a, 0x4a4a4a);
    strokeRound(ctx, 12, 32, 40, 34, 2, 0x2a2a2a, 1.5);
    // Chest plate detail
    roundRect(ctx, 16, 34, 32, 18, 2, 0x7a7a7a);
    ctx.fillStyle = hexToRgba(0x8a8a8a, 0.5);
    ctx.fillRect(18, 36, 28, 3); ctx.fillRect(18, 42, 28, 3);
    // Gold emblem
    ellipse(ctx, 32, 48, 5, 5, 0xDAA520);
    ctx.fillStyle = hexToRgba(0xFFD700);
    ctx.fillRect(30, 44, 4, 8); ctx.fillRect(28, 46, 8, 4);
    // Belt
    roundRect(ctx, 14, 58, 36, 4, 1, 0x4a2a0a);

    // Shoulder pads
    roundRect(ctx, 4, 30, 12, 10, 4, 0x6a6a6a);
    roundRect(ctx, 48, 30, 12, 10, 4, 0x6a6a6a);
    strokeRound(ctx, 4, 30, 12, 10, 4, 0x3a3a3a, 1);
    strokeRound(ctx, 48, 30, 12, 10, 4, 0x3a3a3a, 1);

    // Arms
    roundRect(ctx, 4, 38, 10, 22, 2, 0x4a4a4a);
    roundRect(ctx, 50, 38, 10, 22, 2, 0x4a4a4a);

    // Shield (left)
    roundRect(ctx, -2, 46, 14, 20, 4, 0x5a5a5a);
    strokeRound(ctx, -1, 47, 12, 18, 3, 0x3a3a3a, 1);
    ellipse(ctx, 5, 56, 4, 4, 0xDAA520);

    // Spear (right)
    ctx.fillStyle = hexToRgba(0x5a3a1a);
    ctx.fillRect(58, 18, 3, 56);
    // Spear tip
    ctx.beginPath();
    ctx.moveTo(56, 18); ctx.lineTo(59.5, 6); ctx.lineTo(63, 18);
    ctx.fillStyle = hexToRgba(0xC0C0C0); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(57, 16); ctx.lineTo(59.5, 9); ctx.lineTo(62, 16);
    ctx.fillStyle = hexToRgba(0xE0E0E0, 0.6); ctx.fill();

    // Neck
    roundRect(ctx, 24, 26, 16, 8, 1, 0x5a5a5a);
    ctx.fillStyle = hexToRgba(0xDEB887);
    ctx.fillRect(28, 26, 8, 6);

    // Helmet
    roundRect(ctx, 17, 2, 30, 26, 7, 0x4a4a4a);
    strokeRound(ctx, 17, 2, 30, 26, 7, 0x2a2a2a, 1.5);
    // Helmet ridge
    roundRect(ctx, 20, 4, 24, 5, 2, 0x5a5a5a);
    // Red plume
    ctx.beginPath();
    ctx.moveTo(32, -6); ctx.lineTo(28, 6); ctx.lineTo(36, 6);
    ctx.fillStyle = hexToRgba(0xCC0000); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(32, -4); ctx.lineTo(30, 4); ctx.lineTo(34, 4);
    ctx.fillStyle = hexToRgba(0xFF3333, 0.6); ctx.fill();
    // Visor
    ctx.fillStyle = hexToRgba(0x1a1a1a);
    ctx.fillRect(20, 14, 24, 6);
    ctx.fillStyle = hexToRgba(0xDEB887, 0.8);
    ctx.fillRect(22, 15, 20, 4);
    // Eyes behind visor
    ctx.fillStyle = hexToRgba(0x1a1a2a);
    ctx.fillRect(27, 16, 4, 2); ctx.fillRect(35, 16, 4, 2);

    saveCanvas(c, 'sprites/npcs/npc_guard.png');
  }

  // === NPC SHOPKEEPER (Dükkancı) ===
  {
    const c = createCanvas(fw, fh);
    const ctx = c.getContext('2d');

    ellipse(ctx, 32, 90, 18, 5, 0x000000, 0.25);

    // Feet
    roundRect(ctx, 18, 82, 10, 6, 2, 0x3a2a0a);
    roundRect(ctx, 36, 82, 10, 6, 2, 0x3a2a0a);

    // Pants
    ctx.fillStyle = hexToRgba(0x4a3a1a);
    ctx.fillRect(20, 68, 8, 16); ctx.fillRect(36, 68, 8, 16);

    // Shirt
    gradRect(ctx, 14, 34, 36, 38, 0xF5DEB3, 0xDEB887);

    // Apron
    roundRect(ctx, 18, 40, 28, 30, 2, 0x8B4513);
    strokeRound(ctx, 18, 40, 28, 30, 2, darken(0x8B4513, 0.6), 1);
    // Apron pocket
    roundRect(ctx, 24, 54, 12, 10, 2, 0x6a3503);
    // Gold coin in pocket
    ellipse(ctx, 30, 60, 3, 3, 0xFFD700);
    ellipse(ctx, 30, 60, 2, 2, 0xFFEE44, 0.5);

    // Belt
    roundRect(ctx, 16, 66, 32, 4, 1, 0x4a2a0a);
    roundRect(ctx, 30, 66, 6, 4, 1, 0xDAA520);

    // Arms
    roundRect(ctx, 6, 38, 10, 22, 3, 0xF5DEB3);
    roundRect(ctx, 48, 38, 10, 22, 3, 0xF5DEB3);

    // Hands
    ellipse(ctx, 11, 62, 4, 4, 0xDEB887);
    ellipse(ctx, 53, 62, 4, 4, 0xDEB887);

    // Coin pouch (left hand)
    ellipse(ctx, 8, 62, 6, 5, 0x8B6508);
    ellipse(ctx, 8, 62, 4, 4, 0xDAA520);
    ellipse(ctx, 7, 60, 2, 2, 0xFFD700);
    ellipse(ctx, 10, 63, 1.5, 1.5, 0xFFD700);

    // Scale (right hand)
    ctx.strokeStyle = hexToRgba(0xDAA520);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(53, 50); ctx.lineTo(53, 58); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(48, 50); ctx.lineTo(58, 50); ctx.stroke();
    ellipse(ctx, 49, 54, 3, 2, 0xDAA520);
    ellipse(ctx, 57, 54, 3, 2, 0xDAA520);

    // Neck
    ctx.fillStyle = hexToRgba(0xDEB887);
    ctx.fillRect(27, 26, 10, 10);

    // Head
    roundRect(ctx, 18, 6, 28, 24, 7, 0xDEB887);
    strokeRound(ctx, 18, 6, 28, 24, 7, darken(0xDEB887, 0.65), 1.5);

    // Hair (brown, short)
    roundRect(ctx, 16, 2, 32, 14, 5, 0x4a2a0a);
    ctx.fillStyle = hexToRgba(0x4a2a0a);
    ctx.fillRect(16, 10, 4, 10); ctx.fillRect(44, 10, 4, 10);

    // Eyes (friendly)
    drawEye(ctx, 26, 16, 3, 0x4a3a1a);
    drawEye(ctx, 38, 16, 3, 0x4a3a1a);

    // Mustache
    ctx.fillStyle = hexToRgba(0x3a1a00);
    ctx.beginPath();
    ctx.moveTo(24, 22); ctx.quadraticCurveTo(20, 26, 18, 24);
    ctx.lineTo(24, 22);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(40, 22); ctx.quadraticCurveTo(44, 26, 46, 24);
    ctx.lineTo(40, 22);
    ctx.fill();
    ctx.fillRect(24, 22, 16, 3);

    // Smile
    ctx.strokeStyle = hexToRgba(0xBB7766);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(32, 24, 4, 0.3, Math.PI - 0.3); ctx.stroke();

    // Quest marker
    roundRect(ctx, 27, -22, 10, 12, 2, 0xFFD700);
    roundRect(ctx, 29, -8, 6, 4, 1, 0xFFD700);

    saveCanvas(c, 'sprites/npcs/npc_shopkeeper.png');
  }

  // === NPC DUNGEON KEEPER (Zindan Bekçisi) ===
  {
    const c = createCanvas(fw, fh);
    const ctx = c.getContext('2d');

    ellipse(ctx, 32, 90, 18, 5, 0x000000, 0.25);

    // Boots
    roundRect(ctx, 16, 80, 12, 8, 2, 0x2a1a0a);
    roundRect(ctx, 36, 80, 12, 8, 2, 0x2a1a0a);

    // Legs
    ctx.fillStyle = hexToRgba(0x3a1a0a);
    ctx.fillRect(20, 68, 8, 14); ctx.fillRect(36, 68, 8, 14);

    // Robe (dark brown-red)
    gradRect(ctx, 12, 36, 40, 36, 0x8B2500, 0x5a1500);
    strokeRound(ctx, 12, 36, 40, 36, 2, darken(0x5a1500, 0.5), 1.5);

    // Leather chest piece
    roundRect(ctx, 16, 38, 32, 14, 2, 0x5a3a1a);
    ctx.fillStyle = hexToRgba(0x4a2a0a, 0.7);
    ctx.fillRect(18, 40, 28, 2); ctx.fillRect(18, 46, 28, 2);

    // Belt + key ring
    roundRect(ctx, 14, 58, 36, 4, 1, 0x2a1a0a);
    // Keys
    ellipse(ctx, 48, 60, 3, 3, 0xDAA520);
    ctx.fillStyle = hexToRgba(0xB0B0B0);
    ctx.fillRect(46, 62, 2, 6); ctx.fillRect(50, 63, 2, 5);
    ctx.fillRect(48, 64, 2, 4);

    // Arms
    roundRect(ctx, 4, 38, 12, 22, 3, 0x8B2500);
    roundRect(ctx, 48, 38, 12, 22, 3, 0x8B2500);

    // Hands
    ellipse(ctx, 10, 62, 4, 4, 0xDEB887);
    ellipse(ctx, 54, 62, 4, 4, 0xDEB887);

    // Torch (right hand)
    ctx.fillStyle = hexToRgba(0x5a3a1a);
    ctx.fillRect(52, 30, 3, 32);
    // Fire
    const fireGrad = ctx.createRadialGradient(54, 26, 0, 54, 26, 10);
    fireGrad.addColorStop(0, 'rgba(255,255,0,0.9)');
    fireGrad.addColorStop(0.3, 'rgba(255,165,0,0.7)');
    fireGrad.addColorStop(0.6, 'rgba(255,69,0,0.5)');
    fireGrad.addColorStop(1, 'rgba(255,69,0,0)');
    ctx.fillStyle = fireGrad;
    ctx.beginPath(); ctx.arc(54, 26, 10, 0, Math.PI * 2); ctx.fill();
    // Fire core
    ctx.beginPath();
    ctx.moveTo(50, 32); ctx.lineTo(54, 20); ctx.lineTo(58, 32);
    ctx.fillStyle = hexToRgba(0xFFDD00, 0.8); ctx.fill();

    // Neck
    ctx.fillStyle = hexToRgba(0xDEB887);
    ctx.fillRect(27, 26, 10, 12);

    // Head
    roundRect(ctx, 18, 6, 28, 24, 7, 0xDEB887);
    strokeRound(ctx, 18, 6, 28, 24, 7, darken(0xDEB887, 0.65), 1.5);

    // Hair (black)
    roundRect(ctx, 16, 2, 32, 14, 5, 0x1a1a1a);
    ctx.fillStyle = hexToRgba(0x1a1a1a);
    ctx.fillRect(16, 10, 4, 12); ctx.fillRect(44, 10, 4, 12);

    // Scar
    ctx.strokeStyle = hexToRgba(0x8B0000, 0.6);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(20, 12); ctx.lineTo(24, 22); ctx.stroke();

    // Eyes (amber, stern)
    drawEye(ctx, 26, 16, 3, 0xCC6600);
    drawEye(ctx, 38, 16, 3, 0xCC6600);

    // Frown
    ctx.strokeStyle = hexToRgba(0x8B6060);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(26, 24); ctx.lineTo(38, 24); ctx.stroke();

    // Quest marker
    roundRect(ctx, 27, -22, 10, 12, 2, 0xFFD700);
    roundRect(ctx, 29, -8, 6, 4, 1, 0xFFD700);

    saveCanvas(c, 'sprites/npcs/npc_dungeon_keeper.png');
  }

  // === NPC LABYRINTH SAGE (Labirent Bilgesi) ===
  {
    const c = createCanvas(fw, fh);
    const ctx = c.getContext('2d');

    // Mystical aura
    const auraGrad = ctx.createRadialGradient(32, 50, 5, 32, 50, 35);
    auraGrad.addColorStop(0, 'rgba(106,13,173,0.1)');
    auraGrad.addColorStop(1, 'rgba(106,13,173,0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath(); ctx.arc(32, 50, 35, 0, Math.PI * 2); ctx.fill();

    ellipse(ctx, 32, 90, 18, 5, 0x000000, 0.25);

    // Feet
    roundRect(ctx, 18, 82, 10, 6, 2, 0x2a1a4a);
    roundRect(ctx, 36, 82, 10, 6, 2, 0x2a1a4a);

    // Legs
    ctx.fillStyle = hexToRgba(0x3a2a5a);
    ctx.fillRect(20, 70, 8, 14); ctx.fillRect(36, 70, 8, 14);

    // Robe (purple gradient)
    gradRect(ctx, 12, 38, 40, 36, 0x483D8B, 0x2a1a5a);
    strokeRound(ctx, 12, 38, 40, 36, 2, darken(0x2a1a5a, 0.5), 1.5);

    // Rune symbols on robe
    ellipse(ctx, 24, 50, 4, 4, 0x9370DB, 0.3);
    ellipse(ctx, 40, 56, 3, 3, 0x9370DB, 0.3);
    ctx.fillStyle = hexToRgba(0x7B68EE, 0.4);
    ctx.fillRect(22, 48, 1, 6); ctx.fillRect(26, 46, 1, 6);
    ctx.fillRect(38, 54, 1, 5); ctx.fillRect(42, 52, 1, 5);

    // Belt (silver)
    roundRect(ctx, 14, 60, 36, 3, 1, 0x808080);
    ellipse(ctx, 32, 61, 3, 3, 0x9370DB);

    // Arms
    roundRect(ctx, 2, 40, 12, 22, 3, 0x483D8B);
    roundRect(ctx, 50, 40, 12, 22, 3, 0x483D8B);

    // Crystal orb (left hand)
    ellipse(ctx, 8, 64, 4, 4, 0xE0D0C0);
    const orbGrad = ctx.createRadialGradient(6, 56, 1, 6, 56, 9);
    orbGrad.addColorStop(0, 'rgba(224,176,255,0.8)');
    orbGrad.addColorStop(0.3, 'rgba(186,85,211,0.6)');
    orbGrad.addColorStop(0.6, 'rgba(123,104,238,0.4)');
    orbGrad.addColorStop(1, 'rgba(147,112,219,0.1)');
    ctx.fillStyle = orbGrad;
    ctx.beginPath(); ctx.arc(6, 56, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(4, 54, 2, 0, Math.PI * 2); ctx.fill();

    // Book (right hand)
    roundRect(ctx, 52, 56, 10, 12, 2, 0x4a1a0a);
    roundRect(ctx, 54, 58, 6, 8, 1, 0x6a3a1a);
    ctx.fillStyle = hexToRgba(0xFFD700, 0.5);
    ctx.fillRect(55, 59, 4, 1); ctx.fillRect(55, 62, 4, 1);

    // Neck
    ctx.fillStyle = hexToRgba(0xE0D0C0);
    ctx.fillRect(27, 28, 10, 12);

    // Head
    roundRect(ctx, 18, 8, 28, 24, 7, 0xE0D0C0);
    strokeRound(ctx, 18, 8, 28, 24, 7, darken(0xE0D0C0, 0.65), 1.5);

    // Short beard
    roundRect(ctx, 24, 26, 16, 8, 3, 0xDDDDDD);
    ctx.fillStyle = hexToRgba(0xEEEEEE, 0.5);
    ctx.fillRect(26, 28, 2, 6); ctx.fillRect(34, 28, 2, 6);

    // Hair (silver)
    roundRect(ctx, 16, 4, 32, 12, 5, 0xCCCCCC);
    ctx.fillStyle = hexToRgba(0xCCCCCC);
    ctx.fillRect(16, 10, 4, 14); ctx.fillRect(44, 10, 4, 14);

    // Wizard hat (purple, stars)
    ctx.fillStyle = hexToRgba(0x2a1a5a);
    ctx.fillRect(10, 8, 44, 5);
    ctx.beginPath();
    ctx.moveTo(32, -12); ctx.lineTo(16, 10); ctx.lineTo(48, 10);
    ctx.fillStyle = hexToRgba(0x3a2a6a); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(32, -10); ctx.lineTo(22, 8); ctx.lineTo(42, 8);
    ctx.fillStyle = hexToRgba(0x483D8B, 0.3); ctx.fill();
    // Stars on hat
    ellipse(ctx, 28, 2, 2, 2, 0xFFD700, 0.8);
    ellipse(ctx, 38, -2, 1.5, 1.5, 0xFFD700, 0.7);
    ellipse(ctx, 24, -4, 1, 1, 0xFFD700, 0.6);
    // Crystal on tip
    const tipGrad = ctx.createRadialGradient(32, -10, 0, 32, -10, 4);
    tipGrad.addColorStop(0, 'rgba(224,176,255,0.9)');
    tipGrad.addColorStop(1, 'rgba(147,112,219,0.3)');
    ctx.fillStyle = tipGrad;
    ctx.beginPath(); ctx.arc(32, -10, 4, 0, Math.PI * 2); ctx.fill();

    // Eyes (purple, glowing)
    drawEye(ctx, 26, 17, 3.5, 0x9370DB);
    drawEye(ctx, 38, 17, 3.5, 0x9370DB);
    // Eye glow
    const eyeGlow = ctx.createRadialGradient(26, 17, 0, 26, 17, 6);
    eyeGlow.addColorStop(0, 'rgba(186,85,211,0.2)');
    eyeGlow.addColorStop(1, 'rgba(186,85,211,0)');
    ctx.fillStyle = eyeGlow;
    ctx.beginPath(); ctx.arc(26, 17, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(38, 17, 6, 0, Math.PI * 2); ctx.fill();

    // Quest marker
    roundRect(ctx, 27, -24, 10, 12, 2, 0xFFD700);
    roundRect(ctx, 29, -10, 6, 4, 1, 0xFFD700);

    saveCanvas(c, 'sprites/npcs/npc_labyrinth_sage.png');
  }
}

// ============================================================
//  MAIN
// ============================================================
// ============================================================
//  MONSTER SPRITE GENERATORS
// ============================================================

const MONSTERS = [
  { key: 'slime', w: 56, h: 48 },
  { key: 'goblin', w: 60, h: 72 },
  { key: 'skeleton', w: 60, h: 80 },
  { key: 'orc', w: 72, h: 84 },
  { key: 'wolf', w: 56, h: 48 },
  { key: 'golem', w: 64, h: 72 },
  { key: 'wraith', w: 52, h: 64 },
  { key: 'dragon', w: 128, h: 120 },
  { key: 'drake', w: 96, h: 88 },
  { key: 'drake_mother', w: 120, h: 112 },
  { key: 'ancient_dragon', w: 140, h: 128 },
  { key: 'slime_king', w: 64, h: 56 },
  { key: 'goblin_chief', w: 68, h: 80 },
  { key: 'skeleton_lord', w: 68, h: 88 },
  { key: 'orc_warlord', w: 80, h: 92 },
  { key: 'alpha_wolf', w: 64, h: 52 },
  { key: 'crystal_golem', w: 72, h: 80 },
  { key: 'wraith_queen', w: 60, h: 72 },
  { key: 'minotaur', w: 72, h: 84 },
  { key: 'shadow_spider', w: 56, h: 48 },
  { key: 'cursed_knight', w: 60, h: 80 },
  { key: 'maze_phantom', w: 52, h: 64 },
  { key: 'labyrinth_guardian', w: 80, h: 88 },
  { key: 'fire_imp', w: 48, h: 56 },
  { key: 'dark_bat', w: 52, h: 44 },
  { key: 'cave_troll', w: 72, h: 84 },
  { key: 'lava_golem', w: 64, h: 72 },
  { key: 'shadow_demon', w: 60, h: 72 },
  { key: 'bone_dragon', w: 96, h: 96 },
  { key: 'abyssal_fiend', w: 72, h: 80 },
  { key: 'dungeon_boss_1', w: 64, h: 56 },
  { key: 'dungeon_boss_2', w: 56, h: 64 },
  { key: 'dungeon_boss_3', w: 80, h: 88 },
  { key: 'dungeon_boss_4', w: 72, h: 80 },
  { key: 'dungeon_boss_5', w: 64, h: 76 },
  { key: 'dungeon_boss_6', w: 72, h: 80 },
  { key: 'dungeon_boss_7', w: 96, h: 96 },
  { key: 'dungeon_boss_8', w: 80, h: 88 },
  { key: 'dungeon_boss_9', w: 88, h: 96 },
  { key: 'dungeon_boss_10', w: 128, h: 128 },
];

// ----------------------------------------------------------
//  INDIVIDUAL MONSTER DRAW FUNCTIONS
//  Each monster has unique anatomy drawn with Canvas 2D paths
// ----------------------------------------------------------

/** Draw boss crown and aura overlay */
function drawBossCrown(ctx, cx, cy, w, h, bodyColor, frame) {
  ctx.fillStyle = hexToRgba(0xFFD700, 0.85);
  const crownY = cy - h * 0.44;
  ctx.fillRect(cx - w * 0.14, crownY, w * 0.28, h * 0.035);
  for (let t = 0; t < 3; t++) {
    ctx.beginPath();
    const tx = cx - w * 0.1 + t * w * 0.1;
    ctx.moveTo(tx, crownY); ctx.lineTo(tx + w * 0.03, crownY - h * 0.07);
    ctx.lineTo(tx + w * 0.06, crownY);
    ctx.fill();
  }
  ellipse(ctx, cx, crownY - h * 0.05, w * 0.025, h * 0.025, 0xFF0000);
  // Aura glow on frame 1
  if (frame === 1) {
    const aG = ctx.createRadialGradient(cx, cy, w * 0.08, cx, cy, w * 0.48);
    aG.addColorStop(0, hexToRgba(bodyColor, 0.18));
    aG.addColorStop(1, hexToRgba(bodyColor, 0));
    ctx.fillStyle = aG;
    ctx.beginPath(); ctx.arc(cx, cy, w * 0.48, 0, Math.PI * 2); ctx.fill();
  }
}

/** SLIME — translucent gel body with inner bubbles and cute face */
function drawSlime(ctx, cx, cy, w, h, frame, boss) {
  const sq = frame === 1 ? 3 : 0;
  const bodyColor = boss ? 0x00FF00 : 0x40d040;
  // Shadow
  ellipse(ctx, cx, cy + h * 0.42, w * 0.38, h * 0.06, 0x000000, 0.2);
  // Outer body blob
  const grad = ctx.createRadialGradient(cx, cy - 4 + sq, w * 0.06, cx, cy + sq, w * 0.42);
  grad.addColorStop(0, hexToRgba(lighten(bodyColor, 1.6), 0.85));
  grad.addColorStop(0.4, hexToRgba(bodyColor, 0.75));
  grad.addColorStop(1, hexToRgba(darken(bodyColor, 0.5), 0.6));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, cy + sq, w * 0.42, h * 0.36 - sq, 0, 0, Math.PI * 2);
  ctx.fill();
  // Inner bubbles (3 small circles for depth)
  ellipse(ctx, cx - w * 0.12, cy + h * 0.08 + sq, w * 0.06, h * 0.05, lighten(bodyColor, 1.4), 0.3);
  ellipse(ctx, cx + w * 0.15, cy + h * 0.12 + sq, w * 0.04, h * 0.035, lighten(bodyColor, 1.5), 0.25);
  ellipse(ctx, cx + w * 0.02, cy + h * 0.15 + sq, w * 0.03, h * 0.025, lighten(bodyColor, 1.6), 0.2);
  // Highlight reflection
  ellipse(ctx, cx - w * 0.12, cy - h * 0.12 + sq, w * 0.14, h * 0.1, 0xFFFFFF, 0.35);
  ellipse(ctx, cx - w * 0.08, cy - h * 0.15 + sq, w * 0.06, h * 0.05, 0xFFFFFF, 0.5);
  // Eyes (cute dot eyes)
  ellipse(ctx, cx - w * 0.12, cy - h * 0.06 + sq, w * 0.075, h * 0.075, 0xFFFFFF);
  ellipse(ctx, cx + w * 0.12, cy - h * 0.06 + sq, w * 0.075, h * 0.075, 0xFFFFFF);
  ellipse(ctx, cx - w * 0.10, cy - h * 0.05 + sq, w * 0.045, h * 0.055, 0x1a1a2a);
  ellipse(ctx, cx + w * 0.14, cy - h * 0.05 + sq, w * 0.045, h * 0.055, 0x1a1a2a);
  // Eye highlights
  ellipse(ctx, cx - w * 0.12, cy - h * 0.08 + sq, w * 0.02, h * 0.02, 0xFFFFFF, 0.9);
  ellipse(ctx, cx + w * 0.12, cy - h * 0.08 + sq, w * 0.02, h * 0.02, 0xFFFFFF, 0.9);
  // Cute smile
  ctx.strokeStyle = hexToRgba(darken(bodyColor, 0.3));
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy + h * 0.08 + sq, w * 0.09, 0.15, Math.PI - 0.15); ctx.stroke();
  // Outline
  ctx.strokeStyle = hexToRgba(darken(bodyColor, 0.25), 0.5);
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(cx, cy + sq, w * 0.42, h * 0.36 - sq, 0, 0, Math.PI * 2); ctx.stroke();
  if (boss) drawBossCrown(ctx, cx, cy, w, h, bodyColor, frame);
}

/** SKELETON — skull, rib cage, bony limbs, spine */
function drawSkeleton(ctx, cx, cy, w, h, frame, boss) {
  const b = frame === 1 ? 2 : 0;
  const bone = 0xE8E0C8, boneMid = darken(bone, 0.85), boneDark = darken(bone, 0.65), boneShade = darken(bone, 0.5);

  // Ground shadow
  ellipse(ctx, cx, cy + h * 0.44, w * 0.32, h * 0.05, 0x000000, 0.25);

  // === LEGS: Two-segment bones with joint circles ===
  const drawBone = (x1, y1, x2, y2, thickness) => {
    // Bone shaft with tapered shape
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / len * thickness * 0.5, ny = dx / len * thickness * 0.5;
    const midNx = nx * 0.6, midNy = ny * 0.6;
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    ctx.fillStyle = hexToRgba(bone);
    ctx.beginPath();
    ctx.moveTo(x1 + nx, y1 + ny);
    ctx.quadraticCurveTo(mx + midNx, my + midNy, x2 + nx * 0.8, y2 + ny * 0.8);
    ctx.lineTo(x2 - nx * 0.8, y2 - ny * 0.8);
    ctx.quadraticCurveTo(mx - midNx, my - midNy, x1 - nx, y1 - ny);
    ctx.closePath(); ctx.fill();
    // Bone highlight
    ctx.strokeStyle = hexToRgba(lighten(bone, 1.15), 0.5);
    ctx.lineWidth = thickness * 0.15;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    // Bone crack detail
    ctx.strokeStyle = hexToRgba(boneShade, 0.3); ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(mx - thickness * 0.2, my); ctx.lineTo(mx + thickness * 0.3, my + thickness * 0.4); ctx.stroke();
  };
  const drawJoint = (x, y, r) => {
    ellipse(ctx, x, y, r, r, boneMid);
    ctx.strokeStyle = hexToRgba(boneShade, 0.5); ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  };
  const boneThick = w * 0.05;
  // Left femur
  const lHip = { x: cx - w * 0.08, y: cy + h * 0.1 };
  const lKnee = { x: cx - w * 0.12 + b, y: cy + h * 0.24 };
  const lAnkle = { x: cx - w * 0.1 + b, y: cy + h * 0.38 };
  drawBone(lHip.x, lHip.y, lKnee.x, lKnee.y, boneThick);
  drawJoint(lKnee.x, lKnee.y, w * 0.025);
  drawBone(lKnee.x, lKnee.y, lAnkle.x, lAnkle.y, boneThick * 0.85);
  // Right femur
  const rHip = { x: cx + w * 0.08, y: cy + h * 0.1 };
  const rKnee = { x: cx + w * 0.12 - b, y: cy + h * 0.24 };
  const rAnkle = { x: cx + w * 0.1 - b, y: cy + h * 0.38 };
  drawBone(rHip.x, rHip.y, rKnee.x, rKnee.y, boneThick);
  drawJoint(rKnee.x, rKnee.y, w * 0.025);
  drawBone(rKnee.x, rKnee.y, rAnkle.x, rAnkle.y, boneThick * 0.85);
  // Feet bones (spread toes)
  ctx.strokeStyle = hexToRgba(bone); ctx.lineWidth = w * 0.02; ctx.lineCap = 'round';
  for (let t = 0; t < 3; t++) {
    ctx.beginPath();
    ctx.moveTo(lAnkle.x, lAnkle.y);
    ctx.lineTo(lAnkle.x - w * 0.04 + t * w * 0.03, lAnkle.y + h * 0.04);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(rAnkle.x, rAnkle.y);
    ctx.lineTo(rAnkle.x - w * 0.03 + t * w * 0.03, rAnkle.y + h * 0.04);
    ctx.stroke();
  }

  // === SPINE with vertebrae ===
  ctx.strokeStyle = hexToRgba(bone); ctx.lineWidth = w * 0.03;
  ctx.beginPath(); ctx.moveTo(cx, cy - h * 0.18); ctx.lineTo(cx, cy + h * 0.12); ctx.stroke();
  for (let v = 0; v < 7; v++) {
    const vy = cy - h * 0.16 + v * h * 0.042;
    const vw = w * 0.025 + (v < 4 ? v * w * 0.004 : (6 - v) * w * 0.004);
    ctx.fillStyle = hexToRgba(boneMid);
    ctx.beginPath();
    ctx.moveTo(cx - vw, vy); ctx.lineTo(cx, vy - h * 0.008);
    ctx.lineTo(cx + vw, vy); ctx.lineTo(cx, vy + h * 0.008);
    ctx.closePath(); ctx.fill();
  }

  // === RIBCAGE: 6 curved ribs ===
  for (let r = 0; r < 6; r++) {
    const ry = cy - h * 0.14 + r * h * 0.042;
    const ribW = w * (0.24 - r * 0.012);
    const ribBow = h * (0.015 + r * 0.003);
    // Left rib
    ctx.strokeStyle = hexToRgba(r % 2 === 0 ? bone : boneMid); ctx.lineWidth = w * 0.018;
    ctx.beginPath();
    ctx.moveTo(cx, ry);
    ctx.bezierCurveTo(cx - ribW * 0.4, ry - ribBow, cx - ribW * 0.8, ry - ribBow * 0.5, cx - ribW, ry + ribBow * 1.5);
    ctx.stroke();
    // Right rib
    ctx.beginPath();
    ctx.moveTo(cx, ry);
    ctx.bezierCurveTo(cx + ribW * 0.4, ry - ribBow, cx + ribW * 0.8, ry - ribBow * 0.5, cx + ribW, ry + ribBow * 1.5);
    ctx.stroke();
  }

  // === ARMS: Two-segment bones with elbow joints ===
  const armSwing = frame === 1 ? w * 0.04 : 0;
  // Left arm
  const lShoulder = { x: cx - w * 0.22, y: cy - h * 0.12 };
  const lElbow = { x: cx - w * 0.30, y: cy + h * 0.01 };
  const lHand = { x: cx - w * 0.26 + armSwing, y: cy + h * 0.15 };
  drawBone(lShoulder.x, lShoulder.y, lElbow.x, lElbow.y, boneThick * 0.9);
  drawJoint(lElbow.x, lElbow.y, w * 0.02);
  drawBone(lElbow.x, lElbow.y, lHand.x, lHand.y, boneThick * 0.75);
  // Right arm
  const rShoulder = { x: cx + w * 0.22, y: cy - h * 0.12 };
  const rElbow = { x: cx + w * 0.30, y: cy + h * 0.01 };
  const rHand = { x: cx + w * 0.26 - armSwing, y: cy + h * 0.15 };
  drawBone(rShoulder.x, rShoulder.y, rElbow.x, rElbow.y, boneThick * 0.9);
  drawJoint(rElbow.x, rElbow.y, w * 0.02);
  drawBone(rElbow.x, rElbow.y, rHand.x, rHand.y, boneThick * 0.75);
  // Bony fingers
  ctx.strokeStyle = hexToRgba(bone); ctx.lineWidth = w * 0.012; ctx.lineCap = 'round';
  for (let f = 0; f < 4; f++) {
    const angle = -0.6 + f * 0.4;
    ctx.beginPath(); ctx.moveTo(lHand.x, lHand.y);
    ctx.lineTo(lHand.x + Math.cos(angle) * w * 0.05, lHand.y + Math.sin(angle) * h * 0.04);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rHand.x, rHand.y);
    ctx.lineTo(rHand.x - Math.cos(angle) * w * 0.05, rHand.y + Math.sin(angle) * h * 0.04);
    ctx.stroke();
  }

  // === RUSTY SWORD in right hand ===
  ctx.strokeStyle = hexToRgba(0x7A6A5A); ctx.lineWidth = w * 0.025; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(rHand.x, rHand.y); ctx.lineTo(rHand.x + w * 0.02, rHand.y - h * 0.2); ctx.stroke();
  ctx.fillStyle = hexToRgba(0x8B7355);
  ctx.fillRect(rHand.x - w * 0.03, rHand.y - h * 0.02, w * 0.06, h * 0.025);
  // Rust spots on blade
  ctx.fillStyle = hexToRgba(0x8B4513, 0.4);
  ellipse(ctx, rHand.x + w * 0.01, rHand.y - h * 0.1, w * 0.008, h * 0.006, 0x8B4513, 0.5);
  ellipse(ctx, rHand.x + w * 0.015, rHand.y - h * 0.06, w * 0.006, h * 0.005, 0x8B4513, 0.4);

  // === TATTERED CLOTH on shoulder ===
  ctx.fillStyle = hexToRgba(0x3a2a1a, 0.4);
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.22, cy - h * 0.14);
  ctx.bezierCurveTo(cx - w * 0.28, cy - h * 0.1, cx - w * 0.26, cy + h * 0.06, cx - w * 0.32, cy + h * 0.1);
  ctx.lineTo(cx - w * 0.3, cy + h * 0.12);
  ctx.bezierCurveTo(cx - w * 0.22, cy + h * 0.04, cx - w * 0.2, cy - h * 0.06, cx - w * 0.18, cy - h * 0.12);
  ctx.closePath(); ctx.fill();
  // Ragged edge at bottom
  ctx.strokeStyle = hexToRgba(0x3a2a1a, 0.3); ctx.lineWidth = 0.8;
  for (let i = 0; i < 4; i++) {
    const rx = cx - w * 0.32 + i * w * 0.04;
    ctx.beginPath();
    ctx.moveTo(rx, cy + h * 0.1);
    ctx.lineTo(rx + w * 0.01, cy + h * 0.14);
    ctx.stroke();
  }

  // === SKULL — proper skull shape with bezier cranium ===
  // Cranium (rounded top narrowing to jaw)
  const skullTop = cy - h * 0.46;
  const skullBot = cy - h * 0.18;
  const skullGrad = ctx.createLinearGradient(cx - w * 0.16, skullTop, cx + w * 0.16, skullBot);
  skullGrad.addColorStop(0, hexToRgba(lighten(bone, 1.08)));
  skullGrad.addColorStop(0.4, hexToRgba(bone));
  skullGrad.addColorStop(1, hexToRgba(boneMid));
  ctx.fillStyle = skullGrad;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.12, skullBot);
  ctx.bezierCurveTo(cx - w * 0.2, skullBot - h * 0.04, cx - w * 0.22, skullTop + h * 0.08, cx - w * 0.18, skullTop);
  ctx.bezierCurveTo(cx - w * 0.1, skullTop - h * 0.04, cx + w * 0.1, skullTop - h * 0.04, cx + w * 0.18, skullTop);
  ctx.bezierCurveTo(cx + w * 0.22, skullTop + h * 0.08, cx + w * 0.2, skullBot - h * 0.04, cx + w * 0.12, skullBot);
  ctx.closePath(); ctx.fill();
  // Skull outline
  ctx.strokeStyle = hexToRgba(boneShade); ctx.lineWidth = 1.2;
  ctx.stroke();
  // Cheekbone contour lines
  ctx.strokeStyle = hexToRgba(boneDark, 0.3); ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(cx - w * 0.15, cy - h * 0.28); ctx.quadraticCurveTo(cx - w * 0.18, cy - h * 0.24, cx - w * 0.14, cy - h * 0.2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + w * 0.15, cy - h * 0.28); ctx.quadraticCurveTo(cx + w * 0.18, cy - h * 0.24, cx + w * 0.14, cy - h * 0.2); ctx.stroke();
  // Temporal bone lines
  ctx.strokeStyle = hexToRgba(boneDark, 0.2); ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(cx - w * 0.17, cy - h * 0.34); ctx.quadraticCurveTo(cx - w * 0.19, cy - h * 0.3, cx - w * 0.16, cy - h * 0.26); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + w * 0.17, cy - h * 0.34); ctx.quadraticCurveTo(cx + w * 0.19, cy - h * 0.3, cx + w * 0.16, cy - h * 0.26); ctx.stroke();

  // Jaw (separate piece)
  ctx.fillStyle = hexToRgba(boneMid);
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.13, cy - h * 0.2);
  ctx.bezierCurveTo(cx - w * 0.15, cy - h * 0.16, cx - w * 0.12, cy - h * 0.12, cx - w * 0.06, cy - h * 0.11);
  ctx.lineTo(cx + w * 0.06, cy - h * 0.11);
  ctx.bezierCurveTo(cx + w * 0.12, cy - h * 0.12, cx + w * 0.15, cy - h * 0.16, cx + w * 0.13, cy - h * 0.2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hexToRgba(boneShade, 0.6); ctx.lineWidth = 0.8; ctx.stroke();

  // Individual teeth (upper)
  ctx.fillStyle = hexToRgba(lighten(bone, 1.05));
  for (let t = 0; t < 6; t++) {
    const tx = cx - w * 0.09 + t * w * 0.036;
    const th = h * (t === 0 || t === 5 ? 0.02 : 0.028);
    ctx.beginPath();
    ctx.moveTo(tx, cy - h * 0.2);
    ctx.lineTo(tx + w * 0.008, cy - h * 0.2 + th);
    ctx.lineTo(tx + w * 0.025, cy - h * 0.2);
    ctx.closePath(); ctx.fill();
  }
  // Lower teeth
  for (let t = 0; t < 5; t++) {
    const tx = cx - w * 0.07 + t * w * 0.035;
    ctx.beginPath();
    ctx.moveTo(tx, cy - h * 0.12);
    ctx.lineTo(tx + w * 0.008, cy - h * 0.12 - h * 0.02);
    ctx.lineTo(tx + w * 0.02, cy - h * 0.12);
    ctx.closePath(); ctx.fill();
  }

  // Angular eye sockets (trapezoid-shaped, not circles)
  const drawSocket = (sx) => {
    ctx.fillStyle = hexToRgba(0x080808);
    ctx.beginPath();
    ctx.moveTo(sx - w * 0.04, cy - h * 0.35);
    ctx.lineTo(sx - w * 0.06, cy - h * 0.3);
    ctx.lineTo(sx - w * 0.03, cy - h * 0.27);
    ctx.lineTo(sx + w * 0.03, cy - h * 0.27);
    ctx.lineTo(sx + w * 0.06, cy - h * 0.3);
    ctx.lineTo(sx + w * 0.04, cy - h * 0.35);
    ctx.closePath(); ctx.fill();
    // Red glow inside
    const eg = ctx.createRadialGradient(sx, cy - h * 0.31, 0, sx, cy - h * 0.31, w * 0.06);
    eg.addColorStop(0, 'rgba(255,40,40,0.95)');
    eg.addColorStop(0.4, 'rgba(200,20,0,0.5)');
    eg.addColorStop(1, 'rgba(120,0,0,0)');
    ctx.fillStyle = eg;
    ctx.beginPath(); ctx.arc(sx, cy - h * 0.31, w * 0.06, 0, Math.PI * 2); ctx.fill();
    // Bright center
    ellipse(ctx, sx, cy - h * 0.31, w * 0.015, h * 0.012, 0xFF6060, 0.9);
  };
  drawSocket(cx - w * 0.08);
  drawSocket(cx + w * 0.08);

  // Nasal cavity (inverted triangle)
  ctx.fillStyle = hexToRgba(0x1a1a1a);
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.03, cy - h * 0.26);
  ctx.lineTo(cx, cy - h * 0.21);
  ctx.lineTo(cx + w * 0.03, cy - h * 0.26);
  ctx.closePath(); ctx.fill();
  // Septum ridge
  ctx.strokeStyle = hexToRgba(boneDark, 0.4); ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(cx, cy - h * 0.26); ctx.lineTo(cx, cy - h * 0.215); ctx.stroke();

  // Skull cracks
  ctx.strokeStyle = hexToRgba(boneShade, 0.5); ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(cx + w * 0.04, cy - h * 0.44);
  ctx.lineTo(cx + w * 0.06, cy - h * 0.38);
  ctx.lineTo(cx + w * 0.04, cy - h * 0.35);
  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + w * 0.06, cy - h * 0.38);
  ctx.lineTo(cx + w * 0.1, cy - h * 0.36);
  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - w * 0.08, cy - h * 0.42);
  ctx.lineTo(cx - w * 0.1, cy - h * 0.38);
  ctx.stroke();

  if (boss) drawBossCrown(ctx, cx, cy, w, h, bone, frame);
}

/** GOBLIN — small hunched body, oversized head, pointy ears, fangs */
function drawGoblin(ctx, cx, cy, w, h, frame, boss) {
  const b = frame === 1 ? 2 : 0;
  const skin = boss ? 0x228B22 : 0x3CB371;
  const skinDark = darken(skin, 0.6), skinLight = lighten(skin, 1.15);

  // Shadow
  ellipse(ctx, cx, cy + h * 0.44, w * 0.3, h * 0.05, 0x000000, 0.22);

  // === SHORT BOWED LEGS with bezier curves ===
  const drawGobLeg = (xOff, dir) => {
    const lx = cx + xOff;
    const legGrad = ctx.createLinearGradient(lx, cy + h * 0.1, lx, cy + h * 0.38);
    legGrad.addColorStop(0, hexToRgba(skin));
    legGrad.addColorStop(1, hexToRgba(skinDark));
    ctx.fillStyle = legGrad;
    ctx.beginPath();
    ctx.moveTo(lx - w * 0.04, cy + h * 0.1);
    ctx.bezierCurveTo(lx - w * 0.07 * dir + b * dir, cy + h * 0.2, lx - w * 0.06 * dir + b * dir, cy + h * 0.32, lx - w * 0.05 * dir + b * dir, cy + h * 0.36);
    ctx.lineTo(lx + w * 0.04 * dir + b * dir, cy + h * 0.36);
    ctx.bezierCurveTo(lx + w * 0.02 * dir + b * dir, cy + h * 0.28, lx + w * 0.01 * dir, cy + h * 0.18, lx + w * 0.04, cy + h * 0.1);
    ctx.closePath(); ctx.fill();
    // Knobbly knee bump
    ellipse(ctx, lx - w * 0.02 * dir + b * dir * 0.5, cy + h * 0.24, w * 0.025, h * 0.02, skinDark, 0.4);
  };
  drawGobLeg(-w * 0.08, 1);
  drawGobLeg(w * 0.08, -1);

  // Oversized bare feet (wide, splayed)
  const drawFoot = (fx) => {
    ctx.fillStyle = hexToRgba(darken(skin, 0.75));
    ctx.beginPath();
    ctx.moveTo(fx - w * 0.02, cy + h * 0.36);
    ctx.bezierCurveTo(fx - w * 0.08, cy + h * 0.37, fx - w * 0.1, cy + h * 0.42, fx - w * 0.06, cy + h * 0.43);
    ctx.lineTo(fx + w * 0.06, cy + h * 0.43);
    ctx.bezierCurveTo(fx + w * 0.08, cy + h * 0.42, fx + w * 0.06, cy + h * 0.37, fx + w * 0.02, cy + h * 0.36);
    ctx.closePath(); ctx.fill();
    // Toes (3 bumps)
    for (let t = 0; t < 3; t++) {
      ellipse(ctx, fx - w * 0.04 + t * w * 0.04, cy + h * 0.43, w * 0.015, h * 0.01, darken(skin, 0.7));
    }
  };
  drawFoot(cx - w * 0.08 + b);
  drawFoot(cx + w * 0.08 - b);

  // === HUNCHED TORSO (bezier, bent forward) ===
  const bodyGrad = ctx.createRadialGradient(cx - w * 0.02, cy - h * 0.02, w * 0.04, cx, cy, w * 0.24);
  bodyGrad.addColorStop(0, hexToRgba(skinLight));
  bodyGrad.addColorStop(0.6, hexToRgba(skin));
  bodyGrad.addColorStop(1, hexToRgba(skinDark));
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.16, cy + h * 0.1);
  ctx.bezierCurveTo(cx - w * 0.22, cy + h * 0.02, cx - w * 0.2, cy - h * 0.08, cx - w * 0.12, cy - h * 0.1);
  ctx.bezierCurveTo(cx - w * 0.04, cy - h * 0.13, cx + w * 0.08, cy - h * 0.12, cx + w * 0.14, cy - h * 0.08);
  ctx.bezierCurveTo(cx + w * 0.2, cy - h * 0.02, cx + w * 0.18, cy + h * 0.06, cx + w * 0.12, cy + h * 0.1);
  ctx.closePath(); ctx.fill();

  // Pot belly detail
  ellipse(ctx, cx, cy + h * 0.02, w * 0.1, h * 0.06, skinLight, 0.25);

  // Tattered loincloth
  ctx.fillStyle = hexToRgba(0x5a3a1a, 0.75);
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.1, cy + h * 0.06);
  ctx.lineTo(cx - w * 0.12, cy + h * 0.18);
  ctx.lineTo(cx - w * 0.04, cy + h * 0.16);
  ctx.lineTo(cx, cy + h * 0.2);
  ctx.lineTo(cx + w * 0.04, cy + h * 0.16);
  ctx.lineTo(cx + w * 0.1, cy + h * 0.19);
  ctx.lineTo(cx + w * 0.1, cy + h * 0.06);
  ctx.closePath(); ctx.fill();
  // Loincloth rope
  ctx.strokeStyle = hexToRgba(0x8B7355, 0.8); ctx.lineWidth = w * 0.015;
  ctx.beginPath(); ctx.moveTo(cx - w * 0.12, cy + h * 0.06); ctx.lineTo(cx + w * 0.12, cy + h * 0.06); ctx.stroke();

  // === THIN WIRY ARMS (disproportionately long) ===
  const drawGobArm = (sx, sy, ex, ey, elbowX, elbowY) => {
    const armGrad = ctx.createLinearGradient(sx, sy, ex, ey);
    armGrad.addColorStop(0, hexToRgba(skin));
    armGrad.addColorStop(1, hexToRgba(skinDark));
    ctx.strokeStyle = armGrad; ctx.lineWidth = w * 0.04; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(elbowX, elbowY, ex, ey); ctx.stroke();
    // Knobbly elbow
    ellipse(ctx, elbowX, elbowY, w * 0.018, h * 0.015, skinDark, 0.5);
  };
  // Left arm
  drawGobArm(cx - w * 0.18, cy - h * 0.04, cx - w * 0.34, cy + h * 0.14, cx - w * 0.3, cy + h * 0.02);
  // Right arm (holding dagger, raised)
  drawGobArm(cx + w * 0.14, cy - h * 0.04, cx + w * 0.32, cy + h * 0.04, cx + w * 0.28, cy - h * 0.02);
  // Spindly fingers on left hand
  ctx.strokeStyle = hexToRgba(skinDark); ctx.lineWidth = w * 0.012;
  for (let f = 0; f < 4; f++) {
    ctx.beginPath(); ctx.moveTo(cx - w * 0.34, cy + h * 0.14);
    ctx.lineTo(cx - w * 0.36 - f * w * 0.01, cy + h * 0.18 + f * h * 0.005);
    ctx.stroke();
  }

  // Crude jagged dagger
  ctx.fillStyle = hexToRgba(0x808080);
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.32, cy + h * 0.02);
  ctx.lineTo(cx + w * 0.34, cy - h * 0.08);
  ctx.lineTo(cx + w * 0.36, cy - h * 0.06);
  ctx.lineTo(cx + w * 0.37, cy - h * 0.1);
  ctx.lineTo(cx + w * 0.35, cy - h * 0.04);
  ctx.lineTo(cx + w * 0.33, cy + h * 0.02);
  ctx.closePath(); ctx.fill();
  // Dagger handle
  ctx.fillStyle = hexToRgba(0x5a3a1a);
  ctx.fillRect(cx + w * 0.30, cy + h * 0.01, w * 0.05, h * 0.035);

  // === OVERSIZED HEAD (~40% of height) with bezier shape ===
  const headCy = cy - h * 0.28;
  const headGrad = ctx.createRadialGradient(cx - w * 0.02, headCy - h * 0.04, w * 0.04, cx, headCy, w * 0.24);
  headGrad.addColorStop(0, hexToRgba(skinLight));
  headGrad.addColorStop(0.5, hexToRgba(skin));
  headGrad.addColorStop(1, hexToRgba(darken(skin, 0.8)));
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  // Wide cranium narrowing to pointed chin
  ctx.moveTo(cx, headCy + h * 0.14); // chin point
  ctx.bezierCurveTo(cx - w * 0.08, headCy + h * 0.12, cx - w * 0.2, headCy + h * 0.06, cx - w * 0.24, headCy - h * 0.02);
  ctx.bezierCurveTo(cx - w * 0.25, headCy - h * 0.1, cx - w * 0.2, headCy - h * 0.18, cx - w * 0.1, headCy - h * 0.2);
  ctx.bezierCurveTo(cx - w * 0.02, headCy - h * 0.22, cx + w * 0.02, headCy - h * 0.22, cx + w * 0.1, headCy - h * 0.2);
  ctx.bezierCurveTo(cx + w * 0.2, headCy - h * 0.18, cx + w * 0.25, headCy - h * 0.1, cx + w * 0.24, headCy - h * 0.02);
  ctx.bezierCurveTo(cx + w * 0.2, headCy + h * 0.06, cx + w * 0.08, headCy + h * 0.12, cx, headCy + h * 0.14);
  ctx.closePath(); ctx.fill();
  // Head outline
  ctx.strokeStyle = hexToRgba(darken(skin, 0.4)); ctx.lineWidth = 1; ctx.stroke();

  // Wart bumps (scattered darker circles)
  const warts = [
    { x: cx - w * 0.12, y: headCy - h * 0.06, r: w * 0.015 },
    { x: cx + w * 0.14, y: headCy - h * 0.1, r: w * 0.012 },
    { x: cx + w * 0.06, y: headCy + h * 0.06, r: w * 0.01 },
    { x: cx - w * 0.16, y: headCy + h * 0.02, r: w * 0.013 },
    { x: cx - w * 0.02, y: cy - h * 0.04, r: w * 0.01 },
    { x: cx + w * 0.1, y: cy + h * 0.01, r: w * 0.009 },
  ];
  warts.forEach(wt => {
    ellipse(ctx, wt.x, wt.y, wt.r, wt.r, darken(skin, 0.55), 0.5);
    // Wart highlight
    ellipse(ctx, wt.x - wt.r * 0.3, wt.y - wt.r * 0.3, wt.r * 0.4, wt.r * 0.4, skinLight, 0.3);
  });

  // === LARGE POINTED EARS ===
  const drawEarGob = (dir) => {
    const earBase = cx + dir * w * 0.2;
    const earTip = cx + dir * w * 0.44;
    // Outer ear
    ctx.fillStyle = hexToRgba(skin);
    ctx.beginPath();
    ctx.moveTo(earBase, headCy - h * 0.08);
    ctx.bezierCurveTo(earBase + dir * w * 0.08, headCy - h * 0.16, earTip - dir * w * 0.04, headCy - h * 0.12, earTip, headCy - h * 0.06);
    ctx.bezierCurveTo(earTip - dir * w * 0.06, headCy - h * 0.02, earBase + dir * w * 0.06, headCy + h * 0.02, earBase, headCy + h * 0.02);
    ctx.closePath(); ctx.fill();
    // Inner ear (pink)
    ctx.fillStyle = hexToRgba(0xCC8888, 0.4);
    ctx.beginPath();
    ctx.moveTo(earBase + dir * w * 0.04, headCy - h * 0.06);
    ctx.bezierCurveTo(earBase + dir * w * 0.1, headCy - h * 0.12, earTip - dir * w * 0.08, headCy - h * 0.09, earTip - dir * w * 0.06, headCy - h * 0.05);
    ctx.bezierCurveTo(earTip - dir * w * 0.1, headCy - h * 0.01, earBase + dir * w * 0.06, headCy, earBase + dir * w * 0.04, headCy);
    ctx.closePath(); ctx.fill();
    // Ear vein lines
    ctx.strokeStyle = hexToRgba(skinDark, 0.3); ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(earBase + dir * w * 0.06, headCy - h * 0.04);
    ctx.lineTo(earBase + dir * w * 0.16, headCy - h * 0.08);
    ctx.stroke();
  };
  drawEarGob(-1);
  drawEarGob(1);

  // === BIG BULGING FROG-LIKE EYES ===
  const drawGobEye = (ex) => {
    // Bulge
    ellipse(ctx, ex, headCy - h * 0.04, w * 0.08, h * 0.065, 0xCCCC00);
    // Iris
    const irisGrad = ctx.createRadialGradient(ex, headCy - h * 0.04, 0, ex, headCy - h * 0.04, w * 0.06);
    irisGrad.addColorStop(0, hexToRgba(0xFFFF00));
    irisGrad.addColorStop(0.6, hexToRgba(0xCCBB00));
    irisGrad.addColorStop(1, hexToRgba(0x888800));
    ctx.fillStyle = irisGrad;
    ctx.beginPath(); ctx.ellipse(ex, headCy - h * 0.04, w * 0.065, h * 0.055, 0, 0, Math.PI * 2); ctx.fill();
    // Vertical slit pupil
    ctx.fillStyle = hexToRgba(0x0a0a00);
    ctx.beginPath();
    ctx.ellipse(ex, headCy - h * 0.04, w * 0.012, h * 0.045, 0, 0, Math.PI * 2);
    ctx.fill();
    // Specular highlight
    ellipse(ctx, ex - w * 0.02, headCy - h * 0.06, w * 0.015, h * 0.012, 0xFFFFFF, 0.6);
    // Bloodshot veins
    ctx.strokeStyle = hexToRgba(0x880000, 0.3); ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.moveTo(ex + w * 0.05, headCy - h * 0.04); ctx.lineTo(ex + w * 0.03, headCy - h * 0.05); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex - w * 0.05, headCy - h * 0.03); ctx.lineTo(ex - w * 0.03, headCy - h * 0.05); ctx.stroke();
  };
  drawGobEye(cx - w * 0.1);
  drawGobEye(cx + w * 0.1);

  // Flat upturned nose
  ctx.fillStyle = hexToRgba(darken(skin, 0.7));
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.03, headCy + h * 0.02);
  ctx.quadraticCurveTo(cx, headCy + h * 0.05, cx + w * 0.03, headCy + h * 0.02);
  ctx.lineTo(cx + w * 0.02, headCy + h * 0.01);
  ctx.lineTo(cx - w * 0.02, headCy + h * 0.01);
  ctx.closePath(); ctx.fill();
  // Nostrils
  ellipse(ctx, cx - w * 0.015, headCy + h * 0.025, w * 0.01, h * 0.007, 0x1a1a0a);
  ellipse(ctx, cx + w * 0.015, headCy + h * 0.025, w * 0.01, h * 0.007, 0x1a1a0a);

  // === WIDE MOUTH with jagged teeth ===
  // Mouth opening (dark)
  ctx.fillStyle = hexToRgba(0x2a0a0a);
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.12, headCy + h * 0.07);
  ctx.quadraticCurveTo(cx, headCy + h * 0.12, cx + w * 0.12, headCy + h * 0.07);
  ctx.quadraticCurveTo(cx, headCy + h * 0.09, cx - w * 0.12, headCy + h * 0.07);
  ctx.closePath(); ctx.fill();
  // Jagged upper teeth
  ctx.fillStyle = hexToRgba(0xE8E0B0);
  for (let t = 0; t < 6; t++) {
    const tx = cx - w * 0.1 + t * w * 0.04;
    const th = h * (t % 2 === 0 ? 0.025 : 0.018);
    ctx.beginPath();
    ctx.moveTo(tx, headCy + h * 0.07);
    ctx.lineTo(tx + w * 0.01, headCy + h * 0.07 + th);
    ctx.lineTo(tx + w * 0.025, headCy + h * 0.07);
    ctx.closePath(); ctx.fill();
  }
  // Lower fangs (two prominent)
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.08, headCy + h * 0.1);
  ctx.lineTo(cx - w * 0.07, headCy + h * 0.07);
  ctx.lineTo(cx - w * 0.06, headCy + h * 0.1);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.06, headCy + h * 0.1);
  ctx.lineTo(cx + w * 0.07, headCy + h * 0.07);
  ctx.lineTo(cx + w * 0.08, headCy + h * 0.1);
  ctx.closePath(); ctx.fill();
  // Drool from mouth
  ctx.strokeStyle = hexToRgba(0x80CC80, 0.4); ctx.lineWidth = w * 0.008;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.04, headCy + h * 0.1);
  ctx.bezierCurveTo(cx - w * 0.05, headCy + h * 0.13, cx - w * 0.03, headCy + h * 0.15, cx - w * 0.04, headCy + h * 0.17 + b);
  ctx.stroke();

  // Brow wrinkles
  ctx.strokeStyle = hexToRgba(skinDark, 0.4); ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(cx - w * 0.14, headCy - h * 0.1); ctx.quadraticCurveTo(cx - w * 0.08, headCy - h * 0.12, cx - w * 0.04, headCy - h * 0.1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + w * 0.04, headCy - h * 0.1); ctx.quadraticCurveTo(cx + w * 0.08, headCy - h * 0.12, cx + w * 0.14, headCy - h * 0.1); ctx.stroke();

  if (boss) drawBossCrown(ctx, cx, cy, w, h, skin, frame);
}

/** ORC — massive muscular build, tusks, war paint, armor */
function drawOrc(ctx, cx, cy, w, h, frame, boss) {
  const b = frame === 1 ? 2 : 0;
  const skin = boss ? 0x4A6A0A : 0x556B2F;
  const skinDark = darken(skin, 0.6), skinLight = lighten(skin, 1.15);

  // Shadow
  ellipse(ctx, cx, cy + h * 0.44, w * 0.38, h * 0.06, 0x000000, 0.28);

  // === THICK MUSCULAR LEGS ===
  const drawOrcLeg = (lx, dir) => {
    // Thigh (thick, muscular)
    const legGrad = ctx.createLinearGradient(lx - w * 0.06, cy + h * 0.1, lx + w * 0.06, cy + h * 0.1);
    legGrad.addColorStop(0, hexToRgba(skinDark));
    legGrad.addColorStop(0.3, hexToRgba(skinLight));
    legGrad.addColorStop(0.7, hexToRgba(skin));
    legGrad.addColorStop(1, hexToRgba(skinDark));
    ctx.fillStyle = legGrad;
    ctx.beginPath();
    ctx.moveTo(lx - w * 0.08, cy + h * 0.1);
    ctx.bezierCurveTo(lx - w * 0.1, cy + h * 0.18, lx - w * 0.07, cy + h * 0.26, lx - w * 0.06, cy + h * 0.32);
    ctx.lineTo(lx + w * 0.06, cy + h * 0.32);
    ctx.bezierCurveTo(lx + w * 0.07, cy + h * 0.26, lx + w * 0.1, cy + h * 0.18, lx + w * 0.08, cy + h * 0.1);
    ctx.closePath(); ctx.fill();
    // Quad muscle definition
    ctx.strokeStyle = hexToRgba(skinDark, 0.25); ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(lx, cy + h * 0.12); ctx.quadraticCurveTo(lx + w * 0.02, cy + h * 0.2, lx, cy + h * 0.28); ctx.stroke();
  };
  drawOrcLeg(cx - w * 0.1 + b, 1);
  drawOrcLeg(cx + w * 0.1 - b, -1);

  // Fur-lined boots
  const drawBoot = (bx) => {
    ctx.fillStyle = hexToRgba(0x3a2a1a);
    ctx.beginPath();
    ctx.moveTo(bx - w * 0.08, cy + h * 0.3);
    ctx.bezierCurveTo(bx - w * 0.1, cy + h * 0.34, bx - w * 0.1, cy + h * 0.4, bx - w * 0.08, cy + h * 0.42);
    ctx.lineTo(bx + w * 0.08, cy + h * 0.42);
    ctx.bezierCurveTo(bx + w * 0.1, cy + h * 0.4, bx + w * 0.1, cy + h * 0.34, bx + w * 0.08, cy + h * 0.3);
    ctx.closePath(); ctx.fill();
    // Fur trim at top of boot
    ctx.fillStyle = hexToRgba(0x8B7355, 0.7);
    for (let i = 0; i < 6; i++) {
      const fx = bx - w * 0.07 + i * w * 0.028;
      ctx.beginPath();
      ctx.moveTo(fx, cy + h * 0.3);
      ctx.lineTo(fx + w * 0.008, cy + h * 0.28);
      ctx.lineTo(fx + w * 0.016, cy + h * 0.3);
      ctx.closePath(); ctx.fill();
    }
    // Boot straps
    ctx.strokeStyle = hexToRgba(0x2a1a0a); ctx.lineWidth = w * 0.012;
    ctx.beginPath(); ctx.moveTo(bx - w * 0.07, cy + h * 0.35); ctx.lineTo(bx + w * 0.07, cy + h * 0.35); ctx.stroke();
  };
  drawBoot(cx - w * 0.1 + b);
  drawBoot(cx + w * 0.1 - b);

  // === MASSIVE V-SHAPED TORSO ===
  // Base torso shape
  const torsoGrad = ctx.createRadialGradient(cx, cy - h * 0.04, w * 0.06, cx, cy, w * 0.35);
  torsoGrad.addColorStop(0, hexToRgba(skinLight));
  torsoGrad.addColorStop(0.5, hexToRgba(skin));
  torsoGrad.addColorStop(1, hexToRgba(skinDark));
  ctx.fillStyle = torsoGrad;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.3, cy - h * 0.14);
  ctx.bezierCurveTo(cx - w * 0.32, cy - h * 0.04, cx - w * 0.22, cy + h * 0.1, cx - w * 0.14, cy + h * 0.12);
  ctx.lineTo(cx + w * 0.14, cy + h * 0.12);
  ctx.bezierCurveTo(cx + w * 0.22, cy + h * 0.1, cx + w * 0.32, cy - h * 0.04, cx + w * 0.3, cy - h * 0.14);
  ctx.closePath(); ctx.fill();

  // Pectoral muscles
  ellipse(ctx, cx - w * 0.1, cy - h * 0.06, w * 0.1, h * 0.055, skinLight, 0.3);
  ellipse(ctx, cx + w * 0.1, cy - h * 0.06, w * 0.1, h * 0.055, skinLight, 0.3);
  // Pec shadow lines
  ctx.strokeStyle = hexToRgba(skinDark, 0.35); ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.arc(cx - w * 0.1, cy - h * 0.04, w * 0.08, 0.3, Math.PI - 0.3); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx + w * 0.1, cy - h * 0.04, w * 0.08, 0.3, Math.PI - 0.3); ctx.stroke();
  // Abdominal muscles (6 segments)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      const ax = cx + (col === 0 ? -w * 0.04 : w * 0.04);
      const ay = cy + h * 0.01 + row * h * 0.035;
      ctx.strokeStyle = hexToRgba(skinDark, 0.2); ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.roundRect(ax - w * 0.03, ay - h * 0.012, w * 0.06, h * 0.024, 2);
      ctx.stroke();
    }
  }

  // === LEATHER CHEST STRAPS (X-cross) ===
  ctx.strokeStyle = hexToRgba(0x5a3a1a, 0.7); ctx.lineWidth = w * 0.03;
  ctx.beginPath(); ctx.moveTo(cx - w * 0.22, cy - h * 0.12); ctx.lineTo(cx + w * 0.1, cy + h * 0.08); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + w * 0.22, cy - h * 0.12); ctx.lineTo(cx - w * 0.1, cy + h * 0.08); ctx.stroke();
  // Metal belt with skull buckle
  ctx.fillStyle = hexToRgba(0x4a4a4a);
  ctx.fillRect(cx - w * 0.16, cy + h * 0.08, w * 0.32, h * 0.03);
  // Skull buckle
  ellipse(ctx, cx, cy + h * 0.095, w * 0.025, h * 0.018, 0xCCCCCC);
  ellipse(ctx, cx - w * 0.008, cy + h * 0.092, w * 0.005, h * 0.005, 0x1a1a1a);
  ellipse(ctx, cx + w * 0.008, cy + h * 0.092, w * 0.005, h * 0.005, 0x1a1a1a);

  // === SHOULDER PAULDRONS with spikes ===
  const drawPauldron = (px, dir) => {
    // Metal plate
    const pGrad = ctx.createLinearGradient(px - w * 0.06, cy - h * 0.16, px + w * 0.06, cy - h * 0.06);
    pGrad.addColorStop(0, hexToRgba(0x6a6a6a));
    pGrad.addColorStop(0.4, hexToRgba(0x8a8a8a));
    pGrad.addColorStop(1, hexToRgba(0x4a4a4a));
    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.moveTo(px - w * 0.07, cy - h * 0.06);
    ctx.bezierCurveTo(px - w * 0.09, cy - h * 0.1, px - w * 0.08, cy - h * 0.16, px, cy - h * 0.17);
    ctx.bezierCurveTo(px + w * 0.08, cy - h * 0.16, px + w * 0.09, cy - h * 0.1, px + w * 0.07, cy - h * 0.06);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = hexToRgba(0x3a3a3a); ctx.lineWidth = 1; ctx.stroke();
    // Spikes
    for (let s = 0; s < 3; s++) {
      const sx = px - w * 0.04 + s * w * 0.04;
      const sBase = cy - h * 0.15;
      ctx.fillStyle = hexToRgba(0x707070);
      ctx.beginPath();
      ctx.moveTo(sx - w * 0.012, sBase);
      ctx.lineTo(sx, sBase - h * 0.06);
      ctx.lineTo(sx + w * 0.012, sBase);
      ctx.closePath(); ctx.fill();
      // Spike highlight
      ctx.strokeStyle = hexToRgba(0xA0A0A0, 0.5); ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(sx - w * 0.005, sBase); ctx.lineTo(sx, sBase - h * 0.05); ctx.stroke();
    }
    // Rivets
    ellipse(ctx, px - w * 0.04, cy - h * 0.08, w * 0.01, h * 0.008, 0x808080);
    ellipse(ctx, px + w * 0.04, cy - h * 0.08, w * 0.01, h * 0.008, 0x808080);
  };
  drawPauldron(cx - w * 0.3, -1);
  drawPauldron(cx + w * 0.3, 1);

  // === THICK MUSCULAR ARMS ===
  const drawOrcArm = (sx, sy, elbowX, elbowY, handX, handY) => {
    // Upper arm (bicep)
    const armGrad = ctx.createLinearGradient(sx - w * 0.06, sy, sx + w * 0.06, sy);
    armGrad.addColorStop(0, hexToRgba(skinDark));
    armGrad.addColorStop(0.35, hexToRgba(skinLight));
    armGrad.addColorStop(1, hexToRgba(skinDark));
    ctx.strokeStyle = armGrad; ctx.lineWidth = w * 0.1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo((sx + elbowX) / 2 + w * 0.02, (sy + elbowY) / 2, elbowX, elbowY); ctx.stroke();
    // Forearm
    ctx.lineWidth = w * 0.08;
    ctx.beginPath(); ctx.moveTo(elbowX, elbowY); ctx.lineTo(handX, handY); ctx.stroke();
    // Bicep bulge
    const midX = (sx + elbowX) / 2, midY = (sy + elbowY) / 2;
    ellipse(ctx, midX, midY, w * 0.04, h * 0.025, skinLight, 0.25);
    // Forearm bracer
    const bx = (elbowX + handX) / 2, by = (elbowY + handY) / 2;
    ctx.fillStyle = hexToRgba(0x5a3a1a, 0.7);
    ctx.beginPath();
    ctx.arc(bx, by, w * 0.05, 0, Math.PI * 2);
    ctx.fill();
  };
  drawOrcArm(cx - w * 0.28, cy - h * 0.08, cx - w * 0.34, cy + h * 0.06, cx - w * 0.32, cy + h * 0.16);
  drawOrcArm(cx + w * 0.28, cy - h * 0.08, cx + w * 0.34, cy + h * 0.06, cx + w * 0.32, cy + h * 0.16);
  // Fists
  ellipse(ctx, cx - w * 0.32, cy + h * 0.18, w * 0.06, h * 0.04, darken(skin, 0.75));
  ellipse(ctx, cx + w * 0.32, cy + h * 0.18, w * 0.06, h * 0.04, darken(skin, 0.75));

  // === LARGE DOUBLE-HEADED BATTLE AXE ===
  // Shaft
  ctx.strokeStyle = hexToRgba(0x5a3a1a); ctx.lineWidth = w * 0.03; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx + w * 0.33, cy + h * 0.16); ctx.lineTo(cx + w * 0.35, cy - h * 0.22); ctx.stroke();
  // Left axe head
  ctx.fillStyle = hexToRgba(0x808080);
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.3, cy - h * 0.16);
  ctx.bezierCurveTo(cx + w * 0.22, cy - h * 0.24, cx + w * 0.22, cy - h * 0.1, cx + w * 0.3, cy - h * 0.06);
  ctx.closePath(); ctx.fill();
  // Right axe head
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.4, cy - h * 0.16);
  ctx.bezierCurveTo(cx + w * 0.48, cy - h * 0.24, cx + w * 0.48, cy - h * 0.1, cx + w * 0.4, cy - h * 0.06);
  ctx.closePath(); ctx.fill();
  // Axe edge highlight
  ctx.strokeStyle = hexToRgba(0xB0B0B0, 0.6); ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(cx + w * 0.22, cy - h * 0.17); ctx.bezierCurveTo(cx + w * 0.2, cy - h * 0.12, cx + w * 0.22, cy - h * 0.08, cx + w * 0.28, cy - h * 0.06); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + w * 0.48, cy - h * 0.17); ctx.bezierCurveTo(cx + w * 0.5, cy - h * 0.12, cx + w * 0.48, cy - h * 0.08, cx + w * 0.42, cy - h * 0.06); ctx.stroke();

  // === THICK NECK ===
  ctx.fillStyle = hexToRgba(skin);
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.1, cy - h * 0.14);
  ctx.bezierCurveTo(cx - w * 0.12, cy - h * 0.18, cx - w * 0.1, cy - h * 0.22, cx - w * 0.08, cy - h * 0.24);
  ctx.lineTo(cx + w * 0.08, cy - h * 0.24);
  ctx.bezierCurveTo(cx + w * 0.1, cy - h * 0.22, cx + w * 0.12, cy - h * 0.18, cx + w * 0.1, cy - h * 0.14);
  ctx.closePath(); ctx.fill();
  // Neck tendons
  ctx.strokeStyle = hexToRgba(skinDark, 0.3); ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(cx - w * 0.04, cy - h * 0.15); ctx.lineTo(cx - w * 0.06, cy - h * 0.23); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + w * 0.04, cy - h * 0.15); ctx.lineTo(cx + w * 0.06, cy - h * 0.23); ctx.stroke();

  // === HEAD with wide square jaw ===
  const headGrad = ctx.createRadialGradient(cx, cy - h * 0.34, w * 0.04, cx, cy - h * 0.32, w * 0.22);
  headGrad.addColorStop(0, hexToRgba(skinLight));
  headGrad.addColorStop(0.6, hexToRgba(skin));
  headGrad.addColorStop(1, hexToRgba(skinDark));
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.14, cy - h * 0.22);
  ctx.bezierCurveTo(cx - w * 0.18, cy - h * 0.24, cx - w * 0.2, cy - h * 0.3, cx - w * 0.18, cy - h * 0.38);
  ctx.bezierCurveTo(cx - w * 0.16, cy - h * 0.44, cx - w * 0.06, cy - h * 0.46, cx, cy - h * 0.46);
  ctx.bezierCurveTo(cx + w * 0.06, cy - h * 0.46, cx + w * 0.16, cy - h * 0.44, cx + w * 0.18, cy - h * 0.38);
  ctx.bezierCurveTo(cx + w * 0.2, cy - h * 0.3, cx + w * 0.18, cy - h * 0.24, cx + w * 0.14, cy - h * 0.22);
  ctx.closePath(); ctx.fill();

  // Heavy brow ridge (casting shadow)
  ctx.fillStyle = hexToRgba(darken(skin, 0.65));
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.18, cy - h * 0.36);
  ctx.bezierCurveTo(cx - w * 0.16, cy - h * 0.39, cx - w * 0.06, cy - h * 0.4, cx, cy - h * 0.39);
  ctx.bezierCurveTo(cx + w * 0.06, cy - h * 0.4, cx + w * 0.16, cy - h * 0.39, cx + w * 0.18, cy - h * 0.36);
  ctx.lineTo(cx + w * 0.16, cy - h * 0.34);
  ctx.bezierCurveTo(cx + w * 0.1, cy - h * 0.35, cx - w * 0.1, cy - h * 0.35, cx - w * 0.16, cy - h * 0.34);
  ctx.closePath(); ctx.fill();
  // Brow shadow underneath
  ctx.fillStyle = hexToRgba(0x000000, 0.2);
  ctx.fillRect(cx - w * 0.15, cy - h * 0.35, w * 0.3, h * 0.02);

  // Eyes (deep-set, glowing under brow)
  ellipse(ctx, cx - w * 0.07, cy - h * 0.33, w * 0.035, h * 0.022, 0xCC0000, 0.8);
  ellipse(ctx, cx + w * 0.07, cy - h * 0.33, w * 0.035, h * 0.022, 0xCC0000, 0.8);
  ellipse(ctx, cx - w * 0.07, cy - h * 0.33, w * 0.015, h * 0.015, 0xFF4400);
  ellipse(ctx, cx + w * 0.07, cy - h * 0.33, w * 0.015, h * 0.015, 0xFF4400);

  // Flat broad nose
  ctx.fillStyle = hexToRgba(darken(skin, 0.7));
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.04, cy - h * 0.3);
  ctx.bezierCurveTo(cx - w * 0.06, cy - h * 0.27, cx - w * 0.05, cy - h * 0.24, cx - w * 0.03, cy - h * 0.24);
  ctx.lineTo(cx + w * 0.03, cy - h * 0.24);
  ctx.bezierCurveTo(cx + w * 0.05, cy - h * 0.24, cx + w * 0.06, cy - h * 0.27, cx + w * 0.04, cy - h * 0.3);
  ctx.closePath(); ctx.fill();
  ellipse(ctx, cx - w * 0.02, cy - h * 0.245, w * 0.01, h * 0.006, 0x1a1a0a);
  ellipse(ctx, cx + w * 0.02, cy - h * 0.245, w * 0.01, h * 0.006, 0x1a1a0a);

  // Prominent tusks curving upward
  ctx.fillStyle = hexToRgba(0xFFF8DC);
  const drawTusk = (tx, dir) => {
    ctx.beginPath();
    ctx.moveTo(tx - w * 0.015 * dir, cy - h * 0.22);
    ctx.bezierCurveTo(tx - w * 0.01 * dir, cy - h * 0.26, tx + w * 0.005 * dir, cy - h * 0.3, tx + w * 0.02 * dir, cy - h * 0.31);
    ctx.lineTo(tx + w * 0.01 * dir, cy - h * 0.3);
    ctx.bezierCurveTo(tx, cy - h * 0.26, tx + w * 0.005 * dir, cy - h * 0.24, tx + w * 0.01 * dir, cy - h * 0.22);
    ctx.closePath(); ctx.fill();
  };
  drawTusk(cx - w * 0.08, -1);
  drawTusk(cx + w * 0.08, 1);

  // === WAR PAINT (red diagonal streaks) ===
  ctx.strokeStyle = hexToRgba(0x8B0000, 0.6); ctx.lineWidth = w * 0.018; ctx.lineCap = 'round';
  // Face paint
  ctx.beginPath(); ctx.moveTo(cx - w * 0.15, cy - h * 0.38); ctx.lineTo(cx - w * 0.12, cy - h * 0.26); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - w * 0.12, cy - h * 0.38); ctx.lineTo(cx - w * 0.09, cy - h * 0.28); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + w * 0.12, cy - h * 0.38); ctx.lineTo(cx + w * 0.15, cy - h * 0.26); ctx.stroke();
  // Chest paint
  ctx.strokeStyle = hexToRgba(0x8B0000, 0.4); ctx.lineWidth = w * 0.015;
  ctx.beginPath(); ctx.moveTo(cx - w * 0.16, cy - h * 0.08); ctx.lineTo(cx - w * 0.08, cy + h * 0.04); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + w * 0.08, cy - h * 0.1); ctx.lineTo(cx + w * 0.16, cy + h * 0.02); ctx.stroke();

  // === SCARS ===
  ctx.strokeStyle = hexToRgba(0x8B4040, 0.5); ctx.lineWidth = 1.2;
  // Face scar
  ctx.beginPath(); ctx.moveTo(cx + w * 0.02, cy - h * 0.38); ctx.lineTo(cx + w * 0.06, cy - h * 0.26); ctx.stroke();
  // Chest scar
  ctx.beginPath(); ctx.moveTo(cx - w * 0.15, cy - h * 0.02); ctx.lineTo(cx + w * 0.05, cy + h * 0.04); ctx.stroke();
  // Scar stitch marks
  ctx.lineWidth = 0.6;
  for (let s = 0; s < 4; s++) {
    const sx = cx - w * 0.12 + s * w * 0.05;
    const sy2 = cy - h * 0.015 + s * h * 0.015;
    ctx.beginPath(); ctx.moveTo(sx - w * 0.01, sy2 - h * 0.01); ctx.lineTo(sx + w * 0.01, sy2 + h * 0.01); ctx.stroke();
  }

  if (boss) drawBossCrown(ctx, cx, cy, w, h, skin, frame);
}

/** WOLF — proper canine anatomy with fur texture */
function drawWolf(ctx, cx, cy, w, h, frame, boss) {
  const b = frame === 1 ? 2 : 0;
  const fur = boss ? 0x404040 : 0x606060;
  const furDark = darken(fur, 0.5), furLight = lighten(fur, 1.2), furBelly = lighten(fur, 1.45);
  const runOff = frame === 1 ? w * 0.02 : 0;

  // Shadow
  ellipse(ctx, cx, cy + h * 0.42, w * 0.42, h * 0.06, 0x000000, 0.22);

  // === BUSHY TAIL (multiple fur strokes) ===
  const tailBase = { x: cx + w * 0.28, y: cy - h * 0.04 + b };
  const tailTip = { x: cx + w * 0.42, y: cy - h * 0.22 + b };
  // Tail body (thick bezier)
  ctx.fillStyle = hexToRgba(fur);
  ctx.beginPath();
  ctx.moveTo(tailBase.x, tailBase.y - h * 0.04);
  ctx.bezierCurveTo(tailBase.x + w * 0.12, tailBase.y - h * 0.16, tailTip.x + w * 0.06, tailTip.y - h * 0.06, tailTip.x, tailTip.y);
  ctx.bezierCurveTo(tailTip.x - w * 0.04, tailTip.y + h * 0.02, tailBase.x + w * 0.08, tailBase.y - h * 0.04, tailBase.x, tailBase.y + h * 0.02);
  ctx.closePath(); ctx.fill();
  // Tail lighter tip
  ctx.fillStyle = hexToRgba(furLight, 0.5);
  ctx.beginPath();
  ctx.moveTo(tailTip.x - w * 0.04, tailTip.y + h * 0.02);
  ctx.bezierCurveTo(tailTip.x - w * 0.02, tailTip.y - h * 0.02, tailTip.x + w * 0.02, tailTip.y - h * 0.04, tailTip.x, tailTip.y);
  ctx.closePath(); ctx.fill();
  // Tail fur strokes
  ctx.strokeStyle = hexToRgba(furLight, 0.4); ctx.lineWidth = 0.8;
  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    const tx = tailBase.x + (tailTip.x - tailBase.x) * t;
    const ty = tailBase.y + (tailTip.y - tailBase.y) * t - h * 0.02;
    const angle = -0.6 - t * 0.4;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + Math.cos(angle) * w * 0.03, ty + Math.sin(angle) * h * 0.03); ctx.stroke();
  }

  // === LEGS with proper canine anatomy ===
  const drawFrontLeg = (lx, offset) => {
    const legGrad = ctx.createLinearGradient(lx, cy + h * 0.06, lx, cy + h * 0.36);
    legGrad.addColorStop(0, hexToRgba(fur));
    legGrad.addColorStop(1, hexToRgba(furDark));
    ctx.fillStyle = legGrad;
    ctx.beginPath();
    ctx.moveTo(lx - w * 0.03, cy + h * 0.06);
    ctx.bezierCurveTo(lx - w * 0.04, cy + h * 0.14, lx - w * 0.035 + offset, cy + h * 0.24, lx - w * 0.03 + offset, cy + h * 0.34);
    ctx.lineTo(lx + w * 0.03 + offset, cy + h * 0.34);
    ctx.bezierCurveTo(lx + w * 0.035 + offset, cy + h * 0.24, lx + w * 0.04, cy + h * 0.14, lx + w * 0.03, cy + h * 0.06);
    ctx.closePath(); ctx.fill();
    // Paw
    ctx.fillStyle = hexToRgba(furDark);
    ctx.beginPath();
    ctx.ellipse(lx + offset, cy + h * 0.36, w * 0.04, h * 0.022, 0, 0, Math.PI * 2);
    ctx.fill();
    // Toe pads
    for (let t = 0; t < 3; t++) {
      ellipse(ctx, lx + offset - w * 0.02 + t * w * 0.02, cy + h * 0.375, w * 0.008, h * 0.006, darken(furDark, 0.6));
    }
  };
  const drawBackLeg = (lx, offset) => {
    // Thigh (thick)
    ctx.fillStyle = hexToRgba(fur);
    ctx.beginPath();
    ctx.moveTo(lx - w * 0.05, cy + h * 0.02);
    ctx.bezierCurveTo(lx - w * 0.06, cy + h * 0.08, lx - w * 0.04, cy + h * 0.14, lx + w * 0.02 + offset, cy + h * 0.2);
    ctx.lineTo(lx + w * 0.06 + offset, cy + h * 0.18);
    ctx.bezierCurveTo(lx + w * 0.06, cy + h * 0.12, lx + w * 0.05, cy + h * 0.06, lx + w * 0.04, cy + h * 0.02);
    ctx.closePath(); ctx.fill();
    // Hock joint (backward bend)
    const hockX = lx + w * 0.03 + offset, hockY = cy + h * 0.22;
    // Lower leg (thin)
    ctx.fillStyle = hexToRgba(furDark);
    ctx.beginPath();
    ctx.moveTo(hockX - w * 0.02, hockY);
    ctx.bezierCurveTo(hockX - w * 0.035, hockY + h * 0.06, hockX - w * 0.025, hockY + h * 0.1, hockX - w * 0.02, hockY + h * 0.14);
    ctx.lineTo(hockX + w * 0.02, hockY + h * 0.14);
    ctx.bezierCurveTo(hockX + w * 0.025, hockY + h * 0.1, hockX + w * 0.02, hockY + h * 0.06, hockX + w * 0.02, hockY);
    ctx.closePath(); ctx.fill();
    // Paw
    ctx.fillStyle = hexToRgba(furDark);
    ctx.beginPath();
    ctx.ellipse(hockX, cy + h * 0.37, w * 0.04, h * 0.022, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let t = 0; t < 3; t++) {
      ellipse(ctx, hockX - w * 0.02 + t * w * 0.02, cy + h * 0.385, w * 0.008, h * 0.006, darken(furDark, 0.6));
    }
  };
  drawFrontLeg(cx - w * 0.2, runOff);
  drawFrontLeg(cx - w * 0.08, -runOff);
  drawBackLeg(cx + w * 0.12, runOff);
  drawBackLeg(cx + w * 0.24, -runOff);

  // === BODY (bezier profile: arched back, deep chest, tucked belly) ===
  const bodyGrad = ctx.createRadialGradient(cx, cy - h * 0.04 + b, w * 0.06, cx, cy + b, w * 0.4);
  bodyGrad.addColorStop(0, hexToRgba(furLight));
  bodyGrad.addColorStop(0.5, hexToRgba(fur));
  bodyGrad.addColorStop(1, hexToRgba(furDark));
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  // Start at chest
  ctx.moveTo(cx - w * 0.24, cy + h * 0.08 + b);
  // Belly (tucked up toward rear)
  ctx.bezierCurveTo(cx - w * 0.1, cy + h * 0.12, cx + w * 0.1, cy + h * 0.06, cx + w * 0.3, cy + h * 0.04 + b);
  // Rump
  ctx.bezierCurveTo(cx + w * 0.35, cy + b, cx + w * 0.32, cy - h * 0.06, cx + w * 0.26, cy - h * 0.1 + b);
  // Arched back
  ctx.bezierCurveTo(cx + w * 0.12, cy - h * 0.16, cx - w * 0.06, cy - h * 0.18, cx - w * 0.2, cy - h * 0.14 + b);
  // Deep chest
  ctx.bezierCurveTo(cx - w * 0.28, cy - h * 0.1, cx - w * 0.3, cy, cx - w * 0.24, cy + h * 0.08 + b);
  ctx.closePath(); ctx.fill();

  // Lighter belly underside
  ctx.fillStyle = hexToRgba(furBelly, 0.35);
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.22, cy + h * 0.06 + b);
  ctx.bezierCurveTo(cx - w * 0.1, cy + h * 0.1, cx + w * 0.08, cy + h * 0.06, cx + w * 0.22, cy + h * 0.03 + b);
  ctx.bezierCurveTo(cx + w * 0.08, cy + h * 0.02, cx - w * 0.1, cy + h * 0.04, cx - w * 0.22, cy + h * 0.02 + b);
  ctx.closePath(); ctx.fill();

  // Darker back ridge
  ctx.fillStyle = hexToRgba(furDark, 0.4);
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.18, cy - h * 0.14 + b);
  ctx.bezierCurveTo(cx - w * 0.04, cy - h * 0.18, cx + w * 0.14, cy - h * 0.16, cx + w * 0.26, cy - h * 0.1 + b);
  ctx.bezierCurveTo(cx + w * 0.14, cy - h * 0.12, cx - w * 0.04, cy - h * 0.14, cx - w * 0.18, cy - h * 0.1 + b);
  ctx.closePath(); ctx.fill();

  // === FUR TEXTURE (many short angled strokes) ===
  ctx.lineCap = 'round';
  // Back fur (darker, upward)
  ctx.strokeStyle = hexToRgba(furDark, 0.5); ctx.lineWidth = 0.8;
  for (let i = 0; i < 14; i++) {
    const fx = cx - w * 0.18 + i * w * 0.035;
    const fy = cy - h * 0.12 + Math.sin(i * 0.7) * h * 0.03 + b;
    const angle = -1.2 + Math.sin(i * 0.5) * 0.3;
    ctx.beginPath(); ctx.moveTo(fx, fy);
    ctx.lineTo(fx + Math.cos(angle) * w * 0.025, fy + Math.sin(angle) * h * 0.035);
    ctx.stroke();
  }
  // Side fur (lighter)
  ctx.strokeStyle = hexToRgba(furLight, 0.35); ctx.lineWidth = 0.7;
  for (let i = 0; i < 12; i++) {
    const fx = cx - w * 0.2 + i * w * 0.04;
    const fy = cy + h * 0.02 + Math.sin(i * 0.8) * h * 0.03 + b;
    ctx.beginPath(); ctx.moveTo(fx, fy);
    ctx.lineTo(fx + w * 0.015, fy - h * 0.03);
    ctx.stroke();
  }
  // Chest fur (white tufts)
  ctx.strokeStyle = hexToRgba(furBelly, 0.5); ctx.lineWidth = 0.9;
  for (let i = 0; i < 5; i++) {
    const fx = cx - w * 0.26 + i * w * 0.02;
    const fy = cy - h * 0.06 + i * h * 0.03 + b;
    ctx.beginPath(); ctx.moveTo(fx, fy);
    ctx.lineTo(fx - w * 0.02, fy + h * 0.03);
    ctx.stroke();
  }

  // === HEAD (elongated muzzle with bezier) ===
  const headX = cx - w * 0.28, headY = cy - h * 0.08 + b;
  // Skull
  const headGrad = ctx.createRadialGradient(headX, headY - h * 0.02, w * 0.04, headX, headY, w * 0.18);
  headGrad.addColorStop(0, hexToRgba(furLight));
  headGrad.addColorStop(0.6, hexToRgba(fur));
  headGrad.addColorStop(1, hexToRgba(furDark));
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.moveTo(headX + w * 0.12, headY + h * 0.06);
  ctx.bezierCurveTo(headX + w * 0.14, headY - h * 0.04, headX + w * 0.1, headY - h * 0.14, headX, headY - h * 0.14);
  ctx.bezierCurveTo(headX - w * 0.08, headY - h * 0.14, headX - w * 0.14, headY - h * 0.08, headX - w * 0.14, headY);
  ctx.bezierCurveTo(headX - w * 0.14, headY + h * 0.06, headX - w * 0.08, headY + h * 0.1, headX, headY + h * 0.1);
  ctx.bezierCurveTo(headX + w * 0.08, headY + h * 0.1, headX + w * 0.12, headY + h * 0.08, headX + w * 0.12, headY + h * 0.06);
  ctx.closePath(); ctx.fill();

  // Muzzle (tapered bezier)
  ctx.fillStyle = hexToRgba(fur);
  ctx.beginPath();
  ctx.moveTo(headX - w * 0.12, headY - h * 0.02);
  ctx.bezierCurveTo(headX - w * 0.2, headY - h * 0.04, headX - w * 0.24, headY - h * 0.02, headX - w * 0.24, headY + h * 0.01);
  ctx.bezierCurveTo(headX - w * 0.24, headY + h * 0.04, headX - w * 0.2, headY + h * 0.06, headX - w * 0.12, headY + h * 0.06);
  ctx.closePath(); ctx.fill();
  // Muzzle fur lighter stripe
  ctx.fillStyle = hexToRgba(furBelly, 0.3);
  ctx.beginPath();
  ctx.moveTo(headX - w * 0.12, headY + h * 0.02);
  ctx.bezierCurveTo(headX - w * 0.18, headY + h * 0.03, headX - w * 0.22, headY + h * 0.02, headX - w * 0.22, headY + h * 0.04);
  ctx.lineTo(headX - w * 0.12, headY + h * 0.05);
  ctx.closePath(); ctx.fill();

  // Open mouth (frame 1: more open)
  const mouthOpen = frame === 1 ? h * 0.03 : h * 0.015;
  ctx.fillStyle = hexToRgba(0x3a0a0a);
  ctx.beginPath();
  ctx.moveTo(headX - w * 0.22, headY + h * 0.02);
  ctx.bezierCurveTo(headX - w * 0.18, headY + h * 0.02 + mouthOpen, headX - w * 0.14, headY + h * 0.02 + mouthOpen, headX - w * 0.1, headY + h * 0.02);
  ctx.lineTo(headX - w * 0.1, headY + h * 0.015);
  ctx.bezierCurveTo(headX - w * 0.14, headY + h * 0.015, headX - w * 0.18, headY + h * 0.015, headX - w * 0.22, headY + h * 0.015);
  ctx.closePath(); ctx.fill();
  // Tongue (if mouth open)
  if (frame === 1) {
    ctx.fillStyle = hexToRgba(0xCC4444, 0.7);
    ctx.beginPath();
    ctx.ellipse(headX - w * 0.16, headY + h * 0.04, w * 0.03, h * 0.015, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Fangs
  ctx.fillStyle = hexToRgba(0xFFFFE8);
  // Upper fangs
  ctx.beginPath(); ctx.moveTo(headX - w * 0.2, headY + h * 0.01); ctx.lineTo(headX - w * 0.19, headY + h * 0.04); ctx.lineTo(headX - w * 0.18, headY + h * 0.01); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(headX - w * 0.14, headY + h * 0.01); ctx.lineTo(headX - w * 0.13, headY + h * 0.035); ctx.lineTo(headX - w * 0.12, headY + h * 0.01); ctx.closePath(); ctx.fill();
  // Smaller teeth
  for (let t = 0; t < 3; t++) {
    const tx = headX - w * 0.19 + t * w * 0.025;
    ctx.beginPath(); ctx.moveTo(tx, headY + h * 0.015); ctx.lineTo(tx + w * 0.006, headY + h * 0.025); ctx.lineTo(tx + w * 0.012, headY + h * 0.015); ctx.closePath(); ctx.fill();
  }

  // Nose
  ctx.fillStyle = hexToRgba(0x1a1a1a);
  ctx.beginPath();
  ctx.ellipse(headX - w * 0.23, headY, w * 0.025, h * 0.02, 0, 0, Math.PI * 2);
  ctx.fill();
  // Nose highlight
  ellipse(ctx, headX - w * 0.235, headY - h * 0.005, w * 0.008, h * 0.006, 0x3a3a3a, 0.5);

  // Pointed alert ears
  const drawWolfEar = (ex, dir) => {
    ctx.fillStyle = hexToRgba(fur);
    ctx.beginPath();
    ctx.moveTo(ex - w * 0.04, headY - h * 0.1);
    ctx.bezierCurveTo(ex - w * 0.03, headY - h * 0.2, ex + w * 0.01 * dir, headY - h * 0.28, ex + w * 0.02 * dir, headY - h * 0.28);
    ctx.bezierCurveTo(ex + w * 0.04 * dir, headY - h * 0.24, ex + w * 0.04, headY - h * 0.14, ex + w * 0.04, headY - h * 0.1);
    ctx.closePath(); ctx.fill();
    // Inner ear
    ctx.fillStyle = hexToRgba(0xBB8888, 0.35);
    ctx.beginPath();
    ctx.moveTo(ex - w * 0.02, headY - h * 0.12);
    ctx.bezierCurveTo(ex - w * 0.01, headY - h * 0.2, ex + w * 0.01 * dir, headY - h * 0.24, ex + w * 0.015 * dir, headY - h * 0.24);
    ctx.bezierCurveTo(ex + w * 0.025 * dir, headY - h * 0.2, ex + w * 0.02, headY - h * 0.14, ex + w * 0.02, headY - h * 0.12);
    ctx.closePath(); ctx.fill();
  };
  drawWolfEar(headX - w * 0.04, -1);
  drawWolfEar(headX + w * 0.06, 1);

  // Head fur strokes
  ctx.strokeStyle = hexToRgba(furDark, 0.35); ctx.lineWidth = 0.7;
  for (let i = 0; i < 6; i++) {
    const fx = headX - w * 0.06 + i * w * 0.025;
    ctx.beginPath(); ctx.moveTo(fx, headY - h * 0.08); ctx.lineTo(fx + w * 0.01, headY - h * 0.12); ctx.stroke();
  }

  // === EYES (amber/yellow, predatory, slightly narrowed) ===
  const eyeC = boss ? 0xFF2200 : 0xDDAA00;
  const drawWolfEye = (ex, ey) => {
    // Narrowed eye shape
    ctx.fillStyle = hexToRgba(0x000000);
    ctx.beginPath();
    ctx.moveTo(ex - w * 0.035, ey);
    ctx.quadraticCurveTo(ex, ey - h * 0.025, ex + w * 0.035, ey);
    ctx.quadraticCurveTo(ex, ey + h * 0.015, ex - w * 0.035, ey);
    ctx.closePath(); ctx.fill();
    // Iris
    ctx.fillStyle = hexToRgba(eyeC);
    ctx.beginPath();
    ctx.moveTo(ex - w * 0.025, ey);
    ctx.quadraticCurveTo(ex, ey - h * 0.018, ex + w * 0.025, ey);
    ctx.quadraticCurveTo(ex, ey + h * 0.01, ex - w * 0.025, ey);
    ctx.closePath(); ctx.fill();
    // Pupil
    ellipse(ctx, ex, ey, w * 0.01, h * 0.012, 0x000000);
    // Glint
    ellipse(ctx, ex - w * 0.008, ey - h * 0.005, w * 0.005, h * 0.004, 0xFFFFFF, 0.7);
  };
  drawWolfEye(headX - w * 0.06, headY - h * 0.04);
  drawWolfEye(headX + w * 0.02, headY - h * 0.04);

  // Wrinkle on muzzle (snarl)
  ctx.strokeStyle = hexToRgba(furDark, 0.4); ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(headX - w * 0.14, headY - h * 0.01); ctx.bezierCurveTo(headX - w * 0.16, headY - h * 0.02, headX - w * 0.18, headY - h * 0.015, headX - w * 0.2, headY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(headX - w * 0.14, headY + h * 0.005); ctx.bezierCurveTo(headX - w * 0.16, headY + h * 0.008, headX - w * 0.18, headY + h * 0.004, headX - w * 0.2, headY + h * 0.01); ctx.stroke();

  if (boss) drawBossCrown(ctx, cx - w * 0.28, cy - h * 0.1, w, h, fur, frame);
}

/** GOLEM — chunky rock body with cracks, glowing rune, moss */
function drawGolem(ctx, cx, cy, w, h, frame, boss, crystal) {
  const b = frame === 1 ? 2 : 0;
  const rock = crystal ? 0x00BFFF : 0x7a7a70;
  const rockDark = darken(rock, 0.55), rockLight = lighten(rock, 1.2);
  const runeColor = crystal ? 0xFFDD00 : 0x4488FF;

  // Shadow
  ellipse(ctx, cx, cy + h * 0.44, w * 0.38, h * 0.06, 0x000000, 0.28);

  // Helper: draw jagged cracks
  const drawCrack = (x1, y1, x2, y2, branches) => {
    ctx.strokeStyle = hexToRgba(0x1a1a1a, 0.5); ctx.lineWidth = 0.8; ctx.lineCap = 'round';
    const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * w * 0.04;
    const my = (y1 + y2) / 2 + (Math.random() - 0.5) * h * 0.03;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(mx, my); ctx.lineTo(x2, y2); ctx.stroke();
    if (branches) {
      ctx.beginPath(); ctx.moveTo(mx, my);
      ctx.lineTo(mx + w * 0.04, my + h * 0.02); ctx.stroke();
    }
  };

  // Helper: rough stone texture (many slightly-different rects)
  const drawStoneTexture = (rx, ry, rw, rh) => {
    for (let i = 0; i < 12; i++) {
      const sx = rx + Math.random() * rw;
      const sy = ry + Math.random() * rh;
      const sw = w * (0.02 + Math.random() * 0.03);
      const sh = h * (0.01 + Math.random() * 0.02);
      const shade = Math.random() > 0.5 ? rockLight : rockDark;
      ctx.fillStyle = hexToRgba(shade, 0.15 + Math.random() * 0.1);
      ctx.fillRect(sx, sy, sw, sh);
    }
  };

  // === HEAVY ANGULAR LEGS (straight lines, sharp corners) ===
  const drawGolemLeg = (lx) => {
    // Leg is a tapered angular column
    ctx.fillStyle = hexToRgba(rock);
    ctx.beginPath();
    ctx.moveTo(lx - w * 0.08, cy + h * 0.1);
    ctx.lineTo(lx - w * 0.09, cy + h * 0.32);
    ctx.lineTo(lx - w * 0.06, cy + h * 0.34);
    ctx.lineTo(lx + w * 0.06, cy + h * 0.34);
    ctx.lineTo(lx + w * 0.09, cy + h * 0.32);
    ctx.lineTo(lx + w * 0.08, cy + h * 0.1);
    ctx.closePath(); ctx.fill();
    // Stone texture
    drawStoneTexture(lx - w * 0.07, cy + h * 0.12, w * 0.14, h * 0.2);
    // Joint crack line
    ctx.strokeStyle = hexToRgba(0x1a1a1a, 0.4); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(lx - w * 0.08, cy + h * 0.22); ctx.lineTo(lx + w * 0.08, cy + h * 0.22); ctx.stroke();
    // Leg cracks
    drawCrack(lx - w * 0.04, cy + h * 0.14, lx + w * 0.02, cy + h * 0.28, false);
  };
  drawGolemLeg(cx - w * 0.12 + b);
  drawGolemLeg(cx + w * 0.12 - b);

  // Massive angular feet
  const drawGolemFoot = (fx) => {
    ctx.fillStyle = hexToRgba(rockDark);
    ctx.beginPath();
    ctx.moveTo(fx - w * 0.12, cy + h * 0.42);
    ctx.lineTo(fx - w * 0.1, cy + h * 0.34);
    ctx.lineTo(fx + w * 0.1, cy + h * 0.34);
    ctx.lineTo(fx + w * 0.12, cy + h * 0.42);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = hexToRgba(0x1a1a1a, 0.3); ctx.lineWidth = 0.8; ctx.stroke();
  };
  drawGolemFoot(cx - w * 0.12 + b);
  drawGolemFoot(cx + w * 0.12 - b);

  // === MASSIVE ANGULAR TORSO (straight edges, no curves) ===
  const torsoGrad = ctx.createLinearGradient(cx - w * 0.26, cy - h * 0.18, cx + w * 0.26, cy + h * 0.16);
  torsoGrad.addColorStop(0, hexToRgba(rockDark));
  torsoGrad.addColorStop(0.3, hexToRgba(rockLight));
  torsoGrad.addColorStop(0.6, hexToRgba(rock));
  torsoGrad.addColorStop(1, hexToRgba(rockDark));
  ctx.fillStyle = torsoGrad;
  ctx.beginPath();
  // Angular shape: wide shoulders, slightly narrower waist
  ctx.moveTo(cx - w * 0.28, cy - h * 0.16);
  ctx.lineTo(cx - w * 0.3, cy - h * 0.12);
  ctx.lineTo(cx - w * 0.24, cy + h * 0.14);
  ctx.lineTo(cx - w * 0.16, cy + h * 0.16);
  ctx.lineTo(cx + w * 0.16, cy + h * 0.16);
  ctx.lineTo(cx + w * 0.24, cy + h * 0.14);
  ctx.lineTo(cx + w * 0.3, cy - h * 0.12);
  ctx.lineTo(cx + w * 0.28, cy - h * 0.16);
  ctx.closePath(); ctx.fill();
  // Outline
  ctx.strokeStyle = hexToRgba(rockDark); ctx.lineWidth = 1.5; ctx.stroke();

  // Stone block lines (mortar pattern)
  ctx.strokeStyle = hexToRgba(rockDark, 0.4); ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(cx - w * 0.28, cy - h * 0.04); ctx.lineTo(cx + w * 0.28, cy - h * 0.04); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - w * 0.26, cy + h * 0.06); ctx.lineTo(cx + w * 0.26, cy + h * 0.06); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - w * 0.05, cy - h * 0.16); ctx.lineTo(cx - w * 0.05, cy - h * 0.04); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + w * 0.1, cy - h * 0.04); ctx.lineTo(cx + w * 0.1, cy + h * 0.06); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - w * 0.12, cy + h * 0.06); ctx.lineTo(cx - w * 0.12, cy + h * 0.14); ctx.stroke();

  // Stone texture overlay
  drawStoneTexture(cx - w * 0.26, cy - h * 0.16, w * 0.52, h * 0.32);

  // Multiple jagged cracks across body
  drawCrack(cx - w * 0.2, cy - h * 0.14, cx - w * 0.06, cy + h * 0.06, true);
  drawCrack(cx + w * 0.08, cy - h * 0.12, cx + w * 0.2, cy + h * 0.1, true);
  drawCrack(cx - w * 0.1, cy + h * 0.02, cx + w * 0.06, cy + h * 0.12, false);
  drawCrack(cx + w * 0.15, cy - h * 0.02, cx + w * 0.22, cy + h * 0.04, false);

  // === GLOWING RUNE on chest (geometric pattern) ===
  const runeX = cx, runeY = cy - h * 0.06;
  // Rune glow aura (larger, pulsing)
  const glowR = w * (0.14 + (frame === 1 ? 0.02 : 0));
  const runeGlow = ctx.createRadialGradient(runeX, runeY, 0, runeX, runeY, glowR);
  runeGlow.addColorStop(0, hexToRgba(runeColor, 0.5));
  runeGlow.addColorStop(0.5, hexToRgba(runeColor, 0.15));
  runeGlow.addColorStop(1, hexToRgba(runeColor, 0));
  ctx.fillStyle = runeGlow;
  ctx.beginPath(); ctx.arc(runeX, runeY, glowR, 0, Math.PI * 2); ctx.fill();
  // Rune symbol: interlocking triangles (Star of David-like)
  ctx.strokeStyle = hexToRgba(runeColor, 0.9); ctx.lineWidth = 1.5;
  const rs = w * 0.06; // rune size
  // Upward triangle
  ctx.beginPath();
  ctx.moveTo(runeX, runeY - rs);
  ctx.lineTo(runeX - rs * 0.86, runeY + rs * 0.5);
  ctx.lineTo(runeX + rs * 0.86, runeY + rs * 0.5);
  ctx.closePath(); ctx.stroke();
  // Downward triangle
  ctx.beginPath();
  ctx.moveTo(runeX, runeY + rs);
  ctx.lineTo(runeX - rs * 0.86, runeY - rs * 0.5);
  ctx.lineTo(runeX + rs * 0.86, runeY - rs * 0.5);
  ctx.closePath(); ctx.stroke();
  // Center dot
  ctx.fillStyle = hexToRgba(runeColor, 0.9);
  ctx.beginPath(); ctx.arc(runeX, runeY, w * 0.01, 0, Math.PI * 2); ctx.fill();
  // Connecting lines
  ctx.beginPath(); ctx.moveTo(runeX, runeY - rs); ctx.lineTo(runeX, runeY + rs); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(runeX - rs * 0.86, runeY); ctx.lineTo(runeX + rs * 0.86, runeY); ctx.stroke();

  // === MOSS / LICHEN patches (irregular shapes in crevices) ===
  const mossPatches = [
    { x: cx - w * 0.18, y: cy - h * 0.14, rw: w * 0.06, rh: h * 0.03 },
    { x: cx + w * 0.16, y: cy + h * 0.02, rw: w * 0.05, rh: h * 0.025 },
    { x: cx - w * 0.06, y: cy + h * 0.12, rw: w * 0.07, rh: h * 0.02 },
    { x: cx + w * 0.22, y: cy - h * 0.08, rw: w * 0.04, rh: h * 0.02 },
    { x: cx - w * 0.3, y: cy, rw: w * 0.035, rh: h * 0.015 },
  ];
  mossPatches.forEach(mp => {
    // Irregular blob (multiple overlapping ellipses)
    for (let i = 0; i < 3; i++) {
      const ox = mp.x + (i - 1) * mp.rw * 0.3;
      const oy = mp.y + Math.sin(i) * mp.rh * 0.3;
      ctx.fillStyle = hexToRgba(0x3a6a2a + i * 0x0a0a00, 0.35 + i * 0.05);
      ctx.beginPath();
      ctx.ellipse(ox, oy, mp.rw * (0.4 + i * 0.15), mp.rh * (0.5 + i * 0.2), i * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // === HEAVY ANGULAR ARMS ===
  const drawGolemArm = (ax, dir) => {
    // Upper arm block
    ctx.fillStyle = hexToRgba(rock);
    ctx.beginPath();
    ctx.moveTo(ax, cy - h * 0.14);
    ctx.lineTo(ax + dir * w * 0.12, cy - h * 0.12);
    ctx.lineTo(ax + dir * w * 0.14, cy + h * 0.08);
    ctx.lineTo(ax + dir * w * 0.02, cy + h * 0.1);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = hexToRgba(rockDark); ctx.lineWidth = 1; ctx.stroke();
    drawStoneTexture(Math.min(ax, ax + dir * w * 0.14), cy - h * 0.14, w * 0.14, h * 0.24);
    drawCrack(ax + dir * w * 0.04, cy - h * 0.1, ax + dir * w * 0.1, cy + h * 0.04, false);
  };
  drawGolemArm(cx - w * 0.28, -1);
  drawGolemArm(cx + w * 0.28, 1);

  // Oversized angular stone FISTS
  const drawFist = (fx, fy, dir) => {
    const fGrad = ctx.createLinearGradient(fx - w * 0.08, fy, fx + w * 0.08, fy + h * 0.1);
    fGrad.addColorStop(0, hexToRgba(rockLight));
    fGrad.addColorStop(0.5, hexToRgba(rock));
    fGrad.addColorStop(1, hexToRgba(rockDark));
    ctx.fillStyle = fGrad;
    ctx.beginPath();
    // Angular block fist
    ctx.moveTo(fx - w * 0.09, fy);
    ctx.lineTo(fx - w * 0.1, fy + h * 0.1);
    ctx.lineTo(fx - w * 0.06, fy + h * 0.12);
    ctx.lineTo(fx + w * 0.06, fy + h * 0.12);
    ctx.lineTo(fx + w * 0.1, fy + h * 0.1);
    ctx.lineTo(fx + w * 0.09, fy);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = hexToRgba(rockDark); ctx.lineWidth = 1.2; ctx.stroke();
    // Knuckle ridges
    ctx.strokeStyle = hexToRgba(rockDark, 0.4); ctx.lineWidth = 0.8;
    for (let k = 0; k < 3; k++) {
      const kx = fx - w * 0.05 + k * w * 0.05;
      ctx.beginPath(); ctx.moveTo(kx, fy); ctx.lineTo(kx, fy + h * 0.04); ctx.stroke();
    }
    drawCrack(fx - w * 0.06, fy + h * 0.02, fx + w * 0.04, fy + h * 0.08, false);
  };
  drawFist(cx - w * 0.4, cy + h * 0.08 + b, -1);
  drawFist(cx + w * 0.4, cy + h * 0.08 - b, 1);

  // === SMALL ANGULAR HEAD (squared off, deep-set eyes) ===
  const headGrad = ctx.createLinearGradient(cx - w * 0.14, cy - h * 0.42, cx + w * 0.14, cy - h * 0.2);
  headGrad.addColorStop(0, hexToRgba(rockDark));
  headGrad.addColorStop(0.35, hexToRgba(rockLight));
  headGrad.addColorStop(1, hexToRgba(rockDark));
  ctx.fillStyle = headGrad;
  // Angular head shape (trapezoid, narrower at top)
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.12, cy - h * 0.2);
  ctx.lineTo(cx - w * 0.14, cy - h * 0.36);
  ctx.lineTo(cx - w * 0.1, cy - h * 0.4);
  ctx.lineTo(cx + w * 0.1, cy - h * 0.4);
  ctx.lineTo(cx + w * 0.14, cy - h * 0.36);
  ctx.lineTo(cx + w * 0.12, cy - h * 0.2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hexToRgba(rockDark); ctx.lineWidth = 1.5; ctx.stroke();
  // Head stone texture
  drawStoneTexture(cx - w * 0.12, cy - h * 0.4, w * 0.24, h * 0.2);
  // Head cracks
  drawCrack(cx - w * 0.08, cy - h * 0.38, cx - w * 0.02, cy - h * 0.24, true);
  drawCrack(cx + w * 0.04, cy - h * 0.36, cx + w * 0.1, cy - h * 0.26, false);

  // Deep-set glowing eyes (like fires in caves)
  const drawGolemEye = (ex, ey) => {
    // Deep socket (dark recess)
    ctx.fillStyle = hexToRgba(0x0a0a0a);
    ctx.beginPath();
    ctx.moveTo(ex - w * 0.04, ey);
    ctx.lineTo(ex - w * 0.02, ey - h * 0.02);
    ctx.lineTo(ex + w * 0.02, ey - h * 0.02);
    ctx.lineTo(ex + w * 0.04, ey);
    ctx.lineTo(ex + w * 0.02, ey + h * 0.015);
    ctx.lineTo(ex - w * 0.02, ey + h * 0.015);
    ctx.closePath(); ctx.fill();
    // Inner fire glow
    const eyeGlow = ctx.createRadialGradient(ex, ey, 0, ex, ey, w * 0.04);
    eyeGlow.addColorStop(0, hexToRgba(lighten(runeColor, 1.3), 0.95));
    eyeGlow.addColorStop(0.4, hexToRgba(runeColor, 0.7));
    eyeGlow.addColorStop(1, hexToRgba(runeColor, 0));
    ctx.fillStyle = eyeGlow;
    ctx.beginPath(); ctx.arc(ex, ey, w * 0.04, 0, Math.PI * 2); ctx.fill();
    // Bright center
    ellipse(ctx, ex, ey, w * 0.012, h * 0.008, lighten(runeColor, 1.5), 0.9);
  };
  drawGolemEye(cx - w * 0.06, cy - h * 0.3);
  drawGolemEye(cx + w * 0.06, cy - h * 0.3);

  // Mouth slit
  ctx.strokeStyle = hexToRgba(0x1a1a1a, 0.6); ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.06, cy - h * 0.24);
  ctx.lineTo(cx - w * 0.04, cy - h * 0.22);
  ctx.lineTo(cx + w * 0.04, cy - h * 0.22);
  ctx.lineTo(cx + w * 0.06, cy - h * 0.24);
  ctx.stroke();

  // Dust particles around feet (atmospheric)
  ctx.fillStyle = hexToRgba(rock, 0.15);
  for (let d = 0; d < 6; d++) {
    const dx = cx - w * 0.3 + d * w * 0.12;
    const dy = cy + h * 0.4 + Math.sin(d * 1.5) * h * 0.02;
    const dr = w * (0.008 + Math.random() * 0.01);
    ctx.beginPath(); ctx.arc(dx, dy, dr, 0, Math.PI * 2); ctx.fill();
  }

  if (boss || crystal) drawBossCrown(ctx, cx, cy, w, h, rock, frame);
}

/** WRAITH — ethereal floating figure with tattered robes */
function drawWraith(ctx, cx, cy, w, h, frame, boss, eyeColor) {
  const drift = frame === 1 ? -3 : 0;
  const body = boss ? 0x9932CC : (eyeColor === 0x00BFFF ? 0x483D8B : 0x6A5ACD);
  const bodyDark = darken(body, 0.4), bodyLight = lighten(body, 1.3);
  const ec = eyeColor || (boss ? 0xFF00FF : 0xFF0000);

  // Faint ground shadow (floating, so very subtle)
  ellipse(ctx, cx, cy + h * 0.44, w * 0.18, h * 0.025, 0x000000, 0.08);

  // === WISPY SMOKE/FOG TRAILS (atmospheric, very low alpha) ===
  ctx.lineCap = 'round';
  for (let s = 0; s < 8; s++) {
    const sx = cx - w * 0.2 + s * w * 0.06;
    const sy = cy + h * 0.1 + s * h * 0.03 + drift;
    const alpha = 0.04 + Math.sin(s * 0.8) * 0.02;
    ctx.strokeStyle = hexToRgba(body, alpha); ctx.lineWidth = w * 0.03;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.bezierCurveTo(sx + w * 0.05, sy - h * 0.06, sx - w * 0.04, sy - h * 0.12, sx + w * 0.02, sy - h * 0.16);
    ctx.stroke();
  }
  // Trailing fog wisps behind and below
  for (let f = 0; f < 5; f++) {
    const fx = cx - w * 0.15 + f * w * 0.08;
    const fy = cy + h * 0.3 + Math.sin(f * 1.2) * h * 0.04 + drift;
    ctx.fillStyle = hexToRgba(body, 0.04 + f * 0.01);
    ctx.beginPath();
    ctx.ellipse(fx, fy, w * 0.06, h * 0.02, f * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // === TATTERED ROBES (5 overlapping translucent layers, fading downward) ===
  for (let layer = 4; layer >= 0; layer--) {
    const ly = cy - h * 0.12 + layer * h * 0.06;
    const lw = w * (0.24 + layer * 0.05);
    const alpha = 0.08 + layer * 0.06;
    const grad = ctx.createLinearGradient(cx, ly, cx, cy + h * 0.42);
    grad.addColorStop(0, hexToRgba(body, alpha + 0.1));
    grad.addColorStop(0.6, hexToRgba(body, alpha * 0.4));
    grad.addColorStop(1, hexToRgba(body, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx - lw, ly + drift);
    // Flowing bezier curves for each side
    ctx.bezierCurveTo(
      cx - lw * 0.9, ly + h * 0.1 + drift,
      cx - lw * 1.05 + (frame === 1 ? w * 0.03 : 0), cy + h * 0.25 + drift,
      cx - lw * 0.8 + (frame === 1 ? w * 0.04 : 0), cy + h * 0.42
    );
    // Jagged tattered bottom edge
    const jaggedPoints = 5;
    for (let j = 0; j < jaggedPoints; j++) {
      const jx = cx - lw * 0.8 + (j / jaggedPoints) * lw * 1.6;
      const jy = cy + h * (0.38 + Math.sin(j * 1.8 + layer) * 0.04);
      const jx2 = cx - lw * 0.8 + ((j + 0.5) / jaggedPoints) * lw * 1.6;
      const jy2 = cy + h * (0.42 + Math.sin(j * 2.2 + layer) * 0.03);
      ctx.lineTo(jx, jy);
      ctx.lineTo(jx2, jy2);
    }
    ctx.lineTo(cx + lw * 0.8 - (frame === 1 ? w * 0.04 : 0), cy + h * 0.42);
    ctx.bezierCurveTo(
      cx + lw * 1.05 - (frame === 1 ? w * 0.03 : 0), cy + h * 0.25 + drift,
      cx + lw * 0.9, ly + h * 0.1 + drift,
      cx + lw, ly + drift
    );
    ctx.closePath(); ctx.fill();
  }

  // === MAIN ETHEREAL BODY (multi-gradient for depth) ===
  // Outer ethereal aura
  const auraGrad = ctx.createRadialGradient(cx, cy - h * 0.05 + drift, w * 0.02, cx, cy + drift, w * 0.35);
  auraGrad.addColorStop(0, hexToRgba(bodyLight, 0.15));
  auraGrad.addColorStop(0.5, hexToRgba(body, 0.08));
  auraGrad.addColorStop(1, hexToRgba(body, 0));
  ctx.fillStyle = auraGrad;
  ctx.beginPath(); ctx.ellipse(cx, cy - h * 0.05 + drift, w * 0.35, h * 0.32, 0, 0, Math.PI * 2); ctx.fill();
  // Inner ethereal body
  const mainGrad = ctx.createRadialGradient(cx, cy - h * 0.1 + drift, w * 0.04, cx, cy + drift, w * 0.25);
  mainGrad.addColorStop(0, hexToRgba(bodyLight, 0.4));
  mainGrad.addColorStop(0.4, hexToRgba(body, 0.3));
  mainGrad.addColorStop(0.8, hexToRgba(body, 0.1));
  mainGrad.addColorStop(1, hexToRgba(body, 0));
  ctx.fillStyle = mainGrad;
  ctx.beginPath(); ctx.ellipse(cx, cy - h * 0.05 + drift, w * 0.25, h * 0.28, 0, 0, Math.PI * 2); ctx.fill();

  // Robe fold lines (subtle dark strokes)
  ctx.strokeStyle = hexToRgba(bodyDark, 0.12); ctx.lineWidth = 0.8;
  for (let fold = 0; fold < 5; fold++) {
    const fx = cx - w * 0.12 + fold * w * 0.06;
    ctx.beginPath();
    ctx.moveTo(fx, cy - h * 0.1 + drift);
    ctx.bezierCurveTo(fx + w * 0.01, cy + h * 0.05 + drift, fx - w * 0.02, cy + h * 0.2, fx + w * 0.01, cy + h * 0.35);
    ctx.stroke();
  }

  // === SKELETAL HANDS (individual finger bones) ===
  const drawWraithHand = (startX, startY, dir) => {
    // Wrist
    ctx.strokeStyle = hexToRgba(0xC0B8A0, 0.5); ctx.lineWidth = w * 0.025; ctx.lineCap = 'round';
    // Arm reaching out
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(
      startX + dir * w * 0.12, startY - h * 0.08,
      startX + dir * w * 0.2, startY + h * 0.02,
      startX + dir * w * 0.22, startY + h * 0.06 + drift
    );
    ctx.stroke();
    // Hand bone (palm area)
    const handX = startX + dir * w * 0.22;
    const handY = startY + h * 0.06 + drift;
    // Individual finger bones (5 fingers)
    ctx.strokeStyle = hexToRgba(0xB0A890, 0.45); ctx.lineWidth = w * 0.01;
    for (let f = 0; f < 5; f++) {
      const angle = (dir > 0 ? 0.3 : Math.PI - 0.3) + (f - 2) * 0.25 * dir;
      const fingerLen = w * (f === 2 ? 0.07 : f === 1 || f === 3 ? 0.06 : 0.045);
      const midX = handX + Math.cos(angle) * fingerLen * 0.5;
      const midY = handY + Math.sin(angle) * fingerLen * 0.5;
      const tipX = handX + Math.cos(angle) * fingerLen;
      const tipY = handY + Math.sin(angle) * fingerLen;
      // First phalanx
      ctx.beginPath(); ctx.moveTo(handX, handY); ctx.lineTo(midX, midY); ctx.stroke();
      // Second phalanx (slightly angled)
      ctx.beginPath(); ctx.moveTo(midX, midY); ctx.lineTo(tipX, tipY); ctx.stroke();
      // Knuckle joint
      ctx.fillStyle = hexToRgba(0xA09880, 0.4);
      ctx.beginPath(); ctx.arc(midX, midY, w * 0.005, 0, Math.PI * 2); ctx.fill();
    }
  };
  drawWraithHand(cx - w * 0.18, cy + h * 0.02, -1);
  drawWraithHand(cx + w * 0.18, cy + h * 0.02, 1);

  // === DEEP DARK HOOD ===
  // Hood outer shape
  const hoodGrad = ctx.createLinearGradient(cx, cy - h * 0.48 + drift, cx, cy - h * 0.1 + drift);
  hoodGrad.addColorStop(0, hexToRgba(bodyDark, 0.8));
  hoodGrad.addColorStop(0.5, hexToRgba(darken(body, 0.6), 0.75));
  hoodGrad.addColorStop(1, hexToRgba(body, 0.5));
  ctx.fillStyle = hoodGrad;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.24, cy - h * 0.12 + drift);
  ctx.bezierCurveTo(cx - w * 0.28, cy - h * 0.28 + drift, cx - w * 0.14, cy - h * 0.48 + drift, cx, cy - h * 0.5 + drift);
  ctx.bezierCurveTo(cx + w * 0.14, cy - h * 0.48 + drift, cx + w * 0.28, cy - h * 0.28 + drift, cx + w * 0.24, cy - h * 0.12 + drift);
  ctx.bezierCurveTo(cx + w * 0.16, cy - h * 0.08 + drift, cx - w * 0.16, cy - h * 0.08 + drift, cx - w * 0.24, cy - h * 0.12 + drift);
  ctx.closePath(); ctx.fill();
  // Hood edge detail
  ctx.strokeStyle = hexToRgba(bodyDark, 0.4); ctx.lineWidth = 1;
  ctx.stroke();
  // Hood draping folds
  ctx.strokeStyle = hexToRgba(bodyDark, 0.2); ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(cx - w * 0.08, cy - h * 0.44 + drift); ctx.bezierCurveTo(cx - w * 0.1, cy - h * 0.3, cx - w * 0.12, cy - h * 0.2, cx - w * 0.16, cy - h * 0.12 + drift); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + w * 0.08, cy - h * 0.44 + drift); ctx.bezierCurveTo(cx + w * 0.1, cy - h * 0.3, cx + w * 0.12, cy - h * 0.2, cx + w * 0.16, cy - h * 0.12 + drift); ctx.stroke();

  // Near-black void inside hood
  const voidGrad = ctx.createRadialGradient(cx, cy - h * 0.24 + drift, 0, cx, cy - h * 0.24 + drift, w * 0.16);
  voidGrad.addColorStop(0, hexToRgba(0x020208, 0.9));
  voidGrad.addColorStop(0.6, hexToRgba(0x0a0a14, 0.8));
  voidGrad.addColorStop(1, hexToRgba(bodyDark, 0.4));
  ctx.fillStyle = voidGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy - h * 0.22 + drift, w * 0.16, h * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  // === GLOWING EYES (main visual focus, significant glow aura) ===
  const drawWraithEye = (ex, ey) => {
    // Large outer glow
    const glow1 = ctx.createRadialGradient(ex, ey, 0, ex, ey, w * 0.1);
    glow1.addColorStop(0, hexToRgba(ec, 0.4));
    glow1.addColorStop(0.4, hexToRgba(ec, 0.15));
    glow1.addColorStop(1, hexToRgba(ec, 0));
    ctx.fillStyle = glow1;
    ctx.beginPath(); ctx.arc(ex, ey, w * 0.1, 0, Math.PI * 2); ctx.fill();
    // Medium glow
    const glow2 = ctx.createRadialGradient(ex, ey, 0, ex, ey, w * 0.06);
    glow2.addColorStop(0, hexToRgba(ec, 0.85));
    glow2.addColorStop(0.5, hexToRgba(ec, 0.4));
    glow2.addColorStop(1, hexToRgba(ec, 0));
    ctx.fillStyle = glow2;
    ctx.beginPath(); ctx.arc(ex, ey, w * 0.06, 0, Math.PI * 2); ctx.fill();
    // Bright core
    ellipse(ctx, ex, ey, w * 0.025, h * 0.018, lighten(ec, 1.5));
    // White-hot center
    ellipse(ctx, ex, ey, w * 0.01, h * 0.008, 0xFFFFFF, 0.9);
    // Light streaks from eyes
    ctx.strokeStyle = hexToRgba(ec, 0.15); ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(ex - w * 0.08, ey); ctx.lineTo(ex + w * 0.08, ey); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex, ey - h * 0.04); ctx.lineTo(ex, ey + h * 0.04); ctx.stroke();
  };
  drawWraithEye(cx - w * 0.06, cy - h * 0.24 + drift);
  drawWraithEye(cx + w * 0.06, cy - h * 0.24 + drift);

  // Eye glow illuminating hood interior
  const hoodIllum = ctx.createRadialGradient(cx, cy - h * 0.24 + drift, 0, cx, cy - h * 0.24 + drift, w * 0.14);
  hoodIllum.addColorStop(0, hexToRgba(ec, 0.08));
  hoodIllum.addColorStop(1, hexToRgba(ec, 0));
  ctx.fillStyle = hoodIllum;
  ctx.beginPath(); ctx.arc(cx, cy - h * 0.24 + drift, w * 0.14, 0, Math.PI * 2); ctx.fill();

  // Energy crackling around figure
  ctx.strokeStyle = hexToRgba(ec, 0.1); ctx.lineWidth = 0.5;
  for (let e = 0; e < 4; e++) {
    const ex = cx - w * 0.2 + e * w * 0.13;
    const ey = cy - h * 0.1 + Math.sin(e * 2) * h * 0.15 + drift;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex + w * 0.02, ey - h * 0.03);
    ctx.lineTo(ex + w * 0.01, ey - h * 0.01);
    ctx.lineTo(ex + w * 0.04, ey - h * 0.05);
    ctx.stroke();
  }

  if (boss) drawBossCrown(ctx, cx, cy, w, h, body, frame);
}

/** DRAGON — winged, scaled, horned, fire-breathing */
function drawDragon(ctx, cx, cy, w, h, frame, boss, bodyColor, eyeColor) {
  const b = frame === 1 ? 2 : 0;
  const W = w, H = h;
  const body = bodyColor || 0xAA2020;
  const bodyDark = darken(body, 0.5), bodyLight = lighten(body, 1.25);
  const ec = eyeColor || 0xFFFF00;

  // Shadow
  ellipse(ctx, cx, cy + H * 0.42, W * 0.4, H * 0.06, 0x000000, 0.25);

  // === TAIL (long, curving, with dorsal spines and barbed tip) ===
  ctx.fillStyle = hexToRgba(body);
  ctx.beginPath();
  ctx.moveTo(cx - W * 0.22, cy + H * 0.12);
  ctx.bezierCurveTo(cx - W * 0.34, cy + H * 0.06, cx - W * 0.44, cy + H * 0.12, cx - W * 0.48, cy + H * 0.22);
  ctx.bezierCurveTo(cx - W * 0.5, cy + H * 0.28, cx - W * 0.46, cy + H * 0.34, cx - W * 0.42, cy + H * 0.36);
  // Tail underside
  ctx.bezierCurveTo(cx - W * 0.44, cy + H * 0.32, cx - W * 0.46, cy + H * 0.26, cx - W * 0.44, cy + H * 0.2);
  ctx.bezierCurveTo(cx - W * 0.4, cy + H * 0.14, cx - W * 0.32, cy + H * 0.12, cx - W * 0.22, cy + H * 0.16);
  ctx.closePath(); ctx.fill();
  // Tail barb
  ctx.fillStyle = hexToRgba(bodyDark);
  ctx.beginPath();
  ctx.moveTo(cx - W * 0.42, cy + H * 0.36);
  ctx.lineTo(cx - W * 0.5, cy + H * 0.38);
  ctx.lineTo(cx - W * 0.46, cy + H * 0.32);
  ctx.closePath(); ctx.fill();
  // Tail dorsal spines
  const tailSpines = [
    { x: cx - W * 0.3, y: cy + H * 0.08 }, { x: cx - W * 0.36, y: cy + H * 0.07 },
    { x: cx - W * 0.42, y: cy + H * 0.1 }, { x: cx - W * 0.46, y: cy + H * 0.16 },
  ];
  ctx.fillStyle = hexToRgba(bodyDark);
  tailSpines.forEach(sp => {
    ctx.beginPath();
    ctx.moveTo(sp.x - W * 0.01, sp.y + H * 0.02);
    ctx.lineTo(sp.x, sp.y - H * 0.03);
    ctx.lineTo(sp.x + W * 0.01, sp.y + H * 0.02);
    ctx.closePath(); ctx.fill();
  });
  // Tail scales
  ctx.strokeStyle = hexToRgba(bodyDark, 0.3); ctx.lineWidth = 0.5;
  for (let i = 0; i < 8; i++) {
    const t = i / 8;
    const sx = cx - W * 0.24 - t * W * 0.2;
    const sy = cy + H * 0.14 + Math.sin(t * 3) * H * 0.06;
    ctx.beginPath(); ctx.arc(sx, sy, W * 0.015, 0.5, Math.PI - 0.5); ctx.stroke();
  }

  // === LEGS with claws ===
  const drawDragonLeg = (lx, dir) => {
    const legGrad = ctx.createLinearGradient(lx - W * 0.05, cy + H * 0.08, lx + W * 0.05, cy + H * 0.08);
    legGrad.addColorStop(0, hexToRgba(bodyDark));
    legGrad.addColorStop(0.4, hexToRgba(bodyLight));
    legGrad.addColorStop(1, hexToRgba(bodyDark));
    ctx.fillStyle = legGrad;
    ctx.beginPath();
    ctx.moveTo(lx - W * 0.05, cy + H * 0.08);
    ctx.bezierCurveTo(lx - W * 0.06, cy + H * 0.18, lx - W * 0.05, cy + H * 0.26, lx - W * 0.04, cy + H * 0.32);
    ctx.lineTo(lx + W * 0.04, cy + H * 0.32);
    ctx.bezierCurveTo(lx + W * 0.05, cy + H * 0.26, lx + W * 0.06, cy + H * 0.18, lx + W * 0.05, cy + H * 0.08);
    ctx.closePath(); ctx.fill();
    // Clawed foot with 3 curved hooks
    for (let c = 0; c < 3; c++) {
      const cx2 = lx - W * 0.03 + c * W * 0.03;
      ctx.fillStyle = hexToRgba(0x2a1a1a);
      ctx.beginPath();
      ctx.moveTo(cx2, cy + H * 0.32);
      ctx.bezierCurveTo(cx2 - W * 0.005, cy + H * 0.36, cx2 + W * 0.005, cy + H * 0.38, cx2 + W * 0.015, cy + H * 0.4);
      ctx.lineTo(cx2 + W * 0.025, cy + H * 0.38);
      ctx.bezierCurveTo(cx2 + W * 0.015, cy + H * 0.36, cx2 + W * 0.01, cy + H * 0.34, cx2 + W * 0.02, cy + H * 0.32);
      ctx.closePath(); ctx.fill();
    }
    // Leg scales
    ctx.strokeStyle = hexToRgba(bodyDark, 0.3); ctx.lineWidth = 0.5;
    for (let s = 0; s < 4; s++) {
      const sy = cy + H * 0.12 + s * H * 0.05;
      ctx.beginPath(); ctx.arc(lx, sy, W * 0.02, 0.5, Math.PI - 0.5); ctx.stroke();
    }
  };
  drawDragonLeg(cx - W * 0.08 + b, 1);
  drawDragonLeg(cx + W * 0.12 - b, -1);

  // === MUSCULAR SERPENTINE BODY ===
  const bodyGrad = ctx.createRadialGradient(cx + W * 0.02, cy - H * 0.02, W * 0.06, cx, cy, W * 0.32);
  bodyGrad.addColorStop(0, hexToRgba(bodyLight));
  bodyGrad.addColorStop(0.4, hexToRgba(body));
  bodyGrad.addColorStop(1, hexToRgba(bodyDark));
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  // Defined chest and tapered waist
  ctx.moveTo(cx - W * 0.2, cy + H * 0.14);
  ctx.bezierCurveTo(cx - W * 0.28, cy + H * 0.06, cx - W * 0.28, cy - H * 0.08, cx - W * 0.18, cy - H * 0.14);
  ctx.bezierCurveTo(cx - W * 0.08, cy - H * 0.18, cx + W * 0.12, cy - H * 0.18, cx + W * 0.2, cy - H * 0.12);
  ctx.bezierCurveTo(cx + W * 0.28, cy - H * 0.06, cx + W * 0.26, cy + H * 0.08, cx + W * 0.18, cy + H * 0.14);
  ctx.closePath(); ctx.fill();

  // Lighter belly plates
  ctx.fillStyle = hexToRgba(lighten(body, 1.5), 0.35);
  ctx.beginPath();
  ctx.moveTo(cx - W * 0.1, cy + H * 0.12);
  ctx.bezierCurveTo(cx - W * 0.12, cy + H * 0.04, cx - W * 0.1, cy - H * 0.04, cx - W * 0.06, cy - H * 0.08);
  ctx.lineTo(cx + W * 0.08, cy - H * 0.08);
  ctx.bezierCurveTo(cx + W * 0.12, cy - H * 0.04, cx + W * 0.12, cy + H * 0.04, cx + W * 0.1, cy + H * 0.12);
  ctx.closePath(); ctx.fill();
  // Belly plate lines
  ctx.strokeStyle = hexToRgba(lighten(body, 1.3), 0.2); ctx.lineWidth = 0.6;
  for (let i = 0; i < 6; i++) {
    const py = cy - H * 0.06 + i * H * 0.03;
    ctx.beginPath(); ctx.moveTo(cx - W * 0.08, py); ctx.lineTo(cx + W * 0.08, py); ctx.stroke();
  }

  // === SCALE PATTERN (overlapping semicircles) ===
  ctx.strokeStyle = hexToRgba(bodyDark, 0.25); ctx.lineWidth = 0.6;
  for (let sy = -3; sy < 4; sy++) {
    for (let sx = -4; sx < 4; sx++) {
      const scx = cx + sx * W * 0.05 + (sy % 2) * W * 0.025;
      const scy = cy + sy * H * 0.035;
      // Check if within body bounds (rough ellipse check)
      const dx = (scx - cx) / (W * 0.26), dy = (scy - cy) / (H * 0.18);
      if (dx * dx + dy * dy < 1.1) {
        ctx.beginPath(); ctx.arc(scx, scy, W * 0.02, 0.3, Math.PI - 0.3); ctx.stroke();
        // Scale highlight
        ctx.strokeStyle = hexToRgba(bodyLight, 0.1); ctx.lineWidth = 0.3;
        ctx.beginPath(); ctx.arc(scx, scy - H * 0.005, W * 0.015, 0.5, Math.PI - 0.5); ctx.stroke();
        ctx.strokeStyle = hexToRgba(bodyDark, 0.25); ctx.lineWidth = 0.6;
      }
    }
  }

  // Dorsal spines along back
  for (let s = 0; s < 6; s++) {
    const sx = cx - W * 0.12 + s * W * 0.065;
    const spineH = H * (0.08 + (s < 3 ? s * 0.015 : (5 - s) * 0.015));
    ctx.fillStyle = hexToRgba(bodyDark);
    ctx.beginPath();
    ctx.moveTo(sx - W * 0.008, cy - H * 0.14);
    ctx.lineTo(sx, cy - H * 0.14 - spineH - b);
    ctx.lineTo(sx + W * 0.008, cy - H * 0.14);
    ctx.closePath(); ctx.fill();
    // Spine highlight
    ctx.strokeStyle = hexToRgba(bodyLight, 0.3); ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.moveTo(sx - W * 0.003, cy - H * 0.14); ctx.lineTo(sx, cy - H * 0.14 - spineH - b); ctx.stroke();
  }

  // === WINGS (bone structure + translucent membrane + veins) ===
  const drawWing = (dir) => {
    const shoulder = { x: cx + dir * W * 0.15, y: cy - H * 0.06 };
    const tip = { x: cx + dir * W * 0.38, y: cy - H * 0.38 - b };
    const mid1 = { x: cx + dir * W * 0.46, y: cy - H * 0.22 };
    const mid2 = { x: cx + dir * W * 0.44, y: cy - H * 0.06 };
    const base = { x: cx + dir * W * 0.15, y: cy + H * 0.1 };

    // Wing membrane (translucent, multi-layer)
    const memGrad = ctx.createLinearGradient(shoulder.x, shoulder.y, tip.x, tip.y);
    memGrad.addColorStop(0, hexToRgba(body, 0.35));
    memGrad.addColorStop(0.5, hexToRgba(lighten(body, 1.2), 0.25));
    memGrad.addColorStop(1, hexToRgba(body, 0.15));
    ctx.fillStyle = memGrad;
    ctx.beginPath();
    ctx.moveTo(shoulder.x, shoulder.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(mid1.x, mid1.y);
    ctx.lineTo(mid2.x, mid2.y);
    ctx.lineTo(base.x, base.y);
    ctx.closePath(); ctx.fill();

    // Wing bones (thick)
    ctx.strokeStyle = hexToRgba(bodyDark); ctx.lineWidth = W * 0.022; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(shoulder.x, shoulder.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(mid1.x, mid1.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(mid2.x, mid2.y); ctx.stroke();
    // Extra bone finger
    const mid3 = { x: cx + dir * W * 0.42, y: cy + H * 0.02 };
    ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(mid3.x, mid3.y); ctx.stroke();

    // Vein lines in membrane
    ctx.strokeStyle = hexToRgba(bodyDark, 0.15); ctx.lineWidth = 0.5;
    // Between bone fingers
    for (let v = 0; v < 3; v++) {
      const t = (v + 1) / 4;
      const vx1 = tip.x + (mid1.x - tip.x) * t;
      const vy1 = tip.y + (mid1.y - tip.y) * t;
      const vx2 = shoulder.x + (base.x - shoulder.x) * t;
      const vy2 = shoulder.y + (base.y - shoulder.y) * t;
      ctx.beginPath();
      ctx.moveTo(vx1, vy1);
      ctx.bezierCurveTo(vx1 - dir * W * 0.02, vy1 + H * 0.04, vx2 + dir * W * 0.02, vy2 - H * 0.02, vx2, vy2);
      ctx.stroke();
    }
    // Wing claw at tip
    ctx.fillStyle = hexToRgba(0x2a1a1a);
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(tip.x + dir * W * 0.02, tip.y - H * 0.03);
    ctx.lineTo(tip.x + dir * W * 0.01, tip.y + H * 0.01);
    ctx.closePath(); ctx.fill();
  };
  drawWing(-1);
  drawWing(1);

  // === SERPENTINE NECK (bezier path with overlapping scales) ===
  const neckGrad = ctx.createLinearGradient(cx - W * 0.1, cy - H * 0.16, cx + W * 0.02, cy - H * 0.36);
  neckGrad.addColorStop(0, hexToRgba(body));
  neckGrad.addColorStop(0.5, hexToRgba(bodyLight));
  neckGrad.addColorStop(1, hexToRgba(body));
  ctx.fillStyle = neckGrad;
  ctx.beginPath();
  ctx.moveTo(cx - W * 0.04, cy - H * 0.14);
  ctx.bezierCurveTo(cx + W * 0.04, cy - H * 0.22, cx + W * 0.08, cy - H * 0.3, cx + W * 0.04, cy - H * 0.36);
  ctx.lineTo(cx - W * 0.08, cy - H * 0.36);
  ctx.bezierCurveTo(cx - W * 0.04, cy - H * 0.28, cx - W * 0.12, cy - H * 0.2, cx - W * 0.12, cy - H * 0.14);
  ctx.closePath(); ctx.fill();
  // Neck scales (overlapping semicircles)
  ctx.strokeStyle = hexToRgba(bodyDark, 0.3); ctx.lineWidth = 0.5;
  for (let ns = 0; ns < 6; ns++) {
    const t = ns / 6;
    const nsx = cx - W * 0.06 + t * W * 0.06;
    const nsy = cy - H * 0.16 - t * H * 0.032;
    ctx.beginPath(); ctx.arc(nsx, nsy, W * 0.018, 0.3, Math.PI - 0.3); ctx.stroke();
  }
  // Neck lighter front
  ctx.fillStyle = hexToRgba(lighten(body, 1.5), 0.2);
  ctx.beginPath();
  ctx.moveTo(cx - W * 0.02, cy - H * 0.16);
  ctx.bezierCurveTo(cx + W * 0.02, cy - H * 0.22, cx + W * 0.04, cy - H * 0.28, cx + W * 0.02, cy - H * 0.34);
  ctx.lineTo(cx - W * 0.04, cy - H * 0.34);
  ctx.bezierCurveTo(cx - W * 0.02, cy - H * 0.26, cx - W * 0.06, cy - H * 0.2, cx - W * 0.08, cy - H * 0.16);
  ctx.closePath(); ctx.fill();

  // === ELONGATED REPTILIAN HEAD ===
  const headGrad = ctx.createRadialGradient(cx - W * 0.02, cy - H * 0.42, W * 0.04, cx, cy - H * 0.42, W * 0.2);
  headGrad.addColorStop(0, hexToRgba(bodyLight));
  headGrad.addColorStop(0.6, hexToRgba(body));
  headGrad.addColorStop(1, hexToRgba(bodyDark));
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  // Elongated snout shape
  ctx.moveTo(cx + W * 0.16, cy - H * 0.38);
  ctx.bezierCurveTo(cx + W * 0.18, cy - H * 0.4, cx + W * 0.18, cy - H * 0.44, cx + W * 0.14, cy - H * 0.46);
  ctx.bezierCurveTo(cx + W * 0.06, cy - H * 0.5, cx - W * 0.1, cy - H * 0.5, cx - W * 0.16, cy - H * 0.46);
  ctx.bezierCurveTo(cx - W * 0.2, cy - H * 0.44, cx - W * 0.2, cy - H * 0.4, cx - W * 0.18, cy - H * 0.38);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hexToRgba(bodyDark); ctx.lineWidth = 1; ctx.stroke();

  // Head scales
  ctx.strokeStyle = hexToRgba(bodyDark, 0.2); ctx.lineWidth = 0.4;
  for (let hs = 0; hs < 4; hs++) {
    const hsx = cx - W * 0.08 + hs * W * 0.04;
    ctx.beginPath(); ctx.arc(hsx, cy - H * 0.44, W * 0.015, 0.3, Math.PI - 0.3); ctx.stroke();
  }

  // Swept-back horns (larger, more dramatic)
  const drawHorn = (hx, dir) => {
    const hornGrad = ctx.createLinearGradient(hx, cy - H * 0.47, hx + dir * W * 0.14, cy - H * 0.52);
    hornGrad.addColorStop(0, hexToRgba(bodyDark));
    hornGrad.addColorStop(1, hexToRgba(0x2a1a1a));
    ctx.strokeStyle = hornGrad; ctx.lineWidth = W * 0.02; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx, cy - H * 0.47);
    ctx.bezierCurveTo(hx + dir * W * 0.06, cy - H * 0.52, hx + dir * W * 0.12, cy - H * 0.55, hx + dir * W * 0.16, cy - H * 0.52);
    ctx.stroke();
    // Horn ridges
    ctx.strokeStyle = hexToRgba(bodyDark, 0.3); ctx.lineWidth = 0.4;
    for (let r = 0; r < 3; r++) {
      const t = (r + 1) / 4;
      const rx = hx + dir * W * 0.06 * t;
      const ry = cy - H * 0.47 - H * 0.04 * t;
      ctx.beginPath(); ctx.arc(rx, ry, W * 0.008, 0, Math.PI * 2); ctx.stroke();
    }
  };
  drawHorn(cx - W * 0.1, -1);
  drawHorn(cx + W * 0.1, 1);

  // Slit-pupil eyes with glow
  const drawDragonEye = (ex, ey) => {
    // Eye socket
    ctx.fillStyle = hexToRgba(0x0a0a00);
    ctx.beginPath();
    ctx.ellipse(ex, ey, W * 0.04, H * 0.022, 0, 0, Math.PI * 2);
    ctx.fill();
    // Iris
    const iGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey, W * 0.035);
    iGrad.addColorStop(0, hexToRgba(lighten(ec, 1.3)));
    iGrad.addColorStop(0.6, hexToRgba(ec));
    iGrad.addColorStop(1, hexToRgba(darken(ec, 0.5)));
    ctx.fillStyle = iGrad;
    ctx.beginPath(); ctx.ellipse(ex, ey, W * 0.035, H * 0.018, 0, 0, Math.PI * 2); ctx.fill();
    // Vertical slit pupil
    ctx.fillStyle = hexToRgba(0x000000);
    ctx.beginPath(); ctx.ellipse(ex, ey, W * 0.006, H * 0.018, 0, 0, Math.PI * 2); ctx.fill();
    // Specular
    ellipse(ctx, ex - W * 0.01, ey - H * 0.006, W * 0.008, H * 0.005, 0xFFFFFF, 0.6);
  };
  drawDragonEye(cx - W * 0.06, cy - H * 0.43);
  drawDragonEye(cx + W * 0.06, cy - H * 0.43);

  // Nostril slits (with smoke wisps)
  ctx.fillStyle = hexToRgba(0x1a0a0a);
  ctx.beginPath(); ctx.ellipse(cx - W * 0.12, cy - H * 0.39, W * 0.012, H * 0.008, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx - W * 0.08, cy - H * 0.39, W * 0.012, H * 0.008, -0.3, 0, Math.PI * 2); ctx.fill();
  // Smoke from nostrils
  ctx.strokeStyle = hexToRgba(0x444444, 0.2); ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(cx - W * 0.12, cy - H * 0.4);
  ctx.bezierCurveTo(cx - W * 0.14, cy - H * 0.43, cx - W * 0.12, cy - H * 0.45, cx - W * 0.14, cy - H * 0.47);
  ctx.stroke();

  // Jaw with fangs
  ctx.fillStyle = hexToRgba(darken(body, 0.8));
  ctx.beginPath();
  ctx.moveTo(cx - W * 0.16, cy - H * 0.38);
  ctx.bezierCurveTo(cx - W * 0.14, cy - H * 0.36, cx + W * 0.1, cy - H * 0.36, cx + W * 0.14, cy - H * 0.38);
  ctx.lineTo(cx + W * 0.12, cy - H * 0.37);
  ctx.lineTo(cx - W * 0.14, cy - H * 0.37);
  ctx.closePath(); ctx.fill();
  // Fangs
  ctx.fillStyle = hexToRgba(0xFFF8E0);
  const fangs = [
    { x: cx - W * 0.14, large: true }, { x: cx - W * 0.08, large: false },
    { x: cx - W * 0.02, large: false }, { x: cx + W * 0.04, large: false },
    { x: cx + W * 0.1, large: true }
  ];
  fangs.forEach(f => {
    const fh = f.large ? H * 0.035 : H * 0.02;
    ctx.beginPath();
    ctx.moveTo(f.x, cy - H * 0.375);
    ctx.lineTo(f.x + W * 0.008, cy - H * 0.375 + fh);
    ctx.lineTo(f.x + W * 0.016, cy - H * 0.375);
    ctx.closePath(); ctx.fill();
  });

  // === FIRE BREATH (frame 1) — organic bezier flames ===
  if (frame === 1) {
    // Multi-layered flame
    const flameX = cx + W * 0.2, flameY = cy - H * 0.4;
    // Outer flame (red)
    ctx.fillStyle = hexToRgba(0xFF2200, 0.3);
    ctx.beginPath();
    ctx.moveTo(cx + W * 0.1, flameY + H * 0.04);
    ctx.bezierCurveTo(cx + W * 0.15, flameY - H * 0.06, cx + W * 0.3, flameY - H * 0.08, cx + W * 0.4, flameY);
    ctx.bezierCurveTo(cx + W * 0.35, flameY + H * 0.06, cx + W * 0.2, flameY + H * 0.1, cx + W * 0.1, flameY + H * 0.04);
    ctx.closePath(); ctx.fill();
    // Middle flame (orange)
    ctx.fillStyle = hexToRgba(0xFF8800, 0.5);
    ctx.beginPath();
    ctx.moveTo(cx + W * 0.12, flameY + H * 0.02);
    ctx.bezierCurveTo(cx + W * 0.18, flameY - H * 0.04, cx + W * 0.28, flameY - H * 0.05, cx + W * 0.36, flameY);
    ctx.bezierCurveTo(cx + W * 0.3, flameY + H * 0.04, cx + W * 0.2, flameY + H * 0.06, cx + W * 0.12, flameY + H * 0.02);
    ctx.closePath(); ctx.fill();
    // Inner flame (yellow core)
    ctx.fillStyle = hexToRgba(0xFFDD00, 0.7);
    ctx.beginPath();
    ctx.moveTo(cx + W * 0.14, flameY + H * 0.01);
    ctx.bezierCurveTo(cx + W * 0.2, flameY - H * 0.02, cx + W * 0.26, flameY - H * 0.02, cx + W * 0.3, flameY);
    ctx.bezierCurveTo(cx + W * 0.26, flameY + H * 0.02, cx + W * 0.2, flameY + H * 0.03, cx + W * 0.14, flameY + H * 0.01);
    ctx.closePath(); ctx.fill();
    // White-hot center
    const hotGrad = ctx.createRadialGradient(cx + W * 0.16, flameY, 0, cx + W * 0.16, flameY, W * 0.04);
    hotGrad.addColorStop(0, 'rgba(255,255,255,0.8)');
    hotGrad.addColorStop(1, 'rgba(255,255,200,0)');
    ctx.fillStyle = hotGrad;
    ctx.beginPath(); ctx.arc(cx + W * 0.16, flameY, W * 0.04, 0, Math.PI * 2); ctx.fill();
    // Sparks/embers
    ctx.fillStyle = hexToRgba(0xFFAA00, 0.6);
    for (let sp = 0; sp < 5; sp++) {
      const spx = cx + W * 0.2 + Math.sin(sp * 1.8) * W * 0.1;
      const spy = flameY + Math.cos(sp * 2.1) * H * 0.06;
      ellipse(ctx, spx, spy, W * 0.005, H * 0.004, 0xFFCC00, 0.5 + Math.sin(sp) * 0.3);
    }
  }

  if (boss) drawBossCrown(ctx, cx, cy, w, h, body, frame);
}

/** SPIDER — eight legs with angular joints, two body segments, many eyes */
function drawSpider(ctx, cx, cy, w, h, frame, boss) {
  const b = frame === 1 ? 2 : 0;
  const body = 0x1A0A2A;
  // Shadow
  ellipse(ctx, cx, cy + h * 0.42, w * 0.35, h * 0.05, 0x000000, 0.15);
  // Eight legs with bezier curves and angular joints
  ctx.strokeStyle = hexToRgba(body); ctx.lineWidth = 1.8; ctx.lineCap = 'round';
  const legAngles = [-0.8, -0.4, 0.0, 0.4, 0.8, 1.2, 1.6, 2.0];
  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? -1 : 1;
    const idx = i < 4 ? i : i - 4;
    const startX = cx + side * w * 0.08;
    const startY = cy - h * 0.05 + b;
    const spread = (0.2 + idx * 0.1) * side;
    // Joint point (knee)
    const kneeX = startX + side * w * (0.15 + idx * 0.04);
    const kneeY = cy - h * (0.15 + idx * 0.04) + b + (frame === 1 ? (i % 2) * 3 : 0);
    // Foot point
    const footX = startX + side * w * (0.3 + idx * 0.06);
    const footY = cy + h * 0.3 + (i % 2) * h * 0.05;
    // Draw leg segments
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(kneeX, kneeY);
    ctx.lineTo(footX, footY);
    ctx.stroke();
  }
  // Abdomen (larger rear segment)
  const abdGrad = ctx.createRadialGradient(cx, cy + h * 0.08 + b, w * 0.02, cx, cy + h * 0.08 + b, w * 0.22);
  abdGrad.addColorStop(0, hexToRgba(lighten(body, 1.3)));
  abdGrad.addColorStop(1, hexToRgba(body));
  ctx.fillStyle = abdGrad;
  ctx.beginPath(); ctx.ellipse(cx, cy + h * 0.08 + b, w * 0.22, h * 0.16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = hexToRgba(darken(body, 0.3), 0.5); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(cx, cy + h * 0.08 + b, w * 0.22, h * 0.16, 0, 0, Math.PI * 2); ctx.stroke();
  // Abdomen pattern (hourglass marking)
  ctx.fillStyle = hexToRgba(0x8B0000, 0.5);
  ctx.beginPath();
  ctx.moveTo(cx, cy + h * 0.02 + b); ctx.lineTo(cx + w * 0.04, cy + h * 0.06 + b);
  ctx.lineTo(cx, cy + h * 0.08 + b); ctx.lineTo(cx - w * 0.04, cy + h * 0.06 + b);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx, cy + h * 0.08 + b); ctx.lineTo(cx + w * 0.04, cy + h * 0.12 + b);
  ctx.lineTo(cx, cy + h * 0.14 + b); ctx.lineTo(cx - w * 0.04, cy + h * 0.12 + b);
  ctx.fill();
  // Cephalothorax (front segment)
  const cephGrad = ctx.createRadialGradient(cx, cy - h * 0.12 + b, w * 0.01, cx, cy - h * 0.12 + b, w * 0.14);
  cephGrad.addColorStop(0, hexToRgba(lighten(body, 1.4)));
  cephGrad.addColorStop(1, hexToRgba(body));
  ctx.fillStyle = cephGrad;
  ctx.beginPath(); ctx.ellipse(cx, cy - h * 0.12 + b, w * 0.14, h * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  // Multiple eyes (8 dots in two rows)
  const eyes = [
    [-0.06, -0.18, 0.025], [0.06, -0.18, 0.025],
    [-0.04, -0.22, 0.018], [0.04, -0.22, 0.018],
    [-0.08, -0.15, 0.015], [0.08, -0.15, 0.015],
    [-0.02, -0.14, 0.012], [0.02, -0.14, 0.012],
  ];
  eyes.forEach(([ex, ey, er]) => {
    ellipse(ctx, cx + w * ex, cy + h * ey + b, w * er, h * er * 0.8, 0xFF0000);
    ellipse(ctx, cx + w * ex, cy + h * ey + b, w * er * 0.5, h * er * 0.4, 0x000000);
  });
  // Fangs/chelicerae
  ctx.strokeStyle = hexToRgba(0x4a0a0a); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cx - w * 0.04, cy - h * 0.04 + b); ctx.lineTo(cx - w * 0.06, cy + h * 0.02 + b); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + w * 0.04, cy - h * 0.04 + b); ctx.lineTo(cx + w * 0.06, cy + h * 0.02 + b); ctx.stroke();
  if (boss) drawBossCrown(ctx, cx, cy, w, h, body, frame);
}

/** BAT — large membranous wings, small body, big ears */
function drawBat(ctx, cx, cy, w, h, frame) {
  const body = 0x1C1C1C;
  const wingUp = frame === 1;
  const wingY = wingUp ? -h * 0.12 : 0;
  // Small furry body
  ellipse(ctx, cx, cy, w * 0.12, h * 0.14, body);
  // Fur texture on body
  ctx.strokeStyle = hexToRgba(lighten(body, 1.5), 0.3); ctx.lineWidth = 0.6;
  for (let i = 0; i < 5; i++) {
    const fx = cx - w * 0.06 + i * w * 0.03;
    ctx.beginPath(); ctx.moveTo(fx, cy - h * 0.04); ctx.lineTo(fx + w * 0.01, cy - h * 0.08); ctx.stroke();
  }
  // Large wings with finger bones
  for (let side = -1; side <= 1; side += 2) {
    // Wing membrane
    ctx.fillStyle = hexToRgba(lighten(body, 1.1), 0.7);
    ctx.beginPath();
    ctx.moveTo(cx + side * w * 0.06, cy - h * 0.04);
    ctx.bezierCurveTo(
      cx + side * w * 0.2, cy - h * 0.35 + wingY,
      cx + side * w * 0.4, cy - h * 0.25 + wingY,
      cx + side * w * 0.45, cy - h * 0.1 + wingY
    );
    ctx.bezierCurveTo(
      cx + side * w * 0.42, cy + h * 0.05 + wingY * 0.5,
      cx + side * w * 0.2, cy + h * 0.15,
      cx + side * w * 0.06, cy + h * 0.1
    );
    ctx.fill();
    // Wing finger bones
    ctx.strokeStyle = hexToRgba(darken(body, 0.5), 0.6); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx + side * w * 0.06, cy - h * 0.02);
    ctx.lineTo(cx + side * w * 0.35, cy - h * 0.28 + wingY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + side * w * 0.06, cy);
    ctx.lineTo(cx + side * w * 0.42, cy - h * 0.15 + wingY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + side * w * 0.06, cy + h * 0.02);
    ctx.lineTo(cx + side * w * 0.38, cy + h * 0.02 + wingY * 0.3); ctx.stroke();
  }
  // Head
  ellipse(ctx, cx, cy - h * 0.16, w * 0.09, h * 0.09, lighten(body, 1.1));
  // Large pointed ears
  ctx.fillStyle = hexToRgba(body);
  ctx.beginPath(); ctx.moveTo(cx - w * 0.06, cy - h * 0.2); ctx.lineTo(cx - w * 0.04, cy - h * 0.38);
  ctx.lineTo(cx, cy - h * 0.2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx, cy - h * 0.2); ctx.lineTo(cx + w * 0.04, cy - h * 0.38);
  ctx.lineTo(cx + w * 0.06, cy - h * 0.2); ctx.fill();
  // Inner ear
  ctx.fillStyle = hexToRgba(0x4a2a2a, 0.5);
  ctx.beginPath(); ctx.moveTo(cx - w * 0.04, cy - h * 0.22); ctx.lineTo(cx - w * 0.03, cy - h * 0.32);
  ctx.lineTo(cx - w * 0.01, cy - h * 0.22); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx + w * 0.01, cy - h * 0.22); ctx.lineTo(cx + w * 0.03, cy - h * 0.32);
  ctx.lineTo(cx + w * 0.04, cy - h * 0.22); ctx.fill();
  // Tiny eyes
  ellipse(ctx, cx - w * 0.03, cy - h * 0.17, w * 0.015, h * 0.015, 0xFF0000);
  ellipse(ctx, cx + w * 0.03, cy - h * 0.17, w * 0.015, h * 0.015, 0xFF0000);
  // Open mouth with fangs
  ctx.fillStyle = hexToRgba(0x2a0000);
  ctx.beginPath(); ctx.arc(cx, cy - h * 0.1, w * 0.03, 0, Math.PI); ctx.fill();
  ctx.fillStyle = hexToRgba(0xFFFFE0);
  ctx.beginPath(); ctx.moveTo(cx - w * 0.02, cy - h * 0.1); ctx.lineTo(cx - w * 0.015, cy - h * 0.06); ctx.lineTo(cx - w * 0.01, cy - h * 0.1); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx + w * 0.01, cy - h * 0.1); ctx.lineTo(cx + w * 0.015, cy - h * 0.06); ctx.lineTo(cx + w * 0.02, cy - h * 0.1); ctx.fill();
}

/** MINOTAUR — bull head on muscular humanoid body */
function drawMinotaur(ctx, cx, cy, w, h, frame) {
  const b = frame === 1 ? 2 : 0;
  const skin = 0x8B4513;
  // Shadow
  ellipse(ctx, cx, cy + h * 0.44, w * 0.35, h * 0.06, 0x000000, 0.25);
  // Legs (muscular, hooved)
  roundRect(ctx, cx - w * 0.16 + b, cy + h * 0.12, w * 0.14, h * 0.22, 3, skin);
  roundRect(ctx, cx + w * 0.04 - b, cy + h * 0.12, w * 0.14, h * 0.22, 3, skin);
  // Hooves
  roundRect(ctx, cx - w * 0.18 + b, cy + h * 0.32, w * 0.16, h * 0.08, 2, 0x2a1a0a);
  roundRect(ctx, cx + w * 0.02 - b, cy + h * 0.32, w * 0.16, h * 0.08, 2, 0x2a1a0a);
  // Hoof split
  ctx.strokeStyle = hexToRgba(0x1a0a00); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx - w * 0.1 + b, cy + h * 0.32); ctx.lineTo(cx - w * 0.1 + b, cy + h * 0.4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + w * 0.1 - b, cy + h * 0.32); ctx.lineTo(cx + w * 0.1 - b, cy + h * 0.4); ctx.stroke();
  // Massive muscular torso
  const torsoGrad = ctx.createLinearGradient(cx, cy - h * 0.15, cx, cy + h * 0.15);
  torsoGrad.addColorStop(0, hexToRgba(lighten(skin, 1.15)));
  torsoGrad.addColorStop(1, hexToRgba(darken(skin, 0.7)));
  ctx.fillStyle = torsoGrad;
  ctx.beginPath(); ctx.ellipse(cx, cy - h * 0.02, w * 0.26, h * 0.18, 0, 0, Math.PI * 2); ctx.fill();
  // Leather loincloth
  roundRect(ctx, cx - w * 0.14, cy + h * 0.06, w * 0.28, h * 0.1, 2, 0x5a3a1a);
  // Muscular arms
  ctx.strokeStyle = hexToRgba(skin); ctx.lineWidth = w * 0.09; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - w * 0.26, cy - h * 0.06); ctx.lineTo(cx - w * 0.32, cy + h * 0.12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + w * 0.26, cy - h * 0.06); ctx.lineTo(cx + w * 0.34, cy + h * 0.08); ctx.stroke();
  // Battle axe in right hand
  ctx.fillStyle = hexToRgba(0x5a3a1a);
  ctx.fillRect(cx + w * 0.32, cy - h * 0.12, w * 0.04, h * 0.28);
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.28, cy - h * 0.16);
  ctx.lineTo(cx + w * 0.42, cy - h * 0.22);
  ctx.lineTo(cx + w * 0.42, cy - h * 0.06);
  ctx.fillStyle = hexToRgba(0xA0A0A0); ctx.fill();
  // Thick neck
  roundRect(ctx, cx - w * 0.1, cy - h * 0.22, w * 0.2, h * 0.08, 2, skin);
  // Bull head
  roundRect(ctx, cx - w * 0.18, cy - h * 0.42, w * 0.36, h * 0.22, w * 0.06, skin);
  // Bovine snout (wider, protruding)
  roundRect(ctx, cx - w * 0.12, cy - h * 0.24, w * 0.24, h * 0.08, 4, darken(skin, 0.8));
  // Nostrils
  ellipse(ctx, cx - w * 0.04, cy - h * 0.2, w * 0.025, h * 0.02, 0x1a0a00);
  ellipse(ctx, cx + w * 0.04, cy - h * 0.2, w * 0.025, h * 0.02, 0x1a0a00);
  // Nose ring
  ctx.strokeStyle = hexToRgba(0xC0C0C0); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy - h * 0.18, w * 0.04, 0.3, Math.PI - 0.3); ctx.stroke();
  // Eyes
  ellipse(ctx, cx - w * 0.08, cy - h * 0.34, w * 0.04, h * 0.03, 0xFFFF00);
  ellipse(ctx, cx + w * 0.08, cy - h * 0.34, w * 0.04, h * 0.03, 0xFFFF00);
  ellipse(ctx, cx - w * 0.08, cy - h * 0.34, w * 0.02, h * 0.02, 0x1a1a00);
  ellipse(ctx, cx + w * 0.08, cy - h * 0.34, w * 0.02, h * 0.02, 0x1a1a00);
  // Bull horns (wide, curving)
  ctx.strokeStyle = hexToRgba(0xFFFACD); ctx.lineWidth = w * 0.035; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - w * 0.16, cy - h * 0.4);
  ctx.bezierCurveTo(cx - w * 0.28, cy - h * 0.46, cx - w * 0.34, cy - h * 0.42, cx - w * 0.32, cy - h * 0.35); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + w * 0.16, cy - h * 0.4);
  ctx.bezierCurveTo(cx + w * 0.28, cy - h * 0.46, cx + w * 0.34, cy - h * 0.42, cx + w * 0.32, cy - h * 0.35); ctx.stroke();
}

/** FIRE IMP — small demon with horns, bat wings, fire aura */
function drawFireImp(ctx, cx, cy, w, h, frame) {
  const b = frame === 1 ? 2 : 0;
  const skin = 0xFF4500;
  // Fire aura
  const fireAura = ctx.createRadialGradient(cx, cy, w * 0.05, cx, cy, w * 0.4);
  fireAura.addColorStop(0, 'rgba(255,200,50,0.3)');
  fireAura.addColorStop(0.5, 'rgba(255,100,0,0.15)');
  fireAura.addColorStop(1, 'rgba(255,0,0,0)');
  ctx.fillStyle = fireAura;
  ctx.beginPath(); ctx.arc(cx, cy, w * 0.4, 0, Math.PI * 2); ctx.fill();
  // Shadow
  ellipse(ctx, cx, cy + h * 0.42, w * 0.25, h * 0.04, 0x000000, 0.15);
  // Small legs
  roundRect(ctx, cx - w * 0.12 + b, cy + h * 0.12, w * 0.1, h * 0.2, 2, skin);
  roundRect(ctx, cx + w * 0.02 - b, cy + h * 0.12, w * 0.1, h * 0.2, 2, skin);
  // Pointed feet
  ctx.fillStyle = hexToRgba(darken(skin, 0.5));
  ctx.beginPath(); ctx.moveTo(cx - w * 0.14 + b, cy + h * 0.32); ctx.lineTo(cx - w * 0.06 + b, cy + h * 0.38);
  ctx.lineTo(cx + b, cy + h * 0.32); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx + w * 0.02 - b, cy + h * 0.32); ctx.lineTo(cx + w * 0.08 - b, cy + h * 0.38);
  ctx.lineTo(cx + w * 0.14 - b, cy + h * 0.32); ctx.fill();
  // Body
  const bodyGrad = ctx.createRadialGradient(cx, cy, w * 0.02, cx, cy, w * 0.18);
  bodyGrad.addColorStop(0, hexToRgba(lighten(skin, 1.4)));
  bodyGrad.addColorStop(1, hexToRgba(darken(skin, 0.6)));
  ctx.fillStyle = bodyGrad;
  ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.18, h * 0.14, 0, 0, Math.PI * 2); ctx.fill();
  // Arms
  ctx.strokeStyle = hexToRgba(skin); ctx.lineWidth = w * 0.06; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - w * 0.18, cy - h * 0.02); ctx.lineTo(cx - w * 0.28, cy + h * 0.1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + w * 0.18, cy - h * 0.02); ctx.lineTo(cx + w * 0.28, cy + h * 0.1); ctx.stroke();
  // Pointed tail
  ctx.strokeStyle = hexToRgba(darken(skin, 0.6)); ctx.lineWidth = w * 0.03;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.08, cy + h * 0.1);
  ctx.bezierCurveTo(cx - w * 0.2, cy + h * 0.2, cx - w * 0.25, cy + h * 0.05, cx - w * 0.22, cy + h * 0.15);
  ctx.stroke();
  // Arrow tail tip
  ctx.fillStyle = hexToRgba(darken(skin, 0.4));
  ctx.beginPath(); ctx.moveTo(cx - w * 0.24, cy + h * 0.12); ctx.lineTo(cx - w * 0.3, cy + h * 0.16);
  ctx.lineTo(cx - w * 0.22, cy + h * 0.18); ctx.fill();
  // Bat-like wings
  for (let side = -1; side <= 1; side += 2) {
    ctx.fillStyle = hexToRgba(darken(skin, 0.5), 0.6);
    ctx.beginPath();
    ctx.moveTo(cx + side * w * 0.12, cy - h * 0.06);
    ctx.bezierCurveTo(cx + side * w * 0.3, cy - h * 0.2, cx + side * w * 0.38, cy - h * 0.15, cx + side * w * 0.35, cy + h * 0.02);
    ctx.bezierCurveTo(cx + side * w * 0.25, cy + h * 0.08, cx + side * w * 0.15, cy + h * 0.04, cx + side * w * 0.12, cy + h * 0.02);
    ctx.fill();
  }
  // Head
  ellipse(ctx, cx, cy - h * 0.22, w * 0.16, h * 0.12, lighten(skin, 1.1));
  // Horns
  ctx.strokeStyle = hexToRgba(0x4a0000); ctx.lineWidth = w * 0.03; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - w * 0.1, cy - h * 0.3); ctx.lineTo(cx - w * 0.16, cy - h * 0.4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + w * 0.1, cy - h * 0.3); ctx.lineTo(cx + w * 0.16, cy - h * 0.4); ctx.stroke();
  // Mischievous grin
  ctx.strokeStyle = hexToRgba(0x4a0000); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(cx, cy - h * 0.16, w * 0.08, 0.1, Math.PI - 0.1); ctx.stroke();
  // Sharp teeth
  ctx.fillStyle = hexToRgba(0xFFFFE0);
  for (let t = 0; t < 3; t++) {
    const tx = cx - w * 0.04 + t * w * 0.04;
    ctx.beginPath(); ctx.moveTo(tx, cy - h * 0.16); ctx.lineTo(tx + w * 0.01, cy - h * 0.13);
    ctx.lineTo(tx + w * 0.02, cy - h * 0.16); ctx.fill();
  }
  // Eyes
  ellipse(ctx, cx - w * 0.06, cy - h * 0.24, w * 0.04, h * 0.035, 0xFFFF00);
  ellipse(ctx, cx + w * 0.06, cy - h * 0.24, w * 0.04, h * 0.035, 0xFFFF00);
  ellipse(ctx, cx - w * 0.06, cy - h * 0.24, w * 0.02, h * 0.02, 0x000000);
  ellipse(ctx, cx + w * 0.06, cy - h * 0.24, w * 0.02, h * 0.02, 0x000000);
}

/** CAVE TROLL — huge belly, small head, long arms, warty, carrying club */
function drawCaveTroll(ctx, cx, cy, w, h, frame) {
  const b = frame === 1 ? 2 : 0;
  const skin = 0x4A6A4A;
  // Shadow
  ellipse(ctx, cx, cy + h * 0.44, w * 0.38, h * 0.06, 0x000000, 0.25);
  // Short thick legs
  roundRect(ctx, cx - w * 0.16 + b, cy + h * 0.18, w * 0.14, h * 0.18, 3, skin);
  roundRect(ctx, cx + w * 0.04 - b, cy + h * 0.18, w * 0.14, h * 0.18, 3, skin);
  // Big flat feet
  roundRect(ctx, cx - w * 0.2 + b, cy + h * 0.34, w * 0.2, h * 0.08, 3, darken(skin, 0.7));
  roundRect(ctx, cx + w * 0.02 - b, cy + h * 0.34, w * 0.2, h * 0.08, 3, darken(skin, 0.7));
  // Huge round belly
  const bellyGrad = ctx.createRadialGradient(cx, cy + h * 0.04, w * 0.04, cx, cy + h * 0.04, w * 0.32);
  bellyGrad.addColorStop(0, hexToRgba(lighten(skin, 1.2)));
  bellyGrad.addColorStop(1, hexToRgba(darken(skin, 0.6)));
  ctx.fillStyle = bellyGrad;
  ctx.beginPath(); ctx.ellipse(cx, cy + h * 0.04, w * 0.3, h * 0.22, 0, 0, Math.PI * 2); ctx.fill();
  // Belly button
  ellipse(ctx, cx, cy + h * 0.08, w * 0.02, h * 0.02, darken(skin, 0.5));
  // Warty skin (bumps)
  const warts = [[-0.15, -0.02], [0.12, 0.06], [-0.08, 0.14], [0.18, -0.06], [-0.2, 0.1]];
  warts.forEach(([wx, wy]) => {
    ellipse(ctx, cx + w * wx, cy + h * wy, w * 0.02, h * 0.015, darken(skin, 0.6));
  });
  // Very long arms reaching to knees
  ctx.strokeStyle = hexToRgba(skin); ctx.lineWidth = w * 0.08; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - w * 0.28, cy - h * 0.06);
  ctx.bezierCurveTo(cx - w * 0.36, cy + h * 0.1, cx - w * 0.38, cy + h * 0.2, cx - w * 0.34, cy + h * 0.28);
  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + w * 0.28, cy - h * 0.06);
  ctx.bezierCurveTo(cx + w * 0.36, cy + h * 0.1, cx + w * 0.38, cy + h * 0.2, cx + w * 0.34, cy + h * 0.22);
  ctx.stroke();
  // Big hands
  ellipse(ctx, cx - w * 0.34, cy + h * 0.3, w * 0.06, h * 0.05, darken(skin, 0.8));
  ellipse(ctx, cx + w * 0.34, cy + h * 0.24, w * 0.06, h * 0.05, darken(skin, 0.8));
  // Wooden club in left hand
  ctx.fillStyle = hexToRgba(0x5a3a1a);
  ctx.save();
  ctx.translate(cx - w * 0.34, cy + h * 0.28);
  ctx.rotate(-0.4);
  ctx.fillRect(-w * 0.02, -h * 0.3, w * 0.05, h * 0.32);
  roundRect(ctx, -w * 0.04, -h * 0.34, w * 0.1, h * 0.08, 3, 0x4a2a0a);
  ctx.restore();
  // Disproportionately small head
  roundRect(ctx, cx - w * 0.1, cy - h * 0.3, w * 0.2, h * 0.16, w * 0.04, skin);
  strokeRound(ctx, cx - w * 0.1, cy - h * 0.3, w * 0.2, h * 0.16, w * 0.04, darken(skin, 0.4), 1);
  // Beady eyes
  ellipse(ctx, cx - w * 0.04, cy - h * 0.24, w * 0.025, h * 0.02, 0xFFFF00);
  ellipse(ctx, cx + w * 0.04, cy - h * 0.24, w * 0.025, h * 0.02, 0xFFFF00);
  ellipse(ctx, cx - w * 0.04, cy - h * 0.24, w * 0.012, h * 0.012, 0x000000);
  ellipse(ctx, cx + w * 0.04, cy - h * 0.24, w * 0.012, h * 0.012, 0x000000);
  // Wide nose
  ellipse(ctx, cx, cy - h * 0.2, w * 0.04, h * 0.025, darken(skin, 0.6));
  // Underbite mouth
  roundRect(ctx, cx - w * 0.06, cy - h * 0.17, w * 0.12, h * 0.03, 2, darken(skin, 0.5));
}

/** CURSED KNIGHT — dark armored humanoid with glowing red eyes */
function drawCursedKnight(ctx, cx, cy, w, h, frame) {
  const b = frame === 1 ? 2 : 0;
  const armor = 0x1A1A3A, skin = 0x2C2C4A;
  // Shadow
  ellipse(ctx, cx, cy + h * 0.44, w * 0.32, h * 0.05, 0x000000, 0.25);
  // Armored legs
  roundRect(ctx, cx - w * 0.16 + b, cy + h * 0.14, w * 0.14, h * 0.24, 2, armor);
  roundRect(ctx, cx + w * 0.04 - b, cy + h * 0.14, w * 0.14, h * 0.24, 2, armor);
  // Armored boots
  roundRect(ctx, cx - w * 0.18 + b, cy + h * 0.34, w * 0.18, h * 0.08, 2, darken(armor, 0.6));
  roundRect(ctx, cx + w * 0.02 - b, cy + h * 0.34, w * 0.18, h * 0.08, 2, darken(armor, 0.6));
  // Armored torso
  gradRect(ctx, cx - w * 0.22, cy - h * 0.16, w * 0.44, h * 0.34, lighten(armor, 1.2), darken(armor, 0.6));
  strokeRound(ctx, cx - w * 0.22, cy - h * 0.16, w * 0.44, h * 0.34, 3, lighten(armor, 1.4), 1);
  // Chest cross emblem
  ctx.strokeStyle = hexToRgba(0xFF0000, 0.5); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cx, cy - h * 0.1); ctx.lineTo(cx, cy + h * 0.06); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - w * 0.08, cy - h * 0.02); ctx.lineTo(cx + w * 0.08, cy - h * 0.02); ctx.stroke();
  // Armored arms
  roundRect(ctx, cx - w * 0.34, cy - h * 0.12, w * 0.12, h * 0.28, 2, armor);
  roundRect(ctx, cx + w * 0.22, cy - h * 0.12, w * 0.12, h * 0.28, 2, armor);
  // Gauntlets
  roundRect(ctx, cx - w * 0.36, cy + h * 0.12, w * 0.14, h * 0.06, 2, darken(armor, 0.6));
  roundRect(ctx, cx + w * 0.22, cy + h * 0.12, w * 0.14, h * 0.06, 2, darken(armor, 0.6));
  // Sword
  ctx.fillStyle = hexToRgba(0x6a6a8a);
  ctx.fillRect(cx + w * 0.32, cy - h * 0.28, w * 0.04, h * 0.44);
  ctx.fillStyle = hexToRgba(0x4a4a6a);
  ctx.fillRect(cx + w * 0.28, cy + h * 0.1, w * 0.12, h * 0.04);
  // Cursed glow on sword
  const swordGlow = ctx.createRadialGradient(cx + w * 0.34, cy - h * 0.1, 0, cx + w * 0.34, cy - h * 0.1, w * 0.08);
  swordGlow.addColorStop(0, 'rgba(255,0,0,0.3)'); swordGlow.addColorStop(1, 'rgba(255,0,0,0)');
  ctx.fillStyle = swordGlow; ctx.beginPath(); ctx.arc(cx + w * 0.34, cy - h * 0.1, w * 0.08, 0, Math.PI * 2); ctx.fill();
  // Helmet
  roundRect(ctx, cx - w * 0.18, cy - h * 0.44, w * 0.36, h * 0.3, 3, armor);
  strokeRound(ctx, cx - w * 0.18, cy - h * 0.44, w * 0.36, h * 0.3, 3, lighten(armor, 1.3), 1);
  // Visor slit
  ctx.fillStyle = hexToRgba(0x0a0a0a);
  ctx.fillRect(cx - w * 0.12, cy - h * 0.32, w * 0.24, h * 0.04);
  // Glowing red eyes behind visor
  const vGlow1 = ctx.createRadialGradient(cx - w * 0.06, cy - h * 0.3, 0, cx - w * 0.06, cy - h * 0.3, w * 0.04);
  vGlow1.addColorStop(0, 'rgba(255,0,0,0.9)'); vGlow1.addColorStop(1, 'rgba(255,0,0,0)');
  ctx.fillStyle = vGlow1; ctx.beginPath(); ctx.arc(cx - w * 0.06, cy - h * 0.3, w * 0.04, 0, Math.PI * 2); ctx.fill();
  const vGlow2 = ctx.createRadialGradient(cx + w * 0.06, cy - h * 0.3, 0, cx + w * 0.06, cy - h * 0.3, w * 0.04);
  vGlow2.addColorStop(0, 'rgba(255,0,0,0.9)'); vGlow2.addColorStop(1, 'rgba(255,0,0,0)');
  ctx.fillStyle = vGlow2; ctx.beginPath(); ctx.arc(cx + w * 0.06, cy - h * 0.3, w * 0.04, 0, Math.PI * 2); ctx.fill();
  // Helmet plume
  ctx.strokeStyle = hexToRgba(0x8B0000); ctx.lineWidth = w * 0.04; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx, cy - h * 0.44); ctx.bezierCurveTo(cx + w * 0.04, cy - h * 0.52, cx - w * 0.06, cy - h * 0.54, cx, cy - h * 0.5); ctx.stroke();
}

/** SHADOW DEMON — dark ethereal humanoid with glowing purple eyes */
function drawShadowDemon(ctx, cx, cy, w, h, frame) {
  const b = frame === 1 ? 2 : 0;
  const body = 0x2A0A3A;
  // Dark aura
  const aura = ctx.createRadialGradient(cx, cy, w * 0.05, cx, cy, w * 0.42);
  aura.addColorStop(0, hexToRgba(body, 0.4));
  aura.addColorStop(1, hexToRgba(body, 0));
  ctx.fillStyle = aura;
  ctx.beginPath(); ctx.arc(cx, cy, w * 0.42, 0, Math.PI * 2); ctx.fill();
  // Shadow (faint)
  ellipse(ctx, cx, cy + h * 0.42, w * 0.28, h * 0.04, 0x000000, 0.15);
  // Smoky legs (fade out at bottom)
  const legGrad = ctx.createLinearGradient(cx, cy + h * 0.1, cx, cy + h * 0.4);
  legGrad.addColorStop(0, hexToRgba(body, 0.6));
  legGrad.addColorStop(1, hexToRgba(body, 0));
  ctx.fillStyle = legGrad;
  ctx.fillRect(cx - w * 0.18, cy + h * 0.1, w * 0.14, h * 0.3);
  ctx.fillRect(cx + w * 0.04, cy + h * 0.1, w * 0.14, h * 0.3);
  // Body
  const bodyGrad = ctx.createRadialGradient(cx, cy - h * 0.02, w * 0.03, cx, cy, w * 0.22);
  bodyGrad.addColorStop(0, hexToRgba(lighten(body, 1.3), 0.7));
  bodyGrad.addColorStop(1, hexToRgba(body, 0.5));
  ctx.fillStyle = bodyGrad;
  ctx.beginPath(); ctx.ellipse(cx, cy - h * 0.02, w * 0.22, h * 0.18, 0, 0, Math.PI * 2); ctx.fill();
  // Clawed arms
  ctx.strokeStyle = hexToRgba(body, 0.7); ctx.lineWidth = w * 0.05; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - w * 0.22, cy - h * 0.06);
  ctx.bezierCurveTo(cx - w * 0.32, cy + h * 0.02, cx - w * 0.36, cy + h * 0.1, cx - w * 0.34, cy + h * 0.14);
  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + w * 0.22, cy - h * 0.06);
  ctx.bezierCurveTo(cx + w * 0.32, cy + h * 0.02, cx + w * 0.36, cy + h * 0.1, cx + w * 0.34, cy + h * 0.14);
  ctx.stroke();
  // Claws
  ctx.strokeStyle = hexToRgba(lighten(body, 1.5), 0.6); ctx.lineWidth = 1;
  for (let c = 0; c < 3; c++) {
    ctx.beginPath(); ctx.moveTo(cx - w * 0.34, cy + h * 0.13); ctx.lineTo(cx - w * 0.38 - c * w * 0.02, cy + h * 0.18 + c * h * 0.01); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + w * 0.34, cy + h * 0.13); ctx.lineTo(cx + w * 0.38 + c * w * 0.02, cy + h * 0.18 + c * h * 0.01); ctx.stroke();
  }
  // Head
  ellipse(ctx, cx, cy - h * 0.26, w * 0.16, h * 0.14, body, 0.8);
  // Horns
  ctx.strokeStyle = hexToRgba(lighten(body, 1.2)); ctx.lineWidth = w * 0.025;
  ctx.beginPath(); ctx.moveTo(cx - w * 0.1, cy - h * 0.35); ctx.lineTo(cx - w * 0.18, cy - h * 0.46); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + w * 0.1, cy - h * 0.35); ctx.lineTo(cx + w * 0.18, cy - h * 0.46); ctx.stroke();
  // Glowing purple eyes
  const eg1 = ctx.createRadialGradient(cx - w * 0.06, cy - h * 0.28, 0, cx - w * 0.06, cy - h * 0.28, w * 0.05);
  eg1.addColorStop(0, 'rgba(255,0,255,0.95)'); eg1.addColorStop(1, 'rgba(255,0,255,0)');
  ctx.fillStyle = eg1; ctx.beginPath(); ctx.arc(cx - w * 0.06, cy - h * 0.28, w * 0.05, 0, Math.PI * 2); ctx.fill();
  const eg2 = ctx.createRadialGradient(cx + w * 0.06, cy - h * 0.28, 0, cx + w * 0.06, cy - h * 0.28, w * 0.05);
  eg2.addColorStop(0, 'rgba(255,0,255,0.95)'); eg2.addColorStop(1, 'rgba(255,0,255,0)');
  ctx.fillStyle = eg2; ctx.beginPath(); ctx.arc(cx + w * 0.06, cy - h * 0.28, w * 0.05, 0, Math.PI * 2); ctx.fill();
}

/** ELEMENTAL — pure energy body with flame/ice tendrils */
function drawElemental(ctx, cx, cy, w, h, frame, bodyColor) {
  const body = bodyColor || 0xFF4500;
  // Outer glow
  const grad = ctx.createRadialGradient(cx, cy, w * 0.02, cx, cy, w * 0.4);
  grad.addColorStop(0, hexToRgba(lighten(body, 2.0), 0.9));
  grad.addColorStop(0.25, hexToRgba(lighten(body, 1.5), 0.6));
  grad.addColorStop(0.6, hexToRgba(body, 0.35));
  grad.addColorStop(1, hexToRgba(darken(body, 0.5), 0.05));
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.38, h * 0.38, 0, 0, Math.PI * 2); ctx.fill();
  // Inner energy body shape
  ctx.fillStyle = hexToRgba(lighten(body, 1.6), 0.7);
  ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.2, h * 0.25, 0, 0, Math.PI * 2); ctx.fill();
  // Energy tendrils
  ctx.lineWidth = w * 0.04; ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + (frame * 0.4);
    const tx = cx + Math.cos(angle) * w * 0.12;
    const ty = cy + Math.sin(angle) * h * 0.12;
    const ex = cx + Math.cos(angle) * w * 0.35;
    const ey = cy + Math.sin(angle) * h * 0.35 - h * 0.05;
    ctx.strokeStyle = hexToRgba(body, 0.4 + Math.sin(i) * 0.2);
    ctx.beginPath(); ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(tx + Math.cos(angle + 0.5) * w * 0.1, ty + Math.sin(angle + 0.5) * h * 0.1, ex, ey);
    ctx.stroke();
  }
  // Bright core
  ellipse(ctx, cx, cy, w * 0.08, h * 0.08, 0xFFFFFF, 0.9);
  // Face (dark voids in the energy)
  ellipse(ctx, cx - w * 0.06, cy - h * 0.06, w * 0.04, h * 0.035, 0x000000, 0.5);
  ellipse(ctx, cx + w * 0.06, cy - h * 0.06, w * 0.04, h * 0.035, 0x000000, 0.5);
  ctx.fillStyle = hexToRgba(0x000000, 0.35);
  ctx.fillRect(cx - w * 0.06, cy + h * 0.04, w * 0.12, h * 0.025);
  drawBossCrown(ctx, cx, cy, w, h, body, frame);
}

/** LAVA GOLEM — orange/red golem with lava cracks glowing */
function drawLavaGolem(ctx, cx, cy, w, h, frame) {
  const b = frame === 1 ? 2 : 0;
  const rock = 0x4a2a0a;
  // Shadow
  ellipse(ctx, cx, cy + h * 0.44, w * 0.36, h * 0.06, 0x000000, 0.25);
  // Legs
  roundRect(ctx, cx - w * 0.18 + b, cy + h * 0.12, w * 0.15, h * 0.28, 2, rock);
  roundRect(ctx, cx + w * 0.04 - b, cy + h * 0.12, w * 0.15, h * 0.28, 2, rock);
  // Feet
  roundRect(ctx, cx - w * 0.22 + b, cy + h * 0.36, w * 0.2, h * 0.07, 2, darken(rock, 0.6));
  roundRect(ctx, cx + w * 0.02 - b, cy + h * 0.36, w * 0.2, h * 0.07, 2, darken(rock, 0.6));
  // Body
  roundRect(ctx, cx - w * 0.26, cy - h * 0.18, w * 0.52, h * 0.34, 3, rock);
  // Lava cracks (glowing orange lines)
  ctx.strokeStyle = hexToRgba(0xFF6600, 0.8); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cx - w * 0.1, cy - h * 0.16); ctx.lineTo(cx + w * 0.05, cy + h * 0.06); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + w * 0.1, cy - h * 0.1); ctx.lineTo(cx + w * 0.2, cy + h * 0.1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - w * 0.2, cy); ctx.lineTo(cx - w * 0.05, cy + h * 0.12); ctx.stroke();
  // Lava glow
  const lavaGlow = ctx.createRadialGradient(cx, cy, w * 0.04, cx, cy, w * 0.28);
  lavaGlow.addColorStop(0, hexToRgba(0xFF4500, 0.3));
  lavaGlow.addColorStop(1, hexToRgba(0xFF4500, 0));
  ctx.fillStyle = lavaGlow; ctx.beginPath(); ctx.arc(cx, cy, w * 0.28, 0, Math.PI * 2); ctx.fill();
  // Arms
  roundRect(ctx, cx - w * 0.38, cy - h * 0.12, w * 0.12, h * 0.28, 3, rock);
  roundRect(ctx, cx + w * 0.26, cy - h * 0.12, w * 0.12, h * 0.28, 3, rock);
  // Fists
  roundRect(ctx, cx - w * 0.4, cy + h * 0.12, w * 0.16, h * 0.1, 3, darken(rock, 0.6));
  roundRect(ctx, cx + w * 0.24, cy + h * 0.12, w * 0.16, h * 0.1, 3, darken(rock, 0.6));
  // Head
  roundRect(ctx, cx - w * 0.16, cy - h * 0.42, w * 0.32, h * 0.26, 2, rock);
  // Glowing eyes
  const eg1 = ctx.createRadialGradient(cx - w * 0.06, cy - h * 0.32, 0, cx - w * 0.06, cy - h * 0.32, w * 0.04);
  eg1.addColorStop(0, hexToRgba(0xFFD700, 0.95)); eg1.addColorStop(1, hexToRgba(0xFFD700, 0));
  ctx.fillStyle = eg1; ctx.beginPath(); ctx.arc(cx - w * 0.06, cy - h * 0.32, w * 0.04, 0, Math.PI * 2); ctx.fill();
  const eg2 = ctx.createRadialGradient(cx + w * 0.06, cy - h * 0.32, 0, cx + w * 0.06, cy - h * 0.32, w * 0.04);
  eg2.addColorStop(0, hexToRgba(0xFFD700, 0.95)); eg2.addColorStop(1, hexToRgba(0xFFD700, 0));
  ctx.fillStyle = eg2; ctx.beginPath(); ctx.arc(cx + w * 0.06, cy - h * 0.32, w * 0.04, 0, Math.PI * 2); ctx.fill();
  // Lava crack on head
  ctx.strokeStyle = hexToRgba(0xFF6600, 0.7); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx, cy - h * 0.4); ctx.lineTo(cx + w * 0.04, cy - h * 0.28); ctx.stroke();
}

/** ABYSSAL FIEND — dark demonic with glowing red details */
function drawAbyssalFiend(ctx, cx, cy, w, h, frame) {
  const b = frame === 1 ? 2 : 0;
  const body = 0x4A0028;
  // Dark aura
  const aura = ctx.createRadialGradient(cx, cy, w * 0.04, cx, cy, w * 0.4);
  aura.addColorStop(0, hexToRgba(body, 0.3)); aura.addColorStop(1, hexToRgba(body, 0));
  ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(cx, cy, w * 0.4, 0, Math.PI * 2); ctx.fill();
  // Shadow
  ellipse(ctx, cx, cy + h * 0.44, w * 0.32, h * 0.05, 0x000000, 0.2);
  // Legs
  roundRect(ctx, cx - w * 0.16 + b, cy + h * 0.14, w * 0.13, h * 0.24, 2, body);
  roundRect(ctx, cx + w * 0.04 - b, cy + h * 0.14, w * 0.13, h * 0.24, 2, body);
  // Clawed feet
  for (let side = -1; side <= 1; side += 2) {
    const fx = side === -1 ? cx - w * 0.1 + b : cx + w * 0.1 - b;
    ctx.fillStyle = hexToRgba(darken(body, 0.5));
    for (let c = 0; c < 3; c++) {
      ctx.beginPath(); ctx.moveTo(fx - w * 0.04 + c * w * 0.04, cy + h * 0.38);
      ctx.lineTo(fx - w * 0.03 + c * w * 0.04, cy + h * 0.44);
      ctx.lineTo(fx - w * 0.02 + c * w * 0.04, cy + h * 0.38); ctx.fill();
    }
  }
  // Body
  const bodyGrad = ctx.createRadialGradient(cx, cy, w * 0.03, cx, cy, w * 0.22);
  bodyGrad.addColorStop(0, hexToRgba(lighten(body, 1.3)));
  bodyGrad.addColorStop(1, hexToRgba(darken(body, 0.6)));
  ctx.fillStyle = bodyGrad;
  ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.22, h * 0.18, 0, 0, Math.PI * 2); ctx.fill();
  // Glowing runes on body
  ctx.strokeStyle = hexToRgba(0xFF0000, 0.5); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx - w * 0.08, cy - h * 0.06); ctx.lineTo(cx, cy + h * 0.06); ctx.lineTo(cx + w * 0.08, cy - h * 0.06); ctx.stroke();
  // Arms with claws
  ctx.strokeStyle = hexToRgba(body); ctx.lineWidth = w * 0.06; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - w * 0.22, cy - h * 0.06); ctx.lineTo(cx - w * 0.32, cy + h * 0.12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + w * 0.22, cy - h * 0.06); ctx.lineTo(cx + w * 0.32, cy + h * 0.12); ctx.stroke();
  // Demon sword
  ctx.fillStyle = hexToRgba(0x2a0a0a);
  ctx.fillRect(cx + w * 0.3, cy - h * 0.2, w * 0.04, h * 0.36);
  const sGlow = ctx.createRadialGradient(cx + w * 0.32, cy - h * 0.05, 0, cx + w * 0.32, cy - h * 0.05, w * 0.06);
  sGlow.addColorStop(0, 'rgba(255,0,0,0.4)'); sGlow.addColorStop(1, 'rgba(255,0,0,0)');
  ctx.fillStyle = sGlow; ctx.beginPath(); ctx.arc(cx + w * 0.32, cy - h * 0.05, w * 0.06, 0, Math.PI * 2); ctx.fill();
  // Head with horns
  ellipse(ctx, cx, cy - h * 0.26, w * 0.16, h * 0.14, body);
  ctx.strokeStyle = hexToRgba(darken(body, 0.5)); ctx.lineWidth = w * 0.025;
  ctx.beginPath(); ctx.moveTo(cx - w * 0.12, cy - h * 0.34); ctx.lineTo(cx - w * 0.2, cy - h * 0.46); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + w * 0.12, cy - h * 0.34); ctx.lineTo(cx + w * 0.2, cy - h * 0.46); ctx.stroke();
  // Glowing red eyes
  const eg1 = ctx.createRadialGradient(cx - w * 0.06, cy - h * 0.28, 0, cx - w * 0.06, cy - h * 0.28, w * 0.04);
  eg1.addColorStop(0, 'rgba(255,0,0,0.95)'); eg1.addColorStop(1, 'rgba(255,0,0,0)');
  ctx.fillStyle = eg1; ctx.beginPath(); ctx.arc(cx - w * 0.06, cy - h * 0.28, w * 0.04, 0, Math.PI * 2); ctx.fill();
  const eg2 = ctx.createRadialGradient(cx + w * 0.06, cy - h * 0.28, 0, cx + w * 0.06, cy - h * 0.28, w * 0.04);
  eg2.addColorStop(0, 'rgba(255,0,0,0.95)'); eg2.addColorStop(1, 'rgba(255,0,0,0)');
  ctx.fillStyle = eg2; ctx.beginPath(); ctx.arc(cx + w * 0.06, cy - h * 0.28, w * 0.04, 0, Math.PI * 2); ctx.fill();
}

/** DUNGEON BOSS 1 — Giant Rat */
function drawGiantRat(ctx, cx, cy, w, h, frame) {
  const b = frame === 1 ? 2 : 0;
  const fur = 0x8B7060;
  // Shadow
  ellipse(ctx, cx, cy + h * 0.42, w * 0.38, h * 0.06, 0x000000, 0.2);
  // Long tail
  ctx.strokeStyle = hexToRgba(0xBFA090); ctx.lineWidth = w * 0.03; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx + w * 0.3, cy + h * 0.05);
  ctx.bezierCurveTo(cx + w * 0.42, cy - h * 0.1, cx + w * 0.46, cy + h * 0.1, cx + w * 0.44, cy + h * 0.2);
  ctx.stroke();
  // Body (rat-shaped, elongated)
  const bodyGrad = ctx.createRadialGradient(cx, cy + b, w * 0.06, cx, cy + b, w * 0.32);
  bodyGrad.addColorStop(0, hexToRgba(lighten(fur, 1.2)));
  bodyGrad.addColorStop(1, hexToRgba(darken(fur, 0.6)));
  ctx.fillStyle = bodyGrad;
  ctx.beginPath(); ctx.ellipse(cx, cy + b, w * 0.3, h * 0.18, 0, 0, Math.PI * 2); ctx.fill();
  // Four stubby legs
  ctx.fillStyle = hexToRgba(darken(fur, 0.7));
  ctx.fillRect(cx - w * 0.2 + b, cy + h * 0.1, w * 0.07, h * 0.22);
  ctx.fillRect(cx - w * 0.08 - b, cy + h * 0.1, w * 0.07, h * 0.22);
  ctx.fillRect(cx + w * 0.08 + b, cy + h * 0.1, w * 0.07, h * 0.22);
  ctx.fillRect(cx + w * 0.18 - b, cy + h * 0.1, w * 0.07, h * 0.22);
  // Head
  roundRect(ctx, cx - w * 0.38, cy - h * 0.16 + b, w * 0.22, h * 0.22, 4, fur);
  // Pointed snout
  ctx.fillStyle = hexToRgba(darken(fur, 0.8));
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.36, cy - h * 0.04 + b);
  ctx.lineTo(cx - w * 0.46, cy - h * 0.02 + b);
  ctx.lineTo(cx - w * 0.36, cy + h * 0.02 + b);
  ctx.fill();
  // Nose
  ellipse(ctx, cx - w * 0.44, cy - h * 0.02 + b, w * 0.02, h * 0.018, 0x1a1a1a);
  // Round ears
  ellipse(ctx, cx - w * 0.34, cy - h * 0.2 + b, w * 0.06, h * 0.06, fur);
  ellipse(ctx, cx - w * 0.22, cy - h * 0.2 + b, w * 0.06, h * 0.06, fur);
  ellipse(ctx, cx - w * 0.34, cy - h * 0.2 + b, w * 0.04, h * 0.04, lighten(fur, 1.3));
  ellipse(ctx, cx - w * 0.22, cy - h * 0.2 + b, w * 0.04, h * 0.04, lighten(fur, 1.3));
  // Beady eyes
  ellipse(ctx, cx - w * 0.32, cy - h * 0.08 + b, w * 0.03, h * 0.025, 0x000000);
  ellipse(ctx, cx - w * 0.24, cy - h * 0.08 + b, w * 0.03, h * 0.025, 0x000000);
  // Whiskers
  ctx.strokeStyle = hexToRgba(0xCCBBAA, 0.5); ctx.lineWidth = 0.6;
  for (let wh = 0; wh < 3; wh++) {
    ctx.beginPath(); ctx.moveTo(cx - w * 0.38, cy - h * 0.02 + wh * h * 0.02 + b);
    ctx.lineTo(cx - w * 0.46, cy - h * 0.06 + wh * h * 0.04 + b); ctx.stroke();
  }
  // Teeth
  ctx.fillStyle = hexToRgba(0xFFFFE0);
  ctx.beginPath(); ctx.moveTo(cx - w * 0.38, cy + h * 0.01 + b);
  ctx.lineTo(cx - w * 0.37, cy + h * 0.05 + b);
  ctx.lineTo(cx - w * 0.36, cy + h * 0.01 + b); ctx.fill();
  drawBossCrown(ctx, cx - w * 0.28, cy - h * 0.08, w, h, fur, frame);
}

/** DUNGEON BOSS 4 — Plague Doctor (bird-mask humanoid) */
function drawPlagueDoctor(ctx, cx, cy, w, h, frame) {
  const b = frame === 1 ? 2 : 0;
  const coat = 0x2a2a2a;
  // Shadow
  ellipse(ctx, cx, cy + h * 0.44, w * 0.3, h * 0.05, 0x000000, 0.25);
  // Long dark coat (legs hidden)
  const coatGrad = ctx.createLinearGradient(cx, cy - h * 0.1, cx, cy + h * 0.4);
  coatGrad.addColorStop(0, hexToRgba(lighten(coat, 1.2)));
  coatGrad.addColorStop(1, hexToRgba(darken(coat, 0.5)));
  ctx.fillStyle = coatGrad;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.18, cy - h * 0.1);
  ctx.lineTo(cx - w * 0.24, cy + h * 0.38);
  ctx.lineTo(cx + w * 0.24, cy + h * 0.38);
  ctx.lineTo(cx + w * 0.18, cy - h * 0.1);
  ctx.fill();
  // Coat buttons
  for (let bt = 0; bt < 4; bt++) {
    ellipse(ctx, cx, cy - h * 0.04 + bt * h * 0.08, w * 0.015, h * 0.012, 0x808080);
  }
  // Arms
  ctx.strokeStyle = hexToRgba(coat); ctx.lineWidth = w * 0.07; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - w * 0.18, cy - h * 0.04); ctx.lineTo(cx - w * 0.28, cy + h * 0.14); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + w * 0.18, cy - h * 0.04); ctx.lineTo(cx + w * 0.28, cy + h * 0.14); ctx.stroke();
  // Gloved hands
  ellipse(ctx, cx - w * 0.28, cy + h * 0.16, w * 0.04, h * 0.03, 0x1a1a1a);
  ellipse(ctx, cx + w * 0.28, cy + h * 0.16, w * 0.04, h * 0.03, 0x1a1a1a);
  // Wide-brimmed hat
  roundRect(ctx, cx - w * 0.28, cy - h * 0.36, w * 0.56, h * 0.04, 2, 0x1a1a1a);
  roundRect(ctx, cx - w * 0.16, cy - h * 0.46, w * 0.32, h * 0.12, 3, 0x1a1a1a);
  // Bird-mask head
  roundRect(ctx, cx - w * 0.14, cy - h * 0.34, w * 0.28, h * 0.18, 4, 0xF5F5DC);
  // Beak (long, pointed)
  ctx.fillStyle = hexToRgba(0xF5F5DC);
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.14, cy - h * 0.28);
  ctx.lineTo(cx + w * 0.36, cy - h * 0.24);
  ctx.lineTo(cx + w * 0.14, cy - h * 0.2);
  ctx.fill();
  ctx.strokeStyle = hexToRgba(darken(0xF5F5DC, 0.5)); ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.14, cy - h * 0.28);
  ctx.lineTo(cx + w * 0.36, cy - h * 0.24);
  ctx.lineTo(cx + w * 0.14, cy - h * 0.2);
  ctx.closePath(); ctx.stroke();
  // Goggle eyes (round dark circles on mask)
  ellipse(ctx, cx - w * 0.04, cy - h * 0.28, w * 0.04, h * 0.04, 0x0a0a0a);
  ellipse(ctx, cx + w * 0.06, cy - h * 0.28, w * 0.04, h * 0.04, 0x0a0a0a);
  // Red glow in goggles
  ellipse(ctx, cx - w * 0.04, cy - h * 0.28, w * 0.02, h * 0.02, 0xFF0000, 0.7);
  ellipse(ctx, cx + w * 0.06, cy - h * 0.28, w * 0.02, h * 0.02, 0xFF0000, 0.7);
  drawBossCrown(ctx, cx, cy, w, h, coat, frame);
}

/** DUNGEON BOSS 5 — Blood Knight (heavy armor, red glow) */
function drawBloodKnight(ctx, cx, cy, w, h, frame) {
  const b = frame === 1 ? 2 : 0;
  const armor = 0x4A0000;
  // Red glow aura
  const aura = ctx.createRadialGradient(cx, cy, w * 0.05, cx, cy, w * 0.45);
  aura.addColorStop(0, 'rgba(255,0,0,0.2)'); aura.addColorStop(1, 'rgba(255,0,0,0)');
  ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(cx, cy, w * 0.45, 0, Math.PI * 2); ctx.fill();
  drawCursedKnight(ctx, cx, cy, w, h, frame);
  // Override with blood red palette over the existing drawing
  const bloodGlow = ctx.createRadialGradient(cx, cy, w * 0.04, cx, cy, w * 0.35);
  bloodGlow.addColorStop(0, 'rgba(139,0,0,0.15)'); bloodGlow.addColorStop(1, 'rgba(139,0,0,0)');
  ctx.fillStyle = bloodGlow; ctx.beginPath(); ctx.arc(cx, cy, w * 0.35, 0, Math.PI * 2); ctx.fill();
  drawBossCrown(ctx, cx, cy, w, h, 0x8B0000, frame);
}

/** DUNGEON BOSS 6 — Necromancer (robed, floating skulls) */
function drawNecromancer(ctx, cx, cy, w, h, frame) {
  // Draw base wraith body
  drawWraith(ctx, cx, cy, w, h, frame, true, 0x00FF00);
  // Floating skulls around
  const skullPositions = [
    [cx - w * 0.3, cy - h * 0.1], [cx + w * 0.3, cy - h * 0.05], [cx, cy + h * 0.2]
  ];
  skullPositions.forEach(([sx, sy], i) => {
    const bob = Math.sin(frame * Math.PI + i) * 2;
    // Mini skull
    ellipse(ctx, sx, sy + bob, w * 0.04, h * 0.035, 0xF5F5DC);
    ellipse(ctx, sx - w * 0.015, sy - h * 0.01 + bob, w * 0.01, h * 0.01, 0x0a0a0a);
    ellipse(ctx, sx + w * 0.015, sy - h * 0.01 + bob, w * 0.01, h * 0.01, 0x0a0a0a);
    // Green glow
    const sg = ctx.createRadialGradient(sx, sy + bob, 0, sx, sy + bob, w * 0.06);
    sg.addColorStop(0, 'rgba(0,255,0,0.3)'); sg.addColorStop(1, 'rgba(0,255,0,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy + bob, w * 0.06, 0, Math.PI * 2); ctx.fill();
  });
}

/** DUNGEON BOSS 8 — Storm Giant (large humanoid with lightning) */
function drawStormGiant(ctx, cx, cy, w, h, frame) {
  const b = frame === 1 ? 2 : 0;
  const skin = 0x4a5a8a;
  // Shadow
  ellipse(ctx, cx, cy + h * 0.44, w * 0.38, h * 0.06, 0x000000, 0.25);
  // Legs
  roundRect(ctx, cx - w * 0.18 + b, cy + h * 0.14, w * 0.16, h * 0.24, 3, skin);
  roundRect(ctx, cx + w * 0.04 - b, cy + h * 0.14, w * 0.16, h * 0.24, 3, skin);
  // Feet
  roundRect(ctx, cx - w * 0.2 + b, cy + h * 0.34, w * 0.2, h * 0.08, 3, darken(skin, 0.7));
  roundRect(ctx, cx + w * 0.02 - b, cy + h * 0.34, w * 0.2, h * 0.08, 3, darken(skin, 0.7));
  // Massive torso
  const tGrad = ctx.createLinearGradient(cx, cy - h * 0.16, cx, cy + h * 0.16);
  tGrad.addColorStop(0, hexToRgba(lighten(skin, 1.15)));
  tGrad.addColorStop(1, hexToRgba(darken(skin, 0.7)));
  ctx.fillStyle = tGrad;
  ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.28, h * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  // Armor
  gradRect(ctx, cx - w * 0.2, cy - h * 0.14, w * 0.4, h * 0.14, 0x3a4a7a, darken(0x3a4a7a, 0.6));
  // Arms
  ctx.strokeStyle = hexToRgba(skin); ctx.lineWidth = w * 0.1; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - w * 0.28, cy - h * 0.06); ctx.lineTo(cx - w * 0.34, cy + h * 0.14); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + w * 0.28, cy - h * 0.06); ctx.lineTo(cx + w * 0.34, cy + h * 0.14); ctx.stroke();
  // Head
  roundRect(ctx, cx - w * 0.16, cy - h * 0.42, w * 0.32, h * 0.24, w * 0.06, skin);
  // Glowing blue eyes
  const eg1 = ctx.createRadialGradient(cx - w * 0.06, cy - h * 0.32, 0, cx - w * 0.06, cy - h * 0.32, w * 0.04);
  eg1.addColorStop(0, hexToRgba(0x00BFFF, 0.95)); eg1.addColorStop(1, hexToRgba(0x00BFFF, 0));
  ctx.fillStyle = eg1; ctx.beginPath(); ctx.arc(cx - w * 0.06, cy - h * 0.32, w * 0.04, 0, Math.PI * 2); ctx.fill();
  const eg2 = ctx.createRadialGradient(cx + w * 0.06, cy - h * 0.32, 0, cx + w * 0.06, cy - h * 0.32, w * 0.04);
  eg2.addColorStop(0, hexToRgba(0x00BFFF, 0.95)); eg2.addColorStop(1, hexToRgba(0x00BFFF, 0));
  ctx.fillStyle = eg2; ctx.beginPath(); ctx.arc(cx + w * 0.06, cy - h * 0.32, w * 0.04, 0, Math.PI * 2); ctx.fill();
  // Lightning bolt on frame 1
  if (frame === 1) {
    ctx.strokeStyle = hexToRgba(0x00BFFF, 0.8); ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + w * 0.34, cy + h * 0.1);
    ctx.lineTo(cx + w * 0.38, cy - h * 0.05);
    ctx.lineTo(cx + w * 0.34, cy);
    ctx.lineTo(cx + w * 0.42, cy - h * 0.2);
    ctx.stroke();
    // Lightning glow
    ctx.strokeStyle = hexToRgba(0x00BFFF, 0.3); ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx + w * 0.34, cy + h * 0.1);
    ctx.lineTo(cx + w * 0.38, cy - h * 0.05);
    ctx.lineTo(cx + w * 0.34, cy);
    ctx.lineTo(cx + w * 0.42, cy - h * 0.2);
    ctx.stroke();
  }
  drawBossCrown(ctx, cx, cy, w, h, skin, frame);
}

/** DUNGEON BOSS 9 — Void Walker (cosmic horror with tentacles) */
function drawVoidWalker(ctx, cx, cy, w, h, frame) {
  const body = 0x1a0040;
  // Cosmic void aura
  const voidAura = ctx.createRadialGradient(cx, cy, w * 0.02, cx, cy, w * 0.45);
  voidAura.addColorStop(0, hexToRgba(lighten(body, 1.5), 0.4));
  voidAura.addColorStop(0.5, hexToRgba(body, 0.25));
  voidAura.addColorStop(1, hexToRgba(body, 0));
  ctx.fillStyle = voidAura; ctx.beginPath(); ctx.arc(cx, cy, w * 0.45, 0, Math.PI * 2); ctx.fill();
  // Floating (no shadow)
  // Tentacles (bezier curves, animated)
  ctx.lineCap = 'round';
  for (let t = 0; t < 6; t++) {
    const angle = (t / 6) * Math.PI * 2;
    const startX = cx + Math.cos(angle) * w * 0.1;
    const startY = cy + Math.sin(angle) * h * 0.1;
    const endX = cx + Math.cos(angle) * w * 0.4;
    const endY = cy + Math.sin(angle) * h * 0.35 + (frame === 1 ? Math.sin(t) * 4 : 0);
    const cp1x = startX + Math.cos(angle + 0.5) * w * 0.2;
    const cp1y = startY + Math.sin(angle + 0.5) * h * 0.15;
    ctx.strokeStyle = hexToRgba(lighten(body, 1.3), 0.5);
    ctx.lineWidth = w * 0.03;
    ctx.beginPath(); ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(cp1x, cp1y, endX + w * 0.05, endY - h * 0.05, endX, endY);
    ctx.stroke();
    // Sucker tip
    ellipse(ctx, endX, endY, w * 0.02, h * 0.015, 0xFF00FF, 0.4);
  }
  // Central body (amorphous)
  const bGrad = ctx.createRadialGradient(cx, cy, w * 0.02, cx, cy, w * 0.16);
  bGrad.addColorStop(0, hexToRgba(lighten(body, 1.8), 0.7));
  bGrad.addColorStop(1, hexToRgba(body, 0.5));
  ctx.fillStyle = bGrad;
  ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.16, h * 0.14, 0, 0, Math.PI * 2); ctx.fill();
  // Single large eye
  const eyeGrad = ctx.createRadialGradient(cx, cy - h * 0.02, w * 0.01, cx, cy - h * 0.02, w * 0.1);
  eyeGrad.addColorStop(0, 'rgba(255,0,255,0.95)');
  eyeGrad.addColorStop(0.5, 'rgba(128,0,255,0.6)');
  eyeGrad.addColorStop(1, 'rgba(255,0,255,0)');
  ctx.fillStyle = eyeGrad; ctx.beginPath(); ctx.arc(cx, cy - h * 0.02, w * 0.1, 0, Math.PI * 2); ctx.fill();
  ellipse(ctx, cx, cy - h * 0.02, w * 0.06, h * 0.06, 0xFFFFFF, 0.7);
  ellipse(ctx, cx, cy - h * 0.02, w * 0.03, h * 0.04, 0xFF00FF);
  ellipse(ctx, cx, cy - h * 0.02, w * 0.015, h * 0.025, 0x000000);
  // Star-like sparkles
  ctx.fillStyle = hexToRgba(0xFFFFFF, 0.6);
  const stars = [[-0.25, -0.2], [0.28, -0.15], [-0.2, 0.25], [0.22, 0.2], [0, -0.35]];
  stars.forEach(([sx, sy]) => {
    ctx.beginPath(); ctx.arc(cx + w * sx, cy + h * sy, w * 0.01, 0, Math.PI * 2); ctx.fill();
  });
  drawBossCrown(ctx, cx, cy, w, h, body, frame);
}

/** LABYRINTH GUARDIAN — large golden armored sentinel */
function drawLabyrinthGuardian(ctx, cx, cy, w, h, frame) {
  const b = frame === 1 ? 2 : 0;
  const gold = 0xDAA520, darkGold = darken(gold, 0.6);
  // Shadow
  ellipse(ctx, cx, cy + h * 0.44, w * 0.38, h * 0.06, 0x000000, 0.25);
  // Heavy legs
  roundRect(ctx, cx - w * 0.18 + b, cy + h * 0.14, w * 0.16, h * 0.24, 3, gold);
  roundRect(ctx, cx + w * 0.04 - b, cy + h * 0.14, w * 0.16, h * 0.24, 3, gold);
  roundRect(ctx, cx - w * 0.2 + b, cy + h * 0.34, w * 0.2, h * 0.08, 3, darkGold);
  roundRect(ctx, cx + w * 0.02 - b, cy + h * 0.34, w * 0.2, h * 0.08, 3, darkGold);
  // Torso
  gradRect(ctx, cx - w * 0.24, cy - h * 0.16, w * 0.48, h * 0.34, lighten(gold, 1.1), darkGold);
  strokeRound(ctx, cx - w * 0.24, cy - h * 0.16, w * 0.48, h * 0.34, 3, darken(gold, 0.4), 1.5);
  // Gold ornament on chest
  ctx.strokeStyle = hexToRgba(lighten(gold, 1.4), 0.8); ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy - h * 0.12); ctx.lineTo(cx + w * 0.08, cy - h * 0.02);
  ctx.lineTo(cx, cy + h * 0.08); ctx.lineTo(cx - w * 0.08, cy - h * 0.02);
  ctx.closePath(); ctx.stroke();
  // Arms
  roundRect(ctx, cx - w * 0.38, cy - h * 0.12, w * 0.14, h * 0.28, 3, gold);
  roundRect(ctx, cx + w * 0.24, cy - h * 0.12, w * 0.14, h * 0.28, 3, gold);
  // Club weapon
  ctx.fillStyle = hexToRgba(0x5a3a1a);
  ctx.fillRect(cx + w * 0.34, cy - h * 0.18, w * 0.04, h * 0.38);
  roundRect(ctx, cx + w * 0.3, cy - h * 0.24, w * 0.14, h * 0.1, 4, 0x4a2a0a);
  // Head
  roundRect(ctx, cx - w * 0.16, cy - h * 0.42, w * 0.32, h * 0.28, 4, gold);
  strokeRound(ctx, cx - w * 0.16, cy - h * 0.42, w * 0.32, h * 0.28, 4, darken(gold, 0.4), 1.5);
  // Eyes
  ellipse(ctx, cx - w * 0.06, cy - h * 0.3, w * 0.04, h * 0.03, 0xFF0000);
  ellipse(ctx, cx + w * 0.06, cy - h * 0.3, w * 0.04, h * 0.03, 0xFF0000);
  drawBossCrown(ctx, cx, cy, w, h, gold, frame);
}

// ----------------------------------------------------------
//  MONSTER DISPATCH — maps monster key to its draw function
// ----------------------------------------------------------

function drawMonsterByKey(ctx, cx, cy, w, h, key, frame) {
  switch (key) {
    case 'slime':            return drawSlime(ctx, cx, cy, w, h, frame, false);
    case 'slime_king':       return drawSlime(ctx, cx, cy, w, h, frame, true);
    case 'goblin':           return drawGoblin(ctx, cx, cy, w, h, frame, false);
    case 'goblin_chief':     return drawGoblin(ctx, cx, cy, w, h, frame, true);
    case 'skeleton':         return drawSkeleton(ctx, cx, cy, w, h, frame, false);
    case 'skeleton_lord':    return drawSkeleton(ctx, cx, cy, w, h, frame, true);
    case 'orc':              return drawOrc(ctx, cx, cy, w, h, frame, false);
    case 'orc_warlord':      return drawOrc(ctx, cx, cy, w, h, frame, true);
    case 'wolf':             return drawWolf(ctx, cx, cy, w, h, frame, false);
    case 'alpha_wolf':       return drawWolf(ctx, cx, cy, w, h, frame, true);
    case 'golem':            return drawGolem(ctx, cx, cy, w, h, frame, false, false);
    case 'crystal_golem':    return drawGolem(ctx, cx, cy, w, h, frame, false, true);
    case 'wraith':           return drawWraith(ctx, cx, cy, w, h, frame, false);
    case 'wraith_queen':     return drawWraith(ctx, cx, cy, w, h, frame, true);
    case 'maze_phantom':     return drawWraith(ctx, cx, cy, w, h, frame, false, 0x00BFFF);
    case 'dragon':           return drawDragon(ctx, cx, cy, w, h, frame, false, 0xAA2020, 0xFFFF00);
    case 'drake':            return drawDragon(ctx, cx, cy, w, h, frame, false, 0xCC3300, 0xFFFF00);
    case 'drake_mother':     return drawDragon(ctx, cx, cy, w, h, frame, true, 0xAA0000, 0xFFFF00);
    case 'ancient_dragon':   return drawDragon(ctx, cx, cy, w, h, frame, true, 0x6A0DAD, 0x00FFFF);
    case 'bone_dragon':      return drawDragon(ctx, cx, cy, w, h, frame, false, 0xD8D8B0, 0x00FF00);
    case 'dungeon_boss_10':  return drawDragon(ctx, cx, cy, w, h, frame, true, 0x2A0A4A, 0xFF0000);
    case 'shadow_spider':    return drawSpider(ctx, cx, cy, w, h, frame, false);
    case 'dark_bat':         return drawBat(ctx, cx, cy, w, h, frame);
    case 'minotaur':         return drawMinotaur(ctx, cx, cy, w, h, frame);
    case 'fire_imp':         return drawFireImp(ctx, cx, cy, w, h, frame);
    case 'cave_troll':       return drawCaveTroll(ctx, cx, cy, w, h, frame);
    case 'cursed_knight':    return drawCursedKnight(ctx, cx, cy, w, h, frame);
    case 'shadow_demon':     return drawShadowDemon(ctx, cx, cy, w, h, frame);
    case 'lava_golem':       return drawLavaGolem(ctx, cx, cy, w, h, frame);
    case 'abyssal_fiend':    return drawAbyssalFiend(ctx, cx, cy, w, h, frame);
    case 'labyrinth_guardian': return drawLabyrinthGuardian(ctx, cx, cy, w, h, frame);
    case 'dungeon_boss_1':   return drawGiantRat(ctx, cx, cy, w, h, frame);
    case 'dungeon_boss_2':   return drawWraith(ctx, cx, cy, w, h, frame, true, 0x00BFFF); // Ice Witch
    case 'dungeon_boss_3':   return drawGolem(ctx, cx, cy, w, h, frame, true, false); // Stone Guardian
    case 'dungeon_boss_4':   return drawPlagueDoctor(ctx, cx, cy, w, h, frame);
    case 'dungeon_boss_5':   return drawBloodKnight(ctx, cx, cy, w, h, frame);
    case 'dungeon_boss_6':   return drawNecromancer(ctx, cx, cy, w, h, frame);
    case 'dungeon_boss_7':   return drawElemental(ctx, cx, cy, w, h, frame, 0xFF4500); // Fire Elemental
    case 'dungeon_boss_8':   return drawStormGiant(ctx, cx, cy, w, h, frame);
    case 'dungeon_boss_9':   return drawVoidWalker(ctx, cx, cy, w, h, frame);
    default:
      // Fallback: generic dark humanoid
      drawShadowDemon(ctx, cx, cy, w, h, frame);
  }
}

function generateMonsters() {
  console.log('\n📦 Generating monster sprites...');

  MONSTERS.forEach(m => {
    const c = createCanvas(m.w * 2, m.h);
    const ctx = c.getContext('2d');

    for (let f = 0; f < 2; f++) {
      const ox = f * m.w;
      ctx.save();
      ctx.translate(ox, 0);
      drawMonsterByKey(ctx, m.w / 2, m.h / 2, m.w, m.h, m.key, f);
      ctx.restore();
    }

    saveCanvas(c, `sprites/monsters/${m.key}.png`);
  });
}

// ============================================================
//  PLAYER SPRITE GENERATOR
// ============================================================
function drawPlayerBody(ctx, x, y, fw, fh, dir, frame, isFemale) {
  const cx = x + fw / 2, cy = y + fh / 2;
  const walk = frame === 1 ? 3 : 0;

  // Shadow
  ellipse(ctx, cx, y + fh - 6, 16, 4, 0x000000, 0.2);

  const skin = 0xDEB887, skinL = 0xF0D8C0, skinD = 0xC8A878;
  const hair = isFemale ? 0x8B3A2A : 0x4a3a1a;
  const hairD = darken(hair, 0.7);
  const underwear = isFemale ? 0xCC6699 : 0x5566AA;

  // Legs
  roundRect(ctx, cx - 8 + walk, y + 60, 7, 22, 2, skin);
  roundRect(ctx, cx + 1 - walk, y + 60, 7, 22, 2, skin);
  // Feet
  roundRect(ctx, cx - 9 + walk, y + 78, 9, 6, 2, skinD);
  roundRect(ctx, cx - walk, y + 78, 9, 6, 2, skinD);

  if (dir === 0 || dir === 3) { // Front or back
    // Body / torso
    gradRect(ctx, cx - 12, y + 32, 24, 30, skin, skinD);
    // Underwear
    roundRect(ctx, cx - 10, y + 50, 20, 12, 2, underwear);

    // Arms
    roundRect(ctx, cx - 18, y + 34, 8, 22, 3, skin);
    roundRect(ctx, cx + 10, y + 34, 8, 22, 3, skin);
    // Hands
    ellipse(ctx, cx - 14, y + 58, 4, 4, skinL);
    ellipse(ctx, cx + 14, y + 58, 4, 4, skinL);

    // Neck
    ctx.fillStyle = hexToRgba(skin);
    ctx.fillRect(cx - 5, y + 24, 10, 10);

    // Head
    roundRect(ctx, cx - 14, y + 4, 28, 24, 7, skin);
    strokeRound(ctx, cx - 14, y + 4, 28, 24, 7, darken(skin, 0.6), 1.5);

    // Hair
    roundRect(ctx, cx - 16, y + 1, 32, 14, 5, hair);
    ctx.fillStyle = hexToRgba(hair);
    ctx.fillRect(cx - 16, y + 8, 4, 14);
    ctx.fillRect(cx + 12, y + 8, 4, 14);

    if (dir === 0) { // Front face
      // Eyes
      drawEye(ctx, cx - 6, y + 14, 3, isFemale ? 0x4a8a4a : 0x4a6a8a);
      drawEye(ctx, cx + 6, y + 14, 3, isFemale ? 0x4a8a4a : 0x4a6a8a);
      // Nose
      ellipse(ctx, cx, y + 20, 2, 1.5, skinD, 0.5);
      // Mouth
      ctx.strokeStyle = hexToRgba(0xBB8866);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, y + 23, 3, 0.3, Math.PI - 0.3); ctx.stroke();
      if (isFemale) {
        // Blush
        ellipse(ctx, cx - 8, y + 19, 4, 2, 0xFFAAAA, 0.2);
        ellipse(ctx, cx + 8, y + 19, 4, 2, 0xFFAAAA, 0.2);
      }
    }
  } else { // Side view (dir 1=left, 2=right)
    const flip = dir === 2 ? 1 : -1;
    // Body
    gradRect(ctx, cx - 8, y + 32, 16, 30, skin, skinD);
    roundRect(ctx, cx - 8, y + 50, 16, 12, 2, underwear);
    // Arm
    roundRect(ctx, cx + flip * 6, y + 34, 8, 22, 3, skin);
    ellipse(ctx, cx + flip * 10, y + 58, 4, 4, skinL);
    // Neck
    ctx.fillStyle = hexToRgba(skin);
    ctx.fillRect(cx - 4, y + 24, 8, 10);
    // Head
    roundRect(ctx, cx - 10, y + 4, 20, 24, 6, skin);
    strokeRound(ctx, cx - 10, y + 4, 20, 24, 6, darken(skin, 0.6), 1.5);
    // Hair
    roundRect(ctx, cx - 12, y + 1, 24, 14, 5, hair);
    ctx.fillStyle = hexToRgba(hair);
    ctx.fillRect(cx - 12 + (flip < 0 ? 0 : 18), y + 8, 6, 14);
    // Eye (one visible)
    drawEye(ctx, cx + flip * 2, y + 14, 3, isFemale ? 0x4a8a4a : 0x4a6a8a);
  }

  // Body outline
  strokeRound(ctx, cx - 12, y + 32, 24, 30, 2, darken(skin, 0.5), 1);
}

function generatePlayer() {
  console.log('\n📦 Generating player sprites...');
  const fw = 64, fh = 96, frames = 8;

  for (const isFemale of [false, true]) {
    const c = createCanvas(fw * frames, fh);
    const ctx = c.getContext('2d');

    for (let d = 0; d < 4; d++) {
      for (let f = 0; f < 2; f++) {
        const idx = d * 2 + f;
        drawPlayerBody(ctx, idx * fw, 0, fw, fh, d, f, isFemale);
      }
    }

    const key = isFemale ? 'player_female' : 'player';
    saveCanvas(c, `sprites/player/${key}.png`);
  }
}

// ============================================================
//  TILESET GENERATOR
// ============================================================
function generateTileset() {
  console.log('\n📦 Generating tileset...');
  const T = 64, cols = 8, rows = 8;
  const c = createCanvas(cols * T, rows * T);
  const ctx = c.getContext('2d');

  // Seeded random for consistency
  let seed = 42;
  const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; };

  for (let i = 0; i < cols; i++) {
    // Row 0: Grass tiles
    const x = i * T, y = 0;
    gradRect(ctx, x, y, T, T, 0x2e522e, 0x1a3a1a);
    // Grass texture
    for (let j = 0; j < 25; j++) {
      const gx = x + rand() * (T - 2), gy = y + rand() * (T - 2);
      ctx.fillStyle = hexToRgba([0x3a6a3a, 0x4a7a4a, 0x5a8a5a][Math.floor(rand() * 3)], 0.6);
      ctx.fillRect(gx, gy, 1, 3 + rand() * 8);
    }
    if (i >= 4) { ctx.fillStyle = hexToRgba(0x2a1a40, 0.15); ctx.fillRect(x, y, T, T); }

    // Row 1: Dirt/path
    const y1 = T;
    gradRect(ctx, x, y1, T, T, 0x6a5a3a, 0x5a4a2a);
    for (let j = 0; j < 15; j++) {
      ctx.fillStyle = hexToRgba([0x5a4a2a, 0x7a6a4a, 0x4a3a1a][Math.floor(rand() * 3)], 0.4);
      ctx.fillRect(x + rand() * T, y1 + rand() * T, 2 + rand() * 4, 2 + rand() * 3);
    }

    // Row 2: Water
    const y2 = 2 * T;
    gradRect(ctx, x, y2, T, T, 0x2a4a8a, 0x1a3a6a);
    for (let j = 0; j < 8; j++) {
      ctx.strokeStyle = hexToRgba(0x4a6aaa, 0.3); ctx.lineWidth = 1;
      ctx.beginPath();
      const wx = x + rand() * T, wy = y2 + rand() * T;
      ctx.moveTo(wx, wy); ctx.quadraticCurveTo(wx + 10, wy - 3, wx + 20, wy);
      ctx.stroke();
    }
    ctx.fillStyle = hexToRgba(0x5a8aCC, 0.15); ctx.fillRect(x, y2, T, T / 3);

    // Row 3: Stone/cave floor
    const y3 = 3 * T;
    gradRect(ctx, x, y3, T, T, 0x4a4a4a, 0x3a3a3a);
    for (let j = 0; j < 10; j++) {
      ctx.fillStyle = hexToRgba([0x555555, 0x3a3a3a, 0x4a4a4a][Math.floor(rand() * 3)], 0.5);
      ctx.fillRect(x + rand() * T, y3 + rand() * T, 4 + rand() * 8, 3 + rand() * 6);
    }

    // Row 4: Sand
    const y4 = 4 * T;
    gradRect(ctx, x, y4, T, T, 0xC2B280, 0xA89A68);
    for (let j = 0; j < 12; j++) {
      ctx.fillStyle = hexToRgba(0xD0C090, 0.3 + rand() * 0.3);
      ctx.fillRect(x + rand() * T, y4 + rand() * T, 2 + rand() * 3, 1 + rand() * 2);
    }

    // Row 5: Snow
    const y5 = 5 * T;
    gradRect(ctx, x, y5, T, T, 0xE8E8F0, 0xD0D0E0);
    for (let j = 0; j < 15; j++) {
      ellipse(ctx, x + rand() * T, y5 + rand() * T, 1 + rand() * 2, 1, 0xFFFFFF, 0.3 + rand() * 0.3);
    }

    // Row 6: Lava
    const y6 = 6 * T;
    gradRect(ctx, x, y6, T, T, 0x8B0000, 0x4a0000);
    for (let j = 0; j < 8; j++) {
      const lx = x + rand() * T, ly = y6 + rand() * T;
      const lgrad = ctx.createRadialGradient(lx, ly, 0, lx, ly, 4 + rand() * 6);
      lgrad.addColorStop(0, 'rgba(255,165,0,0.6)'); lgrad.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = lgrad;
      ctx.beginPath(); ctx.arc(lx, ly, 4 + rand() * 6, 0, Math.PI * 2); ctx.fill();
    }

    // Row 7: Swamp
    const y7 = 7 * T;
    gradRect(ctx, x, y7, T, T, 0x2a3a1a, 0x1a2a0a);
    for (let j = 0; j < 10; j++) {
      ellipse(ctx, x + rand() * T, y7 + rand() * T, 2 + rand() * 4, 1 + rand() * 2, 0x3a5a2a, 0.3);
    }
    for (let j = 0; j < 5; j++) {
      ellipse(ctx, x + rand() * T, y7 + rand() * T, 1.5, 1.5, 0x5a8a3a, 0.4); // bubbles
    }
  }

  saveCanvas(c, 'tiles/tileset.png');
}

// ============================================================
//  RESOURCE SPRITES
// ============================================================
function generateResources() {
  console.log('\n📦 Generating resource sprites...');

  // Tree (64x96)
  {
    const c = createCanvas(64, 96);
    const ctx = c.getContext('2d');
    // Shadow
    ellipse(ctx, 32, 90, 20, 5, 0x000000, 0.2);
    // Trunk
    gradRect(ctx, 26, 48, 12, 40, 0x6a4a2a, 0x4a2a0a);
    strokeRound(ctx, 26, 48, 12, 40, 2, 0x3a1a0a, 1);
    // Bark detail
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = hexToRgba(0x5a3a1a, 0.4);
      ctx.fillRect(28, 52 + i * 8, 8, 2);
    }
    // Roots
    ctx.strokeStyle = hexToRgba(0x4a2a0a); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(28, 84); ctx.quadraticCurveTo(20, 86, 16, 90); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(36, 84); ctx.quadraticCurveTo(44, 86, 48, 90); ctx.stroke();
    // Foliage (layered circles for natural look)
    const foliageColors = [0x1a5a1a, 0x2a7a2a, 0x3a9a3a, 0x4aaa4a];
    const foliagePositions = [[32, 30, 20], [22, 36, 14], [42, 36, 14], [32, 22, 16], [26, 28, 12], [38, 28, 12]];
    foliagePositions.forEach(([fx, fy, fr]) => {
      const fgrad = ctx.createRadialGradient(fx - 2, fy - 2, 0, fx, fy, fr);
      fgrad.addColorStop(0, hexToRgba(foliageColors[2], 0.9));
      fgrad.addColorStop(0.6, hexToRgba(foliageColors[1], 0.85));
      fgrad.addColorStop(1, hexToRgba(foliageColors[0], 0.7));
      ctx.fillStyle = fgrad;
      ctx.beginPath(); ctx.arc(fx, fy, fr, 0, Math.PI * 2); ctx.fill();
    });
    // Foliage outline
    ctx.strokeStyle = hexToRgba(0x0a3a0a, 0.5); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(32, 28, 22, 0, Math.PI * 2); ctx.stroke();
    // Highlights
    ellipse(ctx, 26, 22, 4, 3, 0x5aba5a, 0.3);
    saveCanvas(c, 'sprites/resources/tree.png');
  }

  // Bush (48x48)
  {
    const c = createCanvas(48, 48);
    const ctx = c.getContext('2d');
    ellipse(ctx, 24, 44, 16, 4, 0x000000, 0.15);
    // Bush layers
    const grad = ctx.createRadialGradient(24, 24, 2, 24, 26, 18);
    grad.addColorStop(0, hexToRgba(0x4aba4a, 0.9));
    grad.addColorStop(0.5, hexToRgba(0x2a8a2a, 0.85));
    grad.addColorStop(1, hexToRgba(0x1a6a1a, 0.8));
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.ellipse(24, 26, 18, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = hexToRgba(0x0a4a0a, 0.5); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(24, 26, 18, 14, 0, 0, Math.PI * 2); ctx.stroke();
    // Flowers
    ellipse(ctx, 16, 22, 3, 3, 0xDA70D6); ellipse(ctx, 16, 22, 1.5, 1.5, 0xFFD700);
    ellipse(ctx, 34, 28, 2.5, 2.5, 0xFF6090); ellipse(ctx, 34, 28, 1, 1, 0xFFD700);
    saveCanvas(c, 'sprites/resources/bush.png');
  }

  // Rock (52x48)
  {
    const c = createCanvas(52, 48);
    const ctx = c.getContext('2d');
    ellipse(ctx, 26, 44, 18, 4, 0x000000, 0.15);
    // Rock shape
    ctx.beginPath();
    ctx.moveTo(10, 38); ctx.lineTo(6, 24); ctx.lineTo(14, 12); ctx.lineTo(30, 8);
    ctx.lineTo(44, 14); ctx.lineTo(48, 28); ctx.lineTo(42, 38); ctx.closePath();
    const rgrad = ctx.createLinearGradient(10, 8, 48, 38);
    rgrad.addColorStop(0, hexToRgba(0x909090));
    rgrad.addColorStop(1, hexToRgba(0x505050));
    ctx.fillStyle = rgrad; ctx.fill();
    ctx.strokeStyle = hexToRgba(0x3a3a3a, 0.7); ctx.lineWidth = 1.5; ctx.stroke();
    // Cracks
    ctx.strokeStyle = hexToRgba(0x4a4a4a, 0.6); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(20, 14); ctx.lineTo(28, 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(38, 18); ctx.lineTo(34, 34); ctx.stroke();
    // Moss
    ellipse(ctx, 22, 32, 4, 2, 0x4a6a4a, 0.4);
    // Highlight
    ctx.fillStyle = hexToRgba(0xAAAAAA, 0.3);
    ctx.fillRect(18, 12, 8, 4);
    saveCanvas(c, 'sprites/resources/rock.png');
  }
}

// ============================================================
//  BUILDING SPRITES
// ============================================================
function generateBuildings() {
  console.log('\n📦 Generating building sprites...');

  // House1 (80x84)
  {
    const c = createCanvas(80, 84);
    const ctx = c.getContext('2d');
    ellipse(ctx, 40, 80, 34, 4, 0x000000, 0.15);
    // Walls (log cabin)
    gradRect(ctx, 10, 32, 60, 46, 0x6a4a2a, 0x4a2a0a);
    strokeRound(ctx, 10, 32, 60, 46, 1, 0x3a1a0a, 1.5);
    // Log lines
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = hexToRgba(i % 2 ? 0x5a3a1a : 0x6a4a2a, 0.6);
      ctx.fillRect(12, 34 + i * 6, 56, 5);
    }
    // Roof
    ctx.beginPath(); ctx.moveTo(40, 6); ctx.lineTo(0, 36); ctx.lineTo(80, 36);
    ctx.fillStyle = hexToRgba(0x8a7a40); ctx.fill();
    ctx.beginPath(); ctx.moveTo(40, 10); ctx.lineTo(6, 34); ctx.lineTo(74, 34);
    ctx.fillStyle = hexToRgba(0x9a8a50); ctx.fill();
    ctx.strokeStyle = hexToRgba(0x6a5a20, 0.5); ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) ctx.beginPath(), ctx.moveTo(40 - i * 6 - 4, 14 + i * 4), ctx.lineTo(40 + i * 6 + 4, 14 + i * 4), ctx.stroke();
    // Door
    gradRect(ctx, 30, 46, 18, 30, 0x5a3a1a, 0x3a1a0a);
    ctx.strokeStyle = hexToRgba(0x3a1a0a); ctx.lineWidth = 1; ctx.strokeRect(30, 46, 18, 30);
    ellipse(ctx, 45, 60, 2, 2, 0x808080);
    // Window
    roundRect(ctx, 54, 42, 12, 10, 1, 0x3a5a7a);
    ctx.fillStyle = hexToRgba(0xFFD700, 0.2); ctx.fillRect(55, 43, 10, 8);
    ctx.strokeStyle = hexToRgba(0x5a3a1a); ctx.lineWidth = 2; ctx.strokeRect(54, 42, 12, 10);
    ctx.beginPath(); ctx.moveTo(60, 42); ctx.lineTo(60, 52); ctx.stroke();
    // Chimney
    roundRect(ctx, 60, 8, 8, 20, 1, 0x5a4a3a);
    ellipse(ctx, 64, 6, 4, 3, 0x808080, 0.2);
    saveCanvas(c, 'sprites/buildings/house1.png');
  }

  // House2 (96x90) — larger hall
  {
    const c = createCanvas(96, 90);
    const ctx = c.getContext('2d');
    ellipse(ctx, 48, 86, 42, 5, 0x000000, 0.15);
    gradRect(ctx, 6, 36, 84, 50, 0x6a4a2a, 0x4a2a0a);
    strokeRound(ctx, 6, 36, 84, 50, 1, 0x3a1a0a, 1.5);
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = hexToRgba(i % 2 ? 0x5a3a1a : 0x6a4a2a, 0.6);
      ctx.fillRect(8, 38 + i * 6, 80, 5);
    }
    ctx.beginPath(); ctx.moveTo(48, 4); ctx.lineTo(-4, 40); ctx.lineTo(100, 40);
    ctx.fillStyle = hexToRgba(0x7a6a30); ctx.fill();
    ctx.beginPath(); ctx.moveTo(48, 8); ctx.lineTo(4, 38); ctx.lineTo(92, 38);
    ctx.fillStyle = hexToRgba(0x8a7a40); ctx.fill();
    // Double door
    gradRect(ctx, 32, 50, 14, 36, 0x5a3a1a, 0x3a1a0a);
    gradRect(ctx, 46, 50, 14, 36, 0x5a3a1a, 0x3a1a0a);
    ctx.strokeStyle = hexToRgba(0x3a1a0a); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(46, 50); ctx.lineTo(46, 86); ctx.stroke();
    ellipse(ctx, 43, 66, 2, 2, 0x808080); ellipse(ctx, 49, 66, 2, 2, 0x808080);
    // Windows
    for (const wx of [12, 72]) {
      roundRect(ctx, wx, 46, 14, 12, 1, 0x3a5a7a);
      ctx.fillStyle = hexToRgba(0xFFD700, 0.2); ctx.fillRect(wx + 1, 47, 12, 10);
      ctx.strokeStyle = hexToRgba(0x5a3a1a); ctx.lineWidth = 2; ctx.strokeRect(wx, 46, 14, 12);
    }
    saveCanvas(c, 'sprites/buildings/house2.png');
  }

  // House3 (56x104) — watchtower
  {
    const c = createCanvas(56, 104);
    const ctx = c.getContext('2d');
    ellipse(ctx, 28, 100, 22, 4, 0x000000, 0.15);
    gradRect(ctx, 10, 50, 36, 48, 0x6a4a2a, 0x4a2a0a);
    strokeRound(ctx, 10, 50, 36, 48, 1, 0x3a1a0a, 1);
    roundRect(ctx, 6, 48, 44, 4, 1, 0x6a4a2a);
    gradRect(ctx, 14, 24, 28, 26, 0x6a4a2a, 0x5a3a1a);
    ctx.beginPath(); ctx.moveTo(28, 4); ctx.lineTo(8, 28); ctx.lineTo(48, 28);
    ctx.fillStyle = hexToRgba(0x5a3a1a); ctx.fill();
    gradRect(ctx, 18, 72, 18, 26, 0x5a3a1a, 0x3a1a0a);
    ellipse(ctx, 32, 84, 2, 2, 0x808080);
    roundRect(ctx, 22, 32, 12, 8, 1, 0x3a5a7a);
    ctx.fillStyle = hexToRgba(0x5a3a1a); ctx.lineWidth = 1.5; ctx.strokeRect(22, 32, 12, 8);
    // Flag
    ctx.fillStyle = hexToRgba(0x5a3a1a); ctx.fillRect(27, 0, 2, 8);
    ctx.beginPath(); ctx.moveTo(29, 0); ctx.lineTo(40, 3); ctx.lineTo(29, 6);
    ctx.fillStyle = hexToRgba(0x8B0000); ctx.fill();
    saveCanvas(c, 'sprites/buildings/house3.png');
  }
}

// ============================================================
//  ITEM ICON GENERATORS
// ============================================================
function generateItems() {
  console.log('\n📦 Generating item icons...');
  const S = 64;

  const items = [
    // Swords
    { key: 'icon_wooden_sword', draw: (ctx) => {
      ctx.fillStyle = hexToRgba(0x8B4513); ctx.fillRect(30, 8, 4, 36); // blade (wood)
      gradRect(ctx, 29, 8, 6, 20, 0xA08060, 0x8B4513);
      ctx.fillStyle = hexToRgba(0x5a3a1a); ctx.fillRect(24, 42, 16, 4); // guard
      ctx.fillStyle = hexToRgba(0x6a4a2a); ctx.fillRect(30, 46, 4, 10); // handle
    }},
    { key: 'icon_iron_sword', draw: (ctx) => {
      gradRect(ctx, 29, 6, 6, 32, 0xC0C0C0, 0x808080);
      ctx.strokeStyle = hexToRgba(0xE0E0E0, 0.4); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(31, 8); ctx.lineTo(31, 34); ctx.stroke();
      ctx.fillStyle = hexToRgba(0x5a3a1a); ctx.fillRect(24, 36, 16, 4);
      ctx.fillStyle = hexToRgba(0x6a4a2a); ctx.fillRect(30, 40, 4, 12);
    }},
    { key: 'icon_steel_sword', draw: (ctx) => {
      gradRect(ctx, 28, 4, 8, 34, 0xE0E0E0, 0xA0A0A0);
      ctx.strokeStyle = hexToRgba(0xFFFFFF, 0.3); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(31, 6); ctx.lineTo(31, 34); ctx.stroke();
      roundRect(ctx, 22, 36, 20, 5, 2, 0xDAA520);
      ctx.fillStyle = hexToRgba(0x5a3a1a); ctx.fillRect(29, 41, 6, 14);
      ellipse(ctx, 32, 56, 3, 3, 0xDAA520);
    }},
    { key: 'icon_fire_sword', draw: (ctx) => {
      gradRect(ctx, 28, 4, 8, 34, 0xFF6600, 0xCC0000);
      // Fire glow
      const fg = ctx.createRadialGradient(32, 16, 0, 32, 16, 12);
      fg.addColorStop(0, 'rgba(255,200,0,0.4)'); fg.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(32, 16, 12, 0, Math.PI * 2); ctx.fill();
      roundRect(ctx, 22, 36, 20, 5, 2, 0x808080);
      ctx.fillStyle = hexToRgba(0x3a1a0a); ctx.fillRect(29, 41, 6, 14);
    }},
    // Armors
    { key: 'icon_leather_armor', draw: (ctx) => {
      roundRect(ctx, 16, 12, 32, 36, 4, 0x8B5A2B);
      gradRect(ctx, 18, 14, 28, 32, 0xA07040, 0x7a4a1a);
      ctx.strokeStyle = hexToRgba(0x5a3a1a); ctx.lineWidth = 1.5; ctx.strokeRect(18, 14, 28, 32);
      roundRect(ctx, 10, 14, 8, 20, 3, 0x8B5A2B);
      roundRect(ctx, 46, 14, 8, 20, 3, 0x8B5A2B);
    }},
    { key: 'icon_iron_armor', draw: (ctx) => {
      roundRect(ctx, 16, 12, 32, 36, 4, 0x808080);
      gradRect(ctx, 18, 14, 28, 32, 0xA0A0A0, 0x606060);
      ctx.fillStyle = hexToRgba(0xB0B0B0, 0.4); ctx.fillRect(20, 16, 24, 4);
      ctx.fillStyle = hexToRgba(0xB0B0B0, 0.4); ctx.fillRect(20, 24, 24, 4);
      roundRect(ctx, 10, 14, 8, 20, 3, 0x808080);
      roundRect(ctx, 46, 14, 8, 20, 3, 0x808080);
    }},
    { key: 'icon_steel_armor', draw: (ctx) => {
      roundRect(ctx, 16, 10, 32, 38, 4, 0xA0A0A0);
      gradRect(ctx, 18, 12, 28, 34, 0xC0C0C0, 0x808080);
      ellipse(ctx, 32, 28, 6, 6, 0xDAA520);
      roundRect(ctx, 8, 12, 10, 22, 3, 0xA0A0A0);
      roundRect(ctx, 46, 12, 10, 22, 3, 0xA0A0A0);
    }},
    { key: 'icon_dragon_armor', draw: (ctx) => {
      roundRect(ctx, 14, 8, 36, 42, 4, 0x8B0000);
      gradRect(ctx, 16, 10, 32, 38, 0xCC2020, 0x6a0000);
      // Scale pattern
      for (let sy = 0; sy < 5; sy++) for (let sx = 0; sx < 4; sx++) {
        ctx.strokeStyle = hexToRgba(0xAA4444, 0.3); ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.arc(20 + sx * 8 + (sy % 2) * 4, 14 + sy * 7, 3, 0, Math.PI); ctx.stroke();
      }
      roundRect(ctx, 8, 10, 10, 24, 3, 0x8B0000);
      roundRect(ctx, 46, 10, 10, 24, 3, 0x8B0000);
    }},
    // Potions
    { key: 'icon_health_potion', draw: (ctx) => {
      roundRect(ctx, 22, 16, 20, 32, 6, 0xCC0000);
      const pg = ctx.createRadialGradient(28, 28, 0, 32, 32, 14);
      pg.addColorStop(0, 'rgba(255,100,100,0.6)'); pg.addColorStop(1, 'rgba(200,0,0,0)');
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(32, 32, 12, 0, Math.PI * 2); ctx.fill();
      roundRect(ctx, 26, 10, 12, 8, 2, 0xC0C0C0);
      ctx.fillStyle = hexToRgba(0xFFFFFF, 0.3); ctx.fillRect(26, 20, 4, 10);
    }},
    { key: 'icon_big_health_potion', draw: (ctx) => {
      roundRect(ctx, 18, 14, 28, 38, 8, 0xFF0000);
      const pg = ctx.createRadialGradient(26, 28, 0, 32, 34, 16);
      pg.addColorStop(0, 'rgba(255,150,150,0.6)'); pg.addColorStop(1, 'rgba(220,0,0,0)');
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(32, 34, 14, 0, Math.PI * 2); ctx.fill();
      roundRect(ctx, 24, 8, 16, 8, 2, 0xDAA520);
      ctx.fillStyle = hexToRgba(0xFFFFFF, 0.3); ctx.fillRect(24, 20, 5, 14);
    }},
    { key: 'icon_strength_potion', draw: (ctx) => {
      roundRect(ctx, 22, 16, 20, 32, 6, 0xFF4500);
      roundRect(ctx, 26, 10, 12, 8, 2, 0xC0C0C0);
      ctx.fillStyle = hexToRgba(0xFFFFFF, 0.3); ctx.fillRect(26, 20, 4, 10);
    }},
    { key: 'icon_defense_potion', draw: (ctx) => {
      roundRect(ctx, 22, 16, 20, 32, 6, 0x4169E1);
      roundRect(ctx, 26, 10, 12, 8, 2, 0xC0C0C0);
      ctx.fillStyle = hexToRgba(0xFFFFFF, 0.3); ctx.fillRect(26, 20, 4, 10);
    }},
    { key: 'icon_mana_potion', draw: (ctx) => {
      roundRect(ctx, 22, 16, 20, 32, 6, 0x6A0DAD);
      roundRect(ctx, 26, 10, 12, 8, 2, 0xC0C0C0);
      ctx.fillStyle = hexToRgba(0xFFFFFF, 0.3); ctx.fillRect(26, 20, 4, 10);
    }},
    { key: 'icon_big_mana_potion', draw: (ctx) => {
      roundRect(ctx, 18, 14, 28, 38, 8, 0x8A2BE2);
      roundRect(ctx, 24, 8, 16, 8, 2, 0xDAA520);
      ctx.fillStyle = hexToRgba(0xFFFFFF, 0.3); ctx.fillRect(24, 20, 5, 14);
    }},
    // Materials
    { key: 'icon_wood', draw: (ctx) => {
      roundRect(ctx, 12, 20, 40, 14, 3, 0x8B4513);
      roundRect(ctx, 16, 34, 36, 12, 3, 0x6a3503);
      ellipse(ctx, 14, 27, 5, 5, 0x6a3503); ellipse(ctx, 14, 27, 3, 3, 0x5a2a0a);
    }},
    { key: 'icon_herb', draw: (ctx) => {
      ctx.strokeStyle = hexToRgba(0x2a6a2a); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(32, 52); ctx.quadraticCurveTo(28, 30, 22, 18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(32, 40); ctx.quadraticCurveTo(38, 28, 42, 16); ctx.stroke();
      ellipse(ctx, 22, 16, 6, 4, 0x3a9a3a); ellipse(ctx, 42, 14, 5, 3, 0x3a9a3a);
      ellipse(ctx, 32, 22, 4, 3, 0x4aaa4a);
    }},
    { key: 'icon_stone', draw: (ctx) => {
      ctx.beginPath(); ctx.moveTo(16, 40); ctx.lineTo(12, 28); ctx.lineTo(24, 18);
      ctx.lineTo(40, 16); ctx.lineTo(50, 24); ctx.lineTo(48, 38); ctx.closePath();
      const rg = ctx.createLinearGradient(12, 16, 50, 40);
      rg.addColorStop(0, hexToRgba(0x909090)); rg.addColorStop(1, hexToRgba(0x505050));
      ctx.fillStyle = rg; ctx.fill();
      ctx.strokeStyle = hexToRgba(0x3a3a3a); ctx.lineWidth = 1; ctx.stroke();
    }},
    { key: 'icon_crystal', draw: (ctx) => {
      ctx.beginPath(); ctx.moveTo(32, 8); ctx.lineTo(20, 28); ctx.lineTo(26, 52);
      ctx.lineTo(38, 52); ctx.lineTo(44, 28); ctx.closePath();
      const cg = ctx.createLinearGradient(20, 8, 44, 52);
      cg.addColorStop(0, 'rgba(150,200,255,0.9)'); cg.addColorStop(1, 'rgba(80,120,200,0.8)');
      ctx.fillStyle = cg; ctx.fill();
      ctx.strokeStyle = hexToRgba(0x4080CC, 0.6); ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(28, 14, 4, 16);
    }},
    { key: 'icon_monster_fang', draw: (ctx) => {
      ctx.beginPath(); ctx.moveTo(26, 14); ctx.lineTo(32, 52); ctx.lineTo(38, 14); ctx.closePath();
      gradRect(ctx, 26, 14, 12, 38, 0xFFFFF0, 0xD0D0B0);
      ctx.beginPath(); ctx.moveTo(26, 14); ctx.lineTo(32, 52); ctx.lineTo(38, 14); ctx.closePath();
      ctx.fillStyle = hexToRgba(0xFFFFF0); ctx.fill();
      ctx.strokeStyle = hexToRgba(0xA0A080); ctx.lineWidth = 1; ctx.stroke();
    }},
    { key: 'icon_dragon_scale', draw: (ctx) => {
      ctx.beginPath(); ctx.moveTo(32, 10); ctx.quadraticCurveTo(12, 30, 32, 52);
      ctx.quadraticCurveTo(52, 30, 32, 10); ctx.closePath();
      const sg = ctx.createRadialGradient(28, 24, 0, 32, 32, 18);
      sg.addColorStop(0, hexToRgba(0xCC4444)); sg.addColorStop(1, hexToRgba(0x8B0000));
      ctx.fillStyle = sg; ctx.fill();
      ctx.strokeStyle = hexToRgba(0x5a0000); ctx.lineWidth = 1; ctx.stroke();
    }},
  ];

  // Generic fallback for remaining items
  const remainingKeys = [
    'icon_ring_strength','icon_ring_defense','icon_amulet_hp',
    'icon_wooden_staff','icon_crystal_staff','icon_shadow_staff',
    'icon_wooden_bow','icon_hunter_bow','icon_shadow_bow',
    'icon_leather_helm','icon_iron_helm','icon_steel_helm','icon_dragon_helm',
    'icon_leather_pants','icon_iron_pants','icon_steel_pants',
    'icon_leather_gloves','icon_iron_gloves','icon_steel_gloves',
    'icon_leather_belt','icon_iron_belt','icon_steel_belt',
    'icon_dragon_pants','icon_dragon_gloves','icon_dragon_belt',
  ];

  // Generic drawer based on name
  remainingKeys.forEach(key => {
    const isHelm = key.includes('helm');
    const isPants = key.includes('pants');
    const isGloves = key.includes('gloves');
    const isBelt = key.includes('belt');
    const isRing = key.includes('ring');
    const isAmulet = key.includes('amulet');
    const isStaff = key.includes('staff');
    const isBow = key.includes('bow');
    const isDragon = key.includes('dragon');
    const isIron = key.includes('iron');
    const isSteel = key.includes('steel');
    const isLeather = key.includes('leather');
    const isShadow = key.includes('shadow');
    const isCrystal = key.includes('crystal');
    const isWooden = key.includes('wooden');

    let color = isLeather ? 0x8B5A2B : isIron ? 0x808080 : isSteel ? 0xB0B0B0 : isDragon ? 0xCC2020 : isShadow ? 0x4a0a8a : isCrystal ? 0x00AACC : isWooden ? 0x8B4513 : 0xA0A0A0;

    items.push({ key, draw: (ctx) => {
      if (isHelm) {
        roundRect(ctx, 16, 14, 32, 28, 8, color);
        gradRect(ctx, 18, 16, 28, 24, lighten(color, 1.2), color);
        ctx.fillStyle = hexToRgba(0x1a1a1a); ctx.fillRect(20, 30, 24, 6);
        if (isDragon) { // horns
          ctx.beginPath(); ctx.moveTo(18, 18); ctx.lineTo(10, 6); ctx.lineTo(22, 18); ctx.fillStyle = hexToRgba(darken(color, 0.6)); ctx.fill();
          ctx.beginPath(); ctx.moveTo(46, 18); ctx.lineTo(54, 6); ctx.lineTo(42, 18); ctx.fill();
        }
      } else if (isPants) {
        roundRect(ctx, 18, 10, 28, 16, 3, color);
        roundRect(ctx, 18, 24, 12, 26, 2, color);
        roundRect(ctx, 34, 24, 12, 26, 2, color);
      } else if (isGloves) {
        roundRect(ctx, 14, 18, 14, 24, 4, color);
        roundRect(ctx, 36, 18, 14, 24, 4, color);
        roundRect(ctx, 12, 38, 6, 8, 2, color);
        roundRect(ctx, 46, 38, 6, 8, 2, color);
      } else if (isBelt) {
        roundRect(ctx, 8, 24, 48, 12, 3, color);
        ellipse(ctx, 32, 30, 5, 5, 0xDAA520);
      } else if (isRing) {
        ctx.strokeStyle = hexToRgba(color); ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(32, 32, 12, 0, Math.PI * 2); ctx.stroke();
        ellipse(ctx, 32, 20, 4, 4, key.includes('strength') ? 0xFF4444 : 0x4488FF);
      } else if (isAmulet) {
        ctx.strokeStyle = hexToRgba(0xA0A0A0); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(32, 18, 10, 0, Math.PI); ctx.stroke();
        ellipse(ctx, 32, 34, 6, 8, 0xFF4444);
        ctx.strokeStyle = hexToRgba(0x808080); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(32, 34, 7, 0, Math.PI * 2); ctx.stroke();
      } else if (isStaff) {
        ctx.fillStyle = hexToRgba(isShadow ? 0x2a1a3a : isWooden ? 0x8B4513 : 0x5a4a3a);
        ctx.fillRect(30, 12, 4, 44);
        const orbColor = isShadow ? 0x8a3aea : isCrystal ? 0x00BBEE : 0x8a5aCa;
        const og = ctx.createRadialGradient(32, 10, 0, 32, 10, 7);
        og.addColorStop(0, hexToRgba(lighten(orbColor, 1.5), 0.9));
        og.addColorStop(1, hexToRgba(orbColor, 0.3));
        ctx.fillStyle = og; ctx.beginPath(); ctx.arc(32, 10, 7, 0, Math.PI * 2); ctx.fill();
      } else if (isBow) {
        ctx.strokeStyle = hexToRgba(color); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(22, 32, 18, -1.2, 1.2); ctx.stroke();
        ctx.strokeStyle = hexToRgba(0xDEB887); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(22 + 18 * Math.cos(-1.2), 32 + 18 * Math.sin(-1.2));
        ctx.lineTo(22 + 18 * Math.cos(1.2), 32 + 18 * Math.sin(1.2)); ctx.stroke();
        ctx.fillStyle = hexToRgba(0x8B4513); ctx.fillRect(28, 31, 18, 2);
        ctx.beginPath(); ctx.moveTo(46, 32); ctx.lineTo(50, 28); ctx.lineTo(50, 36); ctx.closePath();
        ctx.fillStyle = hexToRgba(0xA0A0A0); ctx.fill();
      }
    }});
  });

  items.forEach(item => {
    const c = createCanvas(S, S);
    const ctx = c.getContext('2d');
    item.draw(ctx);
    saveCanvas(c, `items/${item.key}.png`);
  });
}

// ============================================================
//  MAIN
// ============================================================
console.log('🎨 Legend of Duskhollow — HD Sprite Generator');
console.log('============================================');

generateNPCs();
generateMonsters();
generatePlayer();
generateTileset();
generateResources();
generateBuildings();
generateItems();

console.log('\n✅ Done! All PNG sprites generated in public/assets/');
console.log('Run the game to see the new HD sprites.');
