import Phaser from 'phaser';
import { PlayerState } from '../systems/PlayerState.js';
import { MONSTERS, DUNGEON_FLOOR_MONSTERS } from '../data/monsters.js';
import { ITEMS, LOOT_TABLES } from '../data/items.js';
import { NPCS, QUESTS } from '../data/quests.js';
import { SkillSystem } from '../systems/SkillSystem.js';
import { CombatUtils } from '../systems/CombatUtils.js';
import { BossPatternSystem } from '../systems/BossPatterns.js';

export class DungeonScene extends Phaser.Scene {
  constructor() {
    super('DungeonScene');
  }

  create() {
    this.playerState = PlayerState.getInstance();
    this.attackCooldown = 0;
    this.autoAttackRange = 80;
    this.monsterObjects = [];
    this.currentFloor = this.playerState.dungeonFloor || 1;
    this.bossDefeated = false;
    this._spawnTime = null; // Spawn koruma süresini sıfırla
    this._lastAutoInteract = 0;
    this.skillSystem = new SkillSystem(this);
    this.combatUtils = new CombatUtils(this);
    this.bossPatterns = new BossPatternSystem(this);

    this.createDungeonMap();
    this.createPlayer();
    this.createMonsters();
    this.createExitPortal();
    this.createFloorTransitions();
    this.createEntranceNPC();
    this.createFloorUI();
    this.setupCamera();
    this.setupInput();

    this.cameras.main.setBackgroundColor('#060610');
  }

