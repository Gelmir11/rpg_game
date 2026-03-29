// ===== OVERWORLD CANAVARLARI (Lv.1-30, köyden uzaklığa göre) =====
export const MONSTERS = {
  // Kademe 1: Lv.1-3 — Köy çevresi
  slime: {
    id: 'slime', name: 'Balçık',
    hp: 50, attack: 6, defense: 2, speed: 30,
    exp: 15, gold: 5, level: 2,
    color: '#32CD32', bodyColor: '#228B22',
    behavior: 'wander', aggroRange: 80
  },
  // Kademe 2: Lv.4-6 — Köyden biraz uzak
  wolf: {
    id: 'wolf', name: 'Kurt',
    hp: 150, attack: 18, defense: 8, speed: 70,
    exp: 35, gold: 14, level: 5,
    color: '#808080', bodyColor: '#606060',
    behavior: 'aggressive', aggroRange: 150
  },
  goblin: {
    id: 'goblin', name: 'Goblin',
    hp: 200, attack: 22, defense: 10, speed: 50,
    exp: 45, gold: 18, level: 6,
    color: '#3CB371', bodyColor: '#2E8B57',
    behavior: 'aggressive', aggroRange: 120
  },
  // Kademe 3: Lv.8-14 — Orta mesafe
  fungoid: {
    id: 'fungoid', name: 'Mantar Adam',
    hp: 400, attack: 35, defense: 18, speed: 30,
    exp: 70, gold: 30, level: 9,
    color: '#8B4513', bodyColor: '#6B3410',
    behavior: 'wander', aggroRange: 100
  },
  skeleton: {
    id: 'skeleton', name: 'İskelet',
    hp: 600, attack: 45, defense: 25, speed: 40,
    exp: 95, gold: 40, level: 12,
    color: '#F5F5DC', bodyColor: '#D2B48C',
    behavior: 'patrol', aggroRange: 100
  },
  orc: {
    id: 'orc', name: 'Ork',
    hp: 800, attack: 55, defense: 32, speed: 35,
    exp: 120, gold: 55, level: 14,
    color: '#556B2F', bodyColor: '#6B8E23',
    behavior: 'aggressive', aggroRange: 140
  },
  // Kademe 4: Lv.16-22 — Uzak bölgeler
  golem: {
    id: 'golem', name: 'Golem',
    hp: 1400, attack: 70, defense: 60, speed: 20,
    exp: 180, gold: 80, level: 18,
    color: '#8B8B83', bodyColor: '#6B6B63',
    behavior: 'patrol', aggroRange: 90
  },
  wraith: {
    id: 'wraith', name: 'Hayalet',
    hp: 900, attack: 85, defense: 20, speed: 55,
    exp: 200, gold: 90, level: 20,
    color: '#9370DB', bodyColor: '#6A5ACD',
    behavior: 'aggressive', aggroRange: 160
  },
  fire_elemental: {
    id: 'fire_elemental', name: 'Ateş Elemental',
    hp: 1200, attack: 95, defense: 35, speed: 50,
    exp: 240, gold: 105, level: 22,
    color: '#FF4500', bodyColor: '#CC3300',
    behavior: 'aggressive', aggroRange: 150
  },
  // Kademe 5: Lv.26-30 — En uzak (sağ alt)
  drake: {
    id: 'drake', name: 'Ejder Yavrusu',
    hp: 2000, attack: 120, defense: 55, speed: 40,
    exp: 350, gold: 150, level: 27,
    color: '#CC3300', bodyColor: '#991100',
    behavior: 'aggressive', aggroRange: 160
  },
  dragon: {
    id: 'dragon', name: 'Ejder',
    hp: 3500, attack: 150, defense: 80, speed: 25,
    exp: 500, gold: 220, level: 30,
    color: '#8B0000', bodyColor: '#B22222',
    behavior: 'boss', aggroRange: 200
  },
  // Bölge Boss: Ejder Anası
  drake_mother: {
    id: 'drake_mother', name: 'Ejder Anası',
    hp: 8000, attack: 180, defense: 90, speed: 32,
    exp: 800, gold: 400, level: 32,
    color: '#AA0000', bodyColor: '#770000',
    behavior: 'boss', aggroRange: 220, isZoneBoss: true
  },

  // ===== OVERWORLD BOSS =====
  ancient_dragon: {
    id: 'ancient_dragon', name: 'Kadim Ejder',
    hp: 25000, attack: 350, defense: 200, speed: 35,
    exp: 5000, gold: 2500, level: 40,
    color: '#4B0082', bodyColor: '#6A0DAD',
    behavior: 'boss', aggroRange: 300, isBoss: true
  },

  // ===== BÖLGE BOSSLARI (respawn: 60sn) =====
  slime_king: {
    id: 'slime_king', name: 'Balçık Kralı',
    hp: 500, attack: 20, defense: 10, speed: 25,
    exp: 80, gold: 40, level: 5,
    color: '#00FF00', bodyColor: '#008800',
    behavior: 'boss', aggroRange: 180, isZoneBoss: true
  },
  alpha_wolf: {
    id: 'alpha_wolf', name: 'Alfa Kurt',
    hp: 800, attack: 40, defense: 18, speed: 90,
    exp: 150, gold: 65, level: 8,
    color: '#505050', bodyColor: '#303030',
    behavior: 'boss', aggroRange: 200, isZoneBoss: true
  },
  goblin_chief: {
    id: 'goblin_chief', name: 'Goblin Şefi',
    hp: 1200, attack: 50, defense: 24, speed: 55,
    exp: 200, gold: 90, level: 10,
    color: '#228B22', bodyColor: '#006400',
    behavior: 'boss', aggroRange: 180, isZoneBoss: true
  },
  fungoid_king: {
    id: 'fungoid_king', name: 'Mantar Kralı',
    hp: 2000, attack: 70, defense: 35, speed: 28,
    exp: 300, gold: 130, level: 13,
    color: '#A0522D', bodyColor: '#8B4513',
    behavior: 'boss', aggroRange: 180, isZoneBoss: true
  },
  skeleton_lord: {
    id: 'skeleton_lord', name: 'İskelet Lordu',
    hp: 3000, attack: 90, defense: 50, speed: 42,
    exp: 400, gold: 180, level: 16,
    color: '#FFFFF0', bodyColor: '#B0B090',
    behavior: 'boss', aggroRange: 180, isZoneBoss: true
  },
  orc_warlord: {
    id: 'orc_warlord', name: 'Ork Savaş Lordu',
    hp: 4000, attack: 110, defense: 60, speed: 38,
    exp: 500, gold: 230, level: 18,
    color: '#4A6A0A', bodyColor: '#3A5A00',
    behavior: 'boss', aggroRange: 200, isZoneBoss: true
  },
  crystal_golem: {
    id: 'crystal_golem', name: 'Kristal Golem',
    hp: 5500, attack: 130, defense: 90, speed: 18,
    exp: 650, gold: 300, level: 22,
    color: '#00BFFF', bodyColor: '#0080AA',
    behavior: 'boss', aggroRange: 160, isZoneBoss: true
  },
  wraith_queen: {
    id: 'wraith_queen', name: 'Hayalet Kraliçe',
    hp: 4500, attack: 150, defense: 40, speed: 60,
    exp: 700, gold: 320, level: 24,
    color: '#BA55D3', bodyColor: '#8B008B',
    behavior: 'boss', aggroRange: 220, isZoneBoss: true
  },
  fire_lord: {
    id: 'fire_lord', name: 'Ateş Lordu',
    hp: 6000, attack: 160, defense: 55, speed: 48,
    exp: 750, gold: 350, level: 26,
    color: '#FF6600', bodyColor: '#CC4400',
    behavior: 'boss', aggroRange: 200, isZoneBoss: true
  },

  // ===== LABİRENT CANAVARLARI (Lv.40-60) =====
  minotaur: {
    id: 'minotaur', name: 'Minotaur',
    hp: 8500, attack: 280, defense: 160, speed: 50,
    exp: 850, gold: 320, level: 50,
    color: '#8B4513', bodyColor: '#654321',
    behavior: 'aggressive', aggroRange: 130
  },
  shadow_spider: {
    id: 'shadow_spider', name: 'Gölge Örümcek',
    hp: 5800, attack: 220, defense: 90, speed: 75,
    exp: 600, gold: 240, level: 40,
    color: '#2F1B3D', bodyColor: '#1A0A2A',
    behavior: 'aggressive', aggroRange: 120
  },
  cursed_knight: {
    id: 'cursed_knight', name: 'Lanetli Şövalye',
    hp: 10000, attack: 320, defense: 220, speed: 40,
    exp: 1000, gold: 400, level: 55,
    color: '#2C2C4A', bodyColor: '#1A1A3A',
    behavior: 'patrol', aggroRange: 110
  },
  maze_phantom: {
    id: 'maze_phantom', name: 'Labirent Hayaleti',
    hp: 6500, attack: 260, defense: 60, speed: 70,
    exp: 700, gold: 280, level: 45,
    color: '#7B68EE', bodyColor: '#483D8B',
    behavior: 'aggressive', aggroRange: 150
  },
  // Labyrinth Boss (Lv.60)
  labyrinth_guardian: {
    id: 'labyrinth_guardian', name: 'Labirent Muhafızı',
    hp: 35000, attack: 420, defense: 280, speed: 35,
    exp: 5000, gold: 2500, level: 60,
    color: '#DAA520', bodyColor: '#B8860B',
    behavior: 'boss', aggroRange: 220, isBoss: true
  },

  // ===== ZİNDAN CANAVARLARI (Lv.60-80, kata göre +%20) =====
  fire_imp: {
    id: 'fire_imp', name: 'Ateş Cini',
    hp: 9000, attack: 300, defense: 120, speed: 60,
    exp: 900, gold: 350, level: 60,
    color: '#FF4500', bodyColor: '#FF6347',
    behavior: 'aggressive', aggroRange: 110
  },
  dark_bat: {
    id: 'dark_bat', name: 'Karanlık Yarasa',
    hp: 7500, attack: 270, defense: 80, speed: 85,
    exp: 750, gold: 280, level: 60,
    color: '#1C1C1C', bodyColor: '#2A2A2A',
    behavior: 'aggressive', aggroRange: 130
  },
  cave_troll: {
    id: 'cave_troll', name: 'Mağara Trollü',
    hp: 14000, attack: 380, defense: 260, speed: 25,
    exp: 1200, gold: 500, level: 65,
    color: '#4A6A4A', bodyColor: '#3A5A3A',
    behavior: 'patrol', aggroRange: 100
  },
  lava_golem: {
    id: 'lava_golem', name: 'Lav Golemi',
    hp: 18000, attack: 420, defense: 320, speed: 20,
    exp: 1500, gold: 600, level: 70,
    color: '#FF4500', bodyColor: '#CC3700',
    behavior: 'patrol', aggroRange: 100
  },
  shadow_demon: {
    id: 'shadow_demon', name: 'Gölge Şeytanı',
    hp: 13000, attack: 460, defense: 150, speed: 55,
    exp: 1400, gold: 550, level: 72,
    color: '#2A0A3A', bodyColor: '#1A0020',
    behavior: 'aggressive', aggroRange: 160
  },
  bone_dragon: {
    id: 'bone_dragon', name: 'Kemik Ejder',
    hp: 22000, attack: 520, defense: 280, speed: 32,
    exp: 2000, gold: 800, level: 76,
    color: '#E8E8D0', bodyColor: '#C8C8A0',
    behavior: 'aggressive', aggroRange: 180
  },
  abyssal_fiend: {
    id: 'abyssal_fiend', name: 'Uçurum İblisi',
    hp: 20000, attack: 550, defense: 240, speed: 45,
    exp: 2200, gold: 900, level: 78,
    color: '#4A0028', bodyColor: '#2A0018',
    behavior: 'aggressive', aggroRange: 170
  },

  // Dungeon Floor Bosses (Lv.60-80, her kat +%20 güçlü)
  dungeon_boss_1: {
    id: 'dungeon_boss_1', name: 'Yarasa Kralı',
    hp: 20000, attack: 350, defense: 180, speed: 45,
    exp: 2000, gold: 800, level: 60,
    color: '#1C1C3C', bodyColor: '#2A2A4A',
    behavior: 'boss', aggroRange: 200, isBoss: true
  },
  dungeon_boss_2: {
    id: 'dungeon_boss_2', name: 'Cin Lordu',
    hp: 24000, attack: 420, defense: 216, speed: 50,
    exp: 2400, gold: 960, level: 62,
    color: '#FF6600', bodyColor: '#CC4400',
    behavior: 'boss', aggroRange: 200, isBoss: true
  },
  dungeon_boss_3: {
    id: 'dungeon_boss_3', name: 'Trol Şefi',
    hp: 28800, attack: 504, defense: 259, speed: 30,
    exp: 2880, gold: 1152, level: 64,
    color: '#3A7A3A', bodyColor: '#2A5A2A',
    behavior: 'boss', aggroRange: 200, isBoss: true
  },
  dungeon_boss_4: {
    id: 'dungeon_boss_4', name: 'Lav Titanı',
    hp: 34500, attack: 605, defense: 311, speed: 25,
    exp: 3456, gold: 1382, level: 66,
    color: '#FF3300', bodyColor: '#CC2200',
    behavior: 'boss', aggroRange: 220, isBoss: true
  },
  dungeon_boss_5: {
    id: 'dungeon_boss_5', name: 'Gölge Prensi',
    hp: 41400, attack: 726, defense: 373, speed: 55,
    exp: 4147, gold: 1659, level: 68,
    color: '#3A0A5A', bodyColor: '#200040',
    behavior: 'boss', aggroRange: 220, isBoss: true
  },
  dungeon_boss_6: {
    id: 'dungeon_boss_6', name: 'Kristal Behemot',
    hp: 49700, attack: 871, defense: 448, speed: 28,
    exp: 4977, gold: 1991, level: 70,
    color: '#00BFFF', bodyColor: '#0090CC',
    behavior: 'boss', aggroRange: 220, isBoss: true
  },
  dungeon_boss_7: {
    id: 'dungeon_boss_7', name: 'Kemik Ejder Lordu',
    hp: 59600, attack: 1045, defense: 537, speed: 34,
    exp: 5972, gold: 2389, level: 73,
    color: '#D8D8B0', bodyColor: '#A8A880',
    behavior: 'boss', aggroRange: 240, isBoss: true
  },
  dungeon_boss_8: {
    id: 'dungeon_boss_8', name: 'Uçurum Kralı',
    hp: 71500, attack: 1254, defense: 645, speed: 48,
    exp: 7167, gold: 2867, level: 75,
    color: '#5A0030', bodyColor: '#3A0020',
    behavior: 'boss', aggroRange: 240, isBoss: true
  },
  dungeon_boss_9: {
    id: 'dungeon_boss_9', name: 'Cehennem Kapıcısı',
    hp: 85800, attack: 1505, defense: 774, speed: 40,
    exp: 8600, gold: 3440, level: 78,
    color: '#8B0000', bodyColor: '#5A0000',
    behavior: 'boss', aggroRange: 250, isBoss: true
  },
  dungeon_boss_10: {
    id: 'dungeon_boss_10', name: 'Alacakaranlık Efendisi',
    hp: 250000, attack: 2500, defense: 1200, speed: 45,
    exp: 50000, gold: 25000, level: 80,
    color: '#2A0A4A', bodyColor: '#1A0030',
    behavior: 'boss', aggroRange: 400, isBoss: true
  }
};

