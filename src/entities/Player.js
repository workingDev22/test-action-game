import { WEAPONS } from '../config/weapons.js';
import { CyberAudio } from '../services/CyberAudio.js';
import { GameStorage } from '../services/GameStorage.js';

export class Player {
    constructor(scene) {
        this.scene = scene;

        const savedStats = GameStorage.getStats();
        const meta = savedStats.upgrades;

        this.sprite = scene.physics.add.sprite(200, 550, 'player');
        this.sprite.setCollideWorldBounds(true);
        scene.player = this.sprite;

        this.maxHp = 100 + (meta.hull || 0) * 20;
        this.hp = this.maxHp;

        this.maxShield = (meta.shield_core || 0) * 25;
        this.shield = this.maxShield;

        this.lastDamageTime = 0;
        this.dropThroughUntil = 0;
        this.coyoteTimeUntil = 0;

        this.lives = scene.gameMode === 'roguelike' ? 3 : 999;
        this.isInvulnerable = false;
        this.jumpsLeft = 2;
        this.lastDashTime = -9999;
        this.baseDashCooldown = 900;
        this.recoilVelocityX = 0;

        this.currentWeapon = WEAPONS.Pistol;
        this.lastFired = 0;

        this.gunSprite = scene.add.sprite(this.sprite.x, this.sprite.y, 'gun_indicator');
        this.gunSprite.setOrigin(0.2, 0.5);
        this.gunSprite.setTint(this.currentWeapon.color);

        this.keyQ = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
        this.ultCooldown = 20000;
        this.lastUltTime = -99999;
        this.isCastingUlt = false;

        this.perkLevels = {};
        this.perkStats = {
            moveSpeedMult: 1.0,
            dashCooldownMult: 1.0,
            lifesteal: 0.0,
            healOnKill: 0,
            explosiveLevel: 0,
            fireRateMult: 1.0,
            bulletSpeedMult: 1.0,
            bonusPellets: 0,
            damageReduction: 1.0
        };

        this.syncToScene();

        scene.cameras.main.setBounds(0, 0, scene.worldWidth, scene.worldHeight);
        scene.cameras.main.startFollow(this.sprite, true, 0.12, 0.12);
    }

    get x() { return this.sprite.x; }
    get y() { return this.sprite.y; }
    get body() { return this.sprite.body; }
    get active() { return this.sprite.active; }

    setVelocity(vx, vy) { return this.sprite.setVelocity(vx, vy); }
    setVelocityX(vx) { return this.sprite.setVelocityX(vx); }
    setVelocityY(vy) { return this.sprite.setVelocityY(vy); }

    syncToScene() {
        this.scene.playerHp = this.hp;
        this.scene.playerMaxHp = this.maxHp;
        this.scene.playerShield = this.shield;
        this.scene.playerMaxShield = this.maxShield;
        this.scene.perkLevels = this.perkLevels;
        this.scene.perkStats = this.perkStats;
        this.scene.currentWeapon = this.currentWeapon;
        this.scene.gunSprite = this.gunSprite;
        this.scene.lastFired = this.lastFired;
        this.scene.lastDashTime = this.lastDashTime;
        this.scene.baseDashCooldown = this.baseDashCooldown;
        this.scene.dropThroughUntil = this.dropThroughUntil;
        this.scene.isInvulnerable = this.isInvulnerable;
        this.scene.lives = this.lives;
        this.scene.recoilVelocityX = this.recoilVelocityX;
        this.scene.ultCooldown = this.ultCooldown;
        this.scene.lastUltTime = this.lastUltTime;
        this.scene.isCastingUlt = this.isCastingUlt;
    }

