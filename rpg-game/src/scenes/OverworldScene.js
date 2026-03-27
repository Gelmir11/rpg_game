import Phaser from 'phaser';
import { PlayerState, formatGold } from '../systems/PlayerState.js';
import { MONSTERS } from '../data/monsters.js';
import { ITEMS, LOOT_TABLES } from '../data/items.js';
import { NPCS, QUESTS } from '../data/quests.js';
import { SkillSystem } from '../systems/SkillSystem.js';
import { CombatUtils } from '../systems/CombatUtils.js';
import { BossPatternSystem } from '../systems/BossPatterns.js';
import { AudioManager } from '../systems/AudioManager.js';

export class OverworldScene extends Phaser.Scene {
  constructor() {
    super('OverworldScene');
  }

  create() {
    this.playerState = PlayerState.getInstance();
    this.attackCooldown = 0;
    this.autoAttackRange = 80;
    this.skillSystem = new SkillSystem(this);
    this.combatUtils = new CombatUtils(this);
    this.bossPatterns = new BossPatternSystem(this);
    this.audio = AudioManager.getInstance();

    // Initialize audio on first user interaction
    this.input.once('pointerdown', () => this.audio.init());
    this.input.keyboard.once('keydown', () => this.audio.init());

    // Village safe zone bounds (center of map)
    this.villageBounds = { x: 250, y: 150, w: 520, h: 440 };

    this.createMap();
    this.createVillageZone();
    this.createPlayer();
    // Bind house colliders to player after player is created
    if (this.houseColliders) {
      this.houseColliders.forEach(hc => this.physics.add.collider(this.player, hc));
    }
    this.createMonsters();
    this.createNPCs();
    this.createResources();
    this.createPortals();
    this.setupCamera();
    this.setupInput();
    this.createAmbientParticles();
    this.createFogOfWar();

    // Event bus for UI communication
    this.events.on('shutdown', () => this.cleanup());
  }

  createMap() {
    const mapWidth = 150;
    const mapHeight = 150;
    const tileSize = 64;

    // Create tilemap data procedurally
    const mapData = [];
    const rng = new Phaser.Math.RandomDataGenerator(['duskhollow_overworld']);

    // River runs vertically at x=55-58, with curves
    const riverCenter = 55;
    const riverWidth = 4;
    const bridgeY1 = 30; // first bridge
    const bridgeY2 = 75; // second bridge
    const bridgeY3 = 110; // third bridge

    for (let y = 0; y < mapHeight; y++) {
      const row = [];
      // River curves slightly with sine wave
      const riverOff = Math.floor(Math.sin(y * 0.08) * 3);

      for (let x = 0; x < mapWidth; x++) {
        // Border walls
        if (x === 0 || y === 0 || x === mapWidth - 1 || y === mapHeight - 1) {
          row.push(32);
        }
        // River
        else if (x >= riverCenter + riverOff - 1 && x <= riverCenter + riverOff + riverWidth) {
          // Bridge openings (3 tiles tall each)
          if ((y >= bridgeY1 - 1 && y <= bridgeY1 + 1) ||
              (y >= bridgeY2 - 1 && y <= bridgeY2 + 1) ||
              (y >= bridgeY3 - 1 && y <= bridgeY3 + 1)) {
            row.push(8); // bridge (walkable dirt)
          } else {
            row.push(24 + rng.between(0, 3)); // water
          }
        }
        // Dirt paths connecting to bridges
        else if (((y >= bridgeY1 - 1 && y <= bridgeY1 + 1) ||
                  (y >= bridgeY2 - 1 && y <= bridgeY2 + 1) ||
                  (y >= bridgeY3 - 1 && y <= bridgeY3 + 1)) &&
                 x >= riverCenter + riverOff - 5 && x <= riverCenter + riverOff + riverWidth + 4) {
          row.push(8 + rng.between(0, 2)); // dirt path to bridge
        }
        // Default grass
        else {
          row.push(rng.between(0, 5));
        }
      }
      mapData.push(row);
    }

    // Create tilemap
    const map = this.make.tilemap({
      data: mapData,
      tileWidth: tileSize,
      tileHeight: tileSize,
    });

    const tileset = map.addTilesetImage('__default', 'tileset', tileSize, tileSize, 1, 2);
    const layer = map.createLayer(0, tileset, 0, 0);

    // Set collision for walls and water
    layer.setCollision([24, 25, 26, 27, 32, 33, 34, 35, 36, 37, 38, 39]);

    this.map = map;
    this.groundLayer = layer;
    this.mapWidth = mapWidth * tileSize;
    this.mapHeight = mapHeight * tileSize;

    // Set physics world bounds to match map size
    this.physics.world.setBounds(0, 0, this.mapWidth, this.mapHeight);

    // Draw bridge visuals over river
    const bridgeGfx = this.add.graphics().setDepth(4);
    const bridges = [bridgeY1, bridgeY2, bridgeY3];
    const bridgeNames = ['Kuzey Köprüsü', 'Orta Köprü', 'Güney Köprüsü'];

    bridges.forEach((by, idx) => {
      const riverOff = Math.floor(Math.sin(by * 0.08) * 3);
      const bStartX = (riverCenter + riverOff - 3) * tileSize;
      const bEndX = (riverCenter + riverOff + riverWidth + 3) * tileSize;
      const bTop = (by - 1) * tileSize;
      const bH = 3 * tileSize;

      // Bridge planks (horizontal)
      for (let px = bStartX; px < bEndX; px += 14) {
        bridgeGfx.fillStyle(0x6a4a2a);
        bridgeGfx.fillRect(px, bTop, 12, bH);
        bridgeGfx.fillStyle(0x7a5a3a);
        bridgeGfx.fillRect(px + 1, bTop + 2, 10, bH - 4);
        bridgeGfx.lineStyle(1, 0x5a3a1a, 0.3);
        bridgeGfx.lineBetween(px + 6, bTop, px + 6, bTop + bH);
      }

      // Rails
      bridgeGfx.fillStyle(0x5a3a1a);
      bridgeGfx.fillRect(bStartX, bTop - 4, bEndX - bStartX, 4);
      bridgeGfx.fillRect(bStartX, bTop + bH, bEndX - bStartX, 4);

      // Rail posts
      for (let pp = bStartX + 20; pp < bEndX - 10; pp += tileSize * 2) {
        bridgeGfx.fillStyle(0x4a2a0a);
        bridgeGfx.fillRect(pp, bTop - 14, 6, 18);
        bridgeGfx.fillRect(pp, bTop + bH - 4, 6, 18);
      }

      // Label
      this.add.text((bStartX + bEndX) / 2, bTop - 22, bridgeNames[idx], {
        fontSize: '20px', fontFamily: 'Nunito, Arial, sans-serif', color: '#8a6a3a',
        fontStyle: 'bold', stroke: '#000', strokeThickness: 4
      }).setOrigin(0.5).setDepth(9999);
    });
  }

