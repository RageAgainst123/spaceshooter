class Powerup extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, type) {
        super(scene, x, y, `powerup_${type}`);
        
        this.type = type;
        this.scene = scene;
        
        // Add to scene and enable physics
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // Set velocity downward
        this.setVelocityY(100);

        // Add floating animation
        scene.tweens.add({
            targets: this,
            y: y + 20,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Add glow effect
        this.createGlowEffect();
    }

    createGlowEffect() {
        const config = this.scene.powerupManager.types[this.type];
        if (!config) return;

        this.glow = this.scene.add.circle(this.x, this.y, 25, config.color, 0.3)
            .setBlendMode('ADD');

        this.scene.events.on('update', () => {
            if (this.active && this.glow) {
                this.glow.setPosition(this.x, this.y);
            }
        });
    }

    destroy() {
        if (this.glow) this.glow.destroy();
        super.destroy();
    }
} 