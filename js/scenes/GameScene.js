class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        try {
            console.log('GameScene: create started');
            this.game.started = true;

            // Initialize game globals if not exists
            this.game.globals = this.game.globals || {};
            this.game.globals.gameSettings = {
                playerSpeed: 300,
                playerFireRate: 250
            };
            this.game.globals.score = 0;

            // If music doesn't exist or has stopped, restart it
            if (!this.game.globals?.music?.isPlaying) {
                this.game.globals = this.game.globals || {};
                this.game.globals.music = this.sound.add('titleMusic', { 
                    volume: 0.5,
                    loop: true
                });
                this.game.globals.music.play();
            }

            // Create background first
            this.createParallaxBackground();
            
            // Initialize groups
            this.enemies = this.add.group();
            this.playerLasers = this.physics.add.group();
            this.enemyLasers = this.physics.add.group();
            this.powerups = this.physics.add.group();

            // Create player first
            this.player = new Player(this, 400, 500);
            
            // Initialize PowerupManager after player creation
            this.powerupManager = new PowerupManager(this);
            
            // Set up keyboard controls
            this.cursors = this.input.keyboard.createCursorKeys();
            this.fireKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
            
            // Setup collisions
            this.setupCollisions();
            
            // Start enemy spawning
            this.startEnemySpawner();
            
            // Launch HUD
            this.scene.launch('HUDScene');
            
            // Add touch controls
            this.setupTouchControls();
            
            console.log('GameScene: setup complete');
        } catch (error) {
            console.error('GameScene creation error:', error);
            // Attempt to recover by restarting the menu
            this.scene.start('MainMenuScene');
        }
    }

    createParallaxBackground() {
        this.bgLayers = [];
        
        // Create three layers of stars
        for (let i = 0; i < 3; i++) {
            const stars = this.add.group();
            const count = 50 * (i + 1);
            const speed = 1 + i;
            
            for (let j = 0; j < count; j++) {
                const star = this.add.circle(
                    Phaser.Math.Between(0, 800),
                    Phaser.Math.Between(0, 600),
                    1,
                    0xffffff,
                    0.5 - (i * 0.1)
                );
                stars.add(star);
            }
            
            this.bgLayers.push({
                stars: stars,
                speed: speed
            });
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
        this.physics.add.overlap(
            this.playerLasers,
            this.enemies,
            (laser, enemy) => {
                if (!enemy.active || !laser.active) return;
                
                const powerupType = enemy.getData('powerupType');
                if (powerupType) {
                    // Get weapon info from laser properties
                    let weaponType = 'default';
                    if (laser.scale.x > 2) weaponType = 'laser beam';
                    else if (laser.tintTopLeft === 0xff0000) weaponType = 'spread shot';
                    else if (laser.tintTopLeft === 0x00ffff) weaponType = 'laser';
                    else if (laser.tintTopLeft === 0xff00ff) weaponType = 'missile';
                    else if (laser.tintTopLeft === 0xffff00) weaponType = 'rapid';

                    console.log(`[POWERUP-COLLISION] ${enemy.type} with ${powerupType} powerup destroyed by player's ${weaponType}`);
                    
                    const enemyX = enemy.x;
                    const enemyY = enemy.y;
                    
                    try {
                        this.powerupManager.createPowerup(enemyX, enemyY, powerupType);
                        console.log(`[POWERUP-SPAWN] ${powerupType} powerup dropped at (${enemyX}, ${enemyY})`);
                    } catch (error) {
                        console.error(`[POWERUP-ERROR] Failed to spawn ${powerupType} powerup:`, error);
                    }
                }
                
                const points = enemy.type === 'hunter' ? 150 : 100;
                
                // Only after powerup is created, update score and destroy objects
                this.game.globals.score += points;
                this.events.emit('scoreChanged', this.game.globals.score);
                
                laser.destroy();
                enemy.destroy();
            }
        );

        // Enemy lasers hitting player
        this.physics.add.overlap(
            this.player,
            this.enemyLasers,
            (player, enemyLaser) => {
                if (!player.active || !enemyLaser.active) return;

                let damage = 1;
                if (enemyLaser.scale.x > 2) { // Big laser
                    damage = 2;
                } else if (enemyLaser.tintTopLeft === 0xff0000) { // Spread shot
                    damage = 1;
                } else if (enemyLaser.tintTopLeft === 0x00ffff) { // Laser beam
                    damage = 2;
                } else if (enemyLaser.tintTopLeft === 0xff00ff) { // Missile
                    damage = 2;
                } else if (enemyLaser.tintTopLeft === 0xffff00) { // Rapid fire
                    damage = 1;
                }

                player.damage(damage);
                enemyLaser.destroy();
            }
        );

        // Direct collision between player and enemies
        this.physics.add.overlap(
            this.player,
            this.enemies,
            (player, enemy) => {
                if (!enemy.active || !player.active) return;
                
                if (enemy.powerupType) {
                    console.log(`[POWERUP-COLLISION] ${enemy.type} with ${enemy.powerupType} powerup destroyed by player ship collision (no powerup drop)`);
                }
                
                const points = enemy.type === 'hunter' ? 150 : 100;
                
                // Update score
                this.game.globals.score += points;
                this.events.emit('scoreChanged', this.game.globals.score);

                // NO powerup creation for collision deaths!
                
                enemy.destroy();
                player.damage(2);
            }
        );
    }

    destroyEnemy(enemy) {
        if (!enemy.active) return;
        console.log('destroyEnemy called');

        try {
            // Create explosion effect
            const explosion = this.add.particles(enemy.x, enemy.y, 'laser', {
                speed: { min: -100, max: 100 },
                scale: { start: 0.5, end: 0 },
                alpha: { start: 1, end: 0 },
                tint: enemy.getTypeConfig().color,
                blendMode: 'ADD',
                quantity: 20,
                lifespan: 500
            });

            // Update score
            this.game.globals.score += enemy.getTypeConfig().points;
            this.events.emit('scoreChanged', this.game.globals.score);

            // Try to spawn powerup BEFORE destroying the enemy
            this.powerupManager.spawnPowerup(enemy.x, enemy.y);
            console.log('Powerup spawn attempted');

            // Cleanup
            this.time.delayedCall(500, () => {
                explosion.destroy();
            });
            
            // Finally destroy the enemy
            enemy.destroy();
        } catch (error) {
            console.error('Enemy destruction error:', error);
        }
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
        // Enemy1 cluster spawner
        this.time.addEvent({
            delay: 5000,
            callback: () => {
                // Spawn cluster of 3-5 enemies
                const count = Phaser.Math.Between(3, 5);
                const startX = Phaser.Math.Between(100, 700);
                
                for (let i = 0; i < count; i++) {
                    const enemy = this.createEnemyWithPowerup(startX + (i * 50), -50, 'basic');
                    
                    // Add S-curve movement
                    this.tweens.add({
                        targets: enemy,
                        x: enemy.x + 200,
                        y: 600,
                        duration: 4000,
                        ease: 'Sine.easeInOut',
                        yoyo: false,
                        repeat: 0,
                        onUpdate: () => {
                            // Add sine wave to x position
                            enemy.x += Math.sin(enemy.y / 100) * 2;
                        }
                    });
                }
            },
            loop: true
        });

        // Enemy2 spawner (hunters)
        this.time.addEvent({
            delay: 3000,
            callback: () => {
                const x = Phaser.Math.Between(50, 750);
                const enemy = this.createEnemyWithPowerup(x, -50, 'hunter');
            },
            loop: true
        });
    }

    createEnemyWithPowerup(x, y, type) {
        return new Enemy(this, x, y, type);  // Powerup chance is handled in Enemy constructor
    }

    update() {
        if (!this.player?.active) return;

        // Handle keyboard input if not using touch controls
        const isTouchDevice = this.sys.game.device.input.touch;
        if (!isTouchDevice || !this.touchControls?.isUsingJoystick) {
            const cursors = this.cursors;
            let velocityX = 0;
            let velocityY = 0;
            const speed = this.game.globals.gameSettings.playerSpeed;

            // WASD or Arrow keys
            if (cursors.left.isDown || this.input.keyboard.addKey('A').isDown) {
                velocityX = -speed;
            } else if (cursors.right.isDown || this.input.keyboard.addKey('D').isDown) {
                velocityX = speed;
            }

            if (cursors.up.isDown || this.input.keyboard.addKey('W').isDown) {
                velocityY = -speed;
            } else if (cursors.down.isDown || this.input.keyboard.addKey('S').isDown) {
                velocityY = speed;
            }

            this.player.setVelocity(velocityX, velocityY);
        }

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

        // Update enemies
        this.enemies.getChildren().forEach(enemy => {
            enemy.update();
        });

        // Clean up off-screen lasers
        this.playerLasers.getChildren().forEach(laser => {
            if (laser.y < -50) laser.destroy();
        });

        this.enemyLasers.getChildren().forEach(laser => {
            if (laser.y > 650) laser.destroy();
        });

        // Update powerup manager
        this.powerupManager.update();
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

    setupTouchControls() {
        // Make game canvas interactable
        this.input.addPointer(3);

        // Only create touch controls if on mobile
        const isTouchDevice = this.sys.game.device.input.touch;
        if (!isTouchDevice) return;

        // Create virtual joystick for movement
        const joystickBase = this.add.circle(100, 500, 50, 0x000000, 0.5);
        const joystick = this.add.circle(100, 500, 25, 0x333333, 0.8);
        
        joystickBase.setScrollFactor(0).setDepth(100).setAlpha(0.5);
        joystick.setScrollFactor(0).setDepth(101).setAlpha(0.8);

        // Create fire button
        const fireButton = this.add.circle(700, 500, 40, 0xff0000, 0.5)
            .setScrollFactor(0)
            .setDepth(100)
            .setInteractive();

        // Create special weapon buttons
        const specialButtons = {
            shockwave: this.add.circle(600, 500, 30, 0x00ff00, 0.5),
            shield: this.add.circle(500, 500, 30, 0x0000ff, 0.5),
            special: this.add.circle(400, 500, 30, 0xff00ff, 0.5)
        };

        Object.values(specialButtons).forEach(button => {
            button.setScrollFactor(0).setDepth(100).setInteractive();
        });

        // Store controls for later reference
        this.touchControls = {
            joystickBase,
            joystick,
            fireButton,
            specialButtons
        };

        // Joystick control
        let dragStart = { x: 0, y: 0 };
        let isUsingJoystick = false;

        this.input.on('pointerdown', (pointer) => {
            if (pointer.x < 400) { // Left side of screen for movement
                isUsingJoystick = true;
                dragStart = { x: pointer.x, y: pointer.y };
                joystick.setPosition(pointer.x, pointer.y);
                joystickBase.setPosition(pointer.x, pointer.y);
            }
        });

        this.input.on('pointermove', (pointer) => {
            if (isUsingJoystick && pointer.isDown && pointer.x < 400) {
                const distance = Phaser.Math.Distance.Between(
                    dragStart.x, dragStart.y,
                    pointer.x, pointer.y
                );
                const angle = Phaser.Math.Angle.Between(
                    dragStart.x, dragStart.y,
                    pointer.x, pointer.y
                );

                const maxDistance = 50;
                const limitedDistance = Math.min(distance, maxDistance);

                joystick.setPosition(
                    dragStart.x + Math.cos(angle) * limitedDistance,
                    dragStart.y + Math.sin(angle) * limitedDistance
                );

                if (this.player && this.player.active) {
                    const speed = this.game.globals.gameSettings.playerSpeed;
                    this.player.setVelocity(
                        Math.cos(angle) * speed * (limitedDistance / maxDistance),
                        Math.sin(angle) * speed * (limitedDistance / maxDistance)
                    );
                }
            }
        });

        this.input.on('pointerup', (pointer) => {
            if (pointer.x < 400 && isUsingJoystick) {
                isUsingJoystick = false;
                joystick.setPosition(joystickBase.x, joystickBase.y);
                if (this.player && this.player.active) {
                    this.player.setVelocity(0, 0);
                }
            }
        });

        // Fire button control
        fireButton.on('pointerdown', () => {
            if (this.player && this.player.active) {
                this.player.startFiring();
            }
        });

        fireButton.on('pointerup', () => {
            if (this.player && this.player.active) {
                this.player.stopFiring();
            }
        });

        // Special weapon buttons
        specialButtons.shockwave.on('pointerdown', () => {
            if (this.player && this.player.active) {
                this.player.fireShockwave();
            }
        });

        specialButtons.shield.on('pointerdown', () => {
            if (this.player && this.player.active) {
                this.player.activateShield();
            }
        });

        specialButtons.special.on('pointerdown', () => {
            if (this.player && this.player.active) {
                this.player.fireSpecial();
            }
        });

        // Add button labels
        const buttonStyle = {
            fontSize: '16px',
            fontFamily: 'Press Start 2P',
            color: '#ffffff'
        };

        this.add.text(fireButton.x, fireButton.y + 50, 'FIRE', buttonStyle)
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(100);

        const buttonLabels = {
            'X': specialButtons.shockwave,
            'Y': specialButtons.shield,
            'C': specialButtons.special
        };

        Object.entries(buttonLabels).forEach(([label, button]) => {
            this.add.text(button.x, button.y, label, buttonStyle)
                .setOrigin(0.5)
                .setScrollFactor(0)
                .setDepth(100);
        });
    }
} 