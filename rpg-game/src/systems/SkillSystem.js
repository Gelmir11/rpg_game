import { PlayerState } from './PlayerState.js';

// Sınıf bazlı yetenek tanımları
export const SKILL_DEFINITIONS = {
  warrior: [
    {
      id: 'power_strike', name: 'Güçlü Vuruş', level: 1,
      type: 'melee_attack', manaCost: 8, cooldown: 3000,
      damageMultiplier: 1.8, range: 90, aoe: false,
      icon: 'skill_power_strike', color: '#e74c3c',
      description: 'Güçlü bir kılıç darbesi (1.8x hasar)'
    },
    {
      id: 'shield_bash', name: 'Kalkan Çarpması', level: 5,
      type: 'melee_attack', manaCost: 12, cooldown: 5000,
      damageMultiplier: 1.2, range: 70, aoe: false,
      effect: { stun: 1500 },
      icon: 'skill_shield_bash', color: '#f39c12',
      description: 'Düşmanı 1.5s sersemletir'
    },
    {
      id: 'whirlwind', name: 'Kasırga', level: 10,
      type: 'melee_aoe', manaCost: 20, cooldown: 8000,
      damageMultiplier: 1.5, range: 100, aoe: true, aoeRadius: 100,
      icon: 'skill_whirlwind', color: '#e67e22',
      description: 'Etraftaki tüm düşmanlara 1.5x hasar'
    },
    {
      id: 'war_cry', name: 'Savaş Çığlığı', level: 15,
      type: 'buff', manaCost: 25, cooldown: 30000,
      buff: { attack: 10, defense: 5, duration: 15000 },
      icon: 'skill_war_cry', color: '#c0392b',
      description: '+10 Saldırı, +5 Savunma (15s)'
    }
  ],
  archer: [
    {
      id: 'quick_shot', name: 'Hızlı Atış', level: 1,
      type: 'projectile', manaCost: 5, cooldown: 2000,
      damageMultiplier: 1.5, range: 300,
      projectileSpeed: 400, projectileKey: 'projectile_arrow',
      icon: 'skill_quick_shot', color: '#27ae60',
      description: 'Hızlı bir ok fırlatır (1.5x hasar)'
    },
    {
      id: 'multi_arrow', name: 'Çoklu Ok', level: 5,
      type: 'projectile_multi', manaCost: 15, cooldown: 6000,
      damageMultiplier: 1.0, range: 280, count: 3, spreadAngle: 15,
      projectileSpeed: 350, projectileKey: 'projectile_arrow',
      icon: 'skill_multi_arrow', color: '#2ecc71',
      description: '3 ok aynı anda fırlatır'
    },
    {
      id: 'poison_arrow', name: 'Zehirli Ok', level: 10,
      type: 'projectile', manaCost: 18, cooldown: 7000,
      damageMultiplier: 1.2, range: 280,
      projectileSpeed: 300, projectileKey: 'projectile_arrow',
      dot: { damage: 3, interval: 1000, duration: 5000 },
      icon: 'skill_poison_arrow', color: '#1abc9c',
      description: 'Zehirli ok, 5s boyunca hasar verir'
    },
    {
      id: 'eagle_eye', name: 'Kartal Gözü', level: 15,
      type: 'buff', manaCost: 20, cooldown: 25000,
      buff: { attack: 8, duration: 12000 },
      icon: 'skill_eagle_eye', color: '#16a085',
      description: '+8 Saldırı (12s)'
    }
  ],
  mage: [
    {
      id: 'fireball', name: 'Ateş Topu', level: 1,
      type: 'projectile', manaCost: 10, cooldown: 2500,
      damageMultiplier: 2.0, range: 220,
      projectileSpeed: 250, projectileKey: 'projectile_magic',
      aoe: true, aoeRadius: 50,
      icon: 'skill_fireball', color: '#e74c3c',
      description: 'Ateş topu, alan hasarı (2x hasar)'
    },
    {
      id: 'ice_bolt', name: 'Buz Oku', level: 5,
      type: 'projectile', manaCost: 14, cooldown: 4000,
      damageMultiplier: 1.6, range: 240,
      projectileSpeed: 300, projectileKey: 'projectile_magic',
      effect: { slow: 0.5, duration: 3000 },
      icon: 'skill_ice_bolt', color: '#3498db',
      description: 'Düşmanı 3s yavaşlatır (1.6x hasar)'
    },
    {
      id: 'chain_lightning', name: 'Zincir Yıldırım', level: 10,
      type: 'chain', manaCost: 25, cooldown: 8000,
      damageMultiplier: 1.8, range: 200,
      chainCount: 3, chainRange: 120,
      icon: 'skill_chain_lightning', color: '#f1c40f',
      description: 'Yıldırım 3 düşmana sıçrar'
    },
    {
      id: 'arcane_shield', name: 'Büyü Kalkanı', level: 15,
      type: 'buff', manaCost: 30, cooldown: 30000,
      buff: { defense: 15, duration: 12000 },
      shield: { absorb: 50 },
      icon: 'skill_arcane_shield', color: '#9b59b6',
      description: '+15 Savunma, 50 hasar kalkanı (12s)'
    }
  ]
};

