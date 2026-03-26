import Phaser from 'phaser';
import { PlayerState } from './PlayerState.js';
import { MONSTERS } from '../data/monsters.js';

// Boss saldırı kalıpları tanımları
const BOSS_PATTERNS = {
  zone_boss_default: {
    phases: [
      { hpThreshold: 0.75, patterns: ['area_attack'], interval: 8000 },
      { hpThreshold: 0.50, patterns: ['area_attack', 'summon_minions'], interval: 6000 },
      { hpThreshold: 0.25, patterns: ['charge', 'area_attack', 'summon_minions'], interval: 4000 }
    ]
  },
  labyrinth_boss: {
    phases: [
      { hpThreshold: 0.75, patterns: ['area_attack'], interval: 8000 },
      { hpThreshold: 0.50, patterns: ['teleport', 'area_attack'], interval: 6000 },
      { hpThreshold: 0.25, patterns: ['summon_minions', 'projectile_barrage', 'teleport'], interval: 4000 }
    ]
  },
  dungeon_boss_low: {
    phases: [
      { hpThreshold: 0.75, patterns: ['area_attack'], interval: 7000 },
      { hpThreshold: 0.50, patterns: ['area_attack', 'charge'], interval: 5000 },
      { hpThreshold: 0.25, patterns: ['charge', 'summon_minions'], interval: 4000 }
    ]
  },
  dungeon_boss_mid: {
    phases: [
      { hpThreshold: 0.75, patterns: ['projectile_barrage'], interval: 7000 },
      { hpThreshold: 0.50, patterns: ['area_attack', 'projectile_barrage', 'summon_minions'], interval: 5000 },
      { hpThreshold: 0.25, patterns: ['charge', 'projectile_barrage', 'enrage'], interval: 3500 }
    ]
  },
  dungeon_boss_final: {
    phases: [
      { hpThreshold: 0.75, patterns: ['projectile_barrage', 'summon_minions'], interval: 6000 },
      { hpThreshold: 0.50, patterns: ['area_attack', 'charge', 'teleport'], interval: 4000 },
      { hpThreshold: 0.25, patterns: ['dark_nova', 'summon_minions', 'enrage'], interval: 3000 }
    ]
  }
};

// Boss ID → pattern key mapping
const BOSS_PATTERN_MAP = {
  // Zone bosses
  slime_king: 'zone_boss_default',
  goblin_chief: 'zone_boss_default',
  skeleton_lord: 'zone_boss_default',
  orc_warlord: 'zone_boss_default',
  alpha_wolf: 'zone_boss_default',
  crystal_golem: 'zone_boss_default',
  wraith_queen: 'zone_boss_default',
  drake_mother: 'zone_boss_default',
  ancient_dragon: 'zone_boss_default',
  // Labyrinth
  labyrinth_guardian: 'labyrinth_boss',
  // Dungeon floors 1-4
  dungeon_boss_1: 'dungeon_boss_low',
  dungeon_boss_2: 'dungeon_boss_low',
  dungeon_boss_3: 'dungeon_boss_low',
  dungeon_boss_4: 'dungeon_boss_low',
  // Dungeon floors 5-8
  dungeon_boss_5: 'dungeon_boss_mid',
  dungeon_boss_6: 'dungeon_boss_mid',
  dungeon_boss_7: 'dungeon_boss_mid',
  dungeon_boss_8: 'dungeon_boss_mid',
  // Dungeon floors 9-10
  dungeon_boss_9: 'dungeon_boss_mid',
  dungeon_boss_10: 'dungeon_boss_final'
};

export class BossPatternSystem {
  constructor(scene) {
    this.scene = scene;
    this.activeBosses = new Map(); // monster -> bossState
  }

  initBoss(monsterSprite) {
    const data = monsterSprite.monsterData;
    if (!data) return;

    const patternKey = BOSS_PATTERN_MAP[data.id] || 'zone_boss_default';
    const pattern = BOSS_PATTERNS[patternKey];
    if (!pattern) return;

    this.activeBosses.set(monsterSprite, {
      pattern,
      currentPhase: 0,
      lastPatternTime: Date.now(),
      enraged: false,
      patternIndex: 0
    });
  }

