class MainMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainMenuScene' });
    }

    create() {
        // Black background
        this.cameras.main.setBackgroundColor('#000000');

        // Create starfield
        this.createDynamicStarfield();

        // Play title music
        this.sound.stopAll();
        const music = this.sound.add('titleMusic', { 
            volume: 0.5,
            loop: true
        });
        music.play();
        this.game.globals = this.game.globals || {};
        this.game.globals.music = music;

        // Huge red X in background
        const bgX = this.add.text(400, 300, 'X', {
            fontSize: '800px',
            fontFamily: 'Press Start 2P',
            color: '#880000',
            align: 'center'
        }).setOrigin(0.5).setAlpha(0.1).setDepth(0);

        // Main title
        const title = this.add.text(400, -100, 'STARFORCE', {
            fontSize: '120px',
            fontFamily: 'Press Start 2P',
            color: '#4444ff',
            align: 'center',
            padding: { x: 20, y: 20 },
            stroke: '#000000',
            strokeThickness: 16,
            shadow: { blur: 25, color: '#0000ff', fill: true, offsetY: 10 }
        }).setOrigin(0.5).setDepth(2);

        // Ship enters from bottom
        const ship = this.add.sprite(400, 800, 'ship');
        ship.setScale(2);

        // Add engine particles
        const particles = this.add.particles(ship.x, ship.y + 20, 'laser', {
            speed: { min: 200, max: 400 },
            angle: { min: 85, max: 95 },
            scale: { start: 0.6, end: 0 },
            blendMode: 'ADD',
            lifespan: 1000,
            tint: 0x00ffff,
            follow: ship,
            followOffset: { y: 20 }
        });

        // Animate title and ship entrance
        this.tweens.add({
            targets: title,
            y: 150,
            duration: 2000,
            ease: 'Bounce.easeOut'
        });

        this.tweens.add({
            targets: ship,
            y: 350,
            duration: 1500,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Add hover animation
                this.tweens.add({
                    targets: ship,
                    y: '+=20',
                    duration: 2000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        });

        // Update controls text to show both keyboard and touch controls
        const controlsText = this.add.text(400, 500, 
            'CONTROLS:\n\n' +
            'KEYBOARD:\n' +
            'ARROW KEYS / WASD : MOVEMENT\n' +
            'SPACE      : FIRE\n' +
            'X          : SHOCKWAVE\n' +
            'Y          : SHIELD\n' +
            'C          : SPECIAL\n\n' +
            'TOUCH:\n' +
            'DRAG       : MOVEMENT\n' +
            'TAP RIGHT  : FIRE\n' +
            'BUTTONS    : SPECIAL WEAPONS\n\n' +
            'PRESS SPACE OR TAP TO START', {
            fontSize: '28px',
            fontFamily: 'Press Start 2P',
            color: '#ffffff',
            align: 'center',
            lineSpacing: 10
        }).setOrigin(0.5);

        // Add both keyboard and touch controls for starting game
        this.input.keyboard.once('keydown-SPACE', () => {
            this.startGame();
        });

        this.input.on('pointerdown', () => {
            if (!this.transitioning) {
                this.startGame();
            }
        });
    }

    createDynamicStarfield() {
        const starCount = 100;
        this.stars = [];

        for (let i = 0; i < starCount; i++) {
            const x = Phaser.Math.Between(0, 800);
            const y = Phaser.Math.Between(0, 600);
            const speed = Phaser.Math.FloatBetween(2, 5);
            const size = Phaser.Math.FloatBetween(1, 3);
            
            const star = this.add.circle(x, y, size, 0xffffff);
            star.speed = speed;
            this.stars.push(star);
        }

        // Update star positions
        this.events.on('update', () => {
            for (const star of this.stars) {
                star.y += star.speed;
                if (star.y > 600) {
                    star.y = 0;
                    star.x = Phaser.Math.Between(0, 800);
                }
            }
        });
    }

    startGame() {
        if (this.transitioning) return;
        this.transitioning = true;

        // Ship flies off with roll
        this.tweens.add({
            targets: this.ship,
            y: -100,
            angle: 360,
            duration: 1000,
            ease: 'Back.easeIn'
        });

        // Title flies up
        this.tweens.add({
            targets: this.title,
            y: -200,
            duration: 1000,
            ease: 'Back.easeIn'
        });

        // Screen effects
        this.cameras.main.shake(500, 0.01);
        this.cameras.main.fade(1000, 0, 0, 0);

        this.time.delayedCall(1000, () => {
            this.scene.start('GameScene');
        });
    }
} 