export class SkillSystem {
  constructor(scene) {
    this.scene = scene;
    this.cooldowns = {}; // skillId -> lastUseTime
    this.ps = PlayerState.getInstance();
  }

  getAvailableSkills() {
    const classDef = SKILL_DEFINITIONS[this.ps.playerClass];
    if (!classDef) return [];
    return classDef.filter(s => this.ps.level >= s.level);
  }

  getAllClassSkills() {
    return SKILL_DEFINITIONS[this.ps.playerClass] || [];
  }

  canUseSkill(skillId) {
    const skill = this.getSkillById(skillId);
    if (!skill) return { can: false, reason: 'Yetenek bulunamadı' };
    if (this.ps.level < skill.level) return { can: false, reason: `Lv.${skill.level} gerekli` };
    if (this.ps.mana < skill.manaCost) return { can: false, reason: 'Yetersiz mana' };
    const now = Date.now();
    const lastUse = this.cooldowns[skillId] || 0;
    if (now - lastUse < skill.cooldown) {
      const remaining = Math.ceil((skill.cooldown - (now - lastUse)) / 1000);
      return { can: false, reason: `${remaining}s bekleme` };
    }
    return { can: true };
  }

  getSkillById(skillId) {
    const all = SKILL_DEFINITIONS[this.ps.playerClass] || [];
    return all.find(s => s.id === skillId);
  }

  getCooldownProgress(skillId) {
    const skill = this.getSkillById(skillId);
    if (!skill) return 1;
    const now = Date.now();
    const lastUse = this.cooldowns[skillId] || 0;
    const elapsed = now - lastUse;
    if (elapsed >= skill.cooldown) return 1;
    return elapsed / skill.cooldown;
  }

  getRemainingCooldown(skillId) {
    const skill = this.getSkillById(skillId);
    if (!skill) return 0;
    const now = Date.now();
    const lastUse = this.cooldowns[skillId] || 0;
    const remaining = skill.cooldown - (now - lastUse);
    return Math.max(0, remaining);
  }

  useSkill(skillId, casterSprite, targetMonster, monsterGroup) {
    const check = this.canUseSkill(skillId);
    if (!check.can) return { success: false, reason: check.reason };

    const skill = this.getSkillById(skillId);
    this.ps.useMana(skill.manaCost);
    this.cooldowns[skillId] = Date.now();

    switch (skill.type) {
      case 'melee_attack':
        return this.executeMeleeAttack(skill, casterSprite, targetMonster);
      case 'melee_aoe':
        return this.executeMeleeAOE(skill, casterSprite, monsterGroup);
      case 'projectile':
        return this.executeProjectile(skill, casterSprite, targetMonster, monsterGroup);
      case 'projectile_multi':
        return this.executeMultiProjectile(skill, casterSprite, targetMonster, monsterGroup);
      case 'chain':
        return this.executeChain(skill, casterSprite, targetMonster, monsterGroup);
      case 'buff':
        return this.executeBuff(skill, casterSprite);
      default:
        return { success: false, reason: 'Bilinmeyen yetenek türü' };
    }
  }

