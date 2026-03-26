import { PlayerState } from './PlayerState.js';
import { RECIPES, RECIPE_CATEGORIES } from '../data/recipes.js';
import { ITEMS } from '../data/items.js';

export class CraftingSystem {
  constructor() {
    this.ps = PlayerState.getInstance();
  }

  getAvailableRecipes() {
    return RECIPES.filter(r => this.ps.level >= r.minLevel);
  }

  getRecipesByCategory(category) {
    return this.getAvailableRecipes().filter(r => r.category === category);
  }

  getCategories() {
    return RECIPE_CATEGORIES;
  }

  canCraft(recipeId) {
    const recipe = RECIPES.find(r => r.id === recipeId);
    if (!recipe) return { can: false, reason: 'Tarif bulunamadı' };
    if (this.ps.level < recipe.minLevel) return { can: false, reason: `Lv.${recipe.minLevel} gerekli` };

    for (const mat of recipe.materials) {
      const have = this.ps.countItem(mat.item);
      if (have < mat.count) {
        const itemName = ITEMS[mat.item]?.name || mat.item;
        return { can: false, reason: `Yetersiz ${itemName} (${have}/${mat.count})` };
      }
    }

    // Check inventory space
    if (this.ps.getUsedSlots() >= this.ps.maxInventory) {
      return { can: false, reason: 'Envanter dolu' };
    }

    return { can: true };
  }

  getMaterialStatus(recipe) {
    return recipe.materials.map(mat => ({
      item: mat.item,
      name: ITEMS[mat.item]?.name || mat.item,
      required: mat.count,
      have: this.ps.countItem(mat.item),
      enough: this.ps.countItem(mat.item) >= mat.count
    }));
  }

  craft(recipeId) {
    const check = this.canCraft(recipeId);
    if (!check.can) return check;

    const recipe = RECIPES.find(r => r.id === recipeId);

    // Remove materials
    for (const mat of recipe.materials) {
      for (let i = 0; i < mat.count; i++) {
        this.ps.removeItem(mat.item);
      }
    }

    // Add result items
    for (let i = 0; i < recipe.count; i++) {
      this.ps.addItem(recipe.result);
    }

    const resultName = ITEMS[recipe.result]?.name || recipe.result;
    return { can: true, message: `${resultName} x${recipe.count} üretildi!` };
  }
}
