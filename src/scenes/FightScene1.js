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
import {
  PlayerSprites,
  Boss1Sprites,
  Boss2Sprites,
  Backgrounds,
  Tints,
  PlayerPosition,
  BossPosition,
} from '../configs/sprites.js';

export class FightScene1 extends Phaser.Scene {
  constructor() {
    super({ key: 'FightScene1' });
  }

  // ─────────────────────────────────────────────────────────────
  // PRELOAD — all sprites from GitHub
  // ─────────────────────────────────────────────────────────────
  preload() {
    console.log('[FightScene1] preload() — loading from GitHub');

    // Backgrounds
    Object.values(Backgrounds).forEach((bg) =>
      this.load.image(bg.key, bg.path)
    );

    // All sprite sets
    [PlayerSprites, Boss1Sprites, Boss2Sprites].forEach((spriteSet) => {
      Object.values(spriteSet).forEach((s) => this.load.image(s.key, s.path));
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────
  create() {
    console.log('[FightScene1] create() called');
    this.input.keyboard.enabled = true;
    console.log('[FightScene1] keyboard enabled:', this.input.keyboard.enabled);

    // Clean up overlay scenes from prior runs
    if (this.scene.get('GameOverScene')) {
      this.scene.remove('GameOverScene');
      console.log('[FightScene1] cleaned up GameOverScene');
    }
    if (this.scene.get('GameWonScene')) {
      this.scene.remove('GameWonScene');
      console.log('[FightScene1] cleaned up GameWonScene');
    }

    // ─── Track current phase for sprite prefixing ─────────────
    this.currentPhase = 1;
    this.bossPrefix = 'boss1';

    // ─── Background ────────────────────────────────────────────
    this.background = this.add
      .image(400, 300, Backgrounds.phase1.key)
      .setDepth(0)
      .setDisplaySize(800, 600);

    // ─── Boss sprite ───────────────────────────────────────────
    this.bossBaseX = BossPosition.x;
    this.bossBaseY = BossPosition.y;
    this.bossSprite = this.add
      .sprite(this.bossBaseX, this.bossBaseY, Boss1Sprites.idle.key)
      .setDepth(BossPosition.depth)
      .setOrigin(BossPosition.originX, BossPosition.originY)
      .setScale(Boss1Sprites.idle.scale);

    // ─── Player sprite ─────────────────────────────────────────
    this.playerSprite = this.add
      .sprite(PlayerPosition.x, PlayerPosition.y, PlayerSprites.idle.key)
      .setDepth(PlayerPosition.depth)
      .setOrigin(PlayerPosition.originX, PlayerPosition.originY)
      .setScale(PlayerSprites.idle.scale);

    // ─── Hitbox indicators — above boss head, small and punchy ──
    const hbY = 95; // above the boss
    this.hitboxLeft = this.makeHitbox(340, hbY, 0xe67e22);
    this.hitboxRight = this.makeHitbox(460, hbY, 0xe67e22);
    this.hitboxFull = this.makeHitbox(400, hbY, 0x3498db);
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
    this._nextActionTimer = null;
    this._attackAnimCount = 0; // alternate between attack1/attack2

    // ─── Input ─────────────────────────────────────────────────
    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });

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
  // SPRITE HELPERS — scales come from sprites.js
  // ─────────────────────────────────────────────────────────────

  /** Set boss sprite texture + correct scale from sprites.js. */
  setBossTexture(stateName) {
    const spriteSet = this.currentPhase === 1 ? Boss1Sprites : Boss2Sprites;
    const entry = spriteSet[stateName];
    if (entry && this.textures.exists(entry.key)) {
      this.bossSprite.setTexture(entry.key);
      this.bossSprite.setScale(entry.scale);
    } else {
      console.warn(
        '[FightScene1] boss texture not found:',
        stateName,
        'phase:',
        this.currentPhase
      );
    }
  }

  /** Set player sprite texture + correct scale from sprites.js. */
  setPlayerTexture(name) {
    const entry = PlayerSprites[name];
    if (entry && this.textures.exists(entry.key)) {
      this.playerSprite.setTexture(entry.key);
      this.playerSprite.setScale(entry.scale);
    } else {
      console.warn('[FightScene1] player texture not found:', name);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // HITBOX FACTORY
  // ─────────────────────────────────────────────────────────────
  makeHitbox(x, y, color) {
    const box = this.add
      .rectangle(x, y, 40, 40, color, 0.6)
      .setStrokeStyle(2, 0x000000)
      .setDepth(5)
      .setVisible(false);
    const mark = this.add
      .text(x, y, '!', {
        fontSize: '28px',
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

  revealHitbox(attackType) {
    const target = this._activeHitbox;
    if (target) {
      target.box.setVisible(true);
      target.mark.setVisible(true);
      target.mark.setColor('#2ecc71');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // BOSS LEAN — directional movement + sprite swap
  // ─────────────────────────────────────────────────────────────
  playBossLean(attackType) {
    let targetX = this.bossBaseX;
    let targetY = this.bossBaseY;

    if (attackType === AttackType.ATTACK_LEFT) {
      this.setBossTexture('lean');
      this.bossSprite.setFlipX(false);
      targetX = this.bossBaseX - 50;
    } else if (attackType === AttackType.ATTACK_RIGHT) {
      this.setBossTexture('lean');
      this.bossSprite.setFlipX(true); // mirror for right
      targetX = this.bossBaseX + 50;
    } else if (attackType === AttackType.ATTACK_FULL) {
      this.setBossTexture('squash'); // rears back using squash pose
      this.bossSprite.setFlipX(false);
      targetY = this.bossBaseY - 20;
    }

    this.tweens.add({
      targets: this.bossSprite,
      x: targetX,
      y: targetY,
      duration: Timing.WINDUP_MS * 0.6,
      ease: 'Sine.easeOut',
    });

    console.log('[FightScene1] playBossLean:', attackType);
  }

  // ─────────────────────────────────────────────────────────────
  // SQUASH — anticipation at end of windup
  // ─────────────────────────────────────────────────────────────
  playSquashAnim(attackType) {
    this.setBossTexture('squash');
    const currentY = this.bossSprite.y;

    this.tweens.add({
      targets: this.bossSprite,
      scaleX: '+=0.15',
      scaleY: '-=0.15',
      y: currentY + 15,
      duration: 180,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });

    console.log('[FightScene1] playSquashAnim:', attackType);
  }

  // ─────────────────────────────────────────────────────────────
  // STRIKE — sprite swap IS the dodge signal. Boss snaps to attack
  // sprite and lunges. Stays extended until resolve.
  // ─────────────────────────────────────────────────────────────
  playStrikeAnim(attackType) {
    let lungeDX = 0;
    if (attackType === AttackType.ATTACK_LEFT) {
      this.setBossTexture('lateral');
      this.bossSprite.setFlipX(false);
      lungeDX = -40;
    } else if (attackType === AttackType.ATTACK_RIGHT) {
      this.setBossTexture('lateral');
      this.bossSprite.setFlipX(true);
      lungeDX = +40;
    } else if (attackType === AttackType.ATTACK_FULL) {
      this.setBossTexture('lunge');
      this.bossSprite.setFlipX(false);
    }

    // Quick lunge from current position — stays extended
    this.tweens.add({
      targets: this.bossSprite,
      x: this.bossBaseX + lungeDX,
      y: this.bossBaseY + 25,
      duration: 120,
      ease: 'Power2',
    });

    console.log('[FightScene1] playStrikeAnim:', attackType);
  }

  // ─────────────────────────────────────────────────────────────
  // RESET BOSS POSITION
  // ─────────────────────────────────────────────────────────────
  resetBossPosition() {
    this.setBossTexture('idle');
    this.bossSprite.setFlipX(false);
    this.bossSprite.clearTint();
    const idleScale = (this.currentPhase === 1 ? Boss1Sprites : Boss2Sprites)
      .idle.scale;
    this.tweens.add({
      targets: this.bossSprite,
      x: this.bossBaseX,
      y: this.bossBaseY,
      scaleX: idleScale,
      scaleY: idleScale,
      duration: 150,
      ease: 'Sine.easeOut',
    });
  }

  // ─────────────────────────────────────────────────────────────
  // PLAYER SPRITE UPDATES
  // ─────────────────────────────────────────────────────────────
  showPlayerDodge(direction) {
    // Don't animate yet — store the dodge, it plays when the strike fires
    this._pendingDodge = direction;
    // Immediately swap to dodge sprite (subtle visual feedback)
    this.setPlayerTexture('dodge');
    this.playerSprite.setFlipX(direction === 'LEFT');
  }

  /** Plays the actual dodge movement — synced to when the boss strike fires. */
  executePlayerDodge(direction) {
    this.setPlayerTexture('dodge');
    this.playerSprite.setFlipX(direction === 'LEFT');

    const dodgeX =
      direction === 'LEFT' ? PlayerPosition.x - 120 : PlayerPosition.x + 120;

    this.tweens.add({
      targets: this.playerSprite,
      x: dodgeX,
      duration: 120,
      ease: 'Power2',
      onComplete: () => {
        // Slide back to center
        this.tweens.add({
          targets: this.playerSprite,
          x: PlayerPosition.x,
          duration: 300,
          ease: 'Sine.easeOut',
        });
      },
    });
  }

  showPlayerParry() {
    // Parry stored as pending for sync
    this._pendingDodge = 'PARRY';
    this.setPlayerTexture('parry');
    this.playerSprite.setFlipX(false);
  }

  /** Plays the parry brace — synced to when the boss strike fires. */
  executePlayerParry() {
    this.setPlayerTexture('parry');
    this.playerSprite.setFlipX(false);
    // Small brace forward — absorbing the hit
    this.tweens.add({
      targets: this.playerSprite,
      y: PlayerPosition.y - 15,
      duration: 80,
      yoyo: true,
      ease: 'Power2',
    });
  }

  showPlayerAttack() {
    this._attackAnimCount = (this._attackAnimCount + 1) % 2;
    this.setPlayerTexture(this._attackAnimCount === 0 ? 'attack1' : 'attack2');
    this.playerSprite.setFlipX(false);
  }

  showPlayerStagger() {
    this.setPlayerTexture('stagger');
    this.playerSprite.setFlipX(false);
    // Red blink to visualize damage
    this.playerSprite.setTint(0xff0000);
    this.tweens.add({
      targets: this.playerSprite,
      alpha: 0.4,
      duration: 80,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        this.playerSprite.setAlpha(1);
        this.playerSprite.clearTint();
      },
    });
  }

  showPlayerIdle() {
    this.setPlayerTexture('idle');
    this.playerSprite.setFlipX(false);
  }

  // ─────────────────────────────────────────────────────────────
  // BOSS HOOKS
  // ─────────────────────────────────────────────────────────────
  attachBossHooks(boss) {
    boss.onWindupStart = (attackType) => {
      console.log('[FightScene1] onWindupStart:', attackType);
      this.showHitbox(attackType);
      this.statusText.setText(`TELEGRAPH: ${attackType}`);
      // Lean only — squash happens in attack window
      this.playBossLean(attackType);
    };

    boss.onAttackActive = (attackType) => {
      console.log('[FightScene1] onAttackActive:', attackType);
      this.statusText.setText(`ATTACK: ${attackType}`);
      this.player.onBossAttackStart();
      this.showPlayerIdle();
      this._pendingDodge = null; // clear any pending dodge visual

      if (attackType === AttackType.FEINT) {
        this.setBossTexture(this.currentPhase === 2 ? 'feint' : 'idle');
        this.bossSprite.setTint(Tints.FEINT);
        this.bossSprite.setFlipX(false);
        this.tweens.add({
          targets: this.bossSprite,
          x: this.bossBaseX,
          y: this.bossBaseY,
          duration: 150,
          ease: 'Sine.easeOut',
        });
        return;
      }

      // SQUASH + HITBOX immediately — this IS the dodge window
      this.playSquashAnim(attackType);
      this.revealHitbox(attackType);

      const windowMs = Timing.ATTACK_WINDOW_MS;
      const dodgeEnd = windowMs - Timing.DODGE_WINDOW_MS; // 400ms in = squash ends

      // STRIKE — boss attack sprite snaps in, and any pending dodge plays
      this.time.delayedCall(dodgeEnd, () => {
        if (this.boss === boss && boss.enemyCombatState === EnemyState.ATTACK) {
          this.hideAllHitboxes();
          this.playStrikeAnim(attackType);

          // If player committed a dodge/parry during squash, NOW we animate it
          if (this._pendingDodge) {
            if (this._pendingDodge === 'PARRY') {
              this.executePlayerParry();
            } else {
              this.executePlayerDodge(this._pendingDodge);
            }
            this._pendingDodge = null;
          }

          console.log('[FightScene1] strike fired at', dodgeEnd, 'ms');
        }
      });
    };

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
        this.showPlayerStagger();
        // Return to idle after stagger
        this.time.delayedCall(Timing.PLAYER_STAGGER_MS, () => {
          if (!this.gameOver) this.showPlayerIdle();
        });
        console.log(
          '[FightScene1] player hit! dmg:',
          dmg,
          'vida:',
          this.player.vida
        );
      } else {
        console.log('[FightScene1] player defended successfully');
        // Return to idle after dodge/parry commitment ends
        this.time.delayedCall(
          Timing.I_FRAME_MS + Timing.COMMIT_DOWNTIME_MS,
          () => {
            if (!this.gameOver) this.showPlayerIdle();
          }
        );
      }
    };

    boss.onAttackResolve = (attackType) => {
      console.log('[FightScene1] onAttackResolve:', attackType);
      this.hideAllHitboxes();
      // Don't reset to idle — just snap position back.
      // The next state (vulnerable/next attack) handles the sprite.
      this.bossSprite.setFlipX(false);
      this.bossSprite.clearTint();
      this.tweens.add({
        targets: this.bossSprite,
        x: this.bossBaseX,
        y: this.bossBaseY,
        duration: 100,
        ease: 'Sine.easeOut',
      });
    };

    boss.onVulnerableStart = () => {
      console.log('[FightScene1] onVulnerableStart');
      this.setBossTexture('vulnerable');
      this.bossSprite.setTint(Tints.VULNERABLE);
      this.statusText.setText('VULNERABLE — ATTACK NOW!');
      this.player.resetWhiffs();
    };

    boss.onVulnerableEnd = () => {
      console.log(
        '[FightScene1] onVulnerableEnd → post-vulnerable breather:',
        Timing.POST_VULNERABLE_MS,
        'ms'
      );
      this.resetBossPosition();
      this.statusText.setText('Boss recovered.');
      this.scheduleNextBossAction(Timing.POST_VULNERABLE_MS);
    };

    boss.onStagger = () => {
      console.log('[FightScene1] onStagger');
      this.setBossTexture('hit');
      this.bossSprite.setTint(Tints.HIT);
      this.time.delayedCall(Timing.BOSS_STAGGER_MS, () => {
        if (boss.enemyCombatState === EnemyState.DEAD) return;
        if (boss.enemyCombatState === EnemyState.ATTACKABLE) {
          this.setBossTexture('vulnerable');
          this.bossSprite.setTint(Tints.VULNERABLE);
        } else {
          this.setBossTexture('idle');
          this.bossSprite.clearTint();
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
      boss.onLastStandStart = () => {
        console.log('[FightScene1] ===== LAST STAND =====');
        if (this._nextActionTimer) this._nextActionTimer.remove(false);
        this._nextActionTimer = null;

        this.setBossTexture('laststand');
        this.bossSprite.setTint(Tints.LASTSTAND);
        this.statusText.setText('LAST STAND');

        this.tweens.add({
          targets: this.bossSprite,
          alpha: 0.3,
          duration: 150,
          yoyo: true,
          repeat: 4,
          onComplete: () => {
            this.bossSprite.setAlpha(1);
            this.setBossTexture('laststand');
            this.bossSprite.setTint(Tints.LASTSTAND);
            this.time.delayedCall(Timing.BEAT * 3, () => {
              console.log('[FightScene1] firing Supreme swan song');
              this.boss.atacar(AttackType.SUPREME);
            });
          },
        });
      };

      boss.onLastStandVulnerable = () => {
        console.log('[FightScene1] last stand vulnerable — FINISH HIM');
        this.setBossTexture('vulnerable');
        this.bossSprite.setTint(Tints.VULNERABLE);
        this.statusText.setText('FINISH HIM!');
        this.player.resetWhiffs();
      };

      boss.onDeathScene = () => {
        console.log('[FightScene1] ===== DEATH SCENE =====');
        this.gameOver = true;
        this.bossSprite.setTint(0x000000);
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
  // BOSS AI
  // ─────────────────────────────────────────────────────────────
  scheduleNextBossAction(delayMs) {
    console.log('[FightScene1] scheduleNextBossAction in', delayMs, 'ms');
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
        this.currentPhase,
        ')'
      );
      this.boss.atacar(next);
    });
  }

  transitionToPhase2() {
    console.log('[FightScene1] ===== TRANSITIONING TO PHASE 2 =====');
    if (this._nextActionTimer) this._nextActionTimer.remove(false);
    this._nextActionTimer = null;

    this.currentPhase = 2;
    this.bossPrefix = 'boss2';

    this.boss = new EnemyPhase2(this);
    this.attachBossHooks(this.boss);

    // Swap background
    this.background.setTexture(Backgrounds.phase2.key);

    // Swap boss sprite
    this.setBossTexture('idle');
    this.bossSprite.setTint(Tints.PHASE2);

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

    // FEINT: immediate punish
    if (bossSt === EnemyState.ATTACK && bossType === AttackType.FEINT) {
      if (!this.player.canAct(time)) return;
      this.player.pressedDuringAttack = true;
      this.player.perdeVida(Damage.PLAYER_HIT_TAKES);
      this.showPlayerStagger();
      this.time.delayedCall(Timing.PLAYER_STAGGER_MS, () => {
        if (!this.gameOver) this.showPlayerIdle();
      });
      this.statusText.setText('FEINT — punished!');
      this.resetBossPosition();
      console.log('[FightScene1] feint punish! vida:', this.player.vida);
      return;
    }

    // During boss ATTACK: record stance
    if (bossSt === EnemyState.ATTACK) {
      if (key === 'SPACE') {
        this.player.parry(time, boss.enemyTime, bossSt, bossType);
        this.showPlayerParry();
      } else {
        this.player.desviar(time, key, boss.enemyTime, bossSt, bossType);
        this.showPlayerDodge(key);
      }
      return;
    }

    // Vulnerable: SPACE = attack
    if (key === 'SPACE') {
      const landed = this.player.atacar(time, boss.enemyTime, bossSt);
      if (landed) {
        this.showPlayerAttack();
        boss.perdeVida();
        this.time.delayedCall(
          Timing.I_FRAME_MS + Timing.COMMIT_DOWNTIME_MS,
          () => {
            if (!this.gameOver) this.showPlayerIdle();
          }
        );
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
