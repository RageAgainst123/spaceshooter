class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene' });
    }

    preload() {
        // Only preload the assets you actually have
        // We can add more assets here when you add them
    }

    create() {
        // Once everything is loaded, start the game
        this.scene.start('MainMenuScene');
    }
} 