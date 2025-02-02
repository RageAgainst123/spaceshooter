class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        console.log('BootScene: preload started');
        
        // Add loading progress tracking
        this.load.on('progress', (value) => {
            console.log('Loading progress:', value);
        });

        this.load.on('complete', () => {
            console.log('All assets loaded');
        });

        this.load.on('loaderror', (fileObj) => {
            console.error('Load error:', fileObj);
        });

        try {
            console.log('Loading assets...');
            // Only load the assets we actually have
            this.load.image('ship', 'assets/ship.png');
            this.load.audio('titleMusic', 'assets/titel.mp3');
            this.load.audio('powerup', 'assets/powerup.mp3');
            
            // Create the rest using graphics in createPlaceholderGraphics()
        } catch (error) {
            console.error('Asset loading error:', error);
        }
    }

    create() {
        console.log('BootScene: create started');
        
        try {
            this.createPlaceholderGraphics();
            
            // Verify textures were created
            const textureKeys = ['enemy', 'laser', 'powerup', 'background-far', 'background-mid', 'background-near', 'background-bright'];
            textureKeys.forEach(key => {
                if (this.textures.exists(key)) {
                    console.log(`Texture '${key}' created successfully`);
                } else {
                    console.error(`Texture '${key}' not found!`);
                }
            });

            console.log('BootScene: transitioning to MainMenuScene');
            this.scene.start('MainMenuScene');
        } catch (error) {
            console.error('BootScene create error:', error);
        }
    }

    createPlaceholderGraphics() {
        try {
            // Create enemy graphic (red triangle)
            const enemyGraphics = this.add.graphics();
            enemyGraphics.lineStyle(2, 0xff0000);
            enemyGraphics.fillStyle(0xff0000);
            enemyGraphics.beginPath();
            enemyGraphics.moveTo(0, 0);
            enemyGraphics.lineTo(20, 20);
            enemyGraphics.lineTo(-20, 20);
            enemyGraphics.closePath();
            enemyGraphics.fill();
            enemyGraphics.generateTexture('enemy', 40, 40);
            enemyGraphics.destroy();

            // Create laser graphic (blue rectangle)
            const laserGraphics = this.add.graphics();
            laserGraphics.fillStyle(0x00ff00);
            laserGraphics.fillRect(-2, -8, 4, 16);
            laserGraphics.generateTexture('laser', 4, 16);
            laserGraphics.destroy();

            // Create powerup graphic (yellow star)
            const powerupGraphics = this.add.graphics();
            powerupGraphics.lineStyle(2, 0xffff00);
            powerupGraphics.fillStyle(0xffff00);
            this.drawStar(powerupGraphics, 15, 15, 5, 15, 7);
            powerupGraphics.generateTexture('powerup', 30, 30);
            powerupGraphics.destroy();

            // Create multiple background layers
            const createStarLayer = (graphics, starCount, size, alpha) => {
                graphics.clear();
                // Make background pure black
                graphics.fillStyle(0x000000);
                graphics.fillRect(0, 0, 800, 600);
                
                // Add stars with different colors for variety
                const starColors = [0xffffff, 0xccccff, 0xaaaaff];
                
                for (let i = 0; i < starCount; i++) {
                    const x = Math.random() * 800;
                    const y = Math.random() * 600;
                    const color = starColors[Math.floor(Math.random() * starColors.length)];
                    graphics.fillStyle(color, alpha);
                    graphics.fillCircle(x, y, size);
                }
            };

            // Far background (tiny stars, more of them)
            const bgFar = this.add.graphics();
            createStarLayer(bgFar, 300, 1, 0.3);
            bgFar.generateTexture('background-far', 800, 600);
            bgFar.destroy();

            // Mid background (medium stars)
            const bgMid = this.add.graphics();
            createStarLayer(bgMid, 150, 1.5, 0.5);
            bgMid.generateTexture('background-mid', 800, 600);
            bgMid.destroy();

            // Near background (larger stars)
            const bgNear = this.add.graphics();
            createStarLayer(bgNear, 75, 2, 0.8);
            bgNear.generateTexture('background-near', 800, 600);
            bgNear.destroy();

            // Bright stars with glow effect
            const brightStars = this.add.graphics();
            brightStars.clear();
            brightStars.fillStyle(0x000000);
            brightStars.fillRect(0, 0, 800, 600);

            // Add glowing stars
            for (let i = 0; i < 15; i++) {
                const x = Math.random() * 800;
                const y = Math.random() * 600;
                
                // Inner bright core
                brightStars.fillStyle(0xffffff, 1);
                brightStars.fillCircle(x, y, 2);
                
                // Outer glow
                for (let radius = 3; radius <= 5; radius++) {
                    brightStars.fillStyle(0xffffff, 0.1);
                    brightStars.fillCircle(x, y, radius);
                }
            }
            brightStars.generateTexture('background-bright', 800, 600);
            brightStars.destroy();

            // Create and set favicon with error handling
            this.createFavicon();
        } catch (error) {
            console.error('Graphics creation error:', {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
        }
    }

    createFavicon() {
        try {
            const faviconGraphics = this.add.graphics();
            faviconGraphics.fillStyle(0x000033);
            faviconGraphics.fillRect(0, 0, 32, 32);
            faviconGraphics.lineStyle(2, 0x00ff00);
            faviconGraphics.fillStyle(0x00ff00);
            this.drawStar(faviconGraphics, 16, 16, 5, 12, 6);
            faviconGraphics.generateTexture('faviconTexture', 32, 32);

            // Convert the texture to a data URL and set it as favicon
            const gameCanvas = this.game.canvas;
            const faviconCanvas = document.createElement('canvas');
            faviconCanvas.width = 32;
            faviconCanvas.height = 32;
            const ctx = faviconCanvas.getContext('2d');
            
            if (!ctx) {
                throw new Error('Failed to get canvas context');
            }

            ctx.drawImage(gameCanvas, 0, 0, 32, 32);

            // Remove existing favicon if present
            const existingFavicon = document.querySelector('link[rel="shortcut icon"]');
            if (existingFavicon) {
                existingFavicon.remove();
            }

            const link = document.createElement('link');
            link.type = 'image/x-icon';
            link.rel = 'shortcut icon';
            link.href = faviconCanvas.toDataURL();
            document.getElementsByTagName('head')[0].appendChild(link);

            console.log('Favicon created successfully:', {
                timestamp: new Date().toISOString(),
                dimensions: '32x32',
                type: 'dynamic'
            });

            faviconGraphics.destroy();
        } catch (error) {
            console.error('Favicon creation error:', {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            
            // Fallback to static favicon
            this.setStaticFavicon();
        }
    }

    setStaticFavicon() {
        try {
            const link = document.createElement('link');
            link.type = 'image/x-icon';
            link.rel = 'shortcut icon';
            link.href = 'assets/favicon.ico';
            document.getElementsByTagName('head')[0].appendChild(link);
            
            console.log('Static favicon set:', {
                timestamp: new Date().toISOString(),
                path: 'assets/favicon.ico'
            });
        } catch (error) {
            console.error('Static favicon error:', {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Helper function to draw a star shape
    drawStar(graphics, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        let step = Math.PI / spikes;

        graphics.beginPath();
        graphics.moveTo(cx, cy - outerRadius);

        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            graphics.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            graphics.lineTo(x, y);
            rot += step;
        }

        graphics.lineTo(cx, cy - outerRadius);
        graphics.closePath();
        graphics.fill();
    }
} 