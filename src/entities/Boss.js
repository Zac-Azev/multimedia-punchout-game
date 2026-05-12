import {
  EnemyState,
  AttackType,
  Timing,
  Damage,
} from '../configs/constants.js';

/**
 * Boss — abstract base for all bosses.
 *
 * NEW IMPACT-WINDOW MODEL:
 *   - The boss waits the FULL attack window before resolving.
 *   - At resolution (impact moment), it asks the scene "did the
 *     player defend?" via the onResolveImpact hook, which calls
 *     player.evaluateDefense(...).
 *   - The player can press any time during the window; their press
 *     gives them I_FRAME_MS of i-frames. They must time the press so
 *     the i-frames are still active at impact.
 *
 * Pacing:
 *   POST_INTERACTION_GAP_MS — small breathing room after every atomic
 *   resolution (so attacks within Swipes/Mixup feel separate).
 *   ENEMY_GAP_MS — bigger gap between full combos.
 */
export class Boss {
  constructor(scene, maxHp) {
    if (new.target === Boss) {
      throw new Error(
        'Boss is abstract — instantiate EnemyPhase1 or EnemyPhase2.'
      );
    }

    this.scene = scene;

    this.maxHp = maxHp;
    this.vida = maxHp;

    this.enemyCombatState = EnemyState.IDLE;
    this.enemyAttackType = null;
    this.enemyTime = 0;

    this._currentTimer = null;
    this._sequenceQueue = [];
    this._comboLandedHits = 0;
    this._comboTotal = 0;
  }

  getAttackPool() {
    throw new Error('Subclass must implement getAttackPool()');
  }

  // ─── Core state machine ─────────────────────────────────────

  atacar(attackType) {
    if (this.enemyCombatState === EnemyState.DEAD) return false;

    // Cancel any pending timer (e.g. stale vulnerable window) to prevent overlap
    if (this._currentTimer) {
      this._currentTimer.remove(false);
      this._currentTimer = null;
    }

    this._sequenceQueue = this.expandAttack(attackType);
    this._comboLandedHits = 0;
    this._comboTotal = this._sequenceQueue.length;

    this._runNextStep();
    return true;
  }

  expandAttack(attackType) {
    switch (attackType) {
      case AttackType.SWIPES:
        return this.buildSwipes();
      case AttackType.MIXUP:
        return this.buildMixup();
      case AttackType.SUPREME:
        return this.buildSupreme();
      default:
        return [attackType];
    }
  }

  buildSwipes() {
    const pool = [AttackType.ATTACK_LEFT, AttackType.ATTACK_RIGHT];
    return Array.from(
      { length: 3 },
      () => pool[Math.floor(Math.random() * pool.length)]
    );
  }

  buildMixup() {
    const pool = [
      AttackType.ATTACK_LEFT,
      AttackType.ATTACK_RIGHT,
      AttackType.ATTACK_FULL,
      AttackType.FEINT,
    ];
    return Array.from(
      { length: 3 },
      () => pool[Math.floor(Math.random() * pool.length)]
    );
  }

  buildSupreme() {
    return [
      AttackType.ATTACK_LEFT,
      AttackType.ATTACK_RIGHT,
      AttackType.ATTACK_LEFT,
      AttackType.ATTACK_LEFT,
      AttackType.ATTACK_RIGHT,
      AttackType.FEINT,
      AttackType.ATTACK_LEFT,
      AttackType.ATTACK_FULL,
    ];
  }

  _runNextStep() {
    if (this.enemyCombatState === EnemyState.DEAD) return;

    if (this._sequenceQueue.length === 0) {
      this._onSequenceComplete();
      return;
    }

    const nextType = this._sequenceQueue.shift();
    this._enterWindup(nextType);
  }

  _enterWindup(attackType) {
    this.enemyAttackType = attackType;
    this.enemyCombatState = EnemyState.PARRIABLE;
    this.enemyTime = this.scene.time.now;

    this.onWindupStart?.(attackType);

    this._currentTimer = this.scene.time.delayedCall(Timing.WINDUP_MS, () => {
      this._enterAttackWindow(attackType);
    });
  }

  _enterAttackWindow(attackType) {
    this.enemyCombatState = EnemyState.ATTACK;
    this.enemyTime = this.scene.time.now;

    const windowMs =
      attackType === AttackType.FEINT
        ? Timing.FEINT_MS
        : Timing.ATTACK_WINDOW_MS;

    this.onAttackActive?.(attackType);

    // Wait the FULL window before resolving — player presses during it
    // are recorded as stance + i-frames (handled by scene/player).
    this._currentTimer = this.scene.time.delayedCall(windowMs, () => {
      this._resolveImpact(attackType);
    });
  }

  /**
   * Impact moment — at end of the full attack window.
   * The scene's hook calls player.evaluateDefense() and reports back
   * via reportPlayerResponse(success).
   */
  _resolveImpact(attackType) {
    this.onResolveImpact?.(attackType); // scene evaluates + applies damage
    this.onAttackResolve?.(attackType); // hide hitboxes, etc.

    // Reset to IDLE during the gap — prevents _enterAttackable guard from blocking
    this.enemyCombatState = EnemyState.IDLE;

    // Micro-recovery between hits within a combo
    this._currentTimer = this.scene.time.delayedCall(
      Timing.POST_ATTACK_GAP_MS,
      () => {
        this._runNextStep();
      }
    );
  }

  reportPlayerResponse(success) {
    if (success) this._comboLandedHits += 1;
  }

  _onSequenceComplete() {
    this.onSequenceComplete?.(this._comboLandedHits, this._comboTotal);
    this._enterAttackable();
  }

  _enterAttackable() {
    // Guard: don't enter vulnerable if a new combo already started
    if (
      this.enemyCombatState === EnemyState.ATTACK ||
      this.enemyCombatState === EnemyState.PARRIABLE
    ) {
      return;
    }

    this.enemyCombatState = EnemyState.ATTACKABLE;
    this.enemyTime = this.scene.time.now;
    this.onVulnerableStart?.();

    this._currentTimer = this.scene.time.delayedCall(
      Timing.ATTACKABLE_MS,
      () => {
        // Guard: only fire if we're still actually vulnerable
        if (this.enemyCombatState !== EnemyState.ATTACKABLE) return;
        this.enemyCombatState = EnemyState.IDLE;
        this.onVulnerableEnd?.();
      }
    );
  }

  // ─── Defensive actions ──────────────────────────────────────

  block() {
    this.onBlock?.();
    return true;
  }

  perdeVida() {
    this.vida = Math.max(0, this.vida - Damage.BOSS_HIT_TAKES);
    this.enemyCombatState = EnemyState.STAGGER;
    this.enemyTime = this.scene.time.now;
    this.onStagger?.();

    if (this.vida <= 0) {
      this._die();
      return true;
    }

    this.scene.time.delayedCall(Timing.BOSS_STAGGER_MS, () => {
      if (this.enemyCombatState === EnemyState.STAGGER) {
        this._enterAttackable();
      }
    });
    return true;
  }

  _die() {
    this.enemyCombatState = EnemyState.DEAD;
    if (this._currentTimer) this._currentTimer.remove(false);
    this.onDeath?.();
  }

  // ─── Hooks ──────────────────────────────────────────────────
  onWindupStart(attackType) {}
  onAttackActive(attackType) {}
  onResolveImpact(attackType) {} // NEW — scene evaluates defense here
  onAttackResolve(attackType) {}
  onSequenceComplete(landed, total) {}
  onVulnerableStart() {}
  onVulnerableEnd() {}
  onStagger() {}
  onBlock() {}
  onDeath() {}
}