  executeMeleeAttack(skill, caster, target) {
    if (!target || !target.monsterData || target.monsterData.isDead) {
      return { success: false, reason: 'Hedef yok' };
    }

    const dist = Phaser.Math.Distance.Between(caster.x, caster.y, target.x, target.y);
    if (dist > skill.range) return { success: false, reason: 'Menzil dışı' };

    const damage = Math.max(1, Math.floor(this.ps.getAttack() * skill.damageMultiplier) - target.monsterData.defense);
    target.monsterData.currentHp -= damage;
    target.monsterData.aggroed = true;

    // Stun effect
    if (skill.effect?.stun) {
      target.monsterData.stunUntil = Date.now() + skill.effect.stun;
    }

    // Visual: flash + particles
    this.showSkillHit(target.x, target.y, skill, damage);

    return { success: true, damage, target };
  }

  executeMeleeAOE(skill, caster, monsterGroup) {
    if (!monsterGroup) return { success: false, reason: 'Hedef yok' };

    let totalDamage = 0;
    let hitCount = 0;
    const children = monsterGroup.getChildren ? monsterGroup.getChildren() : monsterGroup;

    children.forEach(m => {
      if (!m.monsterData || m.monsterData.isDead) return;
      const dist = Phaser.Math.Distance.Between(caster.x, caster.y, m.x, m.y);
      if (dist <= skill.aoeRadius) {
        const damage = Math.max(1, Math.floor(this.ps.getAttack() * skill.damageMultiplier) - m.monsterData.defense);
        m.monsterData.currentHp -= damage;
        m.monsterData.aggroed = true;
        totalDamage += damage;
        hitCount++;
        this.showSkillHit(m.x, m.y, skill, damage);
      }
    });

    // AOE visual circle
    this.showAOEEffect(caster.x, caster.y, skill.aoeRadius, skill.color);

    return { success: true, damage: totalDamage, hitCount };
  }

  executeProjectile(skill, caster, target, monsterGroup) {
    if (!target || !target.monsterData || target.monsterData.isDead) {
      return { success: false, reason: 'Hedef yok' };
    }

    const dist = Phaser.Math.Distance.Between(caster.x, caster.y, target.x, target.y);
    if (dist > skill.range) return { success: false, reason: 'Menzil dışı' };

    this.fireSkillProjectile(skill, caster, target, monsterGroup);
    return { success: true };
  }

  executeMultiProjectile(skill, caster, target, monsterGroup) {
    if (!target || !target.monsterData || target.monsterData.isDead) {
      return { success: false, reason: 'Hedef yok' };
    }

    const baseAngle = Phaser.Math.Angle.Between(caster.x, caster.y, target.x, target.y);
    const spreadRad = Phaser.Math.DegToRad(skill.spreadAngle || 15);

    for (let i = 0; i < (skill.count || 3); i++) {
      const offset = (i - Math.floor(skill.count / 2)) * spreadRad;
      const angle = baseAngle + offset;
      const fakeTarget = {
        x: caster.x + Math.cos(angle) * skill.range,
        y: caster.y + Math.sin(angle) * skill.range
      };
      this.fireSkillProjectile(skill, caster, fakeTarget, monsterGroup);
    }
    return { success: true };
  }

