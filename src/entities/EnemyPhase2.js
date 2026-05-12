import { Boss } from './Boss.js';
import {
  AttackType,
  EnemyState,
  HP,
  Timing,
  MashConfig,
} from '../configs/constants.js';

export class EnemyPhase2 extends Boss {
  constructor(scene) {
    super(scene, HP.BOSS_PHASE_2);
    this.supremeCounter = 0;
    this._isSupreme = false;
    this._isLastStand = false; // true after boss reaches 0 HP
  }

  getAttackPool() {
    // Supreme is NOT in the random pool — it only fires as a last stand
    return [
      AttackType.ATTACK_LEFT,
      AttackType.ATTACK_RIGHT,
      AttackType.ATTACK_FULL,
      AttackType.SWIPES,
      AttackType.FEINT,
      AttackType.MIXUP,
    ];
  }

  /** Override atacar to set the explicit Supreme flag. */
  atacar(attackType) {
    this._isSupreme = attackType === AttackType.SUPREME;
    if (this._isSupreme) {
      this.supremeCounter = 0;
      console.log('[EnemyPhase2] Supreme sequence started (LAST STAND)');
    }
    return super.atacar(attackType);
  }

  /**
   * Supreme keeps going on failure (Midir-style).
   * The player takes damage (handled by the scene's onResolveImpact),
   * but the sequence does NOT abort. Every step plays out.
   */
  reportPlayerResponse(success) {
    super.reportPlayerResponse(success);

    if (this._isSupreme) {
      if (success) {
        this.supremeCounter += 1;
        console.log(
          '[EnemyPhase2] Supreme step survived:',
          this.supremeCounter,
          '/ 8'
        );
      } else {
        // Does NOT abort — sequence continues, player just takes the hit
        console.log(
          '[EnemyPhase2] Supreme step MISSED at',
          this.supremeCounter + 1,
          '— sequence continues'
        );
      }
    }
  }

  _isInSupremeSequence() {
    return this._isSupreme;
  }

  /**
   * After Supreme completes (all 8 steps played out regardless of hits),
   * boss enters infinite vulnerable. One hit = death scene.
   */
  _onSequenceComplete() {
    if (this._isSupreme) {
      console.log(
        '[EnemyPhase2] Supreme complete — survived hits:',
        this._comboLandedHits,
        '/ 8'
      );
      this._isSupreme = false;
      // Infinite vulnerable — no timer. One hit kills.
      this.enemyCombatState = EnemyState.ATTACKABLE;
      this.enemyTime = this.scene.time.now;
      this.onLastStandVulnerable?.();
      return; // don't call super — no timer-based vulnerable
    }
    this._isSupreme = false;
    super._onSequenceComplete();
  }

  /**
   * Override perdeVida:
   * - During LAST STAND vulnerable: one hit = death scene
   * - During normal combat: if HP hits 0, trigger last stand instead of dying
   */
  perdeVida() {
    // If in last stand vulnerable — any hit kills
    if (this._isLastStand && this.enemyCombatState === EnemyState.ATTACKABLE) {
      console.log('[EnemyPhase2] FINISHING BLOW — death scene');
      this.vida = 0;
      this._die();
      this.deathScene();
      return true;
    }

    // Normal damage
    this.vida = Math.max(0, this.vida - 1);
    this._vulnerableHits = (this._vulnerableHits || 0) + 1;
    console.log(
      '[EnemyPhase2] perdeVida → vida:',
      this.vida,
      'hits:',
      this._vulnerableHits
    );

    if (this.vida <= 0 && !this._isLastStand) {
      // Don't die — enter LAST STAND
      console.log('[EnemyPhase2] HP reached 0 — entering LAST STAND');
      this._isLastStand = true;
      this.enemyCombatState = EnemyState.STAGGER;
      this.enemyTime = this.scene.time.now;

      // Cancel any current action
      if (this._currentTimer) {
        this._currentTimer.remove(false);
        this._currentTimer = null;
      }
      this._sequenceQueue = [];

      this.onLastStandStart?.();
      return true;
    }

    // Normal stagger
    this.enemyCombatState = EnemyState.STAGGER;
    this.enemyTime = this.scene.time.now;
    this.onStagger?.();

    // Max hits reached — boss recovers immediately
    if (this._vulnerableHits >= MashConfig.MAX_HITS_PER_VULNERABLE) {
      console.log(
        '[EnemyPhase2] max hits reached (' +
          this._vulnerableHits +
          ') — recovering'
      );
      if (this._currentTimer) {
        this._currentTimer.remove(false);
        this._currentTimer = null;
      }
      this.scene.time.delayedCall(Timing.BOSS_STAGGER_MS, () => {
        if (this.enemyCombatState === EnemyState.STAGGER) {
          this.enemyCombatState = EnemyState.IDLE;
          this.onVulnerableEnd?.();
        }
      });
      return true;
    }

    this.scene.time.delayedCall(Timing.BOSS_STAGGER_MS, () => {
      if (this.enemyCombatState === EnemyState.STAGGER) {
        this._enterAttackable();
      }
    });
    return true;
  }

  deathScene() {
    this.enemyCombatState = EnemyState.DEAD;
    this.onDeathScene?.();
    return true;
  }

  // Hooks
  onLastStandStart() {} // dramatic pause before Supreme
  onLastStandVulnerable() {} // infinite vulnerable after Supreme
  onDeathScene() {}
}
