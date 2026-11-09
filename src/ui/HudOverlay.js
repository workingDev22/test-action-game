import { PERK_POOL } from '../config/perks.js';
import { GameStorage } from '../services/GameStorage.js';

export class HudOverlay {
    constructor(scene) {
        this.scene = scene;

        this.hudText = scene.add.text(16, 10, '', {
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#ffffff',
            backgroundColor: '#000000cc',
            padding: { x: 8, y: 5 }
        }).setScrollFactor(0).setDepth(100);

        this.perksHudText = scene.add.text(16, 40, 'Перки: Нет (зачистите волну)', {
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#00ffcc',
            backgroundColor: '#000000aa',
            padding: { x: 8, y: 4 }
        }).setScrollFactor(0).setDepth(100);

        this.menuBtn = scene.add.text(784, 10, '[ESC] Меню', {
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#ffcc00',
            backgroundColor: '#000000cc',
            padding: { x: 8, y: 5 }
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(100).setInteractive({ useHandCursor: true });
        this.menuBtn.on('pointerdown', () => scene.togglePauseMenu());

        // UI шкалы Босса
        this.bossHudContainer = scene.add.container(0, 0).setScrollFactor(0).setDepth(140).setVisible(false);
        this.bossHudGraphics = scene.add.graphics();
        this.bossTitleText = scene.add.text(400, 74, '', {
            fontSize: '15px',
            fontFamily: 'monospace',
            fontStyle: 'bold',
            color: '#ff3366',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        this.bossHpValueText = scene.add.text(400, 96, '', {
            fontSize: '12px',
            fontFamily: 'monospace',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        this.bossHudContainer.add([this.bossHudGraphics, this.bossTitleText, this.bossHpValueText]);

        this.controlsHint = scene.add.text(
            16,
            568,
            'WASD: Бег/Прыжок | S: Вниз | SHIFT: Рывок | [Q]: Ульта | Мышь: Огонь | [B]: Босс | [V]: Звук | [ESC]: Пауза',
            {
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#aaaaaa',
                backgroundColor: '#00000099',
                padding: { x: 8, y: 4 }
            }
        ).setScrollFactor(0).setDepth(100);

        this.streakBanner = scene.add.text(400, 145, '', {
            fontSize: '26px',
            fontFamily: 'monospace',
            fontStyle: 'bold',
            color: '#ffcc00',
            stroke: '#000000',
            strokeThickness: 5
        }).setOrigin(0.5).setScrollFactor(0).setDepth(150).setAlpha(0);
    }

    updateHud() {
        const scene = this.scene;
        const wepName = scene.currentWeapon ? scene.currentWeapon.name : 'None';
        const shieldStr = scene.playerMaxShield > 0
            ? ` | Щит: ${Math.floor(scene.playerShield)}/${scene.playerMaxShield}`
            : '';
        const livesStr = scene.gameMode === 'roguelike' ? ` | ♥x${scene.lives}` : '';
        const comboStr = scene.streak > 1 ? ` | 🔥x${scene.streak}` : '';
        const totalCredits = GameStorage.getStats().credits;

        this.hudText.setText(
            `Волна: ${scene.wave} (${scene.enemiesRemaining}) | HP: ${Math.max(0, Math.ceil(scene.playerHp))}/${scene.playerMaxHp}${shieldStr}${livesStr}${comboStr} | 💰 ${totalCredits} КР | ${wepName}`
        );

        const activePerks = Object.entries(scene.perkLevels || {})
            .map(([id, lvl]) => {
                const p = PERK_POOL.find((item) => item.id === id);
                return `${p ? p.title : id} x${lvl}`;
            })
            .join(' | ');

        this.perksHudText.setText(`Перки: ${activePerks || 'Нет (зачистите волну)'}`);
    }

    updateBossHud() {
        const scene = this.scene;
        if (!scene.activeBoss || !scene.activeBoss.active) {
            this.bossHudContainer.setVisible(false);
            return;
        }

        this.bossHudContainer.setVisible(true);
        const hp = Math.max(0, Math.ceil(scene.activeBoss.getData('hp')));
        const maxHp = scene.activeBoss.getData('maxHp');
        const enraged = scene.activeBoss.getData('enraged');
        const name = scene.activeBoss.getData('bossName');
        const pct = Phaser.Math.Clamp(hp / maxHp, 0, 1);

        const phaseLabel = enraged ? ' [ФАЗА 2: ЯРОСТЬ!]' : ' [ФАЗА 1]';
        this.bossTitleText.setText(`☠ ${name}${phaseLabel} ☠`);
        this.bossTitleText.setColor(enraged ? '#ff00ff' : '#ff3366');
        this.bossHpValueText.setText(`${hp} / ${maxHp} HP`);

        const barW = 520;
        const barH = 16;
        const bx = 400 - barW / 2;
        const by = 88;

        this.bossHudGraphics.clear();
        this.bossHudGraphics.fillStyle(0x090912, 0.92);
        this.bossHudGraphics.fillRect(bx - 3, by - 3, barW + 6, barH + 6);
        this.bossHudGraphics.lineStyle(2, enraged ? 0xff00ff : 0xff2255, 1);
        this.bossHudGraphics.strokeRect(bx - 3, by - 3, barW + 6, barH + 6);

        this.bossHudGraphics.fillStyle(0x330011, 0.9);
        this.bossHudGraphics.fillRect(bx, by, barW, barH);

        const fillColor = enraged ? 0xd900ff : 0xff1144;
        this.bossHudGraphics.fillStyle(fillColor, 1);
        this.bossHudGraphics.fillRect(bx, by, Math.round(barW * pct), barH);

        this.bossHudGraphics.fillStyle(0xffffff, 0.25);
        this.bossHudGraphics.fillRect(bx, by, Math.round(barW * pct), 4);
    }

    hideBossHud() {
        this.bossHudContainer.setVisible(false);
    }

    announceBanner(text, color = '#ffcc00') {
        this.streakBanner.setText(text);
        this.streakBanner.setColor(color);
        this.streakBanner.setAlpha(1);
        this.streakBanner.setScale(0.65);
        this.scene.tweens.killTweensOf(this.streakBanner);
        this.scene.tweens.add({
            targets: this.streakBanner,
            scale: 1.12,
            alpha: 0,
            duration: 1800,
            ease: 'Power2'
        });
    }
}

export default HudOverlay;
