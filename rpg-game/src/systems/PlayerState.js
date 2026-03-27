// Altın formatlama: 1, 10, 100, 1K, 10K, 100K, 1G, 10G, 100G
export function formatGold(amount) {
  if (amount < 1000) return `${amount}`;
  if (amount < 1000000) return `${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}K`;
  return `${(amount / 1000000).toFixed(amount % 1000000 === 0 ? 0 : 1)}G`;
}

// Sınıf tanımları
export const CLASS_DEFINITIONS = {
  warrior: {
    id: 'warrior',
    displayName: 'Savaşçı',
    description: 'Güçlü yakın dövüş savaşçısı. Yüksek HP ve saldırı gücü.',
    baseStats: { maxHp: 120, maxMana: 20, baseAttack: 12, baseDefense: 8, speed: 140 },
    growth: { maxHp: 10, maxMana: 2, baseAttack: 2, baseDefense: 1 },
    startWeapon: 'wooden_sword',
    color: '#e74c3c'
  },
  archer: {
    id: 'archer',
    displayName: 'Okçu',
    description: 'Çevik menzilli savaşçı. Dengeli saldırı ve savunma.',
    baseStats: { maxHp: 100, maxMana: 30, baseAttack: 10, baseDefense: 6, speed: 160 },
    growth: { maxHp: 7, maxMana: 3, baseAttack: 1.5, baseDefense: 1.5 },
    startWeapon: 'wooden_bow',
    color: '#27ae60'
  },
  mage: {
    id: 'mage',
    displayName: 'Büyücü',
    description: 'Güçlü büyü ustası. Yüksek mana ve büyü hasarı.',
    baseStats: { maxHp: 80, maxMana: 60, baseAttack: 8, baseDefense: 5, speed: 130 },
    growth: { maxHp: 5, maxMana: 6, baseAttack: 1, baseDefense: 1 },
    startWeapon: 'wooden_staff',
    color: '#8e44ad'
  }
};

// Global oyuncu durumu - tüm sahneler arasında paylaşılır
export class PlayerState {
  static instance = null;
  static activeSlot = 0;

  static getInstance() {
    if (!PlayerState.instance) {
      PlayerState.instance = new PlayerState();
    }
    return PlayerState.instance;
  }

  constructor() {
    this.reset();
  }

  reset() {
    // Cinsiyet, isim ve sınıf
    this.gender = this.gender || 'male';
    this.playerName = this.playerName || 'Kahraman';
    this.playerClass = this.playerClass || 'warrior';

    // Sınıfa göre temel statlar
    const classDef = CLASS_DEFINITIONS[this.playerClass] || CLASS_DEFINITIONS.warrior;

    // Temel statlar
    this.level = 1;
    this.exp = 0;
    this.gold = 50;

    // HP
    this.maxHp = classDef.baseStats.maxHp;
    this.hp = this.maxHp;

    // Mana
    this.maxMana = classDef.baseStats.maxMana;
    this.mana = this.maxMana;

    // Savaş statları
    this.baseAttack = classDef.baseStats.baseAttack;
    this.baseDefense = classDef.baseStats.baseDefense;
    this.speed = classDef.baseStats.speed;

    // Ekipman (9 slot)
    this.equipped = {
      head: null,
      chest: null,
      legs: null,
      arms: null,
      weapon: null,
      necklace: null,
      earring: null,
      belt: null,
      ring: null
    };

    // Envanter (max 100 slot)
    this.inventory = [];
    this.maxInventory = 100;
    // Grid pozisyonları: [{ entry, col, row }] — item'ların envanterdeki sabit yerleri
    this.inventoryGrid = this.inventoryGrid || [];

    // Ev deposu (max 500 slot)
    this.storage = [];
    this.maxStorage = 500;
    // Depo grid pozisyonları
    this.storageGrid = this.storageGrid || [];

    // Aktif bufflar
    this.buffs = [];

    // Quest ilerlemesi
    this.activeQuests = {};    // questId -> { progress: 0 }
    this.completedQuests = {}; // questId -> true

    // Kill/gather sayaçları
    this.killCounts = {};
    this.gatherCounts = {};

    // Enhanced item bonus verileri: { uid: { attack, defense, maxHp, maxMana } }
    this.itemBonuses = this.itemBonuses || {};
    this._uidCounter = this._uidCounter || 0;

    // Boss öldürme takibi (haritalar arası geçiş kilidi)
    this.bossKills = this.bossKills || {};
    // Zindan kat ilerlemesi (en yüksek ulaşılan kat)
    this.dungeonFloor = this.dungeonFloor || 1;
    this.maxDungeonFloor = this.maxDungeonFloor || 1;

    // Konum
    this.lastScene = 'OverworldScene';
    this.lastX = 400;
    this.lastY = 300;

    // Fog of war keşif verisi (kalıcı)
    this.fogData = this.fogData || [];

    // Başlangıç ekipmanı (sınıfa göre)
    this.addItem(classDef.startWeapon);
    this.addItem('health_potion');
    this.addItem('health_potion');
    this.addItem('health_potion');
    this.addItem('mana_potion');
    this.addItem('mana_potion');
  }

