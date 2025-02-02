class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'ship');
        
        // Initialize properties
        this.scene = scene;
        this.shockwaveReady = true;
        this.shockwaveCooldown = 30000; // 30 seconds
        this.teleportReady = true;
        this.teleportCooldown = 5000; // 5 seconds
        
        // Setup input keys
        this.keys = scene.input.keyboard.addKeys({
            x: Phaser.Input.Keyboard.KeyCodes.X,
            y: Phaser.Input.Keyboard.KeyCodes.Y,
            c: Phaser.Input.Keyboard.KeyCodes.C
        });
        
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

        // Initialize cooldown timers in HUD
        this.scene.events.emit('shockwaveUpdate', 100);
        this.scene.events.emit('teleportUpdate', 100);

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
        } else if (cursors.down.isDown) {
            velocityY = speed;
            this.engineParticles.emitting = false;
        } else {
            this.engineParticles.emitting = false;
        }

        // Normalize diagonal movement
        if (velocityX !== 0 && velocityY !== 0) {
            velocityX *= 0.707;
            velocityY *= 0.707;
        }

        this.setVelocity(velocityX, velocityY);

        // Handle firing with space
        if (fireKey.isDown && this.scene.time.now > this.lastFired) {
            this.fire();
            this.lastFired = this.scene.time.now + this.fireRate;
        }

        // Handle shooting with X
        if (this.keys.x.isDown && this.scene.time.now > this.lastFired) {
            this.fire();
            this.lastFired = this.scene.time.now + this.fireRate;
        }

        // Handle shockwave with Y
        if (this.keys.y.isDown && this.shockwaveReady) {
            this.createShockwave();
        }

        // Handle teleport with C
        if (this.keys.c.isDown && this.teleportReady) {
            this.teleport();
        }

        // Update powerup timer
        if (this.powerupTimeLeft > 0) {
            this.powerupTimeLeft -= 16; // Assuming 60fps
            if (this.powerupTimeLeft <= 0) {
                this.removePowerup();
            }
        }
    }

    // Base weapon methods
    fireNormal() {
        const laser = this.scene.playerLasers.create(this.x, this.y - 20, 'laser');
        laser.setVelocityY(-400);
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
        });
    }

    fireLaser() {
        const laser = this.scene.playerLasers.create(this.x, this.y - 20, 'laser');
        laser.setScale(2);
        laser.setTint(0x00ffff);
        laser.setVelocityY(-600);
    }

    fireMissile() {
        const missile = this.scene.playerLasers.create(this.x, this.y - 20, 'laser');
        missile.setScale(2);
        missile.setTint(0xff00ff);
        missile.setVelocityY(-300);

        // Add homing behavior
        const updateMissile = () => {
            if (!missile.active) return;
            
            const target = this.findNearestEnemy(missile);
            if (target && target.active) {
                const angle = Phaser.Math.Angle.Between(
                    missile.x, missile.y,
                    target.x, target.y
                );
                
                const speed = 400;
                const vx = Math.cos(angle) * speed;
                const vy = Math.sin(angle) * speed;
                
                missile.setVelocity(vx, vy);
                missile.rotation = angle + Math.PI/2;
            }
        };

        this.scene.events.on('update', updateMissile);
        missile.on('destroy', () => {
            this.scene.events.removeListener('update', updateMissile);
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

        try {
            // Create explosion effect
            const explosion = this.scene.add.particles(this.x, this.y, 'laser', {
                speed: { min: -200, max: 200 },
                scale: { start: 1, end: 0 },
                alpha: { start: 1, end: 0 },
                tint: 0xff0000,
                quantity: 50,
                lifespan: 1000,
                blendMode: 'ADD'
            });

            // Play explosion sound
            if (this.scene.sound.get('explosion')) {
                this.scene.sound.play('explosion', { volume: 0.5 });
            }

            // Camera effects
            this.scene.cameras.main.shake(500, 0.05);
            this.scene.cameras.main.flash(1000, 255, 0, 0);

            // Cleanup
            this.scene.time.delayedCall(1000, () => {
                if (explosion) explosion.destroy();
                this.destroy();
                this.scene.scene.start('MainMenuScene');
            });
        } catch (error) {
            console.error('Player death error:', error);
            // Fallback to simple scene restart
            this.scene.scene.start('MainMenuScene');
        }
    }

    setPowerup(type, duration) {
        // Clear any existing powerup
        if (this.powerupTimer) {
            this.powerupTimer.remove();
        }
        
        // Set new powerup
        this.currentPowerup = type;
        
        // Update fire rate for rapid powerup
        if (type === 'rapid') {
            this.fireRate = 100; // Faster firing rate
        }
        
        // Add shield if shield powerup
        if (type === 'shield') {
            this.addShield(3);
        }
        
        // Create timer to remove powerup
        this.powerupTimer = this.scene.time.delayedCall(duration, () => {
            this.removePowerup();
        });
        
        // Emit event for HUD update
        this.scene.events.emit('powerupChanged', type);
    }

    removePowerup() {
        // Reset fire rate if was rapid powerup
        if (this.currentPowerup === 'rapid') {
            this.fireRate = this.scene.game.globals.gameSettings.playerFireRate;
        }
        
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

    createShockwave() {
        this.shockwaveReady = false;
        
        // Create shockwave effect
        const shockwave = this.scene.add.circle(this.x, this.y, 10, 0x00ffff, 0.7);
        shockwave.setBlendMode('ADD');
        
        // Animate shockwave
        this.scene.tweens.add({
            targets: shockwave,
            radius: 300,
            alpha: 0,
            duration: 1000,
            ease: 'Cubic.Out',
            onUpdate: () => {
                // Damage enemies in range
                this.scene.enemies.getChildren().forEach(enemy => {
                    const distance = Phaser.Math.Distance.Between(
                        shockwave.x, shockwave.y,
                        enemy.x, enemy.y
                    );
                    if (distance <= shockwave.radius && enemy.active) {
                        enemy.health -= 3;
                        if (enemy.health <= 0) {
                            this.scene.destroyEnemy(enemy);
                        }
                    }
                });
            },
            onComplete: () => shockwave.destroy()
        });

        // Start cooldown
        this.scene.time.delayedCall(this.shockwaveCooldown, () => {
            this.shockwaveReady = true;
            this.scene.events.emit('shockwaveUpdate', 100);
        });

        // Update cooldown timer
        this.scene.time.addEvent({
            delay: 100,
            repeat: this.shockwaveCooldown / 100 - 1,
            callback: () => {
                const progress = (this.scene.time.now % this.shockwaveCooldown) / this.shockwaveCooldown * 100;
                this.scene.events.emit('shockwaveUpdate', progress);
            }
        });
    }

    teleport() {
        if (!this.teleportReady) return;
        
        this.teleportReady = false;
        
        // Create teleport effect at current position
        const startEffect = this.scene.add.particles(this.x, this.y, 'laser', {
            speed: { min: -100, max: 100 },
            scale: { start: 0.5, end: 0 },
            alpha: { start: 1, end: 0 },
            tint: 0x00ffff,
            quantity: 20,
            lifespan: 500,
            blendMode: 'ADD'
        });

        // Calculate new position (100 pixels forward)
        const newY = Math.max(50, this.y - 100);
        
        // Teleport
        this.y = newY;

        // Create arrival effect
        const endEffect = this.scene.add.particles(this.x, this.y, 'laser', {
            speed: { min: -100, max: 100 },
            scale: { start: 0, end: 0.5 },
            alpha: { start: 0, end: 1 },
            tint: 0x00ffff,
            quantity: 20,
            lifespan: 500,
            blendMode: 'ADD'
        });

        // Add temporary invulnerability shield
        this.isInvulnerable = true;
        const shield = this.scene.add.circle(this.x, this.y, 40, 0x00ffff, 0.3)
            .setBlendMode('ADD');
        
        // Make shield follow player
        const updateShield = () => {
            if (shield && this.active) {
                shield.setPosition(this.x, this.y);
            }
        };
        this.scene.events.on('update', updateShield);

        // Remove shield and invulnerability after 1 second
        this.scene.time.delayedCall(1000, () => {
            this.isInvulnerable = false;
            shield.destroy();
            this.scene.events.off('update', updateShield);
        });

        // Cleanup effects
        this.scene.time.delayedCall(500, () => {
            startEffect.destroy();
            endEffect.destroy();
        });

        // Start cooldown
        this.scene.time.delayedCall(this.teleportCooldown, () => {
            this.teleportReady = true;
            this.scene.events.emit('teleportUpdate', 100);
        });

        // Update cooldown timer
        this.scene.time.addEvent({
            delay: 100,
            repeat: this.teleportCooldown / 100 - 1,
            callback: () => {
                const progress = (this.scene.time.now % this.teleportCooldown) / this.teleportCooldown * 100;
                this.scene.events.emit('teleportUpdate', progress);
            }
        });
    }

    fire() {
        if (this.scene.time.now < this.lastFired) return;
        
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
            case 'rapid':
                this.fireNormal();
                break;
            default:
                this.fireNormal();
        }
        
        this.lastFired = this.scene.time.now + this.fireRate;
    }
} 