    damagePlayer(rawDamage) {
        this.lastDamageTime = this.scene.time.now;
        const finalDamage = Math.max(1, Math.round(rawDamage * this.perkStats.damageReduction));

        if (this.shield > 0) {
            if (this.shield >= finalDamage) {
                this.shield -= finalDamage;
                this.scene.showFloatingText(this.sprite.x, this.sprite.y, `-${finalDamage} ЩИТ`, '#00ccff');
                this.scene.createSpark(this.sprite.x, this.sprite.y, 0x00ccff, 7);
                this.syncToScene();
                this.scene.updateHud();
                return;
            } else {
                const leftover = finalDamage - Math.floor(this.shield);
                this.shield = 0;
                this.hp -= leftover;
                this.scene.showFloatingText(this.sprite.x, this.sprite.y, `ЩИТ СБИТ! -${leftover}`, '#ff3333');
            }
        } else {
            this.hp -= finalDamage;
            this.scene.showFloatingText(this.sprite.x, this.sprite.y, `-${finalDamage}`, '#ff3333');
        }

        CyberAudio.playTone(140, 55, 0.14, 'sawtooth', 0.1);
        this.scene.cameras.main.shake(90, 0.005);

        this.sprite.setTintFill(0xff0000);
        this.scene.time.delayedCall(70, () => {
            if (this.sprite && this.sprite.active) this.sprite.clearTint();
        });

        this.syncToScene();
        if (this.hp <= 0) {
            this.respawnPlayer();
        }
        this.scene.updateHud();
    }

    healPlayerVampirism(amount) {
        if (amount <= 0 || this.hp >= this.maxHp) return;
        this.hp = Math.min(this.maxHp, this.hp + amount);
        this.syncToScene();
        this.scene.updateHud();
    }

    respawnPlayer() {
        this.scene.deaths++;
        this.scene.streak = 0;
        this.scene.createExplosionParticles(this.sprite.x, this.sprite.y, 20);

        if (this.scene.gameMode === 'roguelike') {
            this.lives--;
            this.scene.lives = this.lives;
            if (this.lives <= 0) {
                this.hp = 0;
                this.syncToScene();
                this.scene.updateHud();
                this.scene.triggerGameOver();
                return;
            }
        }

        this.hp = this.maxHp;
        this.shield = this.maxShield;
        this.sprite.setPosition(200, 520);
        this.sprite.setVelocity(0, 0);
        this.recoilVelocityX = 0;

        this.isInvulnerable = true;
        this.syncToScene();

        this.scene.tweens.add({
            targets: this.sprite,
            alpha: 0.35,
            yoyo: true,
            repeat: 5,
            duration: 160,
            onComplete: () => {
                this.sprite.setAlpha(1);
                this.isInvulnerable = false;
                this.syncToScene();
            }
        });
    }

    fireWeapon(time, angle) {
        const wep = this.currentWeapon;
        const effectiveFireRate = wep.fireRate * this.perkStats.fireRateMult;
        const effectiveSpeed = wep.speed * this.perkStats.bulletSpeedMult;
        const totalPellets = wep.pellets + this.perkStats.bonusPellets;
        const effectiveDamage = wep.damage * this.scene.metaDamageMult;

        this.lastFired = time + effectiveFireRate;
        CyberAudio.shoot(wep.key);

        this.recoilVelocityX += -Math.cos(angle) * wep.recoil;
        this.sprite.setVelocityY(this.sprite.body.velocity.y - Math.sin(angle) * (wep.recoil * 0.72));

        const spawnX = this.sprite.x + Math.cos(angle) * 22;
        const spawnY = this.sprite.y + Math.sin(angle) * 22;

        if (wep.isGrenade) {
            for (let i = 0; i < totalPellets; i++) {
                const spreadA = angle + (totalPellets > 1 ? Phaser.Math.FloatBetween(-0.12, 0.12) : 0);
                const nade = this.scene.grenades.create(spawnX, spawnY, 'grenade');
                this.scene.physics.velocityFromRotation(spreadA, effectiveSpeed, nade.body.velocity);
                nade.setAngularVelocity(360);
                this.scene.time.delayedCall(1800, () => this.scene.detonateGrenade(nade));
            }
            return;
        }

        for (let i = 0; i < totalPellets; i++) {
            const extraSpread = this.perkStats.bonusPellets > 0 ? 0.04 : 0;
            const finalAngle = angle + Phaser.Math.FloatBetween(-(wep.spread + extraSpread), wep.spread + extraSpread);
            const bullet = this.scene.bullets.create(spawnX, spawnY, 'bullet');
            if (!bullet) continue;

            const flameColor = Phaser.Math.RND.pick([0xff3300, 0xff7700, 0xffcc00]);
            bullet.setTint(wep.isFlamethrower ? flameColor : (this.perkStats.explosiveLevel > 0 ? 0xff8800 : wep.color));
            bullet.setData('damage', effectiveDamage);
            bullet.setData('knockback', wep.knockback);

            this.scene.physics.velocityFromRotation(finalAngle, effectiveSpeed, bullet.body.velocity);

            if (wep.isRailgun) {
                const line = this.scene.add.graphics();
                line.lineStyle(3, wep.color, 0.9);
                line.lineBetween(spawnX, spawnY, spawnX + Math.cos(finalAngle) * 900, spawnY + Math.sin(finalAngle) * 900);
                this.scene.tweens.add({
                    targets: line,
                    alpha: 0,
                    duration: 220,
                    onComplete: () => line.destroy()
                });
            }

            if (wep.isFlamethrower) {
                bullet.setScale(1.45);
                this.scene.tweens.add({
                    targets: bullet,
                    scale: 0.15,
                    alpha: 0,
                    duration: 340 + Phaser.Math.Between(-45, 45),
                    onComplete: () => {
                        if (bullet && bullet.active) bullet.destroy();
                    }
                });
            } else {
                this.scene.time.delayedCall(2000, () => {
                    if (bullet && bullet.active) bullet.destroy();
                });
            }
        }
    }

