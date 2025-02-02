class PowerupManager {
    constructor(scene) {
        this.scene = scene;
        this.powerups = scene.add.group();
        
        this.types = {
            spread: {
                color: 0xff0000,
                duration: 30000,
                chance: 25,
                effect: (player) => {
                    player.currentPowerup = 'spread';
                    player.fireRate = 400;
                }
            },
            laser: {
                color: 0x00ffff,
                duration: 24000,
                chance: 20,
                effect: (player) => {
                    player.currentPowerup = 'laser';
                    player.fireRate = 200;
                }
            },
            rapid: {
                color: 0xffff00,
                duration: 20000,
                chance: 20,
                effect: (player) => {
                    player.currentPowerup = 'rapid';
                    player.fireRate = 100;
                }
            },
            shield: {
                color: 0x0000ff,
                duration: 40000,
                chance: 15,
                effect: (player) => {
                    player.addShield(3);
                }
            },
            missile: {
                color: 0xff00ff,
                duration: 16000,
                chance: 20,
                effect: (player) => {
                    player.currentPowerup = 'missile';
                    player.fireRate = 500;
                }
            }
        };

        // Setup collision with player
        scene.physics.add.overlap(
            scene.player,
            this.powerups,
            this.collectPowerup,
            null,
            this
        );
    }

    collectPowerup(player, powerup) {
        if (!player.active || !powerup.active) return;

        const config = this.types[powerup.type];
        if (!config) return;

        // Apply powerup effect
        config.effect(player);
        
        // Start powerup timer
        player.powerupTimeLeft = config.duration;

        // Play powerup sound
        if (this.scene.sound.get('powerupSound')) {
            this.scene.sound.play('powerupSound', { volume: 0.5 });
        }

        // Create collection effect
        const flash = this.scene.add.circle(powerup.x, powerup.y, 30, config.color, 0.8)
            .setBlendMode('ADD');
        
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 2,
            duration: 300,
            onComplete: () => flash.destroy()
        });

        // Update HUD
        this.scene.events.emit('powerupChanged', powerup.type);

        // Destroy powerup
        powerup.destroy();
    }

    spawnPowerup(x, y) {
        // Remove this method or make it do nothing since we only want powerups from special enemies
        return;
    }

    createPowerup(x, y, type) {
        try {
            console.log('PowerupManager creating powerup:', type); // Debug log
            const powerup = new Powerup(this.scene, x, y, type);
            this.powerups.add(powerup);
            
            // Add downward movement
            powerup.setVelocityY(50);
            
            // Destroy after 10 seconds if not collected
            this.scene.time.delayedCall(10000, () => {
                if (powerup.active) {
                    powerup.destroy();
                }
            });
            
            console.log('Powerup created successfully:', type); // Debug log
        } catch (error) {
            console.error('Failed to create powerup:', error, 'Type:', type);
        }
    }

    update() {
        // Clean up off-screen powerups
        this.powerups.getChildren().forEach(powerup => {
            if (powerup.y > 650) {
                powerup.destroy();
            }
        });
    }
} 