class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, type, powerupType = null) {
        // Use correct sprite based on type
        const spriteKey = type === 'hunter' ? 'enemy2' : 'enemy1';
        
        super(scene, x, y, spriteKey);
        
        this.type = type;
        this.scene = scene;
        // Store powerup type directly from constructor if provided
        this.powerupType = powerupType;  
        
        // Random size between 70% and 120%
        const sizeScale = Phaser.Math.FloatBetween(0.7, 1.2);
        this.setScale(sizeScale);
        
        // Initialize base properties
        const config = this.getTypeConfig();
        // Adjust health based on size
        this.health = Math.round(config.health * sizeScale);
        this.canShoot = true;
        this.fireRate = this.getFireRate();
        this.lastShot = 0;
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        scene.enemies.add(this);

        // Setup base movement and rotation for hunter type
        this.setupMovement();

        // Only log if enemy gets a powerup
        if (!this.powerupType && Phaser.Math.Between(1, 100) <= 10) {
            const powerupTypes = Object.keys(scene.powerupManager.types);
            const selectedPowerup = powerupTypes[Phaser.Math.Between(0, powerupTypes.length - 1)];
            
            const powerupConfig = scene.powerupManager.types[selectedPowerup];
            if (powerupConfig) {
                this.powerupType = selectedPowerup;
                console.log(`[POWERUP-ENEMY] ${this.type} spawned with ${this.powerupType} powerup at (${this.x}, ${this.y})`);
                
                // Visual indicator of powerup
                this.setTint(powerupConfig.color);
                
                // Apply powerup behavior
                switch(this.powerupType) {
                    case 'spread':
                        this.shootMethod = this.shootSpread.bind(this);
                        this.fireRate *= 1.5;
                        break;
                    case 'laser':
                        this.shootMethod = this.shootLaser.bind(this);
                        this.fireRate *= 0.8;
                        break;
                    case 'rapid':
                        this.shootMethod = this.shootRapid.bind(this);
                        this.fireRate *= 0.5;
                        break;
                    case 'shield':
                        this.health *= 2;
                        this.addShield();
                        break;
                    case 'missile':
                        this.shootMethod = this.shootMissile.bind(this);
                        this.fireRate *= 2;
                        break;
                }
            }
        }