  // EXP tablosu
  getExpForLevel(level) {
    return Math.floor(50 * Math.pow(level, 1.8));
  }

  getExpToNext() {
    return this.getExpForLevel(this.level + 1) - this.exp;
  }

  // Seviye bazlı EXP çarpanı: lv1-5 = 3x, lv6-10 = 2x, lv11-15 = 1.5x, lv16+ = 1x
  getExpMultiplier() {
    if (this.level <= 5) return 3.0;
    if (this.level <= 10) return 2.0;
    if (this.level <= 15) return 1.5;
    if (this.level <= 20) return 1.2;
    return 1.0;
  }

  addExp(amount) {
    const scaledAmount = Math.floor(amount * this.getExpMultiplier());
    this.exp += scaledAmount;
    let leveledUp = false;
    const growth = (CLASS_DEFINITIONS[this.playerClass] || CLASS_DEFINITIONS.warrior).growth;
    while (this.exp >= this.getExpForLevel(this.level + 1)) {
      this.level++;
      this.maxHp += growth.maxHp;
      this.hp = this.getMaxHp();
      this.maxMana += growth.maxMana;
      this.mana = this.getMaxMana();
      this.baseAttack += growth.baseAttack;
      this.baseDefense += growth.baseDefense;
      leveledUp = true;
    }
    return leveledUp;
  }

  // Toplam saldırı (baz + ekipman + ekipman bonusu + buff)
  getAttack() {
    let atk = this.baseAttack;
    Object.values(this.equipped).forEach(eq => {
      if (eq) {
        atk += eq.attack || 0;
        if (eq._bonuses) atk += eq._bonuses.attack || 0;
      }
    });
    this.buffs.forEach(b => { if (b.attack) atk += b.attack; });
    return atk;
  }

  getDefense() {
    let def = this.baseDefense;
    Object.values(this.equipped).forEach(eq => {
      if (eq) {
        def += eq.defense || 0;
        if (eq._bonuses) def += eq._bonuses.defense || 0;
      }
    });
    this.buffs.forEach(b => { if (b.defense) def += b.defense; });
    return def;
  }

  getMaxHp() {
    let hp = this.maxHp;
    Object.values(this.equipped).forEach(eq => {
      if (eq) {
        if (eq.maxHp) hp += eq.maxHp;
        if (eq._bonuses && eq._bonuses.maxHp) hp += eq._bonuses.maxHp;
      }
    });
    return hp;
  }

  heal(amount) {
    this.hp = Math.min(this.hp + amount, this.getMaxHp());
  }

  getMaxMana() {
    let mp = this.maxMana;
    Object.values(this.equipped).forEach(eq => {
      if (eq) {
        if (eq.maxMana) mp += eq.maxMana;
        if (eq._bonuses && eq._bonuses.maxMana) mp += eq._bonuses.maxMana;
      }
    });
    return mp;
  }

  restoreMana(amount) {
    this.mana = Math.min(this.mana + amount, this.getMaxMana());
  }

  useMana(amount) {
    if (this.mana < amount) return false;
    this.mana -= amount;
    return true;
  }

  takeDamage(rawDamage) {
    const damage = Math.max(1, rawDamage - this.getDefense());
    this.hp -= damage;
    if (this.hp < 0) this.hp = 0;
    return damage;
  }

  isDead() {
    return this.hp <= 0;
  }

  // ===== ENHANCED ITEM SİSTEMİ =====
  // Item ID'den base ID çıkar: 'iron_sword:e3' → 'iron_sword', 'iron_sword' → 'iron_sword'
  getBaseItemId(entry) {
    if (typeof entry === 'string') return entry.split(':')[0];
    return entry;
  }

  // Item enhanced mı kontrol et
  isEnhanced(entry) {
    return typeof entry === 'string' && entry.includes(':');
  }

