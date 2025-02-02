class HUDScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HUDScene' });
    }

    create() {
        // Set HUD scene to be on top
        this.scene.bringToTop();

        // Create top bar with gradient
        const topBar = this.add.graphics();
        topBar.fillGradientStyle(0x000000, 0x000000, 0x000033, 0x000033, 0.9);
        topBar.fillRect(0, 0, 800, 50);
        topBar.setScrollFactor(0);

        // Add decorative lines
        const decorLine = this.add.graphics();
        decorLine.lineStyle(2, 0x00ff00, 0.5);
        decorLine.lineBetween(0, 48, 800, 48);
        decorLine.lineStyle(1, 0x00ff00, 0.3);
        decorLine.lineBetween(0, 46, 800, 46);
        decorLine.setScrollFactor(0);

        // Health section with tech style
        this.createHealthBar(10, 10);
        
        // Score section with LED style
        this.createScoreDisplay(300, 8);
        
        // Level section with cyber style
        this.createLevelDisplay(520, 8);
        
        // Powerup section with hologram style
        this.createPowerupDisplay(650, 8);

        // Add event listeners
        const gameScene = this.scene.get('GameScene');
        gameScene.events.on('playerHealthChanged', this.updateHealth, this);
        gameScene.events.on('scoreChanged', this.updateScore, this);
        gameScene.events.on('powerupChanged', this.updatePowerup, this);
        gameScene.events.on('levelChanged', this.updateLevel, this);
    }

    createHealthBar(x, y) {
        // Health container with tech border
        const container = this.add.graphics();
        container.lineStyle(1, 0x00ff00);
        container.strokeRect(x, y, 204, 30);
        container.setScrollFactor(0);

        // Health background
        this.healthBg = this.add.rectangle(x + 2, y + 2, 200, 26, 0x000000)
            .setOrigin(0)
            .setScrollFactor(0);

        // Health bar with gradient
        this.healthBar = this.add.graphics()
            .setScrollFactor(0);
        
        // Health text with tech font
        this.healthText = this.add.text(x + 10, y + 5, 'HULL', {
            fontSize: '14px',
            fontFamily: 'Courier',
            fill: '#00ff00'
        }).setScrollFactor(0);

        this.updateHealth(100); // Initial health
    }

    createScoreDisplay(x, y) {
        // Score background with tech frame
        const scoreBg = this.add.graphics();
        scoreBg.lineStyle(1, 0x00ff00);
        scoreBg.strokeRoundedRect(x, y, 180, 35, 5);
        scoreBg.setScrollFactor(0);

        // Score label with cyber style
        this.add.text(x + 10, y + 5, 'SCORE', {
            fontSize: '14px',
            fontFamily: 'Courier',
            fill: '#00ff00'
        }).setScrollFactor(0);

        // Score value with LED style
        this.scoreText = this.add.text(x + 90, y + 3, '000000', {
            fontSize: '24px',
            fontFamily: 'Courier',
            fill: '#ffffff',
            letterSpacing: 4
        }).setScrollFactor(0);
    }

    createLevelDisplay(x, y) {
        // Level container with glowing border
        const levelContainer = this.add.rectangle(x, y, 100, 35, 0x000000, 0.5)
            .setOrigin(0)
            .setScrollFactor(0)
            .setStrokeStyle(1, 0x00ff00);

        // Level label
        this.add.text(x + 10, y + 3, 'LEVEL', {
            fontSize: '14px',
            fill: '#00ff00',
            fontFamily: 'Arial'
        }).setScrollFactor(0);

        // Level value
        this.levelText = this.add.text(x + 50, y + 3, '1', {
            fontSize: '24px',
            fill: '#fff',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setScrollFactor(0);
    }

    createPowerupDisplay(x, y) {
        // Powerup container
        this.powerupContainer = this.add.container(x, y).setScrollFactor(0);

        // Powerup background with tech style
        this.powerupBg = this.add.rectangle(0, 0, 130, 35, 0x000000, 0.5)
            .setOrigin(0)
            .setStrokeStyle(1, 0x333333);

        // Powerup icon with glow effect
        this.powerupIcon = this.add.sprite(25, 17, 'powerup')
            .setScale(0.8)
            .setVisible(false);

        // Powerup text
        this.powerupText = this.add.text(45, 8, '', {
            fontSize: '14px',
            fill: '#fff',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        });

        // Add everything to container
        this.powerupContainer.add([this.powerupBg, this.powerupIcon, this.powerupText]);
    }

    updateHealth(health) {
        this.healthBar.clear();
        const width = Math.max((health / 100) * 200, 0);
        
        // Create gradient based on health
        const color = health > 60 ? 0x00ff00 : health > 30 ? 0xffff00 : 0xff0000;
        const alpha = 1;
        
        this.healthBar.fillStyle(color, alpha);
        this.healthBar.fillRect(12, 12, width, 26);
        
        // Add tech lines
        this.healthBar.lineStyle(1, color, 0.5);
        for (let i = 0; i < width; i += 10) {
            this.healthBar.lineBetween(12 + i, 12, 12 + i, 38);
        }
    }

    updateScore(score) {
        this.scoreText.setText(score.toString().padStart(6, '0'));
    }

    updateLevel(level) {
        this.levelText.setText(level.toString());
    }

    updatePowerup(type) {
        if (type) {
            this.powerupIcon.setVisible(true);
            this.powerupText.setText(type.toUpperCase());
            
            const colors = {
                spread: 0xff0000,
                laser: 0x00ffff,
                rapid: 0xffff00,
                shield: 0x0000ff,
                missile: 0xff00ff
            };
            
            this.powerupIcon.setTint(colors[type] || 0xffffff);
            this.powerupBg.setStrokeStyle(2, colors[type] || 0xffffff);
        } else {
            this.powerupIcon.setVisible(false);
            this.powerupText.setText('');
            this.powerupBg.setStrokeStyle(1, 0x333333);
        }
    }
} 