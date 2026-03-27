import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Try to load the asset manifest for PNG sprite sheets
    this.load.json('asset_manifest', 'assets/manifest.json');
    this.load.on('loaderror', () => {}); // Suppress errors for optional manifest
  }

  create() {
    const manifest = this.cache.json.get('asset_manifest');
    if (manifest && manifest.sprites) {
      // Queue PNG sprite sheet loads from manifest
      let hasAssets = false;
      Object.entries(manifest.sprites).forEach(([key, info]) => {
        // Only load if PNG file actually exists (will fallback to procedural if not)
        if (info.frameCount > 1) {
          this.load.spritesheet(key, `assets/${info.path}`, {
            frameWidth: info.frameWidth,
            frameHeight: info.frameHeight
          });
        } else {
          this.load.image(key, `assets/${info.path}`);
        }
        hasAssets = true;
      });

      if (hasAssets) {
        // Track failed loads so we can remove broken texture entries
        const failedKeys = new Set();
        this.load.on('loaderror', (file) => {
          failedKeys.add(file.key);
        });
        this.load.once('complete', () => {
          // Remove broken texture entries from failed loads so procedural fallback works
          failedKeys.forEach(key => {
            if (this.textures.exists(key)) this.textures.remove(key);
          });
          // Also remove textures with zero frames (wrong PNG dimensions)
          Object.keys(manifest.sprites).forEach(key => {
            if (failedKeys.has(key)) return;
            if (!this.textures.exists(key)) return;
            const tex = this.textures.get(key);
            // frameTotal includes __BASE, so a valid spritesheet has frameTotal > 1
            if (tex.frameTotal <= 1 && manifest.sprites[key].frameCount > 1) {
              this.textures.remove(key);
            }
          });
          this.generateAllSprites(); // Procedural fallback for missing PNGs
          this.scene.start('PreloadScene');
        });
        this.load.start();
        return;
      }
    }

    // No manifest or no assets — use full procedural generation
    this.generateAllSprites();
    this.scene.start('PreloadScene');
  }

  // Gradient fill helper
  grad(g, x, y, w, h, c1, c2) {
    for (let i = 0; i < h; i++) {
      const t = i / h;
      const r = ((c1 >> 16) & 0xFF) * (1 - t) + ((c2 >> 16) & 0xFF) * t;
      const gr = ((c1 >> 8) & 0xFF) * (1 - t) + ((c2 >> 8) & 0xFF) * t;
      const b = (c1 & 0xFF) * (1 - t) + (c2 & 0xFF) * t;
      g.fillStyle((r << 16) | (gr << 8) | b);
      g.fillRect(x, y + i, w, 1);
    }
  }

  /**
   * Pixel art çizim helper — string haritasından sprite çizer
   * @param {Graphics} g - Phaser graphics nesnesi
   * @param {number} ox - başlangıç x
   * @param {number} oy - başlangıç y
   * @param {string[]} rows - her satır bir karakter dizisi
   * @param {object} palette - karakter → renk eşleşmesi { 'A': 0xFF0000, ... }
   * @param {number} scale - piksel boyutu (default 1)
   */
  drawPixelArt(g, ox, oy, rows, palette, scale = 1) {
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        if (ch === '.' || ch === ' ') continue;
        const color = palette[ch];
        if (color === undefined) continue;
        if (Array.isArray(color)) {
          g.fillStyle(color[0], color[1]); // [color, alpha]
        } else {
          g.fillStyle(color);
        }
        g.fillRect(ox + c * scale, oy + r * scale, scale, scale);
      }
    }
  }

  /**
   * Darken a hex color by a factor (0-1)
   */
  darkenColor(color, factor = 0.5) {
    const r = Math.floor(((color >> 16) & 0xFF) * factor);
    const g = Math.floor(((color >> 8) & 0xFF) * factor);
    const b = Math.floor((color & 0xFF) * factor);
    return (r << 16) | (g << 8) | b;
  }

  generateAllSprites() {
    this.generateTileset();
    this.generatePlayerSprite();
    this.generateMonsterSprites();
    this.generateNPCSprites();
    this.generateItemSprites();
    this.generateResourceSprites();
    this.generateBuildingSprites();
    this.generateUISprites();
    this.generateParticles();
    this.generateProjectiles();
    this.generateClassIcons();
  }

  generateTileset() {
    if (this.textures.exists('tileset')) return;
    const T = 64;
    const M = 1; // extrusion margin
    const S = T + 2 * M; // 66 stride per tile
    const cols = 8, rows = 8;
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // Row base colors used for extrusion fill
    const rowBase = [0x2a5a2a, 0x3e2a1a, 0x555555, 0x0a1840, 0x222222, 0x6a4a2a, 0x0a0a1a, 0x020202];

    for (let i = 0; i < cols; i++) {
      const rng = new Phaser.Math.RandomDataGenerator([`g${i}`]);

      // Pre-fill all rows with base color for extrusion borders
      for (let r = 0; r < rows; r++) {
        g.fillStyle(rowBase[r]); g.fillRect(i * S, r * S, S, S);
      }

      // ========== Row 0: Grass — vivid, varied, natural ==========
      const x = i * S + M, y = 0 * S + M;
      // Brighter base gradient with per-tile variation
      const baseLight = [0x3e7a3e, 0x3a6e3a, 0x408040, 0x367036, 0x3c7a3c, 0x387438, 0x3a6e3a, 0x347034][i];
      const baseDark = [0x2a5a2a, 0x285428, 0x2c5e2c, 0x265226, 0x2a5a2a, 0x285628, 0x265226, 0x2a582a][i];
      this.grad(g, x, y, T, T, baseLight, baseDark);
      // Natural ground patches — earthy spots for variation
      for (let j = 0; j < 12; j++) {
        g.fillStyle(rng.pick([0x306030, 0x2a5228, 0x346834, 0x2e5a30]), 0.4);
        g.fillRect(x + rng.between(0, T - 5), y + rng.between(0, T - 5), rng.between(4, 10), rng.between(3, 7));
      }
      // Light dappled sunlight patches
      for (let j = 0; j < 3; j++) {
        g.fillStyle(rng.pick([0x4a8a4a, 0x509050, 0x48864a]), 0.2);
        g.fillCircle(x + rng.between(12, 52), y + rng.between(12, 52), rng.between(6, 14));
      }
      // Grass blades — varied heights, more vivid greens
      for (let j = 0; j < 35; j++) {
        const gx = x + rng.between(1, T - 2);
        const gy = y + rng.between(10, T - 2);
        const gh = rng.between(4, 10);
        const shade = rng.pick([0x4a8a4a, 0x58985a, 0x68a868, 0x4a7a3a, 0x3a7a4a, 0x509850]);
        g.fillStyle(shade, 0.75); g.fillRect(gx, gy - gh, 1, gh);
        if (rng.frac() > 0.5) { g.fillStyle(shade, 0.35); g.fillRect(gx + 1, gy - gh + 1, 1, gh - 2); }
      }
      // Subtle twilight tint on darker variants (reduced intensity)
      if (i >= 5) { g.fillStyle(0x1a1030, 0.1); g.fillRect(x, y, T, T); }
      // Wildflowers on some tiles
      if (i === 1 || i === 5) {
        g.fillStyle(0xE88AE8); g.fillCircle(x + 14, y + 28, 2.5); g.fillStyle(0xFFE060, 0.9); g.fillCircle(x + 14, y + 28, 1);
        g.fillStyle(0xAA80DD); g.fillCircle(x + 48, y + 44, 2); g.fillStyle(0xFFE060, 0.8); g.fillCircle(x + 48, y + 44, 0.8);
        g.fillStyle(0xFF8CAA); g.fillCircle(x + 32, y + 18, 2); g.fillStyle(0xFFFFFF, 0.6); g.fillCircle(x + 32, y + 18, 0.8);
      }
      // Small clover / ground detail on other tiles
      if (i === 2 || i === 6) {
        for (let c = 0; c < 3; c++) {
          const cx2 = x + rng.between(8, 56), cy2 = y + rng.between(8, 56);
          g.fillStyle(0x3a8a3a, 0.5); g.fillCircle(cx2, cy2, 2); g.fillCircle(cx2 + 2, cy2 - 1, 2); g.fillCircle(cx2 + 1, cy2 + 2, 2);
        }
      }
      if (i === 3 || i === 7) {
        // Small pebbles
        g.fillStyle(0x7a7a6a, 0.4); g.fillCircle(x + 20, y + 42, 2); g.fillCircle(x + 44, y + 28, 1.5);
        g.fillStyle(0x8a8a7a, 0.3); g.fillCircle(x + 36, y + 52, 2.5);
      }

      // ========== Row 1: Dirt ==========
      const y1 = 1 * S + M;
      this.grad(g, x, y1, T, T, 0x5e4535, 0x3e2a1a);
      for (let j = 0; j < 25; j++) {
        g.fillStyle(rng.pick([0x6a5040, 0x5a4535, 0x4a3828, 0x6a5a48]), rng.realInRange(0.3, 0.6));
        g.fillRect(x + rng.between(0, T - 6), y1 + rng.between(0, T - 4), rng.between(3, 10), rng.between(2, 4));
      }
      for (let j = 0; j < 8; j++) {
        const px2 = x + rng.between(6, T - 6), py2 = y1 + rng.between(6, T - 6), pr = rng.between(2, 4);
        g.fillStyle(rng.pick([0x7a6a5a, 0x8a7a6a, 0x6a6060])); g.fillCircle(px2, py2, pr);
        g.fillStyle(0x9a8a7a, 0.4); g.fillCircle(px2 - 1, py2 - 1, pr * 0.5);
      }
      g.lineStyle(1, 0x3a2a1a, 0.4);
      g.lineBetween(x + rng.between(10, 30), y1 + rng.between(10, 50), x + rng.between(30, 55), y1 + rng.between(20, 55));
      if (i % 2 === 0) {
        g.fillStyle(0x8a7a50, 0.5); g.fillRect(x + 40, y1 + 10, 1, 5); g.fillRect(x + 42, y1 + 8, 1, 7);
      }

      // ========== Row 2: Stone floor ==========
      const y2 = 2 * S + M;
      g.fillStyle(0x555555); g.fillRect(x, y2, T, T);
      g.lineStyle(1, 0x444444);
      g.strokeRect(x + 2, y2 + 2, 28, 28); g.strokeRect(x + 32, y2 + 2, 30, 14);
      g.strokeRect(x + 32, y2 + 18, 30, 14); g.strokeRect(x + 2, y2 + 32, 18, 30);
      g.strokeRect(x + 22, y2 + 32, 20, 30); g.strokeRect(x + 44, y2 + 34, 18, 28);
      g.fillStyle(0x666666, 0.3); g.fillRect(x + 3, y2 + 3, 27, 3);
      g.fillStyle(0x666666, 0.3); g.fillRect(x + 33, y2 + 3, 29, 2);
      g.fillStyle(0x3a3a3a, 0.3); g.fillRect(x + 2, y2 + 27, 28, 3);
      g.fillStyle(0x3a3a3a, 0.3); g.fillRect(x + 32, y2 + 29, 30, 3);
      if (i % 3 === 0) { g.fillStyle(0x3a5a2a, 0.3); g.fillCircle(x + 15, y2 + 45, 5); g.fillCircle(x + 50, y2 + 10, 3); }
      if (i % 4 === 1) { g.lineStyle(1, 0x3a3a3a, 0.5); g.lineBetween(x + 20, y2 + 15, x + 28, y2 + 22); g.lineBetween(x + 28, y2 + 22, x + 25, y2 + 30); }

      // ========== Row 3: Water ==========
      const y3 = 3 * S + M;
      this.grad(g, x, y3, T, T, 0x1a3068, 0x0a1840);
      g.fillStyle(0x1a2850, 0.4); g.fillEllipse(x + 32, y3 + 32, 50, 30);
      g.lineStyle(1, 0x3a5a9a, 0.35);
      for (let w = 0; w < 4; w++) {
        const wy = y3 + 10 + w * 14;
        g.beginPath(); g.moveTo(x, wy);
        for (let wx = 0; wx < T; wx += 8) {
          g.lineTo(x + wx, wy + Math.sin((wx + i * 12 + w * 20) * 0.1) * 3);
        }
        g.strokePath();
      }
      g.fillStyle(0x6a8aca, 0.3); g.fillCircle(x + 18 + (i * 11) % 28, y3 + 20, 3);
      g.fillStyle(0x8aaaee, 0.2); g.fillCircle(x + 40 + (i * 7) % 20, y3 + 44, 4);
      g.fillStyle(0xaaccff, 0.25); g.fillCircle(x + 12 + (i * 13) % 40, y3 + 28, 1.5);
      g.fillStyle(0xffffff, 0.15); g.fillCircle(x + 30 + (i * 9) % 28, y3 + 16, 1);
      g.lineStyle(1, 0x4a6a9a, 0.2);
      g.strokeCircle(x + 24 + (i * 5) % 20, y3 + 36, 5);

      // ========== Row 4: Walls ==========
      const y4 = 4 * S + M;
      this.grad(g, x, y4, T, T, 0x484848, 0x222222);
      for (let row = 0; row < 4; row++) {
        const by = y4 + row * 16;
        const off = row % 2 === 0 ? 0 : 11;
        g.lineStyle(1, 0x5a5a5a, 0.5); g.lineBetween(x, by, x + T, by);
        for (let b = 0; b < 3; b++) {
          const bx = x + off + b * 22;
          const bw = Math.min(20, T - (bx - x));
          if (bw <= 0) continue;
          const shade = rng.pick([0x3a3838, 0x404040, 0x383636, 0x4a4848]);
          g.fillStyle(shade, 0.6); g.fillRect(bx + 1, by + 1, bw - 1, 14);
          g.fillStyle(0x5a5a5a, 0.2); g.fillRect(bx + 1, by + 1, bw - 1, 2);
          g.fillStyle(0x1a1a1a, 0.2); g.fillRect(bx + 1, by + 13, bw - 1, 2);
          g.lineStyle(1, 0x5a5a5a, 0.4); g.lineBetween(bx, by, bx, by + 16);
        }
      }
      g.fillStyle(0x5a5a5a, 0.4); g.fillRect(x, y4, T, 1);
      g.fillStyle(0x0a0a0a, 0.4); g.fillRect(x, y4 + T - 3, T, 3);
      if (i === 2 || i === 5) { g.fillStyle(0x2a2a2a, 0.4); g.fillRect(x + 20, y4 + 30, 8, 4); }

      // ========== Row 5: Wood floor ==========
      const y5 = 5 * S + M;
      const plankH = 10;
      for (let p = 0; p < 6; p++) {
        const py5 = y5 + p * plankH + (p > 0 ? p : 0);
        const baseColor = p % 2 === 0 ? 0x7a5a3a : 0x6e4e2e;
        const darkColor = p % 2 === 0 ? 0x6a4a2a : 0x5e3e1e;
        this.grad(g, x, py5, T, plankH, baseColor, darkColor);
        g.lineStyle(1, 0x5a3a1a, 0.25);
        g.lineBetween(x, py5 + 3, x + T, py5 + 3);
        g.lineBetween(x, py5 + 7, x + T, py5 + 7);
        g.fillStyle(0x1a0a00, 0.6); g.fillRect(x, py5 + plankH, T, 1);
        g.fillStyle(0x8a6a4a, 0.2); g.fillRect(x, py5, T, 1);
      }
      if (i % 3 === 1) {
        g.fillStyle(0x5a3a1a); g.fillCircle(x + 24, y5 + 25, 4);
        g.fillStyle(0x4a2a0a); g.fillCircle(x + 24, y5 + 25, 2);
        g.lineStyle(1, 0x3a1a0a, 0.3);
        g.strokeCircle(x + 24, y5 + 25, 6);
      }
      g.fillStyle(0x888888, 0.4);
      g.fillCircle(x + 5, y5 + 5, 1); g.fillCircle(x + 58, y5 + 5, 1);
      g.fillCircle(x + 5, y5 + 55, 1); g.fillCircle(x + 58, y5 + 55, 1);

      // ========== Row 6: Special tiles (dark base) ==========
      const y6 = 6 * S + M;
      g.fillStyle(0x0a0a1a); g.fillRect(x, y6, T, T);

      // ========== Row 7: Void ==========
      const y7 = 7 * S + M;
      this.grad(g, x, y7, T, T, 0x080808, 0x020202);
      g.fillStyle(0x1a1a2a, 0.3); g.fillCircle(x + rng.between(10, 54), y7 + rng.between(10, 54), rng.between(1, 3));
    }

    // ========== Portal tile (col 0, row 6) ==========
    const ppx = 0 * S + M, ppy = 6 * S + M;
    g.fillStyle(0x0a0a1a); g.fillRect(ppx, ppy, T, T);
    g.fillStyle(0x3a1a6a, 0.15); g.fillCircle(ppx + 32, ppy + 32, 30);
    for (let r = 28; r > 2; r -= 2) {
      const t = (28 - r) / 26;
      const alpha = 0.15 + t * 0.65;
      g.fillStyle(Phaser.Display.Color.GetColor(
        Math.floor(74 + t * 100), Math.floor(26 + t * 40), Math.floor(138 + t * 80)
      ), alpha);
      g.fillCircle(ppx + 32, ppy + 32, r);
    }
    g.fillStyle(0xe0c0ff, 0.9); g.fillCircle(ppx + 32, ppy + 32, 5);
    g.fillStyle(0xffffff, 0.7); g.fillCircle(ppx + 32, ppy + 32, 2);
    g.fillStyle(0xffffff, 0.5); g.fillCircle(ppx + 22, ppy + 20, 1.5); g.fillCircle(ppx + 40, ppy + 24, 1);
    g.fillCircle(ppx + 26, ppy + 42, 1); g.fillCircle(ppx + 42, ppy + 38, 1.5);
    for (let a = 0; a < 6; a++) {
      const angle = (a / 6) * Math.PI * 2;
      g.fillStyle(0xc0a0ff, 0.6);
      g.fillCircle(ppx + 32 + Math.cos(angle) * 20, ppy + 32 + Math.sin(angle) * 20, 1.5);
    }

    // ========== Chest tile (col 1, row 6) ==========
    const chx = 1 * S + M, chy = 6 * S + M;
    g.fillStyle(0x0a0a1a); g.fillRect(chx, chy, T, T);
    this.grad(g, chx + 10, chy + 26, 44, 28, 0x8a6a2a, 0x5a3a0a);
    this.grad(g, chx + 10, chy + 18, 44, 12, 0xba9a4a, 0x7a5a1a);
    g.fillStyle(0xca9a3a); g.fillRoundedRect(chx + 10, chy + 16, 44, 6, 3);
    g.fillStyle(0x888888); g.fillRect(chx + 10, chy + 28, 44, 2); g.fillRect(chx + 10, chy + 40, 44, 2);
    g.fillStyle(0x999999); g.fillRect(chx + 10, chy + 18, 3, 36); g.fillRect(chx + 51, chy + 18, 3, 36);
    g.fillStyle(0xdaa520); g.fillRoundedRect(chx + 27, chy + 31, 10, 12, 2);
    g.fillStyle(0xffd700); g.fillCircle(chx + 32, chy + 34, 3);
    g.fillStyle(0x1a1a1a); g.fillCircle(chx + 32, chy + 34, 1.5);
    g.fillStyle(0x1a1a1a); g.fillRect(chx + 31, chy + 36, 2, 4);
    g.lineStyle(1.5, 0x4a2a0a); g.strokeRoundedRect(chx + 10, chy + 16, 44, 38, 2);
    g.fillStyle(0xeaba5a, 0.3); g.fillRect(chx + 12, chy + 18, 40, 2);

    g.generateTexture('tileset', cols * S, rows * S);
    g.destroy();
  }

  // Draw base body for a single frame
  drawPlayerBase(g, x, y, d, f) {
    const S = 4; // pixel scale — her piksel 4x4px
    const walk = f === 1 ? 1 : 0; // 1 pixel shift for walk animation
    const P = { // palette
      O: 0x3a2a1a,     // outline (dark brown)
      S: 0xdeb887,     // skin base
      L: 0xeecb97,     // skin light
      D: 0xc8a070,     // skin dark
      H: 0xc0c0d8,     // hair base (silver)
      h: 0xa0a0c0,     // hair dark
      G: 0xdadaee,     // hair shine
      W: 0xFFFFFF,     // eye white
      I: 0x4a6aaa,     // iris blue
      P: 0x1a2a4a,     // pupil
      B: 0x8a8aa0,     // eyebrow
      N: 0xb09070,     // nose
      M: 0xc09080,     // mouth
      U: 0x4a4a6a,     // underwear
      u: 0x3a3a5a,     // underwear dark
      K: 0x5a5a7a,     // belt line
      X: [0x000000, 0.3], // shadow
    };

    // Shadow
    g.fillStyle(0x000000, 0.2); g.fillEllipse(x + 32, y + 90, 36, 8);

    if (d === 0) { // === FRONT ===
      const rows = [
        '....OHHHO....',  // 0 - hair top
        '...OHGHHO....',  // 1 - hair with shine
        '...OHHHHHO...',  // 2 - hair sides
        '..OhHHHHHhO..',  // 3
        '..OhOSSSOhO..',  // 4 - forehead
        '..OhOLSSOhO..',  // 5
        '..OhWIWSWIWhO',  // 6 - eyes (placeholder, drawn after)
        '..OhOSNSOhO..',  // 7 - nose
        '..Oh.SMS.hO..',  // 8 - mouth
        '..Oh.SSS.hO..',  // 9 - chin
        '...O.SSS.O...',  // 10 - neck
        '..OOSSSSSOO..',  // 11 - shoulders
        '.OOLLSSSDDOO.',  // 12 - torso (light left, dark right)
        '.OOLLSSSDDOO.',  // 13
        '.OO.KUUK.OO..',  // 14 - belt/shorts
        '..O.OuuuO.O..',  // 15 - shorts
        '..O.OSSO.O...',  // 16 - upper legs
        '..O.OSSO.O...',  // 17
        '..O.ODDO.O...',  // 18 - lower legs (shadow)
        '....ODDO.....',  // 19 - feet
      ];
      // Adjust leg positions for walk
      this.drawPixelArt(g, x + 6, y + 4, rows, P, S);

      // Eyes detail (overwrite eye area with precision)
      // Left eye
      g.fillStyle(0xFFFFFF); g.fillRect(x + 22, y + 28, 8, 8);
      g.fillStyle(0x4a6aaa); g.fillRect(x + 24, y + 28, 6, 8);
      g.fillStyle(0x1a2a4a); g.fillRect(x + 26, y + 30, 4, 4);
      g.fillStyle(0xFFFFFF); g.fillRect(x + 24, y + 28, 2, 2);
      // Right eye
      g.fillStyle(0xFFFFFF); g.fillRect(x + 34, y + 28, 8, 8);
      g.fillStyle(0x4a6aaa); g.fillRect(x + 34, y + 28, 6, 8);
      g.fillStyle(0x1a2a4a); g.fillRect(x + 36, y + 30, 4, 4);
      g.fillStyle(0xFFFFFF); g.fillRect(x + 34, y + 28, 2, 2);

    } else if (d === 3) { // === BACK ===
      const rows = [
        '....OhhhO....',
        '...OhhGhhO...',
        '...OhhhhhO...',
        '..OhhhhhhhO..',
        '..OhhhhhhhO..',
        '..OhhhhhhhO..',
        '..OhhhhhhhO..',
        '..OhhhhhhhO..',
        '..Oh.SSS.hO..',
        '..Oh.SSS.hO..',
        '...O.SSS.O...',
        '..OOSSSSSOO..',
        '.OOSSSSSSSOO.',
        '.OOSSSSSSSOO.',
        '.OO.KUUK.OO..',
        '..O.OuuuO.O..',
        '..O.OSSO.O...',
        '..O.OSSO.O...',
        '..O.OSSO.O...',
        '....ODDO.....',
      ];
      this.drawPixelArt(g, x + 6, y + 4, rows, P, S);

    } else { // === LEFT (d=1) or RIGHT (d=2) ===
      const rows = [
        '...OHHHO...',
        '..OHGHHO...',
        '..OHHHHHO..',
        '.OhHHHHhO..',
        '.OhOSSSO...',
        '.OhOLSSO...',
        '.OhWISO....',  // single eye side
        '.OhNSSO....',
        '.Oh.MSO....',
        '.Oh.SSO....',
        '..O.SSO....',
        '..OOSSOO...',
        '.OOSSSOO...',
        '.OOSSSOO...',
        '.OO.UUO....',
        '..O.uuO....',
        '..O.SSO....',
        '..O.SSO....',
        '..O.DDO....',
        '....DDO....',
      ];
      const flip = d === 2;
      const finalRows = flip ? rows.map(r => r.split('').reverse().join('')) : rows;
      this.drawPixelArt(g, x + (flip ? 4 : 8), y + 4, finalRows, P, S);

      // Side eye detail
      const ex = d === 1 ? x + 16 : x + 36;
      g.fillStyle(0xFFFFFF); g.fillRect(ex, y + 28, 6, 6);
      g.fillStyle(0x4a6aaa); g.fillRect(ex + 2, y + 28, 4, 6);
      g.fillStyle(0x1a2a4a); g.fillRect(ex + 2, y + 30, 4, 4);
      g.fillStyle(0xFFFFFF); g.fillRect(ex, y + 28, 2, 2);
    }
  }

  // Draw equipment overlay for a single frame
  drawEquipLayer(g, x, y, d, f, slot, color) {
    const walk = f === 1 ? 4 : 0;
    const c = color || 0x2a3a6a;
    const cDark = c - 0x101010;

    if (slot === 'chest') {
      // Shirt/armor torso
      g.fillStyle(c); g.fillRect(x + 14, y + 28, 36, 26);
      g.fillStyle(cDark); g.fillRect(x + 15, y + 29, 34, 3);
      g.lineStyle(1, cDark); g.lineBetween(x + 32, y + 28, x + 32, y + 54);
      // Sleeves
      if (d === 1) { g.fillStyle(c); g.fillRoundedRect(x + 8, y + 30, 10, 18, 2); }
      else if (d === 2) { g.fillStyle(c); g.fillRoundedRect(x + 46, y + 30, 10, 18, 2); }
      else { g.fillStyle(c); g.fillRoundedRect(x + 6, y + 30, 10, 18, 2); g.fillRoundedRect(x + 48, y + 30, 10, 18, 2); }
    } else if (slot === 'legs') {
      // Pants — extend to fully cover legs and feet
      g.fillStyle(c);
      g.fillRect(x + 21 + walk, y + 54, 11, 32);
      g.fillRect(x + 31 - walk, y + 54, 11, 32);
      g.fillRect(x + 16, y + 50, 32, 6);
      // Shoe/boot cuff at bottom
      g.fillStyle(cDark);
      g.fillRect(x + 21 + walk, y + 82, 11, 4);
      g.fillRect(x + 31 - walk, y + 82, 11, 4);
    } else if (slot === 'head') {
      // Helmet
      g.fillStyle(c); g.fillRoundedRect(x + 15, y + 0, 34, 18, 5);
      g.fillStyle(cDark); g.fillRect(x + 16, y + 14, 32, 4);
      // Visor slit
      if (d === 0) { g.fillStyle(0x1a1a2a); g.fillRect(x + 22, y + 10, 20, 3); }
    } else if (slot === 'weapon') {
      // Sword in hand
      const wx = d === 1 ? x + 4 : x + 52;
      g.fillStyle(0xA0A0A0); g.fillRect(wx, y + 28, 3, 22);
      g.fillStyle(0x654321); g.fillRect(wx - 2, y + 48, 7, 3);
      g.fillStyle(0x5a3a1a); g.fillRect(wx, y + 51, 3, 6);
    } else if (slot === 'arms') {
      // Gloves/gauntlets
      g.fillStyle(c);
      if (d !== 3) {
        g.fillCircle(x + 12, y + 52, 5); g.fillCircle(x + 52, y + 52, 5);
        g.fillRect(x + 8, y + 46, 8, 6); g.fillRect(x + 48, y + 46, 8, 6);
      }
    } else if (slot === 'belt') {
      g.fillStyle(c); g.fillRect(x + 14, y + 52, 36, 5);
      g.fillStyle(0xdaa520); g.fillRect(x + 28, y + 52, 8, 5);
    } else if (slot === 'necklace') {
      g.fillStyle(c, 0.6); g.fillCircle(x + 32, y + 30, 6);
      g.fillStyle(c); g.fillRect(x + 30, y + 28, 5, 5);
    } else if (slot === 'earring') {
      g.fillStyle(c); g.fillCircle(x + 18, y + 18, 2); g.fillCircle(x + 46, y + 18, 2);
    }
  }

  generatePlayerSprite() {
    const fw = 64, fh = 96;
    const frames = 8;

    // Base body (underwear only)
    if (!this.textures.exists('player')) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      for (let d = 0; d < 4; d++) {
        for (let f = 0; f < 2; f++) {
          this.drawPlayerBase(g, (d * 2 + f) * fw, 0, d, f);
        }
      }
      g.generateTexture('player', frames * fw, fh);
      const tex = this.textures.get('player');
      for (let i = 0; i < frames; i++) tex.add(i, 0, i * fw, 0, fw, fh);
      g.destroy();
    }

    // Equipment overlay layers — each slot gets its own spritesheet
    const equipLayers = [
      { key: 'equip_chest', slot: 'chest', color: 0x2a3a6a },
      { key: 'equip_legs', slot: 'legs', color: 0x2a2a3a },
      { key: 'equip_head', slot: 'head', color: 0x808080 },
      { key: 'equip_weapon', slot: 'weapon', color: 0xA0A0A0 },
      { key: 'equip_arms', slot: 'arms', color: 0x5a5a5a },
      { key: 'equip_belt', slot: 'belt', color: 0x5a3a1a },
      { key: 'equip_necklace', slot: 'necklace', color: 0x9a6aea },
      { key: 'equip_earring', slot: 'earring', color: 0xFFD700 },
    ];

    equipLayers.forEach(layer => {
      if (this.textures.exists(layer.key)) return;
      const lg = this.make.graphics({ x: 0, y: 0, add: false });
      for (let d = 0; d < 4; d++) {
        for (let f = 0; f < 2; f++) {
          this.drawEquipLayer(lg, (d * 2 + f) * fw, 0, d, f, layer.slot, layer.color);
        }
      }
      lg.generateTexture(layer.key, frames * fw, fh);
      const ltex = this.textures.get(layer.key);
      for (let i = 0; i < frames; i++) ltex.add(i, 0, i * fw, 0, fw, fh);
      lg.destroy();
    });

    // ===== FEMALE CHARACTER =====
    if (!this.textures.exists('player_female')) {
      const gf = this.make.graphics({ x: 0, y: 0, add: false });
      for (let d = 0; d < 4; d++) {
        for (let f = 0; f < 2; f++) {
          this.drawPlayerBaseFemale(gf, (d * 2 + f) * fw, 0, d, f);
        }
      }
      gf.generateTexture('player_female', frames * fw, fh);
      const texF = this.textures.get('player_female');
      for (let i = 0; i < frames; i++) texF.add(i, 0, i * fw, 0, fw, fh);
      gf.destroy();
    }

    // Female equipment overlays
    equipLayers.forEach(layer => {
      if (this.textures.exists(layer.key + '_f')) return;
      const lg = this.make.graphics({ x: 0, y: 0, add: false });
      for (let d = 0; d < 4; d++) {
        for (let f = 0; f < 2; f++) {
          this.drawEquipLayerFemale(lg, (d * 2 + f) * fw, 0, d, f, layer.slot, layer.color);
        }
      }
      lg.generateTexture(layer.key + '_f', frames * fw, fh);
      const ltex = this.textures.get(layer.key + '_f');
      for (let i = 0; i < frames; i++) ltex.add(i, 0, i * fw, 0, fw, fh);
      lg.destroy();
    });
  }

  drawPlayerBaseFemale(g, x, y, d, f) {
    const S = 4;
    const P = {
      O: 0x4a2a1a,     // outline
      S: 0xf0d0b0,     // skin
      L: 0xfae0c8,     // skin light
      D: 0xd8b898,     // skin dark
      R: 0x8B3A2A,     // hair (red-brown)
      r: 0x7a2a1a,     // hair dark
      G: 0xAB5A4A,     // hair shine
      W: 0xFFFFFF,     // eye white
      I: 0x4a8a4a,     // iris green
      E: 0x4a1a0a,     // eyelash
      C: 0xcc6699,     // top (pink)
      c: 0xbb5588,     // top dark
      T: 0xdd7788,     // lips
      B: [0xffaaaa, 0.3], // blush
      U: 0xcc6699,     // underwear
      u: 0xaa5577,     // underwear dark
      X: [0x000000, 0.3],
    };

    // Shadow
    g.fillStyle(0x000000, 0.2); g.fillEllipse(x + 32, y + 90, 32, 8);

    if (d === 0) { // === FRONT ===
      const rows = [
        '....ORRRO....',  // 0 - hair top
        '...ORGRRRO...',  // 1 - hair shine
        '..ORRRRRRRO..',  // 2
        '..OrOSSSOrO..',  // 3 - forehead
        '..OrOLSSOr O..',  // 4
        '..OrWIWSWIOrO',  // 5 - eyes (overdrawn)
        '..OrOSNSOr O..',  // 6 - nose
        '..Or.STS.rO..',  // 7 - lips
        '..Or.SSS.rO..',  // 8 - chin
        '..Or.SSS.rO..',  // 9
        '...r.SSS.r...',  // 10 - neck
        '..rOCCCCCOr..',  // 11 - top/bra
        '.rOOcCCCcOOr.',  // 12
        '.rOOLSSSSOOr.',  // 13 - waist
        '.rO.OUUO.Or..',  // 14 - shorts
        '..O.OuuuO.O..',  // 15
        '..O..SS..O...',  // 16 - legs
        '..O..SS..O...',  // 17
        '..O..DD..O...',  // 18
        '.....DD......',  // 19 - feet
      ];
      this.drawPixelArt(g, x + 6, y + 4, rows, P, S);

      // Eyes — bigger anime style
      g.fillStyle(0xFFFFFF); g.fillRect(x + 22, y + 24, 8, 8); g.fillRect(x + 34, y + 24, 8, 8);
      g.fillStyle(0x4a8a4a); g.fillRect(x + 24, y + 24, 6, 8); g.fillRect(x + 34, y + 24, 6, 8);
      g.fillStyle(0x1a4a1a); g.fillRect(x + 26, y + 26, 4, 4); g.fillRect(x + 36, y + 26, 4, 4);
      g.fillStyle(0xFFFFFF); g.fillRect(x + 24, y + 24, 2, 2); g.fillRect(x + 34, y + 24, 2, 2);
      // Eyelashes
      g.fillStyle(0x4a1a0a); g.fillRect(x + 22, y + 23, 8, 2); g.fillRect(x + 34, y + 23, 8, 2);
      // Blush
      g.fillStyle(0xffaaaa, 0.25); g.fillRect(x + 20, y + 32, 8, 4); g.fillRect(x + 36, y + 32, 8, 4);

    } else if (d === 3) { // === BACK ===
      const rows = [
        '....OrrrO....',
        '...OrrGrrO...',
        '..OrrrrrrrrO.',
        '..OrrrrrrrrO.',
        '..OrrrrrrrrO.',
        '..OrrrrrrrrO.',
        '..OrrrrrrrrO.',
        '..OrrrrrrrrO.',
        '..Or.SSS.rO..',
        '..Or.SSS.rO..',
        '..Or.SSS.r...',
        '..rOCCCCCOr..',
        '.rOOCCCCCOOr.',
        '.rOOSSSSSSOr.',
        '.rO.OUUO.Or..',
        '..O.OuuuO.O..',
        '..O..SS..O...',
        '..O..SS..O...',
        '..O..SS..O...',
        '.....DD......',
      ];
      this.drawPixelArt(g, x + 6, y + 4, rows, P, S);

    } else { // === SIDE ===
      const rows = [
        '...ORRRO...',
        '..ORGRRRO..',
        '..ORRRRRO..',
        '.OrRRRRrO..',
        '.OrOSSS....',
        '.OrOLSS....',
        '.OrWISO....',
        '.OrNSSO....',
        '.Or.TSO....',
        '.Or.SSO....',
        '..r.SSO....',
        '..rOCCOO...',
        '.rOcCCOO...',
        '.rOSSSSOO..',
        '.rO.UUO....',
        '..O.uuO....',
        '..O.SSO....',
        '..O.SSO....',
        '..O.DDO....',
        '....DDO....',
      ];
      const flip = d === 2;
      const finalRows = flip ? rows.map(r => r.split('').reverse().join('')) : rows;
      this.drawPixelArt(g, x + (flip ? 4 : 8), y + 4, finalRows, P, S);

      // Side eye
      const ex = d === 1 ? x + 16 : x + 36;
      g.fillStyle(0xFFFFFF); g.fillRect(ex, y + 28, 6, 6);
      g.fillStyle(0x4a8a4a); g.fillRect(ex + 2, y + 28, 4, 6);
      g.fillStyle(0x1a4a1a); g.fillRect(ex + 2, y + 30, 4, 4);
      g.fillStyle(0xFFFFFF); g.fillRect(ex, y + 28, 2, 2);
      g.fillStyle(0x4a1a0a); g.fillRect(ex, y + 27, 6, 2);
    }
  }

  drawEquipLayerFemale(g, x, y, d, f, slot, color) {
    // Female equipment — slightly slimmer fit
    const walk = f === 1 ? 4 : 0;
    const c = color || 0x2a3a6a;
    const cDark = c - 0x101010;

    if (slot === 'chest') {
      g.fillStyle(c); g.fillRect(x + 16, y + 30, 32, 24);
      g.fillStyle(cDark); g.fillRect(x + 17, y + 31, 30, 3);
      g.lineStyle(1, cDark); g.lineBetween(x + 32, y + 30, x + 32, y + 54);
      if (d === 1) { g.fillStyle(c); g.fillRoundedRect(x + 10, y + 32, 8, 16, 2); }
      else if (d === 2) { g.fillStyle(c); g.fillRoundedRect(x + 46, y + 32, 8, 16, 2); }
      else { g.fillStyle(c); g.fillRoundedRect(x + 8, y + 32, 8, 16, 2); g.fillRoundedRect(x + 48, y + 32, 8, 16, 2); }
      // Skirt detail
      g.fillStyle(c); g.fillRect(x + 16, y + 50, 32, 6);
      g.fillStyle(cDark); g.fillRect(x + 18, y + 54, 12, 4); g.fillRect(x + 34, y + 54, 12, 4);
    } else if (slot === 'legs') {
      g.fillStyle(c);
      g.fillRect(x + 23 + walk, y + 54, 9, 32);
      g.fillRect(x + 32 - walk, y + 54, 9, 32);
      g.fillRect(x + 18, y + 50, 28, 6);
      g.fillStyle(cDark);
      g.fillRect(x + 23 + walk, y + 82, 9, 4);
      g.fillRect(x + 32 - walk, y + 82, 9, 4);
    } else if (slot === 'head') {
      g.fillStyle(c); g.fillRoundedRect(x + 16, y + 0, 32, 16, 6);
      g.fillStyle(cDark); g.fillRect(x + 17, y + 14, 30, 4);
      if (d === 0) { g.fillStyle(0x1a1a2a); g.fillRect(x + 23, y + 10, 18, 3); }
      // Tiara/crown detail for female
      g.fillStyle(0xDAA520); g.fillRect(x + 24, y + 0, 16, 2);
      g.fillCircle(x + 32, y + 0, 2);
    } else {
      // Other slots same as male
      this.drawEquipLayer(g, x, y, d, f, slot, color);
    }
  }

  generateMonsterSprites() {
    const monsters = [
      { key: 'slime', w: 56, h: 48 },
      { key: 'goblin', w: 60, h: 72 },
      { key: 'skeleton', w: 60, h: 80 },
      { key: 'orc', w: 72, h: 84 },
      { key: 'wolf', w: 56, h: 48 },
      { key: 'golem', w: 64, h: 72 },
      { key: 'wraith', w: 52, h: 64 },
      { key: 'dragon', w: 128, h: 120 },
      // Ejder yavruları
      { key: 'drake', w: 96, h: 88 },
      { key: 'drake_mother', w: 120, h: 112 },
      // Overworld boss
      { key: 'ancient_dragon', w: 140, h: 128 },
      // Bölge bossları
      { key: 'slime_king', w: 64, h: 56 },
      { key: 'goblin_chief', w: 68, h: 80 },
      { key: 'skeleton_lord', w: 68, h: 88 },
      { key: 'orc_warlord', w: 80, h: 92 },
      { key: 'alpha_wolf', w: 64, h: 52 },
      { key: 'crystal_golem', w: 72, h: 80 },
      { key: 'wraith_queen', w: 60, h: 72 },
      // Labyrinth monsters
      { key: 'minotaur', w: 72, h: 84 },
      { key: 'shadow_spider', w: 56, h: 48 },
      { key: 'cursed_knight', w: 60, h: 80 },
      { key: 'maze_phantom', w: 52, h: 64 },
      { key: 'labyrinth_guardian', w: 80, h: 88 },
      // Dungeon monsters
      { key: 'fire_imp', w: 48, h: 56 },
      { key: 'dark_bat', w: 52, h: 44 },
      { key: 'cave_troll', w: 72, h: 84 },
      { key: 'lava_golem', w: 64, h: 72 },
      { key: 'shadow_demon', w: 60, h: 72 },
      { key: 'bone_dragon', w: 96, h: 96 },
      { key: 'abyssal_fiend', w: 72, h: 80 },
      // Dungeon bosses
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

    monsters.forEach(m => {
      // Skip if PNG already loaded
      if (this.textures.exists(m.key)) return;
      // Use two passes: first draw to temp canvas for outline, then draw final
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      for (let f = 0; f < 2; f++) {
        const x = f * m.w, y = 0, b = f === 1 ? 3 : 0;
        // Ground shadow (slightly larger, softer)
        g.fillStyle(0x000000, 0.25); g.fillEllipse(x + m.w / 2, y + m.h - 4, m.w - 12, 10);
        g.fillStyle(0x000000, 0.15); g.fillEllipse(x + m.w / 2, y + m.h - 4, m.w - 8, 6);

        if (m.key === 'slime') {
          const sq = f === 1 ? 4 : 0;
          g.fillStyle(0x40d040); g.fillEllipse(x + 28, y + 22 + sq, 44, 34 - sq * 2);
          this.grad(g, x + 8, y + 12 + sq, 40, 24 - sq, 0x50e050, 0x20a020);
          g.fillStyle(0x80ff80, 0.3); g.fillEllipse(x + 20, y + 14 + sq, 14, 10);
          g.fillStyle(0xFFFFFF); g.fillCircle(x + 18, y + 20 + sq, 6); g.fillCircle(x + 38, y + 20 + sq, 6);
          g.fillStyle(0x000000); g.fillCircle(x + 20, y + 20 + sq, 3); g.fillCircle(x + 40, y + 20 + sq, 3);
          g.fillStyle(0x108010); g.fillEllipse(x + 28, y + 30 + sq, 10, 4);
          g.fillStyle(0x30c030, 0.5); g.fillRect(x + 14, y + 34 + sq, 4, 6 + b);

        } else if (m.key === 'goblin') {
          g.fillStyle(0x2E8B57); g.fillRect(x + 16 + b, y + 52, 10, 16); g.fillRect(x + 34 - b, y + 52, 10, 16);
          g.fillStyle(0x1a6a3a); g.fillRect(x + 14 + b, y + 64, 14, 6); g.fillRect(x + 32 - b, y + 64, 14, 6);
          this.grad(g, x + 14, y + 28, 32, 26, 0x3CB371, 0x2E8B57);
          g.fillStyle(0x5a3a1a); g.fillRect(x + 16, y + 30, 28, 20);
          g.fillStyle(0x3CB371); g.fillRoundedRect(x + 8, y + 30, 8, 18, 2); g.fillRoundedRect(x + 44, y + 30, 8, 18, 2);
          g.fillStyle(0x3CB371); g.fillRoundedRect(x + 14, y + 6, 32, 24, 4);
          g.fillTriangle(x + 4, y + 12, x + 16, y + 6, x + 16, y + 20);
          g.fillTriangle(x + 44, y + 6, x + 56, y + 12, x + 44, y + 20);
          g.fillStyle(0xFF0000); g.fillRect(x + 20, y + 14, 7, 5); g.fillRect(x + 33, y + 14, 7, 5);
          g.fillStyle(0xFFFF00); g.fillCircle(x + 23, y + 16, 2); g.fillCircle(x + 36, y + 16, 2);
          g.fillStyle(0xFFFFF0); g.fillRect(x + 24, y + 24, 4, 4); g.fillRect(x + 32, y + 24, 4, 4);

        } else if (m.key === 'skeleton') {
          g.fillStyle(0xF5F5DC); g.fillRect(x + 18 + b, y + 52, 7, 22); g.fillRect(x + 35 - b, y + 52, 7, 22);
          g.fillStyle(0xE0E0C8); g.fillCircle(x + 21 + b, y + 58, 4); g.fillCircle(x + 38 - b, y + 58, 4);
          g.fillStyle(0xF5F5DC); g.fillRect(x + 16, y + 24, 28, 30);
          g.fillStyle(0xE0E0C8); for (let r = 0; r < 5; r++) g.fillRect(x + 18, y + 27 + r * 6, 24, 3);
          g.fillStyle(0x1a1a1a); g.fillRect(x + 24, y + 30, 12, 18);
          g.fillStyle(0xF5F5DC); g.fillRect(x + 8, y + 26, 7, 22); g.fillRect(x + 45, y + 26, 7, 22);
          g.fillStyle(0xF5F5DC); g.fillRoundedRect(x + 16, y + 2, 28, 24, 6);
          g.fillStyle(0x1a0a0a); g.fillCircle(x + 24, y + 12, 5); g.fillCircle(x + 36, y + 12, 5);
          g.fillStyle(0xFF4444); g.fillCircle(x + 24, y + 12, 3); g.fillCircle(x + 36, y + 12, 3);
          g.fillStyle(0x1a0a0a); g.fillTriangle(x + 30, y + 17, x + 27, y + 22, x + 33, y + 22);
          g.fillStyle(0x808080); g.fillRect(x + 52, y + 18, 4, 28);
          g.fillStyle(0x5a3a1a); g.fillRect(x + 50, y + 16, 8, 4);

        } else if (m.key === 'orc') {
          g.fillStyle(0x4a5a2a); g.fillRect(x + 18 + b, y + 58, 14, 20); g.fillRect(x + 40 - b, y + 58, 14, 20);
          g.fillStyle(0x3a2a1a); g.fillRoundedRect(x + 16 + b, y + 72, 18, 10, 2); g.fillRoundedRect(x + 38 - b, y + 72, 18, 10, 2);
          this.grad(g, x + 10, y + 24, 52, 36, 0x556B2F, 0x4a5a20);
          g.fillStyle(0x5a5a5a); g.fillRect(x + 14, y + 26, 44, 24);
          g.fillStyle(0x6a6a6a); g.fillRect(x + 16, y + 28, 40, 6);
          g.fillStyle(0x4a2a0a); g.fillRect(x + 12, y + 52, 48, 6);
          g.fillStyle(0x556B2F); g.fillRoundedRect(x + 2, y + 26, 12, 24, 3); g.fillRoundedRect(x + 58, y + 26, 12, 24, 3);
          g.fillStyle(0x5a5a5a); g.fillRoundedRect(x + 1, y + 24, 14, 8, 3); g.fillRoundedRect(x + 57, y + 24, 14, 8, 3);
          g.fillStyle(0x556B2F); g.fillRoundedRect(x + 16, y + 2, 40, 24, 5);
          g.fillStyle(0x4a5a1a); g.fillRect(x + 20, y + 8, 32, 4);
          g.fillStyle(0xFF0000); g.fillRect(x + 24, y + 10, 8, 6); g.fillRect(x + 40, y + 10, 8, 6);
          g.fillStyle(0xFFFF00); g.fillCircle(x + 28, y + 13, 2); g.fillCircle(x + 44, y + 13, 2);
          g.fillStyle(0xFFFFF0); g.fillRect(x + 26, y + 22, 4, 6); g.fillRect(x + 42, y + 22, 4, 6);
          g.fillStyle(0x5a3a1a); g.fillRect(x + 66, y + 14, 4, 40);
          g.fillStyle(0x808080); g.fillTriangle(x + 62, y + 10, x + 70, y + 6, x + 70, y + 20);

        } else if (m.key === 'wolf') {
          g.fillStyle(0x000000, 0.3); g.fillEllipse(x + m.w / 2, y + m.h - 5, m.w - 14, 8);
          // Body
          g.fillStyle(0x606060); g.fillEllipse(x + 28, y + 28 + b, 40, 22);
          g.fillStyle(0x707070); g.fillEllipse(x + 28, y + 26 + b, 36, 18);
          // Legs
          g.fillStyle(0x505050);
          g.fillRect(x + 12 + b, y + 34, 6, 12); g.fillRect(x + 22 - b, y + 34, 6, 12);
          g.fillRect(x + 30 + b, y + 34, 6, 12); g.fillRect(x + 40 - b, y + 34, 6, 12);
          // Head
          g.fillStyle(0x707070); g.fillRoundedRect(x + 2, y + 14 + b, 20, 18, 4);
          g.fillStyle(0x808080); g.fillRoundedRect(x + 4, y + 16 + b, 16, 14, 3);
          // Ears
          g.fillStyle(0x606060); g.fillTriangle(x + 6, y + 14, x + 10, y + 6, x + 14, y + 14);
          g.fillTriangle(x + 14, y + 14, x + 18, y + 6, x + 22, y + 14);
          // Eyes
          g.fillStyle(0xFFFF00); g.fillCircle(x + 8, y + 22 + b, 2); g.fillCircle(x + 16, y + 22 + b, 2);
          g.fillStyle(0x000000); g.fillCircle(x + 8, y + 22 + b, 1); g.fillCircle(x + 16, y + 22 + b, 1);
          // Snout
          g.fillStyle(0x505050); g.fillRect(x + 2, y + 26 + b, 10, 6);
          g.fillStyle(0x1a1a1a); g.fillCircle(x + 4, y + 28 + b, 1.5);
          // Tail
          g.fillStyle(0x606060); g.fillTriangle(x + 46, y + 22, x + 54, y + 18, x + 48, y + 28);

        } else if (m.key === 'golem') {
          g.fillStyle(0x000000, 0.3); g.fillEllipse(x + m.w / 2, y + m.h - 5, m.w - 16, 10);
          // Legs (thick stone)
          g.fillStyle(0x5a5a50); g.fillRect(x + 16 + b, y + 50, 12, 18); g.fillRect(x + 36 - b, y + 50, 12, 18);
          g.fillStyle(0x6a6a60); g.fillRect(x + 18 + b, y + 52, 8, 14); g.fillRect(x + 38 - b, y + 52, 8, 14);
          // Body (massive stone)
          g.fillStyle(0x6a6a60); g.fillRoundedRect(x + 10, y + 18, 44, 36, 6);
          g.fillStyle(0x7a7a70); g.fillRoundedRect(x + 12, y + 20, 40, 32, 5);
          g.fillStyle(0x8a8a80); g.fillRect(x + 16, y + 24, 14, 10);
          // Cracks
          g.lineStyle(1, 0x4a4a40); g.lineBetween(x + 20, y + 22, x + 28, y + 38);
          g.lineBetween(x + 40, y + 24, x + 36, y + 42);
          // Arms
          g.fillStyle(0x6a6a60); g.fillRoundedRect(x + 2, y + 22, 12, 28, 3); g.fillRoundedRect(x + 50, y + 22, 12, 28, 3);
          g.fillStyle(0x7a7a70); g.fillRect(x + 4, y + 24, 8, 10); g.fillRect(x + 52, y + 24, 8, 10);
          // Head
          g.fillStyle(0x7a7a70); g.fillRoundedRect(x + 18, y + 4, 28, 20, 5);
          g.fillStyle(0x8a8a80); g.fillRoundedRect(x + 20, y + 6, 24, 16, 4);
          // Eyes (glowing)
          g.fillStyle(0xFFAA00); g.fillRect(x + 24, y + 12, 5, 4); g.fillRect(x + 35, y + 12, 5, 4);
          g.fillStyle(0xFFDD44); g.fillRect(x + 25, y + 13, 3, 2); g.fillRect(x + 36, y + 13, 3, 2);
          // Rune on chest
          g.fillStyle(0x44AAFF, 0.5); g.fillCircle(x + 32, y + 34, 6);
          g.fillStyle(0x66CCFF, 0.3); g.fillCircle(x + 32, y + 34, 3);

        } else if (m.key === 'wraith') {
          // Ghostly glow
          g.fillStyle(0x9370DB, 0.15); g.fillCircle(x + m.w / 2, y + 30, 28);
          // Body (ethereal, wispy)
          g.fillStyle(0x6A5ACD, 0.6); g.fillEllipse(x + 26, y + 30, 36, 40);
          g.fillStyle(0x7B68EE, 0.5); g.fillEllipse(x + 26, y + 28, 30, 34);
          g.fillStyle(0x8A7AEE, 0.4); g.fillEllipse(x + 26, y + 26, 22, 26);
          // Wispy tail
          g.fillStyle(0x6A5ACD, 0.3);
          g.fillTriangle(x + 16, y + 46, x + 10, y + 60, x + 22, y + 52);
          g.fillTriangle(x + 26, y + 48, x + 22, y + 62, x + 30, y + 54);
          g.fillTriangle(x + 36, y + 46, x + 30, y + 58, x + 40, y + 52);
          // Hood
          g.fillStyle(0x4a3a8a, 0.7); g.fillRoundedRect(x + 12, y + 6, 28, 22, 8);
          g.fillStyle(0x3a2a6a, 0.8); g.fillRoundedRect(x + 14, y + 8, 24, 18, 6);
          // Eyes (glowing red)
          g.fillStyle(0xFF0000, 0.8); g.fillCircle(x + 20, y + 18, 3); g.fillCircle(x + 32, y + 18, 3);
          g.fillStyle(0xFF4444); g.fillCircle(x + 20, y + 18, 1.5); g.fillCircle(x + 32, y + 18, 1.5);
          // Hands
          g.fillStyle(0x8A7AEE, 0.5);
          g.fillCircle(x + 8, y + 36 + b * 2, 5); g.fillCircle(x + 44, y + 36 - b * 2, 5);

        } else if (m.key === 'dragon') {
          // === EJDER (128x120) - Gerçekçi kırmızı ejderha ===
          const W = m.w, H = m.h;
          // Gölge
          g.fillStyle(0x000000, 0.4); g.fillEllipse(x + W/2, y + H - 8, W - 30, 14);
          // Kuyruk (sola kıvrılan, dikenli)
          g.fillStyle(0x8B0000);
          g.fillTriangle(x + 6, y + H - 20, x + 28, y + H - 35, x + 18, y + H - 10);
          g.fillStyle(0x5a0000); g.fillTriangle(x + 4, y + H - 22, x + 10, y + H - 30, x + 12, y + H - 16);
          // Bacaklar (kalın, pençeli)
          g.fillStyle(0x8B0000);
          g.fillRect(x + 32 + b, y + 82, 16, 26); g.fillRect(x + 76 - b, y + 82, 16, 26);
          g.fillStyle(0x5a0000);
          g.fillTriangle(x + 30 + b, y + 104, x + 38 + b, y + 100, x + 38 + b, y + 112);
          g.fillTriangle(x + 42 + b, y + 104, x + 50 + b, y + 100, x + 50 + b, y + 112);
          g.fillTriangle(x + 74 - b, y + 104, x + 82 - b, y + 100, x + 82 - b, y + 112);
          g.fillTriangle(x + 86 - b, y + 104, x + 94 - b, y + 100, x + 94 - b, y + 112);
          // Gövde (büyük, oval)
          this.grad(g, x + 24, y + 36, 80, 50, 0xAA2020, 0x8B0000);
          g.fillStyle(0xCC6644, 0.5); g.fillEllipse(x + W/2, y + 70, 50, 22);
          // Karın pulları
          g.fillStyle(0xCC7755, 0.4);
          for (let s = 0; s < 5; s++) g.fillRect(x + 42 + s * 10, y + 56, 8, 8);
          for (let s = 0; s < 4; s++) g.fillRect(x + 46 + s * 10, y + 66, 8, 6);
          // Sırt dikenleri
          g.fillStyle(0x5a0000);
          for (let s = 0; s < 6; s++) {
            const sx2 = x + 36 + s * 10, sy2 = y + 34 - s * 1;
            g.fillTriangle(sx2, sy2, sx2 + 4, sy2 - 8 - b, sx2 + 8, sy2);
          }
          // Kanatlar (geniş, kemikli)
          g.fillStyle(0xB22222, 0.85);
          g.fillTriangle(x + 2, y + 34, x + 30, y + 12, x + 36, y + 62);
          g.fillTriangle(x + 92, y + 12, x + 126, y + 34, x + 88, y + 62);
          // Kanat zarı
          g.fillStyle(0xCC4444, 0.35);
          g.fillTriangle(x + 6, y + 32, x + 30, y + 16, x + 34, y + 54);
          g.fillTriangle(x + 94, y + 16, x + 122, y + 32, x + 90, y + 54);
          // Kanat kemikleri
          g.lineStyle(2, 0x6a0000, 0.6);
          g.lineBetween(x + 30, y + 18, x + 10, y + 44);
          g.lineBetween(x + 30, y + 22, x + 16, y + 50);
          g.lineBetween(x + 94, y + 18, x + 118, y + 44);
          g.lineBetween(x + 94, y + 22, x + 112, y + 50);
          // Boyun
          g.fillStyle(0xAA2020); g.fillRect(x + 44, y + 20, 28, 20);
          // Baş (uzun, çeneli)
          g.fillStyle(0x8B0000); g.fillRoundedRect(x + 36, y + 2, 48, 26, 6);
          g.fillStyle(0x6a0000); g.fillRoundedRect(x + 38, y + 4, 44, 22, 5);
          // Boynuzlar (geriye doğru)
          g.fillStyle(0x4a0000);
          g.fillTriangle(x + 38, y + 6, x + 28, y - 10, x + 44, y + 6);
          g.fillTriangle(x + 78, y + 6, x + 90, y - 10, x + 84, y + 6);
          g.fillStyle(0x3a0000);
          g.fillTriangle(x + 42, y + 4, x + 34, y - 6, x + 46, y + 4);
          g.fillTriangle(x + 76, y + 4, x + 86, y - 6, x + 80, y + 4);
          // Gözler (parlak, yırtıcı)
          g.fillStyle(0x1a0000); g.fillRect(x + 44, y + 10, 12, 8); g.fillRect(x + 64, y + 10, 12, 8);
          g.fillStyle(0xFFFF00); g.fillRect(x + 46, y + 12, 8, 4); g.fillRect(x + 66, y + 12, 8, 4);
          g.fillStyle(0xFF0000); g.fillCircle(x + 50, y + 14, 1.5); g.fillCircle(x + 70, y + 14, 1.5);
          // Burun delikleri
          g.fillStyle(0x3a0000); g.fillCircle(x + 52, y + 22, 2); g.fillCircle(x + 66, y + 22, 2);
          // Ağız / Dişler
          g.fillStyle(0x1a0000); g.fillRect(x + 44, y + 24, 32, 4);
          g.fillStyle(0xFFFFE0);
          for (let t = 0; t < 5; t++) {
            g.fillTriangle(x + 46 + t * 6, y + 24, x + 49 + t * 6, y + 20, x + 52 + t * 6, y + 24);
          }
          // Ateş nefesi
          if (f === 1) {
            g.fillStyle(0xFF0000, 0.7); g.fillTriangle(x + 82, y + 12, x + 120, y + 16, x + 82, y + 22);
            g.fillStyle(0xFF4500, 0.5); g.fillTriangle(x + 84, y + 14, x + 110, y + 16, x + 84, y + 20);
            g.fillStyle(0xFFD700, 0.4); g.fillTriangle(x + 86, y + 15, x + 100, y + 16, x + 86, y + 19);
          }

        } else if (m.key === 'drake') {
          // === EJDER YAVRUSU (96x88) - Yatay 4 ayaklı mini ejder ===
          const W = m.w, H = m.h;
          // Gölge
          g.fillStyle(0x000000, 0.25); g.fillEllipse(x + W/2, y + H - 6, W - 20, 10);
          // Kuyruk (sola uzanan, sivri)
          g.fillStyle(0xBB3300); g.fillTriangle(x + 2, y + 52, x + 22, y + 44, x + 20, y + 58);
          g.fillStyle(0x991100); g.fillTriangle(x + 0, y + 50, x + 14, y + 46, x + 12, y + 56);
          // Kuyruk dikeni
          g.fillStyle(0x660000); g.fillTriangle(x + 0, y + 48, x + 6, y + 42, x + 6, y + 54);
          // 4 Bacak (kısa, sürüngen tarzı)
          g.fillStyle(0xAA2800);
          g.fillRect(x + 24 + b, y + 62, 8, 16); g.fillRect(x + 38 + b, y + 62, 8, 16);
          g.fillRect(x + 56 - b, y + 62, 8, 16); g.fillRect(x + 70 - b, y + 62, 8, 16);
          // Pençeler
          g.fillStyle(0x660000);
          g.fillTriangle(x + 22 + b, y + 76, x + 28 + b, y + 74, x + 34 + b, y + 78);
          g.fillTriangle(x + 36 + b, y + 76, x + 42 + b, y + 74, x + 48 + b, y + 78);
          g.fillTriangle(x + 54 - b, y + 76, x + 60 - b, y + 74, x + 66 - b, y + 78);
          g.fillTriangle(x + 68 - b, y + 76, x + 74 - b, y + 74, x + 80 - b, y + 78);
          // Gövde (yatay elips)
          this.grad(g, x + 16, y + 36, 66, 30, 0xCC3300, 0xAA2200);
          g.fillStyle(0xDD6644, 0.35); g.fillEllipse(x + W/2 + 2, y + 56, 40, 12);
          // Karın pulları
          g.fillStyle(0xDD7755, 0.4);
          for (let s = 0; s < 4; s++) g.fillRect(x + 28 + s * 12, y + 50, 8, 5);
          // Sırt dikenleri
          g.fillStyle(0x770000);
          for (let s = 0; s < 5; s++) g.fillTriangle(x + 22 + s * 11, y + 36, x + 25 + s * 11, y + 28 - b, x + 28 + s * 11, y + 36);
          // Kanatlar (sırt üstünde, küçük)
          g.fillStyle(0xCC3300, 0.7);
          g.fillTriangle(x + 32, y + 36, x + 26, y + 16, x + 44, y + 34);
          g.fillTriangle(x + 52, y + 36, x + 68, y + 16, x + 60, y + 34);
          g.fillStyle(0xDD5544, 0.25);
          g.fillTriangle(x + 34, y + 34, x + 28, y + 20, x + 42, y + 32);
          g.fillTriangle(x + 54, y + 34, x + 66, y + 20, x + 58, y + 32);
          // Boyun (yatay, sağa uzanan)
          g.fillStyle(0xCC3300);
          g.fillRect(x + 68, y + 36, 14, 14);
          // Baş (sağa bakan, sivri burun)
          g.fillStyle(0xCC3300); g.fillRoundedRect(x + 72, y + 28, 22, 18, 4);
          g.fillStyle(0xBB2800); g.fillTriangle(x + 90, y + 32, x + 96, y + 38, x + 90, y + 42);
          // Boynuzlar
          g.fillStyle(0x660000);
          g.fillTriangle(x + 74, y + 28, x + 72, y + 20, x + 78, y + 28);
          g.fillTriangle(x + 84, y + 28, x + 86, y + 20, x + 88, y + 28);
          // Gözler
          g.fillStyle(0xFFFF00); g.fillRect(x + 80, y + 33, 5, 4);
          g.fillStyle(0xFF0000); g.fillCircle(x + 83, y + 35, 1.5);
          // Burun delikleri
          g.fillStyle(0x550000); g.fillCircle(x + 92, y + 36, 1); g.fillCircle(x + 92, y + 40, 1);
          // Ateş nefesi
          if (f === 1) {
            g.fillStyle(0xFF4500, 0.6); g.fillTriangle(x + 94, y + 34, x + 96, y + 42, x + 86, y + 38);
            g.fillStyle(0xFFD700, 0.4); g.fillTriangle(x + 92, y + 36, x + 94, y + 40, x + 88, y + 38);
          }

        } else if (m.key === 'drake_mother') {
          // === EJDER ANASI (120x112) - Yatay 4 ayaklı büyük ejder, altın taçlı ===
          const W = m.w, H = m.h;
          // Gölge
          g.fillStyle(0x000000, 0.35); g.fillEllipse(x + W/2, y + H - 8, W - 20, 14);
          // Kuyruk (sola uzanan, dikenli)
          g.fillStyle(0x880000); g.fillTriangle(x + 2, y + 66, x + 28, y + 54, x + 24, y + 76);
          g.fillStyle(0x660000); g.fillTriangle(x + 0, y + 64, x + 16, y + 56, x + 14, y + 74);
          // Kuyruk dikenleri
          g.fillStyle(0x550000);
          g.fillTriangle(x + 0, y + 60, x + 6, y + 52, x + 8, y + 68);
          g.fillTriangle(x + 10, y + 58, x + 16, y + 50, x + 18, y + 66);
          // 4 Bacak (güçlü, sürüngen tarzı)
          g.fillStyle(0x880000);
          g.fillRect(x + 28 + b, y + 80, 12, 22); g.fillRect(x + 46 + b, y + 80, 12, 22);
          g.fillRect(x + 68 - b, y + 80, 12, 22); g.fillRect(x + 86 - b, y + 80, 12, 22);
          // Pençeler (büyük)
          g.fillStyle(0x550000);
          g.fillTriangle(x + 24 + b, y + 98, x + 34 + b, y + 96, x + 42 + b, y + 102);
          g.fillTriangle(x + 42 + b, y + 98, x + 52 + b, y + 96, x + 60 + b, y + 102);
          g.fillTriangle(x + 64 - b, y + 98, x + 74 - b, y + 96, x + 82 - b, y + 102);
          g.fillTriangle(x + 82 - b, y + 98, x + 92 - b, y + 96, x + 100 - b, y + 102);
          // Gövde (büyük yatay elips)
          this.grad(g, x + 18, y + 44, 88, 40, 0xAA0000, 0x770000);
          g.fillStyle(0xCC5544, 0.4); g.fillEllipse(x + W/2 + 4, y + 72, 56, 16);
          // Karın pulları
          g.fillStyle(0xCC6655, 0.4);
          for (let s = 0; s < 6; s++) g.fillRect(x + 32 + s * 12, y + 64, 10, 6);
          // Sırt dikenleri (büyük)
          g.fillStyle(0x550000);
          for (let s = 0; s < 7; s++) g.fillTriangle(x + 24 + s * 12, y + 42, x + 28 + s * 12, y + 30 - b * 2, x + 32 + s * 12, y + 42);
          // Kanatlar (büyük, geniş — sırt üstünde)
          g.fillStyle(0xAA0000, 0.85);
          g.fillTriangle(x + 36, y + 42, x + 20, y + 12, x + 56, y + 40);
          g.fillTriangle(x + 66, y + 42, x + 96, y + 12, x + 78, y + 40);
          g.fillStyle(0xCC2222, 0.35);
          g.fillTriangle(x + 38, y + 40, x + 24, y + 18, x + 52, y + 38);
          g.fillTriangle(x + 68, y + 40, x + 92, y + 18, x + 76, y + 38);
          // Kanat damarları
          g.lineStyle(1.5, 0x660000, 0.4);
          g.lineBetween(x + 36, y + 34, x + 24, y + 20); g.lineBetween(x + 40, y + 36, x + 28, y + 24);
          g.lineBetween(x + 78, y + 34, x + 92, y + 20); g.lineBetween(x + 74, y + 36, x + 88, y + 24);
          // Boyun (yatay, sağa uzanan)
          g.fillStyle(0xAA0000); g.fillRect(x + 86, y + 44, 18, 18);
          // Baş (sağa bakan, büyük sivri burun)
          g.fillStyle(0xAA0000); g.fillRoundedRect(x + 88, y + 32, 28, 24, 5);
          g.fillStyle(0x880000); g.fillTriangle(x + 112, y + 38, x + 120, y + 44, x + 112, y + 50);
          // Boynuzlar (büyük)
          g.fillStyle(0x660000);
          g.fillTriangle(x + 90, y + 32, x + 86, y + 20, x + 96, y + 32);
          g.fillTriangle(x + 106, y + 32, x + 110, y + 20, x + 112, y + 32);
          // Altın taç
          g.fillStyle(0xFFD700);
          g.fillRect(x + 92, y + 30, 18, 4);
          g.fillTriangle(x + 94, y + 30, x + 97, y + 24, x + 100, y + 30);
          g.fillTriangle(x + 102, y + 30, x + 105, y + 22, x + 108, y + 30);
          g.fillStyle(0xFF0000); g.fillCircle(x + 101, y + 24, 2);
          // Gözler
          g.fillStyle(0xFFFF00); g.fillRect(x + 100, y + 39, 7, 5);
          g.fillStyle(0xFF0000); g.fillCircle(x + 104, y + 41, 2);
          // Burun + Ağız
          g.fillStyle(0x550000); g.fillCircle(x + 116, y + 42, 1.5); g.fillCircle(x + 116, y + 48, 1.5);
          g.fillStyle(0x1a0000); g.fillRect(x + 110, y + 52, 8, 3);
          // Dişler
          g.fillStyle(0xFFFFE0);
          g.fillTriangle(x + 110, y + 52, x + 112, y + 48, x + 114, y + 52);
          g.fillTriangle(x + 114, y + 52, x + 116, y + 48, x + 118, y + 52);
          // Ateş nefesi
          if (f === 1) {
            g.fillStyle(0xFF0000, 0.7); g.fillTriangle(x + 118, y + 40, x + 118, y + 52, x + 108, y + 46);
            g.fillStyle(0xFF4500, 0.5); g.fillTriangle(x + 116, y + 42, x + 116, y + 50, x + 110, y + 46);
            g.fillStyle(0xFFD700, 0.3); g.fillTriangle(x + 114, y + 44, x + 114, y + 48, x + 112, y + 46);
          }

        } else if (m.key === 'ancient_dragon') {
          // === KADİM EJDER (140x128) - Dev mor/mavi ejder ===
          const W = m.w, H = m.h;
          g.fillStyle(0x000000, 0.5); g.fillEllipse(x + W/2, y + H - 8, W - 30, 16);
          // Kuyruk (uzun, mor, dikenli)
          g.fillStyle(0x4B0082);
          g.fillTriangle(x + 2, y + H - 20, x + 30, y + H - 40, x + 18, y + H - 8);
          g.fillStyle(0x2A0050);
          g.fillTriangle(x, y + H - 22, x + 8, y + H - 32, x + 10, y + H - 16);
          g.fillTriangle(x + 10, y + H - 28, x + 18, y + H - 38, x + 20, y + H - 22);
          // Bacaklar (büyük, güçlü)
          g.fillStyle(0x4B0082);
          g.fillRect(x + 36 + b, y + 88, 18, 28); g.fillRect(x + 84 - b, y + 88, 18, 28);
          g.fillStyle(0x2A0050);
          g.fillTriangle(x + 34 + b, y + 112, x + 42 + b, y + 108, x + 42 + b, y + 120);
          g.fillTriangle(x + 48 + b, y + 112, x + 56 + b, y + 108, x + 56 + b, y + 120);
          g.fillTriangle(x + 82 - b, y + 112, x + 90 - b, y + 108, x + 90 - b, y + 120);
          g.fillTriangle(x + 96 - b, y + 112, x + 104 - b, y + 108, x + 104 - b, y + 120);
          // Gövde (devasa)
          this.grad(g, x + 28, y + 38, 84, 54, 0x6A0DAD, 0x4B0082);
          g.fillStyle(0x9370DB, 0.4); g.fillEllipse(x + W/2, y + 74, 56, 24);
          // Karın pulları (mor/mavi)
          g.fillStyle(0x9B7AC8, 0.4);
          for (let s = 0; s < 6; s++) g.fillRect(x + 42 + s * 10, y + 62, 8, 8);
          for (let s = 0; s < 5; s++) g.fillRect(x + 46 + s * 10, y + 72, 8, 6);
          // Sırt dikenleri (büyük, mor)
          g.fillStyle(0x2A0050);
          for (let s = 0; s < 7; s++) g.fillTriangle(x + 38 + s * 10, y + 36, x + 42 + s * 10, y + 24 - b * 2, x + 46 + s * 10, y + 36);
          // Kanatlar (çok geniş)
          g.fillStyle(0x6A0DAD, 0.85);
          g.fillTriangle(x, y + 36, x + 34, y + 8, x + 40, y + 68);
          g.fillTriangle(x + 100, y + 8, x + 140, y + 36, x + 96, y + 68);
          g.fillStyle(0x9370DB, 0.35);
          g.fillTriangle(x + 4, y + 34, x + 34, y + 14, x + 38, y + 58);
          g.fillTriangle(x + 102, y + 14, x + 136, y + 34, x + 98, y + 58);
          // Kanat kemikleri
          g.lineStyle(2, 0x3A0070, 0.6);
          g.lineBetween(x + 34, y + 14, x + 8, y + 48);
          g.lineBetween(x + 34, y + 20, x + 14, y + 54);
          g.lineBetween(x + 34, y + 26, x + 20, y + 58);
          g.lineBetween(x + 102, y + 14, x + 132, y + 48);
          g.lineBetween(x + 102, y + 20, x + 126, y + 54);
          g.lineBetween(x + 102, y + 26, x + 120, y + 58);
          // Boyun (uzun)
          g.fillStyle(0x6A0DAD); g.fillRect(x + 48, y + 20, 30, 22);
          // Baş (büyük, görkemli)
          g.fillStyle(0x4B0082); g.fillRoundedRect(x + 38, y + 2, 56, 28, 7);
          g.fillStyle(0x3A0060); g.fillRoundedRect(x + 40, y + 4, 52, 24, 6);
          // Boynuzlar (4 adet, uzun, geriye doğru)
          g.fillStyle(0x2A0050);
          g.fillTriangle(x + 38, y + 8, x + 24, y - 14, x + 46, y + 8);
          g.fillTriangle(x + 46, y + 4, x + 36, y - 8, x + 52, y + 4);
          g.fillTriangle(x + 86, y + 8, x + 108, y - 14, x + 94, y + 8);
          g.fillTriangle(x + 80, y + 4, x + 96, y - 8, x + 88, y + 4);
          // Boynuz uçları parlak
          g.fillStyle(0x00FFFF, 0.7);
          g.fillCircle(x + 24, y - 12, 3); g.fillCircle(x + 36, y - 6, 2);
          g.fillCircle(x + 108, y - 12, 3); g.fillCircle(x + 96, y - 6, 2);
          // Gözler (siyan parlak)
          g.fillStyle(0x0A0020); g.fillRect(x + 48, y + 12, 14, 8); g.fillRect(x + 72, y + 12, 14, 8);
          g.fillStyle(0x00FFFF, 0.9); g.fillRect(x + 50, y + 14, 10, 4); g.fillRect(x + 74, y + 14, 10, 4);
          g.fillStyle(0xFFFFFF); g.fillCircle(x + 55, y + 16, 1.5); g.fillCircle(x + 79, y + 16, 1.5);
          // Göz parıltısı
          g.fillStyle(0x00FFFF, 0.2); g.fillCircle(x + 55, y + 16, 8); g.fillCircle(x + 79, y + 16, 8);
          // Burun
          g.fillStyle(0x2A0050); g.fillCircle(x + 58, y + 24, 2); g.fillCircle(x + 74, y + 24, 2);
          // Ağız / Dişler
          g.fillStyle(0x0A0020); g.fillRect(x + 50, y + 26, 34, 4);
          g.fillStyle(0xE0E0FF);
          for (let t = 0; t < 5; t++) g.fillTriangle(x + 52 + t * 6, y + 26, x + 55 + t * 6, y + 22, x + 58 + t * 6, y + 26);
          // Mor ateş nefesi
          if (f === 1) {
            g.fillStyle(0x6A0DAD, 0.8); g.fillTriangle(x + 92, y + 12, x + 134, y + 18, x + 92, y + 24);
            g.fillStyle(0x9370DB, 0.6); g.fillTriangle(x + 94, y + 14, x + 124, y + 18, x + 94, y + 22);
            g.fillStyle(0x00FFFF, 0.4); g.fillTriangle(x + 96, y + 16, x + 114, y + 18, x + 96, y + 20);
          }
          // Kadim aura
          g.fillStyle(0x6A0DAD, 0.12); g.fillCircle(x + W/2, y + H/2, 50);

        } else if (m.key === 'minotaur') {
          // Minotaur - boğa başlı dev savaşçı
          g.fillStyle(0x654321); g.fillRect(x + 18 + b, y + 58, 14, 20); g.fillRect(x + 40 - b, y + 58, 14, 20);
          g.fillStyle(0x4a2a0a); g.fillRoundedRect(x + 16 + b, y + 72, 18, 10, 2); g.fillRoundedRect(x + 38 - b, y + 72, 18, 10, 2);
          this.grad(g, x + 10, y + 24, 52, 36, 0x8B4513, 0x654321);
          g.fillStyle(0x5a3a1a); g.fillRect(x + 14, y + 26, 44, 24);
          g.fillStyle(0x8B4513); g.fillRoundedRect(x + 2, y + 26, 12, 24, 3); g.fillRoundedRect(x + 58, y + 26, 12, 24, 3);
          g.fillStyle(0x8B4513); g.fillRoundedRect(x + 16, y + 2, 40, 24, 5);
          // Horns
          g.fillStyle(0xFFFFF0); g.fillTriangle(x + 12, y + 4, x + 6, y - 10, x + 20, y + 4);
          g.fillTriangle(x + 52, y + 4, x + 66, y - 10, x + 60, y + 4);
          // Nose ring
          g.fillStyle(0xDAA520); g.fillCircle(x + 36, y + 22, 3);
          g.fillStyle(0xFF0000); g.fillRect(x + 24, y + 10, 8, 6); g.fillRect(x + 40, y + 10, 8, 6);
          g.fillStyle(0xFFFF00); g.fillCircle(x + 28, y + 13, 2); g.fillCircle(x + 44, y + 13, 2);
          // Axe
          g.fillStyle(0x5a3a1a); g.fillRect(x + 66, y + 14, 4, 40);
          g.fillStyle(0x808080); g.fillTriangle(x + 62, y + 10, x + 70, y + 2, x + 70, y + 20);

        } else if (m.key === 'shadow_spider') {
          // Gölge Örümcek
          g.fillStyle(0x1A0A2A); g.fillEllipse(x + 28, y + 24 + b, 32, 20);
          g.fillStyle(0x2F1B3D); g.fillEllipse(x + 28, y + 22 + b, 28, 16);
          // Legs
          g.fillStyle(0x1A0A2A);
          for (let l = 0; l < 4; l++) {
            const lx = x + 12 + l * 10;
            g.fillRect(lx - b, y + 30, 3, 14); g.fillRect(lx + b, y + 30, 3, 14);
          }
          // Head
          g.fillStyle(0x2F1B3D); g.fillCircle(x + 28, y + 12, 10);
          // Eyes (8 eyes)
          g.fillStyle(0xFF0000);
          g.fillCircle(x + 22, y + 9, 2); g.fillCircle(x + 34, y + 9, 2);
          g.fillCircle(x + 24, y + 14, 1.5); g.fillCircle(x + 32, y + 14, 1.5);
          g.fillStyle(0xFF6666);
          g.fillCircle(x + 26, y + 7, 1); g.fillCircle(x + 30, y + 7, 1);

        } else if (m.key === 'cursed_knight') {
          // Lanetli Şövalye - karanlık zırhlı iskelet
          g.fillStyle(0x1A1A3A); g.fillRect(x + 18 + b, y + 52, 7, 22); g.fillRect(x + 35 - b, y + 52, 7, 22);
          g.fillStyle(0x2C2C4A); g.fillRect(x + 16, y + 24, 28, 30);
          g.fillStyle(0x1A1A3A); for (let r = 0; r < 5; r++) g.fillRect(x + 18, y + 27 + r * 6, 24, 3);
          g.fillStyle(0x2C2C4A); g.fillRoundedRect(x + 8, y + 26, 7, 22, 2); g.fillRoundedRect(x + 45, y + 26, 7, 22, 2);
          g.fillStyle(0x2C2C4A); g.fillRoundedRect(x + 16, y + 2, 28, 24, 6);
          // Visor
          g.fillStyle(0x0A0A1A); g.fillRect(x + 20, y + 10, 20, 8);
          g.fillStyle(0xFF0000, 0.6); g.fillCircle(x + 24, y + 14, 3); g.fillCircle(x + 36, y + 14, 3);
          // Dark sword
          g.fillStyle(0x3A3A5A); g.fillRect(x + 52, y + 14, 4, 34);
          g.fillStyle(0x6A0DAD); g.fillRect(x + 50, y + 12, 8, 4);
          // Shield
          g.fillStyle(0x2C2C4A); g.fillRoundedRect(x + 2, y + 28, 10, 14, 3);
          g.fillStyle(0x6A0DAD, 0.4); g.fillCircle(x + 7, y + 35, 3);

        } else if (m.key === 'maze_phantom') {
          // Labirent Hayaleti - mavi tonlu hayalet
          g.fillStyle(0x7B68EE, 0.15); g.fillCircle(x + m.w / 2, y + 30, 28);
          g.fillStyle(0x483D8B, 0.6); g.fillEllipse(x + 26, y + 30, 36, 40);
          g.fillStyle(0x5B4FCB, 0.5); g.fillEllipse(x + 26, y + 28, 30, 34);
          g.fillStyle(0x6A5EDB, 0.4); g.fillEllipse(x + 26, y + 26, 22, 26);
          g.fillStyle(0x483D8B, 0.3);
          g.fillTriangle(x + 16, y + 46, x + 10, y + 60, x + 22, y + 52);
          g.fillTriangle(x + 26, y + 48, x + 22, y + 62, x + 30, y + 54);
          g.fillTriangle(x + 36, y + 46, x + 30, y + 58, x + 40, y + 52);
          g.fillStyle(0x3A2A8A, 0.7); g.fillRoundedRect(x + 12, y + 6, 28, 22, 8);
          g.fillStyle(0x00BFFF, 0.8); g.fillCircle(x + 20, y + 18, 3); g.fillCircle(x + 32, y + 18, 3);
          g.fillStyle(0x00FFFF); g.fillCircle(x + 20, y + 18, 1.5); g.fillCircle(x + 32, y + 18, 1.5);

        } else if (m.key === 'labyrinth_guardian') {
          // Labirent Muhafızı - dev altın zırhlı boss
          g.fillStyle(0xB8860B); g.fillRect(x + 20 + b, y + 60, 16, 22); g.fillRect(x + 44 - b, y + 60, 16, 22);
          g.fillStyle(0x8B6508); g.fillRoundedRect(x + 18 + b, y + 76, 20, 10, 2); g.fillRoundedRect(x + 42 - b, y + 76, 20, 10, 2);
          this.grad(g, x + 12, y + 26, 56, 38, 0xDAA520, 0xB8860B);
          g.fillStyle(0xFFD700, 0.3); g.fillRect(x + 14, y + 28, 52, 34);
          g.fillStyle(0xDAA520); g.fillRoundedRect(x + 4, y + 28, 14, 28, 3); g.fillRoundedRect(x + 62, y + 28, 14, 28, 3);
          g.fillStyle(0xDAA520); g.fillRoundedRect(x + 18, y + 2, 44, 28, 6);
          g.fillStyle(0xFFD700); g.fillTriangle(x + 22, y + 4, x + 14, y - 8, x + 30, y + 4);
          g.fillTriangle(x + 50, y + 4, x + 58, y - 8, x + 66, y + 4);
          g.fillStyle(0xFF0000); g.fillRect(x + 28, y + 12, 10, 8); g.fillRect(x + 42, y + 12, 10, 8);
          g.fillStyle(0xFFFF00); g.fillCircle(x + 33, y + 16, 3); g.fillCircle(x + 47, y + 16, 3);
          // Giant mace
          g.fillStyle(0x5a3a1a); g.fillRect(x + 72, y + 10, 6, 50);
          g.fillStyle(0x808080); g.fillCircle(x + 75, y + 8, 10);
          g.fillStyle(0xDAA520); g.fillCircle(x + 75, y + 8, 6);

        } else if (m.key === 'fire_imp') {
          // Ateş Cini - küçük ateşli yaratık
          g.fillStyle(0xFF4500); g.fillRect(x + 14 + b, y + 38, 8, 14); g.fillRect(x + 26 - b, y + 38, 8, 14);
          this.grad(g, x + 10, y + 16, 28, 24, 0xFF6347, 0xFF4500);
          g.fillStyle(0xFF4500); g.fillRoundedRect(x + 12, y + 4, 24, 16, 5);
          g.fillStyle(0xFFFF00); g.fillCircle(x + 18, y + 10, 3); g.fillCircle(x + 30, y + 10, 3);
          g.fillStyle(0xFF0000); g.fillCircle(x + 18, y + 10, 1.5); g.fillCircle(x + 30, y + 10, 1.5);
          // Horns
          g.fillStyle(0x8B0000); g.fillTriangle(x + 12, y + 6, x + 8, y - 4, x + 16, y + 6);
          g.fillTriangle(x + 32, y + 6, x + 36, y - 4, x + 40, y + 6);
          // Fire aura
          if (f === 1) {
            g.fillStyle(0xFF4500, 0.4); g.fillCircle(x + 24, y + 24, 16);
            g.fillStyle(0xFFD700, 0.3); g.fillCircle(x + 24, y + 24, 10);
          }

        } else if (m.key === 'dark_bat') {
          // Karanlık Yarasa
          g.fillStyle(0x1C1C1C); g.fillEllipse(x + 26, y + 22 + b, 16, 14);
          g.fillStyle(0x2A2A2A); g.fillEllipse(x + 26, y + 20 + b, 12, 10);
          // Wings
          g.fillStyle(0x1C1C1C, 0.8);
          g.fillTriangle(x + 18, y + 18, x + 2, y + 10 - b * 3, x + 14, y + 28);
          g.fillTriangle(x + 34, y + 18, x + 50, y + 10 - b * 3, x + 38, y + 28);
          g.fillStyle(0x2A2A2A, 0.5);
          g.fillTriangle(x + 18, y + 20, x + 6, y + 14 - b * 2, x + 16, y + 26);
          g.fillTriangle(x + 34, y + 20, x + 46, y + 14 - b * 2, x + 36, y + 26);
          // Eyes
          g.fillStyle(0xFF0000); g.fillCircle(x + 22, y + 18, 2); g.fillCircle(x + 30, y + 18, 2);
          // Ears
          g.fillStyle(0x1C1C1C); g.fillTriangle(x + 20, y + 12, x + 18, y + 4, x + 24, y + 12);
          g.fillTriangle(x + 28, y + 12, x + 34, y + 4, x + 32, y + 12);

        } else if (m.key === 'cave_troll') {
          // Mağara Trollü - büyük yeşil trol
          g.fillStyle(0x3A5A3A); g.fillRect(x + 18 + b, y + 58, 14, 20); g.fillRect(x + 40 - b, y + 58, 14, 20);
          g.fillStyle(0x2A4A2A); g.fillRoundedRect(x + 16 + b, y + 72, 18, 10, 2); g.fillRoundedRect(x + 38 - b, y + 72, 18, 10, 2);
          this.grad(g, x + 10, y + 24, 52, 36, 0x4A6A4A, 0x3A5A3A);
          g.fillStyle(0x4A6A4A); g.fillRoundedRect(x + 2, y + 26, 14, 28, 4); g.fillRoundedRect(x + 56, y + 26, 14, 28, 4);
          g.fillStyle(0x4A6A4A); g.fillRoundedRect(x + 16, y + 2, 40, 24, 6);
          g.fillStyle(0x3A5A3A); g.fillRect(x + 20, y + 8, 32, 4);
          g.fillStyle(0xFF4444); g.fillRect(x + 24, y + 10, 8, 6); g.fillRect(x + 40, y + 10, 8, 6);
          g.fillStyle(0xFFFF00); g.fillCircle(x + 28, y + 13, 2); g.fillCircle(x + 44, y + 13, 2);
          // Tusk
          g.fillStyle(0xFFFFF0); g.fillRect(x + 28, y + 22, 3, 6); g.fillRect(x + 41, y + 22, 3, 6);
          // Club
          g.fillStyle(0x5a3a1a); g.fillRect(x + 66, y + 14, 4, 44);
          g.fillStyle(0x4a2a0a); g.fillRoundedRect(x + 62, y + 6, 12, 14, 3);

        } else if (m.key === 'lava_golem') {
          // Lav Golemi - turuncu/kırmızı golem
          g.fillStyle(0xCC3700); g.fillRect(x + 16 + b, y + 50, 12, 18); g.fillRect(x + 36 - b, y + 50, 12, 18);
          g.fillStyle(0xCC3700); g.fillRoundedRect(x + 10, y + 18, 44, 36, 6);
          g.fillStyle(0xFF4500); g.fillRoundedRect(x + 12, y + 20, 40, 32, 5);
          // Lava veins
          g.fillStyle(0xFF6600, 0.6); g.fillRect(x + 16, y + 24, 2, 20);
          g.fillStyle(0xFF6600, 0.6); g.fillRect(x + 44, y + 24, 2, 20);
          g.fillStyle(0xFFD700, 0.4); g.fillCircle(x + 32, y + 34, 8);
          g.fillStyle(0xCC3700); g.fillRoundedRect(x + 2, y + 22, 12, 28, 3); g.fillRoundedRect(x + 50, y + 22, 12, 28, 3);
          g.fillStyle(0xCC3700); g.fillRoundedRect(x + 18, y + 4, 28, 20, 5);
          g.fillStyle(0xFFD700); g.fillRect(x + 24, y + 12, 5, 4); g.fillRect(x + 35, y + 12, 5, 4);
          g.fillStyle(0xFF0000); g.fillRect(x + 25, y + 13, 3, 2); g.fillRect(x + 36, y + 13, 3, 2);

        } else if (m.key === 'shadow_demon') {
          // Gölge Şeytanı - karanlık iblis
          g.fillStyle(0x1A0020); g.fillRect(x + 16 + b, y + 50, 10, 18); g.fillRect(x + 34 - b, y + 50, 10, 18);
          this.grad(g, x + 10, y + 20, 40, 32, 0x2A0A3A, 0x1A0020);
          g.fillStyle(0x2A0A3A, 0.7); g.fillEllipse(x + 30, y + 36, 40, 30);
          g.fillStyle(0x2A0A3A); g.fillRoundedRect(x + 6, y + 22, 10, 24, 3); g.fillRoundedRect(x + 44, y + 22, 10, 24, 3);
          g.fillStyle(0x2A0A3A); g.fillRoundedRect(x + 14, y + 2, 32, 22, 5);
          g.fillStyle(0x1A0020); g.fillTriangle(x + 14, y + 4, x + 8, y - 8, x + 20, y + 4);
          g.fillTriangle(x + 40, y + 4, x + 52, y - 8, x + 46, y + 4);
          g.fillStyle(0xFF00FF); g.fillCircle(x + 22, y + 12, 3); g.fillCircle(x + 38, y + 12, 3);
          g.fillStyle(0xFF66FF); g.fillCircle(x + 22, y + 12, 1.5); g.fillCircle(x + 38, y + 12, 1.5);
          // Dark aura
          g.fillStyle(0x6A0DAD, 0.2); g.fillCircle(x + 30, y + 30, 20);

        } else if (m.key === 'bone_dragon') {
          // Kemik Ejder - iskelet ejder
          g.fillStyle(0xC8C8A0); g.fillRect(x + 24 + b, y + 66, 14, 22); g.fillRect(x + 56 - b, y + 66, 14, 22);
          g.fillStyle(0xE8E8D0); g.fillRect(x + 18, y + 30, 56, 38);
          for (let r = 0; r < 6; r++) { g.fillStyle(0xC8C8A0); g.fillRect(x + 22, y + 34 + r * 6, 48, 2); }
          g.fillStyle(0xD8D8B0, 0.7);
          g.fillTriangle(x + 4, y + 28, x + 24, y + 18, x + 28, y + 52);
          g.fillTriangle(x + 68, y + 18, x + 92, y + 28, x + 64, y + 52);
          g.fillStyle(0xE8E8D0); g.fillRoundedRect(x + 28, y + 2, 36, 22, 5);
          g.fillStyle(0xC8C8A0); g.fillTriangle(x + 28, y + 6, x + 34, y - 6, x + 38, y + 6);
          g.fillTriangle(x + 54, y + 6, x + 58, y - 6, x + 64, y + 6);
          g.fillStyle(0x00FF00); g.fillRect(x + 34, y + 10, 8, 6); g.fillRect(x + 50, y + 10, 8, 6);
          g.fillStyle(0x00CC00); g.fillCircle(x + 38, y + 13, 2); g.fillCircle(x + 54, y + 13, 2);

        } else if (m.key === 'abyssal_fiend') {
          // Uçurum İblisi - dev karanlık iblis
          g.fillStyle(0x2A0018); g.fillRect(x + 18 + b, y + 54, 12, 20); g.fillRect(x + 42 - b, y + 54, 12, 20);
          this.grad(g, x + 10, y + 20, 52, 36, 0x4A0028, 0x2A0018);
          g.fillStyle(0x4A0028); g.fillRoundedRect(x + 2, y + 22, 12, 28, 3); g.fillRoundedRect(x + 58, y + 22, 12, 28, 3);
          g.fillStyle(0x4A0028); g.fillRoundedRect(x + 16, y + 2, 40, 22, 5);
          g.fillStyle(0x2A0018); g.fillTriangle(x + 16, y + 4, x + 8, y - 10, x + 22, y + 4);
          g.fillTriangle(x + 50, y + 4, x + 64, y - 10, x + 56, y + 4);
          g.fillStyle(0xFF0000); g.fillCircle(x + 28, y + 12, 4); g.fillCircle(x + 44, y + 12, 4);
          g.fillStyle(0xFFFF00); g.fillCircle(x + 28, y + 12, 2); g.fillCircle(x + 44, y + 12, 2);
          // Wings
          g.fillStyle(0x4A0028, 0.7);
          g.fillTriangle(x + 6, y + 16, x - 4, y + 6, x + 14, y + 38);
          g.fillTriangle(x + 66, y + 16, x + 76, y + 6, x + 58, y + 38);
          // Fire
          if (f === 1) { g.fillStyle(0xFF0000, 0.5); g.fillCircle(x + 36, y + 30, 14); }

        } else if (m.key === 'slime_king') {
          // Balçık Kralı - dev yeşil slime, taçlı
          const sq = f === 1 ? 5 : 0;
          g.fillStyle(0x00FF00); g.fillEllipse(x + 32, y + 26 + sq, 54, 40 - sq * 2);
          this.grad(g, x + 8, y + 12 + sq, 48, 30 - sq, 0x40FF40, 0x008800);
          g.fillStyle(0x80FF80, 0.4); g.fillEllipse(x + 22, y + 16 + sq, 16, 12);
          g.fillStyle(0xFFFFFF); g.fillCircle(x + 20, y + 22 + sq, 7); g.fillCircle(x + 44, y + 22 + sq, 7);
          g.fillStyle(0x000000); g.fillCircle(x + 22, y + 22 + sq, 4); g.fillCircle(x + 46, y + 22 + sq, 4);
          g.fillStyle(0x008800); g.fillEllipse(x + 32, y + 34 + sq, 14, 5);
          // Taç
          g.fillStyle(0xFFD700); g.fillRect(x + 18, y + 4 + sq, 28, 6);
          g.fillTriangle(x + 18, y + 4 + sq, x + 22, y - 4 + sq, x + 26, y + 4 + sq);
          g.fillTriangle(x + 28, y + 4 + sq, x + 32, y - 6 + sq, x + 36, y + 4 + sq);
          g.fillTriangle(x + 38, y + 4 + sq, x + 42, y - 4 + sq, x + 46, y + 4 + sq);
          g.fillStyle(0xFF0000); g.fillCircle(x + 32, y - 2 + sq, 2);

        } else if (m.key === 'goblin_chief') {
          // Goblin Şefi - zırhlı, kırmızı gözlü goblin
          g.fillStyle(0x006400); g.fillRect(x + 18 + b, y + 56, 11, 18); g.fillRect(x + 37 - b, y + 56, 11, 18);
          this.grad(g, x + 14, y + 28, 38, 30, 0x228B22, 0x006400);
          g.fillStyle(0x808080); g.fillRect(x + 16, y + 30, 34, 24); // zırh
          g.fillStyle(0x228B22); g.fillRoundedRect(x + 8, y + 30, 8, 20, 2); g.fillRoundedRect(x + 50, y + 30, 8, 20, 2);
          g.fillStyle(0x228B22); g.fillRoundedRect(x + 14, y + 6, 38, 26, 5);
          g.fillTriangle(x + 4, y + 14, x + 16, y + 6, x + 16, y + 22);
          g.fillTriangle(x + 50, y + 6, x + 62, y + 14, x + 50, y + 22);
          g.fillStyle(0xFF0000); g.fillRect(x + 22, y + 14, 8, 6); g.fillRect(x + 38, y + 14, 8, 6);
          g.fillStyle(0xFFFF00); g.fillCircle(x + 26, y + 17, 2); g.fillCircle(x + 42, y + 17, 2);
          // Kask
          g.fillStyle(0x808080); g.fillRoundedRect(x + 16, y + 4, 36, 10, 3);
          g.fillStyle(0xFFD700); g.fillCircle(x + 34, y + 9, 3);

        } else if (m.key === 'skeleton_lord') {
          // İskelet Lordu - zırhlı iskelet, kırmızı pelerin
          g.fillStyle(0xF5F5DC); g.fillRect(x + 20 + b, y + 56, 8, 24); g.fillRect(x + 38 - b, y + 56, 8, 24);
          // Pelerin
          g.fillStyle(0x8B0000, 0.6); g.fillTriangle(x + 14, y + 24, x + 52, y + 24, x + 34, y + 78);
          g.fillStyle(0xF5F5DC); g.fillRect(x + 18, y + 24, 30, 34);
          g.fillStyle(0x808080); g.fillRect(x + 20, y + 26, 26, 28); // zırh
          g.fillStyle(0xF5F5DC); g.fillRect(x + 8, y + 26, 8, 24); g.fillRect(x + 50, y + 26, 8, 24);
          g.fillStyle(0xF5F5DC); g.fillRoundedRect(x + 18, y + 2, 30, 26, 7);
          g.fillStyle(0xFF0000); g.fillCircle(x + 26, y + 14, 4); g.fillCircle(x + 40, y + 14, 4);
          g.fillStyle(0xFFFF00); g.fillCircle(x + 26, y + 14, 2); g.fillCircle(x + 40, y + 14, 2);
          // Taç
          g.fillStyle(0xFFD700); g.fillRect(x + 20, y + 2, 26, 4);
          g.fillTriangle(x + 22, y + 2, x + 26, y - 6, x + 30, y + 2);
          g.fillTriangle(x + 36, y + 2, x + 40, y - 6, x + 44, y + 2);

        } else if (m.key === 'orc_warlord') {
          // Ork Savaş Lordu - dev zırhlı ork
          g.fillStyle(0x3A5A00); g.fillRect(x + 20 + b, y + 62, 16, 22); g.fillRect(x + 44 - b, y + 62, 16, 22);
          this.grad(g, x + 12, y + 26, 56, 40, 0x4A6A0A, 0x3A5A00);
          g.fillStyle(0x5a5a5a); g.fillRect(x + 14, y + 28, 52, 30); // ağır zırh
          g.fillStyle(0x6a6a6a); g.fillRect(x + 16, y + 30, 48, 8);
          g.fillStyle(0x4A6A0A); g.fillRoundedRect(x + 4, y + 28, 14, 28, 4); g.fillRoundedRect(x + 62, y + 28, 14, 28, 4);
          g.fillStyle(0x4A6A0A); g.fillRoundedRect(x + 18, y + 2, 44, 28, 6);
          g.fillStyle(0xFF0000); g.fillRect(x + 28, y + 12, 10, 7); g.fillRect(x + 44, y + 12, 10, 7);
          g.fillStyle(0xFFFF00); g.fillCircle(x + 33, y + 15, 3); g.fillCircle(x + 49, y + 15, 3);
          g.fillStyle(0xFFFFF0); g.fillRect(x + 32, y + 24, 5, 7); g.fillRect(x + 45, y + 24, 5, 7);
          // Dev balta
          g.fillStyle(0x5a3a1a); g.fillRect(x + 70, y + 10, 5, 50);
          g.fillStyle(0x808080); g.fillTriangle(x + 66, y + 6, x + 75, y + 0, x + 75, y + 20);
          g.fillTriangle(x + 66, y + 14, x + 75, y + 8, x + 75, y + 26);

        } else if (m.key === 'alpha_wolf') {
          // Alfa Kurt - büyük, koyu, kırmızı gözlü
          g.fillStyle(0x303030); g.fillEllipse(x + 32, y + 28 + b, 48, 26);
          g.fillStyle(0x404040); g.fillEllipse(x + 32, y + 26 + b, 42, 20);
          g.fillStyle(0x303030);
          g.fillRect(x + 14 + b, y + 36, 7, 14); g.fillRect(x + 24 - b, y + 36, 7, 14);
          g.fillRect(x + 34 + b, y + 36, 7, 14); g.fillRect(x + 44 - b, y + 36, 7, 14);
          g.fillStyle(0x404040); g.fillRoundedRect(x + 4, y + 14 + b, 24, 20, 5);
          g.fillStyle(0x303030); g.fillTriangle(x + 8, y + 14, x + 12, y + 4, x + 16, y + 14);
          g.fillTriangle(x + 16, y + 14, x + 20, y + 4, x + 24, y + 14);
          g.fillStyle(0xFF0000); g.fillCircle(x + 10, y + 22 + b, 3); g.fillCircle(x + 20, y + 22 + b, 3);
          g.fillStyle(0xFFFF00); g.fillCircle(x + 10, y + 22 + b, 1.5); g.fillCircle(x + 20, y + 22 + b, 1.5);
          g.fillStyle(0x303030); g.fillRect(x + 2, y + 28 + b, 12, 6);
          g.fillStyle(0x303030); g.fillTriangle(x + 50, y + 22, x + 60, y + 16, x + 52, y + 30);
          // Yara izi
          g.lineStyle(2, 0x8B0000); g.lineBetween(x + 30, y + 20, x + 38, y + 28);

        } else if (m.key === 'crystal_golem') {
          // Kristal Golem - mavi kristal golem
          g.fillStyle(0x0080AA); g.fillRect(x + 18 + b, y + 52, 12, 20); g.fillRect(x + 42 - b, y + 52, 12, 20);
          g.fillStyle(0x00BFFF); g.fillRoundedRect(x + 12, y + 18, 48, 38, 6);
          g.fillStyle(0x40DFFF, 0.5); g.fillRoundedRect(x + 14, y + 20, 44, 34, 5);
          // Kristal parçalar
          g.fillStyle(0x00FFFF, 0.4); g.fillTriangle(x + 20, y + 22, x + 26, y + 14, x + 32, y + 22);
          g.fillStyle(0x00FFFF, 0.4); g.fillTriangle(x + 40, y + 22, x + 46, y + 14, x + 52, y + 22);
          g.fillStyle(0x0080AA); g.fillRoundedRect(x + 4, y + 22, 12, 30, 3); g.fillRoundedRect(x + 56, y + 22, 12, 30, 3);
          g.fillStyle(0x00BFFF); g.fillRoundedRect(x + 20, y + 4, 32, 22, 5);
          g.fillStyle(0xFFDD00); g.fillRect(x + 28, y + 12, 6, 5); g.fillRect(x + 38, y + 12, 6, 5);
          g.fillStyle(0xFFFF00); g.fillCircle(x + 31, y + 14, 2); g.fillCircle(x + 41, y + 14, 2);
          // Parlama
          g.fillStyle(0x00FFFF, 0.2); g.fillCircle(x + 36, y + 36, 20);

        } else if (m.key === 'wraith_queen') {
          // Hayalet Kraliçe - mor, taçlı, parıltılı
          g.fillStyle(0xBA55D3, 0.15); g.fillCircle(x + m.w / 2, y + 34, 30);
          g.fillStyle(0x8B008B, 0.6); g.fillEllipse(x + 30, y + 34, 40, 46);
          g.fillStyle(0x9932CC, 0.5); g.fillEllipse(x + 30, y + 32, 34, 38);
          g.fillStyle(0xBA55D3, 0.4); g.fillEllipse(x + 30, y + 30, 24, 28);
          g.fillStyle(0x8B008B, 0.3);
          g.fillTriangle(x + 18, y + 50, x + 12, y + 66, x + 24, y + 58);
          g.fillTriangle(x + 30, y + 52, x + 26, y + 68, x + 34, y + 60);
          g.fillTriangle(x + 42, y + 50, x + 36, y + 64, x + 46, y + 58);
          // Yüz
          g.fillStyle(0x6A006A, 0.8); g.fillRoundedRect(x + 14, y + 8, 32, 24, 8);
          g.fillStyle(0xFF00FF, 0.8); g.fillCircle(x + 22, y + 20, 3); g.fillCircle(x + 38, y + 20, 3);
          g.fillStyle(0xFF66FF); g.fillCircle(x + 22, y + 20, 1.5); g.fillCircle(x + 38, y + 20, 1.5);
          // Taç
          g.fillStyle(0xFFD700); g.fillRect(x + 14, y + 8, 32, 4);
          g.fillTriangle(x + 16, y + 8, x + 20, y, x + 24, y + 8);
          g.fillTriangle(x + 26, y + 8, x + 30, y - 2, x + 34, y + 8);
          g.fillTriangle(x + 36, y + 8, x + 40, y, x + 44, y + 8);
          g.fillStyle(0xFF00FF); g.fillCircle(x + 30, y, 2);

        } else if (m.key === 'dungeon_boss_10') {
          // ===== ALACAKARANLIK EFENDİSİ - Kötülüğün Dev Ejderhası =====
          const W = m.w, H = m.h;
          // Gölge
          g.fillStyle(0x000000, 0.5); g.fillEllipse(x + W / 2, y + H - 8, W - 20, 16);

          // Dev kanatlar (koyu mor, çok geniş)
          g.fillStyle(0x1A0030, 0.9);
          g.fillTriangle(x + 6, y + 40, x + 30, y + 20, x + 35, y + 75);
          g.fillTriangle(x + W - 6, y + 40, x + W - 30, y + 20, x + W - 35, y + 75);
          g.fillStyle(0x2A0A4A, 0.6);
          g.fillTriangle(x + 10, y + 38, x + 30, y + 25, x + 33, y + 65);
          g.fillTriangle(x + W - 10, y + 38, x + W - 30, y + 25, x + W - 33, y + 65);
          // Kanat damarları
          g.lineStyle(1, 0x4A0060, 0.5);
          g.lineBetween(x + 20, y + 30, x + 10, y + 55);
          g.lineBetween(x + 25, y + 35, x + 15, y + 60);
          g.lineBetween(x + W - 20, y + 30, x + W - 10, y + 55);
          g.lineBetween(x + W - 25, y + 35, x + W - 15, y + 60);

          // Kuyruk (sol tarafa doğru kıvrılan)
          g.fillStyle(0x1A0030);
          g.fillTriangle(x + 10, y + H - 15, x + 30, y + H - 25, x + 20, y + H - 5);
          g.fillStyle(0x8B0000); // kuyruk ucu dikenli
          g.fillTriangle(x + 8, y + H - 18, x + 2, y + H - 10, x + 14, y + H - 10);

          // Bacaklar (kalın, dev pençeli)
          g.fillStyle(0x1A0030);
          g.fillRect(x + 35 + b, y + 88, 16, 28);
          g.fillRect(x + 75 - b, y + 88, 16, 28);
          g.fillStyle(0x0A0018);
          // Pençeler
          g.fillTriangle(x + 33 + b, y + 112, x + 40 + b, y + 108, x + 40 + b, y + 120);
          g.fillTriangle(x + 43 + b, y + 112, x + 49 + b, y + 108, x + 49 + b, y + 120);
          g.fillTriangle(x + 73 - b, y + 112, x + 80 - b, y + 108, x + 80 - b, y + 120);
          g.fillTriangle(x + 83 - b, y + 112, x + 89 - b, y + 108, x + 89 - b, y + 120);

          // Gövde (devasa, koyu mor-siyah)
          this.grad(g, x + 28, y + 35, 72, 58, 0x2A0A4A, 0x0A0018);
          g.fillStyle(0x3A0A5A, 0.3);
          g.fillEllipse(x + W / 2, y + 65, 60, 45);
          // Karın zırhı (kırmızı çizgiler)
          g.fillStyle(0x4A0000, 0.5);
          for (let s = 0; s < 5; s++) g.fillRect(x + 40 + s * 10, y + 60, 8, 8);

          // Kollar (büyük, kaslı)
          g.fillStyle(0x1A0030);
          g.fillRoundedRect(x + 18, y + 40, 16, 36, 4);
          g.fillRoundedRect(x + W - 34, y + 40, 16, 36, 4);
          // Pençeli eller
          g.fillStyle(0x0A0018);
          g.fillTriangle(x + 18, y + 72, x + 14, y + 82, x + 26, y + 78);
          g.fillTriangle(x + W - 18, y + 72, x + W - 14, y + 82, x + W - 26, y + 78);

          // Baş (büyük, boynuzlu ejder kafası)
          g.fillStyle(0x2A0A4A); g.fillRoundedRect(x + 36, y + 5, 56, 36, 8);
          g.fillStyle(0x1A0030); g.fillRoundedRect(x + 38, y + 7, 52, 32, 7);
          // Alın zırhı
          g.fillStyle(0x3A0A5A); g.fillRect(x + 42, y + 8, 44, 6);

          // Dev boynuzlar (4 adet, her yanda 2)
          g.fillStyle(0x4A0060);
          g.fillTriangle(x + 36, y + 10, x + 24, y - 16, x + 42, y + 10);
          g.fillTriangle(x + 44, y + 8, x + 36, y - 10, x + 50, y + 8);
          g.fillTriangle(x + 86, y + 10, x + 104, y - 16, x + 92, y + 10);
          g.fillTriangle(x + 78, y + 8, x + 92, y - 10, x + 84, y + 8);
          // Boynuz uçları parlak
          g.fillStyle(0x8B0000);
          g.fillCircle(x + 24, y - 14, 3);
          g.fillCircle(x + 36, y - 8, 2);
          g.fillCircle(x + 104, y - 14, 3);
          g.fillCircle(x + 92, y - 8, 2);

          // Gözler (kırmızı, parlayan, kötü bakış)
          g.fillStyle(0x000000); g.fillRect(x + 46, y + 16, 14, 10); g.fillRect(x + 68, y + 16, 14, 10);
          g.fillStyle(0xFF0000, 0.9); g.fillRect(x + 48, y + 18, 10, 6); g.fillRect(x + 70, y + 18, 10, 6);
          g.fillStyle(0xFFFF00); g.fillCircle(x + 53, y + 21, 2); g.fillCircle(x + 75, y + 21, 2);
          // Göz parıltısı
          g.fillStyle(0xFF0000, 0.3); g.fillCircle(x + 53, y + 21, 8); g.fillCircle(x + 75, y + 21, 8);

          // Ağız (dişli, ateş soluyan)
          g.fillStyle(0x0A0018); g.fillRect(x + 48, y + 30, 32, 8);
          g.fillStyle(0xFFFFE0); // Dişler
          for (let t = 0; t < 6; t++) {
            g.fillTriangle(x + 50 + t * 5, y + 30, x + 52 + t * 5, y + 26, x + 54 + t * 5, y + 30);
            g.fillTriangle(x + 50 + t * 5, y + 38, x + 52 + t * 5, y + 42, x + 54 + t * 5, y + 38);
          }
          // Ateş nefesi (2. frame'de)
          if (f === 1) {
            g.fillStyle(0xFF0000, 0.7);
            g.fillTriangle(x + 54, y + 38, x + 74, y + 38, x + 64, y + 58);
            g.fillStyle(0xFF4500, 0.6);
            g.fillTriangle(x + 56, y + 42, x + 72, y + 42, x + 64, y + 55);
            g.fillStyle(0xFFD700, 0.5);
            g.fillTriangle(x + 58, y + 44, x + 70, y + 44, x + 64, y + 52);
          }

          // Karanlık aura (her zaman)
          g.fillStyle(0x2A0A4A, 0.15); g.fillCircle(x + W / 2, y + H / 2, 55);
          g.fillStyle(0x4A0060, 0.1); g.fillCircle(x + W / 2, y + H / 2, 40);

        } else if (m.key === 'dungeon_boss_1') {
          // ===== DEV FARE KRALI — Kanalizasyon Lordu =====
          const W = m.w, H = m.h;
          g.fillStyle(0x000000, 0.3); g.fillEllipse(x + W/2, y + H - 5, W - 16, 10);
          // Kuyruk (uzun, kıvrık)
          g.fillStyle(0x8B6060); g.fillTriangle(x + 50, y + 44, x + 60, y + 30, x + 58, y + 50);
          g.fillStyle(0x7a5050); g.fillRect(x + 56, y + 26, 3, 16);
          // Bacaklar (kısa, şişman)
          g.fillStyle(0x5a4040); g.fillRect(x + 14 + b, y + 38, 10, 14); g.fillRect(x + 36 - b, y + 38, 10, 14);
          g.fillStyle(0x4a3030); g.fillRoundedRect(x + 12 + b, y + 48, 14, 6, 2); g.fillRoundedRect(x + 34 - b, y + 48, 14, 6, 2);
          // Gövde (büyük, yuvarlak)
          g.fillStyle(0x6a5040); g.fillEllipse(x + 32, y + 30, 44, 32);
          this.grad(g, x + 12, y + 18, 40, 26, 0x8B7060, 0x6a5040);
          // Karın
          g.fillStyle(0xA08878, 0.5); g.fillEllipse(x + 32, y + 34, 24, 14);
          // Kürk detayları
          g.fillStyle(0x7a6050, 0.4);
          for (let s = 0; s < 8; s++) g.fillRect(x + 14 + s * 5, y + 20, 1, 8 + (s % 3) * 2);
          // Kollar
          g.fillStyle(0x6a5040); g.fillRoundedRect(x + 4, y + 20, 10, 18, 3); g.fillRoundedRect(x + 48, y + 20, 10, 18, 3);
          // Baş (büyük fare başı)
          g.fillStyle(0x8B7060); g.fillRoundedRect(x + 14, y + 2, 36, 22, 6);
          g.fillStyle(0x7a6050); g.fillRoundedRect(x + 16, y + 4, 32, 18, 5);
          // Kulaklar (büyük, yuvarlak)
          g.fillStyle(0x8B7060); g.fillCircle(x + 14, y + 6, 8); g.fillCircle(x + 50, y + 6, 8);
          g.fillStyle(0xBB9090); g.fillCircle(x + 14, y + 6, 5); g.fillCircle(x + 50, y + 6, 5);
          // Gözler (kırmızı, kötü)
          g.fillStyle(0xFF0000); g.fillCircle(x + 24, y + 12, 3); g.fillCircle(x + 40, y + 12, 3);
          g.fillStyle(0xFFFF00); g.fillCircle(x + 24, y + 12, 1.5); g.fillCircle(x + 40, y + 12, 1.5);
          // Burun
          g.fillStyle(0xFF8888); g.fillCircle(x + 32, y + 18, 2);
          // Dişler
          g.fillStyle(0xFFFFF0); g.fillRect(x + 26, y + 20, 3, 4); g.fillRect(x + 35, y + 20, 3, 4);
          // Taç (çarpık, paslı)
          g.fillStyle(0xB8860B); g.fillRect(x + 20, y + 2, 24, 4);
          g.fillTriangle(x + 22, y + 2, x + 26, y - 4, x + 30, y + 2);
          g.fillTriangle(x + 34, y + 2, x + 38, y - 6, x + 42, y + 2);

        } else if (m.key === 'dungeon_boss_2') {
          // ===== BUZ CADISI — Frost Witch =====
          const W = m.w, H = m.h;
          g.fillStyle(0x000000, 0.25); g.fillEllipse(x + W/2, y + H - 5, W - 12, 8);
          // Buz parçacıkları
          g.fillStyle(0x87CEEB, 0.2); g.fillCircle(x + 10, y + 20, 4); g.fillCircle(x + 48, y + 30, 3);
          g.fillCircle(x + 14, y + 50, 3); g.fillCircle(x + 44, y + 14, 4);
          // Cüppe (mavi-beyaz, uzun)
          this.grad(g, x + 10, y + 24, 36, 36, 0x87CEEB, 0x4682B4);
          g.fillStyle(0xADD8E6, 0.3); g.fillRect(x + 26, y + 24, 4, 36);
          // Cüppe eteği (buzlu)
          g.fillStyle(0xE0F0FF, 0.4);
          for (let s = 0; s < 5; s++) g.fillTriangle(x + 10 + s * 7, y + 56, x + 14 + s * 7, y + 62, x + 18 + s * 7, y + 56);
          // Kollar
          g.fillStyle(0x87CEEB); g.fillRoundedRect(x + 2, y + 26, 10, 22, 3); g.fillRoundedRect(x + 44, y + 26, 10, 22, 3);
          // Eller (buz mavisi)
          g.fillStyle(0xB0D8F0); g.fillCircle(x + 7, y + 50, 4); g.fillCircle(x + 49, y + 50, 4);
          // Sol el: buz asası
          g.fillStyle(0xADD8E6); g.fillRect(x + 5, y + 16, 2, 36);
          g.fillStyle(0x00BFFF, 0.7); g.fillCircle(x + 6, y + 14, 5);
          g.fillStyle(0xE0FFFF, 0.9); g.fillCircle(x + 6, y + 14, 3);
          g.fillStyle(0xFFFFFF); g.fillCircle(x + 5, y + 13, 1);
          // Boyun
          g.fillStyle(0xE0D0E0); g.fillRect(x + 22, y + 18, 12, 8);
          // Baş (soluk ten)
          g.fillStyle(0xC0B0C0); g.fillRoundedRect(x + 13, y + 2, 30, 20, 6);
          g.fillStyle(0xE0D0E0); g.fillRoundedRect(x + 14, y + 3, 28, 18, 5);
          // Saç (beyaz, uzun, dalgalı)
          g.fillStyle(0xE8E8F0); g.fillRoundedRect(x + 12, y + 0, 32, 12, 5);
          g.fillRect(x + 12, y + 6, 4, 18); g.fillRect(x + 40, y + 6, 4, 18);
          g.fillStyle(0xD0D0E0); g.fillRect(x + 10, y + 16, 3, 14); g.fillRect(x + 43, y + 16, 3, 14);
          // Gözler (buz mavisi, parlak)
          g.fillStyle(0x000020); g.fillRect(x + 20, y + 10, 4, 4); g.fillRect(x + 32, y + 10, 4, 4);
          g.fillStyle(0x00BFFF); g.fillRect(x + 21, y + 10, 2, 3); g.fillRect(x + 33, y + 10, 2, 3);
          g.fillStyle(0x00BFFF, 0.3); g.fillCircle(x + 22, y + 11, 5); g.fillCircle(x + 34, y + 11, 5);
          // Dudaklar (mavi)
          g.fillStyle(0x6A8AAA); g.fillRect(x + 24, y + 16, 8, 2);
          // Buz taçı
          g.fillStyle(0xADD8E6); g.fillTriangle(x + 16, y + 2, x + 20, y - 6, x + 24, y + 2);
          g.fillTriangle(x + 24, y + 2, x + 28, y - 10, x + 32, y + 2);
          g.fillTriangle(x + 32, y + 2, x + 36, y - 6, x + 40, y + 2);
          g.fillStyle(0xE0FFFF, 0.7); g.fillCircle(x + 28, y - 8, 2);
          // Buz aurası
          if (f === 1) { g.fillStyle(0x87CEEB, 0.15); g.fillCircle(x + W/2, y + 30, 28); }

        } else if (m.key === 'dungeon_boss_3') {
          // ===== TAŞ MUHAFIZI — Stone Guardian =====
          const W = m.w, H = m.h;
          g.fillStyle(0x000000, 0.4); g.fillEllipse(x + W/2, y + H - 6, W - 16, 12);
          // Bacaklar (dev taş sütunlar)
          g.fillStyle(0x5a5a50); g.fillRect(x + 18 + b, y + 58, 16, 24); g.fillRect(x + 46 - b, y + 58, 16, 24);
          g.fillStyle(0x6a6a60); g.fillRect(x + 20 + b, y + 60, 12, 6); g.fillRect(x + 48 - b, y + 60, 12, 6);
          g.fillStyle(0x4a4a40); g.fillRoundedRect(x + 16 + b, y + 78, 20, 8, 2); g.fillRoundedRect(x + 44 - b, y + 78, 20, 8, 2);
          // Gövde (devasa taş blok)
          g.fillStyle(0x6a6a60); g.fillRoundedRect(x + 10, y + 18, 60, 44, 8);
          this.grad(g, x + 12, y + 20, 56, 40, 0x8a8a80, 0x5a5a50);
          // Çatlaklar ve yosun
          g.lineStyle(1, 0x4a4a40); g.lineBetween(x + 22, y + 22, x + 32, y + 44);
          g.lineBetween(x + 50, y + 26, x + 44, y + 48);
          g.lineBetween(x + 30, y + 34, x + 46, y + 38);
          g.fillStyle(0x4a6a4a, 0.4); g.fillRect(x + 24, y + 36, 6, 4); g.fillRect(x + 46, y + 42, 5, 3);
          // Rune (göğüste, parlayan)
          g.fillStyle(0x44AAFF, 0.6); g.fillCircle(x + 40, y + 38, 8);
          g.fillStyle(0x66CCFF, 0.4); g.fillCircle(x + 40, y + 38, 5);
          g.fillStyle(0xAADDFF, 0.3); g.fillRect(x + 36, y + 34, 8, 2); g.fillRect(x + 38, y + 32, 4, 12);
          // Kollar (büyük taş kollar)
          g.fillStyle(0x6a6a60); g.fillRoundedRect(x + 2, y + 22, 14, 34, 4); g.fillRoundedRect(x + 64, y + 22, 14, 34, 4);
          g.fillStyle(0x7a7a70); g.fillRect(x + 4, y + 24, 10, 8); g.fillRect(x + 66, y + 24, 10, 8);
          // Yumruklar
          g.fillStyle(0x5a5a50); g.fillRoundedRect(x + 2, y + 52, 14, 12, 4); g.fillRoundedRect(x + 64, y + 52, 14, 12, 4);
          // Baş (taş, kare)
          g.fillStyle(0x7a7a70); g.fillRoundedRect(x + 22, y + 2, 36, 22, 5);
          g.fillStyle(0x8a8a80); g.fillRoundedRect(x + 24, y + 4, 32, 18, 4);
          // Gözler (turuncu, parlayan)
          g.fillStyle(0xFF6600); g.fillRect(x + 30, y + 10, 6, 5); g.fillRect(x + 44, y + 10, 6, 5);
          g.fillStyle(0xFFAA00); g.fillRect(x + 31, y + 11, 4, 3); g.fillRect(x + 45, y + 11, 4, 3);
          g.fillStyle(0xFF6600, 0.2); g.fillCircle(x + 33, y + 12, 6); g.fillCircle(x + 47, y + 12, 6);
          // Ağız (taş çizgi)
          g.fillStyle(0x3a3a30); g.fillRect(x + 32, y + 18, 16, 3);

        } else if (m.key === 'dungeon_boss_4') {
          // ===== VEBA DOKTORU — Plague Doctor =====
          const W = m.w, H = m.h;
          g.fillStyle(0x000000, 0.3); g.fillEllipse(x + W/2, y + H - 5, W - 14, 10);
          // Zehir bulutu
          if (f === 1) {
            g.fillStyle(0x00FF00, 0.1); g.fillCircle(x + W/2, y + 40, 30);
            g.fillStyle(0x44FF44, 0.08); g.fillCircle(x + 20, y + 50, 12); g.fillCircle(x + 52, y + 36, 10);
          }
          // Bacaklar (siyah çizme)
          g.fillStyle(0x1a1a1a); g.fillRect(x + 20 + b, y + 56, 10, 18); g.fillRect(x + 42 - b, y + 56, 10, 18);
          g.fillStyle(0x0a0a0a); g.fillRoundedRect(x + 18 + b, y + 70, 14, 8, 2); g.fillRoundedRect(x + 40 - b, y + 70, 14, 8, 2);
          // Gövde (siyah pelerin)
          this.grad(g, x + 12, y + 22, 48, 38, 0x2a2a2a, 0x0a0a0a);
          // Pelerin detay
          g.fillStyle(0x1a1a1a); g.fillRect(x + 34, y + 22, 2, 38);
          // Kemeri (deri)
          g.fillStyle(0x3a2a0a); g.fillRect(x + 14, y + 42, 44, 3);
          // İlaç şişeleri (belde)
          g.fillStyle(0x00AA00, 0.7); g.fillRoundedRect(x + 16, y + 44, 5, 8, 2);
          g.fillStyle(0xAA0000, 0.7); g.fillRoundedRect(x + 24, y + 44, 5, 8, 2);
          g.fillStyle(0x6600AA, 0.7); g.fillRoundedRect(x + 44, y + 44, 5, 8, 2);
          // Kollar
          g.fillStyle(0x2a2a2a); g.fillRoundedRect(x + 4, y + 24, 12, 26, 3); g.fillRoundedRect(x + 56, y + 24, 12, 26, 3);
          // Eller (eldiven)
          g.fillStyle(0x1a1a1a); g.fillCircle(x + 10, y + 52, 4); g.fillCircle(x + 62, y + 52, 4);
          // Sağ el: orak
          g.fillStyle(0x808080); g.fillTriangle(x + 58, y + 44, x + 68, y + 34, x + 70, y + 48);
          g.fillStyle(0x5a3a1a); g.fillRect(x + 60, y + 44, 3, 14);
          // Boyun (yaka)
          g.fillStyle(0x2a2a2a); g.fillRect(x + 22, y + 18, 28, 6);
          // Baş (veba maskesi — gaga şeklinde)
          g.fillStyle(0x1a1a1a); g.fillRoundedRect(x + 18, y + 2, 36, 22, 5);
          g.fillStyle(0x2a2a2a); g.fillRoundedRect(x + 20, y + 4, 32, 18, 4);
          // Gaga (uzun)
          g.fillStyle(0x2a2a2a); g.fillTriangle(x + 30, y + 14, x + 42, y + 14, x + 36, y + 28);
          g.fillStyle(0x1a1a1a); g.fillTriangle(x + 32, y + 14, x + 40, y + 14, x + 36, y + 24);
          // Cam gözlükler (kırmızı)
          g.fillStyle(0x000000); g.fillCircle(x + 28, y + 10, 5); g.fillCircle(x + 44, y + 10, 5);
          g.fillStyle(0xFF0000, 0.7); g.fillCircle(x + 28, y + 10, 4); g.fillCircle(x + 44, y + 10, 4);
          g.fillStyle(0xFF4444, 0.4); g.fillCircle(x + 27, y + 9, 2); g.fillCircle(x + 43, y + 9, 2);
          // Şapka (geniş kenarlı)
          g.fillStyle(0x1a1a1a); g.fillRect(x + 12, y + 2, 48, 5);
          g.fillStyle(0x2a2a2a); g.fillRoundedRect(x + 22, y - 4, 28, 8, 3);

        } else if (m.key === 'dungeon_boss_5') {
          // ===== KAN ŞÖVALYESİ — Blood Knight =====
          const W = m.w, H = m.h;
          g.fillStyle(0x000000, 0.35); g.fillEllipse(x + W/2, y + H - 5, W - 14, 10);
          // Bacaklar (kanlı zırh)
          g.fillStyle(0x4A0000); g.fillRect(x + 16 + b, y + 52, 10, 18); g.fillRect(x + 38 - b, y + 52, 10, 18);
          g.fillStyle(0x3a0000); g.fillRoundedRect(x + 14 + b, y + 66, 14, 8, 2); g.fillRoundedRect(x + 36 - b, y + 66, 14, 8, 2);
          // Gövde (koyu kırmızı zırh)
          this.grad(g, x + 10, y + 18, 44, 36, 0x8B0000, 0x4A0000);
          // Zırh detayları
          g.fillStyle(0x6a0000); g.fillRect(x + 14, y + 20, 36, 3); g.fillRect(x + 14, y + 30, 36, 3);
          // Kan sembolü (göğüste)
          g.fillStyle(0xFF0000, 0.6); g.fillCircle(x + 32, y + 38, 6);
          g.fillStyle(0xCC0000, 0.4); g.fillTriangle(x + 28, y + 38, x + 32, y + 48, x + 36, y + 38);
          // Kollar (zırhlı)
          g.fillStyle(0x6a0000); g.fillRoundedRect(x + 2, y + 20, 12, 26, 3); g.fillRoundedRect(x + 50, y + 20, 12, 26, 3);
          g.fillStyle(0x8B0000); g.fillRoundedRect(x + 4, y + 22, 8, 6, 2); g.fillRoundedRect(x + 52, y + 22, 8, 6, 2);
          // Sağ el: kanlı kılıç
          g.fillStyle(0x808080); g.fillRect(x + 56, y + 8, 4, 36);
          g.fillStyle(0xFF0000, 0.5); g.fillRect(x + 55, y + 12, 6, 4); g.fillRect(x + 55, y + 20, 6, 3);
          g.fillStyle(0x6a3a1a); g.fillRect(x + 54, y + 40, 8, 4);
          // Sol el: kalkan
          g.fillStyle(0x4A0000); g.fillRoundedRect(x, y + 28, 12, 18, 3);
          g.fillStyle(0x8B0000); g.fillCircle(x + 6, y + 37, 4);
          // Kask (tam kapalı, boynuzlu)
          g.fillStyle(0x4A0000); g.fillRoundedRect(x + 16, y + 2, 32, 22, 5);
          g.fillStyle(0x6a0000); g.fillRoundedRect(x + 18, y + 4, 28, 18, 4);
          // Vizör (dar yarık, kırmızı parıltı)
          g.fillStyle(0x0a0000); g.fillRect(x + 22, y + 12, 20, 4);
          g.fillStyle(0xFF0000, 0.8); g.fillRect(x + 24, y + 13, 16, 2);
          g.fillStyle(0xFF0000, 0.2); g.fillCircle(x + 32, y + 14, 8);
          // Boynuzlar (kan kırmızısı)
          g.fillStyle(0x8B0000);
          g.fillTriangle(x + 16, y + 6, x + 10, y - 8, x + 22, y + 6);
          g.fillTriangle(x + 42, y + 6, x + 54, y - 8, x + 48, y + 6);
          // Kan damlası efekti
          g.fillStyle(0xFF0000, 0.4); g.fillCircle(x + 30, y + 8, 2); g.fillCircle(x + 40, y + 6, 1.5);

        } else if (m.key === 'dungeon_boss_6') {
          // ===== NEKROMANSER — Undead Summoner =====
          const W = m.w, H = m.h;
          g.fillStyle(0x000000, 0.3); g.fillEllipse(x + W/2, y + H - 5, W - 14, 10);
          // Karanlık aura
          g.fillStyle(0x2A0A3A, 0.15); g.fillCircle(x + W/2, y + 40, 30);
          // Bacaklar (kemik gibi)
          g.fillStyle(0x1a0a2a); g.fillRect(x + 20 + b, y + 54, 10, 20); g.fillRect(x + 42 - b, y + 54, 10, 20);
          // Gövde (koyu mor cüppe)
          this.grad(g, x + 10, y + 20, 52, 38, 0x2A0A3A, 0x0A0018);
          // Cüppe detay (kafatası motifleri)
          g.fillStyle(0xD0D0B0, 0.3); g.fillCircle(x + 36, y + 38, 5);
          g.fillStyle(0x0A0018); g.fillCircle(x + 34, y + 37, 1.5); g.fillCircle(x + 38, y + 37, 1.5);
          g.fillRect(x + 34, y + 40, 4, 2);
          // Pelerin
          g.fillStyle(0x1a0a2a, 0.5); g.fillTriangle(x + 14, y + 20, x + 58, y + 20, x + 36, y + 72);
          // Kollar
          g.fillStyle(0x2A0A3A); g.fillRoundedRect(x + 2, y + 22, 12, 26, 3); g.fillRoundedRect(x + 58, y + 22, 12, 26, 3);
          // Sol el: kafatası asa
          g.fillStyle(0x3a2a1a); g.fillRect(x + 4, y + 14, 3, 40);
          g.fillStyle(0xD0D0B0); g.fillCircle(x + 6, y + 12, 5);
          g.fillStyle(0x0A0018); g.fillCircle(x + 4, y + 11, 1.5); g.fillCircle(x + 8, y + 11, 1.5);
          g.fillRect(x + 4, y + 14, 4, 2);
          g.fillStyle(0x6A0DAD, 0.5); g.fillCircle(x + 6, y + 12, 7);
          // Sağ el: karanlık enerji
          g.fillStyle(0x6A0DAD, 0.5); g.fillCircle(x + 64, y + 44, 8);
          g.fillStyle(0x9370DB, 0.4); g.fillCircle(x + 64, y + 44, 5);
          g.fillStyle(0xFF00FF, 0.3); g.fillCircle(x + 64, y + 44, 3);
          // Kapüşon (büyük, koyu)
          g.fillStyle(0x1a0a2a); g.fillRoundedRect(x + 14, y + 2, 44, 24, 8);
          g.fillStyle(0x0A0018); g.fillRoundedRect(x + 18, y + 4, 36, 20, 6);
          // Yüz (gölgeli, sadece gözler görünür)
          g.fillStyle(0x00FF00, 0.8); g.fillCircle(x + 28, y + 14, 3); g.fillCircle(x + 44, y + 14, 3);
          g.fillStyle(0x88FF88); g.fillCircle(x + 28, y + 14, 1.5); g.fillCircle(x + 44, y + 14, 1.5);
          g.fillStyle(0x00FF00, 0.2); g.fillCircle(x + 28, y + 14, 6); g.fillCircle(x + 44, y + 14, 6);
          // İskelet parçacıkları (etrafta süzülen)
          if (f === 1) {
            g.fillStyle(0xD0D0B0, 0.4);
            g.fillCircle(x + 8, y + 58, 3); g.fillCircle(x + 60, y + 28, 3);
            g.fillStyle(0x0A0018, 0.3); g.fillCircle(x + 7, y + 57, 1); g.fillCircle(x + 59, y + 27, 1);
          }

        } else if (m.key === 'dungeon_boss_7') {
          // ===== ATEŞ ELEMENTALİ — Fire Elemental =====
          const W = m.w, H = m.h;
          g.fillStyle(0x000000, 0.25); g.fillEllipse(x + W/2, y + H - 6, W - 20, 12);
          // Ateş gövde (alev şekli, aşağıdan yukarı)
          g.fillStyle(0xFF4500, 0.8); g.fillEllipse(x + W/2, y + 50, 60, 40);
          this.grad(g, x + 18, y + 34, 60, 40, 0xFF6600, 0xFF0000);
          g.fillStyle(0xFFD700, 0.5); g.fillEllipse(x + W/2, y + 48, 40, 28);
          g.fillStyle(0xFFFF00, 0.3); g.fillEllipse(x + W/2, y + 46, 24, 18);
          // Alev dilleri (üstte)
          g.fillStyle(0xFF4500, 0.8);
          g.fillTriangle(x + 20, y + 30, x + 28, y + 14, x + 36, y + 30);
          g.fillTriangle(x + 36, y + 28, x + 48, y + 10, x + 56, y + 28);
          g.fillTriangle(x + 56, y + 30, x + 64, y + 16, x + 72, y + 32);
          g.fillStyle(0xFFD700, 0.6);
          g.fillTriangle(x + 24, y + 28, x + 30, y + 18, x + 34, y + 28);
          g.fillTriangle(x + 40, y + 26, x + 48, y + 14, x + 52, y + 26);
          g.fillTriangle(x + 58, y + 28, x + 64, y + 20, x + 68, y + 30);
          // Kol alevleri
          g.fillStyle(0xFF4500, 0.7);
          g.fillTriangle(x + 8, y + 36, x + 2, y + 24, x + 18, y + 46);
          g.fillTriangle(x + 78, y + 36, x + 94, y + 24, x + 88, y + 46);
          g.fillStyle(0xFFD700, 0.5);
          g.fillTriangle(x + 10, y + 38, x + 6, y + 28, x + 16, y + 44);
          g.fillTriangle(x + 80, y + 38, x + 90, y + 28, x + 86, y + 44);
          // Yüz (ateşin içinde)
          g.fillStyle(0x000000, 0.6); g.fillRect(x + 32, y + 38, 10, 6); g.fillRect(x + 54, y + 38, 10, 6);
          g.fillStyle(0xFFFF00); g.fillRect(x + 34, y + 40, 6, 2); g.fillRect(x + 56, y + 40, 6, 2);
          g.fillStyle(0x000000, 0.5); g.fillRect(x + 38, y + 48, 20, 4);
          // Ateş çekirdeği (merkez)
          g.fillStyle(0xFFFFFF, 0.4); g.fillCircle(x + W/2, y + 50, 8);
          g.fillStyle(0xFFFF00, 0.3); g.fillCircle(x + W/2, y + 50, 12);
          // Kıvılcımlar
          if (f === 1) {
            g.fillStyle(0xFFD700, 0.8);
            g.fillCircle(x + 16, y + 22, 2); g.fillCircle(x + 74, y + 26, 2);
            g.fillCircle(x + 48, y + 8, 1.5); g.fillCircle(x + 30, y + 12, 1.5);
          }

        } else if (m.key === 'dungeon_boss_8') {
          // ===== FIRTINA DEVİ — Storm Giant =====
          const W = m.w, H = m.h;
          g.fillStyle(0x000000, 0.4); g.fillEllipse(x + W/2, y + H - 6, W - 16, 12);
          // Bacaklar (büyük, kaslı, mavi)
          g.fillStyle(0x2a3a6a); g.fillRect(x + 20 + b, y + 60, 14, 22); g.fillRect(x + 46 - b, y + 60, 14, 22);
          g.fillStyle(0x1a2a5a); g.fillRoundedRect(x + 18 + b, y + 78, 18, 8, 2); g.fillRoundedRect(x + 44 - b, y + 78, 18, 8, 2);
          // Gövde (devasa, mavi-gri)
          this.grad(g, x + 10, y + 20, 60, 44, 0x4a5a8a, 0x2a3a6a);
          // Göğüs kasları
          g.fillStyle(0x5a6a9a, 0.4); g.fillEllipse(x + 30, y + 34, 16, 12); g.fillEllipse(x + 50, y + 34, 16, 12);
          // Kemer (yıldırım deseni)
          g.fillStyle(0xDAA520); g.fillRect(x + 12, y + 52, 56, 4);
          g.fillStyle(0xFFFF00); g.fillTriangle(x + 38, y + 52, x + 40, y + 48, x + 42, y + 52);
          // Kollar (kocaman)
          g.fillStyle(0x4a5a8a); g.fillRoundedRect(x + 2, y + 22, 14, 32, 4); g.fillRoundedRect(x + 64, y + 22, 14, 32, 4);
          g.fillStyle(0x5a6a9a); g.fillRect(x + 4, y + 24, 10, 8); g.fillRect(x + 66, y + 24, 10, 8);
          // Sağ el: çekiç
          g.fillStyle(0x5a3a1a); g.fillRect(x + 72, y + 10, 4, 44);
          g.fillStyle(0x808080); g.fillRoundedRect(x + 68, y + 6, 12, 10, 2);
          g.fillStyle(0xFFFF00, 0.4); g.fillCircle(x + 74, y + 11, 4);
          // Yumruklar
          g.fillStyle(0x3a4a7a); g.fillRoundedRect(x + 2, y + 50, 14, 10, 4); g.fillRoundedRect(x + 66, y + 50, 12, 10, 4);
          // Baş (kare çeneli, dev)
          g.fillStyle(0x4a5a8a); g.fillRoundedRect(x + 20, y + 2, 40, 24, 6);
          g.fillStyle(0x5a6a9a); g.fillRoundedRect(x + 22, y + 4, 36, 20, 5);
          // Saç (beyaz, kısa, yıldırımlı)
          g.fillStyle(0xDDDDEE); g.fillRoundedRect(x + 20, y + 0, 40, 10, 4);
          // Gözler (yıldırım mavisi)
          g.fillStyle(0x000020); g.fillRect(x + 28, y + 10, 8, 6); g.fillRect(x + 44, y + 10, 8, 6);
          g.fillStyle(0x00BFFF); g.fillRect(x + 30, y + 12, 4, 2); g.fillRect(x + 46, y + 12, 4, 2);
          g.fillStyle(0x00BFFF, 0.3); g.fillCircle(x + 32, y + 13, 6); g.fillCircle(x + 48, y + 13, 6);
          // Ağız
          g.fillStyle(0x1a2a5a); g.fillRect(x + 32, y + 20, 16, 3);
          // Yıldırım efektleri
          if (f === 1) {
            g.lineStyle(2, 0xFFFF00, 0.7);
            g.lineBetween(x + 16, y + 4, x + 10, y + 18); g.lineBetween(x + 10, y + 18, x + 14, y + 16);
            g.lineBetween(x + 64, y + 4, x + 70, y + 18); g.lineBetween(x + 70, y + 18, x + 66, y + 16);
            g.fillStyle(0xFFFF00, 0.15); g.fillCircle(x + W/2, y + 30, 25);
          }

        } else if (m.key === 'dungeon_boss_9') {
          // ===== BOŞLUK YÜRÜYÜCÜSÜ — Void Walker =====
          const W = m.w, H = m.h;
          g.fillStyle(0x000000, 0.4); g.fillEllipse(x + W/2, y + H - 6, W - 16, 12);
          // Kozmik aura (her zaman)
          g.fillStyle(0x1a0040, 0.2); g.fillCircle(x + W/2, y + 48, 38);
          g.fillStyle(0x0a0020, 0.15); g.fillCircle(x + W/2, y + 48, 44);
          // Bacaklar (bulanık, yarı saydam)
          g.fillStyle(0x0a0020, 0.7); g.fillRect(x + 24 + b, y + 64, 12, 24); g.fillRect(x + 52 - b, y + 64, 12, 24);
          g.fillStyle(0x1a0040, 0.5);
          g.fillTriangle(x + 22 + b, y + 84, x + 30 + b, y + 80, x + 38 + b, y + 84);
          g.fillTriangle(x + 50 - b, y + 84, x + 58 - b, y + 80, x + 66 - b, y + 84);
          // Gövde (koyu uzay boşluğu)
          this.grad(g, x + 14, y + 24, 60, 44, 0x1a0040, 0x0a0020);
          // Kozmik yıldızlar (gövdede)
          g.fillStyle(0xFFFFFF, 0.6);
          g.fillCircle(x + 28, y + 36, 1); g.fillCircle(x + 44, y + 42, 1); g.fillCircle(x + 56, y + 32, 1);
          g.fillCircle(x + 34, y + 52, 0.8); g.fillCircle(x + 50, y + 48, 0.8); g.fillCircle(x + 24, y + 46, 0.8);
          g.fillStyle(0x00FFFF, 0.4); g.fillCircle(x + 38, y + 38, 1); g.fillCircle(x + 52, y + 54, 1);
          // Void çekirdek (göğüste)
          g.fillStyle(0x000000, 0.8); g.fillCircle(x + 44, y + 44, 8);
          g.fillStyle(0x6A0DAD, 0.5); g.fillCircle(x + 44, y + 44, 6);
          g.fillStyle(0xFF00FF, 0.3); g.fillCircle(x + 44, y + 44, 4);
          g.fillStyle(0xFFFFFF, 0.5); g.fillCircle(x + 44, y + 44, 2);
          // Kollar (uzun, uçuşan)
          g.fillStyle(0x1a0040, 0.7);
          g.fillRoundedRect(x + 4, y + 26, 14, 34, 4); g.fillRoundedRect(x + 70, y + 26, 14, 34, 4);
          // Pençeler (enerji)
          g.fillStyle(0xFF00FF, 0.5); g.fillCircle(x + 10, y + 62, 6); g.fillCircle(x + 78, y + 62, 6);
          g.fillStyle(0x00FFFF, 0.3); g.fillCircle(x + 10, y + 62, 4); g.fillCircle(x + 78, y + 62, 4);
          // Baş (uzun, gizemli)
          g.fillStyle(0x1a0040); g.fillRoundedRect(x + 24, y + 2, 40, 28, 7);
          g.fillStyle(0x0a0020); g.fillRoundedRect(x + 26, y + 4, 36, 24, 6);
          // Boynuzlar (kozmik enerji)
          g.fillStyle(0x2a0060);
          g.fillTriangle(x + 24, y + 8, x + 14, y - 12, x + 32, y + 8);
          g.fillTriangle(x + 56, y + 8, x + 74, y - 12, x + 64, y + 8);
          g.fillStyle(0x00FFFF, 0.6); g.fillCircle(x + 14, y - 10, 3); g.fillCircle(x + 74, y - 10, 3);
          // Gözler (üç göz — void)
          g.fillStyle(0xFF00FF, 0.9); g.fillCircle(x + 34, y + 14, 4); g.fillCircle(x + 54, y + 14, 4);
          g.fillStyle(0x00FFFF, 0.8); g.fillCircle(x + 44, y + 8, 3); // üçüncü göz
          g.fillStyle(0xFFFFFF); g.fillCircle(x + 34, y + 14, 2); g.fillCircle(x + 54, y + 14, 2);
          g.fillStyle(0xFFFFFF, 0.8); g.fillCircle(x + 44, y + 8, 1.5);
          // Göz parıltısı
          g.fillStyle(0xFF00FF, 0.2); g.fillCircle(x + 34, y + 14, 8); g.fillCircle(x + 54, y + 14, 8);
          g.fillStyle(0x00FFFF, 0.15); g.fillCircle(x + 44, y + 8, 6);
          // Ağız (yok — sadece karanlık yarık)
          g.fillStyle(0x000000, 0.8); g.fillRect(x + 36, y + 22, 16, 3);
          // Void parçacıkları
          if (f === 1) {
            g.fillStyle(0xFF00FF, 0.5); g.fillCircle(x + 18, y + 20, 2); g.fillCircle(x + 70, y + 36, 2);
            g.fillStyle(0x00FFFF, 0.5); g.fillCircle(x + 64, y + 18, 2); g.fillCircle(x + 22, y + 56, 2);
          }

        } else {
          // Bilinmeyen canavar fallback
          g.fillStyle(0x808080); g.fillEllipse(x + m.w/2, y + m.h/2, m.w - 10, m.h - 10);
          g.fillStyle(0xFF0000); g.fillCircle(x + m.w * 0.35, y + m.h * 0.4, 3);
          g.fillCircle(x + m.w * 0.65, y + m.h * 0.4, 3);
        }
      }

      g.generateTexture(m.key, 2 * m.w, m.h);
      const tex = this.textures.get(m.key);
      for (let i = 0; i < 2; i++) tex.add(i, 0, i * m.w, 0, m.w, m.h);
      g.destroy();
    });
  }

  generateNPCSprites() {
    const fw = 64, fh = 96;
    const S = 2; // scale=2 for fine detail (32x48 grid = 64x96px)

    // Helper: draw NPC with scale=2 grid + freeform details
    const drawNPC = (key, palette, gridRows, gridOffX, gridOffY, detailFn) => {
      // Skip if PNG already loaded
      if (this.textures.exists(key)) return;
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x000000, 0.2); g.fillEllipse(32, 91, 34, 8);
      this.drawPixelArt(g, gridOffX, gridOffY, gridRows, palette, S);
      if (detailFn) detailFn(g);
      // Quest marker (yellow !)
      g.fillStyle(0xFFD700); g.fillRect(28, -4, 8, 10);
      g.fillStyle(0xFFD700); g.fillRect(29, 8, 6, 4);
      g.generateTexture(key, fw, fh);
      g.destroy();
    };

    // ====== ELDER (Yaşlı Bilge) ======
    drawNPC('npc_elder', {
      O: 0x3a2a0a, S: 0xDEB887, L: 0xF0D8C0, D: 0xC8A878,
      H: 0xB8860B, h: 0xDAA520, A: 0xFFD700, R: 0xCCCCCC,
      r: 0xAAAAAA, B: 0xDDDDDD, b: 0xEEEEEE, V: 0xBBBBBB,
      G: 0xDAA520, g: 0xB8860B, K: 0x8B6508, k: 0xFFD700,
      T: 0x5a3a1a, t: 0x4a2a0a, C: 0x00DDDD, c: 0x00AAAA,
      W: 0xFFFFFF, E: 0x1a2a3a, I: 0x6aAACC, F: 0x5a3a1a,
      M: 0xBB8866, N: 0xD0B098, X: [0x000000, 0.2],
    }, [
      '..............OhhhO...............',  // hat tip
      '.............OhAhAhO..............',
      '............OhhhhhhhhO............',
      '...........OHhhhhhhhHHO...........',
      '..........OHHHHHHHHHHHHO..........',
      '.........OHHHHHHHHHHHHHO..........',
      '........OOrRRRRRRRRrOO...........',  // hair
      '........OrRRSSSSSRRrO............',
      '........OrRSLLLLLSRrO............',
      '........OrWWIIWWWIIrO............',  // eyes
      '........OrSSLNNLSSrO.............',
      '........OrSSSSMSSSSrO............',  // mouth
      '........ORRBBBBBBBRRO............',  // beard start
      '........ORRBBbbBBBRRO............',
      '.........RRBBbbbbBRR.............',
      '..........RBBbbbbBR..............',
      '...........RBBbVBR...............',  // beard tip
      '............RBVVR...............T',
      '.......OgGGGGGGGGGgO..........TT',  // robe
      '......OgGGGGkGGGGGGgO........OTT',
      '......OgGGGGGGGGGGGGgO.......OTt',
      '.....OgGGGGGGGGGGGGGgO.......OTt',
      '.....OgGGKKKKKKGGGGGgO.......OTt',  // belt
      '.....OgGGGGkGGGGGGGGgO.......OTt',
      '.....OgGGGGGGGGGGGGGgO.......OTC',  // crystal
      '.....OgGGGGGGGGGGGGGgO.......OTc',
      '......OgGGGGG..GGGgO.........OTt',
      '.......OgGGG....GgO..........OTt',
      '........ODDDD..DDDO..............',  // legs
      '........ODDDD..DDDO..............',
      '........OFFFF..FFFO..............',  // feet
      '.........OXXXX.XXXO..............',  // shadow
    ], 0, 0, g => {
      // Detailed eyes
      g.fillStyle(0xFFFFFF); g.fillRect(18, 18, 6, 5); g.fillRect(28, 18, 6, 5);
      g.fillStyle(0x6aAACC); g.fillRect(20, 18, 4, 5); g.fillRect(30, 18, 4, 5);
      g.fillStyle(0x3a6a8a); g.fillRect(22, 19, 2, 3); g.fillRect(32, 19, 2, 3);
      g.fillStyle(0xFFFFFF, 0.8); g.fillRect(20, 18, 2, 2); g.fillRect(30, 18, 2, 2);
      // Crystal orb glow on staff
      g.fillStyle(0x00FFFF, 0.35); g.fillCircle(63, 49, 7);
      g.fillStyle(0x00FFFF, 0.6); g.fillCircle(63, 49, 5);
      g.fillStyle(0x88FFFF, 0.8); g.fillCircle(63, 49, 3);
      g.fillStyle(0xFFFFFF); g.fillCircle(62, 48, 1.5);
    });

    // ====== HEALER (Şifacı) ======
    drawNPC('npc_healer', {
      O: 0x1a2a5a, S: 0xF0E0D0, L: 0xFAEEE0, D: 0xD0C0A0,
      R: 0x8B4513, r: 0x6B3503, B: 0x4169E1, b: 0x2a4aAA,
      Q: 0xFFFFFF, q: 0xDDDDFF, K: 0x3a5a9a, W: 0xFFFFFF,
      E: 0x1a1a2a, I: 0x00AA44, M: 0xBB7766, F: 0x2a3a6a,
      H: 0x8B4513, C: 0xFF4444, N: 0xD0B098, X: [0x000000, 0.2],
      P: 0xF0E0D0, // hand skin
    }, [
      '..........ORRRRRRRRO.............',  // hair
      '.........ORRRrRRRRRRO............',
      '.........OrRRRRRRRRrO............',
      '.........OrRRRRRRRRrO............',
      '.........OrRSLLLLSRrO............',  // face
      '.........OrRSLLLLSRrO............',
      '.........OrWWIIWWIIrO............',
      '.........OrSSLNNSSSrO............',
      '.........OrSSSSMSSSSO............',
      '..........rr.SSSS.rr.............',  // neck
      '........OObBBBBBBBBbOO...........',  // robe
      '........ObBBBBQBBBBBbO...........',
      '.......ObBBBQQQQBBBBbO...........',
      '.......ObBBBBQQBBBBBBbO..........',
      '.......ObBBBBBBBBBBBBbO..........',
      '.......ObBKKKKKKBBBBBbO..........',  // belt
      '.......ObBBBBBBBBBBBBbO..OHHHO...',  // bag
      '.......ObBBBBBBBBBBBBbO..OHCHO...',
      '........ObBBBBB.BBBbO....OHHHO...',
      '.........ObBBB...BbO.............',
      '..........ODDDD.DDDO.............',  // legs
      '..........ODDDD.DDDO.............',
      '..........OFFFF.FFFO.............',
      '...........OXXXXXX...............',
    ], 0, 2, g => {
      // Eyes
      g.fillStyle(0xFFFFFF); g.fillRect(20, 16, 6, 5); g.fillRect(28, 16, 6, 5);
      g.fillStyle(0x00AA44); g.fillRect(22, 16, 4, 5); g.fillRect(30, 16, 4, 5);
      g.fillStyle(0x005522); g.fillRect(24, 17, 2, 3); g.fillRect(32, 17, 2, 3);
      g.fillStyle(0xFFFFFF, 0.7); g.fillRect(22, 16, 2, 2); g.fillRect(30, 16, 2, 2);
      // Healing glow
      g.fillStyle(0x00FF88, 0.2); g.fillCircle(12, 52, 8);
      g.fillStyle(0x00FF88, 0.12); g.fillCircle(52, 52, 8);
    });

    // ====== GUARD (Muhafız) ======
    drawNPC('npc_guard', {
      O: 0x2a2a2a, S: 0xDEB887, L: 0xF0D8C0, A: 0x5a5a5a,
      a: 0x3a3a3a, H: 0x6a6a6a, Z: 0x7a7a7a, z: 0x8a8a8a,
      K: 0x4a2a0a, G: 0xDAA520, g: 0xFFD700, P: 0xCC0000,
      p: 0xFF3333, V: 0x1a1a1a, T: 0x5a3a1a, M: 0xA0A0A0,
      m: 0xC0C0C0, D: 0x3a3a4a, F: 0x3a3a3a, W: 0xDEB887,
      C: 0x4a4a6a, c: 0x5a5a7a, B: 0x3a3a5a,
      X: [0x000000, 0.2],
    }, [
      '...............OpO..........................',  // plume
      '..............OPPO..........................',
      '.............OPPPO..........................',
      '..........OOaAHHAaOO.............OTT........',  // helmet
      '..........OaZzHHzZaO.............OTT........',
      '..........OaAHHHHAaO.............OTT........',
      '..........OaAAAAAaaO.............OTT........',
      '..........OVVWWWWVVO.............OTT........',  // visor
      '..........OaAAAAAaaO.............OTT........',
      '..........Oaa.SS.aaO.............OTT........',  // neck
      '........OHHaAZZZAaHHO............OTT........',  // shoulders
      '........OaAHHGGHAAaBbO...........OTT........',
      '.......OaAHHHGGHHAABbO...........OTT........',
      '..CC..OaAHHHHHHHAABbO............OTT........',
      '..Cc..OaAHHHHHHAABbO.............OTT........',
      '..CC..OaAKKKKKKABbO..............OTT........',  // belt
      '.......OaAAAAAAaO.................OTT........',
      '........OaDDD.DDDaO...............OMM........',
      '........OaDDD.DDDaO...............OmM........',
      '........OOFFF.FFFOO..............OMmM.......',
      '.........OXXXX.XXXO...........................',
    ], 0, 2, g => {
      // Visor eyes
      g.fillStyle(0xDEB887); g.fillRect(22, 16, 18, 4);
      g.fillStyle(0x1a1a1a); g.fillRect(25, 17, 3, 2); g.fillRect(33, 17, 3, 2);
      // Shield emblem
      g.fillStyle(0xDAA520); g.fillCircle(8, 34, 3);
      g.fillStyle(0xFFD700); g.fillRect(6, 32, 4, 4); g.fillRect(5, 33, 6, 2);
      // Spear tip
      g.fillStyle(0xC0C0C0); g.fillTriangle(56, 42, 60, 34, 64, 42);
      g.fillStyle(0xE0E0E0); g.fillTriangle(57, 40, 60, 36, 63, 40);
    });

    // ====== SHOPKEEPER (Dükkancı) ======
    drawNPC('npc_shopkeeper', {
      O: 0x3a2a0a, S: 0xDEB887, L: 0xF0D8C0, D: 0xC8A878,
      R: 0x4a2a0a, r: 0x3a1a00, W: 0xF5DEB3, w: 0xDEB887,
      A: 0x8B4513, a: 0x6a3503, K: 0x4a2a0a, G: 0xFFD700,
      g: 0xDAA520, B: 0x3a1a00, M: 0xBB7766, E: 0x1a1a2a,
      I: 0x4a3a1a, F: 0x3a2a0a, N: 0xD0B098, X: [0x000000, 0.2],
    }, [
      '..........ORRRRRRRO.............',
      '.........ORRRrRRRRRO............',
      '.........OrRRRRRRRrO............',
      '.........OrRRRRRRRrO............',
      '.........OrSLLLLSOrO............',
      '.........OrSLLLLSOrO............',
      '.........OrEEISSIErO............',  // eyes
      '.........OrSSNNNSSrO............',
      '.........OrBBBBBBBrO............',  // mustache
      '.........Or..SMMS..rO...........',
      '..........rr.SSSS.rr............',  // neck
      '........OOwWWWWWWWwOO...........',  // shirt
      '........OwWWAAaAWWWwO...........',
      '.......OwWWAAaAAWWWWwOgG........',  // apron + coins
      '.......OwWWAAGGAWWWWwOGg........',
      '.......OwWWAAAAaWWWWwO..........',
      '.......OwWKKKKKKWWWWwO..........',
      '.......OwWWAAAAaWWWWwO..........',
      '........OwWWAAA.AAWwO...........',
      '.........OwWA....AwO............',
      '..........ODDDD.DDDO............',
      '..........ODDDD.DDDO............',
      '..........OFFFF.FFFO............',
      '...........OXXXXXX..............',
    ], 0, 2, g => {
      // Eyes
      g.fillStyle(0xFFFFFF); g.fillRect(20, 16, 5, 4); g.fillRect(28, 16, 5, 4);
      g.fillStyle(0x4a3a1a); g.fillRect(22, 16, 3, 4); g.fillRect(30, 16, 3, 4);
      g.fillStyle(0x2a1a0a); g.fillRect(23, 17, 2, 2); g.fillRect(31, 17, 2, 2);
      g.fillStyle(0xFFFFFF, 0.7); g.fillRect(22, 16, 1, 1); g.fillRect(30, 16, 1, 1);
      // Mustache detail
      g.fillStyle(0x3a1a00); g.fillRect(18, 20, 8, 3); g.fillRect(28, 20, 8, 3);
      g.fillStyle(0x3a1a00); g.fillRect(16, 22, 4, 2); g.fillRect(34, 22, 4, 2);
      // Coin bag
      g.fillStyle(0x8B6508); g.fillCircle(10, 60, 5);
      g.fillStyle(0xDAA520); g.fillCircle(10, 60, 3);
      g.fillStyle(0xFFD700); g.fillCircle(9, 59, 1.5);
    });

    // ====== DUNGEON KEEPER (Zindan Bekçisi) ======
    drawNPC('npc_dungeon_keeper', {
      O: 0x2a1000, S: 0xDEB887, L: 0xF0D8C0, D: 0xC8A878,
      R: 0x1a1a1a, r: 0x0a0a0a, C: 0x8B2500, c: 0x5a1500,
      V: 0x5a3a1a, v: 0x4a2a0a, K: 0x2a1a0a, T: 0x5a3a1a,
      F: 0xFF6600, f: 0xFFDD00, W: 0xFFFFFF, E: 0x1a1a2a,
      I: 0xCC6600, M: 0x8B6060, B: 0x2a1a0a, Q: 0xB0B0B0,
      G: 0xDAA520, N: 0xD0B098, X: [0x000000, 0.2],
    }, [
      '..........ORRRRRRRO..............',
      '.........ORRRrRRRRRO.............',
      '.........OrRRRRRRRrO.............',
      '.........OrRRRRRRRrO.............',
      '.........OrSLLLLSOrO.............',
      '.........OrSLLLLSOrO.............',
      '.........OrWWISSIWrO.............',  // eyes
      '.........OrSSNNNSSrO.............',
      '.........OrSSMMSSSrO.............',
      '..........rr.SSS.rr..............',
      '........OOcCCCCCCCcOO.....OTTT...',  // robe + torch
      '........OcCCVVVCCCCcO.....OTTT...',
      '.......OcCCCVvVVCCCCcO....OFfT...',  // fire
      '.......OcCCCVVVCCCCCcO....OfFT...',
      '.......OcCCCCCCCCCCCcO.GQQ.fT...',  // keys
      '.......OcCKKKKKKCCCCcO.GQQ.....',
      '.......OcCCCCCCCCCCCcO...........',
      '........OcCCCCC.CCcO.............',
      '.........OcCCC...CcO.............',
      '..........ODDDD.DDDO.............',
      '..........OBBBB.BBBO.............',
      '...........OXXXXXX...............',
    ], 0, 2, g => {
      // Eyes
      g.fillStyle(0xFFFFFF); g.fillRect(20, 14, 5, 4); g.fillRect(28, 14, 5, 4);
      g.fillStyle(0xCC6600); g.fillRect(22, 14, 3, 4); g.fillRect(30, 14, 3, 4);
      g.fillStyle(0x884400); g.fillRect(23, 15, 2, 2); g.fillRect(31, 15, 2, 2);
      g.fillStyle(0xFFFFFF, 0.7); g.fillRect(22, 14, 1, 1); g.fillRect(30, 14, 1, 1);
      // Scar
      g.lineStyle(1, 0x8B0000, 0.6); g.lineBetween(17, 12, 20, 18);
      // Torch fire
      g.fillStyle(0xFF8C00, 0.15); g.fillCircle(56, 28, 8);
      g.fillStyle(0xFF4500, 0.5); g.fillCircle(56, 27, 4);
      g.fillStyle(0xFFDD00, 0.7); g.fillCircle(56, 27, 2);
      // Key detail
      g.fillStyle(0xDAA520); g.fillCircle(50, 32, 2);
      g.fillStyle(0xB0B0B0); g.fillRect(50, 34, 2, 4); g.fillRect(52, 33, 2, 3);
    });

    // ====== LABYRINTH SAGE (Labirent Bilgesi) ======
    drawNPC('npc_labyrinth_sage', {
      O: 0x1a0a3a, S: 0xE0D0C0, L: 0xF0E0D0, D: 0xC0B0A0,
      R: 0xCCCCCC, r: 0xAAAAAA, B: 0xDDDDDD, b: 0xEEEEEE,
      V: 0x483D8B, v: 0x2a1a5a, H: 0x3a2a6a, h: 0x2a1a5a,
      A: 0xFFD700, K: 0x808080, Q: 0x9370DB, q: 0x7B68EE,
      W: 0xFFFFFF, E: 0x1a1a2a, I: 0x9370DB, M: 0x8B6060,
      F: 0x2a1a4a, C: 0xBA55D3, c: 0x9A45B3, N: 0xD0B098,
      T: 0x4a1a0a, t: 0x6a3a1a, X: [0x000000, 0.2],
    }, [
      '...............OhhO.........................',  // hat tip
      '..............OhQQhO........................',
      '.............OhAhhhO........................',
      '............OHhhhhhHO.......................',
      '...........OHHhhhhhHHO......................',
      '..........OHHHHHHHHHHO......................',  // brim
      '.........OOrRRRRRRrOO......................',
      '.........OrRRSSSSRRrO......................',
      '.........OrRSLLLLSRrO......................',
      '.........OrWWIISSIWrO......................',  // eyes
      '.........OrSSNNNSSSrO......................',
      '.........OrSSSMSSSSrO......................',
      '.........ORRBBBBBRRO.......................',  // beard
      '..........RRBBbbBRR........................',
      '...........RBBbBR..........................',
      'CC......OvVVVVVVVVvO............OTTT.......',  // robe + book
      'cC.....OvVVVQVVVVVvO............OTtT.......',
      '.......OvVVVVVVVVVVvO...........OTtT.......',
      '.......OvVVVVVVVVVVvO...........',
      '.......OvVKKKKKVVVVvO...........',  // belt
      '.......OvVVVQQVVVVVvO...........',
      '........OvVVVV.VVvO.............',
      '.........OvVV...VvO.............',
      '..........ODDDD.DDDO............',
      '..........OFFFF.FFFO............',
      '...........OXXXXXX..............',
    ], 0, 0, g => {
      // Mystical aura
      g.fillStyle(0x6A0DAD, 0.06); g.fillCircle(32, 50, 36);
      // Eyes
      g.fillStyle(0xFFFFFF); g.fillRect(20, 18, 5, 4); g.fillRect(28, 18, 5, 4);
      g.fillStyle(0x9370DB); g.fillRect(22, 18, 3, 4); g.fillRect(30, 18, 3, 4);
      g.fillStyle(0x6a4aaa); g.fillRect(23, 19, 2, 2); g.fillRect(31, 19, 2, 2);
      g.fillStyle(0xFFFFFF, 0.7); g.fillRect(22, 18, 1, 1); g.fillRect(30, 18, 1, 1);
      g.fillStyle(0xBA55D3, 0.15); g.fillCircle(23, 20, 4); g.fillCircle(31, 20, 4);
      // Crystal orb (left)
      g.fillStyle(0x9370DB, 0.25); g.fillCircle(5, 36, 8);
      g.fillStyle(0x7B68EE, 0.4); g.fillCircle(5, 36, 6);
      g.fillStyle(0xBA55D3, 0.6); g.fillCircle(5, 36, 4);
      g.fillStyle(0xE0B0FF, 0.7); g.fillCircle(4, 35, 2);
      g.fillStyle(0xFFFFFF, 0.5); g.fillCircle(3, 34, 1);
      // Book detail
      g.fillStyle(0x4a1a0a); g.fillRect(54, 34, 6, 8);
      g.fillStyle(0x6a3a1a); g.fillRect(55, 35, 4, 6);
      g.fillStyle(0xFFD700, 0.5); g.fillRect(56, 36, 2, 1); g.fillRect(56, 38, 2, 1);
      // Hat stars
      g.fillStyle(0xFFD700, 0.7); g.fillCircle(24, 6, 1); g.fillCircle(30, 4, 1);
    });
  }

  generateItemSprites() {
    const S = 64;
    // Helper for glow effect
    const glow = (g,x,y,r,c,a=0.25) => { g.fillStyle(c,a); g.fillCircle(x,y,r); };
    // Helper for shine line
    const shine = (g,x,y,w,h,c=0xFFFFFF,a=0.35) => { g.fillStyle(c,a); g.fillRoundedRect(x,y,w,h,1); };

    const items = [
      // ===== SWORDS =====
      { key: 'icon_wooden_sword', draw: g => {
        // Shadow
        g.fillStyle(0x000000, 0.2); g.fillRect(30, 6, 8, 38);
        // Blade
        g.fillStyle(0x7a3a10); g.fillRoundedRect(24, 2, 14, 34, 3);
        g.fillStyle(0x8B4513); g.fillRoundedRect(26, 4, 10, 30, 2);
        g.fillStyle(0xA07040); g.fillRect(28, 6, 4, 18); // shine
        // Tip
        g.fillStyle(0x7a3a10); g.fillTriangle(31, 0, 24, 6, 38, 6);
        // Guard
        g.fillStyle(0x4a2a0a); g.fillRoundedRect(16, 34, 30, 7, 2);
        g.fillStyle(0xDAA520); g.fillRect(18, 35, 26, 5);
        g.fillStyle(0xFFD700); g.fillRect(28, 36, 6, 3);
        // Handle
        g.fillStyle(0x8B6914); g.fillRoundedRect(26, 41, 10, 14, 2);
        g.fillStyle(0xAA8930); g.fillRect(28, 43, 6, 10);
        g.lineStyle(1, 0x6a4a0a); g.lineBetween(28, 45, 28, 53); g.lineBetween(34, 45, 34, 53);
        // Pommel
        g.fillStyle(0xB8860B); g.fillCircle(31, 57, 4);
        g.fillStyle(0xDAA520); g.fillCircle(31, 57, 2);
      }, px: [
        '...............*w.................',
        '..............*Bw.................',
        '..............*Bw.................',
        '.............*BBw.................',
        '.............*BBw.................',
        '............*BBBw.................',
        '............*BBBw.................',
        '...........*BBBBw.................',
        '...........*BBBBw.................',
        '..........*BBBBBw.................',
        '..........*BBBBBw.................',
        '.........*BBBBBBw.................',
        '.........*BBBBBBw.................',
        '........*BBBBBBBw.................',
        '........*BBBBBBBw.................',
        '.......dGGGGGGGGGGGd.............',
        '........dGYYYYYYYGd..............',
        '.........dYYYYYYYd...............',
        '.........dhHHHHHhd...............',
        '.........dhHHHHHhd...............',
        '.........dhHHHHHhd...............',
        '.........dhHHHHHhd...............',
        '.........dhHHHHHhd...............',
        '.........dhHHHHHhd...............',
        '.........dhHHHHHhd...............',
        '..........dhHHHhd................',
        '..........dhHHHhd................',
        '...........dPPPd.................',
        '...........dPPPd.................',
        '............dPd..................',
        '............dYd..................',
        '.................................',
      ], pal: {'.':0,'*':0x6a3010,'B':0x8B4513,'w':0xA07040,'G':0x654321,'d':0x4a2a0a,'Y':0xDAA520,'h':0xAA8855,'H':0xDEB887,'P':0xB8860B}},
      { key: 'icon_iron_sword', draw: g=>{}, px: [
        '.......WE.......',
        '......dWE.......',
        '......dSE.......',
        '......dSE.......',
        '......dSE.......',
        '......dSE.......',
        '......dSE.......',
        '......dSE.......',
        '..dGGGSSGGGd....',
        '...dGgSgGGd.....',
        '....dbBBBbd.....',
        '....dbBBBbd.....',
        '....dbBBBbd.....',
        '....dbBBBbd.....',
        '.....dSSd.......',
        '......Ss........',
      ], pal: {'.':0,'d':0x606060,'S':0x909090,'W':0xD0D0D0,'E':0xE8E8E8,'G':0x707080,'g':0x888898,'b':0x5a3a0a,'B':0x8B6914}},
      { key: 'icon_steel_sword', draw: g=>{}, px: [
        '.......EW.......',
        '......EWW.......',
        '......ESW.......',
        '......ESW.......',
        '......ESW.......',
        '......ESW.......',
        '......ESW.......',
        '......ESW.......',
        '..YGGGsssGGGY...',
        '...YYGYYYYGYY...',
        '.....+ddd+......',
        '.....+ddd+......',
        '.....+ddd+......',
        '.....+ddd+......',
        '.....YYYYY......',
        '......YFY.......',
      ], pal: {'.':0,'E':0xE0E0E0,'W':0xFFFFFF,'S':0xC0C0C0,'s':0xA0A0B0,'G':0x808090,'Y':0xDAA520,'F':0xFFD700,'d':0x5a3a1a,'+':0x3a1a0a}},
      { key: 'icon_fire_sword', draw: g=>{}, px: [
        '...y.FYF.y......',
        '...yf.Y.fy......',
        '....fFRFf.......',
        '....dFRFd.......',
        '....dFROd.......',
        '....dFROd.......',
        '....dFROd.......',
        '....dFROd.......',
        '.dGGGRRRGGGd....',
        '..dGFRRRFGd.....',
        '...d+DDD+d......',
        '...d+DDD+d......',
        '...d+DDD+d......',
        '...d+DDD+d......',
        '....dRRd........',
        '.....Ff.........',
      ], pal: {'.':0,'R':0xFF4500,'F':0xFF6600,'O':0xFF8C00,'Y':0xFFD700,'y':0xFFFF00,'f':0xFF8800,'G':0x707070,'d':0x4a4a4a,'D':0x2a0a00,'+':0x1a0a00}},
      // ===== ARMOR (chest piece with shoulders + belt) =====
      { key: 'icon_leather_armor', draw: g => {
        // Leather armor 64x64
        g.fillStyle(0x5a3a0a); g.fillRoundedRect(6, 8, 16, 14, 2); g.fillRoundedRect(42, 8, 16, 14, 2);
        g.fillStyle(0x7a5a1a); g.fillRoundedRect(8, 10, 12, 10, 1); g.fillRoundedRect(44, 10, 12, 10, 1);
        g.fillStyle(0x9a7a3a); g.fillRect(10, 12, 4, 4); g.fillRect(46, 12, 4, 4);
        g.fillStyle(0x5a3a0a); g.fillRoundedRect(20, 6, 24, 6, 2);
        g.fillStyle(0x7a5a1a); g.fillRect(22, 8, 20, 3);
        g.fillStyle(0x4a2a0a); g.fillRoundedRect(14, 18, 36, 32, 3);
        g.fillStyle(0x6a4a1a); g.fillRoundedRect(16, 20, 32, 28, 2);
        g.fillStyle(0x8B6914); g.fillRoundedRect(18, 22, 28, 14, 2);
        g.fillStyle(0xAA8930); g.fillRect(22, 24, 8, 6);
        g.lineStyle(1, 0x4a2a0a); g.lineBetween(32, 20, 32, 48);
        g.fillStyle(0x3a1a0a); g.fillRect(16, 42, 32, 5);
        g.fillStyle(0xDAA520); g.fillRect(28, 42, 8, 5);
        g.fillStyle(0x6a4a1a); g.fillRect(18, 47, 10, 6); g.fillRect(36, 47, 10, 6);
        g.lineStyle(1, 0x3a1a0a); g.strokeRoundedRect(14, 18, 36, 32, 3);
      }},
      { key: 'icon_iron_armor', draw: g => {
        // Detailed iron armor 64x64
        const cx = 32, cy = 32;
        // Shoulder pads
        g.fillStyle(0x606060); g.fillRoundedRect(6, 8, 18, 16, 3); g.fillRoundedRect(40, 8, 18, 16, 3);
        g.fillStyle(0x808080); g.fillRoundedRect(8, 10, 14, 12, 2); g.fillRoundedRect(42, 10, 14, 12, 2);
        g.fillStyle(0xA0A0A0); g.fillRect(10, 12, 6, 4); g.fillRect(44, 12, 6, 4);
        // Neck guard
        g.fillStyle(0x707070); g.fillRoundedRect(22, 6, 20, 8, 3);
        g.fillStyle(0x909090); g.fillRect(24, 8, 16, 4);
        // Main body
        g.fillStyle(0x505050); g.fillRoundedRect(14, 18, 36, 34, 4);
        g.fillStyle(0x707070); g.fillRoundedRect(16, 20, 32, 30, 3);
        g.fillStyle(0x909090); g.fillRoundedRect(18, 22, 28, 14, 2);
        // Chest highlight
        g.fillStyle(0xB0B0B0); g.fillRect(22, 24, 8, 8);
        g.fillStyle(0xD0D0D0); g.fillRect(24, 26, 4, 4);
        // Center line
        g.lineStyle(1, 0x505050); g.lineBetween(32, 20, 32, 50);
        // Belt
        g.fillStyle(0x404040); g.fillRect(16, 42, 32, 5);
        g.fillStyle(0xDAA520); g.fillRect(28, 42, 8, 5);
        g.fillStyle(0xFFD700); g.fillRect(30, 43, 4, 3);
        // Skirt
        g.fillStyle(0x606060); g.fillRect(18, 47, 12, 8); g.fillRect(34, 47, 12, 8);
        g.fillStyle(0x707070); g.fillRect(20, 48, 8, 6); g.fillRect(36, 48, 8, 6);
        // Rivets
        g.fillStyle(0xA0A0A0);
        g.fillCircle(18, 22, 1.5); g.fillCircle(46, 22, 1.5);
        g.fillCircle(18, 38, 1.5); g.fillCircle(46, 38, 1.5);
        // Edge outline
        g.lineStyle(1, 0x404040); g.strokeRoundedRect(14, 18, 36, 34, 4);
      }},
      { key: 'icon_steel_armor', draw: g => {
        g.fillStyle(0x808080); g.fillRoundedRect(6, 8, 18, 16, 3); g.fillRoundedRect(40, 8, 18, 16, 3);
        g.fillStyle(0xB0B0B0); g.fillRoundedRect(8, 10, 14, 12, 2); g.fillRoundedRect(42, 10, 14, 12, 2);
        g.fillStyle(0xD0D0D0); g.fillRect(10, 12, 6, 4); g.fillRect(44, 12, 6, 4);
        g.fillStyle(0x909090); g.fillRoundedRect(22, 6, 20, 8, 3);
        g.fillStyle(0xC0C0C0); g.fillRect(24, 8, 16, 4);
        g.fillStyle(0x707070); g.fillRoundedRect(14, 18, 36, 34, 4);
        g.fillStyle(0xA0A0A0); g.fillRoundedRect(16, 20, 32, 30, 3);
        g.fillStyle(0xC0C0C0); g.fillRoundedRect(18, 22, 28, 14, 2);
        g.fillStyle(0xE0E0E0); g.fillRect(22, 24, 8, 8);
        g.fillStyle(0xDAA520); g.fillCircle(32, 28, 4);
        g.fillStyle(0xFFD700); g.fillCircle(32, 28, 2);
        g.lineStyle(1, 0x606060); g.lineBetween(32, 20, 32, 50);
        g.fillStyle(0x606060); g.fillRect(16, 42, 32, 5);
        g.fillStyle(0xDAA520); g.fillRect(28, 42, 8, 5);
        g.fillStyle(0x808080); g.fillRect(18, 47, 12, 8); g.fillRect(34, 47, 12, 8);
        g.fillStyle(0xC0C0C0); g.fillCircle(18, 22, 2); g.fillCircle(46, 22, 2);
        g.lineStyle(1, 0x606060); g.strokeRoundedRect(14, 18, 36, 34, 4);
      }, px: [
        '................',
      ], pal: {'.':0,'G':0x707070,'W':0xB0B0B0,'E':0xE0E0E0,'D':0x808080,'Y':0xDAA520,'F':0xFFD700}},
      { key: 'icon_dragon_armor', draw: g => {
        g.fillStyle(0xFF4500, 0.12); g.fillCircle(32, 32, 28);
        g.fillStyle(0x5a0000); g.fillRoundedRect(6, 8, 18, 16, 3); g.fillRoundedRect(40, 8, 18, 16, 3);
        g.fillStyle(0x8B0000); g.fillRoundedRect(8, 10, 14, 12, 2); g.fillRoundedRect(42, 10, 14, 12, 2);
        g.fillStyle(0xAA2020); g.fillRect(10, 12, 6, 4); g.fillRect(44, 12, 6, 4);
        g.fillStyle(0x4a0000); g.fillRoundedRect(14, 18, 36, 34, 4);
        g.fillStyle(0x8B0000); g.fillRoundedRect(16, 20, 32, 30, 3);
        g.fillStyle(0xAA1111); g.fillRoundedRect(18, 22, 28, 14, 2);
        g.fillStyle(0xFF4500); g.fillCircle(32, 28, 5);
        g.fillStyle(0xFFD700); g.fillCircle(32, 28, 3);
        g.fillStyle(0xFFFF00, 0.4); g.fillCircle(32, 28, 1.5);
        g.lineStyle(1, 0x3a0000); g.lineBetween(32, 20, 32, 50);
        g.fillStyle(0x3a0000); g.fillRect(16, 42, 32, 5);
        g.fillStyle(0xFF4500); g.fillRect(28, 42, 8, 5);
        g.fillStyle(0x6a0000); g.fillRect(18, 47, 12, 8); g.fillRect(34, 47, 12, 8);
        g.lineStyle(1, 0x3a0000); g.strokeRoundedRect(14, 18, 36, 34, 4);
      }},
      // ===== POTIONS =====
      { key: 'icon_health_potion', draw: g=>{}, px: [
        '................................',
        '................................',
        '............cccccc..............',
        '...........cGGGGGGc.............',
        '...........cGGGGGGc.............',
        '...........cGGGGGGc.............',
        '..........DGGGGGGGGd...........',
        '.........DRRRRRRRRRD...........',
        '........DRRRhRRRRRRRD..........',
        '........DRRhhRRRRRRRD..........',
        '.......DRRhhhRRRRRRRRD.........',
        '.......DRRhh..+..RRRD.........',
        '.......DRRRR.+++.RRRD.........',
        '.......DRRR..+++..RRD.........',
        '.......DRRRR.+++.RRRD.........',
        '.......DRRhh..+..RRRD.........',
        '.......DRRhhhRRRRRRRRD.........',
        '........DRRhhRRRRRRRD..........',
        '........DRRRhRRRRRRRD..........',
        '.........DRRRRRRRRRD...........',
        '.........DRRRRRRRRRD...........',
        '..........DRRRRRRRRD...........',
        '..........DRRRRRRRD............',
        '...........DRRRRRRD............',
        '...........DRRRRRD.............',
        '............DDDDD..............',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
      ], pal: {'.':0,'D':0x770000,'R':0xBB0000,'h':0xFF3333,'+':0xFFEEEE,'c':0x909090,'G':0x707070}},
      { key: 'icon_big_health_potion', draw: g=>{}, px: [
        '....GGGGGG......',
        '....GccccG......',
        '...GGccccGG.....',
        '..GRRRRRRRRG....',
        '..GRRrrRRRRG....',
        '.GRRrrrRRRRRG...',
        '.GRRrr++RRRRG...',
        '.GRRRR+++RRRG...',
        '.GRRR++++RRRG...',
        '.GRRRR+++RRRG...',
        '.GRRrr++RRRRG...',
        '.GRRRRRRRRRRG...',
        '..GRRRRRRRRG....',
        '..GRRRRRRRRG....',
        '...GGGGGGGG.....',
        '................',
      ], pal: {'.':0,'G':0x660000,'R':0xBB0000,'r':0xFF2222,'+':0xFFFFFF,'c':0x808080}},
      { key: 'icon_strength_potion', draw: g=>{}, px: [
        '................',
        '.....GGGG.......',
        '.....GccG.......',
        '....GGccGG......',
        '....GOOOOG......',
        '...GOOoOOOG.....',
        '...GOoooOOG.....',
        '...GOo.+.OG.....',
        '...GOO+++OG.....',
        '...GOOo+OOG.....',
        '...GOOoOOOG.....',
        '...GOOOOOOG.....',
        '....GOOOOG......',
        '....GOOOOG......',
        '.....GGGG.......',
        '................',
      ], pal: {'.':0,'G':0xAA5500,'O':0xDD7700,'o':0xFFAA33,'+':0xFFFFFF,'c':0x808080}},
      { key: 'icon_defense_potion', draw: g=>{}, px: [
        '................',
        '.....GGGG.......',
        '.....GccG.......',
        '....GGccGG......',
        '....GBBBBG......',
        '...GBBbBBBG.....',
        '...GBbbbBBG.....',
        '...GBb..BBG.....',
        '...GBB.WWBG.....',
        '...GBBbWBBG.....',
        '...GBBbBBBG.....',
        '...GBBBBBBG.....',
        '....GBBBBG......',
        '....GBBBBG......',
        '.....GGGG.......',
        '................',
      ], pal: {'.':0,'G':0x1a3088,'B':0x3355BB,'b':0x5580DD,'W':0xFFFFFF,'c':0x808080}},
      { key: 'icon_mana_potion', draw: g=>{}, px: [
        '................',
        '......cc........',
        '.....cGGc.......',
        '.....cGGc.......',
        '....DGGGGD......',
        '...DMMhMMMD.....',
        '...DMhhMMMD.....',
        '...DMh.*MMD.....',
        '...DMM**MMD.....',
        '...DMMh*MMD.....',
        '...DMMhMMMD.....',
        '...DMMMMMMD.....',
        '....DMMMMD......',
        '....DMMMMD......',
        '.....DDDD.......',
        '................',
      ], pal: {'.':0,'D':0x2a1a6a,'M':0x5a4aAA,'h':0x8a7aDD,'*':0xDDCCFF,'c':0x909090,'G':0x707070}},
      { key: 'icon_big_mana_potion', draw: g=>{}, px: [
        '....GGGGGG......',
        '....GccccG......',
        '...GGccccGG.....',
        '..GMMMMMMMMG....',
        '..GMMmmMMMMG....',
        '.GMMmmmMMMMMG...',
        '.GMMmm**MMMMG...',
        '.GMMMM***MMMG...',
        '.GMMM****MMMG...',
        '.GMMMM***MMMG...',
        '.GMMmm**MMMMG...',
        '.GMMMMMMMMMMG...',
        '..GMMMMMMMMG....',
        '..GMMMMMMMMG....',
        '...GGGGGGGG.....',
        '................',
      ], pal: {'.':0,'G':0x2a1a6a,'M':0x5a4aAA,'m':0x8a7aDD,'*':0xc0b0ff,'c':0x808080}},
      // ===== MATERIALS =====
      { key: 'icon_wood', draw: g=>{}, px: [
        '................',
        '....DDDDDDDD....',
        '...DWWWWWWWD....',
        '...DWHHWWWWD....',
        '...DWWWWWWWD....',
        '...DDDDDDDDD...',
        '...DWWWWWWWD....',
        '...DWWWKWWWD....',
        '...DWWKKWWWD....',
        '...DWWWKWWWD....',
        '...DDDDDDDDD...',
        '...DWWWWWWWD....',
        '...DWWWWHHWD....',
        '...DWWWWWWWD....',
        '....DDDDDDDD....',
        '................',
      ], pal: {'.':0,'D':0x4a2a0a,'W':0x7a5a3a,'H':0x9a7a5a,'K':0x5a3a1a}},
      { key: 'icon_herb', draw: g=>{}, px: [
        '.......PP.......',
        '......PpP.......',
        '.....LLpLL......',
        '....LLLpLLL.....',
        '...LLlllLLL.....',
        '...LllFlllL.....',
        '....LllllLL.....',
        '.LLL.LlL.LLL...',
        'LllL..S..LllL...',
        'LlFL..S..LFlL...',
        '.LL...S...LL....',
        '......S.........',
        '......S.........',
        '.....SSS........',
        '....SSSSS.......',
        '................',
      ], pal: {'.':0,'S':0x2a6a1a,'L':0x228B22,'l':0x32CD32,'F':0xDA70D6,'P':0xFF69B4,'p':0xFFFF00}},
      { key: 'icon_stone', draw: g=>{}, px: [
        '................',
        '................',
        '................',
        '....DDDDDDD.....',
        '...DSSSSSSD.....',
        '..DSSHHSSSSd....',
        '..DSSHHSSSSSd...',
        '.DSSSSSSSSSSd...',
        '.DSSSSSSSSSd....',
        '.DSSSSSSSSd.....',
        '..DSSSSSSd......',
        '..DDDDDDDd......',
        '...ddddddd......',
        '................',
        '................',
        '................',
      ], pal: {'.':0,'D':0x505050,'S':0x707070,'H':0x909090,'d':0x383838}},
      { key: 'icon_crystal', draw: g=>{}, px: [
        '.......EE.......',
        '......EWWE......',
        '......EWCE......',
        '.....EWWCCE.....',
        '.....EWwCCE.....',
        '....EWWwCCCE....',
        '....EWwwCCCE....',
        '...EWWwwCCCCE...',
        '...EWwwwCCCCE...',
        '..EWWwwwCCCCCE..',
        '..EWwwwwCCCCCE..',
        '.EWWwwwwCCCCCCE.',
        '.EWwwwwwCCCCCCE.',
        '..DDDDDDDDDDD..',
        '...ddddddddd....',
        '................',
      ], pal: {'.':0,'E':0x006688,'W':0x40EEFF,'w':0x20CCDD,'C':0x0099BB,'D':0x005577,'d':0x003344}},
      { key: 'icon_monster_fang', draw: g=>{}, px: [
        '.......T........',
        '......TWT.......',
        '......TWT.......',
        '.....TWWT.......',
        '.....TWWT.......',
        '....TWWWT.......',
        '....TWWWT.......',
        '...TWWWWT.......',
        '...TWWWWT.......',
        '..TWWHWWT.......',
        '..TWWHWWT.......',
        '.TWWWWWWT.......',
        '.TTTRRTTTT......',
        '................',
        '................',
        '................',
      ], pal: {'.':0,'T':0xBBBBA0,'W':0xEEEED8,'H':0xFFFFFF,'R':0xAA3333}},
      { key: 'icon_dragon_scale', draw: g=>{}, px: [
        '................',
        '......DDD.......',
        '.....DRRRD......',
        '....DRRRRRD.....',
        '...DRRRFRRRD....',
        '..DRRRRFRRRD....',
        '..DRRRFFRRRd....',
        '.DRRRRFFRRRRd...',
        '.DRRRFFRRRRRd...',
        '.DRRRFRRRRRd....',
        '..DRRRRRRRd.....',
        '..DRRRRRRd......',
        '...DRRRRd.......',
        '....DDDDd.......',
        '.....dddd.......',
        '................',
      ], pal: {'.':0,'D':0x6a0000,'R':0xAA1111,'F':0xFF4500,'d':0x3a0000}},
      // ===== ACCESSORIES =====
      { key: 'icon_ring_strength', draw: g=>{}, px: [
        '......GGG.......',
        '.....G...G......',
        '....G.....G.....',
        '....G...........',
        '....G...........',
        '.....G..........',
        '.....G..........',
        '......G.........',
        '.....gYg........',
        '....gYRYg.......',
        '....gRrrRg......',
        '....gRrrRg......',
        '.....gRRg.......',
        '......gg........',
        '................',
        '................',
      ], pal: {'.':0,'G':0xB8860B,'Y':0xDAA520,'g':0x8a6a10,'R':0xCC0000,'r':0xFF4444}},
      { key: 'icon_ring_defense', draw: g=>{}, px: [
        '......GGG.......',
        '.....G...G......',
        '....G.....G.....',
        '....G...........',
        '....G...........',
        '.....G..........',
        '.....G..........',
        '......G.........',
        '.....gSg........',
        '....gSBSg.......',
        '....gBbbBg......',
        '....gBbbBg......',
        '.....gBBg.......',
        '......gg........',
        '................',
        '................',
      ], pal: {'.':0,'G':0x2a5a8a,'S':0x4682B4,'g':0x1a3a5a,'B':0x0088CC,'b':0x44BBFF}},
      { key: 'icon_maze_ring', draw: g=>{}, px: [
        '......GGG.......',
        '.....G...G......',
        '....G.....G.....',
        '....G...........',
        '....G...........',
        '.....G..........',
        '.....G..........',
        '......G.........',
        '.....gPg........',
        '....gPMPg.......',
        '....gMmmMg......',
        '....gMmmMg......',
        '.....gMMg.......',
        '......gg........',
        '................',
        '................',
      ], pal: {'.':0,'G':0x7B68EE,'P':0x9370DB,'g':0x4a2a8a,'M':0x8A2BE2,'m':0xBA55D3}},
      { key: 'icon_dark_ring', draw: g=>{}, px: [
        '......GGG.......',
        '.....G...G......',
        '....G.....G.....',
        '....G...........',
        '....G...........',
        '.....G..........',
        '.....G..........',
        '......G.........',
        '.....gDg........',
        '....gDPDg.......',
        '....gPppPg......',
        '....gPppPg......',
        '.....gPPg.......',
        '......gg........',
        '................',
        '................',
      ], pal: {'.':0,'G':0x1a0a2a,'D':0x2A0A3A,'g':0x0a0018,'P':0x4B0082,'p':0x6A0DAD}},
      { key: 'icon_duskhollow_ring', draw: g=>{}, px: [
        '......GGG.......',
        '.....G...G......',
        '....G.....G.....',
        '....G...........',
        '....G...........',
        '.....G..........',
        '.....G..........',
        '......G.........',
        '.....gEg........',
        '....gEPEg.......',
        '....gPppPg......',
        '....gPppPg......',
        '.....gPPg.......',
        '......gg........',
        '................',
        '................',
      ], pal: {'.':0,'G':0x8A2BE2,'E':0x9370DB,'g':0x3a0a6a,'P':0x6A0DAD,'p':0xAA55FF}},
      // ===== YÜZÜKLER (Ring) =====
      { key: 'icon_yuzuk_hp', draw: g=>{}, px: [
        '................',
        '......gggg......',
        '.....g.cc.g.....',
        '....g.cPPc.g....',
        '....g..cc..g....',
        '...R........R...',
        '...R........R...',
        '...R........R...',
        '...R........R...',
        '....R......R....',
        '....R......R....',
        '.....RRRRRR.....',
        '................',
        '................',
        '................',
        '................',
      ], pal: {'.':0,'R':0xB8860B,'g':0x8a6a10,'c':0xDC143C,'P':0xFF4466}},
      { key: 'icon_yuzuk_iron', draw: g=>{}, px: [
        '................',
        '......gggg......',
        '.....g.cc.g.....',
        '....g.cSSc.g....',
        '....g..cc..g....',
        '...M........M...',
        '...M........M...',
        '...M........M...',
        '...M........M...',
        '....M......M....',
        '....M......M....',
        '.....MMMMMM.....',
        '................',
        '................',
        '................',
        '................',
      ], pal: {'.':0,'M':0x808080,'g':0x555555,'c':0xA0A0A0,'S':0xCCCCCC}},
      { key: 'icon_yuzuk_steel', draw: g=>{}, px: [
        '................',
        '......gggg......',
        '.....g.cc.g.....',
        '....g.cBBc.g....',
        '....g..cc..g....',
        '...S........S...',
        '...S........S...',
        '...S........S...',
        '...S........S...',
        '....S......S....',
        '....S......S....',
        '.....SSSSSS.....',
        '................',
        '................',
        '................',
        '................',
      ], pal: {'.':0,'S':0xC0C0C0,'g':0x888888,'c':0xB0B0B0,'B':0xE0E0E0}},
      { key: 'icon_yuzuk_dragon', draw: g=>{}, px: [
        '................',
        '......gggg......',
        '.....g.cc.g.....',
        '....g.cFFc.g....',
        '....g..cc..g....',
        '...D........D...',
        '...D........D...',
        '...D........D...',
        '...D........D...',
        '....D......D....',
        '....D......D....',
        '.....DDDDDD.....',
        '................',
        '................',
        '................',
        '................',
      ], pal: {'.':0,'D':0x8B0000,'g':0x5a0000,'c':0xAA2200,'F':0xFF4500}},
      { key: 'icon_yuzuk_mythril', draw: g=>{}, px: [
        '................',
        '......gggg......',
        '.....g.cc.g.....',
        '....g.cBBc.g....',
        '....g..cc..g....',
        '...M........M...',
        '...M........M...',
        '...M........M...',
        '...M........M...',
        '....M......M....',
        '....M......M....',
        '.....MMMMMM.....',
        '................',
        '................',
        '................',
        '................',
      ], pal: {'.':0,'M':0x7EC8E3,'g':0x4a8aaa,'c':0x6AB8D3,'B':0xAAE8FF}},
      { key: 'icon_yuzuk_abyssal', draw: g=>{}, px: [
        '................',
        '......gggg......',
        '.....g.cc.g.....',
        '....g.cDDc.g....',
        '....g..cc..g....',
        '...A........A...',
        '...A........A...',
        '...A........A...',
        '...A........A...',
        '....A......A....',
        '....A......A....',
        '.....AAAAAA.....',
        '................',
        '................',
        '................',
        '................',
      ], pal: {'.':0,'A':0x4A0028,'g':0x2a0018,'c':0x3A0020,'D':0x6A0048}},
      { key: 'icon_yuzuk_duskhollow', draw: g=>{}, px: [
        '................',
        '......gggg......',
        '.....g.cc.g.....',
        '....g.cPPc.g....',
        '....g..cc..g....',
        '...E........E...',
        '...E........E...',
        '...E........E...',
        '...E........E...',
        '....E......E....',
        '....E......E....',
        '.....EEEEEE.....',
        '................',
        '................',
        '................',
        '................',
      ], pal: {'.':0,'E':0x6A0DAD,'g':0x3a0a6a,'c':0x5A0D9D,'P':0xAA55FF}},
      { key: 'icon_amulet_hp', draw: g=>{}, px: [
        '..GGGGGGGGGGGG..',
        '..G..........G..',
        '...G..gggg..G...',
        '...G.gggggg.G...',
        '....GgRRRRgG....',
        '....gRRrRRRg....',
        '....gRrrrRRg....',
        '....gRRrRRRg....',
        '.....gRRRRg.....',
        '.....gRRRRg.....',
        '......gRRg......',
        '......gRRg......',
        '.......gRg......',
        '.......gRg......',
        '........g.......',
        '................',
      ], pal: {'.':0,'G':0xA0A0A0,'g':0x880020,'R':0xCC1030,'r':0xFF5060}},
      // ===== STAVES =====
      { key: 'icon_wooden_staff', draw: g=>{}, px: [
        '......PPP.......',
        '.....PpppP......',
        '.....PpWpP......',
        '......PpP.......',
        '......WBW.......',
        '.......B........',
        '.......B........',
        '.......BH.......',
        '.......B........',
        '.......B........',
        '.......BH.......',
        '.......B........',
        '.......B........',
        '.......B........',
        '......BBB.......',
        '................',
      ], pal: {'.':0,'B':0x8B4513,'H':0xA07040,'P':0x6a3aAA,'p':0x8a5aCa,'W':0xc0a0ff}},
      { key: 'icon_crystal_staff', draw: g=>{}, px: [
        '.....CCCC.......',
        '....CCccCC......',
        '....CcWWcC......',
        '.....CccC.......',
        '......WBW.......',
        '.......B........',
        '.......B........',
        '.......BH.......',
        '.......B........',
        '.......B........',
        '.......BH.......',
        '.......B........',
        '.......B........',
        '.......B........',
        '......BBB.......',
        '................',
      ], pal: {'.':0,'B':0x5a4a3a,'H':0x6a5a4a,'C':0x0088BB,'c':0x00BBEE,'W':0x88EEFF}},
      { key: 'icon_shadow_staff', draw: g=>{}, px: [
        '.....SSSS.......',
        '....SSssSSS.....',
        '....SsWWsSS.....',
        '.....SssS.......',
        '......WBW.......',
        '.......B........',
        '.......B........',
        '.......BH.......',
        '.......B........',
        '.......B........',
        '.......BH.......',
        '.......B........',
        '.......B........',
        '.......B........',
        '......BBB.......',
        '................',
      ], pal: {'.':0,'B':0x2a1a3a,'H':0x3a2a4a,'S':0x5a0a9a,'s':0x8a3aea,'W':0xc080ff}},
      // ===== BOWS =====
      { key: 'icon_wooden_bow', draw: g=>{}, px: [
        '.....B..........',
        '....BB..........',
        '...BB...........',
        '..BBH..S........',
        '..BH...S........',
        '.BB....S........',
        '.BH....S........',
        '.B.....SAAAT....',
        '.BH....S........',
        '.BB....S........',
        '..BH...S........',
        '..BBH..S........',
        '...BB...........',
        '....BB..........',
        '.....B..........',
        '................',
      ], pal: {'.':0,'B':0x7a5510,'H':0x9a7530,'S':0xDEB887,'A':0x8B4513,'T':0xA0A0A0}},
      { key: 'icon_hunter_bow', draw: g=>{}, px: [
        '.....B..........',
        '....BBM.........',
        '...BB...........',
        '..BBH..S........',
        '..BH...S........',
        '.BB....S........',
        '.BH....S........',
        '.B.....SAAATT...',
        '.BH....S........',
        '.BB....S........',
        '..BH...S........',
        '..BBH..S........',
        '...BB...........',
        '....BBM.........',
        '.....B..........',
        '................',
      ], pal: {'.':0,'B':0x554321,'H':0x705030,'S':0xCCCCCC,'A':0x654321,'T':0xC0C0C0,'M':0x808080}},
      { key: 'icon_shadow_bow', draw: g=>{}, px: [
        '.....P..........',
        '....PPG.........',
        '...PP...........',
        '..PPH..S........',
        '..PH...S........',
        '.PP....S........',
        '.PH....S........',
        '.P.....SAAAWW...',
        '.PH....S........',
        '.PP....S........',
        '..PH...S........',
        '..PPH..S........',
        '...PP...........',
        '....PPG.........',
        '.....P..........',
        '................',
      ], pal: {'.':0,'P':0x2a0a3a,'H':0x4a1a6a,'S':0x8a2aea,'A':0x3a1a4a,'W':0xAA50FF,'G':0x8a2aCC}},
      // ===== HELMS =====
      // ===== HELMS (proper helmet shape) =====
      // ===== ALL EQUIPMENT: 64x64 Phaser Graphics =====
      { key: 'icon_leather_helm', draw: g => {
        // Dome shape
        g.fillStyle(0x5a3a0a); g.fillRoundedRect(10, 10, 44, 36, 14);
        g.fillStyle(0x7a5a1a); g.fillRoundedRect(12, 12, 40, 32, 12);
        g.fillStyle(0x8B6914); g.fillRoundedRect(14, 14, 36, 20, 10);
        g.fillStyle(0xAA8930); g.fillRect(18, 18, 12, 8);
        // Brim
        g.fillStyle(0x5a3a0a); g.fillRect(8, 40, 48, 6);
        g.fillStyle(0x6a4a1a); g.fillRect(10, 41, 44, 4);
        // Cheek guards
        g.fillStyle(0x6a4a1a); g.fillRoundedRect(8, 40, 12, 16, 2); g.fillRoundedRect(44, 40, 12, 16, 2);
        // Stitching
        g.lineStyle(1, 0x4a2a0a); g.lineBetween(32, 12, 32, 40);
        g.lineStyle(1, 0x4a2a0a); g.strokeRoundedRect(10, 10, 44, 36, 14);
      }, px: [
        '................',
        '.....DDDDD......',
        '....DLLLLLD.....',
        '...DLLLHLLLD....',
        '...DLLHHHLLLD...',
        '..DLLLLLLLLLD...',
        '..DLLLLLLLLLLD..',
        '..DLLLLLLLLLD...',
        '..DD.DDDDD.DD..',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
      ], pal: {'.':0,'D':0x5a3a0a,'L':0x8B6914,'H':0xAA8930}},
      { key: 'icon_iron_helm', draw: g => {
        g.fillStyle(0x505050); g.fillRoundedRect(10, 10, 44, 36, 14);
        g.fillStyle(0x707070); g.fillRoundedRect(12, 12, 40, 32, 12);
        g.fillStyle(0x909090); g.fillRoundedRect(14, 14, 36, 20, 10);
        g.fillStyle(0xC0C0C0); g.fillRect(18, 18, 10, 6);
        g.fillStyle(0x505050); g.fillRect(8, 40, 48, 6);
        g.fillStyle(0x606060); g.fillRect(10, 41, 44, 4);
        g.fillStyle(0x606060); g.fillRoundedRect(8, 40, 12, 16, 2); g.fillRoundedRect(44, 40, 12, 16, 2);
        // Nose guard
        g.fillStyle(0x707070); g.fillRect(29, 38, 6, 12);
        g.fillStyle(0x808080); g.fillRect(30, 39, 4, 10);
        // Rivets
        g.fillStyle(0xA0A0A0); g.fillCircle(16, 30, 2); g.fillCircle(48, 30, 2);
        g.lineStyle(1, 0x404040); g.strokeRoundedRect(10, 10, 44, 36, 14);
      }, px: [
        '................',
        '.....GGGGG......',
        '....GSSSSSG.....',
        '...GSSWWSSSG....',
        '...GSSWWWSSG....',
        '..GSSSSSSSSSG...',
        '..GSSSSSSSSSSG..',
        '..GSSSSSSSSSG...',
        '..GG.GGGGG.GG..',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
      ], pal: {'.':0,'G':0x505050,'S':0x808080,'W':0xC0C0C0}},
      { key: 'icon_steel_helm', draw: g => {
        // Crown crest
        g.fillStyle(0xDAA520); g.fillTriangle(32, 2, 28, 12, 36, 12);
        g.fillStyle(0xFFD700); g.fillCircle(32, 8, 2);
        g.fillStyle(0x707070); g.fillRoundedRect(10, 10, 44, 36, 14);
        g.fillStyle(0xA0A0A0); g.fillRoundedRect(12, 12, 40, 32, 12);
        g.fillStyle(0xC0C0C0); g.fillRoundedRect(14, 14, 36, 20, 10);
        g.fillStyle(0xE0E0E0); g.fillRect(18, 18, 8, 6);
        g.fillStyle(0x707070); g.fillRect(8, 40, 48, 6);
        g.fillStyle(0x808080); g.fillRect(10, 41, 44, 4);
        g.fillStyle(0x808080); g.fillRoundedRect(8, 40, 12, 16, 2); g.fillRoundedRect(44, 40, 12, 16, 2);
        g.fillStyle(0x909090); g.fillRect(29, 38, 6, 12);
        g.fillStyle(0xDAA520); g.fillCircle(32, 32, 3); g.fillStyle(0xFFD700); g.fillCircle(32, 32, 1.5);
        g.fillStyle(0xC0C0C0); g.fillCircle(16, 30, 2); g.fillCircle(48, 30, 2);
        g.lineStyle(1, 0x606060); g.strokeRoundedRect(10, 10, 44, 36, 14);
      }, px: [
        '......YYY.......',
        '.....GGGGG......',
        '....GWWWWWG.....',
        '...GWWEEWWWG....',
        '...GWWWWWWWG....',
        '..GWWWWWWWWWG...',
        '..GWWWWYWWWWG...',
        '..GWWWWWWWWWG...',
        '..GG.GGGGG.GG..',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
      ], pal: {'.':0,'G':0x707070,'W':0xC0C0C0,'E':0xE8E8E8,'Y':0xDAA520}},
      { key: 'icon_dragon_helm', draw: g => {
        g.fillStyle(0xFF4500, 0.1); g.fillCircle(32, 28, 26);
        // Horns
        g.fillStyle(0x4a0000); g.fillTriangle(12, 16, 6, 2, 16, 12);
        g.fillTriangle(52, 16, 48, 12, 58, 2);
        g.fillStyle(0x6a0000); g.fillTriangle(13, 15, 8, 4, 15, 13);
        g.fillTriangle(51, 15, 49, 13, 56, 4);
        g.fillStyle(0x4a0000); g.fillRoundedRect(10, 10, 44, 36, 14);
        g.fillStyle(0x7a0000); g.fillRoundedRect(12, 12, 40, 32, 12);
        g.fillStyle(0x8B0000); g.fillRoundedRect(14, 14, 36, 20, 10);
        g.fillStyle(0xAA2020); g.fillRect(18, 18, 8, 6);
        g.fillStyle(0x4a0000); g.fillRect(8, 40, 48, 6);
        g.fillStyle(0x5a0000); g.fillRoundedRect(8, 40, 12, 16, 2); g.fillRoundedRect(44, 40, 12, 16, 2);
        g.fillStyle(0xFF4500); g.fillCircle(32, 28, 4); g.fillStyle(0xFFD700); g.fillCircle(32, 28, 2);
        g.lineStyle(1, 0x3a0000); g.strokeRoundedRect(10, 10, 44, 36, 14);
      }, px: [
        '.HH.......HH...',
        '..HD.DDD.DH.....',
        '...DDDDDDD......',
        '...DRRRRRRRD....',
        '..DRRFFRRRRD....',
        '..DRRRRRRRRRRD..',
        '..DRRRRYRRRRD...',
        '..DRRRRRRRRRD...',
        '..DD.DDDDD.DD..',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
      ], pal: {'.':0,'D':0x4a0000,'R':0x8B0000,'F':0xFF4500,'Y':0xFFD700,'H':0x6a0000}},
      // ===== PANTS =====
      { key: 'icon_leather_pants', draw: g => {
        g.fillStyle(0x4a2a0a); g.fillRect(12, 6, 40, 8); // belt
        g.fillStyle(0xDAA520); g.fillRect(28, 6, 8, 8); g.fillStyle(0xFFD700); g.fillRect(30, 8, 4, 4);
        g.fillStyle(0x5a3a0a); g.fillRoundedRect(12, 14, 40, 12, 2);
        g.fillStyle(0x6a4a1a); g.fillRect(14, 16, 36, 8);
        g.fillStyle(0x8B6914); g.fillRect(18, 18, 10, 4);
        // Legs
        g.fillStyle(0x5a3a0a); g.fillRoundedRect(12, 24, 18, 32, 2); g.fillRoundedRect(34, 24, 18, 32, 2);
        g.fillStyle(0x6a4a1a); g.fillRoundedRect(14, 26, 14, 28, 1); g.fillRoundedRect(36, 26, 14, 28, 1);
        g.fillStyle(0x7a5a2a); g.fillRect(16, 28, 6, 8); g.fillRect(38, 28, 6, 8);
        g.lineStyle(1, 0x4a2a0a); g.lineBetween(31, 14, 31, 26);
      }, px: [
        '................',
        '..DDDDDDDDDDD..',
        '..DBYYYYYYBBD...',
        '..DLLLLLLLLD....',
        '..DLHLLLLLHLD...',
        '..DLLL..LLLD....',
        '..DLL....LLD....',
        '..DLL....LLD....',
        '..DLL....LLD....',
        '..DLL....LLD....',
        '..DDL....LDD....',
        '..DD......DD....',
        '................',
        '................',
        '................',
        '................',
      ], pal: {'.':0,'D':0x5a3a0a,'L':0x8B6914,'H':0xAA8930,'B':0x4a2a0a,'Y':0xDAA520}},
      { key: 'icon_iron_pants', draw: g => {
        g.fillStyle(0x404040); g.fillRect(12, 6, 40, 8);
        g.fillStyle(0xDAA520); g.fillRect(28, 6, 8, 8);
        g.fillStyle(0x505050); g.fillRoundedRect(12, 14, 40, 12, 2);
        g.fillStyle(0x707070); g.fillRect(14, 16, 36, 8);
        g.fillStyle(0xA0A0A0); g.fillRect(18, 18, 8, 4);
        g.fillStyle(0x505050); g.fillRoundedRect(12, 24, 18, 32, 2); g.fillRoundedRect(34, 24, 18, 32, 2);
        g.fillStyle(0x707070); g.fillRoundedRect(14, 26, 14, 28, 1); g.fillRoundedRect(36, 26, 14, 28, 1);
        g.fillStyle(0x909090); g.fillRect(16, 30, 4, 4); g.fillRect(38, 30, 4, 4);
        g.fillStyle(0xA0A0A0); g.fillCircle(20, 36, 1.5); g.fillCircle(42, 36, 1.5);
        g.lineStyle(1, 0x404040); g.lineBetween(31, 14, 31, 26);
      }, px: [
        '................',
        '..GGGGGGGGGGG...',
        '..GBBBBBBBBG....',
        '..GSSSSSSSG.....',
        '..GSWSSSSWSG....',
        '..GSSS..SSSG....',
        '..GSS....SSG....',
        '..GSS....SSG....',
        '..GSS....SSG....',
        '..GSS....SSG....',
        '..GGS....SGG....',
        '..GG......GG....',
        '................',
        '................',
        '................',
        '................',
      ], pal: {'.':0,'G':0x505050,'S':0x808080,'W':0xC0C0C0,'B':0x404040}},
      { key: 'icon_steel_pants', draw: g => {
        g.fillStyle(0x606060); g.fillRect(12, 6, 40, 8);
        g.fillStyle(0xDAA520); g.fillRect(28, 6, 8, 8); g.fillStyle(0xFFD700); g.fillRect(30, 8, 4, 4);
        g.fillStyle(0x707070); g.fillRoundedRect(12, 14, 40, 12, 2);
        g.fillStyle(0xA0A0A0); g.fillRect(14, 16, 36, 8);
        g.fillStyle(0xD0D0D0); g.fillRect(18, 18, 6, 4);
        g.fillStyle(0x707070); g.fillRoundedRect(12, 24, 18, 32, 2); g.fillRoundedRect(34, 24, 18, 32, 2);
        g.fillStyle(0xA0A0A0); g.fillRoundedRect(14, 26, 14, 28, 1); g.fillRoundedRect(36, 26, 14, 28, 1);
        g.fillStyle(0xC0C0C0); g.fillRect(16, 30, 4, 4); g.fillRect(38, 30, 4, 4);
        g.lineStyle(1, 0x606060); g.lineBetween(31, 14, 31, 26);
      }, px: [
        '................',
        '..GGGGGGGGGGG...',
        '..GDDDDDDDDG...',
        '..GWWWWWWWWG....',
        '..GWEWWWWEWG....',
        '..GWWW..WWWG....',
        '..GWW....WWG....',
        '..GWW....WWG....',
        '..GGW....WGG....',
        '..GG......GG....',
        '................',
        '................',
        '................',
        '................',
      ], pal: {'.':0,'G':0x707070,'W':0xC0C0C0,'E':0xE8E8E8,'D':0x808080}},
      // ===== GLOVES (gauntlet shape) =====
      { key: 'icon_leather_gloves', draw: g => {
        // Left glove
        g.fillStyle(0x5a3a0a); g.fillRoundedRect(4, 14, 22, 36, 4);
        g.fillStyle(0x6a4a1a); g.fillRoundedRect(6, 16, 18, 32, 3);
        g.fillStyle(0x8B6914); g.fillRect(8, 20, 8, 6);
        g.fillStyle(0x5a3a0a); g.fillRect(4, 14, 22, 6); // cuff
        g.fillStyle(0x7a5a2a); g.fillRect(6, 15, 18, 4);
        // Fingers
        g.fillStyle(0x6a4a1a); g.fillRoundedRect(6, 44, 5, 8, 2); g.fillRoundedRect(12, 44, 5, 10, 2); g.fillRoundedRect(18, 44, 5, 8, 2);
        // Right glove
        g.fillStyle(0x5a3a0a); g.fillRoundedRect(38, 14, 22, 36, 4);
        g.fillStyle(0x6a4a1a); g.fillRoundedRect(40, 16, 18, 32, 3);
        g.fillStyle(0x8B6914); g.fillRect(42, 20, 8, 6);
        g.fillStyle(0x5a3a0a); g.fillRect(38, 14, 22, 6);
        g.fillStyle(0x7a5a2a); g.fillRect(40, 15, 18, 4);
        g.fillStyle(0x6a4a1a); g.fillRoundedRect(40, 44, 5, 8, 2); g.fillRoundedRect(46, 44, 5, 10, 2); g.fillRoundedRect(52, 44, 5, 8, 2);
      }, px: [
        '................',
        '..DDD....DDD....',
        '.DLLLD..DLLLD...',
        '.DLHLD..DLHLD...',
        '.DLLLD..DLLLD...',
        '.DLLLD..DLLLD...',
        '.DLLD....DLLD...',
        '..DLD....DLD....',
        '..DDD....DDD....',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
      ], pal: {'.':0,'D':0x5a3a0a,'L':0x8B6914,'H':0xAA8930}},
      { key: 'icon_iron_gloves', draw: g => {
        [4, 38].forEach(ox => {
          g.fillStyle(0x505050); g.fillRoundedRect(ox, 14, 22, 36, 4);
          g.fillStyle(0x707070); g.fillRoundedRect(ox+2, 16, 18, 32, 3);
          g.fillStyle(0xA0A0A0); g.fillRect(ox+4, 20, 6, 5);
          g.fillStyle(0x505050); g.fillRect(ox, 14, 22, 6);
          g.fillStyle(0x808080); g.fillRect(ox+2, 15, 18, 4);
          g.fillStyle(0x707070); g.fillRoundedRect(ox+2, 44, 5, 8, 2); g.fillRoundedRect(ox+8, 44, 5, 10, 2); g.fillRoundedRect(ox+14, 44, 5, 8, 2);
          g.fillStyle(0xA0A0A0); g.fillCircle(ox+11, 30, 2);
        });
      }, px: [
        '................',
        '..GGG....GGG....',
        '.GSSSG..GSSSG...',
        '.GSWSG..GSWSG...',
        '.GSSSG..GSSSG...',
        '.GSSSG..GSSSG...',
        '.GSSG....GSSG...',
        '..GSG....GSG....',
        '..GGG....GGG....',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
      ], pal: {'.':0,'G':0x505050,'S':0x808080,'W':0xC0C0C0}},
      { key: 'icon_steel_gloves', draw: g => {
        [4, 38].forEach(ox => {
          g.fillStyle(0x707070); g.fillRoundedRect(ox, 14, 22, 36, 4);
          g.fillStyle(0xA0A0A0); g.fillRoundedRect(ox+2, 16, 18, 32, 3);
          g.fillStyle(0xD0D0D0); g.fillRect(ox+4, 20, 6, 5);
          g.fillStyle(0x707070); g.fillRect(ox, 14, 22, 6);
          g.fillStyle(0xB0B0B0); g.fillRect(ox+2, 15, 18, 4);
          g.fillStyle(0xA0A0A0); g.fillRoundedRect(ox+2, 44, 5, 8, 2); g.fillRoundedRect(ox+8, 44, 5, 10, 2); g.fillRoundedRect(ox+14, 44, 5, 8, 2);
          g.fillStyle(0xC0C0C0); g.fillCircle(ox+11, 30, 2);
        });
      }, px: [
        '................',
        '..GGG....GGG....',
        '.GWWWG..GWWWG...',
        '.GWEWG..GWEWG...',
        '.GWWWG..GWWWG...',
        '.GWWWG..GWWWG...',
        '.GWWG....GWWG...',
        '..GWG....GWG....',
        '..GGG....GGG....',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
      ], pal: {'.':0,'G':0x707070,'W':0xC0C0C0,'E':0xE8E8E8}},
      // ===== BELTS =====
      { key: 'icon_leather_belt', draw: g => {
        g.fillStyle(0x4a2a0a); g.fillRoundedRect(4, 22, 56, 20, 4);
        g.fillStyle(0x6a4a1a); g.fillRoundedRect(6, 24, 52, 16, 3);
        g.fillStyle(0x7a5a2a); g.fillRect(8, 26, 20, 12);
        g.fillStyle(0xDAA520); g.fillRoundedRect(26, 24, 12, 16, 3);
        g.fillStyle(0xFFD700); g.fillRoundedRect(28, 26, 8, 12, 2);
        g.fillStyle(0xDAA520); g.fillCircle(32, 32, 2);
        // Holes
        g.fillStyle(0x3a1a0a); g.fillCircle(14, 32, 2); g.fillCircle(20, 32, 2);
        g.lineStyle(1, 0x3a1a0a); g.strokeRoundedRect(4, 22, 56, 20, 4);
      }, px: [
        '................',
        '................',
        '................',
        '................',
        '................',
        '.DDDDDDDDDDDDD.',
        '.DLLLLLYLLLLLLD.',
        '.DDDDDDDDDDDDD.',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
      ], pal: {'.':0,'D':0x654321,'L':0x8B6914,'Y':0xDAA520}},
      { key: 'icon_iron_belt', draw: g => {
        g.fillStyle(0x404040); g.fillRoundedRect(4, 22, 56, 20, 4);
        g.fillStyle(0x606060); g.fillRoundedRect(6, 24, 52, 16, 3);
        g.fillStyle(0x808080); g.fillRect(8, 26, 18, 12);
        g.fillStyle(0xDAA520); g.fillRoundedRect(26, 24, 12, 16, 3);
        g.fillStyle(0xFFD700); g.fillRoundedRect(28, 26, 8, 12, 2);
        g.fillStyle(0xA0A0A0); g.fillCircle(14, 32, 2); g.fillCircle(20, 32, 2);
        g.lineStyle(1, 0x303030); g.strokeRoundedRect(4, 22, 56, 20, 4);
      }, px: [
        '................',
        '................',
        '................',
        '................',
        '................',
        '.DDDDDDDDDDDDD.',
        '.DSSSSSYSSSSSD..',
        '.DDDDDDDDDDDDD.',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
      ], pal: {'.':0,'D':0x505050,'S':0x808080,'Y':0xDAA520}},
      { key: 'icon_steel_belt', draw: g => {
        g.fillStyle(0x606060); g.fillRoundedRect(4, 22, 56, 20, 4);
        g.fillStyle(0x909090); g.fillRoundedRect(6, 24, 52, 16, 3);
        g.fillStyle(0xB0B0B0); g.fillRect(8, 26, 18, 12);
        g.fillStyle(0xDAA520); g.fillRoundedRect(26, 24, 12, 16, 3);
        g.fillStyle(0xFFD700); g.fillRoundedRect(28, 26, 8, 12, 2);
        g.fillStyle(0xFFD700); g.fillCircle(32, 32, 2);
        g.fillStyle(0xC0C0C0); g.fillCircle(14, 32, 2); g.fillCircle(20, 32, 2);
        g.lineStyle(1, 0x505050); g.strokeRoundedRect(4, 22, 56, 20, 4);
      }, px: [
        '................',
        '................',
        '................',
        '................',
        '................',
        '.DDDDDDDDDDDDD.',
        '.DWWWWWYWWWWWD..',
        '.DDDDDDDDDDDDD.',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
      ], pal: {'.':0,'D':0x707070,'W':0xC0C0C0,'Y':0xFFD700}},
      // ===== DRAGON SET =====
      { key: 'icon_dragon_pants', draw: g => {
        g.fillStyle(0xFF4500, 0.08); g.fillCircle(32, 32, 26);
        g.fillStyle(0x3a0000); g.fillRect(12, 6, 40, 8);
        g.fillStyle(0xFF4500); g.fillRect(28, 6, 8, 8);
        g.fillStyle(0x4a0000); g.fillRoundedRect(12, 14, 40, 12, 2);
        g.fillStyle(0x7a0000); g.fillRect(14, 16, 36, 8);
        g.fillStyle(0xAA2020); g.fillRect(18, 18, 8, 4);
        g.fillStyle(0x4a0000); g.fillRoundedRect(12, 24, 18, 32, 2); g.fillRoundedRect(34, 24, 18, 32, 2);
        g.fillStyle(0x7a0000); g.fillRoundedRect(14, 26, 14, 28, 1); g.fillRoundedRect(36, 26, 14, 28, 1);
        g.lineStyle(1, 0x3a0000); g.lineBetween(31, 14, 31, 26);
      }, px: [
        '................',
        '...DDDDDDD......',
        '...DRRRRRRD.....',
        '...DRFFRRD......',
        '...DRRRRRD......',
        '...DRR..RRD.....',
        '...DRR..RRD.....',
        '...DRR..RRD.....',
        '...DRR..RRD.....',
        '...DDR..RDD.....',
        '....DD..DD......',
        '................',
        '................',
        '................',
        '................',
        '................',
      ], pal: {'.':0,'D':0x5a0000,'R':0xAA1111,'F':0xFF4500}},
      { key: 'icon_dragon_gloves', draw: g => {
        g.fillStyle(0xFF4500, 0.08); g.fillCircle(32, 32, 26);
        [4, 38].forEach(ox => {
          g.fillStyle(0x4a0000); g.fillRoundedRect(ox, 14, 22, 36, 4);
          g.fillStyle(0x7a0000); g.fillRoundedRect(ox+2, 16, 18, 32, 3);
          g.fillStyle(0xAA2020); g.fillRect(ox+4, 20, 6, 5);
          g.fillStyle(0x4a0000); g.fillRect(ox, 14, 22, 6);
          g.fillStyle(0x6a0000); g.fillRect(ox+2, 15, 18, 4);
          g.fillStyle(0x7a0000); g.fillRoundedRect(ox+2, 44, 5, 8, 2); g.fillRoundedRect(ox+8, 44, 5, 10, 2); g.fillRoundedRect(ox+14, 44, 5, 8, 2);
          g.fillStyle(0xFF4500); g.fillCircle(ox+11, 28, 2);
        });
      }, px: [
        '................',
        '..DDD....DDD....',
        '..DRD....DRD....',
        '..DRD....DRD....',
        '..DRRD..DRRD....',
        '.DRRRD..DRRRD...',
        '.DFRRD..DFRRD...',
        '.DRRRD..DRRRD...',
        '..DDD....DDD....',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
      ], pal: {'.':0,'D':0x5a0000,'R':0xAA1111,'F':0xFF4500}},
      { key: 'icon_dragon_belt', draw: g => {
        g.fillStyle(0xFF4500, 0.08); g.fillCircle(32, 32, 20);
        g.fillStyle(0x3a0000); g.fillRoundedRect(4, 22, 56, 20, 4);
        g.fillStyle(0x6a0000); g.fillRoundedRect(6, 24, 52, 16, 3);
        g.fillStyle(0x8B0000); g.fillRect(8, 26, 18, 12);
        g.fillStyle(0xFF4500); g.fillRoundedRect(26, 24, 12, 16, 3);
        g.fillStyle(0xFFD700); g.fillRoundedRect(28, 26, 8, 12, 2);
        g.fillStyle(0xFFD700); g.fillCircle(32, 32, 2);
        g.lineStyle(1, 0x2a0000); g.strokeRoundedRect(4, 22, 56, 20, 4);
      }, px: [
        '................',
        '................',
        '................',
        '................',
        '................',
        '.DDDDDDDDDDDDD.',
        '.DRRRRRYRRRRRD..',
        '.DDDDDDDDDDDDD.',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
      ], pal: {'.':0,'D':0x5a0000,'R':0xAA1111,'Y':0xFFD700}},
    ];

    // Pixel art renderer: draws 16x16 grid scaled 3x to 48x48
    // Auto-detect grid size and scale to fit 64x64
    const drawPixelArt = (key, pixels, palette) => {
      const ig = this.make.graphics({ x: 0, y: 0, add: false });
      const gridH = pixels.length || 16;
      const gridW = Math.max(...pixels.map(r => r ? r.length : 0)) || 16;
      const P = Math.floor(S / Math.max(gridW, gridH)); // auto scale
      const offX = Math.floor((S - gridW * P) / 2); // center horizontally
      const offY = Math.floor((S - gridH * P) / 2); // center vertically
      for (let y = 0; y < gridH; y++) {
        const row = pixels[y] || '';
        for (let x = 0; x < row.length; x++) {
          const ch = row[x] || '.';
          if (ch === '.' || ch === ' ') continue;
          const color = palette[ch];
          if (!color) continue;
          ig.fillStyle(color);
          ig.fillRect(offX + x * P, offY + y * P, P, P);
        }
      }
      ig.generateTexture(key, S, S);
      ig.destroy();
    };

    // Also keep the procedural fallback for items without pixel art
    items.forEach(item => {
      if (this.textures.exists(item.key)) return; // Skip if PNG loaded
      // If draw function has content (not empty), use it; else use pixel art
      const drawStr = item.draw.toString();
      const hasRealDraw = drawStr.length > 20; // empty: "g=>{}" = ~6 chars
      if (item.px && !hasRealDraw) {
        drawPixelArt(item.key, item.px, item.pal);
      } else {
        const ig = this.make.graphics({ x: 0, y: 0, add: false });
        ig.fillStyle(0x12122a, 0.3); ig.fillRoundedRect(0, 0, S, S, 6);
        item.draw(ig);
        ig.generateTexture(item.key, S, S);
        ig.destroy();
      }
    });
  }

  generateResourceSprites() {
    // === Tree 64x96 — pixel art style ===
    const tg = this.make.graphics({ x: 0, y: 0, add: false });
    const treeP = {
      O: 0x0a3a0a,    // foliage outline (dark green)
      F: 0x1a5a1a,    // foliage dark
      G: 0x2a7a2a,    // foliage mid
      L: 0x3a9a3a,    // foliage light
      H: 0x4aaa4a,    // foliage highlight
      T: 0x5a3a1a,    // trunk
      t: 0x4a2a0a,    // trunk dark
      R: 0x3a1a0a,    // roots
      B: 0x6a4a2a,    // trunk light/bark
      P: 0x2a1a40,    // twilight purple tint
      X: [0x000000, 0.2],
    };
    // 16x24 grid, scale 4
    const treeRows = [
      '......OOOO......',
      '....OOFGFLOO....',
      '...OOFGHLGFOO...',
      '..OOFGHLHLGFOO..',
      '..OFGHLHHLGFOO..',
      '.OOFGHLHHHLGFOO.',
      '.OFGLHLHHLGLGFO.',
      'OOFGGLHHLGGLFOO.',
      'OFGGLGHHGLGGLFO.',
      'OOFGGLGGGLGGFOO.',
      '.OFGFGLGGLGFFO..',
      '..OOFFGGGFFOO...',
      '...OOOFFFOO.....',
      '......OtTO......',
      '......OBTO......',
      '......OtTO......',
      '......OBTO......',
      '......OtTO......',
      '......OBTO......',
      '.....OtBtO......',
      '....ORtBtRO.....',
      '...OORtBtROO....',
      '....OXXXXO......',
      '................',
    ];
    this.drawPixelArt(tg, 0, 0, treeRows, treeP, 4);
    tg.generateTexture('tree', 64, 96);
    tg.destroy();

    // === Bush 48x48 — pixel art with flowers ===
    const bg2 = this.make.graphics({ x: 0, y: 0, add: false });
    const bushP = {
      O: 0x0a4a0a,
      F: 0x1a6a1a,
      G: 0x2a8a2a,
      L: 0x3aaa3a,
      H: 0x4aba4a,
      P: 0xDA70D6,    // purple flower
      Y: 0xFFD700,    // yellow center
      R: 0xFF6090,    // pink flower
      X: [0x000000, 0.15],
    };
    const bushRows = [
      '....OOOO....',
      '..OOGLGLOO..',
      '.OOGHLHLGOO.',
      '.OFPHLHHRGO.',
      'OOFGYLHLYFO.',
      'OFGLGHHLGFO.',
      '.OOFGGLGFOO.',
      '..OOOFFFOO..',
      '...OOXXOO...',
      '............',
      '............',
      '............',
    ];
    this.drawPixelArt(bg2, 0, 0, bushRows, bushP, 4);
    bg2.generateTexture('bush', 48, 48);
    bg2.destroy();

    // === Rock 52x48 — pixel art with mineral veins ===
    const rg = this.make.graphics({ x: 0, y: 0, add: false });
    const rockP = {
      O: 0x3a3a3a,    // outline
      D: 0x505050,    // dark stone
      M: 0x606060,    // mid stone
      L: 0x787878,    // light stone
      H: 0x909090,    // highlight
      C: 0x4a4a4a,    // crack
      V: 0x8a7a5a,    // mineral vein
      G: 0x3a5a2a,    // moss
      X: [0x000000, 0.15],
    };
    const rockRows = [
      '.....OOOOO.....',
      '...OOLHLLOO....',
      '..OOLHHLHLOO...',
      '.OODLHVHLLDOO..',
      '.ODMLHLHLMDOO..',
      'OODMCDDCMLDDOO.',
      'ODMDDDGDDMDDOO.',
      '.OOMMDDDDMMOO..',
      '..OOODDDDOOO...',
      '....OOXXXOO....',
      '...............',
      '...............',
    ];
    this.drawPixelArt(rg, 0, 0, rockRows, rockP, 4);
    rg.generateTexture('rock', 52, 48);
    rg.destroy();
  }

  generateBuildingSprites() {
    // Wooden log helper
    const drawLogs = (g, x, y, w, h) => {
      const logH = 6;
      for (let ly = 0; ly < h; ly += logH) {
        const shade = ly % 12 === 0 ? 0x6a4a2a : 0x5a3a1a;
        g.fillStyle(shade);
        g.fillRect(x, y + ly, w, logH - 1);
        // Wood grain
        g.fillStyle(shade + 0x101010, 0.4);
        g.fillRect(x + 2, y + ly + 1, w - 4, 2);
        // Log edge shadow
        g.fillStyle(0x3a2a0a, 0.3);
        g.fillRect(x, y + ly + logH - 2, w, 1);
      }
      // Log ends on sides
      g.fillStyle(0x7a5a3a);
      for (let ly = 0; ly < h; ly += logH * 2) {
        g.fillCircle(x, y + ly + 3, 3);
        g.fillCircle(x + w, y + ly + 3, 3);
        g.fillStyle(0x5a3a1a);
        g.fillCircle(x, y + ly + 3, 1.5);
        g.fillCircle(x + w, y + ly + 3, 1.5);
        g.fillStyle(0x7a5a3a);
      }
    };

    // House 1 - small wooden cottage (80x84)
    const h1 = this.make.graphics({ add: false });
    h1.fillStyle(0x000000, 0.2); h1.fillEllipse(40, 80, 68, 8);
    // Log walls
    drawLogs(h1, 10, 32, 60, 44);
    // Thatched roof (straw)
    h1.fillStyle(0x8a7a40);
    h1.fillTriangle(40, 6, 0, 36, 80, 36);
    h1.fillStyle(0x9a8a50);
    h1.fillTriangle(40, 10, 6, 34, 74, 34);
    // Straw texture
    h1.lineStyle(1, 0x7a6a30, 0.5);
    for (let rl = 0; rl < 6; rl++) {
      const ry = 14 + rl * 4;
      h1.lineBetween(40 - rl * 6 - 4, ry, 40 + rl * 6 + 4, ry);
    }
    // Wooden door
    this.grad(h1, 30, 46, 18, 30, 0x5a3a1a, 0x3a1a0a);
    h1.lineStyle(1, 0x3a1a0a);
    h1.lineBetween(30, 46, 30, 76); h1.lineBetween(48, 46, 48, 76);
    // Door planks
    h1.lineStyle(1, 0x4a2a0a, 0.5);
    h1.lineBetween(36, 46, 36, 76); h1.lineBetween(42, 46, 42, 76);
    // Door handle
    h1.fillStyle(0x808080); h1.fillCircle(45, 60, 2);
    // Window
    h1.fillStyle(0x3a5a7a); h1.fillRect(54, 42, 12, 10);
    h1.lineStyle(2, 0x5a3a1a); h1.strokeRect(54, 42, 12, 10);
    h1.lineStyle(1, 0x5a3a1a); h1.lineBetween(60, 42, 60, 52); h1.lineBetween(54, 47, 66, 47);
    // Warm light from window
    h1.fillStyle(0xFFD700, 0.2); h1.fillRect(55, 43, 10, 8);
    // Chimney (log)
    h1.fillStyle(0x5a4a3a); h1.fillRect(60, 8, 8, 20);
    h1.fillStyle(0x808080, 0.25); h1.fillCircle(64, 6, 4); h1.fillCircle(66, 1, 3);
    h1.generateTexture('house1', 80, 84);
    h1.destroy();

    // House 2 - larger wooden hall (96x90)
    const h2 = this.make.graphics({ add: false });
    h2.fillStyle(0x000000, 0.2); h2.fillEllipse(48, 86, 84, 10);
    // Log walls
    drawLogs(h2, 6, 36, 84, 50);
    // Thatched roof
    h2.fillStyle(0x7a6a30);
    h2.fillTriangle(48, 4, -4, 40, 100, 40);
    h2.fillStyle(0x8a7a40);
    h2.fillTriangle(48, 8, 4, 38, 92, 38);
    h2.lineStyle(1, 0x6a5a20, 0.5);
    for (let rl = 0; rl < 7; rl++) h2.lineBetween(48 - rl * 7 - 4, 12 + rl * 4, 48 + rl * 7 + 4, 12 + rl * 4);
    // Double door
    this.grad(h2, 32, 50, 14, 36, 0x5a3a1a, 0x3a1a0a);
    this.grad(h2, 46, 50, 14, 36, 0x5a3a1a, 0x3a1a0a);
    h2.lineStyle(1, 0x3a1a0a); h2.lineBetween(46, 50, 46, 86);
    h2.fillStyle(0x808080); h2.fillCircle(43, 66, 2); h2.fillCircle(49, 66, 2);
    // Windows
    for (const wx of [12, 72]) {
      h2.fillStyle(0x3a5a7a); h2.fillRect(wx, 46, 14, 12);
      h2.lineStyle(2, 0x5a3a1a); h2.strokeRect(wx, 46, 14, 12);
      h2.lineStyle(1, 0x5a3a1a); h2.lineBetween(wx + 7, 46, wx + 7, 58); h2.lineBetween(wx, 52, wx + 14, 52);
      h2.fillStyle(0xFFD700, 0.2); h2.fillRect(wx + 1, 47, 12, 10);
    }
    // Wooden sign
    h2.fillStyle(0x5a3a1a); h2.fillRect(88, 52, 3, 30);
    h2.fillStyle(0x8a6a3a); h2.fillRoundedRect(78, 48, 18, 10, 2);
    h2.generateTexture('house2', 96, 90);
    h2.destroy();

    // House 3 - wooden watchtower (56x104)
    const h3 = this.make.graphics({ add: false });
    h3.fillStyle(0x000000, 0.2); h3.fillEllipse(28, 100, 44, 8);
    // Base logs
    drawLogs(h3, 10, 50, 36, 48);
    // Upper platform
    h3.fillStyle(0x6a4a2a); h3.fillRect(6, 48, 44, 4);
    // Upper logs (narrower)
    drawLogs(h3, 14, 24, 28, 26);
    // Peaked roof (wood shingles)
    h3.fillStyle(0x5a3a1a);
    h3.fillTriangle(28, 4, 8, 28, 48, 28);
    h3.fillStyle(0x6a4a2a);
    h3.fillTriangle(28, 8, 12, 26, 44, 26);
    // Door
    this.grad(h3, 18, 72, 18, 26, 0x5a3a1a, 0x3a1a0a);
    h3.fillStyle(0x808080); h3.fillCircle(32, 84, 2);
    // Lookout window
    h3.fillStyle(0x3a5a7a); h3.fillRect(22, 32, 12, 8);
    h3.lineStyle(2, 0x5a3a1a); h3.strokeRect(22, 32, 12, 8);
    // Flag
    h3.fillStyle(0x5a3a1a); h3.fillRect(27, 0, 2, 8);
    h3.fillStyle(0x8B0000); h3.fillTriangle(29, 0, 40, 3, 29, 6);
    h3.generateTexture('house3', 56, 104);
    h3.destroy();

    // Wooden stake fence post (for village border)
    const fp = this.make.graphics({ add: false });
    fp.fillStyle(0x5a3a1a);
    fp.fillRect(2, 2, 6, 24);
    fp.fillStyle(0x6a4a2a);
    fp.fillRect(3, 3, 4, 10);
    // Pointed top
    fp.fillStyle(0x5a3a1a);
    fp.fillTriangle(5, 0, 2, 4, 8, 4);
    fp.generateTexture('fence_post', 10, 26);
    fp.destroy();

    // Village gate (open & closed states)
    // Closed gate
    const gc = this.make.graphics({ add: false });
    gc.fillStyle(0x5a3a1a);
    // Left post
    gc.fillRect(0, 0, 8, 48);
    gc.fillStyle(0x6a4a2a); gc.fillRect(1, 1, 6, 20);
    gc.fillStyle(0x5a3a1a); gc.fillTriangle(4, -4, 0, 2, 8, 2);
    // Right post
    gc.fillStyle(0x5a3a1a); gc.fillRect(56, 0, 8, 48);
    gc.fillStyle(0x6a4a2a); gc.fillRect(57, 1, 6, 20);
    gc.fillStyle(0x5a3a1a); gc.fillTriangle(60, -4, 56, 2, 64, 2);
    // Gate planks
    gc.fillStyle(0x6a4a2a);
    for (let p = 0; p < 6; p++) {
      gc.fillRect(10 + p * 8, 8, 6, 36);
      gc.fillStyle(0x5a3a1a, 0.5);
      gc.fillRect(10 + p * 8 + 1, 9, 4, 16);
      gc.fillStyle(0x6a4a2a);
    }
    // Cross bar
    gc.fillStyle(0x4a2a0a);
    gc.fillRect(8, 16, 48, 4);
    gc.fillRect(8, 32, 48, 4);
    gc.generateTexture('gate_closed', 64, 48);
    gc.destroy();

    // Open gate
    const go = this.make.graphics({ add: false });
    // Left post
    go.fillStyle(0x5a3a1a); go.fillRect(0, 0, 8, 48);
    go.fillStyle(0x6a4a2a); go.fillRect(1, 1, 6, 20);
    go.fillStyle(0x5a3a1a); go.fillTriangle(4, -4, 0, 2, 8, 2);
    // Right post
    go.fillStyle(0x5a3a1a); go.fillRect(56, 0, 8, 48);
    go.fillStyle(0x6a4a2a); go.fillRect(57, 1, 6, 20);
    go.fillStyle(0x5a3a1a); go.fillTriangle(60, -4, 56, 2, 64, 2);
    // Gate planks pushed to sides (open)
    go.fillStyle(0x6a4a2a, 0.7);
    for (let p = 0; p < 3; p++) {
      go.fillRect(8 - p * 2, 8 + p, 5, 32 - p * 2);
      go.fillRect(52 + p * 2, 8 + p, 5, 32 - p * 2);
    }
    go.generateTexture('gate_open', 64, 48);
    go.destroy();
  }

  generateUISprites() {
    const mk = (key, w, h, fn) => { const g = this.make.graphics({ add: false }); fn(g); g.generateTexture(key, w, h); g.destroy(); };

    // HP bar background — embossed look
    mk('hp_bar_bg', 200, 20, g => {
      g.fillStyle(0x0a0a0a); g.fillRoundedRect(0, 0, 200, 20, 3);
      g.fillStyle(0x1a1a1a); g.fillRoundedRect(1, 1, 198, 18, 2);
      g.lineStyle(1, 0x3a3a3a); g.strokeRoundedRect(0, 0, 200, 20, 3);
      // Inner shadow (top)
      g.fillStyle(0x000000, 0.3); g.fillRect(2, 2, 196, 3);
    });

    // HP bar fill — red gradient with gloss
    mk('hp_bar_fill', 196, 16, g => {
      this.grad(g, 0, 0, 196, 16, 0xDD2222, 0x991111);
      // Gloss highlight (top half)
      g.fillStyle(0xFF4444, 0.3); g.fillRect(0, 0, 196, 6);
      g.fillStyle(0xFFFFFF, 0.1); g.fillRect(2, 1, 192, 2);
    });

    // EXP bar fill — blue gradient with shimmer
    mk('exp_bar_fill', 196, 10, g => {
      this.grad(g, 0, 0, 196, 10, 0x5589FF, 0x3366CC);
      g.fillStyle(0x88AAFF, 0.3); g.fillRect(0, 0, 196, 4);
      g.fillStyle(0xFFFFFF, 0.1); g.fillRect(2, 1, 192, 1);
    });

    // Button — gradient with bevel
    mk('button', 120, 36, g => {
      // Shadow
      g.fillStyle(0x000000, 0.3); g.fillRoundedRect(1, 2, 120, 36, 6);
      // Body gradient
      this.grad(g, 0, 0, 120, 36, 0x3a3a5a, 0x1a1a3a);
      g.fillStyle(0x3a3a5a, 0.01); g.fillRoundedRect(0, 0, 120, 36, 6); // shape clip
      // Top highlight
      g.fillStyle(0x5a5a7a, 0.3); g.fillRoundedRect(2, 2, 116, 16, 4);
      // Border
      g.lineStyle(1, 0x6a6aaa); g.strokeRoundedRect(0, 0, 120, 36, 6);
      // Inner glow line
      g.lineStyle(1, 0x8a8acc, 0.3); g.strokeRoundedRect(1, 1, 118, 34, 5);
    });

    // Panel — gradient bg, ornate border, corner decorations
    mk('panel', 300, 400, g => {
      // Outer shadow
      g.fillStyle(0x000000, 0.4); g.fillRoundedRect(2, 3, 300, 400, 8);
      // Background gradient
      this.grad(g, 0, 0, 300, 400, 0x0e0e22, 0x06060e);
      g.fillStyle(0x0a0a1a, 0.01); g.fillRoundedRect(0, 0, 300, 400, 8);
      // Inner glow (subtle)
      g.fillStyle(0x2a2a4a, 0.15); g.fillRoundedRect(4, 4, 292, 392, 6);
      // Double border
      g.lineStyle(2, 0x4a4a8a); g.strokeRoundedRect(0, 0, 300, 400, 8);
      g.lineStyle(1, 0x3a3a6a, 0.5); g.strokeRoundedRect(3, 3, 294, 394, 6);
      // Corner ornaments (small diamonds)
      const corners = [[8,8],[292,8],[8,392],[292,392]];
      corners.forEach(([cx,cy]) => {
        g.fillStyle(0x6a4aaa, 0.6); g.fillCircle(cx, cy, 4);
        g.fillStyle(0x8a6acc, 0.4); g.fillCircle(cx, cy, 2);
      });
      // Top decorative line
      g.fillStyle(0x4a4a8a, 0.3); g.fillRect(20, 8, 260, 1);
    });

    // Inventory slot — embossed with inner shadow
    mk('inv_slot', 52, 52, g => {
      g.fillStyle(0x0a0a1a); g.fillRoundedRect(0, 0, 52, 52, 4);
      g.fillStyle(0x1a1a2a); g.fillRoundedRect(1, 1, 50, 50, 3);
      // Inner shadow (top-left)
      g.fillStyle(0x000000, 0.3); g.fillRect(2, 2, 48, 2);
      g.fillStyle(0x000000, 0.2); g.fillRect(2, 2, 2, 48);
      // Bottom-right highlight
      g.fillStyle(0x2a2a4a, 0.3); g.fillRect(2, 48, 48, 2);
      g.fillStyle(0x2a2a4a, 0.2); g.fillRect(48, 2, 2, 48);
      // Border
      g.lineStyle(1, 0x3a3a5a); g.strokeRoundedRect(0, 0, 52, 52, 4);
    });

    // Dialogue box — ornate RPG feel
    mk('dialogue_box', 700, 140, g => {
      // Shadow
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(2, 3, 700, 140, 10);
      // Background gradient
      this.grad(g, 0, 0, 700, 140, 0x0e0e22, 0x060610);
      g.fillStyle(0x0a0a1a, 0.01); g.fillRoundedRect(0, 0, 700, 140, 10);
      // Inner glow
      g.fillStyle(0x1a1a3a, 0.2); g.fillRoundedRect(4, 4, 692, 132, 8);
      // Double border
      g.lineStyle(2, 0x6a4aaa); g.strokeRoundedRect(0, 0, 700, 140, 10);
      g.lineStyle(1, 0x5a3a8a, 0.4); g.strokeRoundedRect(3, 3, 694, 134, 8);
      // Corner ornaments
      const corners = [[10,10],[690,10],[10,130],[690,130]];
      corners.forEach(([cx,cy]) => {
        g.fillStyle(0x8a6aCC, 0.5); g.fillCircle(cx, cy, 3);
        g.fillStyle(0xaa8aee, 0.3); g.fillCircle(cx, cy, 1.5);
      });
      // Top decorative line
      g.fillStyle(0x6a4aaa, 0.25); g.fillRect(24, 8, 652, 1);
    });
  }

  generateParticles() {
    const mk = (key, s, fn) => { const g = this.make.graphics({ add: false }); fn(g); g.generateTexture(key, s, s); g.destroy(); };

    // Hit — star burst shape (white-yellow gradient)
    mk('particle_hit', 16, g => {
      g.fillStyle(0xFFDD44, 0.4); g.fillCircle(8, 8, 8);
      g.fillStyle(0xFFFF88, 0.6); g.fillCircle(8, 8, 5);
      // Star points
      g.fillStyle(0xFFFFFF);
      g.fillRect(6, 0, 4, 16); g.fillRect(0, 6, 16, 4); // cross
      g.fillStyle(0xFFDD44, 0.7);
      g.fillRect(2, 2, 3, 3); g.fillRect(11, 2, 3, 3);
      g.fillRect(2, 11, 3, 3); g.fillRect(11, 11, 3, 3); // corners
      g.fillStyle(0xFFFFFF); g.fillCircle(8, 8, 3);
    });

    // Sparkle — 4-pointed star (gold)
    mk('particle_sparkle', 14, g => {
      g.fillStyle(0xFFD700, 0.3); g.fillCircle(7, 7, 7);
      g.fillStyle(0xFFD700); g.fillRect(6, 0, 2, 14); g.fillRect(0, 6, 14, 2);
      g.fillStyle(0xFFEE66); g.fillRect(5, 1, 4, 12); g.fillRect(1, 5, 12, 4);
      g.fillStyle(0xFFFFFF); g.fillCircle(7, 7, 2);
    });

    // Level up — purple ring + star
    mk('particle_levelup', 14, g => {
      g.fillStyle(0x9a6aea, 0.3); g.fillCircle(7, 7, 7);
      g.lineStyle(2, 0xc0a0ff, 0.8); g.strokeCircle(7, 7, 5);
      g.fillStyle(0xe0c0ff); g.fillCircle(7, 7, 3);
      g.fillStyle(0xFFFFFF); g.fillCircle(7, 7, 1.5);
    });

    // Twilight — soft glowing orb
    mk('particle_twilight', 12, g => {
      g.fillStyle(0x6a4aaa, 0.2); g.fillCircle(6, 6, 6);
      g.fillStyle(0x8a6acc, 0.4); g.fillCircle(6, 6, 4);
      g.fillStyle(0xaa8aee, 0.3); g.fillCircle(6, 6, 2);
      g.fillStyle(0xc0a0ff, 0.5); g.fillCircle(5, 5, 1);
    });

    // Fire particle (for skills)
    mk('particle_fire', 12, g => {
      g.fillStyle(0xFF4400, 0.3); g.fillCircle(6, 6, 6);
      g.fillStyle(0xFF6600, 0.6); g.fillCircle(6, 6, 4);
      g.fillStyle(0xFFAA00, 0.8); g.fillCircle(6, 6, 2.5);
      g.fillStyle(0xFFFF88); g.fillCircle(6, 5, 1);
    });

    // Ice particle
    mk('particle_ice', 10, g => {
      g.fillStyle(0x4488ff, 0.3); g.fillCircle(5, 5, 5);
      g.fillStyle(0x88ccff, 0.6); g.fillRect(4, 0, 2, 10); g.fillRect(0, 4, 10, 2);
      g.fillStyle(0xcceeFF); g.fillCircle(5, 5, 2);
    });
  }

  generateProjectiles() {
    // Arrow — pixel art style with detail
    const ag = this.make.graphics({ add: false });
    const arrowP = {
      W: 0x8B4513,    // wood shaft
      w: 0x6a3a10,    // wood dark
      M: 0xA0A0A0,    // metal head
      m: 0xC0C0C0,    // metal shine
      F: 0xBB6644,    // feather
      f: 0xDD8866,    // feather light
      O: 0x4a2a0a,    // outline
    };
    const arrowRows = [
      '........Omm',
      '.OFfO.OWWOMm',
      'OFffFOWWWOMm',
      '.OFfO.OWWOMm',
      '........Omm',
    ];
    this.drawPixelArt(ag, 0, 0, arrowRows, arrowP, 2);
    ag.generateTexture('projectile_arrow', 26, 14);
    ag.destroy();

    // Magic bolt — glowing energy orb
    const mg = this.make.graphics({ add: false });
    mg.fillStyle(0x6a3aba, 0.3); mg.fillCircle(10, 10, 10);
    mg.fillStyle(0x8a5aea, 0.4); mg.fillCircle(10, 10, 8);
    mg.fillStyle(0xaa7aff, 0.6); mg.fillCircle(10, 10, 6);
    mg.fillStyle(0xc0a0ff, 0.8); mg.fillCircle(10, 10, 4);
    mg.fillStyle(0xe0d0ff); mg.fillCircle(10, 10, 2.5);
    mg.fillStyle(0xFFFFFF); mg.fillCircle(9, 9, 1.5);
    // Energy ring
    mg.lineStyle(1, 0xc0a0ff, 0.5); mg.strokeCircle(10, 10, 8);
    mg.generateTexture('projectile_magic', 20, 20);
    mg.destroy();
  }

  generateClassIcons() {
    const S = 48; // icon size

    // Savaşçı ikonu — kılıç + kalkan
    const wg = this.make.graphics({ add: false });
    // Kalkan
    wg.fillStyle(0x8B4513); wg.fillRoundedRect(6, 10, 20, 28, 4);
    wg.fillStyle(0xC0C0C0); wg.fillRoundedRect(8, 12, 16, 24, 3);
    wg.fillStyle(0xe74c3c); wg.fillRoundedRect(12, 16, 8, 16, 2);
    // Kılıç
    wg.fillStyle(0xD0D0D0); wg.fillRect(28, 4, 4, 30);
    wg.fillStyle(0xFFD700); wg.fillRect(24, 32, 12, 4);
    wg.fillStyle(0x8B4513); wg.fillRect(29, 36, 3, 8);
    wg.generateTexture('class_warrior', S, S);
    wg.destroy();

    // Okçu ikonu — yay + ok
    const ag2 = this.make.graphics({ add: false });
    // Yay
    ag2.lineStyle(3, 0x8B4513);
    ag2.beginPath();
    ag2.arc(16, 24, 18, -1.2, 1.2, false);
    ag2.strokePath();
    // Kiriş
    ag2.lineStyle(1, 0xDEB887);
    ag2.beginPath();
    ag2.moveTo(16 + 18 * Math.cos(-1.2), 24 + 18 * Math.sin(-1.2));
    ag2.lineTo(16 + 18 * Math.cos(1.2), 24 + 18 * Math.sin(1.2));
    ag2.strokePath();
    // Ok
    ag2.fillStyle(0x8B4513); ag2.fillRect(20, 22, 22, 2);
    ag2.fillStyle(0xA0A0A0); ag2.fillTriangle(42, 23, 46, 19, 46, 27);
    ag2.fillStyle(0x27ae60); ag2.fillTriangle(20, 21, 24, 23, 20, 25);
    ag2.generateTexture('class_archer', S, S);
    ag2.destroy();

    // Büyücü ikonu — asa + kristal
    const mg2 = this.make.graphics({ add: false });
    // Asa gövdesi
    mg2.fillStyle(0x6a4a2a); mg2.fillRect(22, 8, 4, 36);
    // Kristal küre
    mg2.fillStyle(0x8e44ad, 0.6); mg2.fillCircle(24, 8, 8);
    mg2.fillStyle(0xc0a0ff, 0.8); mg2.fillCircle(24, 8, 5);
    mg2.fillStyle(0xFFFFFF); mg2.fillCircle(24, 8, 2);
    // Parıltılar
    mg2.fillStyle(0xFFFFFF, 0.7);
    mg2.fillCircle(18, 4, 1.5);
    mg2.fillCircle(30, 6, 1);
    mg2.fillCircle(20, 12, 1);
    mg2.generateTexture('class_mage', S, S);
    mg2.destroy();
  }
}
