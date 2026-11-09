import { WEAPONS } from '../config/weapons.js';
import { CyberAudio } from '../services/CyberAudio.js';

export class BotManager {
    constructor(scene) {
        this.scene = scene;
        this.bots = scene.physics.add.group();
        this.botBullets = scene.physics.add.group({ allowGravity: false, maxSize: 160 });
        this.activeBoss = null;

        scene.bots = this.bots;
        scene.botBullets = this.botBullets;
        scene.activeBoss = this.activeBoss;
    }

    spawnBot(x, y, isElite = false) {
        const tex = isElite ? 'elite_bot' : 'bot';
        const bot = this.bots.create(x, y, tex);
        bot.setCollideWorldBounds(true);
        bot.setBounce(0.1);

        const botWeaponKeys = isElite
            ? ['Sniper', 'Shotgun', 'Rifle']
            : ['Pistol', 'Rifle', 'Shotgun'];
        const chosenWeapon = WEAPONS[Phaser.Math.RND.pick(botWeaponKeys)];

        const wave = this.scene.waveManager ? this.scene.waveManager.wave : (this.scene.wave || 1);
        const baseHp = Math.round((85 + wave * 20) * (isElite ? 2.2 : 1));
        const moveSpeed = Math.min(220, 125 + wave * 8) * (isElite ? 1.15 : 1);

        bot.setData('isElite', isElite);
        bot.setData('isBoss', false);
        bot.setData('maxHp', baseHp);
        bot.setData('hp', baseHp);
        bot.setData('moveSpeed', moveSpeed);
        bot.setData('weapon', chosenWeapon);
        bot.setData('lastFired', this.scene.time.now + 600);
        bot.setData('moveDir', Phaser.Math.RND.pick([-1, 1]));
        bot.setData('knockbackVelX', 0);
        bot.setData('nextJumpTime', 0);
        bot.setData('nextDirChangeTime', this.scene.time.now + Phaser.Math.Between(1800, 4000));

        const botGun = this.scene.add.sprite(x, y, 'gun_indicator');
        botGun.setOrigin(0.2, 0.5);
        botGun.setTint(chosenWeapon.color);
        bot.setData('gunSprite', botGun);

        if (this.scene.particles) {
            this.scene.particles.createSpark(x, y, isElite ? 0xffcc00 : 0xff2244, 10);
        } else if (this.scene.createSpark) {
            this.scene.createSpark(x, y, isElite ? 0xffcc00 : 0xff2244, 10);
        }
        return bot;
    }

    spawnBoss(x, y) {
        const boss = this.bots.create(x, y, 'boss_bot');
        boss.setCollideWorldBounds(true);
        boss.setBounce(0.15);

        const wave = this.scene.waveManager ? this.scene.waveManager.wave : (this.scene.wave || 1);
        const bossTier = Math.max(1, Math.floor(wave / 5));
        const maxHp = 900 + bossTier * 550;

        boss.setData('isBoss', true);
        boss.setData('bossName', `КИБЕР-ТИТАН MK-${bossTier}`);
        boss.setData('maxHp', maxHp);
        boss.setData('hp', maxHp);
        boss.setData('enraged', false);
        boss.setData('moveSpeed', 155 + bossTier * 15);
        boss.setData('moveDir', 1);
        boss.setData('knockbackVelX', 0);
        boss.setData('nextJumpTime', this.scene.time.now + 1500);
        boss.setData('nextDirChangeTime', this.scene.time.now + 1200);

        boss.setData('bossState', 'PATROL');
        boss.setData('nextSpecialTime', this.scene.time.now + 2800);
        boss.setData('lastFired', this.scene.time.now + 800);
        boss.setData('lastGhostTime', 0);

        const botGun = this.scene.add.sprite(x, y, 'gun_indicator');
        botGun.setOrigin(0.2, 0.5);
        botGun.setScale(1.6, 1.8);
        botGun.setTint(0xff0055);
        boss.setData('gunSprite', botGun);

        this.activeBoss = boss;
        this.scene.activeBoss = boss;

        if (this.scene.hud) {
            this.scene.hud.bossHudContainer.setVisible(true);
        } else if (this.scene.bossHudContainer) {
            this.scene.bossHudContainer.setVisible(true);
        }

        if (this.scene.particles) {
            this.scene.particles.createExplosionParticles(x, y, 28);
        } else if (this.scene.createExplosionParticles) {
            this.scene.createExplosionParticles(x, y, 28);
        }
        return boss;
    }

