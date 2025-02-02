class AudioManager {
    constructor(scene) {
        this.scene = scene;
        this.music = null;
    }

    playMusic() {
        if (!this.music) {
            this.music = this.scene.sound.add('titleMusic', {
                loop: true,
                volume: 0.5
            });
            this.music.play();
        }
    }

    stopMusic() {
        if (this.music) {
            this.music.stop();
            this.music = null;
        }
    }
} 