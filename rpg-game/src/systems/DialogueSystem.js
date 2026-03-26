import { PlayerState } from './PlayerState.js';
import { QUESTS } from '../data/quests.js';

/**
 * Gelişmiş diyalog sistemi — daktilo efekti, seçenekler, görev zincirleri
 */
export class DialogueSystem {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.currentLines = [];
    this.currentLineIndex = 0;
    this.typewriterTimer = null;
    this.onComplete = null;
  }

  /**
   * Diyalog dizisi başlat
   * @param {string} speakerName - Konuşan NPC ismi
   * @param {string[]} lines - Diyalog satırları
   * @param {object} options - { onComplete, choices }
   */
  startDialogue(speakerName, lines, options = {}) {
    if (this.active) return;
    this.active = true;
    this.currentLines = Array.isArray(lines) ? lines : [lines];
    this.currentLineIndex = 0;
    this.onComplete = options.onComplete || null;
    this.choices = options.choices || null;
    this.speakerName = speakerName;

    this.showCurrentLine();
  }

  showCurrentLine() {
    const uiScene = this.scene.scene.get('UIScene');
    if (!uiScene) return;

    const line = this.currentLines[this.currentLineIndex];
    const isLast = this.currentLineIndex >= this.currentLines.length - 1;

    // Show dialogue box with typewriter effect
    this.showTypewriter(uiScene, this.speakerName, line, isLast);
  }

  showTypewriter(uiScene, speaker, text, isLast) {
    // Use UIScene's dialogue box
    uiScene.dialogueBg.setVisible(true);
    uiScene.dialogueName.setVisible(true).setText(speaker);
    uiScene.dialogueText.setVisible(true).setText('');
    uiScene.dialogueOpen = true;

    // Hint text
    const hintText = isLast && this.choices ? 'Seçim yap' : isLast ? '[E] Kapat' : '[E] Devam';
    uiScene.dialogueHint.setVisible(true).setText(hintText);

    // Typewriter effect
    let charIndex = 0;
    if (this.typewriterTimer) this.typewriterTimer.destroy();

    this.typewriterTimer = this.scene.time.addEvent({
      delay: 25,
      repeat: text.length - 1,
      callback: () => {
        charIndex++;
        uiScene.dialogueText.setText(text.substring(0, charIndex));
      }
    });

    // Show choices on last line if available
    if (isLast && this.choices) {
      this.scene.time.delayedCall(text.length * 25 + 500, () => {
        this.showChoices(uiScene);
      });
    }
  }

  advance() {
    if (!this.active) return;

    // Skip typewriter if still running
    if (this.typewriterTimer && this.typewriterTimer.getRepeatCount() > 0) {
      this.typewriterTimer.destroy();
      const uiScene = this.scene.scene.get('UIScene');
      if (uiScene) {
        uiScene.dialogueText.setText(this.currentLines[this.currentLineIndex]);
      }
      return;
    }

    this.currentLineIndex++;
    if (this.currentLineIndex < this.currentLines.length) {
      this.showCurrentLine();
    } else {
      this.close();
    }
  }

  showChoices(uiScene) {
    if (!this.choices || !this.choices.length) return;

    this._choiceButtons = [];
    const startY = 490;

    this.choices.forEach((choice, i) => {
      const btn = this.scene.add.text(80 + i * 250, startY, `${i + 1}. ${choice.text}`, {
        fontSize: '14px', fontFamily: 'Arial, sans-serif',
        color: '#c0a0e0', backgroundColor: '#1a1a3a',
        padding: { x: 12, y: 6 }, fontStyle: 'bold'
      }).setDepth(302).setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => btn.setColor('#e0c0ff'));
      btn.on('pointerout', () => btn.setColor('#c0a0e0'));
      btn.on('pointerdown', () => {
        this.handleChoice(choice);
      });

      this._choiceButtons.push(btn);
    });
  }

  handleChoice(choice) {
    this.clearChoices();

    if (choice.action === 'accept' && choice.questId) {
      const ps = PlayerState.getInstance();
      ps.acceptQuest(choice.questId);
    }

    if (choice.onSelect) {
      choice.onSelect();
    }

    this.close();
  }

  clearChoices() {
    if (this._choiceButtons) {
      this._choiceButtons.forEach(b => b.destroy());
      this._choiceButtons = [];
    }
  }

  close() {
    this.active = false;
    this.clearChoices();

    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
      this.typewriterTimer = null;
    }

    const uiScene = this.scene.scene.get('UIScene');
    if (uiScene) {
      uiScene.closeDialogue();
    }

    if (this.onComplete) {
      this.onComplete();
      this.onComplete = null;
    }
  }
}

