export class UIManager {
    constructor() {
        this.container = document.querySelector('.container');
        this.dropZone = document.getElementById("drop-zone");
        this.fileInput = document.getElementById("file-input");
        this.audioPlayer = document.getElementById("audio-player");
        this.playerContainer = document.getElementById("player-container");
        this.fileName = document.getElementById("file-name");
        this.canvas = document.getElementById("visualizer");
        this.exitFullscreenBtn = document.querySelector('.exit-fullscreen');
        this.enterFullscreenBtn = document.querySelector('.enter-fullscreen');
        this.micButton = document.getElementById('mic-button');
        
        this.isFullscreen = false;
        this.visualizer = null;
        this.init();
    }

    init() {
        // Handle file input click
        this.dropZone.addEventListener("click", () => {
            this.fileInput.click();
        });

        // Handle fullscreen buttons
        this.enterFullscreenBtn.addEventListener('click', () => {
            if (!this.isFullscreen) {
                this.toggleFullscreen();
            }
        });

        this.exitFullscreenBtn.addEventListener('click', () => {
            if (this.isFullscreen) {
                this.toggleFullscreen();
            }
        });

        // Handle audio player events
        this.audioPlayer.addEventListener('play', () => {
            if (!this.isFullscreen) {
                this.toggleFullscreen();
            }
        });

        this.audioPlayer.addEventListener('ended', () => {
            if (this.isFullscreen) {
                this.toggleFullscreen();
            }
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            if (this.isFullscreen) {
                this.updateCanvasSize();
            }
        });
    }

    setVisualizer(visualizer) {
        this.visualizer = visualizer;
    }

    toggleFullscreen() {
        this.isFullscreen = !this.isFullscreen;
        this.container.classList.toggle('fullscreen');
        this.dropZone.classList.toggle('hidden');
        this.updateCanvasSize();
    }

    updateCanvasSize() {
        if (this.isFullscreen) {
            // En mode plein écran, utiliser les dimensions de la fenêtre
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight - 100; // Réduire l'espace pour les contrôles
            
            // Mettre à jour les paramètres du visualiseur pour le mode plein écran
            if (this.visualizer) {
                this.visualizer.updateViewport(this.canvas.width, this.canvas.height);
                this.visualizer.setGridSize(Math.max(this.canvas.width / this.canvas.height, 1.0) * 4.0);
            }
            return { width: this.canvas.width, height: this.canvas.height };
        }
        
        // En mode normal, revenir aux dimensions d'origine
        this.canvas.width = 560;
        this.canvas.height = 200;
        
        // Réinitialiser les paramètres du visualiseur
        if (this.visualizer) {
            this.visualizer.updateViewport(this.canvas.width, this.canvas.height);
            this.visualizer.setGridSize(4.0);
        }
        return { width: this.canvas.width, height: this.canvas.height };
    }

    showAudioPlayer(fileName) {
        this.fileName.textContent = fileName;
        this.playerContainer.classList.remove("hidden");
    }

    hideAudioPlayer() {
        this.playerContainer.classList.add("hidden");
    }

    setMicrophoneActive(isActive) {
        if (isActive) {
            this.micButton.classList.add('active');
            this.playerContainer.classList.remove('hidden');
            this.fileName.textContent = 'Microphone';
            this.audioPlayer.style.display = 'none';
            if (!this.isFullscreen) {
                this.toggleFullscreen();
            }
        } else {
            this.micButton.classList.remove('active');
            this.audioPlayer.style.display = '';
            if (this.isFullscreen) {
                this.toggleFullscreen();
            }
        }
    }
} 