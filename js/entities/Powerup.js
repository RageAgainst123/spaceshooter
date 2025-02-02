class Powerup extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, type) {
        super(scene, x, y, 'powerup');
        
        this.type = type;
        this.scene = scene;
        
        // Add to scene and enable physics
        scene.add.existing(this);
        scene.physics.add.existing(this);
        scene.powerups.add(this);
        
        // Configure appearance based on type
        this.setupAppearance();
        
        // Add floating animation
        scene.tweens.add({
            targets: this,
            y: y + 20,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    setupAppearance() {
        const config = {
            spread: {
                color: 0xff0000,
                text: 'S',
                scale: 1.2
            },
            laser: {
                color: 0x00ffff,
                text: 'L',
                scale: 1.3
            },
            rapid: {
                color: 0xffff00,
                text: 'R',
                scale: 1.1
            },
            shield: {
                color: 0x0000ff,
                text: 'D',
                scale: 1.4
            },
            missile: {
                color: 0xff00ff,
                text: 'M',
                scale: 1.2
            }
        };

        const typeConfig = config[this.type] || config.spread;
        this.tintColor = typeConfig.color;

        // Create a circle for the powerup
        const graphics = this.scene.add.graphics();
        graphics.lineStyle(2, typeConfig.color);
        graphics.strokeCircle(0, 0, 15);
        graphics.generateTexture('powerup_' + this.type, 32, 32);
        graphics.destroy();

        this.setTexture('powerup_' + this.type);
        this.setTint(typeConfig.color);

        // Add text label
        this.text = this.scene.add.text(this.x, this.y, typeConfig.text, {
            fontSize: '16px',
            fontFamily: 'Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (this.text) {
            this.text.setPosition(this.x, this.y);
        }
    }

    applyEffect(player) {
        // Apply powerup effect
        switch(this.type) {
            case 'spread':
                player.setPowerup('spread', 10000);
                break;
            case 'laser':
                player.setPowerup('laser', 8000);
                break;
            case 'rapid':
                player.setPowerup('rapid', 5000);
                break;
            case 'shield':
                player.addShield(3);
                break;
            case 'missile':
                player.setPowerup('missile', 12000);
                break;
        }
        
        // Play powerup sound
        this.scene.sound.play('powerup', { volume: 0.5 });
        
        // Screen flash effect
        this.scene.cameras.main.flash(100, this.tintColor >> 16, (this.tintColor >> 8) & 0xff, this.tintColor & 0xff);
        
        // Clean up
        if (this.text) {
            this.text.destroy();
        }
        this.destroy();
    }

    destroy() {
        if (this.text) {
            this.text.destroy();
        }
        super.destroy();
    }
} 