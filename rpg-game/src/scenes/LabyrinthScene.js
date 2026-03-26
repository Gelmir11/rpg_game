import Phaser from 'phaser';
import { PlayerState } from '../systems/PlayerState.js';
import { MONSTERS, LABYRINTH_MONSTERS } from '../data/monsters.js';
import { ITEMS, LOOT_TABLES } from '../data/items.js';
import { NPCS, QUESTS } from '../data/quests.js';
import { SkillSystem } from '../systems/SkillSystem.js';
import { CombatUtils } from '../systems/CombatUtils.js';
import { BossPatternSystem } from '../systems/BossPatterns.js';

export class LabyrinthScene extends Phaser.Scene {
  constructor() {
    super('LabyrinthScene');
  }

  create() {
    this.playerState = PlayerState.getInstance();
    this.attackCooldown = 0;
    this.autoAttackRange = 80;
    this.monsterObjects = [];
    this.bossDefeated = false;
    this.skillSystem = new SkillSystem(this);
    this.combatUtils = new CombatUtils(this);
    this.bossPatterns = new BossPatternSystem(this);

    this.createMaze();
    this.createPlayer();
    this.createMonsters();
    this.createBoss();
    this.createExitPortal();
    this.createEntranceNPC();
    this.setupCamera();
    this.setupInput();

    this.cameras.main.setBackgroundColor('#0a0808');
  }

  createMaze() {
    const w = 35, h = 35, ts = 64;
    const grid = Array.from({ length: h }, () => Array(w).fill(32));

    const visited = Array.from({ length: h }, () => Array(w).fill(false));
    const stack = [{ x: 1, y: 1 }];
    visited[1][1] = true;
    grid[1][1] = 16;

    while (stack.length > 0) {
      const curr = stack[stack.length - 1];
      const neighbors = [];
      const dirs = [{ dx: 0, dy: -2 }, { dx: 2, dy: 0 }, { dx: 0, dy: 2 }, { dx: -2, dy: 0 }];

      dirs.forEach(d => {
        const nx = curr.x + d.dx, ny = curr.y + d.dy;
        if (nx > 0 && nx < w - 1 && ny > 0 && ny < h - 1 && !visited[ny][nx]) {
          neighbors.push({ x: nx, y: ny, mx: curr.x + d.dx / 2, my: curr.y + d.dy / 2 });
        }
      });

      if (neighbors.length > 0) {
        const next = Phaser.Utils.Array.GetRandom(neighbors);
        visited[next.y][next.x] = true;
        grid[next.y][next.x] = 16 + Phaser.Math.Between(0, 3);
        grid[next.my][next.mx] = 16 + Phaser.Math.Between(0, 3);
        stack.push({ x: next.x, y: next.y });
      } else {
        stack.pop();
      }
    }

    for (let i = 0; i < 40; i++) {
      const rx = Phaser.Math.Between(2, w - 3);
      const ry = Phaser.Math.Between(2, h - 3);
      if (grid[ry][rx] >= 32) grid[ry][rx] = 16;
    }

    const mapData = grid.map(row => [...row]);
    const map = this.make.tilemap({ data: mapData, tileWidth: ts, tileHeight: ts });
    const tileset = map.addTilesetImage('__default', 'tileset', ts, ts, 1, 2);
    const layer = map.createLayer(0, tileset, 0, 0);
    layer.setCollision([32, 33, 34, 35, 36, 37, 38, 39]);

    this.map = map;
    this.groundLayer = layer;
    this.mazeGrid = grid;
    this.mapWidth = w * ts;
    this.mapHeight = h * ts;
    this.physics.world.setBounds(0, 0, this.mapWidth, this.mapHeight);
  }

  createPlayer() {
    const ps = this.playerState;
    const pTex = ps.gender === 'female' ? 'player_female' : 'player';
    this.player = this.physics.add.sprite(96, 96, pTex, 0);
    this.player.setSize(28, 28).setOffset(18, 60).setDepth(10).setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.groundLayer);