  createDungeonMap() {
    const ts = 64;

    // ===== KAT 10: TEK DEV BOSS ODASI =====
    if (this.currentFloor === 10) {
      const w = 30, h = 30;
      const grid = Array.from({ length: h }, () => Array(w).fill(32));

      // Giriş koridoru (üst-sol)
      const entryRoom = { x: 2, y: 2, w: 4, h: 4 };
      for (let dy = 0; dy < entryRoom.h; dy++)
        for (let dx = 0; dx < entryRoom.w; dx++)
          grid[entryRoom.y + dy][entryRoom.x + dx] = 16;

      // Devasa boss odası (merkez, 18x18)
      const bossRoom = { x: 6, y: 6, w: 18, h: 18 };
      for (let dy = 0; dy < bossRoom.h; dy++)
        for (let dx = 0; dx < bossRoom.w; dx++)
          grid[bossRoom.y + dy][bossRoom.x + dx] = 18; // koyu taş zemin

      // Giriş koridoru → boss odası bağlantısı
      for (let y = entryRoom.y + entryRoom.h; y <= bossRoom.y; y++) grid[y][4] = 16;
      for (let x = 4; x <= bossRoom.x; x++) grid[bossRoom.y][x] = 16;

      // Boss odasının kenarlarına dekoratif lav havuzları (geçilmez)
      // Sol ve sağ kenar lav sütunları
      for (let dy = 2; dy < bossRoom.h - 2; dy += 3) {
        grid[bossRoom.y + dy][bossRoom.x + 1] = 24; // lav (water tile = geçilmez)
        grid[bossRoom.y + dy][bossRoom.x + bossRoom.w - 2] = 24;
      }

      this.rooms = [entryRoom, bossRoom];

      const mapData = grid.map(row => [...row]);
      const map = this.make.tilemap({ data: mapData, tileWidth: ts, tileHeight: ts });
      const tileset = map.addTilesetImage('__default', 'tileset', ts, ts, 1, 2);
      const layer = map.createLayer(0, tileset, 0, 0);
      layer.setCollision([24, 25, 26, 27, 32, 33, 34, 35, 36, 37, 38, 39]);

      this.map = map;
      this.groundLayer = layer;
      this.mapWidth = w * ts;
      this.mapHeight = h * ts;
      this.physics.world.setBounds(0, 0, this.mapWidth, this.mapHeight);

      // === BOSS ODASI GÖRSEL DETAYLAR ===
      const bx = (bossRoom.x + bossRoom.w / 2) * ts;
      const by = (bossRoom.y + bossRoom.h / 2) * ts;
      const gfx = this.add.graphics().setDepth(3);

      // Kırmızı/mor zemin glow
      gfx.fillStyle(0x4a0000, 0.25);
      gfx.fillEllipse(bx, by, bossRoom.w * ts * 0.7, bossRoom.h * ts * 0.7);
      gfx.fillStyle(0x2a001a, 0.2);
      gfx.fillEllipse(bx, by, bossRoom.w * ts * 0.5, bossRoom.h * ts * 0.5);

      // Pentagram benzeri desen
      gfx.lineStyle(2, 0x8B0000, 0.4);
      const radius = 200;
      for (let i = 0; i < 5; i++) {
        const a1 = (i * 2 * Math.PI / 5) - Math.PI / 2;
        const a2 = ((i + 2) % 5 * 2 * Math.PI / 5) - Math.PI / 2;
        gfx.lineBetween(bx + Math.cos(a1) * radius, by + Math.sin(a1) * radius,
                        bx + Math.cos(a2) * radius, by + Math.sin(a2) * radius);
      }
      gfx.lineStyle(2, 0x8B0000, 0.3);
      gfx.strokeCircle(bx, by, radius);
      gfx.strokeCircle(bx, by, radius + 20);

      // Lav havuzları görsel efekti
      for (let dy = 2; dy < bossRoom.h - 2; dy += 3) {
        const lx1 = (bossRoom.x + 1) * ts + ts / 2;
        const lx2 = (bossRoom.x + bossRoom.w - 2) * ts + ts / 2;
        const ly = (bossRoom.y + dy) * ts + ts / 2;
        gfx.fillStyle(0xFF4500, 0.6); gfx.fillCircle(lx1, ly, 20);
        gfx.fillStyle(0xFFD700, 0.3); gfx.fillCircle(lx1, ly, 12);
        gfx.fillStyle(0xFF4500, 0.6); gfx.fillCircle(lx2, ly, 20);
        gfx.fillStyle(0xFFD700, 0.3); gfx.fillCircle(lx2, ly, 12);
      }

      // Kafatası süsleri (köşeler)
      const corners = [
        { x: bossRoom.x + 2, y: bossRoom.y + 2 },
        { x: bossRoom.x + bossRoom.w - 3, y: bossRoom.y + 2 },
        { x: bossRoom.x + 2, y: bossRoom.y + bossRoom.h - 3 },
        { x: bossRoom.x + bossRoom.w - 3, y: bossRoom.y + bossRoom.h - 3 },
      ];
      corners.forEach(c => {
        const cx = c.x * ts + ts / 2, cy = c.y * ts + ts / 2;
        // Kafatası
        gfx.fillStyle(0xE8E8D0, 0.7); gfx.fillCircle(cx, cy, 10);
        gfx.fillStyle(0x1a0000); gfx.fillCircle(cx - 3, cy - 2, 3); gfx.fillCircle(cx + 3, cy - 2, 3);
        gfx.fillStyle(0x1a0000); gfx.fillRect(cx - 4, cy + 4, 8, 2);
        // Kırmızı ışık
        gfx.fillStyle(0xFF0000, 0.15); gfx.fillCircle(cx, cy, 30);
      });

      // Uyarı yazısı
      this.add.text(bx, (bossRoom.y + 1) * ts, '⚔ ALACAKARANLIK EFENDİSİ ⚔', {
        fontSize: '20px', fontFamily: 'Nunito, Arial, sans-serif', color: '#FF0000',
        fontStyle: 'bold', stroke: '#000', strokeThickness: 4
      }).setOrigin(0.5).setDepth(9999);

      this.add.text(bx, (bossRoom.y + 2) * ts, 'Kötülüğün Son Kalesi', {
        fontSize: '14px', fontFamily: 'Nunito, Arial, sans-serif', color: '#FF6666',
        fontStyle: 'italic', stroke: '#000', strokeThickness: 3
      }).setOrigin(0.5).setDepth(9999);

      return;
    }

    // ===== NORMAL KATLAR (1-9) =====
    const w = 40, h = 40;
    const rng = new Phaser.Math.RandomDataGenerator([`dungeon_f${this.currentFloor}`]);
    const grid = Array.from({ length: h }, () => Array(w).fill(4 * 8));

    const rooms = [];
    const roomCount = Math.min(6 + this.currentFloor, 12);
    for (let i = 0; i < roomCount; i++) {
      const rw = rng.between(4, 8);
      const rh = rng.between(4, 8);
      const rx = rng.between(2, w - rw - 2);
      const ry = rng.between(2, h - rh - 2);

      let overlap = false;
      rooms.forEach(r => {
        if (rx < r.x + r.w + 1 && rx + rw + 1 > r.x && ry < r.y + r.h + 1 && ry + rh + 1 > r.y) overlap = true;
      });
      if (overlap) continue;

      rooms.push({ x: rx, y: ry, w: rw, h: rh });
      for (let dy = 0; dy < rh; dy++) {
        for (let dx = 0; dx < rw; dx++) {
          grid[ry + dy][rx + dx] = 16 + rng.between(0, 3);
        }
      }
    }

    for (let i = 1; i < rooms.length; i++) {
      const a = rooms[i - 1];
      const b = rooms[i];
      const ax = Math.floor(a.x + a.w / 2);
      const ay = Math.floor(a.y + a.h / 2);
      const bx = Math.floor(b.x + b.w / 2);
      const by = Math.floor(b.y + b.h / 2);

      let cx = ax;
      while (cx !== bx) { grid[ay][cx] = 16; cx += cx < bx ? 1 : -1; }
      let cy = ay;
      while (cy !== by) { grid[cy][bx] = 16; cy += cy < by ? 1 : -1; }
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (grid[y][x] >= 16 && grid[y][x] < 24) {
          grid[y][x] = 16 + (this.currentFloor % 4);
        }
      }
    }

