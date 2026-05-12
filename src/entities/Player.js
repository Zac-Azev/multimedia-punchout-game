import {
  PlayerState,
  EnemyState,
  AttackType,
  Damage,
  Timing,
} from '../configs/constants.js';

/**
 * Player — the protagonist character.
 *
 * COMMITMENT MODEL:
 *   When the player presses a defensive or offensive button, they are
 *   locked out of further input for:
 *     - I_FRAME_MS (the i-frame protection window)
 *     + a "downtime" equal to half the action's duration
 *
 *   For defenses (parry/dodge) the action is the boss's attack window,
 *   so downtime = ATTACK_WINDOW_MS / 2.
 *   For offensive attacks during vulnerable, downtime = I_FRAME_MS / 2.
 *
 *   This prevents double-press correction and forces commitment.
 */
export class Player {
  constructor(scene, maxHp) {
    this.scene = scene;

    this.maxHp = maxHp;
    this.vida = maxHp;

    this.playerCombatState = PlayerState.IDLE;
    this.playerTime = 0;

    this.staggerUntil = 0;
    this.whiffCount = 0;

    // i-frame stance tracking
    this.iFrameUntil = 0;
    this.activeStance = null;
    this.pressedDuringAttack = false;

    // commitment lock — blocks ALL input until this timestamp
    this.lockedUntil = 0;
  }

  // ─── Getters / setters per UML ──────────────────────────────
  getActionTime() {
    return this.playerTime;
  }
  setActionTime(t) {
    this.playerTime = t;
    return true;
  }

  getVida() {
    return this.vida;
  }
  setVida(vida) {
    this.vida = Math.max(0, Math.min(this.maxHp, vida));
    return true;
  }

  getPlayerCombatState() {
    return this.playerCombatState;
  }
  setPlayerCombatState(s) {
    this.playerCombatState = s;
    return true;
  }

  // ─── Internal helpers ───────────────────────────────────────
  isStaggered(now) {
    return now < this.staggerUntil;
  }
  hasActiveIFrames(now) {
    return now < this.iFrameUntil;
  }
  isLocked(now) {
    return now < this.lockedUntil;
  }

  /** Combined check — can the player accept input right now? */
  canAct(now) {
    return !this.isStaggered(now) && !this.isLocked(now);
  }

  /** Reset stance + lock state when a new boss attack begins. */
  onBossAttackStart() {
    this.activeStance = null;
    this.iFrameUntil = 0;
    this.pressedDuringAttack = false;
    // Note: we do NOT clear lockedUntil here — if the player committed
    // during a previous attack and the lock spills into this one,
    // they're still committed (they shouldn't be panic-mashing).
  }

  /** Defensive commit: i-frames + 1 beat downtime. */
  _commitDefense(now) {
    this.iFrameUntil = now + Timing.I_FRAME_MS;
    this.lockedUntil = now + Timing.I_FRAME_MS + Timing.COMMIT_DOWNTIME_MS;
  }

  /** Offensive commit: just the lock (no defensive i-frames). */
  _commitOffense(now) {
    this.lockedUntil = now + Timing.I_FRAME_MS + Timing.COMMIT_DOWNTIME_MS;
  }

  // ─── Defensive presses ──────────────────────────────────────

  parry(playerTime, enemyTime, enemyCombatState, enemyAttackType) {
    if (!this.canAct(playerTime)) return false;

    this.setActionTime(playerTime);
    this.setPlayerCombatState(PlayerState.PARRY);

    this.activeStance = 'PARRY';
    this.pressedDuringAttack = true;
    this._commitDefense(playerTime);
    return true;
  }

  desviar(playerTime, direction, enemyTime, enemyCombatState, enemyAttackType) {
    if (!this.canAct(playerTime)) return false;

    this.setActionTime(playerTime);
    this.setPlayerCombatState(PlayerState.DODGE);

    this.activeStance = direction === 'LEFT' ? 'DODGE_LEFT' : 'DODGE_RIGHT';
    this.pressedDuringAttack = true;
    this._commitDefense(playerTime);
    return true;
  }

  /**
   * Impact-moment evaluation called by the boss.
   * Player defends successfully iff i-frames active AND stance correct.
   */
  evaluateDefense(impactTime, enemyAttackType) {
    if (enemyAttackType === AttackType.FEINT) {
      return !this.pressedDuringAttack;
    }
    if (!this.hasActiveIFrames(impactTime)) return false;

    if (enemyAttackType === AttackType.ATTACK_FULL) {
      return this.activeStance === 'PARRY';
    }
    if (enemyAttackType === AttackType.ATTACK_LEFT) {
      return this.activeStance === 'DODGE_RIGHT';
    }
    if (enemyAttackType === AttackType.ATTACK_RIGHT) {
      return this.activeStance === 'DODGE_LEFT';
    }
    return false;
  }

  // ─── Offensive press ────────────────────────────────────────

  atacar(playerTime, enemyTime, enemyCombatState) {
    if (!this.canAct(playerTime)) return false;

    this.setActionTime(playerTime);
    this.setPlayerCombatState(PlayerState.ATTACK);

    // Offensive commit — uses I_FRAME_MS as the action duration baseline
    this._commitOffense(playerTime);

    if (enemyCombatState === EnemyState.ATTACKABLE) {
      this.whiffCount = 0;
      return true;
    }

    this.whiffCount += 1;
    return false;
  }

  // ─── Damage ─────────────────────────────────────────────────

  perdeVida(amount = Damage.PLAYER_HIT_TAKES) {
    this.setVida(this.vida - amount);
    this.setPlayerCombatState(PlayerState.STAGGER);
    this.staggerUntil = this.scene.time.now + Timing.PLAYER_STAGGER_MS;
    return this.vida;
  }

  resetWhiffs() {
    this.whiffCount = 0;
  }
}
