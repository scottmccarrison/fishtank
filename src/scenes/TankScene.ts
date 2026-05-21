import Phaser from 'phaser';

export class TankScene extends Phaser.Scene {
  constructor() {
    super('TankScene');
  }

  preload(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xff8533);
    g.fillEllipse(20, 12, 32, 18);
    g.fillTriangle(36, 12, 44, 4, 44, 20);
    g.fillStyle(0xffffff);
    g.fillCircle(10, 10, 3);
    g.fillStyle(0x000000);
    g.fillCircle(10, 10, 1.5);
    g.generateTexture('fish', 48, 24);
    g.destroy();
  }

  create(): void {
    const fish = this.add.image(100, 300, 'fish');
    fish.setScale(3);

    this.tweens.add({
      targets: fish,
      x: 700,
      duration: 4000,
      yoyo: true,
      repeat: -1,
      onYoyo: () => fish.setFlipX(true),
      onRepeat: () => fish.setFlipX(false),
    });
  }
}
