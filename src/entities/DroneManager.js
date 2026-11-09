export class DroneManager {
    constructor(scene) {
        this.scene = scene;
        this.drones = [];
        this.scene.drones = this.drones;
    }

    spawnCompanionDrone() {
        const player = this.scene.player;
        if (!player) return;

        const drone = this.scene.add.sprite(player.x, player.y, 'drone_bot');
        drone.setDepth(35);
        drone.lastFired = 0;
        drone.orbitAngle = 0;
        this.drones.push(drone);
        this.scene.drones = this.drones;

        if (this.scene.particles) {
            this.scene.particles.createSpark(player.x, player.y, 0xaaff00, 12);
        } else if (this.scene.createSpark) {
            this.scene.createSpark(player.x, player.y, 0xaaff00, 12);
        }
    }

    update(time, dt) {
        const count = this.drones.length;
        if (count === 0) return;

        const player = this.scene.player;
        if (!player || !player.active) return;

        const lerpFactor = 1 - Math.pow(0.001, dt);
        const botsGroup = this.scene.botManager ? this.scene.botManager.bots : this.scene.bots;

        this.drones.forEach((drone, index) => {
            drone.orbitAngle += 2.7 * dt;
            const angleOffset = (index * Math.PI * 2) / count;
            const currentOrbit = drone.orbitAngle + angleOffset;

            const targetX = player.x + Math.cos(currentOrbit) * 46;
            const targetY = player.y - 18 + Math.sin(currentOrbit) * 16;

            drone.setPosition(
                Phaser.Math.Linear(drone.x, targetX, lerpFactor),
                Phaser.Math.Linear(drone.y, targetY, lerpFactor)
            );

            let closestBot = null;
            let closestDist = 460;

            if (botsGroup) {
                botsGroup.getChildren().forEach((bot) => {
                    if (bot && bot.active) {
                        const d = Phaser.Math.Distance.Between(drone.x, drone.y, bot.x, bot.y);
                        if (d < closestDist) {
                            closestDist = d;
                            closestBot = bot;
                        }
                    }
                });
            }

            if (closestBot) {
                const aimAngle = Phaser.Math.Angle.Between(drone.x, drone.y, closestBot.x, closestBot.y);
                drone.setRotation(aimAngle);

                if (time > drone.lastFired) {
                    drone.lastFired = time + 650;
                    const bullet = this.scene.bullets.create(
                        drone.x + Math.cos(aimAngle) * 10,
                        drone.y + Math.sin(aimAngle) * 10,
                        'bullet'
                    );
                    if (bullet) {
                        bullet.setScale(0.85);
                        bullet.setTint(0xaaff00);
                        const wave = this.scene.waveManager ? this.scene.waveManager.wave : (this.scene.wave || 1);
                        const metaDamageMult = this.scene.metaDamageMult || 1.0;
                        const droneDmg = Math.round((12 + wave * 1.2) * metaDamageMult);
                        bullet.setData('damage', droneDmg);
                        bullet.setData('knockback', 45);
                        this.scene.physics.velocityFromRotation(aimAngle, 680, bullet.body.velocity);

                        this.scene.time.delayedCall(1500, () => {
                            if (bullet && bullet.active) bullet.destroy();
                        });
                    }
                }
            } else {
                drone.setRotation(0);
            }
        });
    }
}

export default DroneManager;