    executeBossCircularBarrage(boss) {
        if (!boss || !boss.active) return;

        boss.setData('bossState', 'RING_BARRAGE');
        const enraged = boss.getData('enraged');
        const ringCount = enraged ? 18 : 14;
        const orbSpeed = enraged ? 420 : 340;

        if (this.scene.particles) {
            this.scene.particles.showFloatingText(boss.x, boss.y - 40, 'КРУГОВОЙ ОБСТРЕЛ!', '#ff00ff', '16px');
        } else if (this.scene.showFloatingText) {
            this.scene.showFloatingText(boss.x, boss.y - 40, 'КРУГОВОЙ ОБСТРЕЛ!', '#ff00ff', '16px');
        }
        this.scene.cameras.main.shake(140, 0.008);

        this.spawnBossBulletRing(boss.x, boss.y, ringCount, orbSpeed, 0);

        if (enraged) {
            this.scene.time.delayedCall(280, () => {
                if (boss && boss.active && !this.scene.isIntermission && !this.scene.isGameOver) {
                    this.spawnBossBulletRing(boss.x, boss.y, ringCount, orbSpeed * 1.1, Math.PI / ringCount);
                }
            });
        }

        this.scene.time.delayedCall(550, () => {
            if (boss && boss.active) {
                boss.setData('bossState', 'PATROL');
            }
        });
    }

    spawnBossBulletRing(x, y, count, speed, angleOffset = 0) {
        CyberAudio.playTone(300, 110, 0.2, 'sawtooth', 0.1);
        const ring = this.scene.add.circle(x, y, 16, 0xff0066, 0.35);
        ring.setStrokeStyle(3, 0xff00ff, 0.9);
        this.scene.tweens.add({
            targets: ring,
            radius: 110,
            alpha: 0,
            duration: 320,
            onComplete: () => ring.destroy()
        });

        const wave = this.scene.waveManager ? this.scene.waveManager.wave : (this.scene.wave || 1);
        for (let i = 0; i < count; i++) {
            const angle = angleOffset + (i * Math.PI * 2) / count;
            const orb = this.botBullets.create(x + Math.cos(angle) * 26, y + Math.sin(angle) * 26, 'boss_orb');
            if (!orb) continue;
            orb.setData('damage', 18 + Math.floor(wave * 0.8));
            orb.setData('knockback', 220);
            this.scene.physics.velocityFromRotation(angle, speed, orb.body.velocity);

            this.scene.time.delayedCall(3200, () => {
                if (orb && orb.active) orb.destroy();
            });
        }
    }

    startBossDashAttack(boss) {
        if (!boss || !boss.active) return;

        boss.setData('bossState', 'DASH_WINDUP');
        const targetAngle = Phaser.Math.Angle.Between(boss.x, boss.y, this.scene.player.x, this.scene.player.y);
        boss.setData('dashAngle', targetAngle);
        boss.setVelocity(0, -120);

        if (this.scene.particles) {
            this.scene.particles.showFloatingText(boss.x, boss.y - 40, '⚡ РЫВОК! ⚡', '#ffaa00', '17px');
        } else if (this.scene.showFloatingText) {
            this.scene.showFloatingText(boss.x, boss.y - 40, '⚡ РЫВОК! ⚡', '#ffaa00', '17px');
        }

        const windupDuration = boss.getData('enraged') ? 430 : 560;

        this.scene.time.delayedCall(windupDuration, () => {
            if (!boss || !boss.active || this.scene.isIntermission || this.scene.isGameOver) return;

            CyberAudio.dash();
            boss.setData('bossState', 'DASH_CHARGE');
            const enraged = boss.getData('enraged');
            const dashSpeed = enraged ? 1120 : 940;
            const lockedAngle = boss.getData('dashAngle') || 0;

            boss.setVelocity(
                Math.cos(lockedAngle) * dashSpeed,
                Math.sin(lockedAngle) * (dashSpeed * 0.65) - 80
            );
            this.scene.cameras.main.shake(120, 0.007);

            this.scene.time.delayedCall(460, () => {
                if (boss && boss.active) {
                    boss.setData('bossState', 'PATROL');
                }
            });
        });
    }

    hitBot(bullet, bot) {
        if (!bullet.active || !bot.active) return;

        const damage = bullet.getData('damage') || 20;
        const knockback = bullet.getData('knockback') || 150;
        const dirX = bullet.body.velocity.x >= 0 ? 1 : -1;
        const bx = bullet.x;
        const by = bullet.y;

        if (this.scene.particles) {
            this.scene.particles.createSpark(bx, by, 0xff2244, 5);
        } else if (this.scene.createSpark) {
            this.scene.createSpark(bx, by, 0xff2244, 5);
        }
        bullet.destroy();

        this.applyDamageToBot(bot, damage, dirX * knockback, -150);

        if (this.scene.perkStats && this.scene.perkStats.explosiveLevel > 0) {
            this.scene.triggerBulletMicroExplosion(bx, by, damage);
        }
    }

