const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#000000',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [BootScene, MainMenuScene, GameScene, HUDScene]
};

window.onload = () => {
    try {
        const game = new Phaser.Game(config);

        // Global game settings
        game.globals = {
            playerLevel: 1,
            score: 0,
            highScore: localStorage.getItem('highScore') || 0,
            gameSettings: {
                playerSpeed: 300,
                playerFireRate: 250,
                currentWeapon: 'laser'
            }
        };

        // Add performance monitoring
        game.events.on('step', () => {
            const fps = game.loop.actualFps;
            if (fps < 50) {
                console.warn('Low FPS detected:', fps);
            }
        });

        console.log('Game initialized successfully');
    } catch (error) {
        console.error('Game initialization error:', error);
    }
}; 