export const QUESTS = {
  q1_kill_slimes: {
    id: 'q1_kill_slimes', name: 'Balçık Temizliği',
    desc: 'Köyün etrafındaki 5 balçığı temizle.',
    npc: 'elder', minLevel: 1,
    type: 'kill', target: 'slime', required: 5,
    rewards: { exp: 50, gold: 20, items: ['health_potion'] }
  },
  q2_gather_herbs: {
    id: 'q2_gather_herbs', name: 'Şifalı Otlar',
    desc: '3 adet şifalı ot topla.',
    npc: 'healer', minLevel: 1,
    type: 'gather', target: 'herb', required: 3,
    rewards: { exp: 30, gold: 15, items: ['big_health_potion'] }
  },
  q3_kill_goblins: {
    id: 'q3_kill_goblins', name: 'Goblin Tehdidi',
    desc: '8 goblin öldür.',
    npc: 'guard', minLevel: 2,
    type: 'kill', target: 'goblin', required: 8,
    rewards: { exp: 100, gold: 50, items: ['iron_sword'] }
  },
  q4_gather_wood: {
    id: 'q4_gather_wood', name: 'Odun Toplama',
    desc: '10 odun topla.',
    npc: 'elder', minLevel: 2,
    type: 'gather', target: 'wood', required: 10,
    rewards: { exp: 60, gold: 30, items: ['leather_armor'] }
  },
  q5_dungeon_skeletons: {
    id: 'q5_dungeon_skeletons', name: 'Zindan Temizliği',
    desc: 'Zindanda 5 iskelet yok et.',
    npc: 'guard', minLevel: 4,
    type: 'kill', target: 'skeleton', required: 5,
    rewards: { exp: 200, gold: 80, items: ['steel_sword'] }
  },
  q6_crystal_hunt: {
    id: 'q6_crystal_hunt', name: 'Kristal Avı',
    desc: '3 kristal bul ve getir.',
    npc: 'healer', minLevel: 5,
    type: 'gather', target: 'crystal', required: 3,
    rewards: { exp: 250, gold: 100, items: ['ring_strength'] }
  },
  q7_orc_war: {
    id: 'q7_orc_war', name: 'Ork Savaşı',
    desc: '5 ork yenilgiye uğrat.',
    npc: 'guard', minLevel: 6,
    type: 'kill', target: 'orc', required: 5,
    rewards: { exp: 400, gold: 150, items: ['steel_armor'] }
  },
  q8_dragon_slayer: {
    id: 'q8_dragon_slayer', name: 'Ejder Avcısı',
    desc: 'Ejderi öldür!',
    npc: 'elder', minLevel: 8,
    type: 'kill', target: 'dragon', required: 1,
    rewards: { exp: 1000, gold: 500, items: ['dragon_armor', 'fire_sword'] }
  },
  // Muhafız yeni görevler
  q9_wolf_hunt: {
    id: 'q9_wolf_hunt', name: 'Kurt Avı',
    desc: '10 kurt öldür. Kurt Ormanı tehlikeli!',
    npc: 'guard', minLevel: 2,
    type: 'kill', target: 'wolf', required: 10,
    rewards: { exp: 80, gold: 40, items: ['leather_helm', 'leather_gloves'] }
  },
  q10_guard_patrol: {
    id: 'q10_guard_patrol', name: 'Devriye Görevi',
    desc: '15 goblin ve 5 kurt temizle.',
    npc: 'guard', minLevel: 3,
    type: 'kill', target: 'goblin', required: 15,
    rewards: { exp: 150, gold: 70, items: ['iron_armor'] }
  },
  q11_golem_threat: {
    id: 'q11_golem_threat', name: 'Golem Tehdidi',
    desc: '5 golemi yok et.',
    npc: 'guard', minLevel: 6,
    type: 'kill', target: 'golem', required: 5,
    rewards: { exp: 350, gold: 120, items: ['steel_helm', 'steel_pants'] }
  },
  q12_wraith_purge: {
    id: 'q12_wraith_purge', name: 'Hayalet Temizliği',
    desc: '8 hayaleti yok et.',
    npc: 'guard', minLevel: 8,
    type: 'kill', target: 'wraith', required: 8,
    rewards: { exp: 500, gold: 200, items: ['shadow_staff', 'amulet_hp'] }
  },
  q13_elite_guard: {
    id: 'q13_elite_guard', name: 'Elit Muhafız',
    desc: '10 ork ve 5 golem yok et.',
    npc: 'guard', minLevel: 9,
    type: 'kill', target: 'orc', required: 10,
    rewards: { exp: 600, gold: 300, items: ['steel_armor', 'steel_gloves', 'steel_belt'] }
  },
  // Şifacı yeni görevler
  q14_healing_herbs: {
    id: 'q14_healing_herbs', name: 'İyileştirme Otları',
    desc: '10 şifalı ot topla.',
    npc: 'healer', minLevel: 2,
    type: 'gather', target: 'herb', required: 10,
    rewards: { exp: 70, gold: 30, items: ['mana_potion', 'mana_potion', 'mana_potion'] }
  },
  q15_stone_medicine: {
    id: 'q15_stone_medicine', name: 'Taş İlacı',
    desc: '15 taş topla.',
    npc: 'healer', minLevel: 3,
    type: 'gather', target: 'stone', required: 15,
    rewards: { exp: 100, gold: 40, items: ['big_health_potion', 'big_mana_potion'] }
  },
  q16_crystal_power: {
    id: 'q16_crystal_power', name: 'Kristal Gücü',
    desc: '5 kristal topla.',
    npc: 'healer', minLevel: 6,
    type: 'gather', target: 'crystal', required: 5,
    rewards: { exp: 300, gold: 150, items: ['crystal_staff'] }
  },
  q17_dragon_scales: {
    id: 'q17_dragon_scales', name: 'Ejder Pulları',
    desc: '3 ejder pulu topla.',
    npc: 'healer', minLevel: 8,
    type: 'gather', target: 'dragon_scale', required: 3,
    rewards: { exp: 500, gold: 250, items: ['dragon_helm', 'ring_defense'] }
  },
  q18_monster_fangs: {
    id: 'q18_monster_fangs', name: 'Canavar Dişleri',
    desc: '20 canavar dişi topla.',
    npc: 'healer', minLevel: 4,
    type: 'gather', target: 'monster_fang', required: 20,
    rewards: { exp: 200, gold: 80, items: ['iron_helm', 'iron_pants', 'iron_gloves'] }
  },
  q19_ultimate_healer: {
    id: 'q19_ultimate_healer', name: 'Usta Şifacı',
    desc: '10 kristal ve 5 ejder pulu topla.',
    npc: 'healer', minLevel: 10,
    type: 'gather', target: 'crystal', required: 10,
    rewards: { exp: 800, gold: 400, items: ['dragon_armor', 'dragon_pants', 'dragon_gloves'] }
  },

  // ===== ZİNDAN NPC GÖREVLERİ =====
  q20_dungeon_bats: {
    id: 'q20_dungeon_bats', name: 'Yarasa Temizliği',
    desc: 'Zindandaki 8 karanlık yarasayı yok et.',
    npc: 'dungeon_keeper', minLevel: 3,
    type: 'kill', target: 'dark_bat', required: 8,
    rewards: { exp: 120, gold: 50, items: ['iron_sword', 'health_potion'] }
  },
  q21_dungeon_imps: {
    id: 'q21_dungeon_imps', name: 'Ateş Cinleri',
    desc: '10 ateş cinini temizle.',
    npc: 'dungeon_keeper', minLevel: 4,
    type: 'kill', target: 'fire_imp', required: 10,
    rewards: { exp: 200, gold: 80, items: ['crystal_staff', 'big_mana_potion'] }
  },
  q22_dungeon_trolls: {
    id: 'q22_dungeon_trolls', name: 'Trol Avı',
    desc: '5 mağara trollünü yok et.',
    npc: 'dungeon_keeper', minLevel: 6,
    type: 'kill', target: 'cave_troll', required: 5,
    rewards: { exp: 350, gold: 150, items: ['steel_armor', 'steel_helm'] }
  },
  q23_dungeon_demons: {
    id: 'q23_dungeon_demons', name: 'Karanlık Güçler',
    desc: '8 gölge şeytanını yok et.',
    npc: 'dungeon_keeper', minLevel: 8,
    type: 'kill', target: 'shadow_demon', required: 8,
    rewards: { exp: 600, gold: 300, items: ['shadow_staff', 'shadow_bow'] }
  },
  q24_dungeon_deep: {
    id: 'q24_dungeon_deep', name: 'Derinlerin Efendisi',
    desc: 'Zindanın 10. katına ulaş ve Alacakaranlık Efendisini yok et.',
    npc: 'dungeon_keeper', minLevel: 12,
    type: 'kill', target: 'dungeon_boss_10', required: 1,
    rewards: { exp: 2000, gold: 1000, items: ['fire_sword', 'dragon_armor', 'dragon_helm'] }
  },

  // ===== LABİRENT NPC GÖREVLERİ =====
  q25_lab_spiders: {
    id: 'q25_lab_spiders', name: 'Örümcek Ağları',
    desc: 'Labirentteki 10 gölge örümceği temizle.',
    npc: 'labyrinth_sage', minLevel: 4,
    type: 'kill', target: 'shadow_spider', required: 10,
    rewards: { exp: 150, gold: 60, items: ['iron_armor', 'health_potion'] }
  },
  q26_lab_minotaurs: {
    id: 'q26_lab_minotaurs', name: 'Minotaur Tehdidi',
    desc: '5 minotauru yok et.',
    npc: 'labyrinth_sage', minLevel: 5,
    type: 'kill', target: 'minotaur', required: 5,
    rewards: { exp: 250, gold: 100, items: ['steel_sword', 'iron_helm'] }
  },
  q27_lab_knights: {
    id: 'q27_lab_knights', name: 'Lanetli Ordu',
    desc: '6 lanetli şövalyeyi arındır.',
    npc: 'labyrinth_sage', minLevel: 6,
    type: 'kill', target: 'cursed_knight', required: 6,
    rewards: { exp: 400, gold: 200, items: ['steel_armor', 'steel_gloves', 'ring_defense'] }
  },
  q28_lab_guardian: {
    id: 'q28_lab_guardian', name: 'Muhafızın Sonu',
    desc: 'Labirent Muhafızını yok et.',
    npc: 'labyrinth_sage', minLevel: 7,
    type: 'kill', target: 'labyrinth_guardian', required: 1,
    rewards: { exp: 800, gold: 400, items: ['fire_sword', 'steel_armor', 'amulet_hp'] }
  }
};

