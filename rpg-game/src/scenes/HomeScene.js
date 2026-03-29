import Phaser from 'phaser';
import { PlayerState } from '../systems/PlayerState.js';
import { ITEMS } from '../data/items.js';

export class HomeScene extends Phaser.Scene {
  constructor() {
    super('HomeScene');
  }

  create() {
    this.playerState = PlayerState.getInstance();
    this.storageOpen = false;
    this.storagePage = 0; // 0 = sayfa 1, 1 = sayfa 2

    this.drawRoom();
    this.createPlayer();
    this.setupInput();

    this.cameras.main.setBackgroundColor('#0a0808');
  }

  drawRoom() {
    const g = this.add.graphics();
    // Room is 500x380, offset to center in 800x600
    const X = 160, Y = 60, W = 480, H = 430, wallT = 22;

    // Outer black fill
    g.fillStyle(0x0a0808); g.fillRect(0, 0, 800, 600);

    // Walls
    const topWallH = 70; // tall back wall
    g.fillStyle(0x5a4a3a); g.fillRect(X, Y, W, topWallH); // top (tall)
    // Back wall gradient (darker at top)
    g.fillStyle(0x3a2a1a, 0.4); g.fillRect(X, Y, W, 20);
    g.fillStyle(0x4a3a2a); g.fillRect(X, Y, wallT, H); // left
    g.fillStyle(0x4a3a2a); g.fillRect(X + W - wallT, Y, wallT, H); // right
    g.fillStyle(0x5a4a3a); g.fillRect(X, Y + H - wallT, W, wallT); // bottom
    // Wall plank lines
    g.lineStyle(1, 0x3a2a1a, 0.3);
    for (let wy = 10; wy < topWallH; wy += 12) g.lineBetween(X, Y + wy, X + W, Y + wy);
    for (let wy = 8; wy < wallT; wy += 10) g.lineBetween(X, Y + H - wallT + wy, X + W, Y + H - wallT + wy);

    // Floor (starts after tall back wall)
    for (let fy = Y + topWallH; fy < Y + H - wallT; fy += 20) {
      for (let fx = X + wallT; fx < X + W - wallT; fx += 40) {
        g.fillStyle((Math.floor(fy / 20) + Math.floor(fx / 40)) % 2 === 0 ? 0x6a6a5a : 0x5a5a4a);
        g.fillRect(fx, fy, 40, 20);
        g.lineStyle(1, 0x5a3a1a, 0.2); g.lineBetween(fx, fy, fx + 40, fy);
      }
    }

    // Carpet
    const cx = X + W / 2, cy = Y + H / 2;
    g.fillStyle(0x6a1a1a, 0.5); g.fillRoundedRect(cx - 90, cy - 50, 180, 100, 6);
    g.lineStyle(2, 0xDAA520, 0.4); g.strokeRoundedRect(cx - 90, cy - 50, 180, 100, 6);
    g.lineStyle(1, 0xDAA520, 0.2); g.strokeRoundedRect(cx - 80, cy - 40, 160, 80, 4);

    // Window (back wall left) - large
    const winY = Y + 12, winH = 44;
    g.fillStyle(0x3a2a1a); g.fillRect(X + 60, winY - 4, 90, winH + 8); // frame
    g.fillStyle(0x1a2a4a); g.fillRect(X + 64, winY, 82, winH);
    g.fillStyle(0x2a4a7a, 0.6); g.fillRect(X + 66, winY + 2, 78, winH - 4);
    g.lineStyle(3, 0x5a3a1a); g.strokeRect(X + 64, winY, 82, winH);
    g.lineStyle(2, 0x5a3a1a);
    g.lineBetween(X + 105, winY, X + 105, winY + winH); // vertical divider
    g.lineBetween(X + 64, winY + winH / 2, X + 146, winY + winH / 2); // horizontal
    // Curtains
    g.fillStyle(0x6a2a2a, 0.4); g.fillRect(X + 60, winY - 4, 14, winH + 8);
    g.fillStyle(0x6a2a2a, 0.4); g.fillRect(X + 136, winY - 4, 14, winH + 8);
    // Moonlight
    g.fillStyle(0x6080aa, 0.08); g.fillTriangle(X + 64, winY + winH, X + 146, winY + winH, X + 105, Y + topWallH + 60);

    // Fireplace (back wall center) - large
    const fpX = cx - 40, fpY = Y + 8;
    g.fillStyle(0x4a4a4a); g.fillRect(fpX, fpY, 80, 56); // stone surround
    g.fillStyle(0x3a3a3a); g.fillRect(fpX + 4, fpY + 4, 72, 48);
    g.fillStyle(0x1a1a1a); g.fillRect(fpX + 10, fpY + 14, 60, 34); // opening
    // Fire
    g.fillStyle(0xFF4500, 0.8); g.fillTriangle(cx, fpY + 18, cx - 18, fpY + 44, cx + 18, fpY + 44);
    g.fillStyle(0xFFD700, 0.7); g.fillTriangle(cx, fpY + 22, cx - 12, fpY + 42, cx + 12, fpY + 42);
    g.fillStyle(0xFF8800, 0.5); g.fillTriangle(cx - 8, fpY + 24, cx - 16, fpY + 44, cx, fpY + 44);
    g.fillStyle(0xFF6600, 0.4); g.fillTriangle(cx + 6, fpY + 26, cx, fpY + 44, cx + 14, fpY + 44);
    // Embers
    g.fillStyle(0xFF4400, 0.6); g.fillCircle(cx - 6, fpY + 42, 2);
    g.fillStyle(0xFF6600, 0.5); g.fillCircle(cx + 8, fpY + 44, 2);
    // Mantle shelf
    g.fillStyle(0x6a5a4a); g.fillRect(fpX - 6, fpY - 2, 92, 8);
    g.fillStyle(0x7a6a5a); g.fillRect(fpX - 4, fpY - 1, 88, 4);
    // Warm glow from fire
    g.fillStyle(0xFF6600, 0.04); g.fillCircle(cx, fpY + 30, 80);

    // Window (back wall right) - large
    g.fillStyle(0x3a2a1a); g.fillRect(X + W - 150, winY - 4, 90, winH + 8);
    g.fillStyle(0x1a2a4a); g.fillRect(X + W - 146, winY, 82, winH);
    g.fillStyle(0x2a4a7a, 0.6); g.fillRect(X + W - 144, winY + 2, 78, winH - 4);
    g.lineStyle(3, 0x5a3a1a); g.strokeRect(X + W - 146, winY, 82, winH);
    g.lineStyle(2, 0x5a3a1a);
    g.lineBetween(X + W - 105, winY, X + W - 105, winY + winH);
    g.lineBetween(X + W - 146, winY + winH / 2, X + W - 64, winY + winH / 2);
    g.fillStyle(0x6a2a2a, 0.4); g.fillRect(X + W - 150, winY - 4, 14, winH + 8);
    g.fillStyle(0x6a2a2a, 0.4); g.fillRect(X + W - 74, winY - 4, 14, winH + 8);

    // === FURNITURE LAYOUT (all based on floorY) ===
    const floorY = Y + topWallH;
    const floorH = H - topWallH - wallT;
    const leftEdge = X + wallT;
    const rightEdge = X + W - wallT;

    // --- BED (top right, against back wall) ---
    const bx = rightEdge - 86, by = floorY + 4;
    g.fillStyle(0x5a3a1a); g.fillRoundedRect(bx, by, 82, 110, 4);
    g.fillStyle(0x4a5a8a); g.fillRoundedRect(bx + 3, by + 3, 76, 104, 3);
    g.fillStyle(0xDDDDDD); g.fillRoundedRect(bx + 8, by + 6, 62, 22, 6);
    g.fillStyle(0xEEEEEE); g.fillRoundedRect(bx + 10, by + 8, 58, 18, 5);
    g.fillStyle(0x3a4a7a); g.fillRoundedRect(bx + 4, by + 34, 74, 70, 3);
    g.fillStyle(0x4a5a8a, 0.5); g.fillRect(bx + 6, by + 36, 70, 6);
    g.fillStyle(0x4a2a0a); g.fillRect(bx, by, 82, 5);
    this.add.text(bx + 41, by - 12, 'Yatak', { fontSize: '14px', fontFamily: 'Nunito, Arial, sans-serif', color: '#87CEEB', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(20);
    this.bedZone = this.add.zone(bx + 41, by + 55, 90, 120);
    this.physics.world.enable(this.bedZone); this.bedZone.body.setAllowGravity(false);

    // --- NIGHTSTAND (left of bed) ---
    g.fillStyle(0x5a3a1a); g.fillRoundedRect(bx - 30, by + 30, 24, 32, 2);
    g.fillStyle(0x6a4a2a); g.fillRoundedRect(bx - 28, by + 32, 20, 12, 1);
    g.fillStyle(0x808080); g.fillRect(bx - 20, by + 18, 3, 14);
    g.fillStyle(0xDAA520); g.fillTriangle(bx - 26, by + 18, bx - 12, by + 18, bx - 19, by + 8);
    g.fillStyle(0xFFD700, 0.3); g.fillCircle(bx - 19, by + 12, 10);

    // --- STORAGE CHEST (top left, against back wall) ---
    const sx = leftEdge + 4, sy = floorY + 4;
    g.fillStyle(0x4a2a0a); g.fillRoundedRect(sx, sy, 130, 85, 5);
    g.fillStyle(0x6a4a1a); g.fillRoundedRect(sx + 3, sy + 3, 124, 79, 4);
    g.fillStyle(0x8a6a2a); g.fillRoundedRect(sx + 3, sy + 3, 124, 26, 4);
    g.lineStyle(2, 0x4a2a0a); g.strokeRoundedRect(sx, sy, 130, 85, 5);
    g.fillStyle(0x606060); g.fillRect(sx + 5, sy + 30, 120, 3); g.fillRect(sx + 5, sy + 60, 120, 3);
    g.fillStyle(0x707070);
    g.fillCircle(sx + 8, sy + 8, 5); g.fillCircle(sx + 122, sy + 8, 5);
    g.fillCircle(sx + 8, sy + 77, 5); g.fillCircle(sx + 122, sy + 77, 5);
    g.fillStyle(0x505050); g.fillRoundedRect(sx + 48, sy + 34, 32, 24, 3);
    g.fillStyle(0xDAA520); g.fillRoundedRect(sx + 51, sy + 36, 26, 20, 2);
    g.fillStyle(0xFFD700); g.fillRect(sx + 54, sy + 38, 20, 10);
    g.fillStyle(0x1a1a1a); g.fillCircle(sx + 64, sy + 52, 3);
    g.fillStyle(0x808080); g.fillRect(sx + 30, sy + 10, 24, 5); g.fillRect(sx + 76, sy + 10, 24, 5);
    this.add.text(sx + 65, sy - 12, 'Depo', { fontSize: '14px', fontFamily: 'Nunito, Arial, sans-serif', color: '#DEB887', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(20);
    this.chestZone = this.add.zone(sx + 65, sy + 42, 140, 90);
    this.physics.world.enable(this.chestZone); this.chestZone.body.setAllowGravity(false);

    // --- FLOWER (left wall, below chest) ---
    g.fillStyle(0x8B4513); g.fillRoundedRect(leftEdge + 10, sy + 96, 18, 20, 2);
    g.fillStyle(0x228B22); g.fillCircle(leftEdge + 19, sy + 90, 10);
    g.fillStyle(0xDA70D6); g.fillCircle(leftEdge + 16, sy + 86, 3);
    g.fillStyle(0xFF69B4); g.fillCircle(leftEdge + 22, sy + 88, 2);

    // --- TABLE + CHAIRS (center, middle of room) ---
    const tx = leftEdge + 20, ty = Y + H - wallT - 100;
    g.fillStyle(0x6a4a2a); g.fillRoundedRect(tx, ty, 65, 40, 3);
    g.fillStyle(0x7a5a3a); g.fillRoundedRect(tx + 2, ty + 2, 61, 36, 2);
    g.fillStyle(0xDEB887); g.fillCircle(tx + 20, ty + 16, 6);
    g.fillStyle(0x808080); g.fillRect(tx + 42, ty + 8, 2, 10);
    g.fillStyle(0xFFD700, 0.5); g.fillCircle(tx + 43, ty + 7, 3);
    g.fillStyle(0x5a3a1a); g.fillRoundedRect(tx - 10, ty + 8, 12, 22, 2);
    g.fillStyle(0x5a3a1a); g.fillRoundedRect(tx + 64, ty + 8, 12, 22, 2);

    // --- KITCHEN (bottom left, against bottom wall) ---
    const kx = leftEdge + 4, ky = Y + H - wallT - 42;
    g.fillStyle(0x4a4a4a); g.fillRect(kx, ky, 120, 38);
    g.fillStyle(0x5a5a5a); g.fillRect(kx + 2, ky + 2, 116, 14);
    g.fillStyle(0x2a2a2a); g.fillCircle(kx + 20, ky + 8, 4); g.fillCircle(kx + 38, ky + 8, 4);
    g.fillStyle(0x6a6a7a); g.fillRoundedRect(kx + 56, ky + 3, 28, 10, 1);
    g.fillStyle(0x808080); g.fillRect(kx + 68, ky - 4, 3, 6);
    g.fillStyle(0x5a3a1a); g.fillRect(kx, ky - 10, 120, 4);
    g.fillStyle(0x8B0000); g.fillRoundedRect(kx + 6, ky - 20, 10, 12, 2);
    g.fillStyle(0x228B22); g.fillRoundedRect(kx + 22, ky - 18, 8, 10, 2);
    g.fillStyle(0xDAA520); g.fillRoundedRect(kx + 36, ky - 20, 10, 12, 2);

    // --- BOOKSHELF (right wall, bottom area) ---
    const rx = rightEdge - 26, ry = floorY + floorH * 0.45;
    g.fillStyle(0x5a3a1a); g.fillRect(rx, ry, 24, 90);
    for (let i = 0; i < 4; i++) {
      g.fillStyle(0x6a4a2a); g.fillRect(rx + 2, ry + 4 + i * 22, 20, 3);
      const cols = [0x8B0000, 0x1a4a8a, 0x2a6a2a, 0x6a4a1a];
      for (let b = 0; b < 3; b++) { g.fillStyle(cols[(i + b) % 4]); g.fillRect(rx + 3 + b * 7, ry + 7 + i * 22, 5, 15); }
    }

    // --- DOOR (bottom center) ---
    const dx = cx - 18, dy = Y + H - wallT - 2;
    g.fillStyle(0x3a2a1a); g.fillRoundedRect(dx, dy, 36, wallT + 2, 2);
    g.fillStyle(0x5a3a1a); g.fillRoundedRect(dx + 2, dy + 2, 32, wallT - 4, 2);
    g.fillStyle(0xDAA520); g.fillCircle(dx + 28, dy + 12, 2);
    this.add.text(cx, dy - 10, 'Çıkış', { fontSize: '14px', fontFamily: 'Nunito, Arial, sans-serif', color: '#aa6aee', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(20);
    this.exitZone = this.add.zone(cx, dy + 10, 50, 30);
    this.physics.world.enable(this.exitZone); this.exitZone.body.setAllowGravity(false);

    // --- AMBIENT LIGHT ---
    const light = this.add.graphics();
    light.fillStyle(0xFFAA44, 0.04); light.fillCircle(cx, cy, 180);
    light.fillStyle(0xFFAA44, 0.03); light.fillCircle(bx - 14, by + 6, 50);
    light.setDepth(15);
  }

  createPlayer() {
    const ps = this.playerState;
    const pTex = ps.gender === 'female' ? 'player_female' : 'player';
    this.player = this.physics.add.sprite(400, 340, pTex, 0);
    this.player.setSize(28, 28).setOffset(18, 60).setDepth(10).setCollideWorldBounds(true);
    this.physics.world.setBounds(182, 130, 436, 338);
    this.playerDirection = 'down';

    // Equipment overlay sprites
    const suffix = ps.gender === 'female' ? '_f' : '';
    this.equipSprites = {};
    ['legs', 'chest', 'arms', 'belt', 'head', 'weapon', 'necklace', 'earring'].forEach(slot => {
      const spr = this.add.sprite(400, 340, `equip_${slot}${suffix}`, 0);
      spr.setDepth(11).setVisible(!!ps.equipped[slot]);
      this.equipSprites[slot] = spr;
    });
  }

  setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' });
    this.interactKey = this.input.keyboard.addKey('E');
    this.input.dragDistanceThreshold = 8;

    // Mouse click-to-move + interact
    this.moveTarget = null;
    this.input.on('pointerdown', (pointer) => {
      if (this.storageOpen) return;
      const wx = pointer.worldX;
      const wy = pointer.worldY;

      // Check bed click
      if (Phaser.Math.Distance.Between(wx, wy, 550, 190) < 80) {
        this.moveTarget = { x: 550, y: 190, action: 'bed' };
        return;
      }
      // Check chest click
      if (Phaser.Math.Distance.Between(wx, wy, 250, 175) < 80) {
        this.moveTarget = { x: 250, y: 175, action: 'chest' };
        return;
      }
      // Check door click
      if (Phaser.Math.Distance.Between(wx, wy, 400, 468) < 60) {
        this.moveTarget = { x: 400, y: 468, action: 'exit' };
        return;
      }
      // Just move
      this.moveTarget = { x: wx, y: wy, action: null };
    });
  }

  update() {
    if (this.storageOpen) return;

    this.handleMovement();

    // Sync equip overlays with player
    if (this.equipSprites && this.player) {
      const ps = this.playerState;
      const frame = this.player.frame ? this.player.frame.name : 0;
      Object.entries(this.equipSprites).forEach(([slot, spr]) => {
        spr.setPosition(this.player.x, this.player.y);
        spr.setDepth(this.player.depth + 1);
        spr.setFrame(frame);
        spr.setVisible(!!ps.equipped[slot]);
      });
    }

    // Otomatik etkileşim (yakınlık bazlı + E tuşu desteği)
    const now = this.time.now;
    if (!this._spawnTime) this._spawnTime = now;
    const spawnSafe = now - this._spawnTime < 1500;
    const ePressed = Phaser.Input.Keyboard.JustDown(this.interactKey);
    if ((now > (this._lastAutoInteract || 0) + 800 && !spawnSafe) || ePressed) {
      // Check exit (door at bottom center)
      const exitDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, 400, 468);
      if (exitDist < 35 || (ePressed && exitDist < 50)) {
        this._lastAutoInteract = now;
        this.playerState.save();
        this.scene.start('OverworldScene');
        return;
      }

      // Check bed (top right)
      const bedDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, 550, 190);
      if (bedDist < 50 || (ePressed && bedDist < 80)) {
        this._lastAutoInteract = now;
        this.playerState.hp = this.playerState.getMaxHp();
        this.playerState.mana = this.playerState.getMaxMana();
        this.playerState.save();
        const uiScene = this.scene.get('UIScene');
        uiScene?.showDialogue('Sistem', 'Dinlendin. Canın ve manan tamamen doldu!\nOyun kaydedildi.');
        return;
      }

      // Check storage chest (left side)
      const chestDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, 250, 175);
      if (chestDist < 50 || (ePressed && chestDist < 80)) {
        this._lastAutoInteract = now;
        this.openStorage();
      }
    }

    this.scene.get('UIScene')?.events?.emit('updateUI');
  }

  handleMovement() {
    const speed = this.playerState.speed;
    let vx = 0, vy = 0;
    let keyboardUsed = false;

    if (this.cursors.left.isDown || this.wasd.left.isDown) { vx = -speed; this.playerDirection = 'left'; keyboardUsed = true; }
    else if (this.cursors.right.isDown || this.wasd.right.isDown) { vx = speed; this.playerDirection = 'right'; keyboardUsed = true; }
    if (this.cursors.up.isDown || this.wasd.up.isDown) { vy = -speed; this.playerDirection = 'up'; keyboardUsed = true; }
    else if (this.cursors.down.isDown || this.wasd.down.isDown) { vy = speed; this.playerDirection = 'down'; keyboardUsed = true; }

    if (keyboardUsed) this.moveTarget = null;

    // Mouse move
    if (!keyboardUsed && this.moveTarget) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.moveTarget.x, this.moveTarget.y);
      const threshold = this.moveTarget.action ? 50 : 12;

      if (dist < threshold) {
        // Arrived — do action
        if (this.moveTarget.action === 'bed') {
          this.playerState.hp = this.playerState.getMaxHp();
          this.playerState.mana = this.playerState.getMaxMana();
          this.playerState.save();
          this.scene.get('UIScene')?.showDialogue('Sistem', 'Dinlendin. Canın ve manan tamamen doldu!\nOyun kaydedildi.');
        } else if (this.moveTarget.action === 'chest') {
          this.openStorage();
        } else if (this.moveTarget.action === 'exit') {
          this.playerState.save();
          this.scene.start('OverworldScene');
        }
        this.moveTarget = null;
      } else {
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.moveTarget.x, this.moveTarget.y);
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;
        if (Math.abs(vx) > Math.abs(vy)) this.playerDirection = vx < 0 ? 'left' : 'right';
        else this.playerDirection = vy < 0 ? 'up' : 'down';
      }
    }