    const mapData = grid.map(row => [...row]);
    const map = this.make.tilemap({ data: mapData, tileWidth: ts, tileHeight: ts });
    const tileset = map.addTilesetImage('__default', 'tileset', ts, ts, 1, 2);
    const layer = map.createLayer(0, tileset, 0, 0);
    layer.setCollision([32, 33, 34, 35, 36, 37, 38, 39]);

    this.map = map;
    this.groundLayer = layer;
    this.rooms = rooms;
    this.mapWidth = w * ts;
    this.mapHeight = h * ts;
    this.physics.world.setBounds(0, 0, this.mapWidth, this.mapHeight);
  }

  createPlayer() {
    const startRoom = this.rooms[0];
    const sx = (startRoom.x + startRoom.w / 2) * 64;
    const sy = (startRoom.y + startRoom.h / 2) * 64;

    const pTex = this.playerState.gender === 'female' ? 'player_female' : 'player';
    this.player = this.physics.add.sprite(sx, sy, pTex, 0);
    this.player.setSize(28, 28).setOffset(18, 60).setDepth(10).setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.groundLayer);

    if (!this.anims.exists('walk_down')) {
      this.anims.create({ key: 'walk_down', frames: [{ key: pTex, frame: 0 }, { key: pTex, frame: 1 }], frameRate: 6, repeat: -1 });
      this.anims.create({ key: 'walk_left', frames: [{ key: pTex, frame: 2 }, { key: pTex, frame: 3 }], frameRate: 6, repeat: -1 });
      this.anims.create({ key: 'walk_right', frames: [{ key: pTex, frame: 4 }, { key: pTex, frame: 5 }], frameRate: 6, repeat: -1 });
      this.anims.create({ key: 'walk_up', frames: [{ key: pTex, frame: 6 }, { key: pTex, frame: 7 }], frameRate: 6, repeat: -1 });
    }
    this.playerDirection = 'down';

    const ps = this.playerState;
    const suffix = ps.gender === 'female' ? '_f' : '';
    this.equipSprites = {};
    ['legs', 'chest', 'arms', 'belt', 'head', 'weapon', 'necklace', 'earring'].forEach(slot => {
      const spr = this.add.sprite(sx, sy, `equip_${slot}${suffix}`, 0);
      spr.setDepth(11).setVisible(!!ps.equipped[slot]);
      this.equipSprites[slot] = spr;
    });
  }

  createMonsters() {
    const floorData = DUNGEON_FLOOR_MONSTERS[this.currentFloor];
    if (!floorData) return;

    // ===== KAT 10: SADECE TEK BOSS =====
    if (this.currentFloor === 10) {
      const bossRoom = this.rooms[1]; // boss odası (2. oda)
      const bx = (bossRoom.x + bossRoom.w / 2) * 64;
      const by = (bossRoom.y + bossRoom.h / 2) * 64;
      const boss = this.spawnMonster(floorData.boss, bx, by);
      if (boss) {
        boss.monsterData.isBoss = true;
        if (this.bossPatterns) this.bossPatterns.initBoss(boss);
        // Boss'a özel kırmızı parıltı efekti
        this.time.addEvent({
          delay: 2000,
          loop: true,
          callback: () => {
            if (boss.active && !boss.monsterData.isDead) {
              boss.setTint(0xFF2222);
              this.time.delayedCall(200, () => { if (boss.active) boss.clearTint(); });
            }
          }
        });
      }
      return;
    }

    // ===== NORMAL KATLAR (1-9) =====
    this.rooms.forEach((room, i) => {
      if (i === 0) return; // Giriş odası boş
      if (i === this.rooms.length - 1) return; // Son oda boss odası

      const count = Math.min(2 + Math.floor(this.currentFloor / 3), 4);
      for (let j = 0; j < count; j++) {
        const mx = (room.x + Phaser.Math.Between(1, room.w - 2)) * 64;
        const my = (room.y + Phaser.Math.Between(1, room.h - 2)) * 64;
        const type = Phaser.Utils.Array.GetRandom(floorData.normal);
        this.spawnMonster(type, mx, my);
      }
    });

    // Boss son odada
    if (this.rooms.length > 1) {
      const lastRoom = this.rooms[this.rooms.length - 1];
      const bx = (lastRoom.x + lastRoom.w / 2) * 64;
      const by = (lastRoom.y + lastRoom.h / 2) * 64;
      const boss = this.spawnMonster(floorData.boss, bx, by);
      if (boss) {
        boss.monsterData.isBoss = true;
        if (this.bossPatterns) this.bossPatterns.initBoss(boss);
      }

      // Boss odası etiketi
      this.add.text(bx, by - 50, `BOSS: ${MONSTERS[floorData.boss]?.name || 'Boss'}`, {
        fontSize: '16px', fontFamily: 'Nunito, Arial, sans-serif', color: '#FF4444',
        fontStyle: 'bold', stroke: '#000', strokeThickness: 3
      }).setOrigin(0.5).setDepth(9999);
    }
  }

  spawnMonster(type, x, y) {
    const data = MONSTERS[type];
    if (!data) return null;

    // Kat bazlı güçlendirme: her kat %20 daha güçlü
    const floorMult = 1 + (this.currentFloor - 1) * 0.2;

    const monster = this.physics.add.sprite(x, y, type, 0);
    monster.setSize(24, 24).setDepth(9);
    monster.body.allowGravity = false;
    monster.body.immovable = false;
    monster.body.moves = true;
    monster.monsterData = {
      ...data,
      hp: Math.floor(data.hp * floorMult),
      attack: Math.floor(data.attack * floorMult),
      defense: Math.floor(data.defense * floorMult),
      currentHp: Math.floor(data.hp * floorMult),
      exp: Math.floor(data.exp * floorMult),
      gold: Math.floor(data.gold * floorMult),
      spawnX: x, spawnY: y,
      wanderTimer: 0, wanderDir: { x: 0, y: 0 }, isDead: false
    };

    if (!this.anims.exists(`${type}_idle`)) {
      this.anims.create({ key: `${type}_idle`, frames: [{ key: type, frame: 0 }, { key: type, frame: 1 }], frameRate: 3, repeat: -1 });
    }
    monster.play(`${type}_idle`);
    monster.hpBar = this.add.graphics();
    monster.nameLabel = this.add.text(x, y - 20, `${data.name} Lv.${data.level}`, {
      fontSize: '12px', fontFamily: 'Nunito, Arial, sans-serif', color: data.isBoss ? '#FF4444' : '#ff9999',
      fontStyle: 'bold', stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(9997);
    this.monsterObjects.push(monster);
    return monster;
  }

  createExitPortal() {
    const startRoom = this.rooms[0];
    const ex = startRoom.x * 64;
    const ey = startRoom.y * 64;

    if (this.currentFloor === 1) {
      this.add.text(ex, ey - 12, 'Çıkış', {
        fontSize: '14px', fontFamily: 'Nunito, Arial, sans-serif', color: '#aa6aee',
        stroke: '#000', strokeThickness: 2
      }).setDepth(20);
    } else {
      this.add.text(ex, ey - 12, `Yukarı Kat ${this.currentFloor - 1}`, {
        fontSize: '14px', fontFamily: 'Nunito, Arial, sans-serif', color: '#66AAFF',
        stroke: '#000', strokeThickness: 2
      }).setDepth(20);
    }

    this.exitZone = this.add.zone(ex, ey, 32, 32);
    this.physics.world.enable(this.exitZone);
    this.exitZone.body.setAllowGravity(false);
  }

  createFloorTransitions() {
    // Aşağı iniş portali - son odada, boss öldürülünce açılır
    if (this.currentFloor < 10 && this.rooms.length > 1) {
      const lastRoom = this.rooms[this.rooms.length - 1];
      const dx = (lastRoom.x + lastRoom.w - 1) * 64;
      const dy = (lastRoom.y + lastRoom.h - 1) * 64;

      this.downText = this.add.text(dx, dy - 12, `Kat ${this.currentFloor + 1} ↓`, {
        fontSize: '14px', fontFamily: 'Nunito, Arial, sans-serif', color: '#FF6600',
        stroke: '#000', strokeThickness: 2
      }).setDepth(20).setVisible(false);

      this.downZone = this.add.zone(dx, dy, 32, 32);
      this.physics.world.enable(this.downZone);
      this.downZone.body.setAllowGravity(false);

      // Portal glow (hidden until boss dead)
      this.downGlow = this.add.graphics().setDepth(4);
    }
  }

  createEntranceNPC() {
    // İlk katta giriş odasında NPC
    if (this.currentFloor === 1 && this.rooms.length > 0) {
      const startRoom = this.rooms[0];
      const nx = (startRoom.x + startRoom.w / 2 + 2) * 64;
      const ny = (startRoom.y + startRoom.h / 2) * 64;

      this.entranceNPC = this.physics.add.staticSprite(nx, ny, 'npc_dungeon_keeper');
      this.entranceNPC.setSize(20, 24).setDepth(9);
      this.entranceNPC.npcId = 'dungeon_keeper';
      this.entranceNPC.npcData = NPCS.dungeon_keeper;

      this.add.text(nx, ny - 60, 'Zindan Bekçisi', {
        fontSize: '14px', fontFamily: 'Nunito, Arial, sans-serif', color: '#FFD700',
        fontStyle: 'bold', stroke: '#000', strokeThickness: 3
      }).setOrigin(0.5).setDepth(9999);

      // Quest mark
      const hasQuest = Object.values(QUESTS).some(q =>
        q.npc === 'dungeon_keeper' &&
        !this.playerState.completedQuests[q.id] &&
        !this.playerState.activeQuests[q.id] &&
        this.playerState.level >= q.minLevel
      );
      if (hasQuest) {
        this.add.text(nx, ny - 78, '!', {
          fontSize: '24px', fontFamily: 'Nunito, Arial, sans-serif', color: '#FFD700',
          fontStyle: 'bold', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(9999);
      }
    }
  }

  createFloorUI() {
    if (this.currentFloor === 10) {
      // 10. kat: özel boss UI
      this.floorText = this.add.text(10, 10, '⚔ SON KAT - ALACAKARANLIK EFENDİSİ ⚔', {
        fontSize: '18px', fontFamily: 'Nunito, Arial, sans-serif', color: '#FF0000',
        fontStyle: 'bold', stroke: '#000', strokeThickness: 4
      }).setScrollFactor(0).setDepth(10000);

      this.bossStatusText = this.add.text(10, 34, 'Kötülüğün kalbi atıyor...', {
        fontSize: '14px', fontFamily: 'Nunito, Arial, sans-serif', color: '#FF4444',
        fontStyle: 'italic', stroke: '#000', strokeThickness: 2
      }).setScrollFactor(0).setDepth(10000);

      // Boss HP bar (büyük, ekranın üstünde)
      this.bossHPBarBg = this.add.rectangle(400, 58, 500, 16, 0x000000, 0.7)
        .setScrollFactor(0).setDepth(10000);
      this.bossHPBar = this.add.rectangle(150, 58, 500, 12, 0xFF0000)
        .setScrollFactor(0).setDepth(10001).setOrigin(0, 0.5);
      this.bossHPText = this.add.text(400, 58, '', {
        fontSize: '12px', fontFamily: 'Nunito, Arial, sans-serif', color: '#FFFFFF',
        fontStyle: 'bold', stroke: '#000', strokeThickness: 2
      }).setScrollFactor(0).setDepth(10002).setOrigin(0.5);
    } else {
      this.floorText = this.add.text(10, 10, `Zindan - Kat ${this.currentFloor}/10`, {
        fontSize: '18px', fontFamily: 'Nunito, Arial, sans-serif', color: '#FF6600',
        fontStyle: 'bold', stroke: '#000', strokeThickness: 3
      }).setScrollFactor(0).setDepth(10000);

      this.bossStatusText = this.add.text(10, 32, 'Boss: Hayatta', {
        fontSize: '14px', fontFamily: 'Nunito, Arial, sans-serif', color: '#FF4444',
        stroke: '#000', strokeThickness: 2
      }).setScrollFactor(0).setDepth(10000);
    }
  }

  setupCamera() {
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight);

    if (this.currentFloor === 10) {
      // Kat 10: Daha yakın zoom, kırmızı atmosfer
      this.cameras.main.setZoom(0.7);
      // Kırmızı karanlık overlay
      this.add.rectangle(this.mapWidth / 2, this.mapHeight / 2, this.mapWidth, this.mapHeight, 0x1a0000, 0.35).setDepth(45);
      // Kırmızı titreşim efekti
      this.time.addEvent({
        delay: 3000,
        loop: true,
        callback: () => {
          this.cameras.main.shake(200, 0.003);
        }
      });
      // Parçacık efekti - ateş kıvılcımları
      if (this.rooms.length > 1) {
        const br = this.rooms[1];
        this.add.particles(0, 0, 'particle_hit', {
          x: { min: br.x * 64, max: (br.x + br.w) * 64 },
          y: { min: br.y * 64, max: (br.y + br.h) * 64 },
          lifespan: 3000,
          speed: { min: 5, max: 20 },
          scale: { start: 0.5, end: 0 },
          alpha: { start: 0.6, end: 0 },
          tint: [0xFF0000, 0xFF4500, 0x8B0000],
          frequency: 200,
          blendMode: 'ADD'
        }).setDepth(46);
      }
    } else {
      this.cameras.main.setZoom(0.6);
      const darkness = 0.2 + this.currentFloor * 0.02;
      this.add.rectangle(this.mapWidth / 2, this.mapHeight / 2, this.mapWidth, this.mapHeight, 0x0a0a1a, Math.min(darkness, 0.5)).setDepth(45);
    }
  }

  setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' });
    this.interactKey = this.input.keyboard.addKey('E');

    // Skill keys 1-4
    this.input.keyboard.on('keydown-ONE', () => this.useSkillSlot(0));
    this.input.keyboard.on('keydown-TWO', () => this.useSkillSlot(1));
    this.input.keyboard.on('keydown-THREE', () => this.useSkillSlot(2));
    this.input.keyboard.on('keydown-FOUR', () => this.useSkillSlot(3));
  }

  update(time, delta) {
    if (!this.player || !this.player.active) return;
    this.handleMovement();
    this.handleAutoAttack(time);
    this.updateMonsters(time, delta);
    this.updateMonsterHPBars();
    if (this.combatUtils) {
      this.combatUtils.checkProjectileCollisions(this.monsterObjects);
      this.combatUtils.updateMonsterEffects(this.monsterObjects);
    }
    if (this.bossPatterns) this.bossPatterns.update(this.player, this.monsterObjects);
    this.playerState.updateBuffs();
    this.playerState.regenMana(delta);
    this.player.setDepth(this.player.y + 10);

    // Sync equip overlays
    if (this.equipSprites) {
      const frame = this.player.frame ? this.player.frame.name : 0;
      const ps = this.playerState;
      Object.entries(this.equipSprites).forEach(([slot, spr]) => {
        spr.setPosition(this.player.x, this.player.y);
        spr.setDepth(this.player.depth + 1);
        spr.setFrame(frame);
        spr.setVisible(!!ps.equipped[slot]);
      });
    }

    // 10. kat boss HP bar güncelleme
    if (this.currentFloor === 10 && this.bossHPBar) {
      const bossMonster = this.monsterObjects.find(m => m.active && m.monsterData.isBoss && !m.monsterData.isDead);
      if (bossMonster) {
        const ratio = bossMonster.monsterData.currentHp / bossMonster.monsterData.hp;
        this.bossHPBar.setScale(Math.max(0, ratio), 1);
        const hpColor = ratio > 0.5 ? 0xFF0000 : ratio > 0.25 ? 0xFF6600 : 0xFF00FF;
        this.bossHPBar.setFillStyle(hpColor);
        this.bossHPText.setText(`${Math.max(0, bossMonster.monsterData.currentHp).toLocaleString()} / ${bossMonster.monsterData.hp.toLocaleString()}`);
      }
    }

    // Boss defeated check
    if (!this.bossDefeated) {
      const bossAlive = this.monsterObjects.some(m => m.active && !m.monsterData.isDead && m.monsterData.isBoss);
      if (!bossAlive && this.monsterObjects.some(m => m.monsterData.isBoss)) {
        this.bossDefeated = true;
        if (this.currentFloor === 10) {
          this.bossStatusText.setText('KÖTÜLÜK YOK EDİLDİ!').setColor('#FFD700');
          if (this.bossHPBar) this.bossHPBar.setVisible(false);
          if (this.bossHPBarBg) this.bossHPBarBg.setVisible(false);
          if (this.bossHPText) this.bossHPText.setVisible(false);
          // Zafer efekti
          this.cameras.main.flash(2000, 255, 215, 0);
          this.showDamage(this.player.x, this.player.y - 70, '🏆 ZAFER! 🏆', '#FFD700');
          this.showDamage(this.player.x, this.player.y - 90, 'Alacakaranlık Efendisi Yok Edildi!', '#FFD700');
        } else {
          this.bossStatusText.setText('Boss: Yenildi!').setColor('#00FF00');
        }
        // Aşağı portal aç
        if (this.downText) {
          this.downText.setVisible(true);
          if (this.downGlow) {
            const lastRoom = this.rooms[this.rooms.length - 1];
            const dx = (lastRoom.x + lastRoom.w - 1) * 64;
            const dy = (lastRoom.y + lastRoom.h - 1) * 64;
            this.downGlow.fillStyle(0xFF6600, 0.4);
            this.downGlow.fillCircle(dx, dy, 20);
          }
        }
        // Boss kill kaydet
        const floorData = DUNGEON_FLOOR_MONSTERS[this.currentFloor];
        if (floorData) {
          this.playerState.addBossKill(floorData.boss);
        }
        this.showDamage(this.player.x, this.player.y - 50, 'BOSS YENİLDİ!', '#FFD700');
      }
    }

    // Otomatik etkileşim (yakınlık bazlı + E tuşu desteği)
    // Spawn sonrası 2sn koruma (spawn yakınında hemen tetiklenmemesi için)
    const now = this.time.now;
    if (!this._spawnTime) this._spawnTime = now;
    const spawnSafe = now - this._spawnTime < 2000;
    const ePressed = Phaser.Input.Keyboard.JustDown(this.interactKey);
    if ((now > (this._lastAutoInteract || 0) + 800 && !spawnSafe) || ePressed) {
      // Exit/up
      const exitDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.exitZone.x, this.exitZone.y);
      if (exitDist < 35 || (ePressed && exitDist < 50)) {
        this._lastAutoInteract = now;
        if (this.currentFloor === 1) {
          this.playerState.dungeonFloor = 1;
          this.playerState.save();
          this.scene.start('OverworldScene');
          return;
        } else {
          this.playerState.dungeonFloor = this.currentFloor - 1;
          this.playerState.save();
          this.scene.restart();
          return;
        }
      }

      // Down to next floor
      if (this.bossDefeated && this.downZone && this.currentFloor < 10) {
        const downDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.downZone.x, this.downZone.y);
        if (downDist < 35 || (ePressed && downDist < 50)) {
          this._lastAutoInteract = now;
          this.playerState.dungeonFloor = this.currentFloor + 1;
          if (this.currentFloor + 1 > this.playerState.maxDungeonFloor) {
            this.playerState.maxDungeonFloor = this.currentFloor + 1;
          }
          this.playerState.save();
          this.scene.restart();
          return;
        }
      }

      // NPC interaction
      if (this.entranceNPC) {
        const npcDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.entranceNPC.x, this.entranceNPC.y);
        if (npcDist < 45 || (ePressed && npcDist < 60)) {
          this._lastAutoInteract = now;
          this.handleNPCInteraction(this.entranceNPC);
        }
      }
    }

    this.playerState.regenMana(delta);
    this.scene.get('UIScene')?.events?.emit('updateUI');
  }

  handleNPCInteraction(npc) {
    const ps = this.playerState;
    const npcData = npc.npcData;
    const uiScene = this.scene.get('UIScene');

    // Aktif görev tamamlama kontrolü
    const activeQuest = Object.values(QUESTS).find(q =>
      q.npc === npc.npcId && ps.activeQuests[q.id]
    );

    if (activeQuest) {
      let progress = 0;
      if (activeQuest.type === 'kill') progress = ps.getKills(activeQuest.target);
      else if (activeQuest.type === 'gather') progress = ps.getGather(activeQuest.target);

      if (progress >= activeQuest.required) {
        // Görev tamamlandı
        activeQuest.rewards.items?.forEach(id => ps.addItem(id));
        ps.addExp(activeQuest.rewards.exp);
        ps.gold += activeQuest.rewards.gold;
        ps.completeQuest(activeQuest.id);
        if (uiScene?.showDialogue) {
          uiScene.showDialogue(npcData.name, `${npcData.dialogue.questComplete}\n\n+${activeQuest.rewards.exp} EXP, +${activeQuest.rewards.gold} Altın`);
        }
        return;
      } else {
        if (uiScene?.showDialogue) {
          uiScene.showDialogue(npcData.name, `${activeQuest.name}: ${progress}/${activeQuest.required}`);
        }
        return;
      }
    }

    // Yeni görev ver
    const availableQuest = Object.values(QUESTS).find(q =>
      q.npc === npc.npcId && !ps.completedQuests[q.id] && !ps.activeQuests[q.id] && ps.level >= q.minLevel
    );

    if (availableQuest) {
      ps.acceptQuest(availableQuest.id);
      if (uiScene?.showDialogue) {
        uiScene.showDialogue(npcData.name, `Yeni Görev: ${availableQuest.name}\n${availableQuest.desc}`);
      }
    } else {
      if (uiScene?.showDialogue) {
        uiScene.showDialogue(npcData.name, npcData.dialogue.greeting);
      }
    }
  }

  handleMovement() {
    const speed = this.playerState.speed;
    let vx = 0, vy = 0;
    if (this.cursors.left.isDown || this.wasd.left.isDown) { vx = -speed; this.playerDirection = 'left'; }
    else if (this.cursors.right.isDown || this.wasd.right.isDown) { vx = speed; this.playerDirection = 'right'; }
    if (this.cursors.up.isDown || this.wasd.up.isDown) { vy = -speed; this.playerDirection = 'up'; }
    else if (this.cursors.down.isDown || this.wasd.down.isDown) { vy = speed; this.playerDirection = 'down'; }
    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }
    this.player.setVelocity(vx, vy);
    if (vx !== 0 || vy !== 0) this.player.play(`walk_${this.playerDirection}`, true);
    else this.player.stop();
  }

  handleAutoAttack(time) {
    if (this.attackCooldown > time) return;
    const ps = this.playerState;
    const weapon = ps.equipped.weapon;
    const wType = weapon?.weaponType || 'sword';
    let range = 80;
    if (wType === 'bow') range = 250;
    if (wType === 'staff') range = 200;

    let closest = null, closestDist = range;
    this.monsterObjects.forEach(m => {
      if (!m.active || m.monsterData.isDead) return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, m.x, m.y);
      if (d < closestDist) { closestDist = d; closest = m; }
    });
    if (closest) {
      if (wType === 'staff') { if (!ps.useMana(weapon.manaCost || 5)) return; }

      if ((wType === 'bow' || wType === 'staff') && this.combatUtils) {
        const dmg = Math.max(1, ps.getAttack() - closest.monsterData.defense);
        const texKey = wType === 'bow' ? 'projectile_arrow' : 'projectile_magic';
        const speed = wType === 'bow' ? 350 : 250;
        this.combatUtils.fireProjectile(texKey, this.player.x, this.player.y, closest.x, closest.y, speed, dmg, { maxRange: range * 1.3 });
      } else {
        const dmg = Math.max(1, ps.getAttack() - closest.monsterData.defense);
        closest.monsterData.currentHp -= dmg;
        closest.monsterData.aggroed = true;
        this.showDamage(closest.x, closest.y - 16, dmg, '#FFF');
        closest.setTintFill(0xFFFFFF);
        this.time.delayedCall(100, () => { if (closest.active) closest.clearTint(); });
        if (closest.monsterData.currentHp <= 0) this.killMonster(closest);
      }
      this.attackCooldown = time + (wType === 'sword' ? 500 : wType === 'bow' ? 700 : 900);
    }
  }

  killMonster(monster) {
    const data = monster.monsterData;
    data.isDead = true;
    const ps = this.playerState;
    const actualExp = Math.floor(data.exp * ps.getExpMultiplier());
    const lvl = ps.addExp(data.exp);
    ps.gold += data.gold;
    ps.addKill(data.id);

    if (data.isBoss) {
      ps.addBossKill(data.id);
    }

    this.showDamage(monster.x, monster.y - 24, `+${actualExp} EXP`, '#9a6aea');
    this.showDamage(monster.x, monster.y - 36, `+${data.gold} Gold`, '#FFD700');
    if (lvl) this.showDamage(this.player.x, this.player.y - 40, 'LEVEL UP!', '#FFD700');

    const lootTable = LOOT_TABLES[data.id];
    if (lootTable) {
      lootTable.forEach(loot => {
        if (Math.random() < loot.chance) {
          const itemData = ITEMS[loot.item];
          if (!itemData) return;
          const enhancedEntry = ps.rollEnhancement(loot.item);
          const isEnh = ps.isEnhanced(enhancedEntry);
          if (ps.addItem(enhancedEntry)) {
            const name = isEnh ? `✦ ${itemData.name}` : `+${itemData.name}`;
            const color = isEnh ? '#FFD700' : itemData.color;
            this.showDamage(monster.x, monster.y - 48, name, color);
          }
        }
      });
    }

    monster.hpBar.clear();
    if (monster.nameLabel) { monster.nameLabel.destroy(); monster.nameLabel = null; }
    monster.destroy();
  }

  updateMonsters(time, delta) {
    this.monsterObjects.forEach(m => {
      if (!m.active || m.monsterData.isDead) return;
      const d = m.monsterData;
      const dist = Phaser.Math.Distance.Between(m.x, m.y, this.player.x, this.player.y);
      if (dist < d.aggroRange || d.aggroed) {
        const angle = Phaser.Math.Angle.Between(m.x, m.y, this.player.x, this.player.y);
        if (dist > 50) {
          m.body.setVelocity(Math.cos(angle) * d.speed, Math.sin(angle) * d.speed);
        } else {
          m.body.setVelocity(0, 0);
        }
        if (dist < 55 && time > (m.lastAttackTime || 0) + 1000) {
          const dmg = this.playerState.takeDamage(d.attack);
          this.showDamage(this.player.x, this.player.y - 20, dmg, '#FF4444');
          m.lastAttackTime = time;
          if (this.playerState.isDead()) {
            this.playerState.hp = Math.floor(this.playerState.getMaxHp() * 0.5);
            this.playerState.dungeonFloor = 1;
            this.playerState.save();
            this.scene.start('OverworldScene');
          }
        }
      } else {
        d.wanderTimer -= delta;
        if (d.wanderTimer <= 0) {
          d.wanderTimer = Phaser.Math.Between(1000, 3000);
          const a = Math.random() * Math.PI * 2;
          d.wanderDir = { x: Math.cos(a) * d.speed * 0.3, y: Math.sin(a) * d.speed * 0.3 };
        }
        m.body.setVelocity(d.wanderDir.x, d.wanderDir.y);
      }
    });
  }

  updateMonsterHPBars() {
    this.monsterObjects.forEach(m => {
      if (!m.active || m.monsterData.isDead) return;
      const bar = m.hpBar;
      bar.clear().setDepth(9998);
      const ratio = m.monsterData.currentHp / m.monsterData.hp;
      const bw = 28, bh = 3;
      const bx = m.x - bw / 2, by = m.y - m.height / 2 - 6;
      bar.fillStyle(0x000000, 0.6).fillRect(bx, by, bw, bh);
      bar.fillStyle(ratio > 0.5 ? 0x00CC00 : ratio > 0.25 ? 0xCCCC00 : 0xCC0000).fillRect(bx, by, bw * ratio, bh);
      if (m.nameLabel) m.nameLabel.setPosition(m.x, by - 10);
    });
  }

  showDamage(x, y, text, color) {
    const t = this.add.text(x, y, String(text), {
      fontSize: '16px', fontFamily: 'Nunito, Arial, sans-serif', color, stroke: '#000', strokeThickness: 3, fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(10000);
    this.tweens.add({ targets: t, y: y - 30, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }

  useSkillSlot(slotIndex) {
    if (!this.skillSystem) return;
    const skills = this.skillSystem.getAvailableSkills();
    if (slotIndex >= skills.length) return;
    const skill = skills[slotIndex];

    let target = null, minDist = skill.range || 200;
    this.monsterObjects.forEach(m => {
      if (!m.active || m.monsterData.isDead) return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, m.x, m.y);
      if (d < minDist) { minDist = d; target = m; }
    });

    const result = this.skillSystem.useSkill(skill.id, this.player, target, this.monsterObjects);
    if (!result.success) {
      const uiScene = this.scene.get('UIScene');
      if (uiScene) uiScene.showNotification(result.reason);
    }

    this.monsterObjects.forEach(m => {
      if (m.active && m.monsterData && !m.monsterData.isDead && m.monsterData.currentHp <= 0) {
        this.killMonster(m);
      }
    });
  }
}