    if (!this.anims.exists('walk_down')) {
      this.anims.create({ key: 'walk_down', frames: [{ key: pTex, frame: 0 }, { key: pTex, frame: 1 }], frameRate: 6, repeat: -1 });
      this.anims.create({ key: 'walk_left', frames: [{ key: pTex, frame: 2 }, { key: pTex, frame: 3 }], frameRate: 6, repeat: -1 });
      this.anims.create({ key: 'walk_right', frames: [{ key: pTex, frame: 4 }, { key: pTex, frame: 5 }], frameRate: 6, repeat: -1 });
      this.anims.create({ key: 'walk_up', frames: [{ key: pTex, frame: 6 }, { key: pTex, frame: 7 }], frameRate: 6, repeat: -1 });
    }
    this.playerDirection = 'down';

    const suffix = ps.gender === 'female' ? '_f' : '';
    this.equipSprites = {};
    ['legs', 'chest', 'arms', 'belt', 'head', 'weapon', 'necklace', 'earring'].forEach(slot => {
      const spr = this.add.sprite(96, 96, `equip_${slot}${suffix}`, 0);
      spr.setDepth(11).setVisible(!!ps.equipped[slot]);
      this.equipSprites[slot] = spr;
    });
  }

  createMonsters() {
    const openTiles = [];
    for (let y = 2; y < 33; y++)
      for (let x = 2; x < 33; x++)
        if (this.mazeGrid[y][x] < 32 && !(x <= 2 && y <= 2))
          openTiles.push({ x: x * 64 + 32, y: y * 64 + 32 });

    Phaser.Utils.Array.Shuffle(openTiles);

    // Labyrinth'e özel canavarlar
    LABYRINTH_MONSTERS.forEach((type, i) => {
      if (i >= openTiles.length) return;
      const pos = openTiles[i];
      this.spawnMonster(type, pos.x, pos.y);
    });
  }

  createBoss() {
    // Labirent Muhafızı - labirentin en uzak noktasında
    const openTiles = [];
    for (let y = 20; y < 33; y++)
      for (let x = 20; x < 33; x++)
        if (this.mazeGrid[y][x] < 32)
          openTiles.push({ x: x * 64 + 32, y: y * 64 + 32 });

    if (openTiles.length > 0) {
      const bossPos = openTiles[openTiles.length - 1];
      const boss = this.spawnMonster('labyrinth_guardian', bossPos.x, bossPos.y);
      if (boss) {
        boss.monsterData.isBoss = true;
        if (this.bossPatterns) this.bossPatterns.initBoss(boss);
        this.add.text(bossPos.x, bossPos.y - 50, 'BOSS: Labirent Muhafızı', {
          fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#FF4444',
          fontStyle: 'bold', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(9999);
      }
    }
  }

  spawnMonster(type, x, y) {
    const data = MONSTERS[type];
    if (!data) return null;
    const monster = this.physics.add.sprite(x, y, type, 0);
    monster.setSize(24, 24).setDepth(9);
    monster.body.allowGravity = false;
    monster.body.immovable = false;
    monster.body.moves = true;
    monster.monsterData = { ...data, currentHp: data.hp, spawnX: x, spawnY: y, wanderTimer: 0, wanderDir: { x: 0, y: 0 }, isDead: false };

    if (!this.anims.exists(`${type}_idle`)) {
      this.anims.create({ key: `${type}_idle`, frames: [{ key: type, frame: 0 }, { key: type, frame: 1 }], frameRate: 3, repeat: -1 });
    }
    monster.play(`${type}_idle`);
    monster.hpBar = this.add.graphics();
    monster.nameLabel = this.add.text(x, y - 20, `${data.name} Lv.${data.level}`, {
      fontSize: '12px', fontFamily: 'Arial, sans-serif', color: data.isBoss ? '#FF4444' : '#ff9999',
      stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(9997);
    this.monsterObjects.push(monster);
    return monster;
  }

  createExitPortal() {
    this.add.text(96, 50, 'Çıkış [E]', {
      fontSize: '20px', fontFamily: 'Arial, sans-serif', color: '#aa6aee',
      fontStyle: 'bold', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(9999);
    this.exitZone = this.add.zone(96, 80, 48, 48);
    this.physics.world.enable(this.exitZone);
    this.exitZone.body.setAllowGravity(false);
  }

  createEntranceNPC() {
    const nx = 160, ny = 96;
    this.entranceNPC = this.physics.add.staticSprite(nx, ny, 'npc_labyrinth_sage');
    this.entranceNPC.setSize(20, 24).setDepth(9);
    this.entranceNPC.npcId = 'labyrinth_sage';
    this.entranceNPC.npcData = NPCS.labyrinth_sage;

    this.add.text(nx, ny - 60, 'Labirent Bilgesi', {
      fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#FFD700',
      fontStyle: 'bold', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(9999);

    // Quest mark
    const hasQuest = Object.values(QUESTS).some(q =>
      q.npc === 'labyrinth_sage' &&
      !this.playerState.completedQuests[q.id] &&
      !this.playerState.activeQuests[q.id] &&
      this.playerState.level >= q.minLevel
    );
    if (hasQuest) {
      this.add.text(nx, ny - 78, '!', {
        fontSize: '24px', fontFamily: 'Arial, sans-serif', color: '#FFD700',
        fontStyle: 'bold', stroke: '#000', strokeThickness: 4
      }).setOrigin(0.5).setDepth(9999);
    }
  }

  setupCamera() {
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight);
    this.cameras.main.setZoom(0.7);
    this.add.rectangle(this.mapWidth / 2, this.mapHeight / 2, this.mapWidth, this.mapHeight, 0x1a0a2a, 0.2).setDepth(45);
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
    if (this.combatUtils) {
      this.combatUtils.checkProjectileCollisions(this.monsterObjects);
      this.combatUtils.updateMonsterEffects(this.monsterObjects);
    }
    if (this.bossPatterns) this.bossPatterns.update(this.player, this.monsterObjects);
    this.playerState.updateBuffs();
    this.playerState.regenMana(delta);
    this.updateMonsterHPBars();
    this.player.setDepth(this.player.y + 10);

    if (this.equipSprites) {
      const ps = this.playerState;
      const frame = this.player.frame ? this.player.frame.name : 0;
      Object.entries(this.equipSprites).forEach(([slot, spr]) => {
        spr.setPosition(this.player.x, this.player.y);
        spr.setDepth(this.player.depth + 1);
        spr.setFrame(frame);
        spr.setVisible(!!ps.equipped[slot]);
      });
    }

    // Boss defeated check
    if (!this.bossDefeated) {
      const bossAlive = this.monsterObjects.some(m => m.active && !m.monsterData.isDead && m.monsterData.isBoss);
      if (!bossAlive && this.monsterObjects.some(m => m.monsterData.isBoss)) {
        this.bossDefeated = true;
        this.playerState.addBossKill('labyrinth_guardian');
        this.showDamage(this.player.x, this.player.y - 50, 'BOSS YENİLDİ!', '#FFD700');
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.exitZone.x, this.exitZone.y);
      if (dist < 60) { this.playerState.save(); this.scene.start('OverworldScene'); }

      // NPC interaction
      if (this.entranceNPC) {
        const npcDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.entranceNPC.x, this.entranceNPC.y);
        if (npcDist < 60) {
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

    const activeQuest = Object.values(QUESTS).find(q =>
      q.npc === npc.npcId && ps.activeQuests[q.id]
    );

    if (activeQuest) {
      let progress = 0;
      if (activeQuest.type === 'kill') progress = ps.getKills(activeQuest.target);
      else if (activeQuest.type === 'gather') progress = ps.getGather(activeQuest.target);

      if (progress >= activeQuest.required) {
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
      fontSize: '16px', fontFamily: 'Arial, sans-serif', color, stroke: '#000', strokeThickness: 3, fontStyle: 'bold'
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