    if (vx !== 0 && vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      vx = (vx / len) * speed; vy = (vy / len) * speed;
    }
    this.player.setVelocity(vx, vy);
    if (vx !== 0 || vy !== 0) this.player.play(`walk_${this.playerDirection}`, true);
    else this.player.stop();
  }

  // Helper to stack items and place in variable-size grid
  buildStackedGrid(items, gridX, gridY, cols, maxRows, cellSize, depth, onClickFn, gridArrayName, rowOffset = 0) {
    const els = [];
    const ps = PlayerState.getInstance();
    const gridArray = gridArrayName === 'storage' ? ps.storageGrid : ps.inventoryGrid;

    // Stack consumables/materials (max 100 per stack)
    const stacked = [];
    const stackMap = {};
    items.forEach(entry => {
      const baseId = ps.getBaseItemId(entry);
      const item = ITEMS[baseId];
      if (!item) return;
      const enhanced = ps.isEnhanced(entry);
      const stackable = !enhanced && (item.type === 'consumable' || item.type === 'material');
      if (stackable && stackMap[baseId] !== undefined) {
        const lastIdx = stackMap[baseId];
        if (stacked[lastIdx].count < 100) {
          stacked[lastIdx].count++;
        } else {
          stackMap[baseId] = stacked.length;
          stacked.push({ itemId: baseId, entry, count: 1, enhanced: false });
        }
      } else {
        if (stackable) stackMap[baseId] = stacked.length;
        stacked.push({ itemId: baseId, entry, count: 1, enhanced });
      }
    });

    // Grid'i sıfırdan oluştur — önceki pozisyonları hatırla
    const oldGrid = (gridArrayName === 'storage' ? ps.storageGrid : ps.inventoryGrid) || [];
    const activeGrid = [];
    const occupied = Array.from({ length: maxRows }, () => Array(cols).fill(false));

    const markOcc = (c, r, gw, gh) => {
      for (let dr = 0; dr < gh; dr++)
        for (let dc = 0; dc < gw; dc++)
          if (r + dr < maxRows && c + dc < cols) occupied[r + dr][c + dc] = true;
    };
    const canPlace = (c, r, gw, gh) => {
      if (c < 0 || r < 0 || c + gw > cols || r + gh > maxRows) return false;
      for (let dr = 0; dr < gh; dr++)
        for (let dc = 0; dc < gw; dc++)
          if (occupied[r + dr][c + dc]) return false;
      return true;
    };
    const findSlot = (gw, gh) => {
      for (let r = 0; r <= maxRows - gh; r++)
        for (let c = 0; c <= cols - gw; c++)
          if (canPlace(c, r, gw, gh)) return { col: c, row: r };
      return null;
    };

    const gridEntries = [];
    stacked.forEach(stack => {
      const item = ITEMS[stack.itemId];
      if (!item) return;
      const gw = item.gridW || 1, gh = item.gridH || 1;
      const key = stack.stackable ? stack.itemId : stack.entry;
      const prev = oldGrid.find(g => {
        if (stack.stackable) return ps.getBaseItemId(g.entry) === stack.itemId;
        return g.entry === stack.entry;
      });
      let pos = null;
      if (prev && canPlace(prev.col, prev.row, gw, gh)) {
        pos = { col: prev.col, row: prev.row };
      } else {
        pos = findSlot(gw, gh);
      }
      if (!pos) return;
      markOcc(pos.col, pos.row, gw, gh);
      activeGrid.push({ entry: key, col: pos.col, row: pos.row });
      gridEntries.push({ ...stack, col: pos.col, row: pos.row });
    });
    if (gridArrayName === 'storage') ps.storageGrid = activeGrid;
    else ps.inventoryGrid = activeGrid;

    // Draw grid bg
    for (let r = 0; r < maxRows; r++)
      for (let c = 0; c < cols; c++)
        els.push(this.add.rectangle(gridX + c * cellSize, gridY + r * cellSize, cellSize - 2, cellSize - 2, 0x1a1a2a, 0.6).setDepth(depth).setStrokeStyle(1, 0x2a2a4a));

    // Place items
    gridEntries.forEach(stack => {
      const item = ITEMS[stack.itemId];
      if (!item) return;
      const gw = item.gridW || 1, gh = item.gridH || 1;

      const ix = gridX + stack.col * cellSize + (gw - 1) * cellSize / 2;
      const iy = gridY + (stack.row - rowOffset) * cellSize + (gh - 1) * cellSize / 2;

      if (gw > 1 || gh > 1)
        els.push(this.add.rectangle(ix, iy, gw * cellSize - 4, gh * cellSize - 4, 0x1a1a3a, 0.8).setDepth(depth).setStrokeStyle(1, 0x4a4a6a));

      // Enhanced item parıltı çerçevesi (item sınırları içinde)
      if (stack.enhanced) {
        els.push(this.add.rectangle(ix, iy, gw * cellSize - 6, gh * cellSize - 6, 0x000000, 0)
          .setDepth(depth + 3).setStrokeStyle(1, 0xFFD700));
        els.push(this.add.text(ix - gw * cellSize / 2 + 4, iy - gh * cellSize / 2 + 2, '✦', {
          fontSize: '8px', color: '#FFD700'
        }).setDepth(depth + 4));
      }

      const iconScale = (gw >= 2 && gh >= 2) ? 0.85 : (gh >= 2 || gw >= 2) ? 0.75 : 0.45;
      const icon = this.add.image(ix, iy, `icon_${stack.itemId}`).setDepth(depth + 1).setScale(iconScale).setInteractive({ useHandCursor: true, draggable: true });
      els.push(icon);

      // Drag events
      icon.on('drag', (pointer, dragX, dragY) => {
        icon.setPosition(dragX, dragY);
        icon.setDepth(depth + 10);
        icon.setAlpha(0.7);
      });
      icon.on('dragend', () => {
        icon.setAlpha(1);
        icon.setDepth(depth + 1);
        const dropCol = Math.round((icon.x - gridX) / cellSize);
        const dropRow = Math.round((icon.y - gridY) / cellSize) + rowOffset;
        if (dropCol >= 0 && dropCol + gw <= cols && dropRow >= rowOffset && dropRow + gh <= rowOffset + maxRows) {
          let canPlace = true;
          const gridIdx = activeGrid.findIndex(g => g.entry === stack.entry || (stack.stackable && ps.getBaseItemId(g.entry) === stack.itemId));
          for (let dr = 0; dr < gh && canPlace; dr++)
            for (let dc = 0; dc < gw && canPlace; dc++) {
              const other = activeGrid.find(g => {
                if (stack.stackable && ps.getBaseItemId(g.entry) === stack.itemId) return false;
                if (g.entry === stack.entry) return false;
                const oItem = ITEMS[ps.getBaseItemId(g.entry)];
                const ogw = oItem ? (oItem.gridW || 1) : 1, ogh = oItem ? (oItem.gridH || 1) : 1;
                return dropCol + dc >= g.col && dropCol + dc < g.col + ogw && dropRow + dr >= g.row && dropRow + dr < g.row + ogh;
              });
              if (other) canPlace = false;
            }
          if (canPlace && gridIdx !== -1) {
            activeGrid[gridIdx].col = dropCol;
            activeGrid[gridIdx].row = dropRow;
            ps.save();
            if (this.storageOpen) { this.closeStorage(); this.openStorage(); }
            return;
          }
        }
        icon.setPosition(ix, iy);
      });

      if (stack.count > 1)
        els.push(this.add.text(ix + cellSize / 2 - 4, iy + (gh * cellSize / 2) - 4, `${stack.count}`, {
          fontSize: '12px', fontFamily: 'Nunito, Arial, sans-serif', color: '#fff', fontStyle: 'bold',
          backgroundColor: '#333', padding: { x: 2, y: 0 }, stroke: '#000', strokeThickness: 2
        }).setOrigin(1, 1).setDepth(depth + 2));

      let hoverLabel = null;
      icon.on('pointerover', () => {
        const cs = stack.count > 1 ? ` (x${stack.count})` : '';
        hoverLabel = this.add.text(ix, iy - gh * cellSize / 2 - 10, item.name + cs, {
          fontSize: '12px', fontFamily: 'Nunito, Arial, sans-serif', color: '#FFD700',
          backgroundColor: '#0a0a1a', padding: { x: 4, y: 2 }, stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(depth + 5);
        els.push(hoverLabel);
      });
      icon.on('pointerout', () => { if (hoverLabel) { hoverLabel.destroy(); hoverLabel = null; } });
      icon.on('pointerdown', (p) => {
        if (!p.primaryDown) return;
        onClickFn(stack.itemId, stack.count);
      });
    });

    return els;
  }

  openStorage() {
    this.storageOpen = true;
    this.player.setVelocity(0, 0);
    const ps = this.playerState;
    this.storageUIElements = [];
    const add = (obj) => { this.storageUIElements.push(obj); return obj; };

    // Full overlay
    add(this.add.rectangle(400, 300, 800, 600, 0x000000, 0.85).setDepth(99));
    add(this.add.rectangle(400, 300, 760, 560, 0x0a0a1a, 0.98).setDepth(100).setStrokeStyle(2, 0x4a4a8a));

    // Title
    add(this.add.text(400, 24, 'DEPO', { fontSize: '20px', fontFamily: 'Nunito, Arial, sans-serif', color: '#DEB887', fontStyle: 'bold' }).setOrigin(0.5).setDepth(101));

    // Left: Inventory
    add(this.add.text(190, 55, `Envanter (${ps.getUsedSlots()}/${ps.maxInventory})`, {
      fontSize: '15px', fontFamily: 'Nunito, Arial, sans-serif', color: '#cc99ff', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(103));

    const invEls = this.buildStackedGrid(ps.inventory, 45, 85, 7, 10, 38, 101, (itemId, stackCount) => {
      const doTransfer = (qty) => {
        let moved = 0;
        for (let i = 0; i < qty; i++) {
          if (ps.removeItem(itemId) && ps.addToStorage(itemId)) moved++;
          else break;
        }
        if (moved > 0) { this.closeStorage(); this.openStorage(); }
      };
      if (stackCount > 1) {
        this.showQtyInput(0, 0, stackCount, doTransfer);
      } else {
        doTransfer(1);
      }
    }, 'inventory');
    invEls.forEach(e => this.storageUIElements.push(e));

    // Divider
    add(this.add.rectangle(395, 310, 3, 490, 0x5555aa).setDepth(101));

    // Right: Storage with pagination (2 pages × 100 slots)
    const page = this.storagePage || 0;
    const totalPages = 2;
    add(this.add.text(600, 55, `Depo (${ps.storage.length}/${ps.maxStorage})`, {
      fontSize: '15px', fontFamily: 'Nunito, Arial, sans-serif', color: '#cc99ff', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(103));

    // Filter storage items by page — page 0: grid rows 0-9, page 1: grid rows 10-19
    const pageRowStart = page * 10;
    const pageRowEnd = pageRowStart + 10;
    const pageItems = ps.storage.filter(entry => {
      const gridEntry = ps.storageGrid.find(g => g.entry === entry);
      if (!gridEntry) return page === 0; // ungridded items show on page 1
      return gridEntry.row >= pageRowStart && gridEntry.row < pageRowEnd;
    });

    const stoEls = this.buildStackedGrid(pageItems, 420, 85, 10, 10, 38, 101, (itemId, stackCount) => {
      const doTransfer = (qty) => {
        let moved = 0;
        for (let i = 0; i < qty; i++) {
          if (ps.removeFromStorage(itemId) && ps.addItem(itemId)) moved++;
          else break;
        }
        if (moved > 0) { this.closeStorage(); this.openStorage(); }
      };
      if (stackCount > 1) {
        this.showQtyInput(0, 0, stackCount, doTransfer);
      } else {
        doTransfer(1);
      }
    }, 'storage', pageRowStart);
    stoEls.forEach(e => this.storageUIElements.push(e));

    // Page navigation buttons
    const pageY = 575;
    const prevBtn = add(this.add.text(540, pageY, '◄', {
      fontSize: '18px', fontFamily: 'Nunito, Arial, sans-serif', color: page > 0 ? '#88aaff' : '#333',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(102).setInteractive({ useHandCursor: page > 0 }));
    if (page > 0) prevBtn.on('pointerdown', () => { this.storagePage--; this.closeStorage(); this.openStorage(); });

    add(this.add.text(600, pageY, `Sayfa ${page + 1}/${totalPages}`, {
      fontSize: '14px', fontFamily: 'Nunito, Arial, sans-serif', color: '#aaaacc'
    }).setOrigin(0.5).setDepth(102));

    const nextBtn = add(this.add.text(660, pageY, '►', {
      fontSize: '18px', fontFamily: 'Nunito, Arial, sans-serif', color: page < totalPages - 1 ? '#88aaff' : '#333',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(102).setInteractive({ useHandCursor: page < totalPages - 1 }));
    if (page < totalPages - 1) nextBtn.on('pointerdown', () => { this.storagePage++; this.closeStorage(); this.openStorage(); });

    // Close button
    const closeBtn = add(this.add.text(760, 24, 'X', {
      fontSize: '20px', fontFamily: 'Nunito, Arial, sans-serif', color: '#FF6666', fontStyle: 'bold',
      backgroundColor: '#2a0a0a', padding: { x: 8, y: 3 }
    }).setOrigin(0.5).setDepth(102).setInteractive({ useHandCursor: true }));
    closeBtn.on('pointerdown', () => this.closeStorage());

    add(this.add.text(190, pageY, 'Kapat', { fontSize: '12px', fontFamily: 'Nunito, Arial, sans-serif', color: '#555' }).setOrigin(0.5).setDepth(101));
  }

  closeStorage() {
    this.cleanupQtyInput();
    this.storageOpen = false;
    if (this.storageUIElements) {
      this.storageUIElements.forEach(e => { if (e && e.destroy) e.destroy(); });
      this.storageUIElements = null;
    }
    this.children.list.filter(c => c.depth >= 99 && c.depth <= 110).forEach(c => c.destroy());
  }

  showQtyInput(x, y, maxQty, callback) {
    this.cleanupQtyInput();
    const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.5).setDepth(150).setInteractive();
    const popup = this.add.rectangle(400, 280, 240, 160, 0x1a1a3a, 0.98).setDepth(151).setStrokeStyle(2, 0x6a5aaa);
    const title = this.add.text(400, 230, 'Miktar Gir', { fontSize: '16px', fontFamily: 'Nunito, Arial, sans-serif', color: '#DEB887', fontStyle: 'bold' }).setOrigin(0.5).setDepth(152);
    const maxLabel = this.add.text(400, 252, `(Max: ${maxQty})`, { fontSize: '12px', fontFamily: 'Nunito, Arial, sans-serif', color: '#888' }).setOrigin(0.5).setDepth(152);

    const canvas = this.sys.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const inp = document.createElement('input');
    inp.type = 'number'; inp.min = '1'; inp.max = String(maxQty); inp.value = String(maxQty);
    inp.style.cssText = `position:fixed;left:${rect.left + rect.width / 2 - 40}px;top:${rect.top + rect.height * 0.47 - 12}px;width:80px;height:24px;font-size:16px;text-align:center;background:#0a0a2a;color:#fff;border:1px solid #6a5aaa;border-radius:4px;z-index:9999;font-family:Nunito,Arial,sans-serif;`;
    document.body.appendChild(inp);
    this.qtyInput = inp;
    setTimeout(() => { inp.focus(); inp.select(); }, 50);

    const okBtn = this.add.text(360, 320, 'Tamam', { fontSize: '14px', fontFamily: 'Nunito, Arial, sans-serif', color: '#88ff88', fontStyle: 'bold', backgroundColor: '#1a3a1a', padding: { x: 10, y: 4 } }).setOrigin(0.5).setDepth(152).setInteractive({ useHandCursor: true });
    const cancelBtn = this.add.text(440, 320, 'İptal', { fontSize: '14px', fontFamily: 'Nunito, Arial, sans-serif', color: '#ff8888', fontStyle: 'bold', backgroundColor: '#3a1a1a', padding: { x: 10, y: 4 } }).setOrigin(0.5).setDepth(152).setInteractive({ useHandCursor: true });

    const doConfirm = () => {
      let qty = parseInt(inp.value) || 1;
      qty = Math.max(1, Math.min(qty, maxQty));
      this.cleanupQtyInput();
      callback(qty);
    };

    okBtn.on('pointerdown', doConfirm);
    cancelBtn.on('pointerdown', () => this.cleanupQtyInput());
    overlay.on('pointerdown', () => this.cleanupQtyInput());
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doConfirm();
      if (e.key === 'Escape') this.cleanupQtyInput();
    });

    this._qtyPopupElements = [overlay, popup, title, maxLabel, okBtn, cancelBtn];
  }

  cleanupQtyInput() {
    if (this.qtyInput) { this.qtyInput.remove(); this.qtyInput = null; }
    if (this._qtyPopupElements) {
      this._qtyPopupElements.forEach(e => { if (e && e.destroy) e.destroy(); });
      this._qtyPopupElements = null;
    }
  }
}
