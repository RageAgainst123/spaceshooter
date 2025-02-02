class MainMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainMenuScene' });
    }

    create() {
        // Stop any existing music first
        this.game.sound.stopAll();
        
        // Create background
        this.createParallaxBackground();
        
        // Start background music
        this.audioManager = new AudioManager(this);
        this.audioManager.playMusic();
        
        console.log('MainMenuScene: create started');

        // Create title with glow effect
        const titleText = this.add.text(400, -100, 'SPACE SHOOTER', {
            fontSize: '72px',
            fontStyle: 'bold',
            fill: '#fff'
        }).setOrigin(0.5);

        // Add glow effect
        titleText.setStroke('#0f0', 16);
        titleText.setShadow(0, 0, '#0f0', 8, true, true);

        // Animate title entrance
        this.tweens.add({
            targets: titleText,
            y: 150,
            duration: 2000,
            ease: 'Bounce.easeOut',
            onComplete: () => {
                // Add floating animation
                this.tweens.add({
                    targets: titleText,
                    y: '+=20',
                    duration: 2000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        });

        // Add animated ship
        const ship = this.add.sprite(400, 700, 'ship');
        ship.setScale(2);

        // Ship entrance animation
        this.tweens.add({
            targets: ship,
            y: 400,
            duration: 2000,
            ease: 'Back.easeOut',
            delay: 500,
            onComplete: () => {
                // Add hover animation
                this.tweens.add({
                    targets: ship,
                    y: '+=30',
                    duration: 2000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        });

        // Add engine particles
        const particles = this.add.particles(0, 0, 'laser', {
            speed: { min: 200, max: 400 },
            angle: { min: 85, max: 95 },
            scale: { start: 0.6, end: 0 },
            blendMode: 'ADD',
            lifespan: 1000,
            follow: ship,
            followOffset: { x: 0, y: 20 },
            tint: [0x00ffff, 0x00ff00, 0x0000ff],
            quantity: 2,
            emitting: true
        });

        // Add start text with effects
        const startText = this.add.text(400, 550, 'Press SPACE to start', {
            fontSize: '32px',
            fill: '#0f0'
        }).setOrigin(0.5);

        // Pulsing effect
        this.tweens.add({
            targets: startText,
            alpha: 0.2,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Add version text
        this.add.text(10, 570, 'v1.0.0', { 
            fontSize: '16px', 
            fill: '#666' 
        });

        // Add high score
        const highScore = localStorage.getItem('highScore') || 0;
        this.add.text(400, 500, `High Score: ${highScore}`, {
            fontSize: '24px',
            fill: '#fff'
        }).setOrigin(0.5);

        // Setup input handlers
        this.setupInputHandlers();
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

    setupInputHandlers() {
        // Space key to start
        this.input.keyboard.once('keydown-SPACE', () => {
            this.startGame();
        });

        // Mobile support
        if (this.sys.game.device.input.touch) {
            this.input.once('pointerdown', () => {
                this.startGame();
            });
        }
    }

    startGame() {
        console.log('Starting game transition...');
        
        // Flash effect
        this.cameras.main.flash(1000, 0, 255, 0);
        
        // Screen shake
        this.cameras.main.shake(500, 0.01);

        // Start transition with delay
        this.time.delayedCall(500, () => {
            console.log('Launching game scenes...');
            try {
                this.scene.start('GameScene');
                this.scene.launch('HUDScene');
            } catch (error) {
                console.error('Error starting game:', error);
            }
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
    }
} 