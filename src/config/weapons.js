export const WEAPONS = {
    Pistol: {
        key: 'Pistol',
        name: 'Pistol',
        fireRate: 320,
        speed: 780,
        pellets: 1,
        spread: 0.03,
        recoil: 50,
        damage: 26,
        knockback: 180,
        color: 0xffff00
    },
    Shotgun: {
        key: 'Shotgun',
        name: 'Shotgun',
        fireRate: 850,
        speed: 620,
        pellets: 6,
        spread: 0.28,
        recoil: 260,
        damage: 18,
        knockback: 170,
        color: 0xff6600
    },
    Rifle: {
        key: 'Rifle',
        name: 'Rifle',
        fireRate: 120,
        speed: 880,
        pellets: 1,
        spread: 0.08,
        recoil: 35,
        damage: 15,
        knockback: 95,
        color: 0x00ffff
    },
    Sniper: {
        key: 'Sniper',
        name: 'Sniper',
        fireRate: 1050,
        speed: 1550,
        pellets: 1,
        spread: 0.004,
        recoil: 300,
        damage: 88,
        knockback: 420,
        color: 0xff00ff,
        isRailgun: true
    },
    Launcher: {
        key: 'Launcher',
        name: 'Launcher',
        fireRate: 950,
        speed: 620,
        pellets: 1,
        spread: 0.05,
        recoil: 200,
        damage: 90,
        knockback: 380,
        color: 0x44ff44,
        isGrenade: true
    },
    Plasma: {
        key: 'Plasma',
        name: 'Plasma-Thrower',
        fireRate: 45,
        speed: 470,
        pellets: 1,
        spread: 0.18,
        recoil: 8,
        damage: 6.5,
        knockback: 12,
        color: 0xff3300,
        isFlamethrower: true
    }
};

export default WEAPONS;
