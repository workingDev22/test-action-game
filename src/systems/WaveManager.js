import { CyberAudio } from '../services/CyberAudio.js';
import { GameStorage } from '../services/GameStorage.js';

export class WaveManager {
    constructor(scene) {
        this.scene = scene;
        this.wave = 0;
        this.enemiesRemaining = 0;
        this.enemiesToSpawn = 0;
        this.maxConcurrentBots = 5;
        this.isIntermission = false;

        this.syncToScene();

        this.spawnTimer = this.scene.time.addEvent({
            delay: 1100,
            loop: true,
            callback: () => {
                if (this.isIntermission || this.scene.isPaused || this.scene.isGameOver) return;
                const botsGroup = this.scene.botManager ? this.scene.botManager.bots : this.scene.bots;
                if (!botsGroup) return;

                const activeCount = botsGroup.countActive(true);
                if (this.enemiesToSpawn > 0 && activeCount < this.maxConcurrentBots) {
                    this.enemiesToSpawn--;
                    this.syncToScene();
                    const isElite = this.wave >= 3 && this.wave % 5 !== 0 && this.enemiesToSpawn === 0;
                    const spawnX = Phaser.Math.Between(180, this.scene.worldWidth - 180);
                    if (this.scene.botManager) {
                        this.scene.botManager.spawnBot(spawnX, 110, isElite);
                    } else if (this.scene.spawnBot) {
                        this.scene.spawnBot(spawnX, 110, isElite);
                    }
                }
            }
        });
    }

    syncToScene() {
        this.scene.wave = this.wave;
        this.scene.enemiesRemaining = this.enemiesRemaining;
        this.scene.enemiesToSpawn = this.enemiesToSpawn;
        this.scene.maxConcurrentBots = this.maxConcurrentBots;
        this.scene.isIntermission = this.isIntermission;
    }

    skipToBossWave() {
        if (this.isIntermission || this.scene.isPaused || this.scene.isGameOver) return;

        const botsGroup = this.scene.botManager ? this.scene.botManager.bots : this.scene.bots;
        if (botsGroup) {
            botsGroup.getChildren().slice().forEach((b) => {
                const gun = b.getData('gunSprite');
                if (gun) gun.destroy();
                b.destroy();
            });
        }

        this.scene.activeBoss = null;
        if (this.scene.botManager) this.scene.botManager.activeBoss = null;

        const nextBossWave = Math.ceil((this.wave + 1) / 5) * 5;
        this.wave = nextBossWave - 1;
        this.syncToScene();
        this.startNextWave();
    }

    startNextWave() {
        this.wave++;
        this.isIntermission = false;
        this.syncToScene();
        GameStorage.saveRun(this.wave, 0);

        if (this.wave % 5 === 0) {
            const supportBotsCount = Math.min(2, Math.floor(this.wave / 5));
            this.enemiesRemaining = 1 + supportBotsCount;
            this.enemiesToSpawn = supportBotsCount;
            this.syncToScene();

            CyberAudio.bossAlert();
            this.scene.announceBanner(`⚠ ВОЛНА ${this.wave}: БИТВА С БОССОМ! ⚠`, '#ff2255');
            this.scene.cameras.main.shake(300, 0.01);

            if (this.scene.botManager) {
                this.scene.botManager.spawnBoss(this.scene.worldWidth / 2, 160);
            } else if (this.scene.spawnBoss) {
                this.scene.spawnBoss(this.scene.worldWidth / 2, 160);
            }
            this.scene.updateHud();
            this.scene.updateBossHud();
            return;
        }

        this.scene.hideBossHud();

        const totalWaveEnemies = 3 + this.wave * 2;
        this.enemiesRemaining = totalWaveEnemies;
        this.enemiesToSpawn = totalWaveEnemies;
        this.syncToScene();

        this.scene.announceBanner(`ВОЛНА ${this.wave} (${totalWaveEnemies} ВРАГОВ)`, '#00ffcc');
        this.scene.updateHud();

        const initialBatch = Math.min(this.maxConcurrentBots, this.enemiesToSpawn);
        for (let i = 0; i < initialBatch; i++) {
            this.enemiesToSpawn--;
            const sx = Phaser.Math.Between(220, this.scene.worldWidth - 220);
            const sy = Phaser.Math.Between(120, 350);
            if (this.scene.botManager) {
                this.scene.botManager.spawnBot(sx, sy, false);
            } else if (this.scene.spawnBot) {
                this.scene.spawnBot(sx, sy, false);
            }
        }
        this.syncToScene();
    }

    onWaveCleared() {
        if (this.scene.isGameOver) return;
        this.isIntermission = true;
        this.syncToScene();

        if (this.scene.worldUi) {
            this.scene.worldUi.clear();
        } else if (this.scene.worldUiGfx) {
            this.scene.worldUiGfx.clear();
        }

        this.scene.hideBossHud();

        let autoCollected = 0;
        if (this.scene.creditsGroup) {
            this.scene.creditsGroup.getChildren().slice().forEach((chip) => {
                if (chip && chip.active) {
                    autoCollected += chip.getData('value') || 5;
                    chip.destroy();
                }
            });
        }

        if (autoCollected > 0) {
            this.scene.runCreditsEarned = (this.scene.runCreditsEarned || 0) + autoCollected;
            GameStorage.addCredits(autoCollected);
            if (this.scene.particles) {
                this.scene.particles.showFloatingText(this.scene.player.x, this.scene.player.y - 25, `+${autoCollected} КР (Сбор волны)`, '#ffd700');
            } else if (this.scene.showFloatingText) {
                this.scene.showFloatingText(this.scene.player.x, this.scene.player.y - 25, `+${autoCollected} КР (Сбор волны)`, '#ffd700');
            }
        }

        CyberAudio.powerup();
        this.scene.physics.pause();
        if (this.scene.player) {
            this.scene.player.setVelocity(0, 0);
        }

        if (this.scene.bullets) this.scene.bullets.clear(true, true);
        if (this.scene.botBullets) this.scene.botBullets.clear(true, true);
        if (this.scene.grenades) this.scene.grenades.clear(true, true);

        this.scene.playerHp = Math.min(this.scene.playerMaxHp, this.scene.playerHp + 25);
        if (this.scene.playerMaxShield > 0) {
            this.scene.playerShield = this.scene.playerMaxShield;
        }

        if (this.scene.playerEntity) {
            this.scene.playerEntity.hp = this.scene.playerHp;
            this.scene.playerEntity.shield = this.scene.playerShield;
            this.scene.playerEntity.syncToScene();
        }

        this.scene.updateHud();
        this.scene.showPerkSelectionScreen();
    }
}

export default WaveManager;
