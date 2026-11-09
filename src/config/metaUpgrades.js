export const META_UPGRADES = [
    {
        id: 'hull',
        title: 'Титановый каркас',
        color: '#00ff66',
        maxLevel: 5,
        baseCost: 40,
        costStep: 35,
        getDesc: (lvl) => `Стартовое здоровье: +${lvl * 20} HP\n(След. уровень: +20 макс. HP)`
    },
    {
        id: 'weapons',
        title: 'Калибровка стволов',
        color: '#ff5533',
        maxLevel: 5,
        baseCost: 50,
        costStep: 45,
        getDesc: (lvl) => `Базовый урон: +${lvl * 12}%\n(Усиливает пушки, взрывы и дронов)`
    },
    {
        id: 'shield_core',
        title: 'Генератор щита',
        color: '#00ccff',
        maxLevel: 4,
        baseCost: 65,
        costStep: 55,
        getDesc: (lvl) => `Стартовый энергощит: +${lvl * 25}\n(Регенерирует вне боя с 1-й волны)`
    },
    {
        id: 'greed',
        title: 'Нейро-мародер',
        color: '#ffcc00',
        maxLevel: 5,
        baseCost: 45,
        costStep: 40,
        getDesc: (lvl) => `Добыча кредитов: +${lvl * 25}%\nРадиус магнита чипов: +${lvl * 45} px`
    }
];

export default META_UPGRADES;