  // Enhanced item'ın UID'sini al
  getItemUid(entry) {
    if (typeof entry === 'string' && entry.includes(':')) return entry.split(':')[1];
    return null;
  }

  // Enhanced item'ın bonus statlarını al
  getItemBonuses(entry) {
    const uid = this.getItemUid(entry);
    if (uid && this.itemBonuses[uid]) return this.itemBonuses[uid];
    return null;
  }

  // Rastgele bonus stat oluştur (silah, zırh, aksesuar için)
  // %20 şans ile enhanced item düşer
  rollEnhancement(baseItemId) {
    // Sadece ekipman itemleri enhanced olabilir (potion, material hariç)
    const stackable = baseItemId.includes('potion') || baseItemId === 'wood' || baseItemId === 'herb' ||
                      baseItemId === 'stone' || baseItemId === 'crystal' || baseItemId === 'monster_fang' ||
                      baseItemId === 'dragon_scale' || baseItemId === 'strength_potion' || baseItemId === 'defense_potion' ||
                      baseItemId === 'mythril_ore' || baseItemId === 'abyssal_shard' || baseItemId === 'duskhollow_essence' ||
                      baseItemId === 'mega_health_potion' || baseItemId === 'mega_mana_potion';
    if (stackable) return baseItemId;

    // %20 ihtimalle enhanced
    if (Math.random() > 0.20) return baseItemId;

    this._uidCounter = (this._uidCounter || 0) + 1;
    const uid = 'e' + this._uidCounter;
    const bonuses = {};

    // Silah türleri: bonus attack + bazen maxMana
    if (baseItemId.includes('sword') || baseItemId.includes('bow') || baseItemId.includes('staff')) {
      bonuses.attack = Math.floor(Math.random() * 5) + 1;
      if (Math.random() < 0.3) bonuses.maxHp = Math.floor(Math.random() * 10) + 5;
      if (baseItemId.includes('staff') && Math.random() < 0.4) bonuses.maxMana = Math.floor(Math.random() * 15) + 5;
    }
    // Zırh, kask, pantolon, eldiven: bonus defense + bazen attack, hp
    else if (baseItemId.includes('armor') || baseItemId.includes('helm') || baseItemId.includes('pants') || baseItemId.includes('gloves')) {
      bonuses.defense = Math.floor(Math.random() * 4) + 1;
      if (Math.random() < 0.3) bonuses.attack = Math.floor(Math.random() * 3) + 1;
      if (Math.random() < 0.4) bonuses.maxHp = Math.floor(Math.random() * 15) + 5;
    }
    // Kemer: bonus maxHp + bazen defense
    else if (baseItemId.includes('belt')) {
      bonuses.maxHp = Math.floor(Math.random() * 10) + 5;
      if (Math.random() < 0.3) bonuses.defense = Math.floor(Math.random() * 3) + 1;
    }
    // Küpe: bonus attack/defense + bazen maxMana
    else if (baseItemId.includes('ring')) {
      bonuses.attack = Math.floor(Math.random() * 3) + 1;
      bonuses.defense = Math.floor(Math.random() * 3) + 1;
      if (Math.random() < 0.3) bonuses.maxMana = Math.floor(Math.random() * 10) + 5;
    }
    // Kolye: bonus maxHp + bazen attack, maxMana
    else if (baseItemId.includes('amulet')) {
      bonuses.maxHp = Math.floor(Math.random() * 15) + 5;
      if (Math.random() < 0.4) bonuses.attack = Math.floor(Math.random() * 3) + 1;
      if (Math.random() < 0.3) bonuses.maxMana = Math.floor(Math.random() * 10) + 5;
    }

    // Boş bonus ise normal item döndür
    if (Object.keys(bonuses).length === 0) return baseItemId;

    this.itemBonuses[uid] = bonuses;
    return `${baseItemId}:${uid}`;
  }

  // ===== GRID POZİSYON YÖNETİMİ =====
  // Grid'de boş yer bul (gw x gh boyutunda item için)
  findEmptyGridSlot(gridArray, cols, maxRows, gw, gh) {
    // occupied haritası oluştur
    const occupied = Array.from({ length: maxRows }, () => Array(cols).fill(false));
    gridArray.forEach(g => {
      if (!g) return;
      const baseId = this.getBaseItemId(g.entry);
      const ITEMS_REF = typeof window !== 'undefined' && window.__ITEMS_REF;
      const item = ITEMS_REF ? ITEMS_REF[baseId] : null;
      const igw = item ? (item.gridW || 1) : 1;
      const igh = item ? (item.gridH || 1) : 1;
      for (let dr = 0; dr < igh; dr++)
        for (let dc = 0; dc < igw; dc++)
          if (g.row + dr < maxRows && g.col + dc < cols)
            occupied[g.row + dr][g.col + dc] = true;
    });
    // İlk uygun yeri bul
    for (let r = 0; r <= maxRows - gh; r++)
      for (let c = 0; c <= cols - gw; c++) {
        let fits = true;
        for (let dr = 0; dr < gh && fits; dr++)
          for (let dc = 0; dc < gw && fits; dc++)
            if (occupied[r + dr][c + dc]) fits = false;
        if (fits) return { col: c, row: r };
      }
    return null;
  }

