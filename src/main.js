import "./style.css"
import { AudioVisualizer } from "./visualizer.js"

document.addEventListener("DOMContentLoaded", () => {
	const container = document.querySelector('.container');
	const dropZone = document.getElementById("drop-zone")
	const fileInput = document.getElementById("file-input")
	const audioPlayer = document.getElementById("audio-player")
	const playerContainer = document.getElementById("player-container")
	const fileName = document.getElementById("file-name")
	const canvas = document.getElementById("visualizer")
	const exitFullscreenBtn = document.querySelector('.exit-fullscreen');
	const enterFullscreenBtn = document.querySelector('.enter-fullscreen');
	const micButton = document.getElementById('mic-button');

	let visualizer = null
	let isFullscreen = false;
	let micStream = null;
	let isMicActive = false;

	// Empêcher le comportement par défaut du navigateur pour le drag & drop
	const preventDefaultEvents = ["dragenter", "dragover", "dragleave", "drop"];
	for (const eventName of preventDefaultEvents) {
		dropZone.addEventListener(eventName, preventDefaults, false);
		document.body.addEventListener(eventName, preventDefaults, false);
	}

	function preventDefaults(e) {
		e.preventDefault();
		e.stopPropagation();
	}

	// Ajouter des effets visuels pendant le drag
	const highlightEvents = ["dragenter", "dragover"];
	for (const eventName of highlightEvents) {
		dropZone.addEventListener(eventName, highlight, false);
	}
	
	const unhighlightEvents = ["dragleave", "drop"];
	for (const eventName of unhighlightEvents) {
		dropZone.addEventListener(eventName, unhighlight, false);
	}

	function highlight(e) {
		dropZone.classList.add("dragover")
	}

	function unhighlight(e) {
		dropZone.classList.remove("dragover")
	}

	// Gérer le drop
	dropZone.addEventListener("drop", handleDrop, false)

	function handleDrop(e) {
		const dt = e.dataTransfer
		const files = dt.files
		handleFiles(files)
	}

	// Gérer le clic sur la zone de drop
	dropZone.addEventListener("click", () => {
		fileInput.click()
	})

	// Gérer la sélection de fichier via l'input
	fileInput.addEventListener("change", (e) => {
		handleFiles(e.target.files)
	})

	function updateCanvasSize() {
		if (isFullscreen) {
			// En mode plein écran, utiliser les dimensions de la fenêtre
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight - 200; // Espace pour les contrôles
			
			// Mettre à jour les paramètres du visualiseur pour le mode plein écran
			if (visualizer) {
				visualizer.updateViewport(canvas.width, canvas.height);
				visualizer.setGridSize(Math.max(canvas.width / canvas.height, 1.0) * 4.0); // Ajuster la taille de la grille en fonction du ratio
			}
		} else {
			// En mode normal, revenir aux dimensions d'origine
			canvas.width = 560;
			canvas.height = 200;
			
			// Réinitialiser les paramètres du visualiseur
			if (visualizer) {
				visualizer.updateViewport(canvas.width, canvas.height);
				visualizer.setGridSize(4.0);
			}
		}
	}

	// Gérer le mode plein écran
	function toggleFullscreen() {
		isFullscreen = !isFullscreen;
		container.classList.toggle('fullscreen');
		dropZone.classList.toggle('hidden');
		
		updateCanvasSize();
	}

	// Gérer le clic sur le bouton d'entrée en mode plein écran
	enterFullscreenBtn.addEventListener('click', () => {
		if (!isFullscreen) {
			toggleFullscreen();
		}
	});

	// Gérer le clic sur le bouton de sortie du mode plein écran
	exitFullscreenBtn.addEventListener('click', () => {
		if (isFullscreen) {
			toggleFullscreen();
		}
	});

	// Gérer le début de la lecture
	audioPlayer.addEventListener('play', () => {
		if (!isFullscreen) {
			toggleFullscreen();
		}
	});

	// Gérer la fin de la lecture
	audioPlayer.addEventListener('ended', () => {
		if (isFullscreen) {
			toggleFullscreen();
		}
	});

	// Gérer le redimensionnement de la fenêtre
	window.addEventListener('resize', () => {
		if (isFullscreen) {
			updateCanvasSize();
		}
	});

	// Gérer le microphone
	async function toggleMicrophone() {
		console.log('Tentative de toggle du microphone. État actuel:', isMicActive);
		
		if (!isMicActive) {
			try {
				console.log('Demande d\'accès au microphone...');
				
				// Vérifier si le navigateur supporte l'API MediaDevices
				if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
					throw new Error('Votre navigateur ne supporte pas l\'accès au microphone');
				}
				
				const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
				micStream = stream;
				
				console.log('Accès au microphone accordé, initialisation du visualiseur...');
				
				// Initialiser le visualiseur si ce n'est pas déjà fait
				if (!visualizer) {
					console.log('Création d\'un nouveau visualiseur...');
					visualizer = new AudioVisualizer(canvas);
				}
				
				// Réinitialiser le contexte audio pour le microphone
				if (visualizer.audioContext) {
					console.log('Fermeture de l\'ancien contexte audio...');
					await visualizer.audioContext.close();
				}
				
				console.log('Configuration du contexte audio pour le microphone...');
				visualizer.setupAudioContext(null);
				
				// Connecter le micro à l'analyseur
				console.log('Connexion du microphone à l\'analyseur...');
				const source = visualizer.audioContext.createMediaStreamSource(stream);
				source.connect(visualizer.analyser);
				
				console.log('Démarrage du rendu...');
				visualizer.draw();
				
				// Mettre à jour l'interface
				micButton.classList.add('active');
				playerContainer.classList.remove('hidden');
				fileName.textContent = 'Microphone';
				audioPlayer.style.display = 'none';
				
				// Passer en plein écran si ce n'est pas déjà le cas
				if (!isFullscreen) {
					toggleFullscreen();
				}
				
				isMicActive = true;
				console.log('Microphone activé avec succès');
				
			} catch (err) {
				console.error('Erreur lors de l\'accès au microphone:', err);
				
				let message = 'Une erreur est survenue lors de l\'accès au microphone.';
				
				if (err.name === 'NotAllowedError') {
					message = 'L\'accès au microphone a été refusé. Pour autoriser l\'accès :\n\n' +
						'1. Cliquez sur l\'icône 🔒 dans la barre d\'adresse\n' +
						'2. Sélectionnez "Autoriser" pour le microphone\n' +
						'3. Rafraîchissez la page';
				} else if (err.name === 'NotFoundError') {
					message = 'Aucun microphone n\'a été détecté sur votre appareil.';
				} else if (err.name === 'NotReadableError') {
					message = 'Le microphone est peut-être utilisé par une autre application.';
				}
				
				alert(message);
			}
		} else {
			console.log('Désactivation du microphone...');
			// Arrêter le microphone
			if (micStream) {
				for (const track of micStream.getTracks()) {
					track.stop();
				}
				micStream = null;
			}
			
			// Réinitialiser l'interface
			micButton.classList.remove('active');
			audioPlayer.style.display = '';
			
			if (isFullscreen) {
				toggleFullscreen();
			}
			
			isMicActive = false;
			console.log('Microphone désactivé');
		}
	}

	// Gérer le clic sur le bouton du microphone
	micButton.addEventListener('click', toggleMicrophone);

	function handleFiles(files) {
		if (files.length > 0) {
			const file = files[0]

			// Si le micro est actif, le désactiver
			if (isMicActive) {
				toggleMicrophone();
			}

			// Vérifier si le fichier est un fichier audio
			if (file.type.startsWith("audio/")) {
				const url = URL.createObjectURL(file)
				audioPlayer.src = url
				fileName.textContent = file.name
				playerContainer.classList.remove("hidden")

				// Initialiser le visualiseur si ce n'est pas déjà fait
				if (!visualizer) {
					visualizer = new AudioVisualizer(canvas)
					visualizer.setupAudioContext(audioPlayer)
					visualizer.draw()
				}

				audioPlayer.play()
			} else {
				alert("Veuillez sélectionner un fichier audio valide.")
			}
		}
	}
})
