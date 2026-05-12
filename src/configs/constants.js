// ─────────────────────────────────────────────────────────────
// BEAT-BASED TIMING MODEL
// One beat = 400ms. Everything is a multiple of this beat
// for a consistent, rhythmic combat feel.
// ─────────────────────────────────────────────────────────────
const BEAT = 400;

// ─────────────────────────────────────────────────────────────
// PLAYER STATES
// ─────────────────────────────────────────────────────────────
export const PlayerState = Object.freeze({
  IDLE: 'Idle',
  ATTACK: 'Attack',
  PARRY: 'Parry',
  DODGE: 'Dodge',
  STAGGER: 'Stagger',
});

// ─────────────────────────────────────────────────────────────
// ENEMY STATES
// ─────────────────────────────────────────────────────────────
export const EnemyState = Object.freeze({
  IDLE: 'Idle',
  ATTACK: 'Attack',
  PARRIABLE: 'Parriable',
  ATTACKABLE: 'Attackable',
  STAGGER: 'Stagger',
  DEAD: 'Dead',
});

// ─────────────────────────────────────────────────────────────
// ATTACK TYPES
// ─────────────────────────────────────────────────────────────
export const AttackType = Object.freeze({
  ATTACK_LEFT: 'AttackLeft',
  ATTACK_RIGHT: 'AttackRight',
  ATTACK_FULL: 'AttackFull',
  SWIPES: 'Swipes',
  FEINT: 'Feint',
  MIXUP: 'Mixup',
  SUPREME: 'Supreme',
});

export const AttackResponse = Object.freeze({
  [AttackType.ATTACK_LEFT]: 'RIGHT',
  [AttackType.ATTACK_RIGHT]: 'LEFT',
  [AttackType.ATTACK_FULL]: 'SPACE',
  [AttackType.FEINT]: null,
});

// ─────────────────────────────────────────────────────────────
// TIMINGS — all beat-locked
// ─────────────────────────────────────────────────────────────
export const Timing = Object.freeze({
  BEAT,

  // ─── Attack cycle (per atomic attack) ───────────────────────
  WINDUP_MS: BEAT * 2, //  800ms — boss leans, player reads direction
  ATTACK_WINDOW_MS: BEAT * 2, //  800ms — squash (400ms tension) + dodge (400ms react)
  DODGE_WINDOW_MS: BEAT * 1, //  400ms — visual follow-through after impact
  HITBOX_PREVIEW_MS: 100, //  100ms — green "!" flashes just before dodge window opens
  I_FRAME_MS: BEAT * 0.75, //  300ms — more forgiving dodge window

  // ─── Feint ──────────────────────────────────────────────────
  FEINT_MS: BEAT * 4, // 1600ms — longer bait window

  // ─── Recovery / stagger ─────────────────────────────────────
  PLAYER_STAGGER_MS: BEAT * 1.5, //  600ms — can't act after hit
  BOSS_STAGGER_MS: BEAT * 1.5, //  600ms — boss frozen after hit

  // ─── Commitment lock ────────────────────────────────────────
  // After pressing: I_FRAME_MS + COMMIT_DOWNTIME = total lock
  COMMIT_DOWNTIME_MS: BEAT * 1, //  400ms — 1 beat downtime after i-frames

  // ─── Pacing / rhythm ───────────────────────────────────────
  POST_ATTACK_GAP_MS: BEAT * 1.5, //  600ms — micro-recovery between combo hits
  ATTACKABLE_MS: BEAT * 4, // 1600ms — halved, ~2 hits if well-timed
  POST_VULNERABLE_MS: BEAT * 4, // 1600ms — breather after vulnerable closes
  IDLE_BEFORE_COMBO_MS: BEAT * 4, // 1600ms — breather before new combo
});

// ─────────────────────────────────────────────────────────────
// DAMAGE & HP
// ─────────────────────────────────────────────────────────────
export const Damage = Object.freeze({
  PLAYER_HIT_TAKES: 1,
  PLAYER_MISS_PARRY: 2,
  BOSS_HIT_TAKES: 1,
});

export const HP = Object.freeze({
  PLAYER: 6,
  BOSS_PHASE_1: 7,
  BOSS_PHASE_2: 12,
});

// ─────────────────────────────────────────────────────────────
// MASH PROTECTION
// ─────────────────────────────────────────────────────────────
export const MashConfig = Object.freeze({
  MAX_WHIFFS_BEFORE_PUNISH: 3,
  MAX_HITS_PER_VULNERABLE: 2, // boss recovers after this many hits per vulnerable window
});
