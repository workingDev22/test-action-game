export const PERK_POOL = [
    {
        id: 'speed',
        title: 'Скоростной привод',
        color: '#00ffcc',
        desc: '+20% к скорости бега\n-20% откат рывка (Dash)',
        apply: (scene) => {
            scene.perkStats.moveSpeedMult += 0.2;
            scene.perkStats.dashCooldownMult *= 0.8;
        }
    },
    {
        id: 'vampirism',
        title: 'Вампиризм',
        color: '#ff3366',
        desc: 'Лечение: 25% от урона\n+12 HP за каждое убийство',
        apply: (scene) => {
            scene.perkStats.lifesteal += 0.25;
            scene.perkStats.healOnKill += 12;
        }
    },
    {
        id: 'explosive',
        title: 'Разрывные пули',
        color: '#ff8800',
        desc: 'Пули взрываются при ударе,\nнанося AoE-урон вокруг',
        apply: (scene) => {
            scene.perkStats.explosiveLevel += 1;
        }
    },
    {
        id: 'rapid',
        title: 'Гиперзатвор',
        color: '#ffff44',
        desc: '+25% к скорострельности\n+20% к скорости полета пуль',
        apply: (scene) => {
            scene.perkStats.fireRateMult *= 0.78;
            scene.perkStats.bulletSpeedMult += 0.2;
        }
    },
    {
        id: 'multishot',
        title: 'Мульти-ствол',
        color: '#cc66ff',
        desc: '+1 дополнительный снаряд\nпри каждом выстреле',
        apply: (scene) => {
            scene.perkStats.bonusPellets += 1;
        }
    },
    {
        id: 'juggernaut',
        title: 'Титановая броня',
        color: '#44aaff',
        desc: '+35 к макс. здоровью,\nлечение и -15% урона по вам',
        apply: (scene) => {
            scene.playerMaxHp += 35;
            scene.playerHp = Math.min(scene.playerMaxHp, scene.playerHp + 60);
            scene.perkStats.damageReduction *= 0.85;
        }
    },
    {
        id: 'shield',
        title: 'Плазменный щит',
        color: '#0088ff',
        desc: '+50 к макс. энергощиту\nБыстрая регенерация вне боя',
        apply: (scene) => {
            scene.playerMaxShield += 50;
            scene.playerShield = scene.playerMaxShield;
        }
    },
    {
        id: 'drone',
        title: 'Боевой Дрон',
        color: '#aaff00',
        desc: 'Призывает орбитального дрона\nдля авто-отстрела врагов',
        apply: (scene) => {
            scene.spawnCompanionDrone();
        }
    }
];

export default PERK_POOL;
