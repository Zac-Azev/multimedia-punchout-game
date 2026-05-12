import Phaser from 'phaser';
import { Player } from '../entities/Player.js';
import { EnemyPhase1 } from '../entities/EnemyPhase1.js';
import { EnemyPhase2 } from '../entities/EnemyPhase2.js';
import { GameOverScene } from './GameOverScene.js';
import { GameWonScene } from './GameWonScene.js';
import {
  PlayerState,
  EnemyState,
  AttackType,
  Timing,
  Damage,
  MashConfig,
  HP,
} from '../configs/constants.js';

// ─── Color palette ──────────────────────────────────────────
const COLOR_BOSS_DEFAULT = 0xc0392b;
const COLOR_BOSS_VULNERABLE = 0xf39c12;
const COLOR_BOSS_HIT = 0xffffff;
const COLOR_BOSS_PHASE2 = 0x8e44ad;
const COLOR_BOSS_FEINT = 0x27ae60;

// Hitbox colors: ORANGE for dodge (L/R), BLUE for parry (Full)
const COLOR_HB_DODGE = 0xe67e22; // orange
const COLOR_HB_PARRY = 0x3498db; // blue

export class FightScene1 extends Phaser.Scene {
  constructor() {
    super({ key: 'FightScene1' });
  }

  preload() {}

