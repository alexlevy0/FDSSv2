export class AudioManager {
    constructor(visualizer, uiManager) {
        this.visualizer = visualizer;
        this.uiManager = uiManager;
        this.audioPlayer = uiManager.audioPlayer;
        this.micStream = null;
        this.isMicActive = false;
    }

    async handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];

            // If microphone is active, deactivate it
            if (this.isMicActive) {
                await this.toggleMicrophone();
            }

            // Check if the file is an audio file
            if (file.type.startsWith("audio/")) {
                const url = URL.createObjectURL(file);
                this.audioPlayer.src = url;
                this.uiManager.showAudioPlayer(file.name);

                // Close existing audio context if necessary
                await this.visualizer?.audioContext?.close();

                // Initialize or reset the visualizer
                if (!this.visualizer) {
                    this.visualizer = new AudioVisualizer(this.uiManager.canvas);
                }
                
                this.visualizer.setupAudioContext(this.audioPlayer);
                this.visualizer.draw();

                this.audioPlayer.play();
            } else {
                alert("Please select a valid audio file.");
            }
        }
    }

    async toggleMicrophone() {
        console.log('Attempting to toggle microphone. Current state:', this.isMicActive);
        
        if (!this.isMicActive) {
            try {
                console.log('Requesting microphone access...');
                
                // Check if browser supports MediaDevices API
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    throw new Error('Your browser does not support microphone access');
                }
                
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                this.micStream = stream;
                
                console.log('Microphone access granted, initializing visualizer...');
                
                // Initialize visualizer if not already done
                if (!this.visualizer) {
                    console.log('Creating new visualizer...');
                    this.visualizer = new AudioVisualizer(this.uiManager.canvas);
                }
                
                // Reset audio context for microphone
                if (this.visualizer.audioContext) {
                    console.log('Closing old audio context...');
                    await this.visualizer.audioContext.close();
                }
                
                console.log('Setting up audio context for microphone...');
                this.visualizer.setupAudioContext(null);
                
                // Connect microphone to analyzer
                console.log('Connecting microphone to analyzer...');
                const source = this.visualizer.audioContext.createMediaStreamSource(stream);
                source.connect(this.visualizer.analyser);
                
                console.log('Starting render...');
                this.visualizer.draw();
                
                // Update UI
                this.uiManager.setMicrophoneActive(true);
                
                this.isMicActive = true;
                console.log('Microphone successfully activated');
                
            } catch (err) {
                console.error('Error accessing microphone:', err);
                
                let message = 'An error occurred while accessing the microphone.';
                
                if (err.name === 'NotAllowedError') {
                    message = 'Microphone access was denied. To allow access:\n\n' +
                        '1. Click the 🔒 icon in the address bar\n' +
                        '2. Select "Allow" for the microphone\n' +
                        '3. Refresh the page';
                } else if (err.name === 'NotFoundError') {
                    message = 'No microphone was detected on your device.';
                } else if (err.name === 'NotReadableError') {
                    message = 'The microphone might be in use by another application.';
                }
                
                alert(message);
            }
        } else {
            console.log('Deactivating microphone...');
            // Stop microphone
            if (this.micStream) {
                for (const track of this.micStream.getTracks()) {
                    track.stop();
                }
                this.micStream = null;
            }
            
            // Reset UI
            this.uiManager.setMicrophoneActive(false);
            
            this.isMicActive = false;
            console.log('Microphone deactivated');
        }
    }
} 