    applyDamageToBot(bot, damage, impulseX, impulseY) {
        if (!bot || !bot.active) return;

        const isBoss = bot.getData('isBoss');
        const maxHp = bot.getData('maxHp');
        const currentHp = bot.getData('hp') - damage;
        bot.setData('hp', currentHp);

        const kbFactor = isBoss ? 0.25 : 1.0;
        const currentKb = bot.getData('knockbackVelX') || 0;
        bot.setData('knockbackVelX', currentKb + impulseX * kbFactor);

        if (!isBoss || bot.getData('bossState') === 'PATROL') {
            bot.setVelocityY(impulseY * kbFactor);
        }

        if (this.scene.particles) {
            this.scene.particles.showFloatingText(bot.x, bot.y - (isBoss ? 25 : 0), `-${Math.round(damage)}`, '#ffdd44');
        } else if (this.scene.showFloatingText) {
            this.scene.showFloatingText(bot.x, bot.y - (isBoss ? 25 : 0), `-${Math.round(damage)}`, '#ffdd44');
        }

        if (isBoss && !bot.getData('enraged') && currentHp > 0 && currentHp <= maxHp * 0.5) {
            bot.setData('enraged', true);
            bot.setData('moveSpeed', bot.getData('moveSpeed') * 1.35);
            CyberAudio.bossAlert();
            this.scene.announceBanner('🔥 БОСС ВПАЛ В ЯРОСТЬ! 🔥', '#ff00ff');
            this.scene.cameras.main.shake(320, 0.014);
            this.spawnBossBulletRing(bot.x, bot.y, 16, 360, 0);
        }

        if (isBoss) {
            this.scene.updateBossHud();
        }

        if (this.scene.perkStats && this.scene.perkStats.lifesteal > 0) {
            const heal = damage * this.scene.perkStats.lifesteal;
            this.scene.healPlayerVampirism(heal);
        }

        bot.setTintFill(0xffffff);
        this.scene.time.delayedCall(55, () => {
            if (bot && bot.active) {
                if (isBoss && bot.getData('enraged')) {
                    bot.setTint(0xff66ff);
                } else {
                    bot.clearTint();
                }
            }
        });

        if (currentHp <= 0) {
            this.scene.kills++;
            this.scene.streak++;
            this.scene.streakExpireTime = this.scene.time.now + this.scene.streakDuration;

            if (this.scene.waveManager) {
                this.scene.waveManager.enemiesRemaining = Math.max(0, this.scene.waveManager.enemiesRemaining - 1);
                this.scene.waveManager.syncToScene();
            } else {
                this.scene.enemiesRemaining = Math.max(0, this.scene.enemiesRemaining - 1);
            }

            if (this.scene.perkStats && this.scene.perkStats.healOnKill > 0) {
                this.scene.healPlayerVampirism(this.scene.perkStats.healOnKill);
                if (this.scene.particles) {
                    this.scene.particles.showFloatingText(this.scene.player.x, this.scene.player.y, `+${this.scene.perkStats.healOnKill} HP`, '#ff3366');
                } else if (this.scene.showFloatingText) {
                    this.scene.showFloatingText(this.scene.player.x, this.scene.player.y, `+${this.scene.perkStats.healOnKill} HP`, '#ff3366');
                }
            }

            const wave = this.scene.waveManager ? this.scene.waveManager.wave : (this.scene.wave || 1);
            if (isBoss) {
                CyberAudio.explosion();
                this.scene.spawnCreditDrops(bot.x, bot.y, 14, 12 + wave);
                this.activeBoss = null;
                this.scene.activeBoss = null;
                this.scene.hideBossHud();
                this.scene.cameras.main.shake(450, 0.018);
                if (this.scene.particles) {
                    this.scene.particles.createExplosionParticles(bot.x, bot.y, 45);
                } else if (this.scene.createExplosionParticles) {
                    this.scene.createExplosionParticles(bot.x, bot.y, 45);
                }
                this.scene.healPlayerVampirism(50);
            } else if (bot.getData('isElite')) {
                CyberAudio.explosion();
                this.scene.spawnCreditDrops(bot.x, bot.y, 4, 8 + Math.floor(wave * 0.6));
                if (this.scene.particles) {
                    this.scene.particles.createExplosionParticles(bot.x, bot.y, 26);
                } else if (this.scene.createExplosionParticles) {
                    this.scene.createExplosionParticles(bot.x, bot.y, 26);
                }
            } else {
                this.scene.spawnCreditDrops(bot.x, bot.y, Phaser.Math.Between(1, 2), 5 + Math.floor(wave * 0.4));
                if (this.scene.particles) {
                    this.scene.particles.createExplosionParticles(bot.x, bot.y, 14);
                } else if (this.scene.createExplosionParticles) {
                    this.scene.createExplosionParticles(bot.x, bot.y, 14);
                }
            }

            this.scene.updateHud();

            if (!isBoss) {
                if (this.scene.streak === 2) this.scene.announceBanner('DOUBLE KILL!');
                else if (this.scene.streak === 3) this.scene.announceBanner('MULTI KILL!');
                else if (this.scene.streak === 5) this.scene.announceBanner('ULTRA KILL!');
                else if (this.scene.streak >= 7) this.scene.announceBanner(`GODLIKE! x${this.scene.streak}`);
            }

            const botGun = bot.getData('gunSprite');
            if (botGun) botGun.destroy();

            bot.destroy();

            const enemiesLeft = this.scene.waveManager ? this.scene.waveManager.enemiesRemaining : this.scene.enemiesRemaining;
            if (enemiesLeft <= 0 && !this.scene.isIntermission) {
                this.scene.time.delayedCall(750, () => {
                    if (this.scene.waveManager) {
                        this.scene.waveManager.onWaveCleared();
                    } else if (this.scene.onWaveCleared) {
                        this.scene.onWaveCleared();
                    }
                });
            }
        }
    }

