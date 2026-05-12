// ─────────────────────────────────────────────────────────────
// SPRITE CONFIGURATION
// All sprite keys, scales, and asset paths in one file.
// Tweak the scale values here to get consistent visual sizes.
// ─────────────────────────────────────────────────────────────

const ASSET_BASE =
  'https://raw.githubusercontent.com/Zac-Azev/multimedia-punchout-game/main/assets';

// ─────────────────────────────────────────────────────────────
// PLAYER SPRITES
// ─────────────────────────────────────────────────────────────
export const PlayerSprites = Object.freeze({
  idle: {
    key: 'player_idle',
    path: `${ASSET_BASE}/player_sprites/player_idle.png`,
    scale: 0.3,
  },
  dodge: {
    key: 'player_dodge',
    path: `${ASSET_BASE}/player_sprites/player_dodge.png`,
    scale: 0.2,
  },
  parry: {
    key: 'player_parry',
    path: `${ASSET_BASE}/player_sprites/player_parry.png`,
    scale: 0.3,
  },
  attack1: {
    key: 'player_attack1',
    path: `${ASSET_BASE}/player_sprites/player_attack_1.png`,
    scale: 0.23,
  },
  attack2: {
    key: 'player_attack2',
    path: `${ASSET_BASE}/player_sprites/player_attack_2.png`,
    scale: 0.12,
  },
  stagger: {
    key: 'player_stagger',
    path: `${ASSET_BASE}/player_sprites/player_stagger.png`,
    scale: 0.2,
  },
});

// ─────────────────────────────────────────────────────────────
// BOSS PHASE 1 SPRITES
// ─────────────────────────────────────────────────────────────
export const Boss1Sprites = Object.freeze({
  idle: {
    key: 'boss1_idle',
    path: `${ASSET_BASE}/boss_phase1_sprites/bossp1_idle.png`,
    scale: 0.35,
  },
  lean: {
    key: 'boss1_lean',
    path: `${ASSET_BASE}/boss_phase1_sprites/bossp1_lean.png`,
    scale: 0.35,
  },
  squash: {
    key: 'boss1_squash',
    path: `${ASSET_BASE}/boss_phase1_sprites/bossp1_squash.png`,
    scale: 0.35,
  },
  lateral: {
    key: 'boss1_lateral',
    path: `${ASSET_BASE}/boss_phase1_sprites/bossp1_lateral.png`,
    scale: 0.35,
  },
  lunge: {
    key: 'boss1_lunge',
    path: `${ASSET_BASE}/boss_phase1_sprites/bossp1_lunge.png`,
    scale: 0.35,
  },
  vulnerable: {
    key: 'boss1_vulnerable',
    path: `${ASSET_BASE}/boss_phase1_sprites/bossp1_vulnerable.png`,
    scale: 0.25,
  },
  hit: {
    key: 'boss1_hit',
    path: `${ASSET_BASE}/boss_phase1_sprites/bossp1_hit.png`,
    scale: 0.25,
  },
});

// ─────────────────────────────────────────────────────────────
// BOSS PHASE 2 SPRITES
// ─────────────────────────────────────────────────────────────
export const Boss2Sprites = Object.freeze({
  idle: {
    key: 'boss2_idle',
    path: `${ASSET_BASE}/boss_phase2_sprites/bossp2_idle.png`,
    scale: 0.35,
  },
  lean: {
    key: 'boss2_lean',
    path: `${ASSET_BASE}/boss_phase2_sprites/bossp2_lean.png`,
    scale: 0.24,
  },
  squash: {
    key: 'boss2_squash',
    path: `${ASSET_BASE}/boss_phase2_sprites/bossp2_squash.png`,
    scale: 0.24,
  },
  lateral: {
    key: 'boss2_lateral',
    path: `${ASSET_BASE}/boss_phase2_sprites/bossp2_lateral.png`,
    scale: 0.24,
  },
  lunge: {
    key: 'boss2_lunge',
    path: `${ASSET_BASE}/boss_phase2_sprites/bossp2_lunge.png`,
    scale: 0.24,
  },
  vulnerable: {
    key: 'boss2_vulnerable',
    path: `${ASSET_BASE}/boss_phase2_sprites/bossp2_vulnerable.png`,
    scale: 0.2,
  },
  hit: {
    key: 'boss2_hit',
    path: `${ASSET_BASE}/boss_phase2_sprites/bossp2_hit.png`,
    scale: 0.18,
  },
  feint: {
    key: 'boss2_feint',
    path: `${ASSET_BASE}/boss_phase2_sprites/bossp2_feint.png`,
    scale: 0.24,
  },
  laststand: {
    key: 'boss2_laststand',
    path: `${ASSET_BASE}/boss_phase2_sprites/bossp2_laststand.png`,
    scale: 0.35,
  },
});

// ─────────────────────────────────────────────────────────────
// BACKGROUNDS
// ─────────────────────────────────────────────────────────────
export const Backgrounds = Object.freeze({
  phase1: {
    key: 'bg_phase1',
    path: `${ASSET_BASE}/background/phase1_background.png`,
  },
  phase2: {
    key: 'bg_phase2',
    path: `${ASSET_BASE}/background/phase2_background.png`,
  },
});

// ─────────────────────────────────────────────────────────────
// TINT COLORS (applied on top of sprites for state feedback)
// ─────────────────────────────────────────────────────────────
export const Tints = Object.freeze({
  NONE: 0xffffff,
  VULNERABLE: 0xffcc00,
  HIT: 0xffffff,
  PHASE2: 0xcc88ff,
  FEINT: 0x44ff88,
  LASTSTAND: 0xff2200,
});

// ─────────────────────────────────────────────────────────────
// PLAYER POSITION & DEFAULT SCALE
// ─────────────────────────────────────────────────────────────
export const PlayerPosition = Object.freeze({
  x: 400,
  y: 520,
  originX: 0.5,
  originY: 0.8,
  depth: 3,
});

// ─────────────────────────────────────────────────────────────
// BOSS POSITION & DEFAULT SCALE
// ─────────────────────────────────────────────────────────────
export const BossPosition = Object.freeze({
  x: 400,
  y: 200,
  originX: 0.5,
  originY: 0.5,
  depth: 1,
});