  executeChain(skill, caster, target, monsterGroup) {
    if (!target || !target.monsterData || target.monsterData.isDead) {
      return { success: false, reason: 'Hedef yok' };
    }

    const dist = Phaser.Math.Distance.Between(caster.x, caster.y, target.x, target.y);
    if (dist > skill.range) return { success: false, reason: 'Menzil dışı' };

    const hit = new Set();
    let current = target;
    let totalDamage = 0;

    for (let i = 0; i < (skill.chainCount || 3); i++) {
      if (!current || !current.monsterData || current.monsterData.isDead) break;
      hit.add(current);

      const damage = Math.max(1, Math.floor(this.ps.getAttack() * skill.damageMultiplier * Math.pow(0.8, i)) - current.monsterData.defense);
      current.monsterData.currentHp -= damage;
      current.monsterData.aggroed = true;
      totalDamage += damage;

      this.showSkillHit(current.x, current.y, skill, damage);

      // Draw lightning line to previous target
      if (i > 0) {
        const prev = [...hit][i - 1];
        this.drawLightning(prev.x, prev.y, current.x, current.y, skill.color);
      } else {
        this.drawLightning(caster.x, caster.y, current.x, current.y, skill.color);
      }

      // Find next chain target
      let nearest = null;
      let nearestDist = skill.chainRange || 120;
      const children = monsterGroup.getChildren ? monsterGroup.getChildren() : monsterGroup;
      children.forEach(m => {
        if (hit.has(m) || !m.monsterData || m.monsterData.isDead) return;
        const d = Phaser.Math.Distance.Between(current.x, current.y, m.x, m.y);
        if (d < nearestDist) { nearestDist = d; nearest = m; }
      });
      current = nearest;
    }

    return { success: true, damage: totalDamage, hitCount: hit.size };
  }

  executeBuff(skill, caster) {
    if (skill.buff) {
      this.ps.addBuff({
        attack: skill.buff.attack || 0,
        defense: skill.buff.defense || 0,
        duration: skill.buff.duration
      });
    }

    // Shield absorb
    if (skill.shield) {
      this.ps._shieldAbsorb = (this.ps._shieldAbsorb || 0) + skill.shield.absorb;
    }

    // Visual
    this.showBuffEffect(caster.x, caster.y, skill.color);
    return { success: true };
  }

  // ===== VISUAL EFFECTS =====

  fireSkillProjectile(skill, caster, target, monsterGroup) {
    const scene = this.scene;
    const proj = scene.physics.add.sprite(caster.x, caster.y, skill.projectileKey || 'projectile_magic');
    proj.setDepth(5);

    const angle = Phaser.Math.Angle.Between(caster.x, caster.y, target.x, target.y);
    const speed = skill.projectileSpeed || 300;
    proj.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    proj.setRotation(angle);

    // Tint based on skill
    if (skill.id === 'poison_arrow') proj.setTint(0x00ff88);
    else if (skill.id === 'ice_bolt') proj.setTint(0x88ccff);
    else if (skill.id === 'fireball') proj.setTint(0xff4400);

    const maxDist = skill.range * 1.3;
    const startX = caster.x, startY = caster.y;

    // Collision with monsters
    if (monsterGroup) {
      const overlap = scene.physics.add.overlap(proj, monsterGroup, (p, monster) => {
        if (!monster.monsterData || monster.monsterData.isDead) return;

        const damage = Math.max(1, Math.floor(this.ps.getAttack() * skill.damageMultiplier) - monster.monsterData.defense);
        monster.monsterData.currentHp -= damage;
        monster.monsterData.aggroed = true;

        // DOT effect
        if (skill.dot) {
          monster.monsterData.dots = monster.monsterData.dots || [];
          monster.monsterData.dots.push({
            damage: skill.dot.damage,
            interval: skill.dot.interval,
            duration: skill.dot.duration,
            startTime: Date.now(),
            lastTick: Date.now()
          });
        }

        // Slow effect
        if (skill.effect?.slow) {
          monster.monsterData.slowFactor = skill.effect.slow;
          monster.monsterData.slowUntil = Date.now() + skill.effect.duration;
        }

        this.showSkillHit(monster.x, monster.y, skill, damage);

        // AOE on impact
        if (skill.aoe && skill.aoeRadius) {
          const children = monsterGroup.getChildren ? monsterGroup.getChildren() : monsterGroup;
          children.forEach(m => {
            if (m === monster || !m.monsterData || m.monsterData.isDead) return;
            const d = Phaser.Math.Distance.Between(monster.x, monster.y, m.x, m.y);
            if (d <= skill.aoeRadius) {
              const aoeDmg = Math.max(1, Math.floor(this.ps.getAttack() * skill.damageMultiplier * 0.6) - m.monsterData.defense);
              m.monsterData.currentHp -= aoeDmg;
              m.monsterData.aggroed = true;
              this.showSkillHit(m.x, m.y, skill, aoeDmg);
            }
          });
          this.showAOEEffect(monster.x, monster.y, skill.aoeRadius, skill.color);
        }

        p.destroy();
        overlap.destroy();
      });
    }

    // Auto destroy after max distance or timeout
    scene.time.delayedCall(3000, () => { if (proj.active) proj.destroy(); });
    const checkDist = scene.time.addEvent({
      delay: 50, loop: true,
      callback: () => {
        if (!proj.active) { checkDist.destroy(); return; }
        const d = Phaser.Math.Distance.Between(startX, startY, proj.x, proj.y);
        if (d > maxDist) { proj.destroy(); checkDist.destroy(); }
      }
    });
  }