export const NPCS = {
  elder: {
    id: 'elder', name: 'Köy Büyüğü',
    color: '#DAA520', robeColor: '#8B6914',
    dialogue: {
      greeting: 'Hoş geldin, genç kahraman! Köyümüzün yardımına ihtiyacı var.',
      noQuest: 'Şu an sana verecek görevim yok. Biraz daha güçlen.',
      questComplete: 'Harika iş çıkardın! İşte ödülün.',
    }
  },
  healer: {
    id: 'healer', name: 'Şifacı',
    color: '#F0F0F0', robeColor: '#4169E1',
    dialogue: {
      greeting: 'Merhaba! Seni iyileştirebilirim ya da bir görev verebilirim.',
      noQuest: 'Şimdilik bir görevim yok. Ama canını iyileştirebilirim.',
      questComplete: 'Teşekkürler! Bu otlar çok işe yarayacak.',
    },
    canHeal: true
  },
  guard: {
    id: 'guard', name: 'Muhafız',
    color: '#808080', robeColor: '#4A4A4A',
    dialogue: {
      greeting: 'Dur, yolcu! Bu bölgede tehlikeli yaratıklar var. Yardımına ihtiyacımız var.',
      noQuest: 'Şu an görevim yok. Dikkatli ol dışarıda.',
      questComplete: 'Aferin asker! Köy sana borçlu.',
    }
  },
  shopkeeper: {
    id: 'shopkeeper', name: 'Tüccar',
    color: '#DEB887', robeColor: '#8B4513',
    dialogue: {
      greeting: 'Hoş geldin! Alışveriş yapmak ister misin?',
    },
    isShop: true,
    stock: ['health_potion', 'big_health_potion', 'mega_health_potion',
            'mana_potion', 'big_mana_potion', 'mega_mana_potion',
            'strength_potion', 'defense_potion',
            'wooden_sword', 'iron_sword', 'steel_sword',
            'wooden_bow', 'hunter_bow', 'shadow_bow',
            'wooden_staff', 'crystal_staff', 'shadow_staff',
            'leather_armor', 'iron_armor', 'steel_armor',
            'leather_helm', 'iron_helm', 'steel_helm',
            'leather_pants', 'iron_pants', 'steel_pants',
            'leather_gloves', 'iron_gloves', 'steel_gloves',
            'leather_belt', 'iron_belt', 'steel_belt',
            'ring_strength', 'ring_defense', 'amulet_hp']
  },

  // ===== ZİNDAN NPC =====
  dungeon_keeper: {
    id: 'dungeon_keeper', name: 'Zindan Bekçisi',
    color: '#CC4400', robeColor: '#8B2500',
    dialogue: {
      greeting: 'Dur, cesur savaşçı! Bu zindan 10 kat derinliğe iner. Her katta daha güçlü yaratıklar bekliyor.',
      noQuest: 'Şu an görevim yok. Ama dikkatli ol, aşağıda korkunç şeyler var.',
      questComplete: 'Müthiş! Zindanın derinliklerinde adını duyuracaksın.',
    }
  },

  // ===== LABİRENT NPC =====
  labyrinth_sage: {
    id: 'labyrinth_sage', name: 'Labirent Bilgesi',
    color: '#7B68EE', robeColor: '#483D8B',
    dialogue: {
      greeting: 'Hoş geldin, yolcu. Bu labirent kadim zamanlardan kalma. İçeride minotaurlar ve lanetli ruhlar dolaşıyor.',
      noQuest: 'Şu an sana verecek görevim yok. Labirentte dikkatli ol.',
      questComplete: 'Aferin! Labirentin sırları sana açılıyor.',
    }
  }
};