  update(playerSprite, monsterGroup) {
    const now = Date.now();

    this.activeBosses.forEach((state, boss) => {
      if (!boss.active || boss.monsterData.isDead) {
        this.activeBosses.delete(boss);
        return;
      }

      const data = boss.monsterData;
      const hpRatio = data.currentHp / data.hp;

      // Determine current phase
      let phaseIndex = 0;
      for (let i = state.pattern.phases.length - 1; i >= 0; i--) {
        if (hpRatio <= state.pattern.phases[i].hpThreshold) {
          phaseIndex = i;
          break;
        }
      }

      // Phase transition effect
      if (phaseIndex > state.currentPhase) {
        state.currentPhase = phaseIndex;
        this.onPhaseChange(boss, phaseIndex);
      }

      const phase = state.pattern.phases[phaseIndex];
      if (!phase) return;

      // Execute pattern on interval
      if (now - state.lastPatternTime >= phase.interval) {
        state.lastPatternTime = now;
        const patternName = phase.patterns[state.patternIndex % phase.patterns.length];
        state.patternIndex++;
        this.executePattern(patternName, boss, playerSprite, monsterGroup);
      }
    });
  }

  onPhaseChange(boss, phaseIndex) {
    const scene = this.scene;

    // Screen flash
    scene.cameras.main.flash(300, 255, 50, 50);

    // Phase text
    const phaseNames = ['Faz 2', 'Faz 3', 'Son Faz!'];
    const text = scene.add.text(boss.x, boss.y - 60, `⚠ ${phaseNames[phaseIndex - 1] || 'Yeni Faz!'} ⚠`, {
      fontSize: '20px', fontFamily: 'Arial, sans-serif', color: '#FF4444',
      fontStyle: 'bold', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(10000);

    scene.tweens.add({
      targets: text, y: boss.y - 100, alpha: 0,
      duration: 2000, onComplete: () => text.destroy()
    });

    // Boss roar shake
    scene.cameras.main.shake(200, 0.01);
  }

  executePattern(patternName, boss, player, monsterGroup) {
    switch (patternName) {
      case 'area_attack': this.areaAttack(boss, player); break;
      case 'summon_minions': this.summonMinions(boss, monsterGroup); break;
      case 'charge': this.charge(boss, player); break;
      case 'projectile_barrage': this.projectileBarrage(boss, player); break;
      case 'teleport': this.teleport(boss); break;
      case 'enrage': this.enrage(boss); break;
      case 'dark_nova': this.darkNova(boss, player); break;
    }
  }

  // ===== PATTERN IMPLEMENTATIONS =====

  areaAttack(boss, player) {
    const scene = this.scene;
    const radius = 100;
    const ps = PlayerState.getInstance();

    // Warning circle
    const warning = scene.add.graphics().setDepth(4);
    warning.fillStyle(0xff0000, 0.15);
    warning.fillCircle(boss.x, boss.y, radius);
    warning.lineStyle(2, 0xff0000, 0.5);
    warning.strokeCircle(boss.x, boss.y, radius);

    // Warning text
    const warnText = scene.add.text(boss.x, boss.y - radius - 15, 'DİKKAT!', {
      fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#FF4444',
      fontStyle: 'bold', stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(10);

    // Damage after delay
    scene.time.delayedCall(1500, () => {
      warning.destroy();
      warnText.destroy();

      // Damage flash
      const flash = scene.add.graphics().setDepth(4);
      flash.fillStyle(0xff4400, 0.3);
      flash.fillCircle(boss.x, boss.y, radius);
      scene.tweens.add({ targets: flash, alpha: 0, duration: 300, onComplete: () => flash.destroy() });

      if (!player || !player.active) return;
      const dist = Phaser.Math.Distance.Between(boss.x, boss.y, player.x, player.y);
      if (dist <= radius) {
        const dmg = ps.takeDamage(Math.floor(boss.monsterData.attack * 0.6));
        this.showBossDamage(player.x, player.y, dmg);
      }
    });
  }

  summonMinions(boss, monsterGroup) {
    const scene = this.scene;
    const count = Phaser.Math.Between(2, 4);

    // Find appropriate minion based on boss level
    const bossLv = boss.monsterData.level || 1;
    let minionId = 'slime';
    if (bossLv >= 60) minionId = 'fire_imp';
    else if (bossLv >= 40) minionId = 'shadow_spider';
    else if (bossLv >= 8) minionId = 'wraith';
    else if (bossLv >= 5) minionId = 'skeleton';
    else if (bossLv >= 3) minionId = 'goblin';

    const minionData = MONSTERS[minionId];
    if (!minionData) return;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i;
      const dist = 80;
      const mx = boss.x + Math.cos(angle) * dist;
      const my = boss.y + Math.sin(angle) * dist;

      // Spawn effect
      const spawnFx = scene.add.circle(mx, my, 15, 0xff4400, 0.5).setDepth(4);
      scene.tweens.add({ targets: spawnFx, scale: 2, alpha: 0, duration: 500, onComplete: () => spawnFx.destroy() });

      // Create minion (simplified — actual monster creation depends on scene)
      scene.time.delayedCall(500, () => {
        if (scene.createSummonedMonster) {
          scene.createSummonedMonster(minionId, mx, my);
        }
      });
    }

    // Summon text
    const txt = scene.add.text(boss.x, boss.y - 40, 'Yardımcılar çağrıldı!', {
      fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#FF8800',
      fontStyle: 'bold', stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(10);
    scene.tweens.add({ targets: txt, y: boss.y - 70, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });
  }

  charge(boss, player) {
    const scene = this.scene;
    if (!player || !player.active) return;

    const ps = PlayerState.getInstance();
    const origSpeed = boss.monsterData.speed;

    // Warning indicator
    const line = scene.add.graphics().setDepth(4);
    line.lineStyle(3, 0xff0000, 0.4);
    line.beginPath();
    line.moveTo(boss.x, boss.y);
    line.lineTo(player.x, player.y);
    line.strokePath();

    scene.time.delayedCall(800, () => {
      line.destroy();
      if (!boss.active || boss.monsterData.isDead) return;

      // Charge!
      const angle = Phaser.Math.Angle.Between(boss.x, boss.y, player.x, player.y);
      boss.body.setVelocity(Math.cos(angle) * origSpeed * 3, Math.sin(angle) * origSpeed * 3);
      boss.setTint(0xff4400);

      // Trail particles
      const trail = scene.time.addEvent({
        delay: 50, repeat: 15,
        callback: () => {
          if (!boss.active) return;
          const dot = scene.add.circle(boss.x, boss.y, 5, 0xff4400, 0.5).setDepth(3);
          scene.tweens.add({ targets: dot, alpha: 0, scale: 0, duration: 300, onComplete: () => dot.destroy() });
        }
      });

      // Check damage during charge
      scene.time.delayedCall(100, () => {
        const checkInterval = scene.time.addEvent({
          delay: 50, repeat: 15,
          callback: () => {
            if (!boss.active || !player.active) return;
            const d = Phaser.Math.Distance.Between(boss.x, boss.y, player.x, player.y);
            if (d < 50) {
              const dmg = ps.takeDamage(Math.floor(boss.monsterData.attack * 0.8));
              this.showBossDamage(player.x, player.y, dmg);
              checkInterval.destroy();
            }
          }
        });
      });

      // Stop after charge
      scene.time.delayedCall(800, () => {
        if (boss.active) {
          boss.body.setVelocity(0, 0);
          boss.clearTint();
        }
      });
    });
  }

  projectileBarrage(boss, player) {
    const scene = this.scene;
    const ps = PlayerState.getInstance();
    const count = 8;

    for (let i = 0; i < count; i++) {
      scene.time.delayedCall(i * 150, () => {
        if (!boss.active || boss.monsterData.isDead) return;

        const angle = (Math.PI * 2 / count) * i;
        const proj = scene.add.circle(boss.x, boss.y, 6, 0xff00ff, 0.8).setDepth(5);

        const speed = 180;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        // Move projectile
        const moveTimer = scene.time.addEvent({
          delay: 16, repeat: 120,
          callback: () => {
            proj.x += vx * 0.016;
            proj.y += vy * 0.016;

            if (!player.active) return;
            const d = Phaser.Math.Distance.Between(proj.x, proj.y, player.x, player.y);
            if (d < 25) {
              const dmg = ps.takeDamage(Math.floor(boss.monsterData.attack * 0.3));
              this.showBossDamage(player.x, player.y, dmg);
              proj.destroy();
              moveTimer.destroy();
            }
          }
        });

        // Auto destroy
        scene.time.delayedCall(2500, () => { if (proj.active) proj.destroy(); });
      });
    }
  }

  teleport(boss) {
    const scene = this.scene;
    if (!boss.active) return;

    // Disappear effect
    scene.tweens.add({
      targets: boss, alpha: 0, duration: 300,
      onComplete: () => {
        // Random new position
        const ox = boss.monsterData.spawnX || boss.x;
        const oy = boss.monsterData.spawnY || boss.y;
        boss.x = ox + Phaser.Math.Between(-150, 150);
        boss.y = oy + Phaser.Math.Between(-150, 150);

        // Appear effect
        const appearFx = scene.add.circle(boss.x, boss.y, 30, 0x8800ff, 0.4).setDepth(4);
        scene.tweens.add({ targets: appearFx, scale: 3, alpha: 0, duration: 500, onComplete: () => appearFx.destroy() });

        scene.tweens.add({ targets: boss, alpha: 1, duration: 300 });
      }
    });
  }

  enrage(boss) {
    const scene = this.scene;
    const state = this.activeBosses.get(boss);
    if (!state || state.enraged) return;
    state.enraged = true;

    // Permanent stat boost
    boss.monsterData.attack = Math.floor(boss.monsterData.attack * 1.3);
    boss.monsterData.speed = Math.floor(boss.monsterData.speed * 1.2);

    // Visual: red tint
    boss.setTint(0xff2222);

    // Text
    const txt = scene.add.text(boss.x, boss.y - 50, '💢 ÖFKE!', {
      fontSize: '20px', fontFamily: 'Arial, sans-serif', color: '#FF0000',
      fontStyle: 'bold', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(10);
    scene.tweens.add({ targets: txt, y: boss.y - 90, alpha: 0, duration: 2000, onComplete: () => txt.destroy() });

    scene.cameras.main.shake(300, 0.015);
  }

  darkNova(boss, player) {
    const scene = this.scene;
    const ps = PlayerState.getInstance();
    const radius = 180;

    // Big warning
    const warning = scene.add.text(400, 200, '⚠ KARANLIK PATLAMA! KAÇIN! ⚠', {
      fontSize: '22px', fontFamily: 'Arial, sans-serif', color: '#FF0000',
      fontStyle: 'bold', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(10000).setScrollFactor(0);

    // Expanding dark circle
    const circle = scene.add.graphics().setDepth(4);
    let currentRadius = 0;
    const expandTimer = scene.time.addEvent({
      delay: 30, repeat: 60,
      callback: () => {
        currentRadius += 3;
        circle.clear();
        circle.fillStyle(0x2a0040, 0.3);
        circle.fillCircle(boss.x, boss.y, currentRadius);
        circle.lineStyle(3, 0x8800ff, 0.6);
        circle.strokeCircle(boss.x, boss.y, currentRadius);
      }
    });

    // Damage after charge-up
    scene.time.delayedCall(2000, () => {
      warning.destroy();
      circle.destroy();
      expandTimer.destroy();

      // Flash
      scene.cameras.main.flash(500, 80, 0, 120);

      if (!player.active) return;
      const dist = Phaser.Math.Distance.Between(boss.x, boss.y, player.x, player.y);
      if (dist <= radius) {
        const dmg = ps.takeDamage(Math.floor(boss.monsterData.attack * 1.0));
        this.showBossDamage(player.x, player.y, dmg);
      }
    });
  }

  showBossDamage(x, y, damage) {
    const scene = this.scene;
    const txt = scene.add.text(x, y - 20, `-${damage}`, {
      fontSize: '20px', fontFamily: 'Arial, sans-serif', color: '#FF4444',
      fontStyle: 'bold', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(10000);
    scene.tweens.add({ targets: txt, y: y - 50, alpha: 0, duration: 800, onComplete: () => txt.destroy() });
  }

  destroy() {
    this.activeBosses.clear();
  }
}
