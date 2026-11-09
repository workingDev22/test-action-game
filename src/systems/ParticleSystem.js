export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;

        // Аппаратные GPU-эмиттеры частиц (Phaser 3.60+ / v4 API)
        this.sparkEmitter = scene.add.particles(0, 0, 'particle', {
            lifespan: { min: 140, max: 280 },
            speed: { min: 70, max: 240 },
            scale: { start: 0.85, end: 0 },
            alpha: { start: 1, end: 0 },
            blendMode: 'ADD',
            emitting: false
        }).setDepth(35);

        this.explosionEmitter = scene.add.particles(0, 0, 'particle', {
            lifespan: { min: 280, max: 520 },
            speed: { min: 90, max: 350 },
            scale: { start: 1.35, end: 0.1 },
            alpha: { start: 1, end: 0 },
            tint: [0xff2244, 0xff6600, 0xffcc00, 0xffffff],
            blendMode: 'ADD',
            emitting: false
        }).setDepth(36);
    }

    createExplosionParticles(x, y, count = 14) {
        this.explosionEmitter.explode(count, x, y);
    }

    createSpark(x, y, color, count = 5) {
        this.sparkEmitter.setParticleTint(color);
        this.sparkEmitter.explode(count, x, y);
    }

    createVortex(x, y) {
        this.sparkEmitter.setParticleTint(0xcc00ff);
        this.sparkEmitter.explode(40, x, y);
        const ring = this.scene.add.circle(x, y, 5, 0xcc00ff, 0.4).setStrokeStyle(3, 0xff00ff, 0.8);
        this.scene.tweens.add({
            targets: ring,
            radius: 250,
            duration: 1500,
            ease: 'Sine.easeIn',
            onComplete: () => ring.destroy()
        });
    }

    createDashGhost(x, y, flipX, tex = 'player', tint = 0x00ffff) {
        const ghost = this.scene.add.sprite(x, y, tex);
        ghost.setFlipX(flipX);
        ghost.setTint(tint);
        ghost.setAlpha(0.55);
        this.scene.tweens.add({
            targets: ghost,
            alpha: 0,
            scale: 0.85,
            duration: 220,
            onComplete: () => ghost.destroy()
        });
    }

    showFloatingText(x, y, message, color = '#ffffff', size = '15px') {
        const txt = this.scene.add.text(x, y - 16, message, {
            fontSize: size,
            fontFamily: 'monospace',
            fontStyle: 'bold',
            color: color,
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(50);

        this.scene.tweens.add({
            targets: txt,
            y: y - 55,
            alpha: 0,
            duration: 650,
            ease: 'Cubic.easeOut',
            onComplete: () => txt.destroy()
        });
    }
}

export default ParticleSystem;
