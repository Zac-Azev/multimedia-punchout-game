import Phaser from 'phaser';

export class GameWonScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameWonScene' });
  }

  create() {
    console.log('[GameWonScene] create() called');

    this.add.rectangle(400, 300, 800, 600, 0x000000, 0.85).setDepth(0);

    const title = this.add
      .text(400, 220, 'YOU WIN', {
        fontSize: '72px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: '#f1c40f',
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(1)
      .setAlpha(0);

    const subtitle = this.add
      .text(400, 310, 'O demônio foi derrotado', {
        fontSize: '22px',
        fontFamily: 'monospace',
        color: '#cccccc',
      })
      .setOrigin(0.5)
      .setDepth(1)
      .setAlpha(0);

    const prompt = this.add
      .text(400, 400, 'Press R to play again', {
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
      duration: 600,
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
    console.log('[GameWonScene] restartGame() called');
    this.scene.stop('FightScene1');
    this.scene.start('FightScene1');
  }
}
