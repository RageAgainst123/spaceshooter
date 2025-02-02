class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, type = 'basic') {
        super(scene, x, y, 'enemy');
        
        this.type = type;
        this.scene = scene;
        
        // Add enemy to scene and physics
        scene.add.existing(this);
        scene.physics.add.existing(this);
        scene.enemies.add(this);

        // Initialize properties
        this.health = this.getTypeConfig().health;
        this.points = this.getTypeConfig().points;
        this.canShoot = ['hunter', 'boss', 'drone'].includes(type);
        this.fireRate = this.getFireRate();
        this.lastShot = 0;

        // Create visuals and setup movement
        this.createEnemyGraphics();
        this.setupMovement();
    }

    getTypeConfig() {
        const configs = {
            basic: {
                color: 0xff3333,
                health: 2,
                size: 35,  // Increased size
                shape: 'triangle',
                points: 100,
                bulletSize: 3
            },
            hunter: {
                color: 0xff6600,
                health: 3,
                size: 45,  // Increased size
                shape: 'diamond',
                points: 150,
                bulletSize: 4
            },
            boss: {
                color: 0xff0066,
                health: 10,
                size: 60,  // Increased size
                shape: 'hexagon',
                points: 500,
                bulletSize: 5
            },
            drone: {
                color: 0x9933ff,
                health: 1,
                size: 30,  // Increased size
                shape: 'circle',
                points: 75,
                bulletSize: 2
            }
        };
        return configs[this.type] || configs.basic;
    }

    getFireRate() {
        const rates = {
            hunter: 2000,  // Every 2 seconds
            boss: 1500,    // Every 1.5 seconds
            drone: 3000    // Every 3 seconds
        };
        return rates[this.type] || 2000;
    }

    createEnemyGraphics() {
        const config = this.getTypeConfig();
        const graphics = this.scene.add.graphics();
        
        // Set up alien ship style
        graphics.lineStyle(2, config.color);
        graphics.fillStyle(config.color, 0.3);
        
        switch(config.shape) {
            case 'diamond':
                this.createAlienFighter(graphics, config);
                break;
            case 'hexagon':
                this.createAlienCruiser(graphics, config);
                break;
            case 'circle':
                this.createAlienScout(graphics, config);
                break;
            default:
                this.createAlienInterceptor(graphics, config);
        }
        
        // Generate texture
        const textureName = `enemy_${this.type}`;
        graphics.generateTexture(textureName, config.size * 2, config.size * 2);
        graphics.destroy();
        
        this.setTexture(textureName);
        this.createGlowEffect(config.color);
    }

    createGlowEffect(color) {
        this.scene.add.particles(0, 0, 'laser', {
            follow: this,
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.3, end: 0 },
            tint: color,
            blendMode: 'ADD',
            lifespan: 500,
            quantity: 1,
            frequency: 100
        });
    }

    setupMovement() {
        const config = this.getTypeConfig();
        
        switch(this.type) {
            case 'basic':
                // Simple downward movement
                this.setVelocityY(100);
                break;
                
            case 'hunter':
                // Zigzag movement
                this.setVelocityY(75);
                this.movementTween = this.scene.tweens.add({
                    targets: this,
                    x: this.x + 200,
                    duration: 2000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
                break;
                
            case 'drone':
                // Circle movement
                this.setVelocityY(50);
                const radius = 50;
                let angle = 0;
                this.movementTween = this.scene.tweens.add({
                    targets: this,
                    angle: 360,
                    duration: 3000,
                    repeat: -1
                });
                this.scene.time.addEvent({
                    delay: 16,
                    callback: () => {
                        if (this.active) {
                            angle += 0.05;
                            this.x = this.x + Math.cos(angle) * 2;
                        }
                    },
                    loop: true
                });
                break;
                
            case 'boss':
                // Complex boss movement
                this.setVelocityY(30);
                this.movementTween = this.scene.tweens.add({
                    targets: this,
                    y: 100,  // Move to top of screen and stop
                    duration: 2000,
                    ease: 'Power2',
                    onComplete: () => {
                        // Start side-to-side movement
                        this.scene.tweens.add({
                            targets: this,
                            x: '+=200',
                            duration: 3000,
                            yoyo: true,
                            repeat: -1,
                            ease: 'Sine.easeInOut'
                        });
                    }
                });
                break;
        }
    }

    update() {
        if (!this.active) return;

        // Remove if off screen
        if (this.y > 650) {
            this.destroy();
            return;
        }

        // Shooting logic
        if (this.canShoot && this.scene.player?.active) {
            const currentTime = this.scene.time.now;
            if (currentTime > this.lastShot + this.fireRate) {
                this.shoot();
                this.lastShot = currentTime;
            }
        }
    }

    shoot() {
        if (!this.active) return;

        const config = this.getTypeConfig();
        const laser = this.scene.enemyLasers.create(this.x, this.y + 20, 'laser');
        
        // Make bullets bigger
        laser.setScale(config.bulletSize);
        laser.setTint(config.color);
        laser.setVelocityY(300);
        
        // Enhanced bullet effect
        const glow = this.scene.add.rectangle(
            laser.x, 
            laser.y, 
            8 * config.bulletSize, 
            16 * config.bulletSize, 
            config.color, 
            0.6
        ).setBlendMode(Phaser.BlendModes.ADD);
        
        // Add particle trail to bullets
        const particles = this.scene.add.particles(laser.x, laser.y, 'laser', {
            follow: laser,
            scale: { start: config.bulletSize * 0.5, end: 0 },
            alpha: { start: 0.6, end: 0 },
            tint: config.color,
            blendMode: Phaser.BlendModes.ADD,
            lifespan: 200,
            quantity: 2,
            frequency: 30
        });
        
        // Cleanup
        laser.on('destroy', () => {
            particles.destroy();
            glow.destroy();
        });
    }

    damage(amount = 1) {
        try {
            if (!this.active || !this.scene) return;
            
            this.health -= amount;
            
            // Flash effect when hit
            this.setTint(0xffffff);
            if (this.scene && this.scene.time) {
                this.scene.time.delayedCall(100, () => {
                    if (this.active) {
                        this.clearTint();
                    }
                });
            }

            // Check if destroyed
            if (this.health <= 0) {
                // Update score
                if (this.scene && this.scene.game && this.scene.game.globals) {
                    this.scene.game.globals.score += this.getTypeConfig().points;
                    // Emit score changed event for HUD
                    this.scene.events.emit('scoreChanged', this.scene.game.globals.score);
                }
                
                // Create explosion effect
                this.createExplosionEffect();
                
                // Spawn powerup chance
                this.trySpawnPowerup();
                
                // Destroy the enemy
                this.destroy();
            }
        } catch (error) {
            console.error('Error in enemy damage:', error);
        }
    }

    createExplosionEffect() {
        const config = this.getTypeConfig();
        const size = config.size;

        // Create multiple explosion layers
        // Core explosion
        const coreParticles = this.scene.add.particles(this.x, this.y, 'laser', {
            speed: { min: 100, max: 200 },
            scale: { start: size/10, end: 0 },
            alpha: { start: 1, end: 0 },
            tint: config.color,
            blendMode: Phaser.BlendModes.ADD,
            quantity: 20,
            lifespan: 800
        });

        // Shockwave
        const shockwave = this.scene.add.circle(this.x, this.y, size/2, config.color, 0.8)
            .setBlendMode(Phaser.BlendModes.ADD);

        this.scene.tweens.add({
            targets: shockwave,
            radius: size * 2,
            alpha: 0,
            duration: 300,
            onComplete: () => shockwave.destroy()
        });

        // Debris particles
        const debrisParticles = this.scene.add.particles(this.x, this.y, 'laser', {
            speed: { min: 50, max: 150 },
            scale: { start: size/15, end: 0 },
            alpha: { start: 0.8, end: 0 },
            tint: 0xffff99,
            blendMode: Phaser.BlendModes.ADD,
            quantity: 15,
            lifespan: 1000,
            angle: { min: 0, max: 360 }
        });

        // Flash effect
        const flash = this.scene.add.circle(this.x, this.y, size, 0xffffff, 1)
            .setBlendMode(Phaser.BlendModes.ADD);

        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 2,
            duration: 200,
            onComplete: () => flash.destroy()
        });

        // Cleanup
        this.scene.time.delayedCall(1000, () => {
            coreParticles.destroy();
            debrisParticles.destroy();
        });
    }

    trySpawnPowerup() {
        // 20% chance to spawn powerup
        if (Phaser.Math.Between(1, 100) <= 20) {
            const powerupTypes = ['spread', 'laser', 'rapid', 'shield', 'missile'];
            const randomType = powerupTypes[Phaser.Math.Between(0, powerupTypes.length - 1)];
            new Powerup(this.scene, this.x, this.y, randomType);
        }
    }

    createAlienInterceptor(graphics, config) {
        const size = config.size;
        
        // Main ship body
        graphics.lineStyle(3, config.color);
        graphics.fillStyle(config.color, 0.3);
        
        // Draw more detailed alien ship
        graphics.beginPath();
        // Front point
        graphics.moveTo(0, -size);
        // Right wing
        graphics.lineTo(size * 0.8, -size * 0.2);
        graphics.lineTo(size * 0.9, size * 0.3);
        graphics.lineTo(size * 0.5, size * 0.2);
        // Main body
        graphics.lineTo(size * 0.4, size);
        graphics.lineTo(-size * 0.4, size);
        // Left wing
        graphics.lineTo(-size * 0.5, size * 0.2);
        graphics.lineTo(-size * 0.9, size * 0.3);
        graphics.lineTo(-size * 0.8, -size * 0.2);
        graphics.closePath();
        graphics.fillPath();
        graphics.strokePath();

        // Engine glow
        graphics.fillStyle(config.color, 0.5);
        graphics.fillCircle(0, size * 0.7, size * 0.2);
        
        // Cockpit
        graphics.lineStyle(2, config.color, 0.8);
        graphics.beginPath();
        graphics.arc(0, -size * 0.3, size * 0.15, 0, Math.PI * 2);
        graphics.strokePath();
        
        // Tech details
        graphics.lineStyle(1, config.color, 0.6);
        graphics.beginPath();
        // Wing details
        graphics.moveTo(-size * 0.6, 0);
        graphics.lineTo(-size * 0.2, -size * 0.5);
        graphics.moveTo(size * 0.6, 0);
        graphics.lineTo(size * 0.2, -size * 0.5);
        graphics.strokePath();
    }

    createAlienFighter(graphics, config) {
        const size = config.size;
        
        // Main body
        graphics.beginPath();
        graphics.moveTo(0, -size);
        graphics.lineTo(size * 0.7, size * 0.3);
        graphics.lineTo(size * 0.4, size * 0.3);
        graphics.lineTo(size * 0.4, size);
        graphics.lineTo(-size * 0.4, size);
        graphics.lineTo(-size * 0.4, size * 0.3);
        graphics.lineTo(-size * 0.7, size * 0.3);
        graphics.closePath();
        graphics.fillPath();
        graphics.strokePath();

        // Add tech details
        graphics.lineStyle(1, config.color, 0.8);
        // Cockpit
        graphics.beginPath();
        graphics.arc(0, 0, size * 0.2, 0, Math.PI * 2);
        graphics.strokePath();
        // Wing lines
        graphics.moveTo(-size * 0.4, size * 0.3);
        graphics.lineTo(-size * 0.2, -size * 0.2);
        graphics.moveTo(size * 0.4, size * 0.3);
        graphics.lineTo(size * 0.2, -size * 0.2);
        graphics.strokePath();
    }

    createAlienCruiser(graphics, config) {
        const size = config.size;
        graphics.beginPath();
        graphics.moveTo(0, -size);
        graphics.lineTo(size, 0);
        graphics.lineTo(0, size);
        graphics.lineTo(-size, 0);
        graphics.closePath();
        graphics.strokePath();
        graphics.fillPath();

        // Add alien details
        graphics.lineStyle(1, config.color);
        graphics.beginPath();
        graphics.moveTo(-size/2, -size/2);
        graphics.lineTo(size/2, size/2);
        graphics.moveTo(size/2, -size/2);
        graphics.lineTo(-size/2, size/2);
        graphics.strokePath();
    }

    createAlienScout(graphics, config) {
        const size = config.size;
        // Outer circle
        graphics.beginPath();
        graphics.arc(0, 0, size, 0, Math.PI * 2);
        graphics.strokePath();
        graphics.fillPath();

        // Inner details
        graphics.lineStyle(1, config.color);
        graphics.beginPath();
        graphics.arc(0, 0, size/2, 0, Math.PI * 2);
        graphics.moveTo(-size, 0);
        graphics.lineTo(size, 0);
        graphics.moveTo(0, -size);
        graphics.lineTo(0, size);
        graphics.strokePath();
    }

    destroy() {
        try {
            if (this.glowEffect && !this.glowEffect.destroyed) {
                this.glowEffect.destroy();
            }
            if (this.movementTween && !this.movementTween.destroyed) {
                this.movementTween.destroy();
            }
            super.destroy();
        } catch (error) {
            console.warn('Enemy cleanup error:', error);
        }
    }
} 