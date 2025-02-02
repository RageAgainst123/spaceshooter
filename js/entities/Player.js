class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'ship');
        
        // Add player to scene
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Set up player properties
        this.setCollideWorldBounds(true);
        
        // Initialize player state
        this.fireRate = scene.game.globals.gameSettings.playerFireRate;
        this.lastFired = 0;
        this.health = 100;
        this.maxHealth = 100;
        this.currentPowerup = null;
        this.powerupTimeLeft = 0;
        this.isInvulnerable = false;
        this.shieldHits = 0;

        this.addMovementEffects();
    }

    update(cursors, fireKey) {
        const speed = this.scene.game.globals.gameSettings.playerSpeed;
        let velocityX = 0;
        let velocityY = 0;

        // Handle movement
        if (cursors.left.isDown) {
            velocityX = -speed;
            this.rightThruster.emitting = true;
            this.leftThruster.emitting = false;
        } else if (cursors.right.isDown) {
            velocityX = speed;
            this.leftThruster.emitting = true;
            this.rightThruster.emitting = false;
        } else {
            this.leftThruster.emitting = false;
            this.rightThruster.emitting = false;
        }

        if (cursors.up.isDown) {
            velocityY = -speed;
            this.engineParticles.emitting = true;
            this.speedLines.emitting = true;
        } else if (cursors.down.isDown) {
            velocityY = speed;
            this.engineParticles.emitting = false;
            this.speedLines.emitting = false;
        } else {
            this.engineParticles.emitting = false;
            this.speedLines.emitting = false;
        }

        // Update particle emitter positions
        this.engineParticles.setPosition(this.x, this.y + 20);
        this.leftThruster.setPosition(this.x - 15, this.y);
        this.rightThruster.setPosition(this.x + 15, this.y);
        this.speedLines.setPosition(this.x, this.y - 20);

        // Normalize diagonal movement
        if (velocityX !== 0 && velocityY !== 0) {
            velocityX *= 0.707;
            velocityY *= 0.707;
        }

        this.setVelocity(velocityX, velocityY);

        // Handle firing
        if (fireKey.isDown && this.scene.time.now > this.lastFired) {
            this.fire();
            this.lastFired = this.scene.time.now + this.fireRate;
        }

        // Update powerup timer
        if (this.powerupTimeLeft > 0) {
            this.powerupTimeLeft -= 16; // Assuming 60fps
            if (this.powerupTimeLeft <= 0) {
                this.removePowerup();
            }
        }
    }

    fire() {
        switch(this.currentPowerup) {
            case 'spread':
                this.fireSpread();
                break;
            case 'laser':
                this.fireLaser();
                break;
            case 'missile':
                this.fireMissile();
                break;
            default:
                this.fireNormal();
                break;
        }
    }

    fireNormal() {
        const laser = this.scene.playerLasers.create(this.x, this.y - 20, 'laser');
        laser.setVelocityY(-400);

        // Add muzzle flash effect
        const flash = this.scene.add.circle(this.x, this.y - 20, 5, 0x00ff00, 1);
        this.scene.tweens.add({
            targets: flash,
            scale: 0,
            alpha: 0,
            duration: 100,
            onComplete: () => flash.destroy()
        });

        // Screen shake effect when firing
        this.scene.cameras.main.shake(50, 0.002);
    }

    fireSpread() {
        const angles = [-30, -15, 0, 15, 30];
        angles.forEach(angle => {
            const laser = this.scene.playerLasers.create(this.x, this.y - 20, 'laser');
            laser.setScale(2);
            laser.setTint(0xff6600);
            
            // Calculate velocity based on angle
            const rad = Phaser.Math.DegToRad(angle - 90);
            const speed = 600;
            laser.setVelocity(
                Math.cos(rad) * speed,
                Math.sin(rad) * speed
            );
            
            // Create effect container
            const effectContainer = this.scene.add.container(laser.x, laser.y);
            
            // Add glow effect
            const glow = this.scene.add.rectangle(0, 0, 4, 16, 0xff6600, 0.6)
                .setBlendMode(Phaser.BlendModes.ADD);
            effectContainer.add(glow);
            
            // Cleanup function
            const cleanup = () => {
                effectContainer.destroy();
                this.scene.events.off('update', updatePosition);
            };
            
            // Update position function
            const updatePosition = () => {
                if (laser.active) {
                    effectContainer.setPosition(laser.x, laser.y);
                    effectContainer.setRotation(laser.rotation);
                } else {
                    cleanup();
                }
            };
            
            this.scene.events.on('update', updatePosition);
            laser.on('destroy', cleanup);
        });
    }

    fireLaser() {
        const laser = this.scene.playerLasers.create(this.x, this.y - 20, 'laser');
        laser.setScale(8, 30);
        laser.setVelocityY(-1000);
        
        // Create effect container
        const effectContainer = this.scene.add.container(laser.x, laser.y);
        
        // Core beam
        const coreBeam = this.scene.add.rectangle(0, 0, 8, laser.height, 0x00ffff, 1)
            .setBlendMode(Phaser.BlendModes.ADD);
        
        // Energy field
        const energyField = this.scene.add.rectangle(0, 0, 16, laser.height, 0x0066ff, 0.6)
            .setBlendMode(Phaser.BlendModes.ADD);
        
        // Add plasma particles
        const particles = this.scene.add.particles(0, 0, 'laser', {
            scale: { start: 1, end: 0 },
            alpha: { start: 0.6, end: 0 },
            tint: [0x00ffff, 0x0066ff],
            blendMode: Phaser.BlendModes.ADD,
            speed: { min: -50, max: 50 },
            quantity: 4,
            lifespan: 300
        });
        
        effectContainer.add([energyField, coreBeam, particles]);
        
        // Add energy rings that travel up the beam
        const rings = [];
        for (let i = 0; i < 3; i++) {
            const ring = this.scene.add.circle(0, 0, 12, 0x00ffff, 0.8)
                .setBlendMode(Phaser.BlendModes.ADD);
            rings.push(ring);
            effectContainer.add(ring);
            
            // Animate ring
            this.scene.tweens.add({
                targets: ring,
                y: -laser.height,
                duration: 500,
                loop: -1,
                delay: i * 200
            });
        }
        
        // Screen effects
        this.scene.cameras.main.flash(100, 0, 150, 255, 0.3);
        this.scene.cameras.main.shake(50, 0.005);
        
        // Cleanup
        const cleanup = () => {
            effectContainer.destroy();
            this.scene.events.off('update', updatePosition);
        };
        
        // Update position
        const updatePosition = () => {
            if (laser.active) {
                effectContainer.setPosition(laser.x, laser.y);
            } else {
                cleanup();
            }
        };
        
        this.scene.events.on('update', updatePosition);
        laser.on('destroy', cleanup);
    }

    fireMissile() {
        const missile = this.scene.playerLasers.create(this.x, this.y - 20, 'laser');
        missile.setScale(2);
        missile.setTint(0xff00ff);
        
        // Create container for effects
        const effectContainer = this.scene.add.container(missile.x, missile.y);
        
        // Add simple trail effect
        const trail = this.scene.add.rectangle(0, 10, 4, 20, 0xff00ff, 0.6)
            .setBlendMode(Phaser.BlendModes.ADD);
        effectContainer.add(trail);
        
        // Track nearest enemy
        let target = null;
        
        // Update position and tracking
        const updateEvent = this.scene.events.on('update', () => {
            if (!missile.active) {
                // Clean up when missile is destroyed
                updateEvent.remove();
                effectContainer.destroy();
                return;
            }
            
            // Find nearest enemy if we don't have one
            if (!target || !target.active) {
                target = this.findNearestEnemy(missile);
            }
            
            // Update missile movement
            if (target && target.active) {
                this.scene.physics.moveToObject(missile, target, 400);
            }
            
            // Update effect position
            effectContainer.setPosition(missile.x, missile.y);
            effectContainer.setRotation(missile.rotation);
        });
    }

    damage(amount) {
        if (this.shieldHits > 0) {
            this.shieldHits--;
            
            // Shield hit effect
            const flash = this.scene.add.circle(this.x, this.y, 40, 0x00ffff, 1)
                .setBlendMode(Phaser.BlendModes.ADD);
            
            this.scene.tweens.add({
                targets: flash,
                alpha: 0,
                scale: 1.5,
                duration: 200,
                onComplete: () => flash.destroy()
            });
            
            if (this.shieldHits <= 0) {
                this.shieldEffect?.destroy();
                this.shieldEffect = null;
            }
            return;
        }

        if (this.isInvulnerable) return;

        this.health -= amount;
        this.scene.events.emit('playerHealthChanged', this.health);

        // Flash effect
        this.setTint(0xff0000);
        this.isInvulnerable = true;
        
        this.scene.time.delayedCall(1000, () => {
            this.clearTint();
            this.isInvulnerable = false;
        });

        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        if (!this.active) return;
        
        // Store scene reference and position before destruction
        const scene = this.scene;
        const x = this.x;
        const y = this.y;
        
        // Create explosion effect
        const explosion = scene.add.particles(x, y, 'laser', {
            speed: { min: -150, max: 150 },
            scale: { start: 2, end: 0 },
            tint: [0xff0000, 0xffff00, 0xffffff],
            blendMode: Phaser.BlendModes.ADD,
            lifespan: 1000,
            quantity: 30,
            emitting: false
        });
        
        explosion.explode(30);
        
        // Destroy player first
        this.destroy();
        
        // Clean up explosion and call game over
        scene.time.delayedCall(1000, () => {
            explosion.destroy();
            // Call game over
            scene.time.delayedCall(500, () => {
                if (scene.scene.isActive()) {  // Check if scene is still active
                    scene.gameOver();
                }
            });
        });
    }

    setPowerup(type, duration) {
        const durations = {
            spread: 15000,  // 15 seconds
            laser: 12000,   // 12 seconds
            rapid: 10000,   // 10 seconds
            shield: 20000,  // 20 seconds
            missile: 8000   // 8 seconds
        };

        this.currentPowerup = type;
        this.powerupTimeLeft = duration || durations[type] || 5000;
        this.scene.events.emit('powerupChanged', type);
    }

    removePowerup() {
        this.currentPowerup = null;
        this.scene.events.emit('powerupChanged', null);
    }

    addShield(hits) {
        this.shieldHits = hits || 1;
        
        // Remove existing shield if any
        if (this.shieldEffect) {
            this.shieldEffect.destroy();
        }
        
        // Create shield container
        this.shieldEffect = this.scene.add.container(this.x, this.y);
        
        // Inner shield
        const innerShield = this.scene.add.circle(0, 0, 35, 0x00ffff, 0.2);
        
        // Outer shield with hexagon pattern
        const outerShield = this.scene.add.graphics();
        outerShield.lineStyle(2, 0x00ffff, 0.4);
        
        // Create hexagon pattern
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6;
            const nextAngle = ((i + 1) * Math.PI * 2) / 6;
            const x = Math.cos(angle) * 40;
            const y = Math.sin(angle) * 40;
            const nextX = Math.cos(nextAngle) * 40;
            const nextY = Math.sin(nextAngle) * 40;
            
            outerShield.beginPath();
            outerShield.moveTo(x, y);
            outerShield.lineTo(nextX, nextY);
            outerShield.strokePath();
        }
        
        this.shieldEffect.add([innerShield, outerShield]);
        
        // Shield rotation
        this.scene.tweens.add({
            targets: outerShield,
            angle: 360,
            duration: 3000,
            repeat: -1
        });
        
        // Shield pulse
        this.scene.tweens.add({
            targets: innerShield,
            scaleX: 1.1,
            scaleY: 1.1,
            alpha: 0.1,
            duration: 1000,
            yoyo: true,
            repeat: -1
        });
        
        // Update shield position
        this.scene.events.on('update', this.updateShieldPosition, this);
    }

    updateShieldPosition() {
        if (this.shieldEffect && this.active) {
            this.shieldEffect.setPosition(this.x, this.y);
        }
    }

    // Helper method for missile targeting
    findNearestEnemy(missile) {
        let nearest = null;
        let minDistance = Infinity;
        
        this.scene.enemies.getChildren().forEach(enemy => {
            if (enemy.active) {
                const distance = Phaser.Math.Distance.Between(
                    missile.x, missile.y, enemy.x, enemy.y
                );
                if (distance < minDistance) {
                    minDistance = distance;
                    nearest = enemy;
                }
            }
        });
        
        return nearest;
    }

    // Add this method to handle ship movement effects
    addMovementEffects() {
        // Main engine flame
        this.engineFlame = this.scene.add.container(this.x, this.y + 20);
        
        // Create flame particles
        this.engineParticles = this.scene.add.particles(0, 0, 'laser', {
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.6, end: 0 },
            tint: [0x0066ff, 0x00ffff],
            blendMode: Phaser.BlendModes.ADD,
            lifespan: 200,
            quantity: 2,
            frequency: 20,
            emitting: false
        });
        
        // Side thrusters
        this.leftThruster = this.scene.add.particles(0, 0, 'laser', {
            scale: { start: 0.3, end: 0 },
            alpha: { start: 0.4, end: 0 },
            tint: 0x00ffff,
            blendMode: Phaser.BlendModes.ADD,
            lifespan: 150,
            quantity: 1,
            frequency: 30,
            emitting: false
        });
        
        this.rightThruster = this.scene.add.particles(0, 0, 'laser', {
            scale: { start: 0.3, end: 0 },
            alpha: { start: 0.4, end: 0 },
            tint: 0x00ffff,
            blendMode: Phaser.BlendModes.ADD,
            lifespan: 150,
            quantity: 1,
            frequency: 30,
            emitting: false
        });

        // Add speed lines effect
        this.speedLines = this.scene.add.particles(0, 0, 'laser', {
            scale: { start: 0.2, end: 0 },
            alpha: { start: 0.3, end: 0 },
            tint: 0x00ffff,
            blendMode: Phaser.BlendModes.ADD,
            lifespan: 300,
            quantity: 1,
            frequency: 50,
            emitting: false
        });
    }

    // Update the destroy method to clean up effects
    destroy() {
        this.engineParticles?.destroy();
        this.leftThruster?.destroy();
        this.rightThruster?.destroy();
        this.speedLines?.destroy();
        this.shieldEffect?.destroy();
        super.destroy();
    }
} 