// ===== ANA HİKAYE GÖREVLERİ =====
export const STORY_QUESTS = [
  {
    id: 'main_1', name: 'Karanlığın İzleri', chainOrder: 1,
    npc: 'elder', prerequisiteQuests: [],
    desc: 'Slime ormanında garip olaylar yaşanıyor. 10 slime öldürerek bölgeyi temizle.',
    type: 'kill', target: 'slime', required: 10,
    rewards: { exp: 100, gold: 50, items: ['health_potion'] },
    dialogue: {
      intro: ['Yolcu, karanlık ormandan garip sesler geliyor...', 'Slime\'lar her zamankinden daha saldırgan.', 'Bize yardım edebilir misin?'],
      progress: ['Hala iş bitmedi, devam et.'],
      complete: ['Harika! Ama bu sadece başlangıç...', 'Daha büyük bir tehlike yaklaşıyor.']
    }
  },
  {
    id: 'main_2', name: 'Goblin Tehdidi', chainOrder: 2,
    npc: 'guard', prerequisiteQuests: ['main_1'],
    desc: 'Goblinler köye yaklaşıyor. 15 goblin öldür.',
    type: 'kill', target: 'goblin', required: 15,
    rewards: { exp: 200, gold: 100, items: ['iron_sword'] },
    dialogue: {
      intro: ['Büyüğün söylediklerini duydum.', 'Goblinler de huzursuz — 15 tanesini durdurmamız lazım.'],
      complete: ['İyi iş! Ama goblin şefleri hala orada...']
    }
  },
  {
    id: 'main_3', name: 'Karanlık Kristaller', chainOrder: 3,
    npc: 'healer', prerequisiteQuests: ['main_2'],
    desc: 'Şifacı karanlık enerjinin kaynağını arıyor. 5 kristal topla.',
    type: 'gather', target: 'crystal', required: 5,
    rewards: { exp: 250, gold: 120, items: ['big_mana_potion', 'big_mana_potion'] },
    dialogue: {
      intro: ['Karanlık bir enerji hissediyorum...', 'Kristallerde izleri görebilirim.', '5 kristal getir, kaynağı bulalım.'],
      complete: ['Bu kristaller... Alacakaranlık Vadisi\'nin enerjisiyle dolu!', 'Büyük bir güç uyanıyor.']
    }
  },
  {
    id: 'main_4', name: 'Kemik Lordu', chainOrder: 4,
    npc: 'elder', prerequisiteQuests: ['main_3'],
    desc: 'Iskelet Lordu\'nu yen ve karanlık planını öğren.',
    type: 'kill', target: 'skeleton_lord', required: 1,
    rewards: { exp: 500, gold: 250, items: ['steel_sword', 'steel_armor'] },
    dialogue: {
      intro: ['Kristallerdeki enerji bizi mezarlığa yönlendiriyor.', 'Iskelet Lordu bir şey planlıyor.', 'Onu durdurmalısın!'],
      complete: ['Lordu yendin! Ama son nefesinde bir isim fısıldadı...', '"Alacakaranlık Efendisi uyanıyor..."']
    }
  },
  {
    id: 'main_5', name: 'Ejderha Pulu', chainOrder: 5,
    npc: 'healer', prerequisiteQuests: ['main_4'],
    desc: 'Koruyucu iksir için 3 ejderha pulu topla.',
    type: 'gather', target: 'dragon_scale', required: 3,
    rewards: { exp: 600, gold: 300, items: ['dragon_armor'] },
    dialogue: {
      intro: ['Alacakaranlık Efendisi\'ne karşı korunmaya ihtiyacın var.', 'Ejderha pullarından koruyucu zırh yapabilirim.'],
      complete: ['Bu zırh seni karanlık enerjiden koruyacak.', 'Ama daha güçlenmelisin...']
    }
  },
  {
    id: 'main_6', name: 'Orc Savaş Lordu', chainOrder: 6,
    npc: 'guard', prerequisiteQuests: ['main_5'],
    desc: 'Orc Savaş Lordu\'nu yen.',
    type: 'kill', target: 'orc_warlord', required: 1,
    rewards: { exp: 700, gold: 350, items: ['fire_sword'] },
    dialogue: {
      intro: ['Orclar da karanlık enerjinin etkisinde.', 'Savaş Lordlarını durdurmazsan köy tehlikede.'],
      complete: ['Cesur savaşçı! Artık zindan\'a girme vakti geldi.']
    }
  },
  {
    id: 'main_7', name: 'Zindanın Derinlikleri', chainOrder: 7,
    npc: 'elder', prerequisiteQuests: ['main_6'],
    desc: 'Zindanın 5. katına ulaş.',
    type: 'kill', target: 'dungeon_boss_5', required: 1,
    rewards: { exp: 1000, gold: 500, items: ['mythril_ore', 'mythril_ore', 'mythril_ore'] },
    dialogue: {
      intro: ['Alacakaranlık Efendisi zindanın derinliklerinde uyuyor.', 'Ona ulaşmak için katları geçmelisin.', '5. kata kadar in.'],
      complete: ['5. katı geçtin! Karanlık güçleniyor...', 'Son katata Efendi seni bekliyor.']
    }
  },
  {
    id: 'main_8', name: 'Labirent Muhafızı', chainOrder: 8,
    npc: 'elder', prerequisiteQuests: ['main_7'],
    desc: 'Labirent Muhafızı\'nı yen.',
    type: 'kill', target: 'labyrinth_guardian', required: 1,
    rewards: { exp: 1500, gold: 800, items: ['maze_ring', 'maze_amulet'] },
    dialogue: {
      intro: ['Labirentte eski bir muhafız var.', 'Onu yenersen, Efendi\'ye karşı kullanabileceğin güç kazanırsın.'],
      complete: ['Muhafızın gücünü aldın! Artık Efendi\'ye karşı hazırsın.']
    }
  },
  {
    id: 'main_9', name: 'Son Hazırlık', chainOrder: 9,
    npc: 'healer', prerequisiteQuests: ['main_8'],
    desc: '20 herb ve 10 crystal topla — son iksirler için.',
    type: 'gather', target: 'herb', required: 20,
    rewards: { exp: 1000, gold: 500, items: ['mega_health_potion', 'mega_health_potion', 'mega_mana_potion', 'mega_mana_potion'] },
    dialogue: {
      intro: ['Son savaş için hazırlanmalısın.', 'Güçlü iksirler yapacağım. Bana malzeme getir.'],
      complete: ['İşte iksirler. Artık Alacakaranlık Efendisi\'yle yüzleşme zamanı!']
    }
  },
  {
    id: 'main_10', name: 'Alacakaranlık Efendisi', chainOrder: 10,
    npc: 'elder', prerequisiteQuests: ['main_9'],
    desc: 'Zindanın 10. katında Alacakaranlık Efendisi\'ni yen!',
    type: 'kill', target: 'dungeon_boss_10', required: 1,
    rewards: { exp: 5000, gold: 3000, items: ['duskhollow_blade', 'duskhollow_armor', 'duskhollow_helm'] },
    dialogue: {
      intro: ['Bu son görev.', 'Zindanın en derin katında Alacakaranlık Efendisi seni bekliyor.', 'Tüm gücünle savaş, kahraman!'],
      complete: ['EFENDİ YENİLDİ!', 'Alacakaranlık Vadisi\'ni karanlıktan kurtardın!', 'Sen gerçek bir efsanesin, kahraman!']
    }
  }
];

/**
 * Ana hikaye görev erişilebilirlik kontrolü
 */
export function getAvailableStoryQuests() {
  const ps = PlayerState.getInstance();
  return STORY_QUESTS.filter(sq => {
    // Already completed?
    if (ps.completedQuests[sq.id]) return false;
    // Already active?
    if (ps.activeQuests[sq.id]) return true;
    // Prerequisites met?
    return sq.prerequisiteQuests.every(pq => ps.completedQuests[pq]);
  });
}

export function getStoryProgress() {
  const ps = PlayerState.getInstance();
  let completed = 0;
  STORY_QUESTS.forEach(sq => {
    if (ps.completedQuests[sq.id]) completed++;
  });
  return { completed, total: STORY_QUESTS.length };
}
