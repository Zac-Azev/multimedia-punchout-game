import { Boss } from './Boss.js';
import { AttackType, HP } from '../configs/constants.js';

export class EnemyPhase1 extends Boss {
  constructor(scene) {
    super(scene, HP.BOSS_PHASE_1);
  }

  getAttackPool() {
    return [
      AttackType.ATTACK_LEFT,
      AttackType.ATTACK_RIGHT,
      AttackType.ATTACK_FULL,
    ];
  }

  /**
   * Triggered when phase 1 reaches 0 HP. Returns true if the boss
   * should be replaced by Phase 2 (the scene listens for this).
   */
  transform(vida = this.vida) {
    return vida <= 0;
  }

  _die() {
    // Don't fully die — flag for transformation instead
    super._die();
    this.onTransform?.();
  }

  // Hook for scene to listen
  onTransform() {}
}
