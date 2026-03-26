import Phaser from 'phaser';
import { PlayerState, CLASS_DEFINITIONS } from '../systems/PlayerState.js';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  create() {
    this.cleanupNameInput();
    const { width, height } = this.scale;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a2a, 0x0a0a2a, 0x1a0a3a, 0x2a1a4a);
    bg.fillRect(0, 0, width, height);

    // Ambient particles
    this.add.particles(0, 0, 'particle_twilight', {
      x: { min: 0, max: width }, y: { min: 0, max: height },
      lifespan: 4000, speed: { min: 5, max: 20 },
      scale: { start: 0.5, end: 0 }, alpha: { start: 0.6, end: 0 },
      frequency: 200, blendMode: 'ADD'
    });

    // Title
    this.add.text(width / 2, 60, 'LEGEND OF DUSKHOLLOW', {
      fontSize: '34px', fontFamily: 'Arial, sans-serif', color: '#c0a0e0',
      stroke: '#2a1a4a', strokeThickness: 5,
      shadow: { offsetX: 2, offsetY: 2, color: '#1a0a2a', blur: 8, fill: true }
    }).setOrigin(0.5);

    this.add.text(width / 2, 100, 'Alacakaranlık Vadisi Efsanesi', {
      fontSize: '16px', fontFamily: 'Arial, sans-serif', color: '#8a7aaa'
    }).setOrigin(0.5);

    // 3 Save Slots
    this.drawSaveSlots(width, height);

    // Version
    this.add.text(width / 2, height - 16, 'v0.2 - Duskhollow', {
      fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#2a2a4a'
    }).setOrigin(0.5);
  }

  drawSaveSlots(width, height) {
    const slotW = 220, slotH = 380;
    const gap = 20;
    const totalW = slotW * 3 + gap * 2;
    const startX = (width - totalW) / 2 + slotW / 2;
    const slotY = 330;

    for (let i = 0; i < 3; i++) {
      const x = startX + i * (slotW + gap);
      const saveKey = `rpg_save_${i}`;
      const saveData = this.getSaveData(saveKey);

      // Slot background
      const slotBg = this.add.rectangle(x, slotY, slotW, slotH, 0x12122a, 0.9)
        .setStrokeStyle(2, saveData ? 0x6a5aaa : 0x3a3a5a);

      // Slot number
      this.add.text(x, slotY - slotH / 2 + 18, `Kayıt ${i + 1}`, {
        fontSize: '16px', fontFamily: 'Arial, sans-serif',
        color: saveData ? '#c0a0e0' : '#5a5a7a', fontStyle: 'bold'
      }).setOrigin(0.5);

      if (saveData) {
        // Character preview — gender aware
        const charY = slotY - 60;
        const charTex = saveData.gender === 'female' ? 'player_female' : 'player';
        const char = this.add.image(x, charY, charTex).setScale(1.2);
        char.setFrame(0);

        // Equipment layers on preview — gender aware
        const eqSuffix = saveData.gender === 'female' ? '_f' : '';
        ['legs', 'chest', 'arms', 'belt', 'head', 'weapon', 'necklace', 'earring'].forEach(slot => {
          if (saveData.equipped && saveData.equipped[slot]) {
            const layer = this.add.image(x, charY, `equip_${slot}${eqSuffix}`).setScale(1.2);
            layer.setFrame(0);
          }
        });

        // Save info — spaced out clearly
        const infoY = slotY + 40;
        const classDef = CLASS_DEFINITIONS[saveData.playerClass] || CLASS_DEFINITIONS.warrior;
        this.add.text(x, infoY, `${saveData.playerName || 'Kahraman'}`, {
          fontSize: '18px', fontFamily: 'Arial, sans-serif', color: '#FFD700', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.add.text(x, infoY + 24, `Lv.${saveData.level} ${classDef.displayName}`, {
          fontSize: '17px', fontFamily: 'Arial, sans-serif', color: classDef.color, fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(x, infoY + 50, `HP: ${saveData.hp}/${saveData.maxHp}`, {
          fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#FF8888'
        }).setOrigin(0.5);

        this.add.text(x, infoY + 70, `Altın: ${saveData.gold}`, {
          fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#FFD700'
        }).setOrigin(0.5);

        this.add.text(x, infoY + 90, `ATK:${this.calcAttack(saveData)}  DEF:${this.calcDefense(saveData)}`, {
          fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#aaa'
        }).setOrigin(0.5);

        // Continue button — near bottom
        const contBtn = this.add.text(x, slotY + slotH / 2 - 50, 'Devam Et', {
          fontSize: '17px', fontFamily: 'Arial, sans-serif', color: '#90ee90',
          backgroundColor: '#1a3a1a', padding: { x: 20, y: 8 }, fontStyle: 'bold'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        contBtn.on('pointerover', () => contBtn.setColor('#bbffbb'));
        contBtn.on('pointerout', () => contBtn.setColor('#90ee90'));
        contBtn.on('pointerdown', () => this.loadSlot(i));

        // Delete button
        const delBtn = this.add.text(x, slotY + slotH / 2 - 15, 'Sil', {
          fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#ff6666',
          padding: { x: 10, y: 4 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        delBtn.on('pointerover', () => delBtn.setColor('#ffaaaa'));
        delBtn.on('pointerout', () => delBtn.setColor('#ff6666'));
        delBtn.on('pointerdown', () => {
          if (confirm(`Kayıt ${i + 1} silinecek! Emin misin?`)) {
            localStorage.removeItem(saveKey);
            // Also remove old format
            if (i === 0) localStorage.removeItem('rpg_save');
            this.scene.restart();
          }
        });

      } else {
        // Empty slot - New Game button
        this.add.text(x, slotY - 20, 'Boş Kayıt', {
          fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#4a4a6a'
        }).setOrigin(0.5);

        const newBtn = this.add.text(x, slotY + 30, 'Yeni Oyun', {
          fontSize: '18px', fontFamily: 'Arial, sans-serif', color: '#c0a0e0',
          backgroundColor: '#2a1a3a', padding: { x: 20, y: 8 }, fontStyle: 'bold'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        newBtn.on('pointerover', () => { newBtn.setColor('#e0c0ff'); newBtn.setScale(1.05); });
        newBtn.on('pointerout', () => { newBtn.setColor('#c0a0e0'); newBtn.setScale(1); });
        newBtn.on('pointerdown', () => this.newGameSlot(i));
      }

      // Highlight slot on hover
      slotBg.setInteractive();
      slotBg.on('pointerover', () => slotBg.setStrokeStyle(2, 0x9a8aCC));
      slotBg.on('pointerout', () => slotBg.setStrokeStyle(2, saveData ? 0x6a5aaa : 0x3a3a5a));
    }

    // Migrate old save to slot 0 if exists
    this.migrateOldSave();
  }

  getSaveData(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  calcAttack(data) {
    let atk = data.baseAttack || 3;
    if (data.equipped) Object.values(data.equipped).forEach(eq => { if (eq && eq.attack) atk += eq.attack; });
    return atk;
  }

  calcDefense(data) {
    let def = data.baseDefense || 1;
    if (data.equipped) Object.values(data.equipped).forEach(eq => { if (eq && eq.defense) def += eq.defense; });
    return def;
  }

  migrateOldSave() {
    // If old format save exists and slot 0 is empty, migrate
    const oldSave = localStorage.getItem('rpg_save');
    const slot0 = localStorage.getItem('rpg_save_0');
    if (oldSave && !slot0) {
      localStorage.setItem('rpg_save_0', oldSave);
      localStorage.removeItem('rpg_save');
      this.scene.restart();
    }
  }

  newGameSlot(slotIndex) {
    this.pendingSlot = slotIndex;
    this.showGenderSelect();
  }

  showGenderSelect() {
    // Clear everything including HTML elements
    this.cleanupNameInput();
    this.children.removeAll(true);
    const { width, height } = this.scale;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a2a, 0x0a0a2a, 0x1a0a3a, 0x2a1a4a);
    bg.fillRect(0, 0, width, height);

    this.add.text(width / 2, 60, 'Karakter Seçimi', {
      fontSize: '30px', fontFamily: 'Arial, sans-serif', color: '#c0a0e0',
      fontStyle: 'bold', stroke: '#2a1a4a', strokeThickness: 4
    }).setOrigin(0.5);

    this.add.text(width / 2, 100, 'Karakterini seç ve maceraya başla!', {
      fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#7a6a9a'
    }).setOrigin(0.5);

    // Two character cards
    const cardW = 260, cardH = 360;
    const gap = 40;
    const maleX = width / 2 - cardW / 2 - gap / 2;
    const femaleX = width / 2 + cardW / 2 + gap / 2;
    const cardY = 310;

    // Male card
    const maleCard = this.add.rectangle(maleX, cardY, cardW, cardH, 0x12122a, 0.9).setStrokeStyle(2, 0x4a5aaa);
    this.add.text(maleX, cardY - cardH / 2 + 24, 'Erkek', {
      fontSize: '22px', fontFamily: 'Arial, sans-serif', color: '#88aaff', fontStyle: 'bold'
    }).setOrigin(0.5);

    const maleChar = this.add.image(maleX, cardY - 30, 'player').setScale(2);
    maleChar.setFrame(0);

    this.add.text(maleX, cardY + 80, 'Güçlü savaşçı', {
      fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#8888aa'
    }).setOrigin(0.5);

    const maleBtn = this.add.text(maleX, cardY + cardH / 2 - 35, 'Seç', {
      fontSize: '20px', fontFamily: 'Arial, sans-serif', color: '#88ccff',
      backgroundColor: '#1a2a4a', padding: { x: 30, y: 10 }, fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    maleBtn.on('pointerover', () => { maleBtn.setColor('#bbddff'); maleCard.setStrokeStyle(3, 0x88aaff); });
    maleBtn.on('pointerout', () => { maleBtn.setColor('#88ccff'); maleCard.setStrokeStyle(2, 0x4a5aaa); });
    maleBtn.on('pointerdown', () => this.startWithGender('male'));

    // Female card
    const femaleCard = this.add.rectangle(femaleX, cardY, cardW, cardH, 0x12122a, 0.9).setStrokeStyle(2, 0xaa5a8a);
    this.add.text(femaleX, cardY - cardH / 2 + 24, 'Kız', {
      fontSize: '22px', fontFamily: 'Arial, sans-serif', color: '#ff88aa', fontStyle: 'bold'
    }).setOrigin(0.5);

    const femaleChar = this.add.image(femaleX, cardY - 30, 'player_female').setScale(2);
    femaleChar.setFrame(0);

    this.add.text(femaleX, cardY + 80, 'Çevik büyücü', {
      fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#aa8888'
    }).setOrigin(0.5);

    const femaleBtn = this.add.text(femaleX, cardY + cardH / 2 - 35, 'Seç', {
      fontSize: '20px', fontFamily: 'Arial, sans-serif', color: '#ffaacc',
      backgroundColor: '#4a1a2a', padding: { x: 30, y: 10 }, fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    femaleBtn.on('pointerover', () => { femaleBtn.setColor('#ffccdd'); femaleCard.setStrokeStyle(3, 0xff88aa); });
    femaleBtn.on('pointerout', () => { femaleBtn.setColor('#ffaacc'); femaleCard.setStrokeStyle(2, 0xaa5a8a); });
    femaleBtn.on('pointerdown', () => this.startWithGender('female'));

    // Back button
    const backBtn = this.add.text(width / 2, height - 30, '< Geri', {
      fontSize: '16px', fontFamily: 'Arial, sans-serif', color: '#666'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.restart());
  }

  startWithGender(gender) {
    this.pendingGender = gender;
    this.showClassSelect();
  }

  showClassSelect() {
    this.cleanupNameInput();
    this.children.removeAll(true);
    const { width, height } = this.scale;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a2a, 0x0a0a2a, 0x1a0a3a, 0x2a1a4a);
    bg.fillRect(0, 0, width, height);

    this.add.text(width / 2, 50, 'Sınıf Seçimi', {
      fontSize: '30px', fontFamily: 'Arial, sans-serif', color: '#c0a0e0',
      fontStyle: 'bold', stroke: '#2a1a4a', strokeThickness: 4
    }).setOrigin(0.5);

    this.add.text(width / 2, 85, 'Savaş tarzını belirle!', {
      fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#7a6a9a'
    }).setOrigin(0.5);

    const classes = ['warrior', 'archer', 'mage'];
    const cardW = 220, cardH = 380;
    const gap = 20;
    const totalW = cardW * 3 + gap * 2;
    const startX = (width - totalW) / 2 + cardW / 2;
    const cardY = 310;

    classes.forEach((classKey, i) => {
      const def = CLASS_DEFINITIONS[classKey];
      const x = startX + i * (cardW + gap);

      // Card background
      const color = parseInt(def.color.replace('#', ''), 16);
      const card = this.add.rectangle(x, cardY, cardW, cardH, 0x12122a, 0.9)
        .setStrokeStyle(2, color);

      // Class icon
      this.add.image(x, cardY - 120, `class_${classKey}`).setScale(1.5);

      // Class name
      this.add.text(x, cardY - 70, def.displayName, {
        fontSize: '24px', fontFamily: 'Arial, sans-serif', color: def.color, fontStyle: 'bold'
      }).setOrigin(0.5);

      // Description
      this.add.text(x, cardY - 40, def.description, {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#8a8aaa',
        wordWrap: { width: cardW - 30 }, align: 'center'
      }).setOrigin(0.5);

      // Stats preview
      const statsY = cardY + 10;
      const stats = def.baseStats;
      const growth = def.growth;
      const statLines = [
        `HP: ${stats.maxHp}  (+${growth.maxHp}/lv)`,
        `Mana: ${stats.maxMana}  (+${growth.maxMana}/lv)`,
        `Saldırı: ${stats.baseAttack}  (+${growth.baseAttack}/lv)`,
        `Savunma: ${stats.baseDefense}  (+${growth.baseDefense}/lv)`,
        `Hız: ${stats.speed}`
      ];
      statLines.forEach((line, si) => {
        this.add.text(x, statsY + si * 22, line, {
          fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#b0b0d0'
        }).setOrigin(0.5);
      });

      // Starting weapon
      const weaponNames = { wooden_sword: 'Tahta Kılıç', wooden_bow: 'Tahta Yay', wooden_staff: 'Tahta Asa' };
      this.add.text(x, statsY + 120, `Başlangıç: ${weaponNames[def.startWeapon]}`, {
        fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#FFD700'
      }).setOrigin(0.5);

      // Select button
      const btn = this.add.text(x, cardY + cardH / 2 - 30, 'Seç', {
        fontSize: '20px', fontFamily: 'Arial, sans-serif', color: def.color,
        backgroundColor: '#1a1a2a', padding: { x: 30, y: 10 }, fontStyle: 'bold'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => { btn.setScale(1.05); card.setStrokeStyle(3, color); });
      btn.on('pointerout', () => { btn.setScale(1); card.setStrokeStyle(2, color); });
      btn.on('pointerdown', () => {
        this.pendingClass = classKey;
        this.showNameInput();
      });
    });

    // Back button
    const backBtn = this.add.text(width / 2, height - 20, '< Geri', {
      fontSize: '16px', fontFamily: 'Arial, sans-serif', color: '#666'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.showGenderSelect());
  }

  showNameInput() {
    this.children.removeAll(true);
    const { width, height } = this.scale;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a2a, 0x0a0a2a, 0x1a0a3a, 0x2a1a4a);
    bg.fillRect(0, 0, width, height);

    // Character preview
    const charTex = this.pendingGender === 'female' ? 'player_female' : 'player';
    const charImg = this.add.image(width / 2, 190, charTex).setScale(2);
    charImg.setFrame(0);

    this.add.text(width / 2, 380, 'Karakterine İsim Ver', {
      fontSize: '28px', fontFamily: 'Arial, sans-serif', color: '#c0a0e0',
      fontStyle: 'bold', stroke: '#2a1a4a', strokeThickness: 4
    }).setOrigin(0.5);

    // Name input using HTML input element
    const inputElement = document.createElement('input');
    inputElement.type = 'text';
    inputElement.placeholder = 'İsim gir...';
    inputElement.maxLength = 16;
    // Get canvas position for accurate centering
    const canvas = this.sys.game.canvas;
    const rect = canvas.getBoundingClientRect();
    inputElement.style.cssText = `
      position: fixed;
      left: ${rect.left + rect.width / 2}px;
      top: ${rect.top + rect.height * 0.72}px;
      transform: translate(-50%, -50%);
      width: 300px; padding: 14px 20px;
      font-size: 22px; font-family: Arial, sans-serif;
      text-align: center; color: #c0a0e0;
      background: #1a1a3a; border: 2px solid #6a5aaa;
      border-radius: 8px; outline: none;
      box-sizing: border-box; z-index: 1000;
    `;
    inputElement.addEventListener('focus', () => { inputElement.style.borderColor = '#9a8aCC'; });
    inputElement.addEventListener('blur', () => { inputElement.style.borderColor = '#6a5aaa'; });
    document.body.appendChild(inputElement);
    this._nameInput = inputElement;

    // Auto focus
    setTimeout(() => inputElement.focus(), 100);

    // Preview name below character
    const namePreview = this.add.text(width / 2, 280, '', {
      fontSize: '22px', fontFamily: 'Arial, sans-serif', color: '#FFD700',
      fontStyle: 'bold', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5);

    // Update preview as user types
    this._nameUpdateTimer = this.time.addEvent({
      delay: 100, loop: true,
      callback: () => {
        const val = inputElement.value.trim();
        namePreview.setText(val || '...');
      }
    });

    // Start button
    const startBtn = this.add.text(width / 2, 510, 'Maceraya Başla!', {
      fontSize: '22px', fontFamily: 'Arial, sans-serif', color: '#90ee90',
      backgroundColor: '#1a3a1a', padding: { x: 24, y: 10 }, fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    startBtn.on('pointerover', () => startBtn.setColor('#bbffbb'));
    startBtn.on('pointerout', () => startBtn.setColor('#90ee90'));
    startBtn.on('pointerdown', () => {
      const name = inputElement.value.trim() || (this.pendingGender === 'female' ? 'Kahraman' : 'Kahraman');
      this.finishCharacterCreation(name);
    });

    // Enter key also starts
    inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const name = inputElement.value.trim() || 'Kahraman';
        this.finishCharacterCreation(name);
      }
    });

    // Back button
    const backBtn = this.add.text(width / 2, 560, '< Geri', {
      fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#666'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      this.cleanupNameInput();
      this.showClassSelect();
    });
  }

  cleanupNameInput() {
    if (this._nameInput) {
      this._nameInput.remove();
      this._nameInput = null;
    }
    if (this._nameUpdateTimer) {
      this._nameUpdateTimer.destroy();
      this._nameUpdateTimer = null;
    }
  }

  finishCharacterCreation(name) {
    this.cleanupNameInput();
    PlayerState.activeSlot = this.pendingSlot;
    const ps = PlayerState.getInstance();
    ps.gender = this.pendingGender;
    ps.playerClass = this.pendingClass || 'warrior';
    ps.reset();
    ps.gender = this.pendingGender;
    ps.playerClass = this.pendingClass || 'warrior';
    ps.playerName = name;
    ps.saveSlot = this.pendingSlot;
    ps.save();
    this.scene.start('OverworldScene');
    this.scene.launch('UIScene');
  }

  loadSlot(slotIndex) {
    PlayerState.activeSlot = slotIndex;
    const ps = PlayerState.getInstance();
    ps.saveSlot = slotIndex;
    if (ps.load()) {
      this.scene.start(ps.lastScene || 'OverworldScene');
      this.scene.launch('UIScene');
    } else {
      ps.reset();
      this.scene.start('OverworldScene');
      this.scene.launch('UIScene');
    }
  }
}
