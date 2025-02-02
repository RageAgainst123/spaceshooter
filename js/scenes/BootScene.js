class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        console.log('Loading game assets...'); // Debug log
        
        // Create loading text
        const loadingText = this.add.text(400, 300, 'Loading...', {
            fontSize: '32px',
            fill: '#fff'
        }).setOrigin(0.5);

        // Create loading bar
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(240, 270, 320, 50);

        // Loading progress events
        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0x00ff00, 1);
            progressBar.fillRect(250, 280, 300 * value, 30);
        });

        try {
            // Load images
            this.load.image('ship', 'assets/ship.png');
            this.load.image('enemy1', 'assets/enemy1.png');
            this.load.image('enemy2', 'assets/enemy2.png');

            // Load audio
            this.load.audio('titleMusic', 'assets/titel.mp3');
            this.load.audio('powerupSound', 'assets/powerup.mp3');

            // Create textures after loading completes
            this.load.on('complete', () => {
                this.createGameTextures();
                progressBar.destroy();
                progressBox.destroy();
                loadingText.destroy();
            });
        } catch (error) {
            console.error('Asset loading error:', error);
        }

        console.log('Assets loaded successfully'); // Debug log
    }

    create() {
        this.scene.start('MainMenuScene');
    }

    createGameTextures() {
        try {
            // Create laser texture - make it more laser-like
            const laser = this.add.graphics();
            laser.clear();
            laser.fillStyle(0x00ffff);
            // Make it longer and thinner for more laser-like appearance
            laser.fillRect(0, 0, 2, 20);  // thinner (2px) and longer (20px)
            laser.generateTexture('laser', 2, 20);
            laser.destroy();

            // Create powerup textures with proper dimensions
            const powerupTypes = {
                spread: 0xff0000,
                laser: 0x00ffff,
                rapid: 0xffff00,
                shield: 0x0000ff,
                missile: 0xff00ff
            };

            Object.entries(powerupTypes).forEach(([type, color]) => {
                const graphics = this.add.graphics();
                graphics.clear();
                graphics.lineStyle(2, color);
                graphics.strokeCircle(16, 16, 14);
                graphics.fillStyle(color, 0.3);
                graphics.fillCircle(16, 16, 14);
                graphics.generateTexture(`powerup_${type}`, 32, 32);
                graphics.destroy();
            });
        } catch (error) {
            console.error('Texture creation error:', error);
        }
    }
} 