// Dungeon kat bazlı canavar havuzu
export const DUNGEON_FLOOR_MONSTERS = {
  1: { normal: ['fire_imp', 'dark_bat'], boss: 'dungeon_boss_1' },
  2: { normal: ['fire_imp', 'dark_bat', 'fire_imp'], boss: 'dungeon_boss_2' },
  3: { normal: ['fire_imp', 'cave_troll', 'dark_bat'], boss: 'dungeon_boss_3' },
  4: { normal: ['cave_troll', 'dark_bat', 'lava_golem'], boss: 'dungeon_boss_4' },
  5: { normal: ['cave_troll', 'lava_golem', 'shadow_demon'], boss: 'dungeon_boss_5' },
  6: { normal: ['lava_golem', 'shadow_demon', 'cave_troll'], boss: 'dungeon_boss_6' },
  7: { normal: ['shadow_demon', 'bone_dragon', 'lava_golem'], boss: 'dungeon_boss_7' },
  8: { normal: ['bone_dragon', 'abyssal_fiend', 'shadow_demon'], boss: 'dungeon_boss_8' },
  9: { normal: ['abyssal_fiend', 'bone_dragon', 'shadow_demon'], boss: 'dungeon_boss_9' },
  10: { normal: ['abyssal_fiend', 'bone_dragon', 'abyssal_fiend'], boss: 'dungeon_boss_10' }
};

// Labyrinth canavar havuzu
export const LABYRINTH_MONSTERS = [
  'minotaur', 'minotaur', 'minotaur',
  'shadow_spider', 'shadow_spider', 'shadow_spider', 'shadow_spider',
  'cursed_knight', 'cursed_knight', 'cursed_knight',
  'maze_phantom', 'maze_phantom', 'maze_phantom', 'maze_phantom'
];