  // Item'ı grid'e ekle (ilk boş yere)
  addToGrid(gridArray, entry, cols, maxRows, gw, gh) {
    const pos = this.findEmptyGridSlot(gridArray, cols, maxRows, gw, gh);
    if (!pos) return false;
    gridArray.push({ entry, col: pos.col, row: pos.row });
    return true;
  }

  // Grid'den item çıkar
  removeFromGrid(gridArray, entry) {
    const idx = gridArray.findIndex(g => g.entry === entry);
    if (idx !== -1) { gridArray.splice(idx, 1); return true; }
    // Base ID ile eşleşme dene
    const baseId = this.getBaseItemId(entry);
    const idx2 = gridArray.findIndex(g => this.getBaseItemId(g.entry) === baseId);
    if (idx2 !== -1) { gridArray.splice(idx2, 1); return true; }
    return false;
  }

  // Grid pozisyonunu taşı
  moveInGrid(gridArray, fromIdx, newCol, newRow) {
    if (fromIdx >= 0 && fromIdx < gridArray.length) {
      gridArray[fromIdx].col = newCol;
      gridArray[fromIdx].row = newRow;
    }
  }

  // İki item'ın grid pozisyonunu değiştir (swap)
  swapInGrid(gridArray, idx1, idx2) {
    const temp = { col: gridArray[idx1].col, row: gridArray[idx1].row };
    gridArray[idx1].col = gridArray[idx2].col;
    gridArray[idx1].row = gridArray[idx2].row;
    gridArray[idx2].col = temp.col;
    gridArray[idx2].row = temp.row;
  }

  // Count unique grid slots used (stackable items = 1 slot each type)
  getUsedSlots() {
    const seen = new Set();
    let slots = 0;
    this.inventory.forEach(entry => {
      const id = this.getBaseItemId(entry);
      const stackable = id.includes('potion') || id === 'wood' || id === 'herb' || id === 'stone' ||
                        id === 'crystal' || id === 'monster_fang' || id === 'dragon_scale' ||
                        id === 'mythril_ore' || id === 'abyssal_shard' || id === 'duskhollow_essence' ||
                        id === 'mega_health_potion' || id === 'mega_mana_potion';
      if (stackable) {
        if (!seen.has(id)) { seen.add(id); slots++; }
      } else {
        slots++;
      }
    });
    return slots;
  }

  // Envanter
  addItem(itemEntry) {
    const id = this.getBaseItemId(itemEntry);
    const stackable = id.includes('potion') || id === 'wood' || id === 'herb' || id === 'stone' ||
                      id === 'crystal' || id === 'monster_fang' || id === 'dragon_scale' ||
                      id === 'mythril_ore' || id === 'abyssal_shard' || id === 'duskhollow_essence' ||
                      id === 'mega_health_potion' || id === 'mega_mana_potion';
    if (stackable && this.inventory.some(e => this.getBaseItemId(e) === id)) {
      this.inventory.push(itemEntry);
      return true;
    }
    if (this.getUsedSlots() >= this.maxInventory) return false;
    this.inventory.push(itemEntry);
    // Grid'e pozisyon ekle (ilk boş yere)
    const ITEMS_REF = typeof window !== 'undefined' && window.__ITEMS_REF;
    const item = ITEMS_REF ? ITEMS_REF[id] : null;
    const gw = item ? (item.gridW || 1) : 1;
    const gh = item ? (item.gridH || 1) : 1;
    this.addToGrid(this.inventoryGrid, itemEntry, 10, 10, gw, gh);
    return true;
  }