    updateBossBehavior(boss, time, dt) {
        const state = boss.getData('bossState');
        const enraged = boss.getData('enraged');
        const botGun = boss.getData('gunSprite');
        const angleToPlayer = Phaser.Math.Angle.Between(boss.x, boss.y, this.scene.player.x, this.scene.player.y);

        if (botGun) {
            botGun.setPosition(boss.x + Math.cos(angleToPlayer) * 24, boss.y + Math.sin(angleToPlayer) * 24);
            botGun.setRotation(angleToPlayer);
            botGun.setFlipY(Math.abs(angleToPlayer) > Math.PI / 2);
        }

        if (state === 'DASH_WINDUP') {
            boss.setVelocityX(0);
            return;
        }

        if (state === 'DASH_CHARGE') {
            if (time > (boss.getData('lastGhostTime') || 0) + 45) {
                boss.setData('lastGhostTime', time);
                if (this.scene.particles) {
                    this.scene.particles.createDashGhost(boss.x, boss.y, boss.flipX, 'boss_bot', 0xff0055);
                } else if (this.scene.createDashGhost) {
                    this.scene.createDashGhost(boss.x, boss.y, boss.flipX, 'boss_bot', 0xff0055);
                }
            }
            return;
        }

        if (state === 'RING_BARRAGE') {
            boss.setVelocityX(0);
            boss.setVelocityY(-15);
            return;
        }

        const kbDecay = Math.pow(0.86, dt * 60);
        let kb = (boss.getData('knockbackVelX') || 0) * kbDecay;
        if (Math.abs(kb) < 1) kb = 0;
        boss.setData('knockbackVelX', kb);

        const moveDir = this.scene.player.x < boss.x ? -1 : 1;
        boss.setData('moveDir', moveDir);
        boss.setFlipX(moveDir < 0);

        const spd = boss.getData('moveSpeed') || 165;
        boss.setVelocityX(moveDir * spd + kb);

        const bossGrounded = boss.body.touching.down || boss.body.blocked.down;
        if (bossGrounded && time > (boss.getData('nextJumpTime') || 0)) {
            boss.setVelocityY(-560);
            boss.setData('nextJumpTime', time + Phaser.Math.Between(1400, 2600));
        }

        if (time > (boss.getData('nextSpecialTime') || 0)) {
            const specialCooldown = enraged ? 2300 : 3300;
            boss.setData('nextSpecialTime', time + specialCooldown);

            if (Phaser.Math.RND.frac() < 0.5) {
                this.executeBossCircularBarrage(boss);
            } else {
                this.startBossDashAttack(boss);
            }
            return;
        }

        if (time > (boss.getData('lastFired') || 0)) {
            boss.setData('lastFired', time + (enraged ? 950 : 1300));
            const bx = boss.x + Math.cos(angleToPlayer) * 30;
            const by = boss.y + Math.sin(angleToPlayer) * 30;

            const wave = this.scene.waveManager ? this.scene.waveManager.wave : (this.scene.wave || 1);
            [-0.14, 0, 0.14].forEach((offset) => {
                const orb = this.botBullets.create(bx, by, 'boss_orb');
                if (!orb) return;
                orb.setData('damage', 16 + Math.floor(wave * 0.7));
                orb.setData('knockback', 200);
                this.scene.physics.velocityFromRotation(angleToPlayer + offset, enraged ? 520 : 430, orb.body.velocity);

                this.scene.time.delayedCall(2500, () => {
                    if (orb && orb.active) orb.destroy();
                });
            });
        }
    }

