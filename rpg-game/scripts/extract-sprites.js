/**
 * Extract individual monster sprites from Antifarea's RPG Enemies sheets
 * - Precise single-sprite crops (not full rows)
 * - Background removal (gray → transparent)
 */
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const TEMP = path.join(__dirname, '..', 'temp_sprites');
const OUT = path.join(__dirname, '..', 'public', 'assets', 'sprites', 'monsters');

function save(canvas, name) {
  const p = path.join(OUT, `${name}.png`);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, canvas.toBuffer('image/png'));
  const sz = fs.statSync(p).size;
  if (sz < 400) console.log(`  ⚠ ${name}.png EMPTY (${sz} B) — will use fallback`);
  else console.log(`  ✓ ${name}.png (${(sz / 1024).toFixed(1)} KB)`);
}

/**
 * Remove gray background: any pixel close to the sheet bg color → transparent
 */
function removeBackground(ctx, w, h) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i+1], b = d[i+2];
    // The sheet background is approximately rgb(139,139,106) / #8B8B6A
    // Also catch nearby gray-green tones
    const isGrayGreen = (
      Math.abs(r - g) < 20 &&
      Math.abs(r - b) < 40 &&
      r > 100 && r < 180 &&
      g > 100 && g < 180 &&
      b > 70 && b < 150
    );
    if (isGrayGreen) {
      d[i+3] = 0; // make transparent
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

/**
 * Extract one sprite → create 2-frame sheet (idle + bounce)
 */
function extract(srcImg, sx, sy, sw, sh, tw, th, name) {
  // First draw on temp canvas to remove background
  const tmp = createCanvas(sw, sh);
  const tmpCtx = tmp.getContext('2d');
  tmpCtx.drawImage(srcImg, sx, sy, sw, sh, 0, 0, sw, sh);
  removeBackground(tmpCtx, sw, sh);

  // Now scale to target size on final 2-frame canvas
  const c = createCanvas(tw * 2, th);
  const ctx = c.getContext('2d');

  const scale = Math.min(tw * 0.9 / sw, th * 0.9 / sh); // 90% fill
  const dw = sw * scale, dh = sh * scale;
  const dx = (tw - dw) / 2, dy = th - dh - 2; // bottom-align with margin

  // Frame 0 (idle)
  ctx.drawImage(tmp, 0, 0, sw, sh, dx, dy, dw, dh);
  // Frame 1 (2px bounce)
  ctx.drawImage(tmp, 0, 0, sw, sh, tw + dx, dy - 2, dw, dh);

  save(c, name);
}

async function main() {
  console.log('🎨 Extracting sprites from Antifarea RPG Enemies...\n');

  const s1 = await loadImage(path.resolve(TEMP, 'enemies_10.png'));   // 320x950
  const s2 = await loadImage(path.resolve(TEMP, 'enemies_10more.png')); // 400x1120

  // Sheet 1 layout: 3 color variants per monster type
  // Each column ~107px wide. Individual sprites much smaller.
  // Col positions: col0 ≈ x:10-90, col1 ≈ x:110-195, col2 ≈ x:215-300

  // ==========================================
  // SHEET 1 (320x950)
  // ==========================================

  // SLIMES — each ~30x28px
  extract(s1, 6, 92, 32, 28,  56, 48, 'slime');             // green slime
  extract(s1, 49, 92, 32, 28, 64, 56, 'slime_king');        // red slime → king

  // SNAKES — y≈145, ~55x65px each
  extract(s1, 8, 145, 55, 65,  60, 72, 'shadow_demon');     // green snake → shadow creature

  // GOBLINS — y≈250, ~55x55px each
  extract(s1, 8, 248, 55, 55,  60, 72, 'goblin');           // green goblin
  extract(s1, 113, 248, 55, 55, 68, 80, 'goblin_chief');    // gold goblin

  // COCKATRICES — y≈320, ~65x70px each → drakes
  extract(s1, 8, 318, 65, 72,  96, 88, 'drake');            // green cockatrice
  extract(s1, 218, 318, 65, 72, 120, 112, 'drake_mother');  // red cockatrice

  // LIZARDS — y≈425, ~80x58px each
  extract(s1, 8, 425, 80, 58,  72, 84, 'cave_troll');       // green lizard
  extract(s1, 115, 425, 80, 58, 72, 84, 'lava_golem');      // red lizard
  extract(s1, 218, 425, 80, 58, 72, 80, 'abyssal_fiend');   // orange lizard

  // RATS — y≈510, ~75x40px each
  extract(s1, 8, 510, 75, 40,  64, 56, 'dungeon_boss_1');   // gray rat → boss

  // SCORPIONS — y≈600, ~80x55px each
  extract(s1, 8, 600, 80, 55,  56, 48, 'shadow_spider');    // red scorpion
  extract(s1, 218, 600, 80, 55, 72, 80, 'crystal_golem');   // dark scorpion

  // WOLVES — y≈698, ~70x48px each
  extract(s1, 8, 698, 70, 48,  56, 48, 'wolf');             // gray wolf
  extract(s1, 113, 698, 70, 48, 64, 52, 'alpha_wolf');      // gold wolf
  extract(s1, 218, 698, 70, 48, 56, 48, 'dungeon_boss_5');  // blue wolf

  // GHOSTS — y≈775, ~60x50px each
  extract(s1, 8, 775, 62, 50,  52, 64, 'wraith');           // white ghost
  extract(s1, 113, 775, 62, 50, 52, 64, 'maze_phantom');    // beige ghost
  extract(s1, 218, 775, 62, 50, 60, 72, 'wraith_queen');    // teal ghost

  // DRAGONS — y≈850, ~95x98px each
  extract(s1, 5, 848, 100, 100, 128, 120, 'dragon');        // green dragon
  extract(s1, 108, 848, 100, 100, 128, 120, 'bone_dragon');  // red dragon → bone
  extract(s1, 212, 848, 100, 100, 140, 128, 'ancient_dragon'); // purple dragon

  // ==========================================
  // SHEET 2 (400x1120)
  // ==========================================

  // BATS — y≈65, ~75x50px each
  extract(s2, 8, 65, 75, 50,   52, 44, 'dark_bat');         // gray bat
  extract(s2, 200, 65, 75, 50, 48, 56, 'fire_imp');         // orange bat → imp

  // FLOATING EYE — y≈128, ~35x35px
  extract(s2, 10, 128, 38, 38, 52, 64, 'dungeon_boss_9');   // eye → void walker

  // SOLDIERS — y≈225, ~65x65px each
  extract(s2, 8, 225, 68, 65,  60, 80, 'cursed_knight');    // silver soldier
  extract(s2, 113, 225, 68, 65, 80, 92, 'orc_warlord');     // gold soldier

  // CAPTAINS — y≈335, ~75x65px each
  extract(s2, 8, 335, 75, 65,  72, 84, 'orc');              // dark captain → orc
  extract(s2, 113, 335, 75, 65, 80, 88, 'labyrinth_guardian'); // gold captain
  extract(s2, 220, 335, 75, 65, 72, 84, 'minotaur');        // green captain

  // SKELETONS — y≈450, ~60x75px each
  extract(s2, 8, 450, 62, 75,  60, 80, 'skeleton');         // brown skeleton
  extract(s2, 113, 450, 62, 75, 68, 88, 'skeleton_lord');   // purple skeleton
  extract(s2, 220, 450, 62, 75, 64, 72, 'golem');           // white skeleton → golem

  // SPIDERS — y≈558, ~80x48px each
  extract(s2, 8, 558, 80, 48,  56, 48, 'dungeon_boss_4');   // blue spider
  extract(s2, 113, 558, 80, 48, 72, 80, 'dungeon_boss_3');  // brown spider → stone

  // PIRATES — y≈800, ~65x75px each
  extract(s2, 8, 800, 68, 75,  60, 72, 'dungeon_boss_2');   // dark pirate → ice witch
  extract(s2, 113, 800, 68, 75, 72, 80, 'dungeon_boss_6');  // red pirate → necromancer

  // NINJAS — y≈905, ~65x70px each
  extract(s2, 8, 905, 65, 70,  64, 76, 'dungeon_boss_8');   // blue ninja → storm
  extract(s2, 113, 905, 65, 70, 72, 80, 'dungeon_boss_7');  // red ninja → fire

  // SHADOW BOSSES — y≈1020, ~95x95px each
  extract(s2, 5, 1020, 95, 98,  128, 128, 'dungeon_boss_10'); // green shadow → final boss

  console.log('\n✅ Extraction complete!');

  // Report coverage
  const all = ['slime','goblin','skeleton','orc','wolf','golem','wraith','dragon','drake','drake_mother','ancient_dragon','slime_king','goblin_chief','skeleton_lord','orc_warlord','alpha_wolf','crystal_golem','wraith_queen','minotaur','shadow_spider','cursed_knight','maze_phantom','labyrinth_guardian','fire_imp','dark_bat','cave_troll','lava_golem','shadow_demon','bone_dragon','abyssal_fiend','dungeon_boss_1','dungeon_boss_2','dungeon_boss_3','dungeon_boss_4','dungeon_boss_5','dungeon_boss_6','dungeon_boss_7','dungeon_boss_8','dungeon_boss_9','dungeon_boss_10'];
  const existing = fs.readdirSync(OUT).filter(f => f.endsWith('.png') && fs.statSync(path.join(OUT, f)).size > 400).map(f => f.replace('.png',''));
  const missing = all.filter(m => !existing.includes(m));
  console.log(`\n📊 ${existing.length}/${all.length} monsters have pixel art sprites`);
  if (missing.length) console.log(`⚡ ${missing.length} use procedural fallback: ${missing.join(', ')}`);
}

main().catch(e => console.error('Error:', e));