  showSkillHit(x, y, skill, damage) {
    const scene = this.scene;

    // Damage text
    const color = skill.color || '#ffffff';
    const dmgText = scene.add.text(x, y - 20, `-${damage}`, {
      fontSize: '18px', fontFamily: 'Nunito, Arial, sans-serif', color,
      fontStyle: 'bold', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(10);

    scene.tweens.add({
      targets: dmgText, y: y - 50, alpha: 0,
      duration: 800, ease: 'Power2',
      onComplete: () => dmgText.destroy()
    });

    // Hit particles
    if (scene.textures.exists('particle_hit')) {
      const emitter = scene.add.particles(x, y, 'particle_hit', {
        speed: { min: 50, max: 120 }, angle: { min: 0, max: 360 },
        scale: { start: 0.6, end: 0 }, lifespan: 300,
        quantity: 5, blendMode: 'ADD',
        tint: parseInt(color.replace('#', ''), 16)
      });
      scene.time.delayedCall(300, () => emitter.destroy());
    }
  }

  showAOEEffect(x, y, radius, color) {
    const scene = this.scene;
    const g = scene.add.graphics().setDepth(4);
    const c = parseInt((color || '#ffffff').replace('#', ''), 16);
    g.fillStyle(c, 0.2);
    g.fillCircle(x, y, radius);
    g.lineStyle(2, c, 0.6);
    g.strokeCircle(x, y, radius);

    scene.tweens.add({
      targets: g, alpha: 0,
      duration: 500,
      onComplete: () => g.destroy()
    });
  }

  showBuffEffect(x, y, color) {
    const scene = this.scene;
    if (scene.textures.exists('particle_sparkle')) {
      const emitter = scene.add.particles(x, y, 'particle_sparkle', {
        speed: { min: 30, max: 80 }, angle: { min: 0, max: 360 },
        scale: { start: 0.8, end: 0 }, lifespan: 800,
        quantity: 12, blendMode: 'ADD',
        tint: parseInt((color || '#FFD700').replace('#', ''), 16)
      });
      scene.time.delayedCall(800, () => emitter.destroy());
    }
  }

  drawLightning(x1, y1, x2, y2, color) {
    const scene = this.scene;
    const g = scene.add.graphics().setDepth(6);
    const c = parseInt((color || '#f1c40f').replace('#', ''), 16);
    g.lineStyle(3, c, 0.9);
    g.beginPath();
    g.moveTo(x1, y1);

    // Zigzag lightning
    const steps = 6;
    const dx = (x2 - x1) / steps;
    const dy = (y2 - y1) / steps;
    for (let i = 1; i < steps; i++) {
      const jitter = (Math.random() - 0.5) * 20;
      g.lineTo(x1 + dx * i + jitter, y1 + dy * i + jitter);
    }
    g.lineTo(x2, y2);
    g.strokePath();

    scene.tweens.add({
      targets: g, alpha: 0,
      duration: 400,
      onComplete: () => g.destroy()
    });
  }
}
