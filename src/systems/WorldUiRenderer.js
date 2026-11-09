export class WorldUiRenderer {
    constructor(scene) {
        this.scene = scene;
        this.gfx = scene.add.graphics().setDepth(42);
    }

    clear() {
        this.gfx.clear();
    }

    render(time) {
        const g = this.gfx;
        g.clear();

        const scene = this.scene;
        if (!scene.player) return;

        // 1. Полоска здоровья, щита и рывка игрока
        const px = scene.player.x;
        const py = scene.player.y;
        const pw = 36;
        const ph = 5;
        const pbx = px - pw / 2;
        const pby = py - 28;
        const hpPct = Phaser.Math.Clamp(scene.playerHp / scene.playerMaxHp, 0, 1);

        g.fillStyle(0x000000, 0.85);
        g.fillRect(pbx - 1, pby - 1, pw + 2, ph + 2);
        g.fillStyle(0x00ff66, 1);
        g.fillRect(pbx, pby, Math.round(pw * hpPct), ph);

        // Энергощит и аура вокруг игрока
        if (scene.playerMaxShield > 0) {
            const sPct = Phaser.Math.Clamp(scene.playerShield / scene.playerMaxShield, 0, 1);
            const sy = pby - 7;
            g.fillStyle(0x000000, 0.85);
            g.fillRect(pbx - 1, sy - 1, pw + 2, 6);
            g.fillStyle(0x00ccff, 1);
            g.fillRect(pbx, sy, Math.round(pw * sPct), 4);

            if (scene.playerShield > 0) {
                g.lineStyle(2, 0x00ccff, 0.35 + sPct * 0.4);
                g.strokeCircle(px, py, 22);
            }
        }

        // Индикатор перезарядки рывка (Dash) под ногами игрока
        const currentDashCd = scene.baseDashCooldown * scene.perkStats.dashCooldownMult;
        const dashElapsed = time - scene.lastDashTime;
        if (dashElapsed < currentDashCd) {
            const dPct = Phaser.Math.Clamp(dashElapsed / currentDashCd, 0, 1);
            g.fillStyle(0x000000, 0.7);
            g.fillRect(pbx, py + 20, pw, 3);
            g.fillStyle(0x00ffff, 0.9);
            g.fillRect(pbx, py + 20, Math.round(pw * dPct), 3);
        }

        // Индикатор перезарядки Ультимейта "Сингулярность" [Q] под полосой рывка
        const ultCd = (scene.playerEntity && scene.playerEntity.ultCooldown) || scene.ultCooldown || 20000;
        const lastUlt = scene.playerEntity ? scene.playerEntity.lastUltTime : (scene.lastUltTime !== undefined ? scene.lastUltTime : -9999);
        const ultElapsed = time - lastUlt;
        const ultReady = ultElapsed >= ultCd;
        const ultPct = Phaser.Math.Clamp(ultElapsed / ultCd, 0, 1);

        g.fillStyle(0x000000, 0.75);
        g.fillRect(pbx, py + 25, pw, 3);
        if (ultReady) {
            g.fillStyle(0xcc00ff, 1);
            g.fillRect(pbx, py + 25, pw, 3);
        } else {
            g.fillStyle(0x550088, 0.9);
            g.fillRect(pbx, py + 25, Math.round(pw * ultPct), 3);
        }

        // Индикатор таймера комбо-стрика над игроком
        if (scene.streak > 1 && time < scene.streakExpireTime) {
            const cPct = Phaser.Math.Clamp((scene.streakExpireTime - time) / scene.streakDuration, 0, 1);
            g.fillStyle(0xffcc00, 0.9);
            g.fillRect(pbx, pby - (scene.playerMaxShield > 0 ? 11 : 4), Math.round(pw * cPct), 2);
        }

        // 2. Полоски здоровья всех активных ботов и телеграф рывка босса
        if (scene.bots) {
            scene.bots.getChildren().forEach((bot) => {
                if (!bot || !bot.active) return;

                if (bot.getData('isBoss')) {
                    if (bot.getData('bossState') === 'DASH_WINDUP') {
                        const dashAngle = bot.getData('dashAngle') || 0;
                        g.lineStyle(4, 0xff0044, 0.85);
                        g.lineBetween(
                            bot.x,
                            bot.y,
                            bot.x + Math.cos(dashAngle) * 750,
                            bot.y + Math.sin(dashAngle) * 750
                        );
                    }
                    return;
                }

                const isElite = bot.getData('isElite');
                const w = isElite ? 48 : 36;
                const h = isElite ? 6 : 5;
                const bx = bot.x - w / 2;
                const by = bot.y - (isElite ? 34 : 28);
                const pct = Phaser.Math.Clamp(bot.getData('hp') / bot.getData('maxHp'), 0, 1);

                g.fillStyle(0x000000, 0.85);
                g.fillRect(bx - 1, by - 1, w + 2, h + 2);
                const color = isElite ? 0xffcc00 : (pct > 0.35 ? 0x00ff44 : 0xff2244);
                g.fillStyle(color, 1);
                g.fillRect(bx, by, Math.round(w * pct), h);
            });
        }
    }
}

export default WorldUiRenderer;
