import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { OverworldScene } from './scenes/OverworldScene.js';
import { DungeonScene } from './scenes/DungeonScene.js';
import { HomeScene } from './scenes/HomeScene.js';
import { ShopScene } from './scenes/ShopScene.js';
import { UIScene } from './scenes/UIScene.js';
import { LabyrinthScene } from './scenes/LabyrinthScene.js';

// Disable right-click context menu on canvas
document.addEventListener('contextmenu', e => e.preventDefault());

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: document.body,
  pixelArt: true,
  input: { mouse: { preventDefaultDown: true } },
  roundPixels: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [BootScene, PreloadScene, OverworldScene, DungeonScene, LabyrinthScene, HomeScene, ShopScene, UIScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

const game = new Phaser.Game(config);
window.__phaserGame = game;
