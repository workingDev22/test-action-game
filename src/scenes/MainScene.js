import Phaser from 'phaser';
import { WEAPONS } from '../config/weapons.js';
import { GameStorage } from '../services/GameStorage.js';
import { CyberAudio } from '../services/CyberAudio.js';
import { ensureGameTextures, attachNeonBloom } from '../services/TextureGenerator.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { WorldUiRenderer } from '../systems/WorldUiRenderer.js';
import { WaveManager } from '../systems/WaveManager.js';
import { HudOverlay } from '../ui/HudOverlay.js';
import { ModalOverlays } from '../ui/ModalOverlays.js';
import { Player } from '../entities/Player.js';
import { DroneManager } from '../entities/DroneManager.js';
import { BotManager } from '../entities/BotManager.js';

export class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
    }

    init(data) {
        this.gameMode = (data && data.mode) ? data.mode : GameStorage.getStats().mode;
    }

    preload() {
        ensureGameTextures(this);
    }

    create() {
        attachNeonBloom(this.cameras.main);

        this.worldWidth = 2000;
        this.worldHeight = 800;
        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

        const savedStats = GameStorage.getStats();
        const meta = savedStats.upgrades;
        this.metaDamageMult = 1 + (meta.weapons || 0) * 0.12;
        this.metaCreditMult = 1 + (meta.greed || 0) * 0.25;
        this.creditMagnetRadius = 125 + (meta.greed || 0) * 45;
        this.runCreditsEarned = 0;

        // Декоративная сетка арены
        const bgGrid = this.add.graphics();
        bgGrid.lineStyle(1, 0x222230, 0.6);
        for (let x = 0; x <= this.worldWidth; x += 80) {
            bgGrid.lineBetween(x, 0, x, this.worldHeight);
        }
        for (let y = 0; y <= this.worldHeight; y += 80) {
            bgGrid.lineBetween(0, y, this.worldWidth, y);
        }

        // 1. Системы эффектов и UI
        this.particles = new ParticleSystem(this);
        this.sparkEmitter = this.particles.sparkEmitter;
        this.explosionEmitter = this.particles.explosionEmitter;

        this.worldUi = new WorldUiRenderer(this);
        this.worldUiGfx = this.worldUi.gfx;

        this.hud = new HudOverlay(this);
        this.hudText = this.hud.hudText;
        this.perksHudText = this.hud.perksHudText;
        this.bossHudContainer = this.hud.bossHudContainer;
        this.bossHudGraphics = this.hud.bossHudGraphics;
        this.bossTitleText = this.hud.bossTitleText;
        this.bossHpValueText = this.hud.bossHpValueText;
        this.controlsHint = this.hud.controlsHint;
        this.streakBanner = this.hud.streakBanner;

        this.modals = new ModalOverlays(this);
        this.perkUiContainer = null;
        this.pauseUiContainer = null;
        this.gameOverContainer = null;

        // 2. Платформы и батуты
        this.platforms = this.physics.add.staticGroup();
        this.mainFloor = this.platforms.create(this.worldWidth / 2, this.worldHeight - 16, 'platform');
        this.mainFloor.setDisplaySize(this.worldWidth, 32).refreshBody();
        this.mainFloor.setData('isFloor', true);

        const layout = [
            { x: 260, y: 640, w: 220 },
            { x: 640, y: 540, w: 240 },
            { x: 1000, y: 620, w: 260 },
            { x: 1360, y: 540, w: 240 },
            { x: 1740, y: 640, w: 220 },
            { x: 420, y: 390, w: 200 },
            { x: 1000, y: 410, w: 320 },
            { x: 1580, y: 390, w: 200 },
            { x: 720, y: 240, w: 200 },
            { x: 1280, y: 240, w: 200 }
        ];

        layout.forEach((p) => {
            const plat = this.platforms.create(p.x, p.y, 'platform');
            plat.setDisplaySize(p.w, 28).refreshBody();
            plat.body.checkCollision.down = false;
            plat.body.checkCollision.left = false;
            plat.body.checkCollision.right = false;
        });

        this.jumpPads = this.physics.add.staticGroup();
        this.jumpPads.create(120, this.worldHeight - 39, 'jump_pad');
        this.jumpPads.create(1000, this.worldHeight - 39, 'jump_pad');
        this.jumpPads.create(1880, this.worldHeight - 39, 'jump_pad');

        // 3. Управление
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            dash: Phaser.Input.Keyboard.KeyCodes.SHIFT,
            bossSkip: Phaser.Input.Keyboard.KeyCodes.B,
            pause: Phaser.Input.Keyboard.KeyCodes.P,
            esc: Phaser.Input.Keyboard.KeyCodes.ESC,
            restart: Phaser.Input.Keyboard.KeyCodes.R,
            menu: Phaser.Input.Keyboard.KeyCodes.M,
            mute: Phaser.Input.Keyboard.KeyCodes.V,
            one: Phaser.Input.Keyboard.KeyCodes.ONE,
            two: Phaser.Input.Keyboard.KeyCodes.TWO,
            three: Phaser.Input.Keyboard.KeyCodes.THREE
        });

        // 4. Снаряды и выпадающие предметы
        this.bullets = this.physics.add.group({ allowGravity: false, maxSize: 160 });
        this.grenades = this.physics.add.group({ allowGravity: true, bounceX: 0.65, bounceY: 0.6 });
        this.creditsGroup = this.physics.add.group({ bounceX: 0.45, bounceY: 0.55 });

        // 5. Игрок
        this.playerEntity = new Player(this);
        this.player = this.playerEntity.sprite;

        // Платформенные коллизии игрока (с поддержкой спрыгивания вниз на S)
        this.physics.add.collider(
            this.player,
            this.platforms,
            null,
            (player, plat) => {
                if (plat.getData('isFloor')) return true;
                return this.time.now > (this.dropThroughUntil || 0);
            },
            this
        );

        this.physics.add.collider(this.bullets, this.platforms, (bullet) => {
            if (!bullet.active) return;
            const bx = bullet.x;
            const by = bullet.y;
            const dmg = bullet.getData('damage') || 20;
            this.createSpark(bx, by, bullet.tintTopLeft || 0xffff00, 5);
            if (this.perkStats && this.perkStats.explosiveLevel > 0) {
                this.triggerBulletMicroExplosion(bx, by, dmg);
            }
            bullet.destroy();
        });

        this.physics.add.collider(this.grenades, this.platforms);
        this.physics.add.collider(this.creditsGroup, this.platforms);
        this.physics.add.overlap(this.player, this.creditsGroup, this.collectCreditChip, null, this);

        // 6. Дроны и боты
        this.droneManager = new DroneManager(this);
        this.drones = this.droneManager.drones;

        this.botManager = new BotManager(this);
        this.bots = this.botManager.bots;
        this.botBullets = this.botManager.botBullets;
        this.physics.add.collider(this.bots, this.platforms);
        this.physics.add.collider(this.botBullets, this.platforms, (bullet) => {
            if (!bullet.active) return;
            this.createSpark(bullet.x, bullet.y, 0xff5500, 4);
            bullet.destroy();
        });

        // 7. Интерактивные объекты (оружие, аптечки, бочки)
        this.weaponBoxes = this.physics.add.group();
        this.physics.add.collider(this.weaponBoxes, this.platforms);
        [
            { x: 260, y: 580, type: 'Shotgun' },
            { x: 640, y: 480, type: 'Rifle' },
            { x: 1000, y: 350, type: 'Launcher' },
            { x: 720, y: 180, type: 'Sniper' },
            { x: 1280, y: 180, type: 'Plasma' },
            { x: 1580, y: 330, type: 'Rifle' }
        ].forEach((cfg) => this.createWeaponBox(cfg.x, cfg.y, cfg.type));
        this.physics.add.overlap(this.player, this.weaponBoxes, this.pickupWeapon, null, this);

        this.medkits = this.physics.add.group();
        this.physics.add.collider(this.medkits, this.platforms);
        this.createMedkit(420, 330);
        this.createMedkit(1360, 480);
        this.physics.add.overlap(this.player, this.medkits, this.pickupMedkit, null, this);

        this.barrels = this.physics.add.group();
        this.physics.add.collider(this.barrels, this.platforms);
        [
            { x: 600, y: 720 },
            { x: 1000, y: 560 },
            { x: 1420, y: 720 },
            { x: 1050, y: 350 }
        ].forEach((pos) => this.createBarrel(pos.x, pos.y));

        // 8. Боевые коллизии
        this.physics.add.overlap(this.bullets, this.bots, (bullet, bot) => this.botManager.hitBot(bullet, bot), null, this);
        this.physics.add.overlap(this.botBullets, this.player, this.hitPlayer, null, this);
        this.physics.add.overlap(this.player, this.bots, this.handlePlayerBotContact, null, this);
        this.physics.add.overlap(this.bullets, this.barrels, this.hitBarrel, null, this);
        this.physics.add.overlap(this.botBullets, this.barrels, this.hitBarrel, null, this);
        this.physics.add.overlap(this.grenades, this.bots, (nade) => this.detonateGrenade(nade), null, this);
        this.physics.add.overlap(this.grenades, this.barrels, (nade) => this.detonateGrenade(nade), null, this);
        this.physics.add.overlap(this.player, this.jumpPads, this.useJumpPad, null, this);
        this.physics.add.overlap(this.bots, this.jumpPads, this.useJumpPad, null, this);

        // 9. Статистика сессии
        this.kills = 0;
        this.deaths = 0;
        this.streak = 0;
        this.streakExpireTime = 0;
        this.streakDuration = 4500;
        this.isPaused = false;
        this.isGameOver = false;
        this.currentPerkChoices = [];

        // 10. Менеджер волн
        this.waveManager = new WaveManager(this);
        this.waveManager.startNextWave();
    }

    // ==========================================
    // ДЕЛЕГИРОВАНИЕ СИСТЕМАМ И СУЩНОСТЯМ
    // ==========================================
    damagePlayer(rawDamage) {
        if (this.playerEntity) this.playerEntity.damagePlayer(rawDamage);
    }

    healPlayerVampirism(amount) {
        if (this.playerEntity) this.playerEntity.healPlayerVampirism(amount);
    }

    respawnPlayer() {
        if (this.playerEntity) this.playerEntity.respawnPlayer();
    }

    firePlayerWeapon(time, angle) {
        if (this.playerEntity) this.playerEntity.fireWeapon(time, angle);
    }

    createVortex(x, y) {
        this.particles.createVortex(x, y);
    }

    createSpark(x, y, color, count = 5) {
        this.particles.createSpark(x, y, color, count);
    }

    createExplosionParticles(x, y, count = 14) {
        this.particles.createExplosionParticles(x, y, count);
    }

    createDashGhost(x, y, flipX, tex = 'player', tint = 0x00ffff) {
        this.particles.createDashGhost(x, y, flipX, tex, tint);
    }

    showFloatingText(x, y, message, color = '#ffffff', size = '15px') {
        this.particles.showFloatingText(x, y, message, color, size);
    }

    updateHud() {
        this.hud.updateHud();
    }

    updateBossHud() {
        this.hud.updateBossHud();
    }

    hideBossHud() {
        this.hud.hideBossHud();
    }

    announceBanner(text, color = '#ffcc00') {
        this.hud.announceBanner(text, color);
    }

    showPerkSelectionScreen() {
        this.modals.showPerkSelectionScreen();
        this.perkUiContainer = this.modals.perkUiContainer;
    }

    destroyPerkScreen() {
        this.modals.destroyPerkScreen();
        this.perkUiContainer = null;
    }

    showPauseOverlay() {
        this.modals.showPauseOverlay();
        this.pauseUiContainer = this.modals.pauseUiContainer;
    }

    destroyPauseOverlay() {
        this.modals.destroyPauseOverlay();
        this.pauseUiContainer = null;
    }

    showGameOver() {
        this.modals.showGameOver();
        this.gameOverContainer = this.modals.gameOverContainer;
    }

    spawnCompanionDrone() {
        this.droneManager.spawnCompanionDrone();
    }

    spawnBot(x, y, isElite = false) {
        return this.botManager.spawnBot(x, y, isElite);
    }

    spawnBoss(x, y) {
        return this.botManager.spawnBoss(x, y);
    }

    hitBot(bullet, bot) {
        this.botManager.hitBot(bullet, bot);
    }

    applyDamageToBot(bot, damage, impulseX, impulseY) {
        this.botManager.applyDamageToBot(bot, damage, impulseX, impulseY);
    }

    spawnBossBulletRing(x, y, count, speed, angleOffset = 0) {
        this.botManager.spawnBossBulletRing(x, y, count, speed, angleOffset);
    }

    executeBossCircularBarrage(boss) {
        this.botManager.executeBossCircularBarrage(boss);
    }

    startBossDashAttack(boss) {
        this.botManager.startBossDashAttack(boss);
    }

    startNextWave() {
        this.waveManager.startNextWave();
    }

    skipToBossWave() {
        this.waveManager.skipToBossWave();
    }

    onWaveCleared() {
        this.waveManager.onWaveCleared();
    }

    // ==========================================
    // ВЗАИМОДЕЙСТВИЯ, ПРЕДМЕТЫ И ВЗРЫВЫ
    // ==========================================
    hitPlayer(player, bullet) {
        if (!bullet.active) return;

        const rawDamage = bullet.getData('damage') || 12;
        const knockback = bullet.getData('knockback') || 120;
        const dirX = bullet.body.velocity.x >= 0 ? 1 : -1;

        this.createSpark(bullet.x, bullet.y, 0x0088ff, 6);
        bullet.destroy();

        if (this.isInvulnerable || this.isIntermission || this.isGameOver) return;

        this.recoilVelocityX = (this.recoilVelocityX || 0) + dirX * knockback;
        this.player.setVelocityY(-180);
        this.damagePlayer(rawDamage);
    }

    handlePlayerBotContact(player, bot) {
        if (!bot || !bot.active || !bot.getData('isBoss')) return;
        if (this.isInvulnerable || this.isIntermission || this.isGameOver) return;

        const state = bot.getData('bossState');
        const lastContact = bot.getData('lastContactDamageTime') || 0;
        if (this.time.now - lastContact < 550) return;

        bot.setData('lastContactDamageTime', this.time.now);
        const isDashing = state === 'DASH_CHARGE';
        const dmg = isDashing ? 34 : 16;
        const dirX = player.x >= bot.x ? 1 : -1;

        this.recoilVelocityX = (this.recoilVelocityX || 0) + dirX * (isDashing ? 560 : 320);
        this.player.setVelocityY(-280);
        this.damagePlayer(dmg);
    }

    spawnCreditDrops(x, y, count, baseValue) {
        const comboBonus = 1 + Math.min(0.5, this.streak * 0.05);
        for (let i = 0; i < count; i++) {
            const chip = this.creditsGroup.create(x, y - 8, 'credit_chip');
            chip.setCollideWorldBounds(true);
            const val = Math.max(1, Math.round(baseValue * this.metaCreditMult * comboBonus));
            chip.setData('value', val);
            chip.setVelocity(
                Phaser.Math.Between(-190, 190),
                Phaser.Math.Between(-340, -140)
            );
        }
    }

    collectCreditChip(player, chip) {
        if (!chip || !chip.active) return;
        const val = chip.getData('value') || 5;
        chip.destroy();

        CyberAudio.pickup();
        this.runCreditsEarned += val;
        GameStorage.addCredits(val);

        this.createSpark(player.x, player.y, 0xffd700, 6);
        this.showFloatingText(player.x, player.y - 10, `+${val} КР`, '#ffd700', '14px');
        this.updateHud();
    }

    updateCreditsMagnet() {
        this.creditsGroup.getChildren().forEach((chip) => {
            if (!chip || !chip.active) return;
            const dist = Phaser.Math.Distance.Between(chip.x, chip.y, this.player.x, this.player.y);
            if (dist <= this.creditMagnetRadius) {
                const angle = Phaser.Math.Angle.Between(chip.x, chip.y, this.player.x, this.player.y);
                const pullSpeed = 520;
                chip.body.setAllowGravity(false);
                chip.setVelocity(Math.cos(angle) * pullSpeed, Math.sin(angle) * pullSpeed);
            } else {
                chip.body.setAllowGravity(true);
            }
        });
    }

    useJumpPad(entity, pad) {
        const lastPadTime = entity.getData('lastPadTime') || 0;
        if (this.time.now - lastPadTime < 350) return;

        entity.setData('lastPadTime', this.time.now);
        entity.setVelocityY(-780);
        if (entity === this.player) {
            if (this.playerEntity) this.playerEntity.jumpsLeft = 2;
            this.jumpsLeft = 2;
            CyberAudio.jumpPad();
        }
        this.createSpark(pad.x, pad.y - 6, 0x00ffcc, 12);
    }

    createWeaponBox(x, y, weaponType) {
        const box = this.weaponBoxes.create(x, y, 'weapon_box');
        box.setBounce(0.2);
        box.setCollideWorldBounds(true);
        box.setData('weaponType', weaponType);
        box.setData('spawnX', x);
        box.setData('spawnY', y);

        const label = this.add.text(x, y - 22, weaponType, {
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#ffffff',
            backgroundColor: '#00000099',
            padding: { x: 4, y: 2 }
        }).setOrigin(0.5);

        box.setData('label', label);
    }

    pickupWeapon(player, box) {
        const weaponType = box.getData('weaponType');
        CyberAudio.powerup();
        this.currentWeapon = WEAPONS[weaponType];
        if (this.playerEntity) {
            this.playerEntity.currentWeapon = this.currentWeapon;
        }
        this.gunSprite.setVisible(true);
        this.gunSprite.setTint(this.currentWeapon.color);
        this.showFloatingText(player.x, player.y, `+ ${this.currentWeapon.name}`, '#ffcc00');
        this.updateHud();

        const label = box.getData('label');
        if (label) label.setVisible(false);

        const spawnX = box.getData('spawnX');
        const spawnY = box.getData('spawnY');
        box.disableBody(true, true);

        this.time.delayedCall(7000, () => {
            const types = Object.keys(WEAPONS);
            const newType = Phaser.Math.RND.pick(types);
            box.setData('weaponType', newType);
            box.enableBody(true, spawnX, spawnY, true, true);
            if (label) {
                label.setText(newType);
                label.setPosition(spawnX, spawnY - 22);
                label.setVisible(true);
            }
        });
    }

    createMedkit(x, y) {
        const kit = this.medkits.create(x, y, 'medkit');
        kit.setBounce(0.2);
        kit.setCollideWorldBounds(true);
        kit.setData('spawnX', x);
        kit.setData('spawnY', y);
    }

    pickupMedkit(player, kit) {
        if (this.playerHp >= this.playerMaxHp) return;
        CyberAudio.powerup();
        this.playerHp = Math.min(this.playerMaxHp, this.playerHp + 40);
        if (this.playerEntity) {
            this.playerEntity.hp = this.playerHp;
            this.playerEntity.syncToScene();
        }
        this.showFloatingText(player.x, player.y, '+40 HP', '#00ff66');
        this.updateHud();

        const sx = kit.getData('spawnX');
        const sy = kit.getData('spawnY');
        kit.disableBody(true, true);

        this.time.delayedCall(10000, () => {
            kit.enableBody(true, sx, sy, true, true);
        });
    }

    createBarrel(x, y) {
        const barrel = this.barrels.create(x, y, 'barrel');
        barrel.setBounce(0.1);
        barrel.setCollideWorldBounds(true);
        barrel.setData('hp', 35);
        barrel.setData('spawnX', x);
        barrel.setData('spawnY', y);
    }

    hitBarrel(bullet, barrel) {
        if (!bullet.active || !barrel.active) return;
        const dmg = bullet.getData('damage') || 20;
        bullet.destroy();

        const hp = barrel.getData('hp') - dmg;
        barrel.setData('hp', hp);
        barrel.setTintFill(0xffffff);
        this.time.delayedCall(50, () => {
            if (barrel.active) barrel.clearTint();
        });

        if (hp <= 0) {
            this.explodeBarrel(barrel);
        }
    }

    explodeBarrel(barrel) {
        if (!barrel.active) return;
        const bx = barrel.x;
        const by = barrel.y;
        const sx = barrel.getData('spawnX');
        const sy = barrel.getData('spawnY');

        barrel.disableBody(true, true);
        this.triggerExplosion(bx, by, 175, Math.round(85 * this.metaDamageMult), 420);

        this.time.delayedCall(11000, () => {
            barrel.setData('hp', 35);
            barrel.clearTint();
            barrel.enableBody(true, sx, sy, true, true);
        });
    }

    detonateGrenade(nade) {
        if (!nade || !nade.active || nade.getData('exploded')) return;
        nade.setData('exploded', true);
        const nx = nade.x;
        const ny = nade.y;
        nade.destroy();
        this.triggerExplosion(nx, ny, 150, Math.round(80 * this.metaDamageMult), 360);
    }

    triggerBulletMicroExplosion(x, y, baseDamage) {
        const radius = 75 + (this.perkStats ? this.perkStats.explosiveLevel : 0) * 18;
        const aoeDmg = Math.round(baseDamage * (0.35 + (this.perkStats ? this.perkStats.explosiveLevel : 0) * 0.15));

        const ring = this.add.circle(x, y, 8, 0xff8800, 0.4);
        ring.setStrokeStyle(2, 0xffff00, 0.9);
        this.tweens.add({
            targets: ring,
            radius: radius,
            alpha: 0,
            duration: 210,
            onComplete: () => ring.destroy()
        });

        this.bots.getChildren().slice().forEach((bot) => {
            if (!bot || !bot.active) return;
            const dist = Phaser.Math.Distance.Between(x, y, bot.x, bot.y);
            if (dist <= radius) {
                const angle = Phaser.Math.Angle.Between(x, y, bot.x, bot.y);
                this.applyDamageToBot(bot, aoeDmg, Math.cos(angle) * 140, -120);
            }
        });
    }

    triggerExplosion(x, y, radius, maxDamage, maxKnockback) {
        CyberAudio.explosion();
        this.cameras.main.shake(180, 0.012);
        this.createExplosionParticles(x, y, 24);

        const ring = this.add.circle(x, y, 10, 0xffaa00, 0.35);
        ring.setStrokeStyle(3, 0xff5500, 0.9);
        this.tweens.add({
            targets: ring,
            radius: radius,
            alpha: 0,
            duration: 280,
            ease: 'Quad.easeOut',
            onComplete: () => ring.destroy()
        });

        this.bots.getChildren().slice().forEach((bot) => {
            if (!bot || !bot.active) return;
            const dist = Phaser.Math.Distance.Between(x, y, bot.x, bot.y);
            if (dist <= radius) {
                const factor = 1 - dist / radius;
                const dmg = Math.round(maxDamage * factor);
                const angle = Phaser.Math.Angle.Between(x, y, bot.x, bot.y);
                this.applyDamageToBot(bot, dmg, Math.cos(angle) * maxKnockback * factor, -260);
            }
        });

        this.barrels.getChildren().slice().forEach((barrel) => {
            if (!barrel || !barrel.active) return;
            const dist = Phaser.Math.Distance.Between(x, y, barrel.x, barrel.y);
            if (dist <= radius) {
                this.time.delayedCall(90, () => this.explodeBarrel(barrel));
            }
        });

        const pDist = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
        if (pDist <= radius) {
            const factor = 1 - pDist / radius;
            const angle = Phaser.Math.Angle.Between(x, y, this.player.x, this.player.y);
            this.recoilVelocityX = (this.recoilVelocityX || 0) + Math.cos(angle) * maxKnockback * factor;
            this.player.setVelocityY(-320 * factor - 100);
            if (!this.isInvulnerable) {
                const dmg = Math.round(maxDamage * 0.65 * factor);
                if (dmg > 0) this.damagePlayer(dmg);
            }
        }
    }

    togglePauseMenu() {
        if (this.isIntermission || this.isGameOver) return;

        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.physics.pause();
            this.showPauseOverlay();
        } else {
            this.destroyPauseOverlay();
            this.physics.resume();
        }
    }

    triggerGameOver() {
        this.isGameOver = true;
        this.physics.pause();
        this.worldUi.clear();
        GameStorage.saveRun(this.wave, this.kills);
        this.showGameOver();
    }

    selectPerk(index) {
        if (!this.isIntermission || !this.currentPerkChoices[index]) return;

        CyberAudio.powerup();
        const chosen = this.currentPerkChoices[index];
        this.perkLevels[chosen.id] = (this.perkLevels[chosen.id] || 0) + 1;
        chosen.apply(this);

        this.destroyPerkScreen();

        this.lastFired = this.time.now + 350;
        if (this.playerEntity) {
            this.playerEntity.lastFired = this.lastFired;
        }
        this.showFloatingText(this.player.x, this.player.y - 20, `+ ${chosen.title}!`, chosen.color, '18px');

        this.physics.resume();
        this.waveManager.startNextWave();
    }

    // ==========================================
    // ГЛАВНЫЙ ЦИКЛ ОБНОВЛЕНИЯ
    // ==========================================
    update(time, delta) {
        const dt = Math.min(delta / 1000, 0.1);

        if (Phaser.Input.Keyboard.JustDown(this.keys.mute)) {
            const muted = CyberAudio.toggleMute();
            this.showFloatingText(this.player.x, this.player.y - 30, muted ? '🔇 ЗВУК ВЫКЛ' : '🔊 ЗВУК ВКЛ', '#00ffcc');
        }

        if (this.isGameOver) {
            if (Phaser.Input.Keyboard.JustDown(this.keys.restart)) {
                this.scene.restart({ mode: this.gameMode });
            } else if (Phaser.Input.Keyboard.JustDown(this.keys.menu)) {
                this.scene.start('MenuScene');
            }
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.keys.esc) || Phaser.Input.Keyboard.JustDown(this.keys.pause)) {
            this.togglePauseMenu();
            return;
        }

        if (this.isPaused) {
            if (Phaser.Input.Keyboard.JustDown(this.keys.restart)) {
                GameStorage.saveRun(this.wave, this.kills);
                this.scene.restart({ mode: this.gameMode });
            } else if (Phaser.Input.Keyboard.JustDown(this.keys.menu)) {
                GameStorage.saveRun(this.wave, this.kills);
                this.scene.start('MenuScene');
            }
            return;
        }

        if (this.isIntermission) {
            if (Phaser.Input.Keyboard.JustDown(this.keys.one)) this.selectPerk(0);
            else if (Phaser.Input.Keyboard.JustDown(this.keys.two)) this.selectPerk(1);
            else if (Phaser.Input.Keyboard.JustDown(this.keys.three)) this.selectPerk(2);
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.keys.bossSkip)) {
            this.skipToBossWave();
            return;
        }

        // Сброс комбо-стрика по истечении таймера
        if (this.streak > 0 && time > this.streakExpireTime) {
            this.streak = 0;
            this.updateHud();
        }

        // 1. Обновление игрока (ввод, прыжки, рывок, регенерация щита, стрельба)
        this.playerEntity.update(time, dt);

        // 2. Обновление дронов и магнита кредитов
        this.droneManager.update(time, dt);
        this.updateCreditsMagnet();

        // 3. Обновление плавающих лейблов оружейных коробок
        this.weaponBoxes.getChildren().forEach((box) => {
            if (box && box.active) {
                const label = box.getData('label');
                if (label && label.visible) {
                    label.setPosition(box.x, box.y - 22);
                }
            }
        });

        // 4. Очистка улетевших за пределы мира пуль
        const cleanupBullet = (b) => {
            if (b && b.active && (b.x < 0 || b.x > this.worldWidth || b.y < 0 || b.y > this.worldHeight)) {
                b.destroy();
            }
        };
        this.bullets.getChildren().forEach(cleanupBullet);
        this.botBullets.getChildren().forEach(cleanupBullet);

        // 5. Обновление ботов и босса
        this.botManager.update(time, dt);

        // 6. Отрисовка всех мировых индикаторов за один батч-проход
        this.worldUi.render(time);
    }
}

export default MainScene;