        // Add data property to store powerup type
        this.setData('powerupType', this.powerupType);
    }

    getTypeConfig() {
        const configs = {
            basic: {
                color: 0xff3333,
                health: 2,
                points: 100,
                bulletSize: 3
            },
            hunter: {
                color: 0xff6600,
                health: 3,
                points: 150,
                bulletSize: 4
            }
        };
        
        const config = configs[this.type] || configs.basic;
        
        if (this.scale.x !== 1) {
            console.log(`[ENEMY-SIZE] ${this.type} spawned at ${Math.round(this.scale.x * 100)}% size with ${this.health} health`);
        }
        
        return config;
    }

    setupMovement() {
        if (this.type === 'basic') {
            // Basic enemy moves in a straight line with slight wobble
            this.setVelocityY(150);
            this.scene.tweens.add({
                targets: this,
                x: `+=${50}`,
                duration: 2000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        } else {
            // Hunter enemy follows a more aggressive pattern
            this.setVelocityY(100);
            this.scene.tweens.add({
                targets: this,
                x: `+=${150}`,
                duration: 3000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            // 30% chance for hunter to rotate
            if (Phaser.Math.Between(1, 100) <= 30) {
                this.scene.tweens.add({
                    targets: this,
                    angle: 360,
                    duration: 3000,
                    repeat: -1,
                    ease: 'Linear'
                });
                
                // Shoot more frequently when spinning
                this.fireRate *= 0.7;
            }
        }
    }

    shoot() {
        if (!this.active || !this.scene.player?.active) return;

        if (this.shootMethod) {
            this.shootMethod();  // Use powerup weapon
        } else {
            // Default shooting behavior - make it more visible
            const laser = this.scene.enemyLasers.create(this.x, this.y + 20, 'laser');
            laser.setTint(0xff0000);  // Bright red
            laser.setScale(2.5);      // Make it bigger
            laser.setBlendMode('ADD');
            laser.setAlpha(1);        // Full opacity
            
            // Add glow effect
            const glow = this.scene.add.circle(laser.x, laser.y, 4, 0xff0000, 0.4)
                .setBlendMode('ADD');
            
            // Make glow follow laser
            this.scene.events.on('update', () => {
                if (laser.active) {
                    glow.setPosition(laser.x, laser.y);
                } else {
                    glow.destroy();
                }
            });
            
            laser.setVelocityY(300);
        }
    }

    // Define weapon colors centrally
    static WEAPON_COLORS = {
        DEFAULT: 0xff0000,    // Red
        SPREAD: 0xff0000,     // Red
        LASER: 0x00ffff,      // Cyan
        RAPID: 0xffff00,      // Yellow
        MISSILE: 0xff00ff     // Magenta
    };

    shootSpread() {
        const angles = [-30, -15, 0, 15, 30];
        angles.forEach(angle => {
            const laser = this.scene.enemyLasers.create(this.x, this.y + 20, 'laser');
            laser.setTint(Enemy.WEAPON_COLORS.SPREAD);
            laser.setScale(1.5);
            laser.setBlendMode('ADD');
            
            const rad = Phaser.Math.DegToRad(angle + 90);
            const speed = 300;
            laser.setVelocity(
                Math.cos(rad) * speed,
                Math.sin(rad) * speed
            );
        });
    }

    shootLaser() {
        const laser = this.scene.enemyLasers.create(this.x, this.y + 20, 'laser');
        laser.setScale(2);
        laser.setTint(Enemy.WEAPON_COLORS.LASER);
        laser.setBlendMode('ADD');
        laser.setVelocityY(800);
    }

    shootMissile() {
        const missile = this.scene.enemyLasers.create(this.x, this.y + 20, 'laser');
        missile.setTint(Enemy.WEAPON_COLORS.MISSILE);
        missile.setScale(2);
        missile.setBlendMode('ADD');
        
        if (this.scene.player?.active) {
            const angle = Phaser.Math.Angle.Between(
                missile.x, missile.y,
                this.scene.player.x, this.scene.player.y
            );
            
            const speed = 250;
            missile.setVelocity(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed
            );

            // Store the update function so we can remove it properly
            const updateMissile = () => {
                // If missile or player is gone, cleanup and stop tracking
                if (!missile?.active || !this.scene?.player?.active) {
                    if (this.scene) {  // Make sure scene still exists
                        this.scene.events.off('update', updateMissile);
                    }
                    return;
                }

                // Update missile direction
                const newAngle = Phaser.Math.Angle.Between(
                    missile.x, missile.y,
                    this.scene.player.x, this.scene.player.y
                );
                missile.setVelocity(
                    Math.cos(newAngle) * speed,
                    Math.sin(newAngle) * speed
                );
            };

            // Add cleanup to both missile and enemy
            missile.on('destroy', () => {
                if (this.scene) {
                    this.scene.events.off('update', updateMissile);
                }
            });

            this.on('destroy', () => {
                if (this.scene) {
                    this.scene.events.off('update', updateMissile);
                }
                if (missile?.active) {
                    missile.destroy();
                }
            });

            // Start tracking
            this.scene.events.on('update', updateMissile);
        } else {
            missile.setVelocityY(300);
        }
    }

    shootRapid() {
        for (let i = 0; i < 3; i++) {
            this.scene.time.delayedCall(i * 100, () => {
                if (!this.active) return;
                const laser = this.scene.enemyLasers.create(this.x, this.y + 20, 'laser');
                laser.setTint(Enemy.WEAPON_COLORS.RAPID);
                laser.setBlendMode('ADD');
                laser.setVelocityY(400);
            });
        }
    }

    update() {
        if (!this.active) return;

        // Check if enemy is off screen
        if (this.y > 650) {
            // Clean up shield if it exists
            if (this.shield) {
                this.shield.destroy();
            }
            // Remove all event listeners
            this.removeAllListeners();
            // Destroy the enemy
            this.destroy();
            return;
        }

        // Handle shooting
        if (this.canShoot && this.scene.time.now > this.lastShot + this.fireRate) {
            this.shoot();
            this.lastShot = this.scene.time.now;
        }
    }

    getFireRate() {
        return {
            basic: 2000,    // Enemy1 shoots every 2 seconds
            hunter: 3000    // Enemy2 shoots every 3 seconds (but 3 bullets at once)
        }[this.type] || 2000;
    }

    damage(amount) {
        if (!this.active || !this.scene) return;
        
        const oldHealth = this.health;
        this.health -= amount;
        
        if (this.powerupType) {
            console.log(`[POWERUP-DAMAGE] ${this.type} with ${this.powerupType} powerup health: ${oldHealth} -> ${this.health}`);
            
            if (this.health <= 0) {
                console.log(`[POWERUP-DEATH] ${this.type} with ${this.powerupType} powerup destroyed at (${this.x}, ${this.y})`);
                console.log(`[POWERUP-CHECK] Powerup status - active: ${this.active}, scene exists: ${!!this.scene}, powerupType: ${this.powerupType}`);
            }
        }

        // Flash effect
        this.setTint(0xffffff);
        this.scene.time.delayedCall(100, () => {
            if (this.active) {
                if (this.powerupType) {
                    const powerupConfig = this.scene.powerupManager.types[this.powerupType];
                    this.setTint(powerupConfig.color);
                    console.log(`[POWERUP-STATE] Enemy still active after damage, powerup: ${this.powerupType}`);
                } else {
                    this.clearTint();
                }
            }
        });
    }

    // Add shield effect similar to player's shield
    addShield() {
        // Create shield as a separate game object that follows the enemy
        this.shield = this.scene.add.circle(this.x, this.y, 25, 0x0000ff, 0.3)
            .setBlendMode('ADD');
        
        // Add update listener to make shield follow enemy
        this.scene.events.on('update', () => {
            if (this.active && this.shield && this.shield.active) {
                this.shield.setPosition(this.x, this.y);
            }
        });

        // Animate shield
        this.scene.tweens.add({
            targets: this.shield,
            alpha: 0.1,
            yoyo: true,
            repeat: -1,
            duration: 1000
        });

        // Clean up shield when enemy is destroyed
        this.on('destroy', () => {
            if (this.shield) {
                this.shield.destroy();
            }
        });
    }

    destroy(fromScene) {
        if (this.powerupType) {
            console.log(`[POWERUP-DESTROY] ${this.type} with ${this.powerupType} being destroyed. FromScene: ${fromScene}`);
            
            // Create powerup before destruction
            if (this.scene && this.active) {
                console.log(`[POWERUP-SPAWN] Attempting to spawn ${this.powerupType} from destroy call`);
                this.scene.powerupManager.createPowerup(this.x, this.y, this.powerupType);
            } else {
                console.log(`[POWERUP-ERROR] Cannot spawn powerup - Scene: ${!!this.scene}, Active: ${this.active}`);
            }
        }
        super.destroy(fromScene);
    }
} 