    update(time, dt) {
        const wave = this.scene.waveManager ? this.scene.waveManager.wave : (this.scene.wave || 1);
        const botDamageScale = 0.5 + (wave - 1) * 0.06;
        const botKbDecay = Math.pow(0.9, dt * 60);
        const isSingularityActive = this.scene.isCastingUlt || (this.scene.playerEntity && this.scene.playerEntity.isCastingUlt);

        this.bots.getChildren().forEach((bot) => {
            if (!bot || !bot.active) return;

            if (isSingularityActive) {
                // Во время Сингулярности вектор скорости задается гравитационным вихрем в Player.update
                return;
            }

            if (bot.getData('isBoss')) {
                this.updateBossBehavior(bot, time, dt);
                return;
            }

            let kb = (bot.getData('knockbackVelX') || 0) * botKbDecay;
            if (Math.abs(kb) < 1) kb = 0;
            bot.setData('knockbackVelX', kb);

            let moveDir = bot.getData('moveDir') || 1;
            const nextDirTime = bot.getData('nextDirChangeTime') || 0;

            if (bot.body.blocked.left) moveDir = 1;
            else if (bot.body.blocked.right) moveDir = -1;
            else if (time > nextDirTime) {
                moveDir = this.scene.player.x < bot.x ? -1 : 1;
                bot.setData('nextDirChangeTime', time + Phaser.Math.Between(1400, 3200));
            }
            bot.setData('moveDir', moveDir);
            bot.setFlipX(moveDir < 0);

            const spd = bot.getData('moveSpeed') || 135;
            bot.setVelocityX(moveDir * spd + kb);

            const botGrounded = bot.body.touching.down || bot.body.blocked.down;
            if (botGrounded && time > (bot.getData('nextJumpTime') || 0)) {
                bot.setVelocityY(-490);
                bot.setData('nextJumpTime', time + Phaser.Math.Between(1600, 3400));
            }

            const botGun = bot.getData('gunSprite');
            const botWeapon = bot.getData('weapon');
            const distToPlayer = Phaser.Math.Distance.Between(bot.x, bot.y, this.scene.player.x, this.scene.player.y);
            const angleToPlayer = Phaser.Math.Angle.Between(bot.x, bot.y, this.scene.player.x, this.scene.player.y);

            if (botGun && botWeapon) {
                const gunAngle = distToPlayer < 600 ? angleToPlayer : (moveDir > 0 ? 0 : Math.PI);
                botGun.setPosition(bot.x + Math.cos(gunAngle) * 14, bot.y + Math.sin(gunAngle) * 14);
                botGun.setRotation(gunAngle);
                botGun.setFlipY(Math.abs(gunAngle) > Math.PI / 2);

                if (distToPlayer < 560 && time > (bot.getData('lastFired') || 0)) {
                    bot.setData('lastFired', time + botWeapon.fireRate * 2.1);

                    const bx = bot.x + Math.cos(angleToPlayer) * 20;
                    const by = bot.y + Math.sin(angleToPlayer) * 20;

                    for (let i = 0; i < botWeapon.pellets; i++) {
                        const finalA = angleToPlayer + Phaser.Math.FloatBetween(-botWeapon.spread - 0.05, botWeapon.spread + 0.05);
                        const bBullet = this.botBullets.create(bx, by, 'bullet');
                        if (!bBullet) continue;
                        bBullet.setTint(0xff5500);
                        bBullet.setData('damage', Math.round(botWeapon.damage * botDamageScale));
                        bBullet.setData('knockback', botWeapon.knockback * 0.7);

                        this.scene.physics.velocityFromRotation(finalA, botWeapon.speed * 0.65, bBullet.body.velocity);

                        this.scene.time.delayedCall(2000, () => {
                            if (bBullet && bBullet.active) bBullet.destroy();
                        });
                    }
                }
            }
        });
    }
}

export default BotManager;
