import Phaser from 'phaser';
import { PlayerState, formatGold } from '../systems/PlayerState.js';
import { ITEMS } from '../data/items.js';
import { NPCS } from '../data/quests.js';
import { CraftingSystem } from '../systems/CraftingSystem.js';
import { RECIPES, RECIPE_CATEGORIES } from '../data/recipes.js';

export class ShopScene extends Phaser.Scene {
  constructor() {
    super('ShopScene');
  }

  create() {
    this.playerState = PlayerState.getInstance();
    this.qtyInput = null;
    this.recentSales = this.recentSales || [];
    this.openGroup = this.openGroup || null;
    this.craftingSystem = new CraftingSystem();
    this.activeTab = this.activeTab || 'shop';
    if (this.activeTab === 'craft') this.drawCrafting();
    else this.drawShop();
  }

  // Stack items with max 100 per stack (enhanced item desteği)
  stackItems(inventory) {
    const ps = PlayerState.getInstance();
    const stacked = [];
    const stackMap = {};
    inventory.forEach(entry => {
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
          stacked.push({ id: baseId, entry, count: 1, enhanced: false });
        }
      } else {
        if (stackable) stackMap[baseId] = stacked.length;
        stacked.push({ id: baseId, entry, count: 1, enhanced });
      }
    });
    return stacked;
  }

  // 2D grid packer for variable-size items
  packItems(items, cols, maxRows, cellSize) {
    const occupied = Array.from({ length: maxRows }, () => Array(cols).fill(false));
    const result = [];

    const findSlot = (gw, gh) => {
      for (let r = 0; r <= maxRows - gh; r++)
        for (let c = 0; c <= cols - gw; c++) {
          let fits = true;
          for (let dr = 0; dr < gh && fits; dr++)
            for (let dc = 0; dc < gw && fits; dc++)
              if (occupied[r + dr][c + dc]) fits = false;
          if (fits) return { col: c, row: r };
        }
      return null;
    };

    items.forEach(stack => {
      const item = ITEMS[stack.id];
      if (!item) return;
      const gw = item.gridW || 1, gh = item.gridH || 1;
      const pos = findSlot(gw, gh);
      if (!pos) return;
      for (let dr = 0; dr < gh; dr++)
        for (let dc = 0; dc < gw; dc++)
          if (pos.row + dr < maxRows && pos.col + dc < cols)
            occupied[pos.row + dr][pos.col + dc] = true;
      result.push({ ...stack, col: pos.col, row: pos.row, gw, gh });
    });
    return result;
  }

  drawShop() {
    this.cleanupQtyInput();
    this.children.removeAll(true);
    const ps = this.playerState;
    const stock = NPCS.shopkeeper.stock;
    const cellS = 34;
    const cols = 9, maxRows = 12;

    // Background
    const g = this.add.graphics();
    g.fillStyle(0x0a0a1a); g.fillRect(0, 0, 800, 600);
    g.fillStyle(0x12122a, 0.98); g.fillRoundedRect(8, 8, 784, 584, 8);
    g.lineStyle(2, 0xDAA520); g.strokeRoundedRect(8, 8, 784, 584, 8);

    // Tab buttons
    const shopTab = this.add.text(320, 22, '🏪 Dükkan', {
      fontSize: '16px', fontFamily: 'Nunito, Arial, sans-serif', color: '#DAA520',
      fontStyle: 'bold', backgroundColor: '#1a1a3a', padding: { x: 12, y: 4 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const craftTab = this.add.text(480, 22, '🔨 Zanaat', {
      fontSize: '16px', fontFamily: 'Nunito, Arial, sans-serif', color: '#888',
      fontStyle: 'bold', backgroundColor: '#0a0a1a', padding: { x: 12, y: 4 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    craftTab.on('pointerdown', () => { this.activeTab = 'craft'; this.drawCrafting(); });

    this.add.text(400, 46, `Altın: ${formatGold(ps.gold)}`, {
      fontSize: '16px', fontFamily: 'Nunito, Arial, sans-serif', color: '#FFD700', fontStyle: 'bold'
    }).setOrigin(0.5);

    // Divider
    g.lineStyle(2, 0x3a3a5a); g.lineBetween(400, 62, 400, 540);

    // === LEFT: Envanter ===
    this.add.text(195, 68, 'Envanterin (Tıkla → Sat)', {
      fontSize: '13px', fontFamily: 'Nunito, Arial, sans-serif', color: '#cc99ff', fontStyle: 'bold'
    }).setOrigin(0.5);

    const invStartX = 22, invStartY = 86;
    // Grid bg
    for (let r = 0; r < maxRows; r++)
      for (let c = 0; c < cols; c++)
        this.add.rectangle(invStartX + c * cellS, invStartY + r * cellS, cellS - 2, cellS - 2, 0x1a1a2a, 0.5).setStrokeStyle(1, 0x2a2a4a);

    // Stack inventory
    const invStacked = this.stackItems(ps.inventory);

    // Grid'i sıfırdan oluştur (shop için sadece okuma)
    const oldShopGrid = ps.inventoryGrid || [];
    const shopOccupied = Array.from({ length: maxRows }, () => Array(cols).fill(false));
    const shopCanPlace = (c, r, gw, gh) => {
      if (c < 0 || r < 0 || c + gw > cols || r + gh > maxRows) return false;
      for (let dr = 0; dr < gh; dr++)
        for (let dc = 0; dc < gw; dc++)
          if (shopOccupied[r + dr][c + dc]) return false;
      return true;
    };
    const shopFindSlot = (gw, gh) => {
      for (let r = 0; r <= maxRows - gh; r++)
        for (let c = 0; c <= cols - gw; c++)
          if (shopCanPlace(c, r, gw, gh)) return { col: c, row: r };
      return null;
    };

    const shopGridEntries = [];
    invStacked.forEach(stack => {
      const item = ITEMS[stack.id];
      if (!item) return;
      const gw = item.gridW || 1, gh = item.gridH || 1;
      const prev = oldShopGrid.find(g => {
        if (!stack.enhanced) return ps.getBaseItemId(g.entry) === stack.id;
        return g.entry === stack.entry;
      });
      let pos = null;
      if (prev && shopCanPlace(prev.col, prev.row, gw, gh)) {
        pos = { col: prev.col, row: prev.row };
      } else {
        pos = shopFindSlot(gw, gh);
      }
      if (!pos) return;
      for (let dr = 0; dr < gh; dr++)
        for (let dc = 0; dc < gw; dc++)
          if (pos.row + dr < maxRows && pos.col + dc < cols) shopOccupied[pos.row + dr][pos.col + dc] = true;
      shopGridEntries.push({ ...stack, col: pos.col, row: pos.row, gw, gh });
    });

    shopGridEntries.forEach(p => {
      const item = ITEMS[p.id];
      const gw = p.gw, gh = p.gh;
      const ix = invStartX + p.col * cellS + (gw - 1) * cellS / 2;
      const iy = invStartY + p.row * cellS + (gh - 1) * cellS / 2;

      if (p.gw > 1 || p.gh > 1)
        this.add.rectangle(ix, iy, p.gw * cellS - 4, p.gh * cellS - 4, 0x1a1a3a, 0.7).setStrokeStyle(1, 0x4a4a6a);

      // Enhanced item parıltı çerçevesi (item sınırları içinde)
      if (p.enhanced) {
        this.add.rectangle(ix, iy, p.gw * cellS - 6, p.gh * cellS - 6, 0x000000, 0)
          .setStrokeStyle(1, 0xFFD700);
        this.add.text(ix - p.gw * cellS / 2 + 4, iy - p.gh * cellS / 2 + 2, '✦', {
          fontSize: '8px', color: '#FFD700'
        });
      }

      const sc = (p.gw >= 2 && p.gh >= 2) ? 0.85 : (p.gh >= 2 || p.gw >= 2) ? 0.75 : 0.45;
      const icon = this.add.image(ix, iy, `icon_${p.id}`).setScale(sc).setInteractive({ useHandCursor: true });

      if (p.count > 1)
        this.add.text(ix + p.gw * cellS / 2 - 4, iy + p.gh * cellS / 2 - 4, `${p.count}`, {
          fontSize: '11px', fontFamily: 'Nunito, Arial, sans-serif', color: '#fff', fontStyle: 'bold',
          stroke: '#000', strokeThickness: 2
        }).setOrigin(1, 1);

      // Sell price
      const sellPrice = Math.floor(item.value / 2);
      this.add.text(ix, iy + p.gh * cellS / 2 - 2, formatGold(sellPrice), {
        fontSize: '8px', fontFamily: 'Nunito, Arial, sans-serif', color: '#90ee90', stroke: '#000', strokeThickness: 1
      }).setOrigin(0.5, 1);

      icon.on('pointerover', () => this.showTooltip(item, `Sat: ${formatGold(sellPrice)} Altın`, p.count));
      icon.on('pointerout', () => this.hideTooltip());
      icon.on('pointerdown', () => {
        if (p.count > 1 && (item.type === 'consumable' || item.type === 'material')) {
          this.showQtyInput(ix, iy, p.count, (qty) => {
            const totalGold = sellPrice * qty;
            for (let q = 0; q < qty; q++) { ps.gold += sellPrice; ps.removeItem(p.id); }
            this.addToRecentSales(p.id, qty, totalGold);
            ps.save(); this.drawShop();
          });
        } else {
          ps.gold += sellPrice; ps.removeItem(p.id);
          this.addToRecentSales(p.id, 1, sellPrice);
          ps.save(); this.drawShop();
        }
      });
    });

    // === RIGHT: Dükkan Stoku (accordion groups) ===
    this.add.text(600, 68, 'Dükkan (Kategori tıkla → aç)', {
      fontSize: '12px', fontFamily: 'Nunito, Arial, sans-serif', color: '#cc99ff', fontStyle: 'bold'
    }).setOrigin(0.5);

    const shopGroups = [
      { name: 'Silahlar', icon: '⚔', ids: [] },
      { name: 'Zırhlar', icon: '🛡', ids: [] },
      { name: 'Ekipman', icon: '👕', ids: [] },
      { name: 'İksirler', icon: '🧪', ids: [] },
      { name: 'Aksesuarlar', icon: '💍', ids: [] },
    ];
    stock.forEach(id => {
      const item = ITEMS[id];
      if (!item) return;
      if (item.type === 'weapon') shopGroups[0].ids.push(id);
      else if (item.type === 'armor') shopGroups[1].ids.push(id);
      else if (item.type === 'consumable') shopGroups[3].ids.push(id);
      else if (item.equipSlot) shopGroups[2].ids.push(id);
      else if (item.type === 'accessory') shopGroups[4].ids.push(id);
    });

    const shopX = 408, rowH = 26, headerH = 28;
    let shopY = 86;

    shopGroups.forEach(group => {
      if (group.ids.length === 0) return;
      const isOpen = this.openGroup === group.name;
      const headerY = shopY;

      // Group header bg
      const hdrBg = this.add.rectangle(596, headerY, 370, headerH - 2, isOpen ? 0x2a2a4a : 0x1a1a2a, 0.9)
        .setStrokeStyle(1, isOpen ? 0x6a5aaa : 0x3a3a5a).setInteractive({ useHandCursor: true });

      // Arrow + name + count
      const arrow = isOpen ? '▼' : '▶';
      this.add.text(shopX + 6, headerY, `${arrow} ${group.name} (${group.ids.length})`, {
        fontSize: '13px', fontFamily: 'Nunito, Arial, sans-serif',
        color: isOpen ? '#d0b0ff' : '#9999bb', fontStyle: 'bold'
      }).setOrigin(0, 0.5);

      // Click header to toggle
      hdrBg.on('pointerdown', () => {
        this.openGroup = isOpen ? null : group.name;
        this.drawShop();
      });
      hdrBg.on('pointerover', () => hdrBg.setStrokeStyle(2, 0x8a7aCC));
      hdrBg.on('pointerout', () => hdrBg.setStrokeStyle(1, isOpen ? 0x6a5aaa : 0x3a3a5a));

      shopY += headerH;

      // Show items only if open
      if (isOpen) {
        group.ids.forEach(itemId => {
          const item = ITEMS[itemId];
          if (!item) return;
          const canAfford = ps.gold >= item.value;
          const ry = shopY;

          // Row bg
          const rowBg = this.add.rectangle(596, ry, 366, rowH - 2, 0x15152a, 0.7)
            .setStrokeStyle(1, 0x2a2a3a).setInteractive({ useHandCursor: true });

          // Icon
          const icon = this.add.image(shopX + 14, ry, `icon_${itemId}`).setScale(0.4);
          if (!canAfford) icon.setAlpha(0.35);

          // Name
          this.add.text(shopX + 32, ry, item.name, {
            fontSize: '11px', fontFamily: 'Nunito, Arial, sans-serif',
            color: canAfford ? item.color || '#ccc' : '#555'
          }).setOrigin(0, 0.5);

          // Stats summary
          let stats = '';
          if (item.attack) stats += `ATK+${item.attack} `;
          if (item.defense) stats += `DEF+${item.defense} `;
          if (item.heal) stats += `HP+${item.heal} `;
          if (item.mana) stats += `MP+${item.mana} `;
          if (item.maxHp) stats += `MaxHP+${item.maxHp} `;
          if (stats) this.add.text(680, ry, stats.trim(), {
            fontSize: '9px', fontFamily: 'Nunito, Arial, sans-serif', color: '#888'
          }).setOrigin(0, 0.5);

          // Price
          this.add.text(774, ry, formatGold(item.value), {
            fontSize: '11px', fontFamily: 'Nunito, Arial, sans-serif',
            color: canAfford ? '#FFD700' : '#553300', fontStyle: 'bold'
          }).setOrigin(1, 0.5);

          // Hover
          rowBg.on('pointerover', () => {
            rowBg.setStrokeStyle(1, 0x5a5a8a);
            this.showTooltip(item, `Fiyat: ${formatGold(item.value)} Altın`);
          });
          rowBg.on('pointerout', () => {
            rowBg.setStrokeStyle(1, 0x2a2a3a);
            this.hideTooltip();
          });

          // Click to buy
          rowBg.on('pointerdown', () => {
            if (!canAfford) return;
            const stackable = item.type === 'consumable' || item.type === 'material';
            if (stackable) {
              const maxBuy = Math.floor(ps.gold / item.value);
              if (maxBuy > 1) {
                this.showQtyInput(600, ry, maxBuy, (qty) => {
                  for (let q = 0; q < qty; q++) {
                    if (ps.gold >= item.value && ps.addItem(itemId)) ps.gold -= item.value;
                    else break;
                  }
                  ps.save(); this.drawShop();
                });
              } else {
                if (ps.addItem(itemId)) { ps.gold -= item.value; ps.save(); this.drawShop(); }
              }
            } else {
              if (ps.addItem(itemId)) { ps.gold -= item.value; ps.save(); this.drawShop(); }
            }
          });

          shopY += rowH;
        });
      }

      shopY += 2;
    });

    // === BOTTOM CENTER: Son Satışlar (Geri Al) ===
    if (this.recentSales.length > 0) {
      const bbY = 510;
      g.fillStyle(0x1a1a2a, 0.9); g.fillRoundedRect(250, bbY - 16, 300, 46, 4);
      g.lineStyle(1, 0x5a5a3a); g.strokeRoundedRect(250, bbY - 16, 300, 46, 4);

      this.add.text(400, bbY - 10, 'Son Satışlar (Tıkla → Geri Al)', {
        fontSize: '10px', fontFamily: 'Nunito, Arial, sans-serif', color: '#AAAA66'
      }).setOrigin(0.5);

      this.recentSales.forEach((sale, idx) => {
        const item = ITEMS[sale.id];
        if (!item) return;
        const bx = 300 + idx * 80;
        const by = bbY + 14;

        const icon = this.add.image(bx, by, `icon_${sale.id}`).setScale(0.35).setInteractive({ useHandCursor: true });

        const countStr = sale.count > 1 ? `x${sale.count} ` : '';
        this.add.text(bx + 16, by - 4, `${countStr}${formatGold(sale.goldPaid)}`, {
          fontSize: '9px', fontFamily: 'Nunito, Arial, sans-serif', color: '#FFD700',
          stroke: '#000', strokeThickness: 1
        }).setOrigin(0, 0.5);

        icon.on('pointerover', () => {
          this.showTooltip(item, `Geri al: ${formatGold(sale.goldPaid)} Altın iade edilir`, sale.count);
        });
        icon.on('pointerout', () => this.hideTooltip());
        icon.on('pointerdown', () => this.buybackItem(idx));
      });
    }

    // Tooltip bar
    this.tooltipBg = this.add.rectangle(400, 552, 760, 28, 0x15153a, 0.95).setStrokeStyle(1, 0x3a3a5a);
    this.tooltipTxt = this.add.text(400, 552, 'Eşyaların üzerine gel → bilgi gör', {
      fontSize: '11px', fontFamily: 'Nunito, Arial, sans-serif', color: '#666', align: 'center'
    }).setOrigin(0.5);

    // Exit
    const exitBtn = this.add.text(770, 24, 'X', {
      fontSize: '20px', fontFamily: 'Nunito, Arial, sans-serif', color: '#FF6666', fontStyle: 'bold',
      backgroundColor: '#2a0a0a', padding: { x: 6, y: 2 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    exitBtn.on('pointerdown', () => this.exitShop());
    this.input.keyboard.once('keydown-ESC', () => this.exitShop());
  }

  showQtyInput(x, y, maxQty, callback) {
    this.cleanupQtyInput();

    // Popup overlay
    const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.5).setDepth(50).setInteractive();
    const popup = this.add.rectangle(400, 280, 240, 160, 0x1a1a3a, 0.98).setDepth(51).setStrokeStyle(2, 0x6a5aaa);

    this.add.text(400, 230, 'Miktar Gir', {
      fontSize: '16px', fontFamily: 'Nunito, Arial, sans-serif', color: '#c0a0e0', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(52);

    this.add.text(400, 252, `(Max: ${maxQty})`, {
      fontSize: '12px', fontFamily: 'Nunito, Arial, sans-serif', color: '#888'
    }).setOrigin(0.5).setDepth(52);

    // HTML input
    const canvas = this.sys.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const inp = document.createElement('input');
    inp.type = 'number'; inp.min = '1'; inp.max = String(maxQty); inp.value = '1';
    inp.style.cssText = `
      position: fixed;
      left: ${rect.left + rect.width / 2}px;
      top: ${rect.top + rect.height * 0.47}px;
      transform: translate(-50%, -50%);
      width: 120px; padding: 10px; font-size: 20px;
      text-align: center; color: #c0a0e0;
      background: #0a0a2a; border: 2px solid #6a5aaa;
      border-radius: 6px; outline: none; z-index: 1000;
      box-sizing: border-box;
    `;
    document.body.appendChild(inp);
    this.qtyInput = inp;
    setTimeout(() => { inp.focus(); inp.select(); }, 50);

    // OK button
    const okBtn = this.add.text(360, 320, 'Tamam', {
      fontSize: '15px', fontFamily: 'Nunito, Arial, sans-serif', color: '#90ee90',
      backgroundColor: '#1a3a1a', padding: { x: 14, y: 6 }, fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(52).setInteractive({ useHandCursor: true });

    // Cancel button
    const cancelBtn = this.add.text(440, 320, 'İptal', {
      fontSize: '15px', fontFamily: 'Nunito, Arial, sans-serif', color: '#ff6666',
      backgroundColor: '#3a1a1a', padding: { x: 14, y: 6 }
    }).setOrigin(0.5).setDepth(52).setInteractive({ useHandCursor: true });

    const doConfirm = () => {
      let qty = parseInt(inp.value) || 1;
      qty = Math.max(1, Math.min(qty, maxQty));
      this.cleanupQtyInput();
      callback(qty);
    };

    okBtn.on('pointerdown', doConfirm);
    cancelBtn.on('pointerdown', () => { this.cleanupQtyInput(); this.drawShop(); });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') doConfirm(); if (e.key === 'Escape') { this.cleanupQtyInput(); this.drawShop(); } });

    this._qtyPopupElements = [overlay, popup, okBtn, cancelBtn];
    // Store text elements at depth 52
    this._qtyPopupElements.push(...this.children.list.filter(c => c.depth === 52 && c !== popup && c !== okBtn && c !== cancelBtn));
  }

  cleanupQtyInput() {
    if (this.qtyInput) { this.qtyInput.remove(); this.qtyInput = null; }
    if (this._qtyPopupElements) {
      this._qtyPopupElements.forEach(e => { if (e && e.destroy) e.destroy(); });
      this._qtyPopupElements = null;
    }
  }

  addToRecentSales(itemId, count, goldPaid) {
    this.recentSales.unshift({ id: itemId, count, goldPaid });
    if (this.recentSales.length > 3) this.recentSales.pop();
  }

  buybackItem(index) {
    const sale = this.recentSales[index];
    if (!sale) return;
    const ps = this.playerState;
    // Check if player has enough gold to refund
    if (ps.gold < sale.goldPaid) return;
    // Return items to inventory
    for (let i = 0; i < sale.count; i++) {
      if (!ps.addItem(sale.id)) return; // inventory full
    }
    ps.gold -= sale.goldPaid;
    this.recentSales.splice(index, 1);
    ps.save();
    this.drawShop();
  }

  showTooltip(item, extra, count) {
    let desc = `${item.name}`;
    if (count && count > 1) desc += ` (x${count})`;
    desc += ` — ${item.desc}`;
    if (item.attack) desc += ` | ATK+${item.attack}`;
    if (item.defense) desc += ` | DEF+${item.defense}`;
    if (item.heal) desc += ` | HP+${item.heal}`;
    if (item.mana) desc += ` | MP+${item.mana}`;
    if (item.maxHp) desc += ` | MaxHP+${item.maxHp}`;
    if (item.manaCost) desc += ` | Mana:${item.manaCost}`;
    if (extra) desc += ` | ${extra}`;
    this.tooltipTxt.setText(desc);
  }

  hideTooltip() {
    this.tooltipTxt.setText('Eşyaların üzerine gel → bilgi gör');
  }

  exitShop() {
    this.cleanupQtyInput();
    this.activeTab = 'shop';
    this.playerState.save();
    this.scene.start('OverworldScene');
  }

  // ===== ZANAAT SİSTEMİ =====
  drawCrafting() {
    this.cleanupQtyInput();
    this.children.removeAll(true);
    const ps = this.playerState;
    const cs = this.craftingSystem;

    // Background
    const g = this.add.graphics();
    g.fillStyle(0x0a0a1a); g.fillRect(0, 0, 800, 600);
    g.fillStyle(0x12122a, 0.98); g.fillRoundedRect(8, 8, 784, 584, 8);
    g.lineStyle(2, 0xDAA520); g.strokeRoundedRect(8, 8, 784, 584, 8);

    // Tab buttons
    const shopTab = this.add.text(320, 22, '🏪 Dükkan', {
      fontSize: '16px', fontFamily: 'Nunito, Arial, sans-serif', color: '#888',
      fontStyle: 'bold', backgroundColor: '#0a0a1a', padding: { x: 12, y: 4 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    shopTab.on('pointerdown', () => { this.activeTab = 'shop'; this.drawShop(); });

    const craftTab = this.add.text(480, 22, '🔨 Zanaat', {
      fontSize: '16px', fontFamily: 'Nunito, Arial, sans-serif', color: '#DAA520',
      fontStyle: 'bold', backgroundColor: '#1a1a3a', padding: { x: 12, y: 4 }
    }).setOrigin(0.5);

    this.add.text(400, 46, `Altın: ${formatGold(ps.gold)}`, {
      fontSize: '16px', fontFamily: 'Nunito, Arial, sans-serif', color: '#FFD700', fontStyle: 'bold'
    }).setOrigin(0.5);

    // Recipe list with categories
    let yPos = 70;
    const categories = cs.getCategories();

    categories.forEach(cat => {
      const recipes = cs.getRecipesByCategory(cat);
      if (recipes.length === 0) return;

      // Category header
      const isOpen = this._openCraftCat === cat;
      const header = this.add.text(30, yPos, `${isOpen ? '▼' : '▶'} ${cat} (${recipes.length})`, {
        fontSize: '16px', fontFamily: 'Nunito, Arial, sans-serif', color: '#c0a0e0', fontStyle: 'bold'
      }).setInteractive({ useHandCursor: true });
      header.on('pointerdown', () => {
        this._openCraftCat = this._openCraftCat === cat ? null : cat;
        this.drawCrafting();
      });
      yPos += 26;

      if (!isOpen) return;

      recipes.forEach(recipe => {
        const resultItem = ITEMS[recipe.result];
        if (!resultItem) return;

        const matStatus = cs.getMaterialStatus(recipe);
        const canCraft = cs.canCraft(recipe.id);

        // Recipe row background
        const rowBg = this.add.rectangle(400, yPos + 18, 740, 38, 0x1a1a2a, 0.6);

        // Result item name + count
        const resultName = `${resultItem.name}${recipe.count > 1 ? ' x' + recipe.count : ''}`;
        this.add.text(40, yPos + 8, resultName, {
          fontSize: '14px', fontFamily: 'Nunito, Arial, sans-serif',
          color: canCraft.can ? '#90ee90' : '#aaa', fontStyle: 'bold'
        });

        // Materials
        const matText = matStatus.map(m => {
          const color = m.enough ? '#88ff88' : '#ff6666';
          return `${m.name}: ${m.have}/${m.required}`;
        }).join('  |  ');

        this.add.text(40, yPos + 24, matText, {
          fontSize: '11px', fontFamily: 'Nunito, Arial, sans-serif', color: '#888'
        });

        // Level requirement
        if (ps.level < recipe.minLevel) {
          this.add.text(600, yPos + 8, `Lv.${recipe.minLevel}`, {
            fontSize: '12px', fontFamily: 'Nunito, Arial, sans-serif', color: '#ff6666'
          });
        }

        // Craft button
        const craftBtn = this.add.text(700, yPos + 14, 'Üret', {
          fontSize: '14px', fontFamily: 'Nunito, Arial, sans-serif',
          color: canCraft.can ? '#90ee90' : '#555',
          backgroundColor: canCraft.can ? '#1a3a1a' : '#1a1a1a',
          padding: { x: 10, y: 4 }, fontStyle: 'bold'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        craftBtn.on('pointerdown', () => {
          const result = cs.craft(recipe.id);
          if (result.can) {
            const uiScene = this.scene.get('UIScene');
            if (uiScene) uiScene.showNotification(result.message);
          }
          this.drawCrafting(); // Refresh
        });

        yPos += 42;
      });
    });

    // Exit button
    const exitBtn = this.add.text(400, 564, 'Çık [ESC]', {
      fontSize: '18px', fontFamily: 'Nunito, Arial, sans-serif', color: '#ff8888',
      backgroundColor: '#2a1a1a', padding: { x: 20, y: 8 }, fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    exitBtn.on('pointerdown', () => this.exitShop());
    this.input.keyboard.once('keydown-ESC', () => this.exitShop());

    // Tooltip
    this.add.text(400, 542, 'Malzeme topla → tarif kilidi aç → üret!', {
      fontSize: '12px', fontFamily: 'Nunito, Arial, sans-serif', color: '#555'
    }).setOrigin(0.5);
  }
}
