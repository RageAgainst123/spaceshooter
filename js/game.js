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

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Create game instance
        const game = new Phaser.Game(config);

        // Add global game state
        game.globals = {
            gameSettings: {
                playerSpeed: 300,
                playerFireRate: 250
            },
            score: 0,
            level: 1
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
}); 