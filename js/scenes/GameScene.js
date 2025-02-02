class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        this.game.globals = this.game.globals || {};
        this.game.globals.gameSettings = {
            playerSpeed: 300,
            playerFireRate: 250
        };
        this.game.globals.score = 0;

        try {
            console.log('GameScene: create started');
            this.game.started = true;

            // Create background first
            this.createParallaxBackground();
            
            // Initialize groups
            this.enemies = this.add.group();
            this.playerLasers = this.physics.add.group();
            this.enemyLasers = this.physics.add.group();
            this.powerups = this.physics.add.group();

            // Create player
            this.player = new Player(this, 400, 500, 'ship');
            
            // Set up keyboard controls
            this.cursors = this.input.keyboard.createCursorKeys();
            this.fireKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
            
            // Setup collisions
            this.setupCollisions();
            
            // Start enemy spawning
            this.startEnemySpawner();
            
            // Launch HUD
            this.scene.launch('HUDScene');
            
            console.log('GameScene: setup complete');
        } catch (error) {
            console.error('GameScene creation error:', error);
            // Attempt to recover by restarting the menu
            this.scene.start('MainMenuScene');
        }
    }

    createParallaxBackground() {
        // Create multiple star layers
        this.bgLayers = [];
        const layerCount = 3;
        
        for (let i = 0; i < layerCount; i++) {
            const stars = this.add.group();
            const starCount = 50 * (i + 1);
            const speed = 0.5 * (i + 1);
            
            for (let j = 0; j < starCount; j++) {
                const x = Phaser.Math.Between(0, 800);
                const y = Phaser.Math.Between(0, 600);
                const size = i + 1;
                const alpha = 0.2 + (i * 0.3);
                
                const star = this.add.circle(x, y, size, 0xffffff, alpha);
                stars.add(star);
                
                // Add twinkling effect to some stars
                if (Phaser.Math.Between(0, 10) > 8) {
                    this.tweens.add({
                        targets: star,
                        alpha: 0.1,
                        duration: 1000 + Phaser.Math.Between(0, 2000),
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });
                }
            }
            
            this.bgLayers.push({ stars, speed });
        }
    }

    createHUD() {
        this.scoreText = this.add.text(16, 16, 'Score: 0', {
            fontSize: '32px',
            fill: '#fff'
        });
        
        this.levelText = this.add.text(16, 56, 'Level: 1', {
            fontSize: '32px',
            fill: '#fff'
        });
    }

    setupCollisions() {
        // Player lasers hitting enemies
        this.physics.add.collider(
            this.playerLasers,
            this.enemies,
            (laser, enemy) => {
                laser.destroy();
                if (enemy && enemy.active) {
                    enemy.health -= 1;
                    
                    // Flash effect
                    enemy.setTint(0xffffff);
                    this.time.delayedCall(100, () => {
                        if (enemy.active) enemy.clearTint();
                    });
                    
                    // Check if destroyed
                    if (enemy.health <= 0) {
                        // Update score
                        if (this.game.globals) {
                            this.game.globals.score += enemy.getTypeConfig().points;
                            this.events.emit('scoreChanged', this.game.globals.score);
                        }
                        
                        // Create explosion effect
                        this.createExplosion(enemy.x, enemy.y, enemy.getTypeConfig().color);
                        
                        // Chance to spawn powerup
                        if (Phaser.Math.Between(1, 100) <= 20) {
                            const powerupTypes = ['spread', 'laser', 'rapid', 'shield', 'missile'];
                            const randomType = powerupTypes[Phaser.Math.Between(0, powerupTypes.length - 1)];
                            new Powerup(this, enemy.x, enemy.y, randomType);
                        }
                        
                        enemy.destroy();
                    }
                }
            }
        );

        // Enemy lasers hitting player
        this.physics.add.collider(
            this.player,
            this.enemyLasers,
            (player, laser) => {
                if (player && typeof player.damage === 'function') {
                    player.damage(10);
                    laser.destroy();
                }
            },
            null,
            this
        );

        // Player colliding with enemies
        this.physics.add.collider(
            this.player,
            this.enemies,
            (player, enemy) => {
                if (player && typeof player.damage === 'function') {
                    player.damage(20);
                }
                if (enemy && typeof enemy.damage === 'function') {
                    enemy.damage(1);
                }
            },
            null,
            this
        );

        // Player collecting powerups
        this.physics.add.overlap(
            this.player,
            this.powerups,
            (player, powerup) => {
                if (powerup && typeof powerup.applyEffect === 'function') {
                    powerup.applyEffect(player);
                }
            },
            null,
            this
        );
    }

    createExplosion(x, y, color) {
        // Create particle explosion
        const particles = this.add.particles(x, y, 'laser', {
            speed: { min: -100, max: 100 },
            scale: { start: 0.5, end: 0 },
            alpha: { start: 1, end: 0 },
            tint: color,
            blendMode: Phaser.BlendModes.ADD,
            quantity: 20,
            lifespan: 500
        });

        // Add flash effect
        const flash = this.add.circle(x, y, 30, color, 0.8)
            .setBlendMode(Phaser.BlendModes.ADD);

        // Animate flash
        this.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 2,
            duration: 200,
            onComplete: () => flash.destroy()
        });

        // Auto-destroy particles
        this.time.delayedCall(500, () => {
            particles.destroy();
        });
    }

    startEnemySpawner() {
        // Basic enemies
        this.time.addEvent({
            delay: 2000,
            callback: () => {
                const x = Phaser.Math.Between(50, 750);
                new Enemy(this, x, -50, 'basic');
            },
            loop: true
        });

        // Hunters
        this.time.addEvent({
            delay: 5000,
            callback: () => {
                const x = Phaser.Math.Between(50, 750);
                new Enemy(this, x, -50, 'hunter');
            },
            loop: true
        });

        // Drones
        this.time.addEvent({
            delay: 7000,
            callback: () => {
                const x = Phaser.Math.Between(50, 750);
                new Enemy(this, x, -50, 'drone');
            },
            loop: true
        });

        // Boss every minute
        this.time.addEvent({
            delay: 60000,
            callback: () => {
                new Enemy(this, 400, -100, 'boss');
            },
            loop: true
        });
    }

    update() {
        // Update parallax background
        if (this.bgLayers) {
            this.bgLayers.forEach(layer => {
                layer.stars.getChildren().forEach(star => {
                    star.y += layer.speed;
                    if (star.y > 600) {
                        star.y = 0;
                        star.x = Phaser.Math.Between(0, 800);
                    }
                });
            });
        }

        // Update player if active
        if (this.player && this.player.active) {
            this.player.update(
                this.input.keyboard.createCursorKeys(),
                this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
            );
        }

        // Update enemies
        this.enemies.getChildren().forEach(enemy => {
            enemy.update();
        });

        // Clean up off-screen projectiles
        this.playerLasers.getChildren().forEach(laser => {
            if (laser.y < -50) laser.destroy();
        });
        this.enemyLasers.getChildren().forEach(laser => {
            if (laser.y > 650) laser.destroy();
        });
    }

    gameOver() {
        if (!this.scene.isActive()) return;
        
        // Pause game mechanics
        this.physics.pause();
        
        // Stop HUD scene
        this.scene.stop('HUDScene');

        // Create dark overlay
        const overlay = this.add.rectangle(0, 0, 800, 600, 0x000000, 0.8)
            .setOrigin(0)
            .setDepth(100);

        // Create game over text with glow
        const gameOverText = this.add.text(400, 200, 'GAME OVER', {
            fontSize: '64px',
            fontFamily: 'Arial',
            fontWeight: 'bold',
            fill: '#ff0000'
        })
        .setOrigin(0.5)
        .setDepth(101);

        // Add glow effect
        gameOverText.setStroke('#880000', 16);
        gameOverText.setShadow(2, 2, '#000000', 2, true, true);

        // Add score
        const finalScore = this.add.text(400, 300, `Final Score: ${this.game.globals.score}`, {
            fontSize: '32px',
            fontFamily: 'Arial',
            fill: '#ffffff'
        })
        .setOrigin(0.5)
        .setDepth(101);

        // Add restart button
        const restartButton = this.add.rectangle(400, 400, 200, 50, 0x00ff00, 0.8)
            .setInteractive()
            .setDepth(101);

        const buttonText = this.add.text(400, 400, 'RESTART', {
            fontSize: '24px',
            fontFamily: 'Arial',
            fill: '#ffffff'
        })
        .setOrigin(0.5)
        .setDepth(102);

        // Button effects
        restartButton.on('pointerover', () => {
            restartButton.setFillStyle(0x00aa00);
            this.game.canvas.style.cursor = 'pointer';
        });

        restartButton.on('pointerout', () => {
            restartButton.setFillStyle(0x00ff00, 0.8);
            this.game.canvas.style.cursor = 'default';
        });

        // Restart game on click - properly reset everything
        restartButton.on('pointerdown', () => {
            this.game.globals.score = 0;
            this.scene.start('MainMenuScene');
            this.game.canvas.style.cursor = 'default';
        });

        // Also allow space to restart
        this.input.keyboard.once('keydown-SPACE', () => {
            this.game.globals.score = 0;
            this.scene.start('MainMenuScene');
        });
    }
} 