  createVillageZone() {
    const vb = this.villageBounds;

    // Village ground (lighter, warmer grass - elliptical)
    const villageGround = this.add.graphics();
    villageGround.fillStyle(0x3a5a3a, 0.3);
    villageGround.fillEllipse(vb.x + vb.w / 2, vb.y + vb.h / 2, vb.w + 20, vb.h + 20);
    villageGround.setDepth(1);

    // ===== CIRCULAR WOODEN STAKE FENCE (touching) =====
    const cx = vb.x + vb.w / 2;
    const cy = vb.y + vb.h / 2;
    const radiusX = vb.w / 2 + 10;
    const radiusY = vb.h / 2 + 10;
    // Calculate exact count so stakes touch (stake width ~8px, ellipse perimeter)
    const ellipsePerimeter = Math.PI * (3 * (radiusX + radiusY) - Math.sqrt((3 * radiusX + radiusY) * (radiusX + 3 * radiusY)));
    const stakeSpacing = 7; // pixels between stake centers (stake is 10px wide, overlap slightly)
    const stakeCount = Math.floor(ellipsePerimeter / stakeSpacing);

    this.fenceAngles = [];
    for (let i = 0; i < stakeCount; i++) {
      const angle = (i / stakeCount) * Math.PI * 2;
      // Skip gate area
      if (angle > 1.4 && angle < 1.75) continue;
      const fx = cx + Math.cos(angle) * radiusX;
      const fy = cy + Math.sin(angle) * radiusY;
      this.add.image(fx, fy, 'fence_post').setDepth(fy);
      this.fenceAngles.push({ x: fx, y: fy });
    }

    // Crossbar rope connecting stakes (elliptical)
    const fenceBar = this.add.graphics().setDepth(3);
    fenceBar.lineStyle(2, 0x5a3a1a, 0.5);
    // Inner ring
    fenceBar.beginPath();
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      if (a > 1.35 && a < 1.8) { fenceBar.moveTo(cx + Math.cos(1.8) * (radiusX - 2), cy + Math.sin(1.8) * (radiusY - 2)); continue; }
      const px = cx + Math.cos(a) * (radiusX - 2);
      const py = cy + Math.sin(a) * (radiusY - 2) + 8;
      if (i === 0) fenceBar.moveTo(px, py); else fenceBar.lineTo(px, py);
    }
    fenceBar.strokePath();
    // Outer ring
    fenceBar.beginPath();
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      if (a > 1.35 && a < 1.8) { fenceBar.moveTo(cx + Math.cos(1.8) * (radiusX + 2), cy + Math.sin(1.8) * (radiusY + 2)); continue; }
      const px = cx + Math.cos(a) * (radiusX + 2);
      const py = cy + Math.sin(a) * (radiusY + 2) + 16;
      if (i === 0) fenceBar.moveTo(px, py); else fenceBar.lineTo(px, py);
    }
    fenceBar.strokePath();

    // ===== GATE (bottom of ellipse) =====
    this.gateX = cx;
    this.gateY = cy + radiusY;
    this.gate = this.add.image(this.gateX, this.gateY, 'gate_closed').setDepth(this.gateY + 2);
    this.gateOpen = false;

    // Gate trigger zone (larger area to detect approach)
    this.gateZone = this.add.zone(this.gateX, this.gateY, 80, 60);
    this.physics.world.enable(this.gateZone);
    this.gateZone.body.setAllowGravity(false);

    // ===== VILLAGE HOUSES (placed along fence, not overlapping NPCs/portals) =====
    this.houseColliders = [];
    const housePositions = [
      { tex: 'house1', angle: -Math.PI * 0.85 },  // top-left
      { tex: 'house2', angle: -Math.PI * 0.35 },  // top-right
      { tex: 'house1', angle: Math.PI * 0.15 },    // right
      { tex: 'house3', angle: -Math.PI },           // left
      { tex: 'house1', angle: Math.PI * 0.65 },    // bottom-right (skip gate ~PI/2)
      { tex: 'house2', angle: -Math.PI * 0.55 },   // upper-left
    ];
    const houseRadius = Math.min(radiusX, radiusY) * 0.7;

    housePositions.forEach(hp => {
      const hx = cx + Math.cos(hp.angle) * houseRadius;
      const hy = cy + Math.sin(hp.angle) * houseRadius * 0.8;

      const house = this.add.image(hx, hy, hp.tex).setDepth(hy);
      const hBlock = this.physics.add.staticSprite(hx, hy + 16).setVisible(false);
      hBlock.body.setSize(50, 20);
      this.houseColliders.push(hBlock);
    });

    // Village label
    this.add.text(cx, cy - radiusY - 20, 'Alacakaranlık Köyü', {
      fontSize: '40px', fontFamily: 'Nunito, Arial, sans-serif', color: '#DAA520',
      stroke: '#000', strokeThickness: 6
    }).setOrigin(0.5).setDepth(9999);

    // ===== INVISIBLE WALLS for monsters (elliptical) =====
    this.villageWalls = this.physics.add.staticGroup();
    const wallCount = 24;
    for (let i = 0; i < wallCount; i++) {
      const angle = (i / wallCount) * Math.PI * 2;
      // Skip gate area
      if (angle > 1.3 && angle < 1.85) continue;
      const wx = cx + Math.cos(angle) * radiusX;
      const wy = cy + Math.sin(angle) * radiusY;
      const wall = this.add.zone(wx, wy, 30, 30);
      this.physics.world.enable(wall, Phaser.Physics.Arcade.STATIC_BODY);
      this.villageWalls.add(wall);
    }
  }

  createPlayer() {
    const startX = this.playerState.lastX || 400;
    const startY = this.playerState.lastY || 400;

    // Base body (underwear)
    const playerTex = this.playerState.gender === 'female' ? 'player_female' : 'player';
    this.player = this.physics.add.sprite(startX, startY, playerTex, 0);
    this.player.setSize(28, 28);
    this.player.setOffset(18, 60);
    this.player.setDepth(10);
    this.player.setCollideWorldBounds(true);

    // Equipment overlay sprites (follow player)
    this.equipSprites = {};
    const slots = ['legs', 'chest', 'arms', 'belt', 'head', 'weapon', 'necklace', 'earring'];
    slots.forEach(slot => {
      const suffix = this.playerState.gender === 'female' ? '_f' : '';
      const spr = this.add.sprite(startX, startY, `equip_${slot}${suffix}`, 0);
      spr.setDepth(11);
      spr.setVisible(false);
      this.equipSprites[slot] = spr;
    });

    // Collision with map
    this.physics.add.collider(this.player, this.groundLayer);

    // Player animations
    if (!this.anims.exists('walk_down')) {
      this.anims.create({ key: 'walk_down', frames: [{ key: playerTex, frame: 0 }, { key: playerTex, frame: 1 }], frameRate: 6, repeat: -1 });
      this.anims.create({ key: 'walk_left', frames: [{ key: playerTex, frame: 2 }, { key: playerTex, frame: 3 }], frameRate: 6, repeat: -1 });
      this.anims.create({ key: 'walk_right', frames: [{ key: playerTex, frame: 4 }, { key: playerTex, frame: 5 }], frameRate: 6, repeat: -1 });
      this.anims.create({ key: 'walk_up', frames: [{ key: playerTex, frame: 6 }, { key: playerTex, frame: 7 }], frameRate: 6, repeat: -1 });
    }

    this.playerDirection = 'down';
    this.updateEquipVisuals();
  }

  updateEquipVisuals() {
    const ps = this.playerState;
    const slots = ['legs', 'chest', 'arms', 'belt', 'head', 'weapon', 'necklace', 'earring'];
    slots.forEach(slot => {
      const spr = this.equipSprites[slot];
      if (!spr) return;
      spr.setVisible(!!ps.equipped[slot]);
    });
  }

  drawPlayerBars() {
    if (!this.player || !this.player.active || !this.scene.isActive()) return;
    try {
      if (!this.playerBarsGfx || !this.playerBarsGfx.scene) {
        this.playerBarsGfx = this.add.graphics().setDepth(9990);
        this.playerNameText = this.add.text(0, 0, '', {
          fontSize: '20px', fontFamily: 'Nunito, Arial, sans-serif', color: '#ddd', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(9991);
      }
    } catch (e) { return; }
    const g = this.playerBarsGfx;
    g.clear();

    const ps = this.playerState;
    const px = this.player.x;
    const py = this.player.y - 65;
    const barW = 60, barH = 6, gap = 2;

    // Name
    this.playerNameText.setPosition(px, py - 22);
    this.playerNameText.setText(`${ps.playerName || 'Kahraman'} Lv.${ps.level}`);

    // HP bar
    const hpY = py - 8;
    g.fillStyle(0x000000, 0.6); g.fillRect(px - barW / 2, hpY, barW, barH);
    const hpRatio = ps.hp / ps.getMaxHp();
    g.fillStyle(hpRatio > 0.5 ? 0x00CC00 : hpRatio > 0.25 ? 0xCCCC00 : 0xCC0000);
    g.fillRect(px - barW / 2, hpY, barW * hpRatio, barH);

    // MP bar
    const mpY = hpY + barH + gap;
    g.fillStyle(0x000000, 0.6); g.fillRect(px - barW / 2, mpY, barW, barH);
    const mpRatio = ps.mana / ps.getMaxMana();
    g.fillStyle(0x6a5acd);
    g.fillRect(px - barW / 2, mpY, barW * mpRatio, barH);
  }

  drawResourceBars() {
    if (!this.resourceBarGfx) {
      this.resourceBarGfx = this.add.graphics().setDepth(9985);
    }
    const g = this.resourceBarGfx;
    g.clear();

    const camX = this.cameras.main.scrollX;
    const camY = this.cameras.main.scrollY;
    const camW = this.cameras.main.width / this.cameras.main.zoom;
    const camH = this.cameras.main.height / this.cameras.main.zoom;

    this.resourceObjects.forEach(r => {
      if (!r || !r.active) return;
      // Hide resources in unexplored areas
      if (this.fogRevealed) {
        const fx = Math.floor(r.x / this.fogCellSize);
        const fy = Math.floor(r.y / this.fogCellSize);
        r.setVisible(this.fogRevealed.has(`${fx},${fy}`));
      }
      if (!r.visible) return;
      if (!r.hp || !r.maxHp) return;
      // Only draw if on screen
      if (r.x < camX - 50 || r.x > camX + camW + 50 || r.y < camY - 50 || r.y > camY + camH + 50) return;
      // Only draw if damaged
      if (r.hp >= r.maxHp) return;

      const ratio = r.hp / r.maxHp;
      const bw = 36, bh = 4;
      const bx = r.x - bw / 2;
      const by = r.y - (r.resourceType === 'tree' ? 50 : 20);

      g.fillStyle(0x000000, 0.6); g.fillRect(bx, by, bw, bh);
      g.fillStyle(ratio > 0.5 ? 0x00CC00 : ratio > 0.25 ? 0xCCCC00 : 0xCC0000);
      g.fillRect(bx, by, bw * ratio, bh);
    });
  }

  createMonsters() {
    this.monsterObjects = [];

    // Spawn monsters in different zones
    const spawns = [
      // Zone 1: Slime Ormanı (köy çevresi, 800-3000px)
      ...this.generateSpawns('slime', 60, 800, 200, 3000, 3000),
      ...this.generateSpawns('slime', 40, 200, 800, 2500, 2500),

      // Zone 2: Goblin Kampı (güneydoğu, 2500-5500px)
      ...this.generateSpawns('goblin', 50, 2500, 2500, 5500, 5500),
      ...this.generateSpawns('goblin', 30, 3000, 1500, 5000, 4000),

      // Zone 3: İskelet Mezarlığı (kuzeydoğu, 4500-7500px)
      ...this.generateSpawns('skeleton', 40, 4500, 500, 7500, 4000),
      ...this.generateSpawns('skeleton', 25, 5000, 1000, 7000, 3500),

      // Zone 4: Ork Kalesi (güneybatı, 5000-8000px)
      ...this.generateSpawns('orc', 35, 1000, 5000, 4500, 8500),
      ...this.generateSpawns('orc', 25, 2000, 5500, 5000, 8000),

      // Zone 5: Kurt Ormanı (kuzey, köy yakını)
      ...this.generateSpawns('wolf', 40, 200, 1500, 3000, 4000),
      ...this.generateSpawns('wolf', 30, 1500, 200, 4000, 2000),

      // Zone 6: Golem Vadisi (doğu, 6000-9000px)
      ...this.generateSpawns('golem', 25, 6000, 2000, 9000, 6000),
      ...this.generateSpawns('golem', 15, 7000, 1000, 9000, 5000),

      // Zone 7: Hayalet Bataklığı (kuzeybatı, 500-4000px)
      ...this.generateSpawns('wraith', 20, 500, 6000, 3000, 9000),
      ...this.generateSpawns('wraith', 15, 1000, 7000, 4000, 9000),

      // Zone 8: Ejder Yavrusu Yuvası (sağ alt köşe, 7000-9200px)
      ...this.generateSpawns('drake', 30, 7000, 7000, 9200, 9200),
      ...this.generateSpawns('drake', 20, 7500, 7500, 9000, 9000),
    ];

    // ===== BÖLGE BOSSLARI =====
    const zoneBosses = [
      { type: 'slime_king', x: 1500, y: 2100, label: 'Balçık Kralı' },
      { type: 'goblin_chief', x: 3700, y: 4100, label: 'Goblin Şefi' },
      { type: 'skeleton_lord', x: 5700, y: 2500, label: 'İskelet Lordu' },
      { type: 'orc_warlord', x: 2700, y: 7100, label: 'Ork Savaş Lordu' },
      { type: 'alpha_wolf', x: 2500, y: 3200, label: 'Alfa Kurt' },
      { type: 'crystal_golem', x: 7200, y: 4200, label: 'Kristal Golem' },
      { type: 'wraith_queen', x: 1700, y: 8100, label: 'Hayalet Kraliçe' },
      { type: 'drake_mother', x: 8200, y: 8200, label: 'Ejder Anası' },
    ];
    this._zoneBossLabels = {};
    zoneBosses.forEach(zb => {
      spawns.push({ type: zb.type, x: zb.x, y: zb.y });
      // Boss etiketi - monster'a bağlanacak
      const lbl = this.add.text(zb.x, zb.y - 50, `👑 ${zb.label}`, {
        fontSize: '22px', fontFamily: 'Nunito, Arial, sans-serif', color: '#FFD700',
        fontStyle: 'bold', stroke: '#000', strokeThickness: 4
      }).setOrigin(0.5).setDepth(9999).setAlpha(0.8);
      this._zoneBossLabels[zb.type] = lbl;
    });

    // Overworld Boss: Kadim Ejder (haritanın merkez-kuzeyinde)
    // Öldürülse bile sahne yüklendiğinde spawn olur (respawn 30dk)
    spawns.push({ type: 'ancient_dragon', x: 4800, y: 1500 });

    // Boss bölgesi etiketi
    this.add.text(4800, 1400, 'Kadim Ejder Yuvası', {
      fontSize: '36px', fontFamily: 'Nunito, Arial, sans-serif', color: '#FF4444',
      fontStyle: 'bold', stroke: '#000', strokeThickness: 5
    }).setOrigin(0.5).setDepth(9999).setAlpha(0.7);

    // Filter out spawns inside village
    const vb = this.villageBounds;
    const cx = vb.x + vb.w / 2;
    const cy = vb.y + vb.h / 2;
    const safeSpawns = spawns.filter(s => {
      const dx = (s.x - cx) / (vb.w / 2 + 80);
      const dy = (s.y - cy) / (vb.h / 2 + 80);
      return dx * dx + dy * dy > 1; // outside village ellipse
    });
    safeSpawns.forEach(s => this.spawnMonster(s.type, s.x, s.y));
  }

  generateSpawns(type, count, minX, minY, maxX, maxY) {
    // Clamp to map bounds with margin
    const margin = 200;
    const clampMaxX = Math.min(maxX, this.mapWidth - margin);
    const clampMaxY = Math.min(maxY, this.mapHeight - margin);
    const clampMinX = Math.max(minX, margin);
    const clampMinY = Math.max(minY, margin);
    const spawns = [];
    for (let i = 0; i < count; i++) {
      spawns.push({
        type,
        x: Phaser.Math.Between(clampMinX, clampMaxX),
        y: Phaser.Math.Between(clampMinY, clampMaxY)
      });
    }
    return spawns;
  }

  spawnMonster(type, x, y) {
    const data = MONSTERS[type];
    if (!data) return;

    const monster = this.physics.add.sprite(x, y, type, 0);
    monster.setSize(24, 24);
    monster.setDepth(9);
    monster.body.allowGravity = false;
    monster.body.immovable = false;
    monster.body.moves = true;

    // Monster data
    monster.monsterData = {
      ...data,
      currentHp: data.hp,
      spawnX: x,
      spawnY: y,
      wanderTimer: 0,
      wanderDir: { x: 0, y: 0 },
      isAggro: false,
      isDead: false
    };

    // Init boss patterns
    if ((data.isBoss || data.isZoneBoss) && this.bossPatterns) {
      this.bossPatterns.initBoss(monster);
    }

    // Simple animation
    if (!this.anims.exists(`${type}_idle`)) {
      this.anims.create({
        key: `${type}_idle`,
        frames: [{ key: type, frame: 0 }, { key: type, frame: 1 }],
        frameRate: 3,
        repeat: -1
      });
    }
    monster.play(`${type}_idle`);

    // HP bar
    const hpBar = this.add.graphics();
    monster.hpBar = hpBar;

    // Name label
    monster.nameLabel = this.add.text(x, y - monster.height / 2 - 22, `${data.name} Lv.${data.level}`, {
      fontSize: '22px', fontFamily: 'Nunito, Arial, sans-serif', color: '#ffcccc',
      fontStyle: 'bold', stroke: '#000', strokeThickness: 5
    }).setOrigin(0.5).setDepth(9997);

    // Bölge boss etiketi varsa monster'a bağla
    if (this._zoneBossLabels && this._zoneBossLabels[type]) {
      monster.bossLabel = this._zoneBossLabels[type];
    }

    // DO NOT add to a group - just track in array
    this.monsterObjects.push(monster);

    return monster;
  }

  createNPCs() {
    this.npcGroup = this.physics.add.staticGroup();
    this.npcObjects = [];

    const vb = this.villageBounds;
    const ncx = vb.x + vb.w / 2;
    const ncy = vb.y + vb.h / 2;
    // Place NPCs spread wide across village — away from portals
    const npcPositions = [
      { id: 'elder', key: 'npc_elder', x: ncx - 160, y: ncy - 120 },
      { id: 'healer', key: 'npc_healer', x: ncx + 160, y: ncy - 120 },
      { id: 'guard', key: 'npc_guard', x: ncx - 160, y: ncy + 100 },
      { id: 'shopkeeper', key: 'npc_shopkeeper', x: ncx + 160, y: ncy + 100 },
    ];

    npcPositions.forEach(pos => {
      const npc = this.physics.add.staticSprite(pos.x, pos.y, pos.key);
      npc.setSize(20, 24);
      npc.setDepth(9);
      npc.npcId = pos.id;
      npc.npcData = NPCS[pos.id];

      // Name label
      const label = this.add.text(pos.x, pos.y - 60, npc.npcData.name, {
        fontSize: '22px', fontFamily: 'Nunito, Arial, sans-serif', color: '#FFD700',
        fontStyle: 'bold', stroke: '#000', strokeThickness: 5
      }).setOrigin(0.5).setDepth(9999);
      npc.label = label;

      // Quest indicator
      const questMark = this.add.text(pos.x, pos.y - 82, '!', {
        fontSize: '28px', fontFamily: 'Nunito, Arial, sans-serif', color: '#FFD700',
        fontStyle: 'bold', stroke: '#000', strokeThickness: 5
      }).setOrigin(0.5).setDepth(9999);
      npc.questMark = questMark;
      questMark.setVisible(this.hasAvailableQuest(pos.id));

      this.npcGroup.add(npc);
      this.npcObjects.push(npc);
    });

    // NPC interaction overlap
    this.physics.add.overlap(this.player, this.npcGroup, (player, npc) => {
      this.nearNPC = npc;
    });
  }

  hasAvailableQuest(npcId) {
    const ps = this.playerState;
    return Object.values(QUESTS).some(q =>
      q.npc === npcId &&
      !ps.completedQuests[q.id] &&
      !ps.activeQuests[q.id] &&
      ps.level >= q.minLevel
    );
  }

  createResources() {
    this.resourceObjects = [];

    const rng = new Phaser.Math.RandomDataGenerator(['resources']);
    const vb = this.villageBounds;
    const vcx = vb.x + vb.w / 2;
    const vcy = vb.y + vb.h / 2;

    const isInVillage = (px, py) => {
      const dx = (px - vcx) / (vb.w / 2 + 40);
      const dy = (py - vcy) / (vb.h / 2 + 40);
      return dx * dx + dy * dy < 1;
    };

    // Trees
    for (let i = 0; i < 500; i++) {
      const x = rng.between(100, this.mapWidth - 100);
      const y = rng.between(100, this.mapHeight - 100);
      if (isInVillage(x, y)) continue;

      const tree = this.add.image(x, y, 'tree');
      tree.setDepth(y + 20);
      tree.resourceType = 'tree';
      tree.resourceItem = 'wood';
      tree.hp = 3;
      tree.maxHp = 3;
      this.resourceObjects.push(tree);
    }

    // Bushes (herbs)
    for (let i = 0; i < 350; i++) {
      const x = rng.between(100, this.mapWidth - 100);
      const y = rng.between(100, this.mapHeight - 100);
      if (isInVillage(x, y)) continue;

      const bush = this.add.image(x, y, 'bush');
      bush.setDepth(y);
      bush.resourceType = 'bush';
      bush.resourceItem = 'herb';
      bush.hp = 1;
      bush.maxHp = 1;
      this.resourceObjects.push(bush);
    }

    // Rocks
    for (let i = 0; i < 150; i++) {
      const x = rng.between(100, this.mapWidth - 100);
      const y = rng.between(100, this.mapHeight - 100);
      if (isInVillage(x, y)) continue;

      const rock = this.add.image(x, y, 'rock');
      rock.setDepth(y);
      rock.resourceType = 'rock';
      rock.resourceItem = 'stone';
      rock.hp = 2;
      rock.maxHp = 2;
      this.resourceObjects.push(rock);
    }
  }

  createPortals() {
    this.portalGroup = this.physics.add.staticGroup();
    const vb = this.villageBounds;
    const ncx = vb.x + vb.w / 2;
    const ncy = vb.y + vb.h / 2;

    // Generate portal textures
    const portalG = this.make.graphics({ x: 0, y: 0, add: false });
    portalG.fillStyle(0x1a0a2a);
    portalG.fillRect(0, 0, 32, 32);
    portalG.fillStyle(0x6a2aaa, 0.7);
    portalG.fillCircle(16, 16, 12);
    portalG.fillStyle(0x9a4aea, 0.5);
    portalG.fillCircle(16, 16, 7);
    portalG.generateTexture('portal_tex', 32, 32);
    portalG.destroy();

    const doorG = this.make.graphics({ x: 0, y: 0, add: false });
    doorG.fillStyle(0x2a2a2a);
    doorG.fillRect(0, 0, 32, 32);
    doorG.fillStyle(0x5a3a1a);
    doorG.fillRect(6, 2, 20, 28);
    doorG.fillStyle(0xdaa520);
    doorG.fillCircle(22, 16, 2);
    doorG.generateTexture('door_tex', 32, 32);
    doorG.destroy();

    // Dungeon entrance (underground cave)
    const dnX = 5500, dnY = 5500;
    const dnG = this.add.graphics().setDepth(5);
    // Cave opening
    dnG.fillStyle(0x3a3a3a); dnG.fillEllipse(dnX, dnY - 10, 50, 40);
    dnG.fillStyle(0x1a1a2a); dnG.fillEllipse(dnX, dnY - 8, 40, 30);
    dnG.fillStyle(0x0a0a1a); dnG.fillEllipse(dnX, dnY - 6, 30, 20);
    // Stalactites
    dnG.fillStyle(0x4a4a4a); dnG.fillTriangle(dnX - 12, dnY - 24, dnX - 8, dnY - 14, dnX - 16, dnY - 14);
    dnG.fillTriangle(dnX + 8, dnY - 26, dnX + 12, dnY - 16, dnX + 4, dnY - 16);
    // Purple glow
    dnG.fillStyle(0x6a2aaa, 0.3); dnG.fillCircle(dnX, dnY - 8, 14);
    // Steps going down
    dnG.fillStyle(0x3a3a3a); dnG.fillRect(dnX - 12, dnY + 4, 24, 6);
    dnG.fillStyle(0x2a2a2a); dnG.fillRect(dnX - 10, dnY + 10, 20, 6);

    const dungeonPortal = this.physics.add.staticSprite(dnX, dnY, 'portal_tex');
    dungeonPortal.setSize(40, 40).setDepth(5).setAlpha(0);
    dungeonPortal.targetScene = 'DungeonScene';
    this.portalGroup.add(dungeonPortal);

    const dungeonLocked = !this.playerState.hasBossKill('ancient_dragon');
    this.add.text(dnX, dnY - 36, dungeonLocked ? '🔒 Zindan' : 'Zindan', {
      fontSize: '32px', fontFamily: 'Nunito, Arial, sans-serif', color: dungeonLocked ? '#888888' : '#aa6aee',
      stroke: '#000', strokeThickness: 5
    }).setOrigin(0.5).setDepth(9999);
    if (dungeonLocked) {
      this.add.text(dnX, dnY + 20, 'Kadim Ejderi yen!', {
        fontSize: '16px', fontFamily: 'Nunito, Arial, sans-serif', color: '#FF6666',
        stroke: '#000', strokeThickness: 3
      }).setOrigin(0.5).setDepth(9999);
    }

    // Home entrance — centered, larger building
    const hpx = ncx, hpy = ncy;
    const hg = this.add.graphics().setDepth(5);
    // Building body (larger)
    hg.fillStyle(0x5a3a1a); hg.fillRoundedRect(hpx - 40, hpy - 60, 80, 76, 4);
    hg.fillStyle(0x6a4a2a); hg.fillRoundedRect(hpx - 38, hpy - 58, 76, 72, 3);
    // Log lines
    hg.lineStyle(1, 0x4a2a0a, 0.4);
    for (let ly = hpy - 54; ly < hpy + 10; ly += 9) hg.lineBetween(hpx - 38, ly, hpx + 38, ly);
    // Door
    hg.fillStyle(0x3a1a0a); hg.fillRoundedRect(hpx - 12, hpy - 24, 24, 36, 2);
    hg.fillStyle(0xDAA520); hg.fillCircle(hpx + 8, hpy - 8, 2.5);
    // Windows
    hg.fillStyle(0x3a5a7a); hg.fillRect(hpx - 34, hpy - 40, 16, 12);
    hg.lineStyle(1, 0x5a3a1a); hg.strokeRect(hpx - 34, hpy - 40, 16, 12);
    hg.lineBetween(hpx - 26, hpy - 40, hpx - 26, hpy - 28);
    hg.fillStyle(0x3a5a7a); hg.fillRect(hpx + 18, hpy - 40, 16, 12);
    hg.lineStyle(1, 0x5a3a1a); hg.strokeRect(hpx + 18, hpy - 40, 16, 12);
    hg.lineBetween(hpx + 26, hpy - 40, hpx + 26, hpy - 28);
    // Warm light from windows
    hg.fillStyle(0xFFD700, 0.15); hg.fillRect(hpx - 33, hpy - 39, 14, 10);
    hg.fillStyle(0xFFD700, 0.15); hg.fillRect(hpx + 19, hpy - 39, 14, 10);
    // Roof
    hg.fillStyle(0x8a7a40); hg.fillTriangle(hpx, hpy - 82, hpx - 48, hpy - 58, hpx + 48, hpy - 58);
    hg.fillStyle(0x9a8a50); hg.fillTriangle(hpx, hpy - 78, hpx - 44, hpy - 58, hpx + 44, hpy - 58);
    // Chimney
    hg.fillStyle(0x5a5a5a); hg.fillRect(hpx + 24, hpy - 86, 10, 20);
    hg.fillStyle(0x4a4a4a); hg.fillRect(hpx + 23, hpy - 88, 12, 4);
    // Sign on building
    hg.fillStyle(0x4a2a0a); hg.fillRoundedRect(hpx - 22, hpy - 54, 44, 18, 4);
    hg.fillStyle(0x6a4a2a); hg.fillRoundedRect(hpx - 20, hpy - 52, 40, 14, 3);
    this.add.text(hpx, hpy - 50, 'EV', {
      fontSize: '28px', fontFamily: 'Nunito, Arial, sans-serif', color: '#FFD700',
      fontStyle: 'bold', stroke: '#000', strokeThickness: 6
    }).setOrigin(0.5).setDepth(9999);
    const homePortal = this.physics.add.staticSprite(hpx, hpy - 6, 'door_tex');
    homePortal.setSize(50, 60); homePortal.setDepth(5).setAlpha(0);
    homePortal.targetScene = 'HomeScene';
    this.portalGroup.add(homePortal);

    // Labyrinth entrance (Golem Vadisi'nde)
    const labX = 7500, labY = 4000;
    const labG = this.add.graphics().setDepth(5);
    // Stone archway
    labG.fillStyle(0x5a5a50); labG.fillRect(labX - 24, labY - 40, 12, 50);
    labG.fillRect(labX + 12, labY - 40, 12, 50);
    labG.fillStyle(0x6a6a60); labG.fillRect(labX - 22, labY - 38, 8, 46);
    labG.fillRect(labX + 14, labY - 38, 8, 46);
    labG.fillStyle(0x5a5a50); labG.fillRoundedRect(labX - 28, labY - 46, 56, 12, 4);
    labG.fillStyle(0x7a7a70); labG.fillRect(labX - 10, labY - 30, 20, 36);
    labG.fillStyle(0x1a1a2a); labG.fillRect(labX - 8, labY - 28, 16, 32);
    // Rune glow
    labG.fillStyle(0x44AAFF, 0.3); labG.fillCircle(labX, labY - 14, 8);
    const labLocked = !this.playerState.hasBossKill('ancient_dragon');
    this.add.text(labX, labY - 56, labLocked ? '🔒 Labirent' : 'Labirent', {
      fontSize: '32px', fontFamily: 'Nunito, Arial, sans-serif', color: labLocked ? '#888888' : '#8B8B83',
      fontStyle: 'bold', stroke: '#000', strokeThickness: 5
    }).setOrigin(0.5).setDepth(9999);
    if (labLocked) {
      this.add.text(labX, labY + 20, 'Kadim Ejderi yen!', {
        fontSize: '16px', fontFamily: 'Nunito, Arial, sans-serif', color: '#FF6666',
        stroke: '#000', strokeThickness: 3
      }).setOrigin(0.5).setDepth(9999);
    }

    const labPortal = this.physics.add.staticSprite(labX, labY - 10, 'portal_tex');
    labPortal.setSize(40, 50).setDepth(5).setAlpha(0);
    labPortal.targetScene = 'LabyrinthScene';
    this.portalGroup.add(labPortal);

    // Shop removed — Tüccar NPC handles buy/sell directly

    // Portal overlap
    this.physics.add.overlap(this.player, this.portalGroup, (player, portal) => {
      this.nearPortal = portal;
    });
  }

  setupCamera() {
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight);
    this.cameras.main.setBackgroundColor('#0a0a1a');
    // Zoom out for wider view
    this.cameras.main.setZoom(0.6);

    // Twilight overlay
    this.twilightOverlay = this.add.rectangle(this.mapWidth / 2, this.mapHeight / 2, this.mapWidth, this.mapHeight, 0x1a0a2a, 0.08).setDepth(45).setScrollFactor(1);
  }

  setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    // E key for interact
    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    // I key for inventory
    this.invKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K);
    // F key for harvest resources
    this.harvestKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);

    // T key for teleport to town
    this.input.keyboard.on('keydown-T', () => this.teleportToTown());

    // Skill keys 1-4
    this.input.keyboard.on('keydown-ONE', () => this.useSkillSlot(0));
    this.input.keyboard.on('keydown-TWO', () => this.useSkillSlot(1));
    this.input.keyboard.on('keydown-THREE', () => this.useSkillSlot(2));
    this.input.keyboard.on('keydown-FOUR', () => this.useSkillSlot(3));

    // Mouse click-to-move + click-to-interact
    this.moveTarget = null;
    this.input.on('pointerdown', (pointer) => {
      const worldX = pointer.worldX;
      const worldY = pointer.worldY;

      // Check if clicked on NPC
      let clickedNPC = null;
      this.npcObjects.forEach(npc => {
        if (Phaser.Math.Distance.Between(worldX, worldY, npc.x, npc.y) < 50) {
          clickedNPC = npc;
        }
      });

      // Check if clicked on portal
      let clickedPortal = null;
      this.portalGroup.children.entries.forEach(portal => {
        if (Phaser.Math.Distance.Between(worldX, worldY, portal.x, portal.y) < 50) {
          clickedPortal = portal;
        }
      });

      // Set move target — walk there, then interact if needed
      this.moveTarget = {
        x: worldX,
        y: worldY,
        npc: clickedNPC,
        portal: clickedPortal
      };
    });
  }

  createAmbientParticles() {
    // Twilight floating particles
    this.add.particles(0, 0, 'particle_twilight', {
      x: { min: 0, max: this.mapWidth },
      y: { min: 0, max: this.mapHeight },
      lifespan: 6000,
      speed: { min: 3, max: 12 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.4, end: 0 },
      frequency: 500,
      blendMode: 'ADD'
    }).setDepth(50);

    // Zone labels on map
    const zoneStyle = { fontSize: '36px', fontFamily: 'Nunito, Arial, sans-serif', fontStyle: 'bold', stroke: '#000', strokeThickness: 5 };
    this.add.text(1800, 1800, 'Balçık Ormanı', { ...zoneStyle, color: '#44AA44' }).setOrigin(0.5).setDepth(9999).setAlpha(0.6);
    this.add.text(4000, 3500, 'Goblin Kampı', { ...zoneStyle, color: '#3CB371' }).setOrigin(0.5).setDepth(9999).setAlpha(0.6);
    this.add.text(6000, 2000, 'İskelet Mezarlığı', { ...zoneStyle, color: '#CCCCAA' }).setOrigin(0.5).setDepth(9999).setAlpha(0.6);
    this.add.text(3000, 6500, 'Ork Kalesi', { ...zoneStyle, color: '#6B8E23' }).setOrigin(0.5).setDepth(9999).setAlpha(0.6);
    this.add.text(1800, 2800, 'Kurt Ormanı', { ...zoneStyle, color: '#808080' }).setOrigin(0.5).setDepth(9999).setAlpha(0.6);
    this.add.text(7500, 3500, 'Golem Vadisi', { ...zoneStyle, color: '#8B8B83' }).setOrigin(0.5).setDepth(9999).setAlpha(0.6);
    this.add.text(2000, 7500, 'Hayalet Bataklığı', { ...zoneStyle, color: '#9370DB' }).setOrigin(0.5).setDepth(9999).setAlpha(0.6);
    this.add.text(8100, 8000, 'Ejder Yavrusu Yuvası', { ...zoneStyle, color: '#CC3300' }).setOrigin(0.5).setDepth(9999).setAlpha(0.6);
  }

  createFogOfWar() {
    // Grid-based fog: each cell = 64px (1 tile)
    this.fogCellSize = 64;
    this.fogCols = Math.ceil(this.mapWidth / this.fogCellSize);
    this.fogRows = Math.ceil(this.mapHeight / this.fogCellSize);

    // Load saved fog data or create new
    const ps = this.playerState;
    this.fogRevealed = new Set(ps.fogData || []);

    // Create fog render texture covering entire map
    this.fogGraphics = this.add.graphics().setDepth(55);

    // Reveal village area initially
    const vb = this.villageBounds;
    for (let fy = Math.floor(vb.y / this.fogCellSize) - 1; fy <= Math.ceil((vb.y + vb.h) / this.fogCellSize) + 1; fy++) {
      for (let fx = Math.floor(vb.x / this.fogCellSize) - 1; fx <= Math.ceil((vb.x + vb.w) / this.fogCellSize) + 1; fx++) {
        this.fogRevealed.add(`${fx},${fy}`);
      }
    }

    this.updateFog();
  }

  updateFog() {
    // Reveal cells around player (radius of 4 cells)
    const px = Math.floor(this.player.x / this.fogCellSize);
    const py = Math.floor(this.player.y / this.fogCellSize);
    const radius = 4;

    let changed = false;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radius * radius) {
          const key = `${px + dx},${py + dy}`;
          if (!this.fogRevealed.has(key)) {
            this.fogRevealed.add(key);
            changed = true;
          }
        }
      }
    }

    // Save fog data to PlayerState when changed
    if (changed) {
      this.playerState.fogData = Array.from(this.fogRevealed);
    }

    if (changed || !this._fogDrawn) {
      this._fogDrawn = true;
      this.fogGraphics.clear();
      this.fogGraphics.fillStyle(0x000000, 0.85);

      for (let fy = 0; fy < this.fogRows; fy++) {
        for (let fx = 0; fx < this.fogCols; fx++) {
          if (!this.fogRevealed.has(`${fx},${fy}`)) {
            this.fogGraphics.fillRect(
              fx * this.fogCellSize,
              fy * this.fogCellSize,
              this.fogCellSize,
              this.fogCellSize
            );
          }
        }
      }
    }
  }

  updateGate() {
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.gateX, this.gateY);
    if (dist < 60 && !this.gateOpen) {
      this.gateOpen = true;
      this.gate.setTexture('gate_open');
      // Quick scale animation for opening feel
      this.tweens.add({ targets: this.gate, scaleX: 1.1, scaleY: 1.1, duration: 100, yoyo: true });
    } else if (dist >= 80 && this.gateOpen) {
      this.gateOpen = false;
      this.gate.setTexture('gate_closed');
      this.tweens.add({ targets: this.gate, scaleX: 1.1, scaleY: 1.1, duration: 100, yoyo: true });
    }
  }

  update(time, delta) {
    if (!this.player || !this.player.active || !this.scene.isActive()) return;
    this.handleMovement();
    this.handleAutoAttack(time);
    this.handleResourceHarvest();
    this.handleInteraction();
    this.updateMonsters(time, delta);
    this.updateMonsterHPBars();
    this.checkPortals();
    this.playerState.updateBuffs();
    this.playerState.regenMana(delta);
    if (this.combatUtils) {
      this.combatUtils.checkProjectileCollisions(this.monsterObjects);
      this.combatUtils.updateMonsterEffects(this.monsterObjects);
    }
    if (this.bossPatterns) {
      this.bossPatterns.update(this.player, this.monsterObjects);
    }
    this.updateFog();
    this.updateGate();
    this.updateEquipVisuals();
    this.drawPlayerBars();
    this.drawResourceBars();

    // Update player depth for correct sorting
    this.player.setDepth(this.player.y + 10);

    // Sync equipment overlays with player
    if (this.equipSprites) {
      const frame = this.player.frame ? this.player.frame.name : 0;
      Object.values(this.equipSprites).forEach(spr => {
        spr.setPosition(this.player.x, this.player.y);
        spr.setDepth(this.player.depth + 1);
        spr.setFrame(frame);
        spr.setFlipX(this.player.flipX);
      });
    }

    // Reset near objects
    this.nearNPC = null;
    this.nearPortal = null;

    // Save position
    this.playerState.lastX = this.player.x;
    this.playerState.lastY = this.player.y;
    this.playerState.lastScene = 'OverworldScene';

    // Auto-pickup loot when walking near (if inventory has space, skip player-dropped items)
    if (this.lootOnGround && this.playerState.getUsedSlots() < this.playerState.maxInventory) {
      this.lootOnGround.forEach(l => {
        if (!l.sprite || !l.sprite.active) return;
        if (l.droppedByPlayer) return; // skip player drops — only F or click
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, l.x, l.y);
        if (dist < 60) l.pickup();
      });
    }

    // F key: pickup nearest loot (even if auto didn't trigger)
    if (this.harvestKey.isDown && this.lootOnGround && this.time.now > (this._lastLootPickup || 0) + 300) {
      let closest = null, closestDist = 120;
      this.lootOnGround.forEach(l => {
        if (!l.sprite || !l.sprite.active) return;
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, l.x, l.y);
        if (dist < closestDist) { closestDist = dist; closest = l; }
      });
      if (closest) { closest.pickup(); this._lastLootPickup = this.time.now; }
    }

    // Auto-save every 10 seconds
    if (!this._lastAutoSave || time > this._lastAutoSave + 10000) {
      this._lastAutoSave = time;
      this.playerState.save();
    }

    // Emit UI updates
    this.scene.get('UIScene')?.events?.emit('updateUI');
  }

  handleMovement() {
    const speed = this.playerState.speed;
    let vx = 0, vy = 0;
    let keyboardUsed = false;

    // Keyboard movement (WASD / arrows)
    if (this.cursors.left.isDown || this.wasd.left.isDown) { vx = -speed; this.playerDirection = 'left'; keyboardUsed = true; }
    else if (this.cursors.right.isDown || this.wasd.right.isDown) { vx = speed; this.playerDirection = 'right'; keyboardUsed = true; }
    if (this.cursors.up.isDown || this.wasd.up.isDown) { vy = -speed; this.playerDirection = 'up'; keyboardUsed = true; }
    else if (this.cursors.down.isDown || this.wasd.down.isDown) { vy = speed; this.playerDirection = 'down'; keyboardUsed = true; }

    // Cancel mouse move if keyboard is used
    if (keyboardUsed) {
      this.moveTarget = null;
    }

    // Mouse click-to-move
    if (!keyboardUsed && this.moveTarget) {
      const tx = this.moveTarget.x;
      const ty = this.moveTarget.y;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, tx, ty);

      // Arrived at target?
      const arriveThreshold = this.moveTarget.npc || this.moveTarget.portal ? 60 : 15;

      if (dist < arriveThreshold) {
        // Arrived — interact if needed
        if (this.moveTarget.npc) {
          this.interactWithNPC(this.moveTarget.npc);
        } else if (this.moveTarget.portal) {
          this.enterPortal(this.moveTarget.portal);
        }
        this.moveTarget = null;
      } else {
        // Move toward target
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, tx, ty);
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;

        // Determine direction for animation
        if (Math.abs(vx) > Math.abs(vy)) {
          this.playerDirection = vx < 0 ? 'left' : 'right';
        } else {
          this.playerDirection = vy < 0 ? 'up' : 'down';
        }
      }
    }

    // Normalize diagonal
    if (vx !== 0 && vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      vx = (vx / len) * speed;
      vy = (vy / len) * speed;
    }

    this.player.setVelocity(vx, vy);

    if (vx !== 0 || vy !== 0) {
      this.player.play(`walk_${this.playerDirection}`, true);
    } else {
      this.player.stop();
    }
  }

  handleAutoAttack(time) {
    if (this.attackCooldown > time) return;

    const ps = this.playerState;
    const weapon = ps.equipped.weapon;
    const wType = weapon?.weaponType || 'sword';

    // Range depends on weapon type
    let attackRange = 80; // sword: melee
    if (wType === 'bow') attackRange = 250;
    if (wType === 'staff') attackRange = 200;

    let closestMonster = null;
    let closestDist = attackRange;

    this.monsterObjects.forEach(m => {
      if (!m.active || m.monsterData.isDead) return;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, m.x, m.y);
      if (dist < closestDist) {
        closestDist = dist;
        closestMonster = m;
      }
    });

    if (closestMonster) {
      // Staff requires mana
      if (wType === 'staff') {
        const manaCost = weapon.manaCost || 5;
        if (!ps.useMana(manaCost)) return;
      }

      // Ranged weapons fire projectiles
      if ((wType === 'bow' || wType === 'staff') && this.combatUtils) {
        const damage = Math.max(1, ps.getAttack() - closestMonster.monsterData.defense);
        const texKey = wType === 'bow' ? 'projectile_arrow' : 'projectile_magic';
        const speed = wType === 'bow' ? 350 : 250;
        this.combatUtils.fireProjectile(texKey,
          this.player.x, this.player.y,
          closestMonster.x, closestMonster.y,
          speed, damage, { maxRange: attackRange * 1.3 }
        );
        if (this.audio) this.audio.play(wType === 'bow' ? 'arrow_fire' : 'magic_cast');
      } else {
        this.attackMonster(closestMonster);
        if (this.audio) this.audio.play('sword_swing');
      }

      const cooldown = wType === 'sword' ? 500 : wType === 'bow' ? 700 : 900;
      this.attackCooldown = time + cooldown;
    } else {
      // No monster found — attack nearest resource (tree/rock/bush)
      let closestRes = null;
      let closestResDist = Math.min(attackRange, 120);
      this.resourceObjects.forEach(r => {
        if (!r || !r.active || !r.visible) return;
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, r.x, r.y);
        if (dist < closestResDist) {
          closestResDist = dist;
          closestRes = r;
        }
      });
      if (closestRes) {
        this.attackResource(closestRes);
        if (this.audio) this.audio.play('sword_swing');
        const cooldown = wType === 'sword' ? 500 : wType === 'bow' ? 700 : 900;
        this.attackCooldown = time + cooldown;
      }
    }
  }

  attackMonster(monster) {
    const ps = this.playerState;
    const damage = Math.max(1, ps.getAttack() - monster.monsterData.defense);
    monster.monsterData.currentHp -= damage;
    monster.monsterData.aggroed = true; // chase player forever after being hit

    // Hit effect
    this.showDamageNumber(monster.x, monster.y - 16, damage, '#FFFFFF');
    monster.setTintFill(0xFFFFFF);
    this.time.delayedCall(100, () => {
      if (monster.active) monster.clearTint();
    });

    // Hit particles
    this.add.particles(monster.x, monster.y, 'particle_hit', {
      speed: { min: 30, max: 60 },
      lifespan: 300,
      scale: { start: 0.5, end: 0 },
      quantity: 3,
      emitting: false
    }).explode(3);

    if (monster.monsterData.currentHp <= 0) {
      this.killMonster(monster);
    }
  }

  attackResource(res) {
    res.hp--;

    // Hit flash
    res.setTintFill(0xFFFFFF);
    this.time.delayedCall(100, () => {
      if (res.active) res.clearTint();
    });

    // Hit particles
    this.add.particles(res.x, res.y, 'particle_hit', {
      speed: { min: 20, max: 40 },
      lifespan: 300,
      scale: { start: 0.4, end: 0 },
      quantity: 2,
      emitting: false
    }).explode(2);

    if (res.hp <= 0) {
      const ps = this.playerState;
      const rx = res.x, ry = res.y;

      // Drop item
      const itemId = res.resourceItem;
      const itemData = ITEMS[itemId];
      if (itemData && ps.addItem(itemId)) {
        this.showDamageNumber(rx, ry - 8, `+${itemData.name}`, itemData.color);
        ps.addGather(itemId);
        this.checkQuestProgress('gather', itemId);
      }

      // Small EXP
      const baseExp = Phaser.Math.Between(2, 5);
      ps.addExp(baseExp);
      this.showDamageNumber(rx, ry - 20, `+${Math.floor(baseExp * ps.getExpMultiplier())} EXP`, '#9a6aea');

      // Rare pot drop (1.5%)
      if (Math.random() < 0.015) {
        const potId = Math.random() < 0.5 ? 'health_potion' : 'mana_potion';
        const potData = ITEMS[potId];
        if (potData && ps.addItem(potId)) {
          this.showDamageNumber(rx, ry - 44, `+${potData.name}!`, '#FFD700');
        }
      }

      // Destroy and respawn
      const rType = res.resourceType;
      const rItem = res.resourceItem;
      const idx = this.resourceObjects.indexOf(res);
      res.destroy();

      this.time.delayedCall(20000, () => {
        const texKey = rType === 'tree' ? 'tree' : rType === 'bush' ? 'bush' : 'rock';
        const newRes = this.add.image(rx + Phaser.Math.Between(-20, 20), ry + Phaser.Math.Between(-20, 20), texKey);
        newRes.setDepth(newRes.y);
        newRes.resourceType = rType;
        newRes.resourceItem = rItem;
        newRes.hp = rType === 'tree' ? 3 : rType === 'rock' ? 2 : 1;
        newRes.maxHp = newRes.hp;
        if (idx >= 0) this.resourceObjects[idx] = newRes;
        else this.resourceObjects.push(newRes);
      });
    }
  }

  killMonster(monster) {
    const data = monster.monsterData;
    data.isDead = true;

    const ps = this.playerState;

    // Grant EXP
    const leveledUp = ps.addExp(data.exp);
    ps.gold += data.gold;

    // Kill count for quests
    ps.addKill(data.id);

    // Boss kill tracking
    if (data.isBoss) {
      ps.addBossKill(data.id);
      this.showDamageNumber(this.player.x, this.player.y - 55, 'BOSS YENİLDİ!', '#FFD700');
    }

    // Show rewards
    const actualExp = Math.floor(data.exp * ps.getExpMultiplier());
    this.showDamageNumber(monster.x, monster.y - 24, `+${actualExp} EXP`, '#9a6aea');
    this.showDamageNumber(monster.x, monster.y - 36, `+${formatGold(data.gold)} Gold`, '#FFD700');

    if (leveledUp) {
      this.showDamageNumber(this.player.x, this.player.y - 40, 'LEVEL UP!', '#FFD700');
      // Level up particles
      this.add.particles(this.player.x, this.player.y, 'particle_levelup', {
        speed: { min: 50, max: 100 },
        lifespan: 1000,
        scale: { start: 1, end: 0 },
        quantity: 20,
        emitting: false
      }).explode(20);
    }

    // Loot drops
    this.dropLoot(monster.x, monster.y, data.id);

    // Death effect
    monster.hpBar.clear();
    if (monster.nameLabel) { monster.nameLabel.destroy(); monster.nameLabel = null; }
    if (monster.bossLabel) { monster.bossLabel.destroy(); monster.bossLabel = null; }

    // Sparkle effect
    this.add.particles(monster.x, monster.y, 'particle_sparkle', {
      speed: { min: 20, max: 60 },
      lifespan: 600,
      scale: { start: 0.8, end: 0 },
      quantity: 5,
      emitting: false
    }).explode(5);

    monster.destroy();

    // Kadim Ejder: 30dk respawn, bölge bossları: 10dk, normal: 4dk
    if (data.isBoss && !data.isZoneBoss) {
      const mainBossRespawn = 1800000; // 30 dakika
      this.time.delayedCall(mainBossRespawn, () => {
        const newMonster = this.spawnMonster(data.id, data.spawnX, data.spawnY);
        if (newMonster) this.monsterObjects.push(newMonster);
      });
    } else {
      const respawnTime = data.isZoneBoss ? 600000 : 240000; // Bölge boss: 10dk, normal: 4dk
      this.time.delayedCall(respawnTime, () => {
        const newMonster = this.spawnMonster(data.id, data.spawnX + Phaser.Math.Between(-50, 50), data.spawnY + Phaser.Math.Between(-50, 50));
        if (newMonster) {
          const idx = this.monsterObjects.indexOf(monster);
          if (idx >= 0) this.monsterObjects[idx] = newMonster;
          else this.monsterObjects.push(newMonster);
        }
      });
    }

    // Check quest progress
    this.checkQuestProgress('kill', data.id);
  }

  dropLoot(x, y, monsterId) {
    const lootTable = LOOT_TABLES[monsterId];
    if (!lootTable) return;
    if (!this.lootOnGround) this.lootOnGround = [];

    lootTable.forEach(loot => {
      if (Math.random() < loot.chance) {
        const itemData = ITEMS[loot.item];
        if (!itemData) return;

        // Enhanced item roll
        const enhancedEntry = this.playerState.rollEnhancement(loot.item);
        const isEnhanced = this.playerState.isEnhanced(enhancedEntry);
        const bonuses = isEnhanced ? this.playerState.getItemBonuses(enhancedEntry) : null;

        const lx = x + Phaser.Math.Between(-30, 30);
        const ly = y + Phaser.Math.Between(-20, 20);

        // Loot sprite on ground
        const lootSprite = this.add.image(lx, ly, `icon_${loot.item}`);
        lootSprite.setScale(0.6);
        lootSprite.setDepth(8);
        lootSprite.itemId = enhancedEntry;
        lootSprite.setInteractive({ useHandCursor: true });

        // Enhanced parıltı efekti
        let sparkleGfx = null;
        if (isEnhanced) {
          sparkleGfx = this.add.graphics().setDepth(7);
          this.time.addEvent({
            delay: 400, loop: true,
            callback: () => {
              if (!lootSprite.active) { sparkleGfx.destroy(); return; }
              sparkleGfx.clear();
              sparkleGfx.fillStyle(0xFFD700, 0.3 + Math.sin(Date.now() * 0.005) * 0.2);
              sparkleGfx.fillCircle(lootSprite.x, lootSprite.y, 18);
              sparkleGfx.fillStyle(0xFFFFFF, 0.5);
              const angle = Date.now() * 0.003;
              sparkleGfx.fillCircle(lootSprite.x + Math.cos(angle) * 10, lootSprite.y + Math.sin(angle) * 10, 2);
              sparkleGfx.fillCircle(lootSprite.x + Math.cos(angle + 2) * 10, lootSprite.y + Math.sin(angle + 2) * 10, 2);
            }
          });
        }

        // Item name label - enhanced ise altın renk + bonus bilgisi
        let labelText = itemData.name;
        let labelColor = itemData.color;
        if (isEnhanced) {
          labelText = `✦ ${itemData.name} ✦`;
          labelColor = '#FFD700';
          if (bonuses) {
            const parts = [];
            if (bonuses.attack) parts.push(`+${bonuses.attack} ATK`);
            if (bonuses.defense) parts.push(`+${bonuses.defense} DEF`);
            if (bonuses.maxHp) parts.push(`+${bonuses.maxHp} HP`);
            if (bonuses.maxMana) parts.push(`+${bonuses.maxMana} MP`);
            labelText += `\n${parts.join(' ')}`;
          }
        }
        const label = this.add.text(lx, ly + 32, labelText, {
          fontSize: '22px', fontFamily: 'Nunito, Arial, sans-serif', color: labelColor, fontStyle: 'bold',
          stroke: '#000', strokeThickness: 5, align: 'center'
        }).setOrigin(0.5).setDepth(9999);

        // Sparkle animation
        this.tweens.add({
          targets: lootSprite,
          y: ly - 4,
          duration: 600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });

        // Pickup function
        const pickup = () => {
          if (!lootSprite.active) return;
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, lx, ly);
          if (dist > 120) {
            // Too far — walk there first
            this.moveTarget = { x: lx, y: ly, npc: null, portal: null };
            // Retry pickup after arriving
            this.time.delayedCall(1500, () => {
              if (lootSprite.active && Phaser.Math.Distance.Between(this.player.x, this.player.y, lx, ly) < 120) {
                pickup();
              }
            });
            return;
          }
          if (this.playerState.addItem(enhancedEntry)) {
            const pickColor = isEnhanced ? '#FFD700' : itemData.color;
            const pickName = isEnhanced ? `✦ ${itemData.name}` : `+${itemData.name}`;
            this.showDamageNumber(lx, ly - 16, pickName, pickColor);
            this.playerState.addGather(loot.item);
            this.checkQuestProgress('gather', loot.item);
            lootSprite.destroy();
            label.destroy();
            if (sparkleGfx) sparkleGfx.destroy();
            this.lootOnGround = this.lootOnGround.filter(l => l.sprite !== lootSprite);
          }
        };

        // Click to pick up
        lootSprite.on('pointerdown', pickup);

        // Auto-pickup when walking near
        this.lootOnGround.push({ sprite: lootSprite, label, itemId: loot.item, x: lx, y: ly, pickup });

        // Auto-destroy after 45s
        this.time.delayedCall(45000, () => {
          if (lootSprite.active) lootSprite.destroy();
          if (label.active) label.destroy();
          this.lootOnGround = this.lootOnGround.filter(l => l.sprite !== lootSprite);
        });
      }
    });
  }

  // Drop a single item from inventory onto the ground
  dropSingleItem(x, y, itemId) {
    const itemData = ITEMS[itemId];
    if (!itemData) return;
    if (!this.lootOnGround) this.lootOnGround = [];

    const lootSprite = this.add.image(x, y, `icon_${itemId}`);
    lootSprite.setScale(0.6).setDepth(8).setInteractive({ useHandCursor: true });
    lootSprite.itemId = itemId;

    const label = this.add.text(x, y + 32, itemData.name, {
      fontSize: '22px', fontFamily: 'Nunito, Arial, sans-serif', color: itemData.color, fontStyle: 'bold',
      stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(9);

    this.tweens.add({
      targets: lootSprite, y: y - 4, duration: 600,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });

    const pickup = () => {
      if (!lootSprite.active) return;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y);
      if (dist > 120) {
        this.moveTarget = { x, y, npc: null, portal: null };
        this.time.delayedCall(1500, () => {
          if (lootSprite.active && Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y) < 120) pickup();
        });
        return;
      }
      if (this.playerState.addItem(itemId)) {
        this.showDamageNumber(x, y - 16, `+${itemData.name}`, itemData.color);
        lootSprite.destroy();
        label.destroy();
        this.lootOnGround = this.lootOnGround.filter(l => l.sprite !== lootSprite);
      }
    };

    lootSprite.on('pointerdown', pickup);
    this.lootOnGround.push({ sprite: lootSprite, label, itemId, x, y, pickup, droppedByPlayer: true });

    // Dropped items last 120s (longer than monster drops)
    this.time.delayedCall(120000, () => {
      if (lootSprite.active) lootSprite.destroy();
      if (label.active) label.destroy();
      this.lootOnGround = this.lootOnGround.filter(l => l.sprite !== lootSprite);
    });
  }

  handleResourceHarvest() {
    // F tuşu VEYA otomatik (her 500ms'de bir)
    const now = this.time.now;
    const fPressed = this.harvestKey.isDown;
    const autoHarvest = now > (this._lastHarvest || 0) + 500;

    if (!fPressed && !autoHarvest) return;

    let closestResource = null;
    let closestDist = 120;

    this.resourceObjects.forEach(r => {
      if (!r || !r.active || !r.visible) return;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, r.x, r.y);
      if (dist < closestDist) {
        closestDist = dist;
        closestResource = r;
      }
    });

    if (closestResource) {
      this._lastHarvest = now;
      closestResource.hp--;
      closestResource.setTintFill(0xFFFFFF);
      this.time.delayedCall(100, () => {
        if (closestResource.active) closestResource.clearTint();
      });

      // Hit particles
      this.add.particles(closestResource.x, closestResource.y, 'particle_hit', {
        speed: { min: 20, max: 40 },
        lifespan: 300,
        scale: { start: 0.4, end: 0 },
        quantity: 2,
        emitting: false
      }).explode(2);

      if (closestResource.hp <= 0) {
        const ps = this.playerState;
        const rx = closestResource.x;
        const ry = closestResource.y;

        // Drop primary item
        const itemId = closestResource.resourceItem;
        const itemData = ITEMS[itemId];
        if (ps.addItem(itemId)) {
          this.showDamageNumber(rx, ry - 8, `+${itemData.name}`, itemData.color);
          ps.addGather(itemId);
          this.checkQuestProgress('gather', itemId);
        }

        // Small EXP (2-5 base, scaled by multiplier)
        const baseExp = Phaser.Math.Between(2, 5);
        ps.addExp(baseExp);
        this.showDamageNumber(rx, ry - 20, `+${Math.floor(baseExp * ps.getExpMultiplier())} EXP`, '#9a6aea');

        // No HP heal from resources

        // Very rare pot drop from resources (1.5%)
        if (Math.random() < 0.015) {
          const potId = Math.random() < 0.5 ? 'health_potion' : 'mana_potion';
          const potData = ITEMS[potId];
          if (potData && ps.addItem(potId)) {
            this.showDamageNumber(rx, ry - 44, `+${potData.name}!`, '#FFD700');
          }
        }

        // Destroy and respawn
        const rType = closestResource.resourceType;
        const rItem = closestResource.resourceItem;
        const idx = this.resourceObjects.indexOf(closestResource);

        closestResource.destroy();

        // Respawn resource after 20s
        this.time.delayedCall(20000, () => {
          const texKey = rType === 'tree' ? 'tree' : rType === 'bush' ? 'bush' : 'rock';
          const newRes = this.add.image(rx + Phaser.Math.Between(-20, 20), ry + Phaser.Math.Between(-20, 20), texKey);
          newRes.setDepth(newRes.y);
          newRes.resourceType = rType;
          newRes.resourceItem = rItem;
          newRes.hp = rType === 'tree' ? 3 : rType === 'rock' ? 2 : 1;
          newRes.maxHp = newRes.hp;
          if (idx >= 0) this.resourceObjects[idx] = newRes;
          else this.resourceObjects.push(newRes);
        });
      }
    }
  }

  handleInteraction() {
    if (!Phaser.Input.Keyboard.JustDown(this.interactKey)) return;

    // Check for nearby NPC
    let closestNPC = null;
    let closestDist = 60;

    this.npcObjects.forEach(npc => {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
      if (dist < closestDist) {
        closestDist = dist;
        closestNPC = npc;
      }
    });

    if (closestNPC) {
      this.interactWithNPC(closestNPC);
      return;
    }

    // Check for portal
    let closestPortal = null;
    closestDist = 40;
    this.portalGroup.children.entries.forEach(portal => {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, portal.x, portal.y);
      if (dist < closestDist) {
        closestDist = dist;
        closestPortal = portal;
      }
    });

    if (closestPortal) {
      this.enterPortal(closestPortal);
    }
  }

  interactWithNPC(npc) {
    const npcData = npc.npcData;
    const ps = this.playerState;
    const uiScene = this.scene.get('UIScene');

    // Check if NPC is shopkeeper
    if (npcData.isShop) {
      this.enterPortal({ targetScene: 'ShopScene' });
      return;
    }

    // Check if NPC can heal
    if (npcData.canHeal && ps.hp < ps.getMaxHp()) {
      ps.hp = ps.getMaxHp();
      uiScene.showDialogue(npcData.name, 'Seni iyileştirdim! Canın tamamen doldu.');
      return;
    }

    // Check for completable quests
    const activeQuest = Object.keys(ps.activeQuests).find(qId => {
      const q = QUESTS[qId];
      if (!q || q.npc !== npc.npcId) return false;
      if (q.type === 'kill') return ps.getKills(q.target) >= q.required;
      if (q.type === 'gather') return ps.getGather(q.target) >= q.required;
      return false;
    });

    if (activeQuest) {
      const q = QUESTS[activeQuest];
      // Give rewards
      ps.addExp(q.rewards.exp);
      ps.gold += q.rewards.gold;
      q.rewards.items?.forEach(itemId => ps.addItem(itemId));
      ps.completeQuest(activeQuest);

      uiScene.showDialogue(npcData.name, `${npcData.dialogue.questComplete}\n+${q.rewards.exp} EXP, +${formatGold(q.rewards.gold)} Gold`);
      npc.questMark.setVisible(this.hasAvailableQuest(npc.npcId));
      return;
    }

    // Check for new quests
    const availableQuest = Object.values(QUESTS).find(q =>
      q.npc === npc.npcId &&
      !ps.completedQuests[q.id] &&
      !ps.activeQuests[q.id] &&
      ps.level >= q.minLevel
    );

    if (availableQuest) {
      ps.acceptQuest(availableQuest.id);
      uiScene.showDialogue(npcData.name, `${npcData.dialogue.greeting}\n\nGörev: ${availableQuest.name}\n${availableQuest.desc}`);
      npc.questMark.setVisible(false);
      return;
    }

    // Default dialogue
    uiScene.showDialogue(npcData.name, npcData.dialogue.noQuest || npcData.dialogue.greeting);
  }

  checkQuestProgress(type, targetId) {
    const ps = this.playerState;
    const uiScene = this.scene.get('UIScene');

    Object.keys(ps.activeQuests).forEach(qId => {
      const q = QUESTS[qId];
      if (!q) return;

      let current = 0, required = q.required;
      if (q.type === 'kill' && type === 'kill' && q.target === targetId) {
        current = ps.getKills(targetId);
      } else if (q.type === 'gather' && type === 'gather' && q.target === targetId) {
        current = ps.getGather(targetId);
      } else return;

      if (current >= required) {
        uiScene.showNotification(`Görev tamamlandı: ${q.name}! NPC'ye dön.`);
      } else {
        uiScene.showNotification(`${q.name}: ${current}/${required}`);
      }
    });
  }

  checkPortals() {
    // Auto-enter portals when stepping on them
  }

  enterPortal(portal) {
    const ps = this.playerState;

    // Boss gate kontrolü: Overworld boss öldürülmeden zindan/labirent'e geçilemez
    if (portal.targetScene === 'DungeonScene' || portal.targetScene === 'LabyrinthScene') {
      if (!ps.hasBossKill('ancient_dragon')) {
        const uiScene = this.scene.get('UIScene');
        if (uiScene?.showDialogue) {
          uiScene.showDialogue('Gizemli Güç',
            portal.targetScene === 'DungeonScene'
              ? 'Bu zindana girmek için önce Kadim Ejderi yenmelisin! Kadim Ejder haritanın kuzeyinde bekliyor.'
              : 'Bu labirente girmek için önce Kadim Ejderi yenmelisin! Kadim Ejder haritanın kuzeyinde bekliyor.'
          );
        }
        return;
      }
    }

    ps.save();
    this.scene.start(portal.targetScene);
  }

  teleportToTown() {
    // Check if in combat — any aggroed monster nearby
    const inCombat = this.monsterObjects.some(m => {
      if (!m.active || m.monsterData.isDead) return false;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, m.x, m.y);
      return m.monsterData.aggroed && dist < 300;
    });

    if (inCombat) {
      // Show warning — can't teleport in combat
      if (this._tpWarning) return; // already showing
      this._tpWarning = this.add.text(this.player.x, this.player.y - 80,
        'Savaş sırasında ışınlanamazsın!', {
          fontSize: '24px', fontFamily: 'Nunito, Arial, sans-serif', color: '#FF4444',
          fontStyle: 'bold', stroke: '#000', strokeThickness: 5
        }).setOrigin(0.5).setDepth(10001).setAlpha(1);

      // Fade out after 1.5 seconds
      this.tweens.add({
        targets: this._tpWarning,
        alpha: 0,
        duration: 800,
        delay: 1200,
        onComplete: () => {
          if (this._tpWarning) { this._tpWarning.destroy(); this._tpWarning = null; }
        }
      });
      return;
    }

    // Already in village
    if (this.isInsideVillage(this.player.x, this.player.y)) return;

    // Teleport to village center
    const vb = this.villageBounds;
    this.player.setPosition(vb.x + vb.w / 2, vb.y + vb.h / 2);
    this.playerState.lastX = this.player.x;
    this.playerState.lastY = this.player.y;
    this.playerState.save();

    // Teleport effect
    const flash = this.add.circle(this.player.x, this.player.y, 40, 0x9a6aea, 0.5).setDepth(10000);
    this.tweens.add({
      targets: flash,
      alpha: 0, scale: 3,
      duration: 500,
      onComplete: () => flash.destroy()
    });
  }

  isInsideVillage(x, y) {
    const vb = this.villageBounds;
    const cx = vb.x + vb.w / 2;
    const cy = vb.y + vb.h / 2;
    const dx = (x - cx) / (vb.w / 2 + 20);
    const dy = (y - cy) / (vb.h / 2 + 20);
    return dx * dx + dy * dy < 1;
  }

  updateMonsters(time, delta) {
    this.monsterObjects.forEach(monster => {
      if (!monster.active || monster.monsterData.isDead) return;

      const data = monster.monsterData;
      const distToPlayer = Phaser.Math.Distance.Between(monster.x, monster.y, this.player.x, this.player.y);

      // Keep monsters out of village
      if (this.isInsideVillage(monster.x, monster.y)) {
        const vb = this.villageBounds;
        const vcx = vb.x + vb.w / 2;
        const vcy = vb.y + vb.h / 2;
        const pushAngle = Phaser.Math.Angle.Between(vcx, vcy, monster.x, monster.y);
        monster.body.setVelocity(Math.cos(pushAngle) * 150, Math.sin(pushAngle) * 150);
        return;
      }

      // Stun check — monster can't act while stunned
      if (data.stunUntil && Date.now() < data.stunUntil) {
        monster.body.setVelocity(0, 0);
        return;
      }

      // Speed modifier from slow effect
      const speedMod = data.slowFactor && data.slowUntil && Date.now() < data.slowUntil ? data.slowFactor : 1;

      // Monster AI
      if ((distToPlayer < data.aggroRange || data.aggroed) && !this.isInsideVillage(this.player.x, this.player.y)) {
        const angle = Phaser.Math.Angle.Between(monster.x, monster.y, this.player.x, this.player.y);
        if (distToPlayer > 50) {
          monster.body.setVelocity(Math.cos(angle) * data.speed * speedMod, Math.sin(angle) * data.speed * speedMod);
        } else {
          monster.body.setVelocity(0, 0);
        }

        // Monster attacks player when in range
        if (distToPlayer < 55 && time > (monster.lastAttackTime || 0) + 1000) {
          const dmg = this.playerState.takeDamage(data.attack);
          this.showDamageNumber(this.player.x, this.player.y - 20, dmg, '#FF4444');
          this.player.setTintFill(0xFF0000);
          this.time.delayedCall(100, () => {
            if (this.player.active) this.player.clearTint();
          });
          monster.lastAttackTime = time;

          // Check player death
          if (this.playerState.isDead()) {
            this.playerDeath();
          }
        }
      } else {
        // Wander
        data.wanderTimer -= delta;
        if (data.wanderTimer <= 0) {
          data.wanderTimer = Phaser.Math.Between(1000, 3000);
          const angle = Math.random() * Math.PI * 2;
          data.wanderDir = {
            x: Math.cos(angle) * data.speed * 0.3,
            y: Math.sin(angle) * data.speed * 0.3
          };
        }
        monster.body.setVelocity(data.wanderDir.x, data.wanderDir.y);

        // Don't wander too far from spawn
        const distFromSpawn = Phaser.Math.Distance.Between(monster.x, monster.y, data.spawnX, data.spawnY);
        if (distFromSpawn > 400) {
          const angle = Phaser.Math.Angle.Between(monster.x, monster.y, data.spawnX, data.spawnY);
          monster.body.setVelocity(Math.cos(angle) * data.speed * 0.5, Math.sin(angle) * data.speed * 0.5);
        }
      }

      // Flip sprite based on velocity
      if (monster.body.velocity.x < -5) monster.setFlipX(true);
      else if (monster.body.velocity.x > 5) monster.setFlipX(false);
    });
  }

  updateMonsterHPBars() {
    this.monsterObjects.forEach(monster => {
      if (!monster.active || monster.monsterData.isDead) return;

      // Hide monsters in unexplored (dark) areas
      const fogX = Math.floor(monster.x / this.fogCellSize);
      const fogY = Math.floor(monster.y / this.fogCellSize);
      const isRevealed = this.fogRevealed && this.fogRevealed.has(`${fogX},${fogY}`);

      monster.setVisible(isRevealed);
      if (monster.nameLabel) monster.nameLabel.setVisible(isRevealed);
      if (monster.bossLabel) monster.bossLabel.setVisible(isRevealed);

      const bar = monster.hpBar;
      bar.clear();

      if (!isRevealed) return; // Don't draw HP bar for hidden monsters

      bar.setDepth(9998);
      const ratio = monster.monsterData.currentHp / monster.monsterData.hp;
      const barWidth = 28;
      const barHeight = 3;
      const x = monster.x - barWidth / 2;
      const y = monster.y - monster.height / 2 - 6;

      bar.fillStyle(0x000000, 0.6);
      bar.fillRect(x, y, barWidth, barHeight);

      const color = ratio > 0.5 ? 0x00CC00 : ratio > 0.25 ? 0xCCCC00 : 0xCC0000;
      bar.fillStyle(color);
      bar.fillRect(x, y, barWidth * ratio, barHeight);

      // Update name label position + gradient color based on level difference
      if (monster.nameLabel) {
        monster.nameLabel.setPosition(monster.x, y - 10);
        const pLv = this.playerState.level;
        const mLv = monster.monsterData.level;
        const diff = mLv - pLv;
        // Smooth gradient: red(+5) → orange(+2) → yellow(0) → green(-3) → grey(-6) → dark(-10+)
        let r, g2, b;
        if (diff >= 5) { r = 255; g2 = 30; b = 30; }
        else if (diff >= 0) {
          const t = diff / 5; // 0..1
          r = 255; g2 = Math.floor(30 + (1 - t) * 190); b = Math.floor(30 + (1 - t) * 30);
        } else if (diff >= -5) {
          const t = -diff / 5; // 0..1
          r = Math.floor(255 - t * 100); g2 = Math.floor(220 - t * 50); b = Math.floor(60 + t * 100);
        } else {
          const t = Math.min(1, (-diff - 5) / 10); // 0..1
          r = Math.floor(155 - t * 60); g2 = Math.floor(170 - t * 70); b = Math.floor(160 - t * 60);
        }
        const hex = '#' + ((1 << 24) + (r << 16) + (g2 << 8) + b).toString(16).slice(1);
        monster.nameLabel.setColor(hex);
      }
    });
  }

  playerDeath() {
    const ps = this.playerState;
    if (this.audio) this.audio.play('death');

    // Lose some gold
    const goldLost = Math.floor(ps.gold * 0.1);
    ps.gold = Math.max(0, ps.gold - goldLost);

    // Revive with half HP
    ps.hp = Math.floor(ps.getMaxHp() * 0.5);

    // Teleport to village center
    const vb = this.villageBounds;
    this.player.setPosition(vb.x + vb.w / 2, vb.y + vb.h / 2);

    const uiScene = this.scene.get('UIScene');
    uiScene.showDialogue('Sistem', `Yenildin! ${goldLost} altın kaybettin.\nKöye geri döndün.`);
  }

  showDamageNumber(x, y, text, color) {
    const dmgText = this.add.text(x, y, String(text), {
      fontSize: '32px', fontFamily: 'Nunito, Arial, sans-serif', color: color,
      stroke: '#000', strokeThickness: 5, fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(10000);

    this.tweens.add({
      targets: dmgText,
      y: y - 30,
      alpha: 0,
      duration: 800,
      onComplete: () => dmgText.destroy()
    });
  }

  useSkillSlot(slotIndex) {
    if (!this.skillSystem) return;
    const skills = this.skillSystem.getAvailableSkills();
    if (slotIndex >= skills.length) return;
    const skill = skills[slotIndex];

    // Find nearest target in skill range
    let target = null;
    let minDist = skill.range || 200;
    this.monsterObjects.forEach(m => {
      if (!m.active || m.monsterData.isDead) return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, m.x, m.y);
      if (d < minDist) { minDist = d; target = m; }
    });

    const result = this.skillSystem.useSkill(skill.id, this.player, target, this.monsterObjects);
    if (result.success) {
      if (this.audio) this.audio.play('skill_use');
    } else {
      const uiScene = this.scene.get('UIScene');
      if (uiScene) uiScene.showNotification(result.reason);
    }

    // Check kills from skill damage
    this.monsterObjects.forEach(m => {
      if (m.active && m.monsterData && !m.monsterData.isDead && m.monsterData.currentHp <= 0) {
        this.killMonster(m);
      }
    });
  }

  cleanup() {
    this.monsterObjects.forEach(m => {
      if (m.hpBar) m.hpBar.destroy();
    });
    if (this.combatUtils) this.combatUtils.destroy();
  }
}
