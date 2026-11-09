import { META_UPGRADES } from '../config/metaUpgrades.js';

export const GameStorage = {
    getStats() {
        try {
            const rawUpgrades = localStorage.getItem('cyberArena_metaUpgrades');
            const parsedUpgrades = rawUpgrades ? JSON.parse(rawUpgrades) : {};
            return {
                bestWave: parseInt(localStorage.getItem('cyberArena_bestWave') || '0', 10),
                bestKills: parseInt(localStorage.getItem('cyberArena_bestKills') || '0', 10),
                totalKills: parseInt(localStorage.getItem('cyberArena_totalKills') || '0', 10),
                credits: parseInt(localStorage.getItem('cyberArena_credits') || '0', 10),
                mode: localStorage.getItem('cyberArena_mode') || 'roguelike',
                upgrades: {
                    hull: parsedUpgrades.hull || 0,
                    weapons: parsedUpgrades.weapons || 0,
                    shield_core: parsedUpgrades.shield_core || 0,
                    greed: parsedUpgrades.greed || 0
                }
            };
        } catch (e) {
            return {
                bestWave: 0,
                bestKills: 0,
                totalKills: 0,
                credits: 0,
                mode: 'roguelike',
                upgrades: { hull: 0, weapons: 0, shield_core: 0, greed: 0 }
            };
        }
    },
    saveRun(wave, killsToAdd = 0) {
        try {
            const current = this.getStats();
            if (wave > current.bestWave) {
                localStorage.setItem('cyberArena_bestWave', String(wave));
            }
            if (killsToAdd > current.bestKills) {
                localStorage.setItem('cyberArena_bestKills', String(killsToAdd));
            }
            if (killsToAdd > 0) {
                localStorage.setItem('cyberArena_totalKills', String(current.totalKills + killsToAdd));
            }
        } catch (e) {}
    },
    addCredits(amount) {
        try {
            const current = this.getStats();
            const updated = Math.max(0, current.credits + Math.round(amount));
            localStorage.setItem('cyberArena_credits', String(updated));
            return updated;
        } catch (e) {
            return 0;
        }
    },
    getUpgradeCost(upgradeCfg, currentLevel) {
        return upgradeCfg.baseCost + currentLevel * upgradeCfg.costStep;
    },
    buyUpgrade(upgradeId) {
        try {
            const cfg = META_UPGRADES.find((u) => u.id === upgradeId);
            if (!cfg) return false;

            const stats = this.getStats();
            const curLvl = stats.upgrades[upgradeId] || 0;
            if (curLvl >= cfg.maxLevel) return false;

            const cost = this.getUpgradeCost(cfg, curLvl);
            if (stats.credits < cost) return false;

            stats.credits -= cost;
            stats.upgrades[upgradeId] = curLvl + 1;

            localStorage.setItem('cyberArena_credits', String(stats.credits));
            localStorage.setItem('cyberArena_metaUpgrades', JSON.stringify(stats.upgrades));
            return true;
        } catch (e) {
            return false;
        }
    },
    refundUpgrades() {
        try {
            const stats = this.getStats();
            let refunded = 0;
            META_UPGRADES.forEach((cfg) => {
                const lvl = stats.upgrades[cfg.id] || 0;
                for (let i = 0; i < lvl; i++) {
                    refunded += this.getUpgradeCost(cfg, i);
                }
                stats.upgrades[cfg.id] = 0;
            });
            stats.credits += refunded;
            localStorage.setItem('cyberArena_credits', String(stats.credits));
            localStorage.setItem('cyberArena_metaUpgrades', JSON.stringify(stats.upgrades));
            return refunded;
        } catch (e) {
            return 0;
        }
    },
    setMode(mode) {
        try {
            localStorage.setItem('cyberArena_mode', mode);
        } catch (e) {}
    }
};

export default GameStorage;
