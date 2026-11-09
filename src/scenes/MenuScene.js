import { ensureGameTextures, attachNeonBloom } from '../services/TextureGenerator.js';
import { CyberAudio } from '../services/CyberAudio.js';
import { GameStorage } from '../services/GameStorage.js';
import { META_UPGRADES } from '../config/metaUpgrades.js';

export class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    preload() {
        ensureGameTextures(this);
    }

    create() {
        attachNeonBloom(this.cameras.main);

        const stats = GameStorage.getStats();
        this.selectedMode = stats.mode || 'roguelike';

        // 1. Фон и неоновая кибер-сетка
        this.add.rectangle(400, 300, 800, 600, 0x090a10);
        const grid = this.add.graphics();
        grid.lineStyle(1, 0x1e2238, 0.7);
        for (let x = 0; x <= 800; x += 50) grid.lineBetween(x, 0, x, 600);
        for (let y = 0; y <= 600; y += 50) grid.lineBetween(0, y, 800, y);

        // GPU-частицы фона (Phaser 3.60+ / v4 API)
        this.add.particles(0, 0, 'particle', {
            x: { min: 0, max: 800 },
            y: 610,
            lifespan: 7500,
            speedY: { min: -55, max: -20 },
            speedX: { min: -20, max: 20 },
            scale: { start: 0.9, end: 0.2 },
            alpha: { start: 0.4, end: 0 },
            tint: [0x00ffcc, 0x0088ff, 0xff0055, 0xffcc00],
            frequency: 180,
            blendMode: 'ADD'
        });

        // 2. Заголовок игры
        this.add.text(400, 34, 'CYBER ARENA: OVERDRIVE', {
            fontSize: '30px',
            fontFamily: 'monospace',
            fontStyle: 'bold',
            color: '#00ffcc',
            stroke: '#000000',
            strokeThickness: 5
        }).setOrigin(0.5);

        // 3. Верхняя панель баланса кредитов и рекордов
        this.add.rectangle(400, 76, 740, 36, 0x131626, 0.95).setStrokeStyle(2, 0x2e3658);

        this.walletText = this.add.text(38, 76, '', {
            fontSize: '15px',
            fontFamily: 'monospace',
            fontStyle: 'bold',
            color: '#ffd700'
        }).setOrigin(0, 0.5);

        this.recordsText = this.add.text(762, 76, '', {
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#b0c0de'
        }).setOrigin(1, 0.5);

        // 4. Заголовок магазина + Кнопка сброса прокачки
        this.add.text(35, 114, '⚡ МАГАЗИН ИМПЛАНТОВ (ПОСТОЯННЫЕ БОНУСЫ):', {
            fontSize: '13px',
            fontFamily: 'monospace',
            fontStyle: 'bold',
            color: '#00ffcc'
        }).setOrigin(0, 0.5);

        const refundBtn = this.add.text(765, 114, '[ ↺ Сброс (100% возврат) ]', {
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#ff8866',
            backgroundColor: '#1a1c2e',
            padding: { x: 8, y: 3 }
        }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });

        refundBtn.on('pointerover', () => refundBtn.setColor('#ffffff'));
        refundBtn.on('pointerout', () => refundBtn.setColor('#ff8866'));
        refundBtn.on('pointerdown', () => {
            const refunded = GameStorage.refundUpgrades();
            if (refunded > 0) {
                CyberAudio.powerup();
                this.showMenuToast(`Возвращено +${refunded} КР!`, '#00ffcc');
                this.refreshShopUI();
            }
        });

        // 5. Контейнер карточек магазина (2x2 сетка)
        this.shopContainer = this.add.container(0, 0);
        this.refreshShopUI();

        // 6. Переключатель режима игры
        const modeBtnBg = this.add.rectangle(400, 392, 540, 36, 0x192036, 0.95)
            .setStrokeStyle(2, 0x0088ff)
            .setInteractive({ useHandCursor: true });

        this.modeBtnText = this.add.text(400, 392, '', {
            fontSize: '13px',
            fontFamily: 'monospace',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.updateModeLabel();

        modeBtnBg.on('pointerover', () => modeBtnBg.setFillStyle(0x243052, 1));
        modeBtnBg.on('pointerout', () => modeBtnBg.setFillStyle(0x192036, 0.95));
        modeBtnBg.on('pointerdown', () => {
            CyberAudio.pickup();
            this.selectedMode = this.selectedMode === 'roguelike' ? 'endless' : 'roguelike';
            GameStorage.setMode(this.selectedMode);
            this.updateModeLabel();
        });

        // 7. Кнопка СТАРТ и мини-диорама героя
        this.heroPreview = this.add.sprite(145, 456, 'player');
        this.heroGun = this.add.sprite(157, 456, 'gun_indicator').setTint(0xff3300);
        this.previewDrone = this.add.sprite(120, 436, 'drone_bot');
        this.previewShield = this.add.circle(145, 456, 22, 0x0088ff, 0.18).setStrokeStyle(2, 0x00ccff, 0.75);
        this.bossPreview = this.add.sprite(655, 452, 'boss_bot').setFlipX(true).setScale(0.78);
        this.droneAngle = 0;

        const startBtn = this.add.rectangle(400, 456, 330, 52, 0x00ffcc, 1)
            .setStrokeStyle(3, 0xffffff)
            .setInteractive({ useHandCursor: true });

        this.add.text(400, 456, '▶ ВСТУПИТЬ В БОЙ [SPACE]', {
            fontSize: '19px',
            fontFamily: 'monospace',
            fontStyle: 'bold',
            color: '#090a10'
        }).setOrigin(0.5);

        startBtn.on('pointerover', () => {
            startBtn.setScale(1.04);
            startBtn.setFillStyle(0x55ffdd, 1);
        });
        startBtn.on('pointerout', () => {
            startBtn.setScale(1.0);
            startBtn.setFillStyle(0x00ffcc, 1);
        });
        startBtn.on('pointerdown', () => this.startGame());

        // 8. Нижняя панель подсказок
        this.add.rectangle(400, 542, 740, 74, 0x0e101a, 0.92).setStrokeStyle(1, 0x2a2f45);

        const controlsText =
            'УПРАВЛЕНИЕ: [WASD] Бег и 2x Прыжок | [S] Спрыгнуть вниз | [SHIFT] Рывок | [Мышь] Огонь | [V] Звук\n' +
            'ЭКОНОМИКА: Собирайте золотые чипы и держите серию убийств (Combo). Кредиты сохраняются!\n' +
            'ТЕСТОВЫЙ БОНУС: Нажмите клавишу [C] в меню, чтобы начислить +200 кредитов для теста магазина.';

        this.add.text(400, 542, controlsText, {
            fontSize: '11px',
            fontFamily: 'monospace',
            color: '#9aa7c2',
            align: 'center',
            lineSpacing: 5
        }).setOrigin(0.5);

        this.input.keyboard.once('keydown-SPACE', () => this.startGame());
        this.input.keyboard.once('keydown-ENTER', () => this.startGame());
        this.input.keyboard.on('keydown-C', () => {
            CyberAudio.pickup();
            GameStorage.addCredits(200);
            this.showMenuToast('+200 КР (Тестовый бонус)!', '#ffd700');
            this.refreshShopUI();
        });
    }

    refreshShopUI() {
        const stats = GameStorage.getStats();
        this.walletText.setText(`💰 КРЕДИТЫ: ${stats.credits} КР`);
        this.recordsText.setText(
            `🏆 Лучшая волна: ${stats.bestWave}  |  💀 Макс. фрагов: ${stats.bestKills}  |  Всего: ${stats.totalKills}`
        );

        this.shopContainer.removeAll(true);

        const cardW = 360;
        const cardH = 108;
        const positions = [
            { x: 210, y: 188 },
            { x: 590, y: 188 },
            { x: 210, y: 308 },
            { x: 590, y: 308 }
        ];

        META_UPGRADES.forEach((cfg, idx) => {
            const pos = positions[idx];
            const curLvl = stats.upgrades[cfg.id] || 0;
            const isMax = curLvl >= cfg.maxLevel;
            const cost = GameStorage.getUpgradeCost(cfg, curLvl);
            const canAfford = !isMax && stats.credits >= cost;
            const accentColor = Phaser.Display.Color.HexStringToColor(cfg.color).color;

            const cardBg = this.add.rectangle(pos.x, pos.y, cardW, cardH, 0x141726, 0.96)
                .setStrokeStyle(2, isMax ? 0xffcc00 : accentColor);

            const titleTxt = this.add.text(pos.x - cardW / 2 + 14, pos.y - 38, cfg.title, {
                fontSize: '15px',
                fontFamily: 'monospace',
                fontStyle: 'bold',
                color: cfg.color
            }).setOrigin(0, 0.5);

            const bars = '■'.repeat(curLvl) + '□'.repeat(cfg.maxLevel - curLvl);
            const lvlTxt = this.add.text(pos.x + cardW / 2 - 14, pos.y - 38, `УР. [${bars}]`, {
                fontSize: '12px',
                fontFamily: 'monospace',
                color: isMax ? '#ffd700' : '#cccccc'
            }).setOrigin(1, 0.5);

            const descTxt = this.add.text(pos.x - cardW / 2 + 14, pos.y - 4, cfg.getDesc(curLvl), {
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#bfcbe0',
                lineSpacing: 3
            }).setOrigin(0, 0.5);

            const btnLabelStr = isMax ? '✓ МАКСИМУМ' : `КУПИТЬ: ${cost} КР`;
            const btnFill = isMax ? 0x223322 : (canAfford ? 0x1f3b34 : 0x252533);
            const btnBorder = isMax ? 0xffd700 : (canAfford ? 0x00ffcc : 0x555566);

            const buyBtn = this.add.rectangle(pos.x, pos.y + 34, cardW - 28, 26, btnFill, 1)
                .setStrokeStyle(1.5, btnBorder);

            const buyTxt = this.add.text(pos.x, pos.y + 34, btnLabelStr, {
                fontSize: '12px',
                fontFamily: 'monospace',
                fontStyle: 'bold',
                color: isMax ? '#ffd700' : (canAfford ? '#00ffcc' : '#777788')
            }).setOrigin(0.5);

            if (!isMax) {
                buyBtn.setInteractive({ useHandCursor: true });
                buyBtn.on('pointerover', () => {
                    if (canAfford) buyBtn.setFillStyle(0x2c594e, 1);
                });
                buyBtn.on('pointerout', () => {
                    buyBtn.setFillStyle(btnFill, 1);
                });
                buyBtn.on('pointerdown', () => {
                    if (GameStorage.buyUpgrade(cfg.id)) {
                        CyberAudio.powerup();
                        this.showMenuToast(`Улучшено: ${cfg.title}!`, cfg.color);
                        this.refreshShopUI();
                    } else {
                        CyberAudio.playTone(150, 90, 0.12, 'sawtooth', 0.08);
                        this.showMenuToast('Недостаточно кредитов!', '#ff3366');
                    }
                });
            }

            this.shopContainer.add([cardBg, titleTxt, lvlTxt, descTxt, buyBtn, buyTxt]);
        });
    }

    showMenuToast(message, color = '#ffffff') {
        const txt = this.add.text(400, 114, message, {
            fontSize: '14px',
            fontFamily: 'monospace',
            fontStyle: 'bold',
            color: color,
            backgroundColor: '#000000dd',
            padding: { x: 10, y: 4 }
        }).setOrigin(0.5).setDepth(100);

        this.tweens.add({
            targets: txt,
            y: 92,
            alpha: 0,
            duration: 900,
            ease: 'Cubic.easeOut',
            onComplete: () => txt.destroy()
        });
    }

    updateModeLabel() {
        if (this.selectedMode === 'roguelike') {
            this.modeBtnText.setText('⚙ Режим: ВЫЖИВАНИЕ (3 Жизни • Таблица рекордов) [Сменить]');
            this.modeBtnText.setColor('#00ffcc');
        } else {
            this.modeBtnText.setText('⚙ Режим: ПЕСОЧНИЦА (Бесконечные возрождения) [Сменить]');
            this.modeBtnText.setColor('#ffcc00');
        }
    }

    startGame() {
        CyberAudio.powerup();
        this.scene.start('MainScene', { mode: this.selectedMode });
    }

    update(time, delta) {
        const dt = delta / 1000;
        this.droneAngle += 2.7 * dt;
        this.previewDrone.setPosition(
            this.heroPreview.x + Math.cos(this.droneAngle) * 32,
            this.heroPreview.y - 12 + Math.sin(this.droneAngle) * 10
        );
    }
}

export default MenuScene;