    castUltimate(time) {
        this.isCastingUlt = true;
        this.isInvulnerable = true;
        this.lastUltTime = time;

        this.sprite.setVelocity(0, 0);
        this.sprite.body.setAllowGravity(false);

        if (this.scene.particles) {
            this.scene.particles.createVortex(this.sprite.x, this.sprite.y);
        } else if (this.scene.createVortex) {
            this.scene.createVortex(this.sprite.x, this.sprite.y);
        }
        CyberAudio.ultimateCharge();
        this.syncToScene();

        this.scene.time.delayedCall(1500, () => {
            if (!this.sprite || !this.sprite.active) return;
            this.sprite.body.setAllowGravity(true);
            this.isCastingUlt = false;
            this.isInvulnerable = false;
            this.syncToScene();

            const damage = Math.round(400 * (this.scene.metaDamageMult || 1.0));
            this.scene.triggerExplosion(this.sprite.x, this.sprite.y, 280, damage, 600);
            CyberAudio.ultimateExplosion();
            this.scene.cameras.main.shake(400, 0.025);
        });
    }

    update(time, dt) {
        const scene = this.scene;
        if (scene.playerHp !== undefined) this.hp = scene.playerHp;
        if (scene.playerMaxHp !== undefined) this.maxHp = scene.playerMaxHp;
        if (scene.playerShield !== undefined) this.shield = scene.playerShield;
        if (scene.playerMaxShield !== undefined) this.maxShield = scene.playerMaxShield;
        if (scene.currentWeapon) this.currentWeapon = scene.currentWeapon;
        if (scene.perkStats) this.perkStats = scene.perkStats;
        if (scene.isInvulnerable !== undefined) this.isInvulnerable = scene.isInvulnerable;

        if (this.hp > 0 && !this.isCastingUlt && Phaser.Input.Keyboard.JustDown(this.keyQ) && time > this.lastUltTime + this.ultCooldown) {
            this.castUltimate(time);
        }

        if (this.isCastingUlt) {
            this.sprite.setVelocity(0, 0);
            const botsGroup = this.scene.botManager ? this.scene.botManager.bots : this.scene.bots;
            if (botsGroup) {
                botsGroup.getChildren().forEach((bot) => {
                    if (bot && bot.active) {
                        const angle = Phaser.Math.Angle.Between(bot.x, bot.y, this.sprite.x, this.sprite.y);
                        const pullSpeed = 420;
                        bot.setVelocity(Math.cos(angle) * pullSpeed, Math.sin(angle) * pullSpeed);
                    }
                });
            }
            this.syncToScene();
            return;
        }

        const cursors = scene.cursors;
        const keys = scene.keys;

        const isLeft = cursors.left.isDown || keys.left.isDown;
        const isRight = cursors.right.isDown || keys.right.isDown;
        const isDown = Phaser.Input.Keyboard.JustDown(cursors.down) || Phaser.Input.Keyboard.JustDown(keys.down);
        const jumpPressed =
            Phaser.Input.Keyboard.JustDown(cursors.up) ||
            Phaser.Input.Keyboard.JustDown(keys.up) ||
            Phaser.Input.Keyboard.JustDown(cursors.space);
        const dashPressed = Phaser.Input.Keyboard.JustDown(keys.dash);

        const isGrounded = this.sprite.body.touching.down || this.sprite.body.blocked.down;
        if (isGrounded) {
            this.jumpsLeft = 2;
            this.coyoteTimeUntil = time + 110;
        }

        // Проваливание вниз сквозь платформу при нажатии S / Down
        if (isDown && isGrounded && this.sprite.y < scene.worldHeight - 90) {
            this.dropThroughUntil = time + 180;
            this.sprite.setVelocityY(140);
        }

        // Независимое от герцовки монитора затухание инерции (Dash / Recoil)
        const recoilDecay = Math.pow(0.88, dt * 60);
        this.recoilVelocityX *= recoilDecay;
        if (Math.abs(this.recoilVelocityX) < 1) this.recoilVelocityX = 0;

        const moveSpeed = 270 * this.perkStats.moveSpeedMult;
        let inputVelX = 0;
        if (isLeft) {
            inputVelX = -moveSpeed;
            this.sprite.setFlipX(true);
        } else if (isRight) {
            inputVelX = moveSpeed;
            this.sprite.setFlipX(false);
        }

        const currentDashCd = this.baseDashCooldown * this.perkStats.dashCooldownMult;
        if (dashPressed && time > this.lastDashTime + currentDashCd) {
            this.lastDashTime = time;
            CyberAudio.dash();
            const dashDir = isLeft ? -1 : (isRight ? 1 : (this.sprite.flipX ? -1 : 1));
            this.recoilVelocityX += dashDir * 700;
            this.sprite.setVelocityY(0);

            for (let i = 1; i <= 3; i++) {
                scene.time.delayedCall(i * 35, () => {
                    if (this.sprite && this.sprite.active) {
                        scene.createDashGhost(this.sprite.x, this.sprite.y, this.sprite.flipX, 'player', 0x00ffff);
                    }
                });
            }
        }

        this.sprite.setVelocityX(inputVelX + this.recoilVelocityX);

        const canJump = this.jumpsLeft > 0 || time < this.coyoteTimeUntil;
        if (jumpPressed && canJump) {
            if (!isGrounded && time >= this.coyoteTimeUntil) {
                this.jumpsLeft--;
            } else {
                this.jumpsLeft = 1;
            }
            this.coyoteTimeUntil = 0;
            this.sprite.setVelocityY(-520);
            if (!isGrounded) {
                scene.createSpark(this.sprite.x, this.sprite.y + 16, 0xffffff, 7);
            }
        }

        // Delta-независимая регенерация плазменного щита (21 ед/сек вне боя)
        if (this.maxShield > 0 && this.shield < this.maxShield && time > this.lastDamageTime + 3000) {
            const prevShieldInt = Math.floor(this.shield);
            this.shield = Math.min(this.maxShield, this.shield + 21 * dt);
            if (Math.floor(this.shield) !== prevShieldInt) {
                scene.updateHud();
            }
        }

        // Прицеливание и поворот оружия
        const pointer = scene.input.activePointer;
        pointer.updateWorldPoint(scene.cameras.main);

        const aimAngle = Phaser.Math.Angle.Between(
            this.sprite.x,
            this.sprite.y,
            pointer.worldX,
            pointer.worldY
        );

        if (this.currentWeapon) {
            this.gunSprite.setVisible(true);
            this.gunSprite.setPosition(
                this.sprite.x + Math.cos(aimAngle) * 15,
                this.sprite.y + Math.sin(aimAngle) * 15
            );
            this.gunSprite.setRotation(aimAngle);
            this.gunSprite.setFlipY(Math.abs(aimAngle) > Math.PI / 2);
        }

        if (pointer.isDown && this.currentWeapon && time > this.lastFired) {
            this.fireWeapon(time, aimAngle);
        }

        this.syncToScene();
    }
}

export default Player;
