import Phaser from 'phaser';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create() {
    console.log('[GameOverScene] create() called');

    this.add.rectangle(400, 300, 800, 600, 0x000000, 0.8).setDepth(0);

    const title = this.add
      .text(400, 240, 'GAME OVER', {
        fontSize: '72px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: '#e74c3c',
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(1)
      .setAlpha(0);

    const subtitle = this.add
      .text(400, 320, 'Você foi derrotado', {
        fontSize: '22px',
        fontFamily: 'monospace',
        color: '#cccccc',
      })
      .setOrigin(0.5)
      .setDepth(1)
      .setAlpha(0);

    const prompt = this.add
      .text(400, 410, 'Press R to restart', {
        fontSize: '28px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(1)
      .setAlpha(0);

    this.tweens.add({
      targets: [title, subtitle, prompt],
      alpha: 1,
      duration: 400,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: prompt,
          alpha: 0.3,
          duration: 700,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      },
    });

    this.input.keyboard.on('keydown-R', this.restartGame, this);
  }

  restartGame() {
    console.log('[GameOverScene] restartGame() called');
    // Just restart FightScene1 — it will clean us up in its create()
    this.scene.stop('FightScene1');
    this.scene.start('FightScene1');
    console.log('[GameOverScene] FightScene1 restarted');
  }
}
