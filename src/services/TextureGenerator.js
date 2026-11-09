export function ensureGameTextures(scene) {
    if (scene.textures.exists('player')) return;

    const makeTex = (key, w, h, drawFn) => {
        const gfx = scene.make.graphics({ x: 0, y: 0, add: false });
        drawFn(gfx);
        gfx.generateTexture(key, w, h);
        gfx.destroy();
    };

    // 1. Игрок (32x32)
    makeTex('player', 32, 32, (g) => {
        g.fillStyle(0x0088ff, 1);
        g.fillRect(0, 0, 32, 32);
        g.lineStyle(2, 0x00ffff, 0.9);
        g.strokeRect(1, 1, 30, 30);
        g.fillStyle(0x88ffff, 1);
        g.fillRect(18, 6, 10, 8);
    });

    // 2. Обычный бот (32x32)
    makeTex('bot', 32, 32, (g) => {
        g.fillStyle(0xff2244, 1);
        g.fillRect(0, 0, 32, 32);
        g.lineStyle(2, 0xff6688, 0.8);
        g.strokeRect(1, 1, 30, 30);
        g.fillStyle(0xffcc00, 1);
        g.fillRect(18, 6, 10, 8);
    });

    // 3. Элитный бот (40x40)
    makeTex('elite_bot', 40, 40, (g) => {
        g.fillStyle(0x990033, 1);
        g.fillRect(0, 0, 40, 40);
        g.lineStyle(3, 0xffcc00, 1);
        g.strokeRect(1, 1, 38, 38);
        g.fillStyle(0x00ffff, 1);
        g.fillRect(22, 8, 12, 10);
    });

    // 4. Босс (64x64)
    makeTex('boss_bot', 64, 64, (g) => {
        g.fillStyle(0x4a001f, 1);
        g.fillRect(0, 0, 64, 64);
        g.lineStyle(4, 0xff0055, 1);
        g.strokeRect(2, 2, 60, 60);
        g.fillStyle(0xffaa00, 1);
        g.fillRect(4, 4, 14, 14);
        g.fillRect(4, 46, 14, 14);
        g.fillStyle(0x00ffff, 1);
        g.fillRect(36, 12, 20, 14);
        g.fillStyle(0xff0055, 1);
        g.fillCircle(32, 42, 10);
    });

    // 5. Платформа (200x32)
    makeTex('platform', 200, 32, (g) => {
        g.fillStyle(0x23263a, 1);
        g.fillRect(0, 0, 200, 32);
        g.fillStyle(0x00ffcc, 0.85);
        g.fillRect(0, 0, 200, 4);
        g.fillStyle(0x3e4466, 1);
        g.fillRect(0, 4, 200, 4);
    });

    // 6. Пуля (8x8) и Сфера Босса (14x14)
    makeTex('bullet', 8, 8, (g) => {
        g.fillStyle(0xffffff, 1);
        g.fillCircle(4, 4, 4);
    });

    makeTex('boss_orb', 14, 14, (g) => {
        g.fillStyle(0xff0066, 1);
        g.fillCircle(7, 7, 7);
        g.lineStyle(2, 0xffff00, 1);
        g.strokeCircle(7, 7, 6);
    });

    // 7. Граната (12x12)
    makeTex('grenade', 12, 12, (g) => {
        g.fillStyle(0x33ff33, 1);
        g.fillCircle(6, 6, 6);
        g.lineStyle(2, 0xffffff, 1);
        g.strokeCircle(6, 6, 5);
    });

    // 8. Коробка с оружием (24x24)
    makeTex('weapon_box', 24, 24, (g) => {
        g.fillStyle(0xff7700, 1);
        g.fillRect(0, 0, 24, 24);
        g.lineStyle(2, 0xffdd55, 1);
        g.strokeRect(1, 1, 22, 22);
    });

    // 9. Аптечка (22x22)
    makeTex('medkit', 22, 22, (g) => {
        g.fillStyle(0xffffff, 1);
        g.fillRect(0, 0, 22, 22);
        g.fillStyle(0x00cc44, 1);
        g.fillRect(8, 3, 6, 16);
        g.fillRect(3, 8, 16, 6);
    });

    // 10. Взрывная бочка (28x36)
    makeTex('barrel', 28, 36, (g) => {
        g.fillStyle(0xcc1122, 1);
        g.fillRect(0, 0, 28, 36);
        g.fillStyle(0xffcc00, 1);
        g.fillRect(0, 12, 28, 12);
        g.lineStyle(2, 0x550000, 1);
        g.strokeRect(1, 1, 26, 34);
    });

    // 11. Батут (64x14)
    makeTex('jump_pad', 64, 14, (g) => {
        g.fillStyle(0x00ffcc, 1);
        g.fillRect(0, 0, 64, 14);
        g.fillStyle(0xffffff, 1);
        g.fillRect(8, 2, 48, 4);
    });

    // 12. Индикатор пушки (22x6)
    makeTex('gun_indicator', 22, 6, (g) => {
        g.fillStyle(0xffffff, 1);
        g.fillRect(0, 0, 22, 6);
    });

    // 13. Частица (6x6)
    makeTex('particle', 6, 6, (g) => {
        g.fillStyle(0xffffff, 1);
        g.fillRect(0, 0, 6, 6);
    });

    // 14. Боевой Дрон (18x18)
    makeTex('drone_bot', 18, 18, (g) => {
        g.fillStyle(0x223322, 1);
        g.fillCircle(9, 9, 8);
        g.lineStyle(2, 0xaaff00, 1);
        g.strokeCircle(9, 9, 7);
        g.fillStyle(0xeeff66, 1);
        g.fillCircle(9, 9, 3);
        g.fillStyle(0xaaff00, 1);
        g.fillRect(12, 7, 6, 4);
    });

    // 15. Кредит-чип (14x14)
    makeTex('credit_chip', 14, 14, (g) => {
        g.fillStyle(0xffaa00, 1);
        g.fillCircle(7, 7, 6);
        g.lineStyle(2, 0xffff66, 1);
        g.strokeCircle(7, 7, 6);
        g.fillStyle(0xffffff, 1);
        g.fillRect(5, 4, 4, 6);
    });
}

export function attachNeonBloom(camera) {
    if (camera && camera.postFX) {
        try {
            camera.postFX.addBloom(0xffffff, 1, 1, 1.15, 0.32);
        } catch (e) {}
    }
}
