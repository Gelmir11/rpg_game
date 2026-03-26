import Phaser from 'phaser';
import { PlayerState, formatGold, CLASS_DEFINITIONS } from '../systems/PlayerState.js';
import { ITEMS } from '../data/items.js';
import { QUESTS } from '../data/quests.js';
import { SKILL_DEFINITIONS } from '../systems/SkillSystem.js';

export class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create() {
    this.playerState = PlayerState.getInstance();
    this.inventoryOpen = false;
    this.dialogueOpen = false;
    this.notificationQueue = [];

    this.createHUD();
    this.setupInput();

    // Listen for UI updates from game scenes
    this.events.on('updateUI', () => this.updateHUD());
  }

  createHUD() {
    // Minimal HUD — only gold, name, quests, controls
    // HP/MP bars will be drawn above player in-game

    // Top left: Level + EXP bar
    this.levelText = this.add.text(10, 8, '', { fontSize: '20px', fontFamily: 'Arial, sans-serif', color: '#d0b0f0', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setDepth(200);

    // EXP bar under level text
    this.add.text(10, 32, 'EXP', { fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#6688FF', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setDepth(200);
    this.expBarBg = this.add.rectangle(50, 40, 160, 12, 0x1a1a1a).setOrigin(0, 0.5).setDepth(200).setStrokeStyle(1, 0x444);
    this.expBarFill = this.add.rectangle(51, 40, 158, 10, 0x4169E1).setOrigin(0, 0.5).setDepth(201);
    this.expText = this.add.text(130, 32, '', { fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#AAAAFF', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 0).setDepth(202);

    this.goldText = { setText: () => {} };

    // These are hidden but kept for updateHUD compatibility
    this.hpBarFill = { setScale: () => {}, fillColor: 0 };
    this.hpText = { setText: () => {} };
    this.expText = { setText: () => {} };
    this.manaBarFill = { setScale: () => {} };
    this.manaText = { setText: () => {} };
    this.statsText = { setText: () => {} };

    // Active quests (top right)
    this.questText = this.add.text(790, 8, '', {
      fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#cc99ff',
      align: 'right', wordWrap: { width: 200 }, fontStyle: 'bold', stroke: '#000', strokeThickness: 3
    }).setOrigin(1, 0).setDepth(200);

    // Minimap (below quests, top right)
    const mmSize = 140;
    const mmX = 800 - mmSize - 8;
    const mmY = 440; // bottom right area
    this.minimapBg = this.add.rectangle(mmX + mmSize / 2, mmY + mmSize / 2, mmSize + 4, mmSize + 4, 0x000000, 0.7).setDepth(200).setStrokeStyle(2, 0x4a4a8a);
    this.minimapGfx = this.add.graphics().setDepth(201);
    this.minimapPlayerDot = this.add.circle(0, 0, 3, 0x00FF00).setDepth(203);
    this.minimapData = { x: mmX, y: mmY, size: mmSize };

    // Controls hint (bottom)
    this.controlsText = this.add.text(400, 578, 'WASD: Hareket   E: Etkileşim   F: Topla   K: Envanter   T: Köye Işınlan   1-4: Yetenek', {
      fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#777', fontStyle: 'bold', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(200);

    // Skill bar
    this.createSkillBar();

    // Notification area
    this.notifText = this.add.text(400, 70, '', {
      fontSize: '24px', fontFamily: 'Arial, sans-serif', color: '#FFD700',
      fontStyle: 'bold', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(200).setAlpha(0);

    // Dialogue box
    this.dialogueBg = this.add.rectangle(400, 510, 740, 150, 0x0a0a1a, 0.94).setDepth(300).setStrokeStyle(2, 0x6a4aaa).setVisible(false);
    this.dialogueName = this.add.text(60, 448, '', { fontSize: '22px', fontFamily: 'Arial, sans-serif', color: '#DAA520', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setDepth(301).setVisible(false);
    this.dialogueText = this.add.text(60, 475, '', {
      fontSize: '18px', fontFamily: 'Arial, sans-serif', color: '#ddd',
      wordWrap: { width: 660 }, lineSpacing: 6
    }).setDepth(301).setVisible(false);
    this.dialogueHint = this.add.text(720, 570, '[E] Kapat', {
      fontSize: '18px', fontFamily: 'Arial, sans-serif', color: '#666'
    }).setOrigin(1, 0.5).setDepth(301).setVisible(false);

    this.updateHUD();
  }

  setupInput() {
    this.invKey = this.input.keyboard.addKey('K');
    this.interactKey = this.input.keyboard.addKey('E');
    // Drag desteği
    this.input.dragDistanceThreshold = 8;

    this.input.keyboard.on('keydown-K', () => {
      if (this.dialogueOpen) return;
      if (this.inventoryOpen) this.closeInventory();
      else this.openInventory();
    });

    this.input.keyboard.on('keydown-E', () => {
      if (this.dialogueOpen) this.closeDialogue();
    });

    // ESC: Tüm açık panelleri kapat
    this.input.keyboard.on('keydown-ESC', () => {
      let closed = false;
      if (this.dialogueOpen) { this.closeDialogue(); closed = true; }
      if (this.inventoryOpen) { this.closeInventory(); closed = true; }
      // Shop sahnesi açıksa kapat
      const shopScene = this.scene.get('ShopScene');
      if (shopScene && shopScene.scene.isActive()) {
        shopScene.exitShop();
        closed = true;
      }
      // Home storage açıksa kapat
      const homeScene = this.scene.get('HomeScene');
      if (homeScene && homeScene.scene.isActive() && homeScene.storageOpen) {
        homeScene.closeStorage();
        closed = true;
      }
    });
  }

  updateHUD() {
    const ps = this.playerState;

    // HP
    const hpRatio = ps.hp / ps.getMaxHp();
    this.hpBarFill.setScale(hpRatio, 1);
    this.hpBarFill.fillColor = hpRatio > 0.5 ? 0xCC0000 : hpRatio > 0.25 ? 0xCCCC00 : 0xFF0000;
    this.hpText.setText(`${ps.hp}/${ps.getMaxHp()}`);

    // EXP
    const expForCurrent = ps.getExpForLevel(ps.level);
    const expForNext = ps.getExpForLevel(ps.level + 1);
    const expProgress = (ps.exp - expForCurrent) / (expForNext - expForCurrent);
    this.expBarFill.setScale(Math.max(0, Math.min(1, expProgress)), 1);
    this.expText.setText(`${ps.exp}/${expForNext}`);

    // Mana
    const manaRatio = ps.mana / ps.getMaxMana();
    this.manaBarFill.setScale(manaRatio, 1);
    this.manaText.setText(`${ps.mana}/${ps.getMaxMana()}`);

    // Level + Gold
    this.levelText.setText(`Lv.${ps.level} - ${ps.playerName || 'Kahraman'}`);
    this.goldText.setText(`Altın: ${formatGold(ps.gold)}`);

    // Stats
    const wType = ps.equipped.weapon?.weaponType || 'yumruk';
    this.statsText.setText(`ATK:${ps.getAttack()} DEF:${ps.getDefense()} Silah:${wType}`);

    // Quest tracker
    const questLines = [];
    Object.keys(ps.activeQuests).forEach(qId => {
      const q = QUESTS[qId];
      if (!q) return;
      let progress = 0;
      if (q.type === 'kill') progress = ps.getKills(q.target);
      else if (q.type === 'gather') progress = ps.getGather(q.target);
      const done = progress >= q.required;
      questLines.push(`${done ? '✓' : '○'} ${q.name} (${progress}/${q.required})`);
    });
    this.questText.setText(questLines.length > 0 ? 'Görevler:\n' + questLines.join('\n') : '');

    // Update minimap
    this.updateMinimap();
  }

  updateMinimap() {
    if (!this.minimapGfx || !this.minimapData) return;
    const g = this.minimapGfx;
    g.clear();

    const mm = this.minimapData;
    const gameScene = this.scene.get('OverworldScene');
    if (!gameScene || !gameScene.player || !gameScene.player.active) {
      this.minimapBg.setVisible(false);
      this.minimapPlayerDot.setVisible(false);
      return;
    }
    this.minimapBg.setVisible(true);
    this.minimapPlayerDot.setVisible(true);

    const mapW = gameScene.mapWidth || 9600;
    const mapH = gameScene.mapHeight || 9600;
    const px = gameScene.player.x;
    const py = gameScene.player.y;
    const scale = mm.size / mapW;

    // Fog background (dark)
    g.fillStyle(0x0a0a1a); g.fillRect(mm.x, mm.y, mm.size, mm.size);

    // Revealed areas (green tint)
    if (gameScene.fogRevealed) {
      const cellPx = (gameScene.fogCellSize || 64) * scale;
      g.fillStyle(0x2a4a2a, 0.8);
      gameScene.fogRevealed.forEach(key => {
        const parts = key.split(',');
        const fx = parseInt(parts[0]) * cellPx + mm.x;
        const fy = parseInt(parts[1]) * cellPx + mm.y;
        g.fillRect(fx, fy, cellPx + 1, cellPx + 1);
      });
    }

    // Village (yellow dot)
    if (gameScene.villageBounds) {
      const vb = gameScene.villageBounds;
      const vx = mm.x + (vb.x + vb.w / 2) * scale;
      const vy = mm.y + (vb.y + vb.h / 2) * scale;
      g.fillStyle(0xDAA520); g.fillCircle(vx, vy, 3);
    }

    // Zone labels on minimap
    const zones = [
      { x: 1800, y: 1800, color: 0x44AA44 },  // Balçık Ormanı
      { x: 4000, y: 3500, color: 0x3CB371 },  // Goblin Kampı
      { x: 6000, y: 2000, color: 0xCCCCAA },  // İskelet Mezarlığı
      { x: 3000, y: 6500, color: 0x6B8E23 },  // Ork Kalesi
      { x: 1800, y: 2800, color: 0x808080 },  // Kurt Ormanı
      { x: 7500, y: 3500, color: 0x8B8B83 },  // Golem Vadisi
      { x: 2000, y: 7500, color: 0x9370DB },  // Hayalet Bataklığı
    ];
    zones.forEach(z => {
      g.fillStyle(z.color, 0.4);
      g.fillCircle(mm.x + z.x * scale, mm.y + z.y * scale, 4);
    });

    // Dungeon entrance (purple)
    g.fillStyle(0xaa6aee); g.fillCircle(mm.x + 5500 * scale, mm.y + 5500 * scale, 2);
    // Labyrinth entrance (blue)
    g.fillStyle(0x44AAFF); g.fillCircle(mm.x + 7500 * scale, mm.y + 4000 * scale, 2);

    // Quest target markers (yellow pulsing diamonds)
    const ps = this.playerState;
    Object.keys(ps.activeQuests).forEach(qId => {
      const q = QUESTS[qId];
      if (!q) return;
      // Estimate quest target location based on monster/resource type
      let tx = 0, ty = 0;
      if (q.target === 'slime') { tx = 1800; ty = 1800; }
      else if (q.target === 'goblin') { tx = 4000; ty = 3500; }
      else if (q.target === 'skeleton') { tx = 6000; ty = 2000; }
      else if (q.target === 'orc') { tx = 3000; ty = 6500; }
      else if (q.target === 'wolf') { tx = 1800; ty = 2800; }
      else if (q.target === 'golem') { tx = 7500; ty = 3500; }
      else if (q.target === 'wraith') { tx = 2000; ty = 7500; }
      else if (q.target === 'dragon') { tx = 5500; ty = 5500; }
      else { tx = px; ty = py; } // gather quests — player location

      if (tx > 0) {
        const qx = mm.x + tx * scale;
        const qy = mm.y + ty * scale;
        g.fillStyle(0xFFFF00);
        g.fillRect(qx - 2, qy - 4, 4, 8);
        g.fillRect(qx - 4, qy - 2, 8, 4);
      }
    });

    // Player dot
    const dotX = mm.x + px * scale;
    const dotY = mm.y + py * scale;
    this.minimapPlayerDot.setPosition(dotX, dotY);
  }

  _add(obj) { this.invElements.push(obj); return obj; }

  openInventory() {
    this.inventoryOpen = true;
    const ps = this.playerState;
    this.invElements = [];

    // Drag desteğini aktif et
    this.input.setDraggable = this.input.setDraggable || (() => {});

    // Full screen dark overlay
    this._add(this.add.rectangle(400, 300, 800, 600, 0x000000, 0.85).setDepth(399));
    // Main panel
    this._add(this.add.rectangle(400, 300, 760, 560, 0x12122a, 0.98).setDepth(400).setStrokeStyle(2, 0x5555aa));

    // Title bar
    this._add(this.add.rectangle(400, 30, 760, 36, 0x1a1a3a).setDepth(401));
    this._add(this.add.text(400, 30, 'KARAKTER & ENVANTER', { fontSize: '18px', fontFamily: 'Arial, sans-serif', color: '#c0a0e0', fontStyle: 'bold' }).setOrigin(0.5).setDepth(402));

    // ===== LEFT PANEL: Character =====
    const charX = 160, charY = 210;

    // Character panel bg
    this._add(this.add.rectangle(160, 300, 280, 520, 0x0a0a1a, 0.5).setDepth(400).setStrokeStyle(1, 0x3a3a5a));

    // Character name + level
    this._add(this.add.text(charX, 58, `Lv.${ps.level} ${ps.playerName || 'Kahraman'}`, {
      fontSize: '16px', fontFamily: 'Arial, sans-serif', color: '#c0a0e0', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(402));

    // Character sprite (centered, not too big)
    const charTex = ps.gender === 'female' ? 'player_female' : 'player';
    const charSprite = this._add(this.add.image(charX, charY, charTex).setDepth(402).setScale(1.6));
    charSprite.setFrame(0);

    // Equipment overlay layers on character preview
    const equipLayers = ['legs', 'chest', 'arms', 'belt', 'head', 'weapon', 'necklace', 'earring'];
    equipLayers.forEach(slot => {
      if (ps.equipped[slot]) {
        const eqSuffix = ps.gender === 'female' ? '_f' : '';
        const layer = this._add(this.add.image(charX, charY, `equip_${slot}${eqSuffix}`).setDepth(403).setScale(1.6));
        layer.setFrame(0);
      }
    });

    // Equipment slots around character — compact ellipse
    const slotRX = 95, slotRY = 105;
    const equipSlots = [
      { slot: 'head',     label: 'Kask',     angle: -Math.PI / 2 },          // top
      { slot: 'necklace', label: 'Kolye',   angle: -Math.PI / 4 },          // top-right
      { slot: 'chest',    label: 'Zırh',    angle: 0 },                      // right
      { slot: 'arms',     label: 'Kolluk',  angle: Math.PI / 4 },           // bottom-right
      { slot: 'legs',     label: 'Pantolon',angle: Math.PI / 2 },           // bottom
      { slot: 'belt',     label: 'Kemer',   angle: 3 * Math.PI / 4 },       // bottom-left
      { slot: 'weapon',   label: 'Silah',   angle: Math.PI },                // left
      { slot: 'earring',  label: 'Küpe',    angle: -3 * Math.PI / 4 },     // top-left
    ].map(s => ({ ...s, x: charX + Math.cos(s.angle) * slotRX, y: charY + Math.sin(s.angle) * slotRY }));

    equipSlots.forEach(es => {
      // Slot background
      this._add(this.add.rectangle(es.x, es.y, 46, 46, 0x1a1a3a, 0.9).setDepth(401).setStrokeStyle(2, 0x5555aa));

      // Slot label below
      this._add(this.add.text(es.x, es.y + 28, es.label, {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#9999cc',
        stroke: '#000', strokeThickness: 3
      }).setOrigin(0.5).setDepth(405));

      // Equipped item icon
      const eq = ps.equipped[es.slot];
      if (eq) {
        const eqItem = ITEMS[eq.id] || eq;
        // Enhanced equipped item parıltı
        if (eq._bonuses) {
          this._add(this.add.rectangle(es.x, es.y, 42, 42, 0x000000, 0)
            .setDepth(404).setStrokeStyle(1, 0xFFD700));
          this._add(this.add.text(es.x - 18, es.y - 18, '✦', {
            fontSize: '8px', color: '#FFD700'
          }).setDepth(405));
        }
        const eqIcon = this._add(this.add.image(es.x, es.y, `icon_${eq.id}`).setDepth(403).setScale(0.55).setInteractive({ useHandCursor: true }));

        // Left click: unequip to inventory
        eqIcon.on('pointerdown', () => { ps.unequip(es.slot); this.closeInventory(); this.openInventory(); });

        // Hover: show name + full description in tooltip
        let eqHover = null;
        eqIcon.on('pointerover', () => {
          eqHover = this._add(this.add.text(es.x, es.y - 32, eq.name, {
            fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#FFD700',
            backgroundColor: '#111', padding: { x: 6, y: 3 }, stroke: '#000', strokeThickness: 2
          }).setOrigin(0.5).setDepth(410));

          const hasBonus = eq._bonuses;
          // Right: name + description
          let info = `${hasBonus ? '✦ ' : ''}${eqItem.name}`;
          if (eqItem.desc) info += `\n${eqItem.desc}`;
          info += `\nDeğer: ${formatGold(eqItem.value || 0)}`;
          tooltipText.setText(info);
          tooltipText.setColor('#c0a0e0');
          // Left: stats
          let stats = '';
          if (eqItem.attack) stats += `Saldırı: +${eqItem.attack}\n`;
          if (eqItem.defense) stats += `Savunma: +${eqItem.defense}\n`;
          if (eqItem.maxHp) stats += `Max HP: +${eqItem.maxHp}\n`;
          if (eqItem.maxMana) stats += `Max Mana: +${eqItem.maxMana}\n`;
          if (eqItem.manaCost) stats += `Mana: ${eqItem.manaCost}/atış\n`;
          if (hasBonus) {
            stats += '--- ✦ BONUS ✦ ---\n';
            if (hasBonus.attack) stats += `+${hasBonus.attack} Saldırı\n`;
            if (hasBonus.defense) stats += `+${hasBonus.defense} Savunma\n`;
            if (hasBonus.maxHp) stats += `+${hasBonus.maxHp} Max HP\n`;
            if (hasBonus.maxMana) stats += `+${hasBonus.maxMana} Max Mana\n`;
          }
          equipTooltipText.setText(stats.trim());
          equipTooltipText.setColor('#c0a0e0');
        });
        eqIcon.on('pointerout', () => {
          if (eqHover) { eqHover.destroy(); eqHover = null; }
          equipTooltipText.setText(''); equipTooltipText.setColor('#777');
          tooltipText.setText(''); tooltipText.setColor('#777');
        });
      }
    });

    // ===== STATS BELOW EQUIPMENT =====
    const barY = 410;
    const barW = 140;
    // HP
    this._add(this.add.text(charX - barW/2, barY, `HP`, { fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#FF6666', fontStyle: 'bold' }).setDepth(402));
    this._add(this.add.text(charX + barW/2, barY, `${ps.hp}/${ps.getMaxHp()}`, { fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#FF8888' }).setOrigin(1, 0).setDepth(402));
    this._add(this.add.rectangle(charX, barY + 16, barW, 8, 0x111).setDepth(401));
    this._add(this.add.rectangle(charX - barW/2 + barW * (ps.hp / ps.getMaxHp()) / 2, barY + 16, barW * (ps.hp / ps.getMaxHp()), 6, 0xCC0000).setDepth(402));
    // MP
    this._add(this.add.text(charX - barW/2, barY + 26, `MP`, { fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#9966FF', fontStyle: 'bold' }).setDepth(402));
    this._add(this.add.text(charX + barW/2, barY + 26, `${ps.mana}/${ps.getMaxMana()}`, { fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#aa88ff' }).setOrigin(1, 0).setDepth(402));
    this._add(this.add.rectangle(charX, barY + 42, barW, 8, 0x111).setDepth(401));
    this._add(this.add.rectangle(charX - barW/2 + barW * (ps.mana / ps.getMaxMana()) / 2, barY + 42, barW * (ps.mana / ps.getMaxMana()), 6, 0x6a5acd).setDepth(402));
    // EXP
    const expCur = ps.getExpForLevel(ps.level);
    const expNext = ps.getExpForLevel(ps.level + 1);
    const expProg = Math.max(0, (ps.exp - expCur) / (expNext - expCur));
    this._add(this.add.text(charX - barW/2, barY + 52, `EXP`, { fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#6688FF', fontStyle: 'bold' }).setDepth(402));
    this._add(this.add.text(charX + barW/2, barY + 52, `${ps.exp}/${expNext}`, { fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#8888FF' }).setOrigin(1, 0).setDepth(402));
    this._add(this.add.rectangle(charX, barY + 68, barW, 8, 0x111).setDepth(401));
    this._add(this.add.rectangle(charX - barW/2 + barW * expProg / 2, barY + 68, barW * expProg, 6, 0x4169E1).setDepth(402));
    // Stats line
    this._add(this.add.text(charX, barY + 84, `ATK: ${ps.getAttack()}   DEF: ${ps.getDefense()}`, {
      fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#ccc', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(402));
    // Gold prominently displayed
    this._add(this.add.text(charX, barY + 102, `Altın: ${formatGold(ps.gold)}`, {
      fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#FFD700', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(402));

    // ===== RIGHT PANEL: Inventory Grid =====
    const rightX = 540; // center of right panel
    this._add(this.add.rectangle(rightX, 310, 400, 480, 0x0a0a1a, 0.5).setDepth(400).setStrokeStyle(1, 0x3a3a5a));

    // Bottom info area split into two panels
    const tipY = 510;
    const halfW = 186;
    const tipLeftX = rightX - halfW / 2 - 2;  // left panel center
    const tipRightX = rightX + halfW / 2 + 2;  // right panel center

    // Left: Equipment info (hover tooltip for equipped items)
    this._add(this.add.rectangle(tipLeftX, tipY, halfW, 80, 0x15153a, 0.9).setDepth(401).setStrokeStyle(1, 0x3a3a5a));
    const equipTooltipText = this._add(this.add.text(tipLeftX - halfW / 2 + 8, tipY - 32, '', {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#777',
      align: 'left', wordWrap: { width: halfW - 16 }
    }).setOrigin(0, 0).setDepth(402));

    // Right: Item info (hover tooltip for inventory items)
    this._add(this.add.rectangle(tipRightX, tipY, halfW, 80, 0x15153a, 0.9).setDepth(401).setStrokeStyle(1, 0x3a3a5a));
    const tooltipText = this._add(this.add.text(tipRightX - halfW / 2 + 8, tipY - 32, '', {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#777',
      align: 'left', wordWrap: { width: halfW - 16 }
    }).setOrigin(0, 0).setDepth(402));

    // Inventory grid - 10x10 = 100 slots, ortalı
    const cellSize = 36;
    const cols = 10;
    const maxRows = 10;
    const gridW = cols * cellSize;   // 360
    const gridH = maxRows * cellSize; // 360
    // Dış panel: rightX=540, y=310, w=400, h=480 → üst=70, alt=550, tooltip=470-550
    const panelLeft = rightX - 200;  // 340
    const panelTop = 70;
    const panelUsableH = 400; // 70 → 470 (tooltip üstü)
    const gridStartX = panelLeft + (400 - gridW) / 2; // yatay ortala
    const titleH = 24;
    const gridStartY = panelTop + (panelUsableH - gridH - titleH) / 2 + titleH; // dikey ortala

    // Group inventory items for stacking (enhanced item desteği)
    const stacked = [];
    const stackMap = {};
    ps.inventory.forEach(entry => {
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
          stacked.push({ itemId: baseId, entry, count: 1, stackable, enhanced: false });
        }
      } else {
        if (stackable) stackMap[baseId] = stacked.length;
        stacked.push({ itemId: baseId, entry, count: 1, stackable, enhanced });
      }
    });

    const itemCount = this.add.text(gridStartX + gridW / 2, gridStartY - 30, `Envanter (${ps.getUsedSlots()}/${ps.maxInventory})`, {
      fontSize: '16px', fontFamily: 'Arial, sans-serif', color: '#FFD700', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(405);
    this.invElements.push(itemCount);

    // Draw grid background
    for (let row = 0; row < maxRows; row++) {
      for (let col = 0; col < cols; col++) {
        this._add(this.add.rectangle(gridStartX + col * cellSize, gridStartY + row * cellSize, cellSize - 2, cellSize - 2, 0x1a1a2a, 0.6).setDepth(401).setStrokeStyle(1, 0x2a2a4a));
      }
    }

    // Grid'i sıfırdan oluştur — önceki pozisyonları hatırla
    const oldGrid = ps.inventoryGrid || [];
    ps.inventoryGrid = [];
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

    // Her stacked item için pozisyon belirle
    const gridEntries = [];
    stacked.forEach(stack => {
      const item = ITEMS[stack.itemId];
      if (!item) return;
      const gw = item.gridW || 1, gh = item.gridH || 1;
      // Önceki pozisyonu hatırla
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
      ps.inventoryGrid.push({ entry: key, col: pos.col, row: pos.row });
      gridEntries.push({ ...stack, col: pos.col, row: pos.row });
    });

    // Drag state
    this._dragItem = null;
    this._dragIcon = null;

    gridEntries.forEach((stack) => {
      const item = ITEMS[stack.itemId];
      if (!item) return;
      const gw = item.gridW || 1;
      const gh = item.gridH || 1;

      // Grid pozisyonundan piksel pozisyonu hesapla
      const ix = gridStartX + stack.col * cellSize + (gw - 1) * cellSize / 2;
      const iy = gridStartY + stack.row * cellSize + (gh - 1) * cellSize / 2;

      // Item background (shows size)
      if (gw > 1 || gh > 1) {
        this._add(this.add.rectangle(ix, iy, gw * cellSize - 4, gh * cellSize - 4, 0x1a1a3a, 0.8).setDepth(401).setStrokeStyle(1, 0x4a4a6a));
      }

      // Enhanced item parıltı çerçevesi (item sınırları içinde)
      if (stack.enhanced) {
        this._add(this.add.rectangle(ix, iy, gw * cellSize - 6, gh * cellSize - 6, 0x000000, 0)
          .setDepth(404).setStrokeStyle(1, 0xFFD700));
        this._add(this.add.text(ix - gw * cellSize / 2 + 4, iy - gh * cellSize / 2 + 2, '✦', {
          fontSize: '8px', color: '#FFD700'
        }).setDepth(405));
      }

      // Icon (scale up for bigger items)
      const iconScale = (gw >= 2 && gh >= 2) ? 0.85 : (gh >= 2 || gw >= 2) ? 0.75 : 0.45;
      const icon = this._add(this.add.image(ix, iy, `icon_${stack.itemId}`).setDepth(402).setScale(iconScale).setInteractive({ useHandCursor: true, draggable: true }));
      icon.itemId = stack.itemId;
      icon._gridEntry = stack.entry;
      icon._origX = ix;
      icon._origY = iy;
      icon._gridCol = stack.col;
      icon._gridRow = stack.row;
      icon._gw = gw;
      icon._gh = gh;

      // Drag events
      icon.on('drag', (pointer, dragX, dragY) => {
        icon.setPosition(dragX, dragY);
        icon.setDepth(500); // Sürüklerken en üstte
        icon.setAlpha(0.7);
      });
      icon.on('dragend', () => {
        icon.setAlpha(1);
        icon.setDepth(402);
        // Bırakılan grid pozisyonunu hesapla
        const dropCol = Math.round((icon.x - gridStartX) / cellSize);
        const dropRow = Math.round((icon.y - gridStartY) / cellSize);
        // Grid sınırları içinde mi?
        if (dropCol >= 0 && dropCol + gw <= cols && dropRow >= 0 && dropRow + gh <= maxRows) {
          // Çakışma kontrolü
          let canPlace = true;
          const gridIdx = ps.inventoryGrid.findIndex(g => g.entry === stack.entry || (stack.stackable && ps.getBaseItemId(g.entry) === stack.itemId));
          for (let dr = 0; dr < gh && canPlace; dr++)
            for (let dc = 0; dc < gw && canPlace; dc++) {
              const other = ps.inventoryGrid.find(g => {
                if (stack.stackable && ps.getBaseItemId(g.entry) === stack.itemId) return false;
                if (g.entry === stack.entry) return false;
                const oItem = ITEMS[ps.getBaseItemId(g.entry)];
                const ogw = oItem ? (oItem.gridW || 1) : 1, ogh = oItem ? (oItem.gridH || 1) : 1;
                return dropCol + dc >= g.col && dropCol + dc < g.col + ogw && dropRow + dr >= g.row && dropRow + dr < g.row + ogh;
              });
              if (other) canPlace = false;
            }
          if (canPlace && gridIdx !== -1) {
            ps.inventoryGrid[gridIdx].col = dropCol;
            ps.inventoryGrid[gridIdx].row = dropRow;
            ps.save();
            this.closeInventory();
            this.openInventory();
            return;
          }
        }
        // Geçersiz pozisyon — geri dön
        icon.setPosition(icon._origX, icon._origY);
      });

      // Size label for big items
      if (gw > 1 || gh > 1) {
        this._add(this.add.text(ix + gw * cellSize / 2 - 4, iy + gh * cellSize / 2 - 4, `${gw}x${gh}`, {
          fontSize: '9px', fontFamily: 'Arial, sans-serif', color: '#555'
        }).setOrigin(1, 1).setDepth(403));
      }

      // Stack count badge
      if (stack.count > 1) {
        this._add(this.add.text(ix + cellSize / 2 - 4, iy + cellSize / 2 - 4, `${stack.count}`, {
          fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#fff', fontStyle: 'bold',
          backgroundColor: '#333', padding: { x: 2, y: 0 }, stroke: '#000', strokeThickness: 2
        }).setOrigin(1, 1).setDepth(403));
      }

      // Hover
      let hoverLabel = null;
      icon.on('pointerover', () => {
        const countStr = stack.count > 1 ? ` (x${stack.count})` : '';
        hoverLabel = this._add(this.add.text(ix, iy - gh * cellSize / 2 - 12, item.name + countStr, {
          fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#FFD700',
          backgroundColor: '#0a0a1a', padding: { x: 4, y: 2 }, stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(410));
        // Right: name + description
        let info = `${stack.enhanced ? '✦ ' : ''}${item.name}${countStr}`;
        if (item.desc) info += `\n${item.desc}`;
        info += `\nDeğer: ${formatGold(item.value)}`;
        tooltipText.setText(info);
        tooltipText.setColor('#c0a0e0');
        // Left: stats
        let stats = '';
        if (item.attack) stats += `Saldırı: +${item.attack}\n`;
        if (item.defense) stats += `Savunma: +${item.defense}\n`;
        if (item.heal) stats += `İyileşme: +${item.heal}\n`;
        if (item.mana) stats += `Mana: +${item.mana}\n`;
        if (item.maxHp) stats += `Max HP: +${item.maxHp}\n`;
        if (item.maxMana) stats += `Max Mana: +${item.maxMana}\n`;
        if (item.manaCost) stats += `Mana: ${item.manaCost}/atış\n`;
        if (stack.enhanced) {
          const bonuses = ps.getItemBonuses(stack.entry);
          if (bonuses) {
            stats += '--- ✦ BONUS ✦ ---\n';
            if (bonuses.attack) stats += `+${bonuses.attack} Saldırı\n`;
            if (bonuses.defense) stats += `+${bonuses.defense} Savunma\n`;
            if (bonuses.maxHp) stats += `+${bonuses.maxHp} Max HP\n`;
            if (bonuses.maxMana) stats += `+${bonuses.maxMana} Max Mana\n`;
          }
        }
        equipTooltipText.setText(stats.trim());
        equipTooltipText.setColor('#c0a0e0');
      });
      icon.on('pointerout', () => {
        if (hoverLabel) { hoverLabel.destroy(); hoverLabel = null; }
        equipTooltipText.setText(''); equipTooltipText.setColor('#777');
        tooltipText.setText(''); tooltipText.setColor('#777');
      });

      // Left click: equip or use
      icon.on('pointerdown', (pointer) => {
        if (pointer.rightButtonDown()) return; // ignore right click here
        if (item.type === 'weapon' || item.type === 'armor' || item.type === 'accessory') {
          ps.equip(item, null, stack.entry);
          this.closeInventory();
          this.openInventory();
        } else if (item.type === 'consumable') {
          if (item.heal && !item.mana && ps.hp >= ps.getMaxHp()) return;
          if (item.mana && !item.heal && ps.mana >= ps.getMaxMana()) return;
          if (item.heal && item.mana && ps.hp >= ps.getMaxHp() && ps.mana >= ps.getMaxMana()) return;

          if (item.heal) ps.heal(item.heal);
          if (item.mana) ps.restoreMana(item.mana);
          if (item.buffAttack) ps.addBuff({ attack: item.buffAttack, duration: item.buffDuration });
          if (item.buffDefense) ps.addBuff({ defense: item.buffDefense, duration: item.buffDuration });
          ps.removeItem(stack.itemId);
          this.closeInventory();
          this.openInventory();
        }
      });

      // Right click: drop item on ground
      icon.on('pointerdown', (pointer) => {
        if (!pointer.rightButtonDown()) return;
        ps.removeItem(stack.itemId);
        // Drop in overworld
        const gameScene = this.scene.get('OverworldScene');
        if (gameScene && gameScene.player) {
          const dx = gameScene.player.x + Phaser.Math.Between(-40, 40);
          const dy = gameScene.player.y + Phaser.Math.Between(-20, 30);
          gameScene.dropSingleItem(dx, dy, stack.itemId);
        }
        this.closeInventory();
        this.openInventory();
      });

      this.invElements.push(icon);
    });

    // Close button (top right corner)
    const closeBtn = this._add(this.add.text(765, 30, 'X', {
      fontSize: '20px', fontFamily: 'Arial, sans-serif', color: '#FF6666', fontStyle: 'bold',
      backgroundColor: '#2a0a0a', padding: { x: 8, y: 3 }
    }).setOrigin(0.5).setDepth(403).setInteractive({ useHandCursor: true }));
    closeBtn.on('pointerdown', () => this.closeInventory());
    closeBtn.on('pointerover', () => closeBtn.setColor('#FF9999'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#FF6666'));
  }

  closeInventory() {
    this.inventoryOpen = false;
    if (this.invElements) {
      this.invElements.forEach(e => { if (e?.destroy) e.destroy(); });
      this.invElements = null;
    }
  }

  showDialogue(name, text) {
    this.dialogueOpen = true;
    this.dialogueBg.setVisible(true);
    this.dialogueName.setText(name).setVisible(true);
    this.dialogueText.setText(text).setVisible(true);
    this.dialogueHint.setVisible(true);
  }

  closeDialogue() {
    this.dialogueOpen = false;
    this.dialogueBg.setVisible(false);
    this.dialogueName.setVisible(false);
    this.dialogueText.setVisible(false);
    this.dialogueHint.setVisible(false);
  }

  showNotification(text) {
    this.notifText.setText(text).setAlpha(1);
    this.tweens.add({
      targets: this.notifText,
      alpha: 0,
      delay: 2000,
      duration: 1000
    });
  }

  // ===== SKILL BAR =====
  createSkillBar() {
    const ps = this.playerState;
    const allSkills = SKILL_DEFINITIONS[ps.playerClass] || [];
    this.skillBarSlots = [];
    this.skillBarCooldowns = [];

    const barX = 250; // start x
    const barY = 555; // near bottom
    const slotSize = 40;
    const gap = 6;

    for (let i = 0; i < 4; i++) {
      const x = barX + i * (slotSize + gap);
      const skill = allSkills[i];
      const unlocked = skill && ps.level >= skill.level;

      // Slot background
      const bg = this.add.rectangle(x, barY, slotSize, slotSize, unlocked ? 0x1a1a3a : 0x0a0a1a, 0.85)
        .setDepth(200).setStrokeStyle(1.5, unlocked ? 0x6a5aaa : 0x2a2a4a);

      // Key number
      this.add.text(x - slotSize / 2 + 3, barY - slotSize / 2 + 1, `${i + 1}`, {
        fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#888'
      }).setDepth(202);

      // Skill name (short)
      const nameText = this.add.text(x, barY + 4, skill ? skill.name.split(' ')[0] : '', {
        fontSize: '9px', fontFamily: 'Arial, sans-serif',
        color: unlocked ? (skill?.color || '#aaa') : '#444',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(202);

      // Mana cost
      const manaText = this.add.text(x, barY + slotSize / 2 - 5, skill ? `${skill.manaCost}` : '', {
        fontSize: '9px', fontFamily: 'Arial, sans-serif', color: '#4488ff'
      }).setOrigin(0.5).setDepth(202);

      // Cooldown overlay (initially invisible)
      const cdOverlay = this.add.rectangle(x, barY, slotSize - 2, slotSize - 2, 0x000000, 0.6)
        .setDepth(201).setVisible(false);

      // Cooldown text
      const cdText = this.add.text(x, barY - 6, '', {
        fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#ff8888', fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(203).setVisible(false);

      // Lock icon for unavailable
      if (skill && !unlocked) {
        this.add.text(x, barY - 6, `Lv.${skill.level}`, {
          fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#ff6666'
        }).setOrigin(0.5).setDepth(203);
      }

      this.skillBarSlots.push({ bg, nameText, manaText, cdOverlay, cdText, skill });
    }

    // Update skill bar periodically
    this.time.addEvent({
      delay: 100, loop: true,
      callback: () => this.updateSkillBar()
    });
  }

  updateSkillBar() {
    const ps = this.playerState;
    const activeScene = this.scene.get('OverworldScene')?.scene.isActive() ? this.scene.get('OverworldScene') :
                        this.scene.get('DungeonScene')?.scene.isActive() ? this.scene.get('DungeonScene') :
                        this.scene.get('LabyrinthScene')?.scene.isActive() ? this.scene.get('LabyrinthScene') : null;

    if (!activeScene || !activeScene.skillSystem) return;
    const ss = activeScene.skillSystem;

    this.skillBarSlots.forEach((slot, i) => {
      if (!slot.skill) return;
      const unlocked = ps.level >= slot.skill.level;
      if (!unlocked) return;

      const progress = ss.getCooldownProgress(slot.skill.id);
      const remaining = ss.getRemainingCooldown(slot.skill.id);
      const hasManа = ps.mana >= slot.skill.manaCost;

      if (progress < 1) {
        // On cooldown
        slot.cdOverlay.setVisible(true);
        slot.cdText.setVisible(true);
        slot.cdText.setText(`${Math.ceil(remaining / 1000)}s`);
      } else {
        slot.cdOverlay.setVisible(false);
        slot.cdText.setVisible(false);
      }

      // Gray out if no mana
      const color = !hasManа ? '#666' : (slot.skill.color || '#aaa');
      slot.nameText.setColor(unlocked ? color : '#444');
    });
  }
}
