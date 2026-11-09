import { PERK_POOL } from '../config/perks.js';
import { GameStorage } from '../services/GameStorage.js';

export class ModalOverlays {
    constructor(scene) {
        this.scene = scene;
        this.perkUiContainer = null;
        this.pauseUiContainer = null;
        this.gameOverContainer = null;
    }

    destroyPerkScreen() {
        if (this.perkUiContainer) {
            this.perkUiContainer.destroy();
            this.perkUiContainer = null;
        }
    }

    destroyPauseOverlay() {
        if (this.pauseUiContainer) {
            this.pauseUiContainer.destroy();
            this.pauseUiContainer = null;
        }
    }

    destroyGameOver() {
        if (this.gameOverContainer) {
            this.gameOverContainer.destroy();
            this.gameOverContainer = null;
        }
    }

    showPerkSelectionScreen() {
        this.destroyPerkScreen();

        const scene = this.scene;
        this.perkUiContainer = scene.add.container(0, 0).setScrollFactor(0).setDepth(200);

        const overlay = scene.add.rectangle(400, 300, 800, 600, 0x05050a, 0.84);
        this.perkUiContainer.add(overlay);

        const isBossWave = scene.wave % 5 === 0;
        const headerText = isBossWave
            ? `🏆 БОСС ВОЛНЫ ${scene.wave} ПОВЕРЖЕН! 🏆`
            : `ВОЛНА ${scene.wave} ЗАЧИЩЕНА!`;

        const title = scene.add.text(400, 85, headerText, {
            fontSize: '28px',
            fontFamily: 'monospace',
            fontStyle: 'bold',
            color: isBossWave ? '#ffcc00' : '#00ffcc',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        const subtitle = scene.add.text(400, 128, 'Выберите 1 улучшение (Клик мышью или клавиши [1], [2], [3]):', {
            fontSize: '15px',
            fontFamily: 'monospace',
            color: '#dddddd'
        }).setOrigin(0.5);

        this.perkUiContainer.add([title, subtitle]);

        const shuffled = Phaser.Utils.Array.Shuffle([...PERK_POOL]);
        scene.currentPerkChoices = shuffled.slice(0, 3);

        const cardWidth = 225;
        const cardHeight = 270;
        const spacing = 248;
        const startX = 400 - spacing;
        const cardY = 310;

        scene.currentPerkChoices.forEach((perk, idx) => {
            const cx = startX + idx * spacing;
            const currentLvl = (scene.perkLevels && scene.perkLevels[perk.id]) || 0;

            const cardBg = scene.add.rectangle(cx, cardY, cardWidth, cardHeight, 0x161824, 0.96)
                .setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(perk.color).color)
                .setInteractive({ useHandCursor: true });

            const keyBadge = scene.add.text(cx, cardY - 105, `[ Клавиша ${idx + 1} ]`, {
                fontSize: '13px',
                fontFamily: 'monospace',
                color: '#aaaaaa'
            }).setOrigin(0.5);

            const perkTitle = scene.add.text(cx, cardY - 62, perk.title, {
                fontSize: '17px',
                fontFamily: 'monospace',
                fontStyle: 'bold',
                color: perk.color,
                align: 'center',
                wordWrap: { width: cardWidth - 20 }
            }).setOrigin(0.5);

            const lvlBadge = scene.add.text(cx, cardY - 22, `Уровень: ${currentLvl} -> ${currentLvl + 1}`, {
                fontSize: '13px',
                fontFamily: 'monospace',
                color: '#ffffff',
                backgroundColor: '#00000088',
                padding: { x: 6, y: 2 }
            }).setOrigin(0.5);

            const descText = scene.add.text(cx, cardY + 42, perk.desc, {
                fontSize: '13px',
                fontFamily: 'monospace',
                color: '#cccccc',
                align: 'center',
                lineSpacing: 6,
                wordWrap: { width: cardWidth - 24 }
            }).setOrigin(0.5);

            const btnLabel = scene.add.text(cx, cardY + 108, 'ВЫБРАТЬ', {
                fontSize: '15px',
                fontFamily: 'monospace',
                fontStyle: 'bold',
                color: '#111111',
                backgroundColor: perk.color,
                padding: { x: 18, y: 6 }
            }).setOrigin(0.5);

            cardBg.on('pointerover', () => {
                cardBg.setFillStyle(0x25293e, 1);
                cardBg.setScale(1.04);
            });
            cardBg.on('pointerout', () => {
                cardBg.setFillStyle(0x161824, 0.96);
                cardBg.setScale(1.0);
            });
            cardBg.on('pointerdown', () => {
                scene.selectPerk(idx);
            });

            this.perkUiContainer.add([cardBg, keyBadge, perkTitle, lvlBadge, descText, btnLabel]);
        });
    }

    showPauseOverlay() {
        this.destroyPauseOverlay();

        const scene = this.scene;
        this.pauseUiContainer = scene.add.container(0, 0).setScrollFactor(0).setDepth(250);
        const bg = scene.add.rectangle(400, 300, 800, 600, 0x05060c, 0.82);
        const panel = scene.add.rectangle(400, 300, 400, 310, 0x141829, 0.96).setStrokeStyle(3, 0x00ffcc);

        const title = scene.add.text(400, 185, 'ПАУЗА', {
            fontSize: '30px',
            fontFamily: 'monospace',
            fontStyle: 'bold',
            color: '#00ffcc'
        }).setOrigin(0.5);

        const sub = scene.add.text(400, 220, `Добыто за вылазку: +${scene.runCreditsEarned} КР`, {
            fontSize: '14px',
            fontFamily: 'monospace',
            color: '#ffd700'
        }).setOrigin(0.5);

        const makeBtn = (y, label, color, callback) => {
            const btn = scene.add.rectangle(400, y, 280, 44, 0x222842, 1)
                .setStrokeStyle(2, color)
                .setInteractive({ useHandCursor: true });
            const txt = scene.add.text(400, y, label, {
                fontSize: '14px',
                fontFamily: 'monospace',
                fontStyle: 'bold',
                color: '#ffffff'
            }).setOrigin(0.5);
            btn.on('pointerover', () => btn.setFillStyle(0x323b60, 1));
            btn.on('pointerout', () => btn.setFillStyle(0x222842, 1));
            btn.on('pointerdown', callback);
            return [btn, txt];
        };

        const [b1, t1] = makeBtn(270, '▶ ПРОДОЛЖИТЬ [ESC]', 0x00ffcc, () => scene.togglePauseMenu());
        const [b2, t2] = makeBtn(330, '↻ НАЧАТЬ ЗАНОВО [R]', 0xffcc00, () => {
            GameStorage.saveRun(scene.wave, scene.kills);
            scene.scene.restart({ mode: scene.gameMode });
        });
        const [b3, t3] = makeBtn(390, '🛒 В МАГАЗИН И МЕНЮ [M]', 0xff3366, () => {
            GameStorage.saveRun(scene.wave, scene.kills);
            scene.scene.start('MenuScene');
        });

        this.pauseUiContainer.add([bg, panel, title, sub, b1, t1, b2, t2, b3, t3]);
    }

    showGameOver() {
        this.destroyGameOver();

        const scene = this.scene;
        const stats = GameStorage.getStats();

        this.gameOverContainer = scene.add.container(0, 0).setScrollFactor(0).setDepth(260);
        const bg = scene.add.rectangle(400, 300, 800, 600, 0x080306, 0.88);
        const card = scene.add.rectangle(400, 300, 500, 350, 0x18121e, 0.96).setStrokeStyle(3, 0xff2255);

        const title = scene.add.text(400, 168, '💀 БОЕЦ ПОВЕРЖЕН 💀', {
            fontSize: '28px',
            fontFamily: 'monospace',
            fontStyle: 'bold',
            color: '#ff2255'
        }).setOrigin(0.5);

        const summary =
            `Достигнутая волна: ${scene.wave} (Рекорд: ${stats.bestWave})\n` +
            `Уничтожено врагов: ${scene.kills} (Рекорд: ${stats.bestKills})\n` +
            `Добыто кредитов за бой: +${scene.runCreditsEarned} КР\n` +
            `Всего на счету: ${stats.credits} КР`;

        const statsText = scene.add.text(400, 260, summary, {
            fontSize: '15px',
            fontFamily: 'monospace',
            color: '#eeeeee',
            align: 'center',
            lineSpacing: 8
        }).setOrigin(0.5);

        const retryBtn = scene.add.rectangle(290, 395, 195, 46, 0x00ffcc, 1)
            .setInteractive({ useHandCursor: true });
        const retryTxt = scene.add.text(290, 395, 'ЗАНОВО [R]', {
            fontSize: '15px',
            fontFamily: 'monospace',
            fontStyle: 'bold',
            color: '#090a10'
        }).setOrigin(0.5);

        const menuBtn = scene.add.rectangle(510, 395, 195, 46, 0x282c44, 1)
            .setStrokeStyle(2, 0xffd700)
            .setInteractive({ useHandCursor: true });
        const menuTxt = scene.add.text(510, 395, 'МАГАЗИН [M]', {
            fontSize: '15px',
            fontFamily: 'monospace',
            fontStyle: 'bold',
            color: '#ffd700'
        }).setOrigin(0.5);

        retryBtn.on('pointerdown', () => scene.scene.restart({ mode: scene.gameMode }));
        menuBtn.on('pointerdown', () => scene.scene.start('MenuScene'));

        this.gameOverContainer.add([bg, card, title, statsText, retryBtn, retryTxt, menuBtn, menuTxt]);
    }
}

export default ModalOverlays;