  create() {
    console.log('[FightScene1] create() called');
    // Force re-enable keyboard — it was disabled during game over
    this.input.keyboard.enabled = true;
    console.log('[FightScene1] keyboard enabled:', this.input.keyboard.enabled);

    // Clean up overlay scenes if they exist from a prior run
    if (this.scene.get('GameOverScene')) {
      this.scene.remove('GameOverScene');
      console.log('[FightScene1] cleaned up GameOverScene');
    }
    if (this.scene.get('GameWonScene')) {
      this.scene.remove('GameWonScene');
      console.log('[FightScene1] cleaned up GameWonScene');
    }

    // ─── Background ────────────────────────────────────────────
    this.add.rectangle(400, 300, 800, 600, 0x1e1b3a).setDepth(0);

    // ─── Boss placeholder ──────────────────────────────────────
    this.bossDefaultColor = COLOR_BOSS_DEFAULT;
    this.bossSprite = this.add
      .rectangle(400, 220, 280, 320, this.bossDefaultColor)
      .setDepth(1)
      .setStrokeStyle(2, 0x000000);
    this.bossLabel = this.add
      .text(400, 220, 'BOSS', {
        fontSize: '20px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.bossBaseX = 400;
    this.bossBaseY = 220;

    // ─── Player placeholder ────────────────────────────────────
    this.playerSprite = this.add
      .rectangle(400, 510, 180, 160, 0x2980b9)
      .setDepth(3)
      .setStrokeStyle(2, 0x000000);
    this.add
      .text(400, 510, 'PLAYER', {
        fontSize: '16px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(4);

    // ─── Hitbox indicators (color-coded) ──────────────────────
    // Left/Right = ORANGE (dodge), Full = BLUE (parry)
    this.hitboxLeft = this.makeHitbox(310, 380, COLOR_HB_DODGE);
    this.hitboxRight = this.makeHitbox(490, 380, COLOR_HB_DODGE);
    this.hitboxFull = this.makeHitbox(400, 380, COLOR_HB_PARRY);
    this.allHitboxes = [this.hitboxLeft, this.hitboxRight, this.hitboxFull];

    // ─── HUD ───────────────────────────────────────────────────
    this.createHUD();

    // ─── Status text ──────────────────────────────────────────
    this.statusText = this.add
      .text(400, 568, '', {
        fontSize: '20px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(10);

    // ─── Entities ──────────────────────────────────────────────
    this.player = new Player(this, HP.PLAYER);
    this.boss = new EnemyPhase1(this);
    this.attachBossHooks(this.boss);

    this.gameOver = false;
    this._nextActionTimer = null; // track scheduled boss action to prevent stacking

    // ─── Input ─────────────────────────────────────────────────
    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });

    // Use IDLE_BEFORE_COMBO_MS for the initial boot delay
    this.scheduleNextBossAction(Timing.IDLE_BEFORE_COMBO_MS);
    console.log(
      '[FightScene1] create() finished. gameOver:',
      this.gameOver,
      'player HP:',
      this.player.vida,
      'boss HP:',
      this.boss.vida
    );
  }

  // ─────────────────────────────────────────────────────────────
  // HITBOX FACTORY — now color-coded
  // ─────────────────────────────────────────────────────────────
  makeHitbox(x, y, color) {
    const box = this.add
      .rectangle(x, y, 70, 70, color, 0.6)
      .setStrokeStyle(2, 0x000000)
      .setDepth(5)
      .setVisible(false);
    const mark = this.add
      .text(x, y, '!', {
        fontSize: '40px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(6)
      .setVisible(false);
    return { box, mark, baseX: x, baseY: y, color };
  }

  showHitbox(attackType) {
    this.hideAllHitboxes();
    let target = null;
    if (attackType === AttackType.ATTACK_LEFT) target = this.hitboxLeft;
    if (attackType === AttackType.ATTACK_RIGHT) target = this.hitboxRight;
    if (attackType === AttackType.ATTACK_FULL) target = this.hitboxFull;
    if (target) {
      // Store which hitbox is active so stretch can reveal it
      this._activeHitbox = target;
      console.log('[FightScene1] hitbox armed:', attackType);
    }
  }

  hideAllHitboxes() {
    this.allHitboxes.forEach((h) => {
      h.box.setVisible(false);
      h.mark.setVisible(false);
      h.box.setScale(1, 1).setPosition(h.baseX, h.baseY);
      h.mark.setScale(1, 1).setPosition(h.baseX, h.baseY);
      h.mark.setColor('#ffffff');
    });
    this._activeHitbox = null;
  }

  /** Reveal the armed hitbox — box + white "!" appear as a 200ms heads-up. */
  revealHitbox(attackType) {
    const target = this._activeHitbox;
    if (target) {
      target.box.setVisible(true);
      target.mark.setVisible(true);
      target.mark.setColor('#ffffff'); // white first, turns green on stretch
    }
  }

  // ─────────────────────────────────────────────────────────────
  // BOSS LEAN — directional movement during windup
  // The boss physically shifts toward the attack direction.
  // This gives each attack a UNIQUE visual telegraph.
  // ─────────────────────────────────────────────────────────────
  playBossLean(attackType) {
    let targetX = this.bossBaseX;
    let targetY = this.bossBaseY;
    let scaleX = 1;
    let scaleY = 1;

    if (attackType === AttackType.ATTACK_LEFT) {
      targetX = this.bossBaseX - 50; // lean left
      scaleX = 0.9;
      scaleY = 1.05;
    } else if (attackType === AttackType.ATTACK_RIGHT) {
      targetX = this.bossBaseX + 50; // lean right
      scaleX = 0.9;
      scaleY = 1.05;
    } else if (attackType === AttackType.ATTACK_FULL) {
      targetY = this.bossBaseY - 30; // rear back (up)
      scaleX = 1.15;
      scaleY = 0.85;
    }

    // Lean holds for the full windup
    this.tweens.add({
      targets: this.bossSprite,
      x: targetX,
      y: targetY,
      scaleX: scaleX,
      scaleY: scaleY,
      duration: Timing.WINDUP_MS * 0.6,
      ease: 'Sine.easeOut',
    });

    // Boss label follows
    this.tweens.add({
      targets: this.bossLabel,
      x: targetX,
      y: targetY,
      duration: Timing.WINDUP_MS * 0.6,
      ease: 'Sine.easeOut',
    });

    console.log(
      '[FightScene1] playBossLean:',
      attackType,
      '→ x:',
      targetX,
      'y:',
      targetY
    );
  }

  // ─────────────────────────────────────────────────────────────
  // SQUASH — anticipation at end of windup (boss "loads" the punch)
  // ─────────────────────────────────────────────────────────────
  playSquashAnim(attackType) {
    const currentX = this.bossSprite.x;
    const currentY = this.bossSprite.y;

    this.tweens.add({
      targets: this.bossSprite,
      scaleX: '+=0.20',
      scaleY: '-=0.25',
      y: currentY + 20,
      duration: 180,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });

    // Hitbox pull-back
    let target = null;
    let dx = 0;
    if (attackType === AttackType.ATTACK_LEFT) {
      target = this.hitboxLeft;
      dx = +15;
    }
    if (attackType === AttackType.ATTACK_RIGHT) {
      target = this.hitboxRight;
      dx = -15;
    }
    if (attackType === AttackType.ATTACK_FULL) {
      target = this.hitboxFull;
      dx = 0;
    }

    if (target) {
      this.tweens.add({
        targets: [target.box, target.mark],
        x: target.baseX + dx,
        y: target.baseY + 12,
        scaleX: 0.8,
        scaleY: 0.8,
        duration: 180,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
    }

    console.log('[FightScene1] playSquashAnim:', attackType);
  }

  // ─────────────────────────────────────────────────────────────
  // STRETCH — THE STRIKE. Boss lunges forward and holds.
  // "!" appears GREEN during this window = press NOW.
  // Boss stays extended until onAttackResolve snaps it back.
  // ─────────────────────────────────────────────────────────────
  playStretchAnim(attackType) {
    let lungeX = this.bossBaseX;
    let lungeDX = 0;
    if (attackType === AttackType.ATTACK_LEFT) lungeDX = -50;
    if (attackType === AttackType.ATTACK_RIGHT) lungeDX = +50;

    // Boss lunges forward — NO yoyo, stays extended
    this.tweens.add({
      targets: [this.bossSprite, this.bossLabel],
      x: lungeX + lungeDX,
      y: this.bossBaseY + 35,
      scaleX: 0.8,
      scaleY: 1.35,
      duration: 150,
      ease: 'Power2',
    });

    // Hitbox lunges in strike direction + scales up
    let target = null;
    let dx = 0;
    if (attackType === AttackType.ATTACK_LEFT) {
      target = this.hitboxLeft;
      dx = -45;
    }
    if (attackType === AttackType.ATTACK_RIGHT) {
      target = this.hitboxRight;
      dx = +45;
    }
    if (attackType === AttackType.ATTACK_FULL) {
      target = this.hitboxFull;
      dx = 0;
    }

    if (target) {
      // Both box AND "!" appear NOW — this is the dodge/parry window
      target.box.setVisible(true);
      target.mark.setVisible(true);
      target.mark.setColor('#2ecc71');

      this.tweens.add({
        targets: [target.box, target.mark],
        x: target.baseX + dx,
        y: target.baseY - 15,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 150,
        ease: 'Power2',
      });
    }

    console.log('[FightScene1] playStretchAnim (STRIKE):', attackType);
  }

  // ─────────────────────────────────────────────────────────────
  // RESET BOSS POSITION — snap back to neutral
  // ─────────────────────────────────────────────────────────────
  resetBossPosition() {
    this.tweens.add({
      targets: [this.bossSprite, this.bossLabel],
      x: this.bossBaseX,
      y: this.bossBaseY,
      scaleX: 1,
      scaleY: 1,
      duration: 150,
      ease: 'Sine.easeOut',
    });
  }

  // ─────────────────────────────────────────────────────────────
  // BOSS HOOKS
  // ─────────────────────────────────────────────────────────────
  attachBossHooks(boss) {
    // ─── WINDUP START ──────────────────────────────────────────
    boss.onWindupStart = (attackType) => {
      console.log('[FightScene1] onWindupStart:', attackType);

      this.showHitbox(attackType);
      this.statusText.setText(`TELEGRAPH: ${attackType}`);

      // Boss leans in the direction of the coming attack (holds through windup)
      this.playBossLean(attackType);

      // Squash animation peaks near the end of windup
      const squashDuration = 360;
      const squashDelay = Math.max(0, Timing.WINDUP_MS - squashDuration);
      this.time.delayedCall(squashDelay, () => {
        if (
          this.boss === boss &&
          boss.enemyCombatState === EnemyState.PARRIABLE
        ) {
          this.playSquashAnim(attackType);
        }
      });
    };

    // ─── ATTACK WINDOW OPEN ────────────────────────────────────
    boss.onAttackActive = (attackType) => {
      console.log('[FightScene1] onAttackActive:', attackType);
      this.statusText.setText(`ATTACK: ${attackType}`);
      this.player.onBossAttackStart();

      // FEINT: boss turns green
      if (attackType === AttackType.FEINT) {
        this.bossSprite.setFillStyle(COLOR_BOSS_FEINT);
        this.resetBossPosition();
        return; // no stretch for feints
      }

      // Box + "!" appear AT the dodge window — same moment as the stretch.
      // One unified "press NOW" signal, no early preview.
      const windowMs = Timing.ATTACK_WINDOW_MS;
      const stretchDelay = Math.max(0, windowMs - Timing.DODGE_WINDOW_MS);

      this.time.delayedCall(stretchDelay, () => {
        if (this.boss === boss && boss.enemyCombatState === EnemyState.ATTACK) {
          this.revealHitbox(attackType);
          this.playStretchAnim(attackType);
          console.log('[FightScene1] dodge window open at', stretchDelay, 'ms');
        }
      });
    };

    // ─── IMPACT MOMENT ─────────────────────────────────────────
    boss.onResolveImpact = (attackType) => {
      console.log('[FightScene1] onResolveImpact:', attackType);
      const now = this.time.now;
      const success = this.player.evaluateDefense(now, attackType);

      boss.reportPlayerResponse(success);

      if (!success) {
        const dmg =
          attackType === AttackType.ATTACK_FULL
            ? Damage.PLAYER_MISS_PARRY
            : Damage.PLAYER_HIT_TAKES;
        this.player.perdeVida(dmg);
        console.log(
          '[FightScene1] player hit! dmg:',
          dmg,
          'vida:',
          this.player.vida
        );
      } else {
        console.log('[FightScene1] player defended successfully');
      }
    };

    // ─── ATTACK RESOLVE (cleanup) ──────────────────────────────
    boss.onAttackResolve = (attackType) => {
      console.log('[FightScene1] onAttackResolve:', attackType);
      this.hideAllHitboxes();
      this.resetBossPosition();

      if (
        boss.enemyCombatState !== EnemyState.ATTACKABLE &&
        boss.enemyCombatState !== EnemyState.DEAD
      ) {
        this.bossSprite.setFillStyle(this.bossDefaultColor);
      }
    };

    // ─── VULNERABLE START ──────────────────────────────────────
    boss.onVulnerableStart = () => {
      console.log('[FightScene1] onVulnerableStart');
      this.bossSprite.setFillStyle(COLOR_BOSS_VULNERABLE);
      this.statusText.setText('VULNERABLE — ATTACK NOW!');
      this.player.resetWhiffs();
    };

    // ─── VULNERABLE END ────────────────────────────────────────
    boss.onVulnerableEnd = () => {
      console.log(
        '[FightScene1] onVulnerableEnd → post-vulnerable breather:',
        Timing.POST_VULNERABLE_MS,
        'ms'
      );
      this.bossSprite.setFillStyle(this.bossDefaultColor);
      this.statusText.setText('Boss recovered.');
      // Post-vulnerable breather before next combo
      this.scheduleNextBossAction(Timing.POST_VULNERABLE_MS);
    };

    // ─── STAGGER ───────────────────────────────────────────────
    boss.onStagger = () => {
      console.log('[FightScene1] onStagger');
      this.bossSprite.setFillStyle(COLOR_BOSS_HIT);
      this.time.delayedCall(Timing.BOSS_STAGGER_MS, () => {
        if (boss.enemyCombatState === EnemyState.DEAD) return;
        if (boss.enemyCombatState === EnemyState.ATTACKABLE) {
          this.bossSprite.setFillStyle(COLOR_BOSS_VULNERABLE);
        } else {
          this.bossSprite.setFillStyle(this.bossDefaultColor);
        }
      });
    };

    boss.onBlock = () => {
      console.log('[FightScene1] onBlock');
      this.statusText.setText('Boss BLOCKED!');
    };

    boss.onDeath = () => {
      console.log('[FightScene1] onDeath');
      this.statusText.setText('PHASE 1 DEFEATED');
    };

    if (boss instanceof EnemyPhase1) {
      boss.onTransform = () => this.transitionToPhase2();
    }
    if (boss instanceof EnemyPhase2) {
      // ─── LAST STAND: boss hits 0 HP → dramatic pause → Supreme ──
      boss.onLastStandStart = () => {
        console.log('[FightScene1] ===== LAST STAND =====');
        // Cancel any scheduled action
        if (this._nextActionTimer) this._nextActionTimer.remove(false);
        this._nextActionTimer = null;

        // Dramatic flash
        this.bossSprite.setFillStyle(0xff0000);
        this.statusText.setText('LAST STAND');

        // Flash boss red/white rapidly
        this.tweens.add({
          targets: this.bossSprite,
          alpha: 0.3,
          duration: 150,
          yoyo: true,
          repeat: 4,
          onComplete: () => {
            this.bossSprite.setAlpha(1);
            this.bossSprite.setFillStyle(0x220000);
            this.bossSprite.setStrokeStyle(3, 0xff0000);
            this.bossLabel.setText('LAST STAND');
            // Fire the Supreme after a dramatic beat
            this.time.delayedCall(Timing.BEAT * 3, () => {
              console.log('[FightScene1] firing Supreme swan song');
              this.boss.atacar(AttackType.SUPREME);
            });
          },
        });
      };

      // ─── After Supreme completes: infinite vulnerable ──────────
      boss.onLastStandVulnerable = () => {
        console.log('[FightScene1] last stand vulnerable — FINISH HIM');
        this.bossSprite.setFillStyle(COLOR_BOSS_VULNERABLE);
        this.statusText.setText('FINISH HIM!');
        this.player.resetWhiffs();
      };

      // ─── Death scene → Game Won ────────────────────────────────
      boss.onDeathScene = () => {
        console.log('[FightScene1] ===== DEATH SCENE =====');
        this.gameOver = true;
        this.bossSprite.setFillStyle(0x000000);
        this.statusText.setText('');
        this.tweens.killAll();

        this.time.delayedCall(800, () => {
          this.input.keyboard.enabled = false;
          if (this.scene.get('GameWonScene')) {
            this.scene.remove('GameWonScene');
          }
          this.scene.add('GameWonScene', GameWonScene, true);
          console.log('[FightScene1] GameWonScene launched');
        });
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // BOSS AI — uses IDLE_BEFORE_COMBO_MS as default gap
  // ─────────────────────────────────────────────────────────────
  scheduleNextBossAction(delayMs) {
    console.log('[FightScene1] scheduleNextBossAction in', delayMs, 'ms');
    // Cancel any existing scheduled action to prevent timer stacking
    if (this._nextActionTimer) {
      this._nextActionTimer.remove(false);
    }
    this._nextActionTimer = this.time.delayedCall(delayMs, () => {
      this._nextActionTimer = null;
      if (this.gameOver) return;
      if (!this.boss || this.boss.enemyCombatState === EnemyState.DEAD) return;
      const pool = this.boss.getAttackPool();
      const next = pool[Math.floor(Math.random() * pool.length)];
      console.log(
        '[FightScene1] boss chosen attack:',
        next,
        '(phase:',
        this.boss instanceof EnemyPhase2 ? '2' : '1',
        ')'
      );
      this.boss.atacar(next);
    });
  }

  transitionToPhase2() {
    console.log('[FightScene1] ===== TRANSITIONING TO PHASE 2 =====');
    // Cancel any stale timers from Phase 1
    if (this._nextActionTimer) this._nextActionTimer.remove(false);
    this._nextActionTimer = null;
    this.boss = new EnemyPhase2(this);
    this.attachBossHooks(this.boss);
    this.bossDefaultColor = COLOR_BOSS_PHASE2;
    this.bossSprite.setFillStyle(this.bossDefaultColor);
    this.bossSprite.setStrokeStyle(3, 0xff00ff);
    this.bossLabel.setText('BOSS P2');
    this.statusText.setText('PHASE 2');
    console.log(
      '[FightScene1] boss is now EnemyPhase2, pool:',
      this.boss.getAttackPool()
    );
    this.scheduleNextBossAction(Timing.IDLE_BEFORE_COMBO_MS);
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────
  update(time, delta) {
    if (!this._updateLogged) {
      console.log(
        '[FightScene1] update() running. gameOver:',
        this.gameOver,
        'boss:',
        !!this.boss,
        'keyboard enabled:',
        this.input.keyboard.enabled
      );
      this._updateLogged = true;
    }
    if (this.gameOver || !this.boss) return;

    if (Phaser.Input.Keyboard.JustDown(this.keys.left))
      this.handleInput('LEFT', time);
    if (Phaser.Input.Keyboard.JustDown(this.keys.right))
      this.handleInput('RIGHT', time);
    if (Phaser.Input.Keyboard.JustDown(this.keys.space))
      this.handleInput('SPACE', time);

    this.updateHUD();

    if (this.player.vida <= 0) this.triggerGameOver();
  }

  handleInput(key, time) {
    const boss = this.boss;
    const bossType = boss.enemyAttackType;
    const bossSt = boss.enemyCombatState;

    // ─── FEINT: immediate punish ──────────────────────────────
    if (bossSt === EnemyState.ATTACK && bossType === AttackType.FEINT) {
      if (!this.player.canAct(time)) return;
      this.player.pressedDuringAttack = true;
      this.player.perdeVida(Damage.PLAYER_HIT_TAKES);
      this.statusText.setText('FEINT — punished!');
      this.bossSprite.setFillStyle(this.bossDefaultColor);
      console.log('[FightScene1] feint punish! vida:', this.player.vida);
      return;
    }

    // ─── During boss ATTACK: record stance + i-frames ─────────
    if (bossSt === EnemyState.ATTACK) {
      if (key === 'SPACE') {
        this.player.parry(time, boss.enemyTime, bossSt, bossType);
      } else {
        this.player.desviar(time, key, boss.enemyTime, bossSt, bossType);
      }
      return;
    }

    // ─── Vulnerable: SPACE = attack ───────────────────────────
    if (key === 'SPACE') {
      const landed = this.player.atacar(time, boss.enemyTime, bossSt);
      if (landed) {
        boss.perdeVida();
        console.log('[FightScene1] boss hit! vida:', boss.vida);
      } else {
        boss.block();
        if (this.player.whiffCount >= MashConfig.MAX_WHIFFS_BEFORE_PUNISH) {
          this.player.resetWhiffs();
          this.interruptWithAttack();
        }
      }
    }
  }

  interruptWithAttack() {
    if (this.boss.enemyCombatState === EnemyState.DEAD) return;
    console.log('[FightScene1] mash punish → interrupt attack');
    this.boss._sequenceQueue = [];
    this.boss.atacar(AttackType.ATTACK_FULL);
  }

  // ─────────────────────────────────────────────────────────────
  // GAME OVER
  // ─────────────────────────────────────────────────────────────
  triggerGameOver() {
    if (this.gameOver) return;
    this.gameOver = true;
    console.log('[FightScene1] triggerGameOver');

    if (this.boss && this.boss._currentTimer)
      this.boss._currentTimer.remove(false);
    if (this._nextActionTimer) this._nextActionTimer.remove(false);
    this.hideAllHitboxes();
    this.tweens.killAll();

    this.time.delayedCall(400, () => {
      this.input.keyboard.enabled = false;
      if (this.scene.get('GameOverScene')) {
        this.scene.remove('GameOverScene');
      }
      this.scene.add('GameOverScene', GameOverScene, true);
      console.log('[FightScene1] GameOverScene launched');
    });
  }

  // ─────────────────────────────────────────────────────────────
  // HUD
  // ─────────────────────────────────────────────────────────────
  createHUD() {
    const w = 200,
      h = 16;

    this.add
      .text(20, 540, 'PLAYER', {
        fontSize: '13px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: '#1abc9c',
      })
      .setDepth(10);
    this.add
      .rectangle(20, 562, w, h, 0x333333)
      .setOrigin(0, 0.5)
      .setDepth(10)
      .setAlpha(0.7);
    this.playerHpBar = this.add
      .rectangle(20, 562, w, h, 0x1abc9c)
      .setOrigin(0, 0.5)
      .setDepth(10);

    this.add
      .text(576, 16, 'BOSS', {
        fontSize: '13px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: '#e74c3c',
      })
      .setDepth(10);
    this.add
      .rectangle(576, 38, w, h, 0x333333)
      .setOrigin(0, 0.5)
      .setDepth(10)
      .setAlpha(0.7);
    this.bossHpBar = this.add
      .rectangle(576, 38, w, h, 0xe74c3c)
      .setOrigin(0, 0.5)
      .setDepth(10);
  }

  updateHUD() {
    if (this.playerHpBar) {
      const r = Math.max(0, this.player.vida / this.player.maxHp);
      this.playerHpBar.displayWidth = 200 * r;
    }
    if (this.bossHpBar && this.boss) {
      const r = Math.max(0, this.boss.vida / this.boss.maxHp);
      this.bossHpBar.displayWidth = 200 * r;
    }
  }
}
