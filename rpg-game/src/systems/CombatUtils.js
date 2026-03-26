import { PlayerState } from './PlayerState.js';

/**
 * Paylaşılan savaş yardımcı fonksiyonları
 * OverworldScene, DungeonScene, LabyrinthScene tarafından kullanılır
 */
export class CombatUtils {
  constructor(scene) {
    this.scene = scene;
    this.projectiles = [];
  }

  /**
   * Mermi fırlat (yay oku veya büyü mermisi)
   */
  fireProjectile(textureKey, fromX, fromY, toX, toY, speed, damage, options = {}) {
    const scene = this.scene;
    const proj = scene.physics.add.sprite(fromX, fromY, textureKey);
    proj.setDepth(5);
    proj.setScale(options.scale || 1);

    const angle = Phaser.Math.Angle.Between(fromX, fromY, toX, toY);
    proj.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    proj.setRotation(angle);

    if (options.tint) proj.setTint(options.tint);

    const maxRange = options.maxRange || 400;
    const startX = fromX, startY = fromY;

    proj._damage = damage;
    proj._options = options;
    proj._startX = startX;
    proj._startY = startY;
    proj._maxRange = maxRange;

    this.projectiles.push(proj);

    // Auto-destroy timeout
    scene.time.delayedCall(3000, () => {
      if (proj.active) this.destroyProjectile(proj);
    });

    return proj;
  }

  /**
   * Mermi-monster çarpışma kontrolü (her frame çağrılmalı)
   */
  checkProjectileCollisions(monsterGroup) {
    const ps = PlayerState.getInstance();

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      if (!proj.active) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Menzil kontrolü
      const dist = Phaser.Math.Distance.Between(proj._startX, proj._startY, proj.x, proj.y);
      if (dist > proj._maxRange) {
        this.destroyProjectile(proj);
        this.projectiles.splice(i, 1);
        continue;
      }

      // Monster çarpışma
      const children = Array.isArray(monsterGroup) ? monsterGroup : (monsterGroup.getChildren ? monsterGroup.getChildren() : []);
      let hit = false;
      for (const monster of children) {
        if (!monster.monsterData || monster.monsterData.isDead) continue;
        if (!monster.active) continue;

        const d = Phaser.Math.Distance.Between(proj.x, proj.y, monster.x, monster.y);
        const hitRange = (monster.width || 40) / 2 + 8;

        if (d < hitRange) {
          const damage = proj._damage;
          monster.monsterData.currentHp -= damage;
          monster.monsterData.aggroed = true;

          // Hit effect
          this.showHitEffect(monster.x, monster.y, damage);

          // Death check
          if (monster.monsterData.currentHp <= 0 && this.scene.killMonster) {
            this.scene.killMonster(monster);
          }

          // AOE
          if (proj._options.aoe && proj._options.aoeRadius) {
            children.forEach(m => {
              if (m === monster || !m.monsterData || m.monsterData.isDead) return;
              const ad = Phaser.Math.Distance.Between(monster.x, monster.y, m.x, m.y);
              if (ad <= proj._options.aoeRadius) {
                const aoeDmg = Math.max(1, Math.floor(damage * 0.5));
                m.monsterData.currentHp -= aoeDmg;
                m.monsterData.aggroed = true;
                this.showHitEffect(m.x, m.y, aoeDmg);
                // Death check for AOE targets
                if (m.monsterData.currentHp <= 0 && this.scene.killMonster) {
                  this.scene.killMonster(m);
                }
              }
            });
          }

          // Callback
          if (proj._options.onHit) proj._options.onHit(monster, damage);

          if (!proj._options.piercing) {
            this.destroyProjectile(proj);
            this.projectiles.splice(i, 1);
            hit = true;
            break;
          }
        }
      }
    }
  }

  showHitEffect(x, y, damage) {
    const scene = this.scene;

    // Damage number
    const dmgText = scene.add.text(x, y - 15, `-${damage}`, {
      fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#ff8888',
      fontStyle: 'bold', stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(10);

    scene.tweens.add({
      targets: dmgText, y: y - 40, alpha: 0,
      duration: 600, ease: 'Power2',
      onComplete: () => dmgText.destroy()
    });

    // Particles
    if (scene.textures.exists('particle_hit')) {
      const emitter = scene.add.particles(x, y, 'particle_hit', {
        speed: { min: 30, max: 80 }, angle: { min: 0, max: 360 },
        scale: { start: 0.5, end: 0 }, lifespan: 200,
        quantity: 3, blendMode: 'ADD'
      });
      scene.time.delayedCall(200, () => emitter.destroy());
    }
  }

  destroyProjectile(proj) {
    if (proj && proj.active) {
      proj.destroy();
    }
  }

  /**
   * Monster DOT (zamanla hasar) güncelleme — her frame çağrılmalı
   */
  updateMonsterEffects(monsterGroup) {
    const now = Date.now();
    const children = Array.isArray(monsterGroup) ? monsterGroup : (monsterGroup.getChildren ? monsterGroup.getChildren() : []);

    children.forEach(monster => {
      if (!monster.monsterData || monster.monsterData.isDead) return;

      // DOT processing
      if (monster.monsterData.dots && monster.monsterData.dots.length > 0) {
        monster.monsterData.dots = monster.monsterData.dots.filter(dot => {
          if (now - dot.startTime > dot.duration) return false;
          if (now - dot.lastTick >= dot.interval) {
            dot.lastTick = now;
            monster.monsterData.currentHp -= dot.damage;
            // Green damage text for poison
            const dmgText = this.scene.add.text(monster.x + (Math.random() - 0.5) * 20, monster.y - 10, `-${dot.damage}`, {
              fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#00ff88',
              fontStyle: 'bold', stroke: '#000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(10);
            this.scene.tweens.add({
              targets: dmgText, y: monster.y - 30, alpha: 0,
              duration: 500, onComplete: () => dmgText.destroy()
            });
          }
          return true;
        });
      }

      // Slow expiry
      if (monster.monsterData.slowUntil && now > monster.monsterData.slowUntil) {
        delete monster.monsterData.slowFactor;
        delete monster.monsterData.slowUntil;
      }

      // Stun expiry handled in monster AI (monster stops moving if stunUntil > now)
    });
  }

  destroy() {
    this.projectiles.forEach(p => { if (p.active) p.destroy(); });
    this.projectiles = [];
  }
}
