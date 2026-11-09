# АРХИТЕКТУРА И КОНТРАКТЫ МОДУЛЕЙ

Исходный код находится в `legacy_monolith.js` (эталонная реализация). Мы декомпозируем его поэтапно.

## Граф зависимостей
1. `config/*` -> Не зависят ни от чего.
2. `services/*` -> Зависят только от `config/*`.
3. `systems/*`, `entities/*`, `ui/*` -> Принимают ссылку на `scene` (`MainScene`) в конструкторе: `constructor(scene)`.
4. `scenes/*` -> Импортируют сервисы, инициализируют системы в `create()` и вызывают их `.update(time, dt)` в своем цикле `update(time, delta)`.

## Карта переноса из монолита
- `CyberAudio` -> `src/services/CyberAudio.js`
- `GameStorage` -> `src/services/GameStorage.js` (импортирует `META_UPGRADES`)
- `ensureGameTextures`, `attachNeonBloom` -> `src/services/TextureGenerator.js`
- `WEAPONS` -> `src/config/weapons.js`
- `META_UPGRADES` -> `src/config/metaUpgrades.js`
- `PERK_POOL` -> `src/config/perks.js`
- `MenuScene` -> `src/scenes/MenuScene.js`
- `MainScene` -> Координирует работу в `src/scenes/MainScene.js`, делегируя:
  - Отрисовку баров (`renderWorldUi`) в `src/systems/WorldUiRenderer.js`
  - Эффекты (`createSpark`, `createExplosionParticles`, `createDashGhost`) в `src/systems/ParticleSystem.js`
  - UI-окна (`showPerkSelectionScreen`, `showPauseOverlay`, `triggerGameOver`) в `src/ui/ModalOverlays.js`