  // Enhanced item ile eşleşen ilk item'ı çıkar
  removeItem(itemEntry) {
    // Önce tam eşleşme dene
    let idx = this.inventory.indexOf(itemEntry);
    if (idx === -1) {
      // Base ID ile eşleşme dene (enhanced olmayanı bul)
      const baseId = this.getBaseItemId(itemEntry);
      idx = this.inventory.findIndex(e => this.getBaseItemId(e) === baseId);
    }
    if (idx === -1) return false;
    // Enhanced item silindiyse bonus verisini de temizle
    const removed = this.inventory[idx];
    const uid = this.getItemUid(removed);
    if (uid && this.itemBonuses[uid]) delete this.itemBonuses[uid];
    this.inventory.splice(idx, 1);
    // Grid'den de kaldır
    this.removeFromGrid(this.inventoryGrid, removed);
    return true;
  }

  hasItem(itemId) {
    const baseId = this.getBaseItemId(itemId);
    return this.inventory.some(e => this.getBaseItemId(e) === baseId);
  }

  countItem(itemId) {
    const baseId = this.getBaseItemId(itemId);
    return this.inventory.filter(e => this.getBaseItemId(e) === baseId).length;
  }

  // Depo
  addToStorage(itemEntry) {
    if (this.storage.length >= this.maxStorage) return false;
    this.storage.push(itemEntry);
    // Grid'e pozisyon ekle (depo: 10 sütun, 50 satır)
    const id = this.getBaseItemId(itemEntry);
    const ITEMS_REF = typeof window !== 'undefined' && window.__ITEMS_REF;
    const item = ITEMS_REF ? ITEMS_REF[id] : null;
    const gw = item ? (item.gridW || 1) : 1;
    const gh = item ? (item.gridH || 1) : 1;
    this.addToGrid(this.storageGrid, itemEntry, 10, 50, gw, gh);
    return true;
  }

  removeFromStorage(itemEntry) {
    const idx = this.storage.indexOf(itemEntry);
    if (idx === -1) {
      const baseId = this.getBaseItemId(itemEntry);
      const idx2 = this.storage.findIndex(e => this.getBaseItemId(e) === baseId);
      if (idx2 === -1) return false;
      const removed = this.storage[idx2];
      this.storage.splice(idx2, 1);
      this.removeFromGrid(this.storageGrid, removed);
      return true;
    }
    const removed = this.storage[idx];
    this.storage.splice(idx, 1);
    this.removeFromGrid(this.storageGrid, removed);
    return true;
  }

  // Ekipman
  getSlotForItem(itemData) {
    // Explicit equipSlot field takes priority
    if (itemData.equipSlot) return itemData.equipSlot;
    if (itemData.type === 'weapon') return 'weapon';
    if (itemData.type === 'armor') return 'chest';
    if (itemData.type === 'accessory') {
      if (itemData.id.includes('yuzuk')) return 'ring';
      if (itemData.id.includes('ring')) return 'earring';
      if (itemData.id.includes('amulet')) return 'necklace';
      if (itemData.id.includes('helm')) return 'head';
      if (itemData.id.includes('pants')) return 'legs';
      if (itemData.id.includes('gloves')) return 'arms';
      if (itemData.id.includes('belt')) return 'belt';
      return 'belt';
    }
    return null;
  }

  equip(itemData, targetSlot, inventoryEntry) {
    const slot = targetSlot || this.getSlotForItem(itemData);
    if (!slot) return false;
    // Mevcut ekipmanı çıkar
    if (this.equipped[slot]) {
      const prev = this.equipped[slot];
      // Eski enhanced item'ı envantere geri koy (bonus bilgisiyle)
      if (prev._uid && prev._bonuses) {
        this.itemBonuses[prev._uid] = prev._bonuses;
        this.addItem(`${prev.id}:${prev._uid}`);
      } else {
        this.addItem(prev.id);
      }
    }
    // Envanterdeki entry'yi bul ve çıkar
    const entryToRemove = inventoryEntry || itemData.id;
    this.removeItemExact(entryToRemove);
    // Equip objesi oluştur
    const equipObj = { ...itemData };
    // Enhanced bonus bilgisini aktar
    if (typeof entryToRemove === 'string' && this.isEnhanced(entryToRemove)) {
      const uid = this.getItemUid(entryToRemove);
      if (uid && this.itemBonuses[uid]) {
        equipObj._uid = uid;
        equipObj._bonuses = { ...this.itemBonuses[uid] };
      }
    }
    this.equipped[slot] = equipObj;
    return true;
  }

