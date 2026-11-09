import Phaser from 'phaser';
import { MenuScene } from './scenes/MenuScene.js';
import { MainScene } from './scenes/MainScene.js';

if (typeof window !== 'undefined' && !window.Phaser) {
    window.Phaser = Phaser;
}

const config = {
    type: Phaser.WEBGL,
    width: 800,
    height: 600,
    backgroundColor: '#090a10',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 850 },
            debug: false
        }
    },
    scene: [MenuScene, MainScene]
};

const game = new Phaser.Game(config);

export { MenuScene, MainScene, game };
export default game;