  // Tam eşleşme ile item çıkar (enhanced entry dahil)
  removeItemExact(entry) {
    const idx = this.inventory.indexOf(entry);
    if (idx === -1) {
      // Base ID ile dene
      const baseId = this.getBaseItemId(entry);
      const idx2 = this.inventory.findIndex(e => this.getBaseItemId(e) === baseId);
      if (idx2 === -1) return false;
      this.inventory.splice(idx2, 1);
      return true;
    }
    this.inventory.splice(idx, 1);
    return true;
  }

  unequip(slot) {
    if (!this.equipped[slot]) return false;
    if (this.inventory.length >= this.maxInventory) return false;
    const eq = this.equipped[slot];
    // Enhanced item ise bonus bilgisiyle envantere koy
    if (eq._uid && eq._bonuses) {
      this.itemBonuses[eq._uid] = eq._bonuses;
      this.addItem(`${eq.id}:${eq._uid}`);
    } else {
      this.addItem(eq.id);
    }
    this.equipped[slot] = null;
    return true;
  }

  // Quest
  acceptQuest(questId) {
    this.activeQuests[questId] = { progress: 0 };
  }

  getQuestProgress(questId) {
    return this.activeQuests[questId]?.progress || 0;
  }

  updateQuestProgress(type, targetId) {
    Object.keys(this.activeQuests).forEach(qId => {
      // Quest verisi dışarıdan kontrol edilir
    });
  }

  completeQuest(questId) {
    this.completedQuests[questId] = true;
    delete this.activeQuests[questId];
  }

  // Boss öldürme
  addBossKill(bossId) {
    this.bossKills[bossId] = true;
  }

  hasBossKill(bossId) {
    return !!this.bossKills[bossId];
  }

  // Kill sayacı
  addKill(monsterId) {
    this.killCounts[monsterId] = (this.killCounts[monsterId] || 0) + 1;
  }

  getKills(monsterId) {
    return this.killCounts[monsterId] || 0;
  }

  // Gather sayacı
  addGather(resourceId) {
    this.gatherCounts[resourceId] = (this.gatherCounts[resourceId] || 0) + 1;
  }

  getGather(resourceId) {
    return this.gatherCounts[resourceId] || 0;
  }

  // Mana rejenerasyon (saniyede 1 mana)
  regenMana(delta) {
    this._manaRegenTimer = (this._manaRegenTimer || 0) + delta;
    if (this._manaRegenTimer >= 1000) {
      this._manaRegenTimer -= 1000;
      if (this.mana < this.getMaxMana()) {
        this.mana = Math.min(this.mana + 1, this.getMaxMana());
      }
    }
  }

  // Buff sistemi
  addBuff(buff) {
    this.buffs.push({ ...buff, startTime: Date.now() });
  }

  updateBuffs() {
    const now = Date.now();
    this.buffs = this.buffs.filter(b => now - b.startTime < b.duration);
  }

  // Kaydet/Yükle — slot destekli
  save() {
    const data = {
      gender: this.gender, playerName: this.playerName, playerClass: this.playerClass,
      level: this.level, exp: this.exp, gold: this.gold,
      maxHp: this.maxHp, hp: this.hp, maxMana: this.maxMana, mana: this.mana,
      baseAttack: this.baseAttack, baseDefense: this.baseDefense,
      equipped: this.equipped, inventory: this.inventory,
      inventoryGrid: this.inventoryGrid,
      storage: this.storage, storageGrid: this.storageGrid,
      activeQuests: this.activeQuests,
      completedQuests: this.completedQuests,
      killCounts: this.killCounts, gatherCounts: this.gatherCounts,
      bossKills: this.bossKills,
      itemBonuses: this.itemBonuses, _uidCounter: this._uidCounter,
      dungeonFloor: this.dungeonFloor, maxDungeonFloor: this.maxDungeonFloor,
      lastScene: this.lastScene, lastX: this.lastX, lastY: this.lastY,
      fogData: this.fogData
    };
    const slot = this.saveSlot !== undefined ? this.saveSlot : (PlayerState.activeSlot || 0);
    localStorage.setItem(`rpg_save_${slot}`, JSON.stringify(data));
  }

  load() {
    const slot = this.saveSlot !== undefined ? this.saveSlot : (PlayerState.activeSlot || 0);
    const raw = localStorage.getItem(`rpg_save_${slot}`);
    if (!raw) return false;
    const data = JSON.parse(raw);
    Object.assign(this, data);
    // Geriye uyumluluk: eski kayıtlarda sınıf yoksa warrior
    if (!this.playerClass) this.playerClass = 'warrior';
    if (this.equipped && !this.equipped.ring) this.equipped.ring = null;
    this.saveSlot = slot;
    return true;
  }
}
