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

	let visualizer = null
	let isFullscreen = false;

	// Empêcher le comportement par défaut du navigateur pour le drag & drop
	;["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
		dropZone.addEventListener(eventName, preventDefaults, false)
		document.body.addEventListener(eventName, preventDefaults, false)
	})

	function preventDefaults(e) {
		e.preventDefault()
		e.stopPropagation()
	}

	// Ajouter des effets visuels pendant le drag
	;["dragenter", "dragover"].forEach((eventName) => {
		dropZone.addEventListener(eventName, highlight, false)
	})
	;["dragleave", "drop"].forEach((eventName) => {
		dropZone.addEventListener(eventName, unhighlight, false)
	})

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

	// Gérer le mode plein écran
	function toggleFullscreen() {
		isFullscreen = !isFullscreen;
		container.classList.toggle('fullscreen');
		dropZone.classList.toggle('hidden');
		
		// Ajuster la taille du canvas pour le mode plein écran
		if (isFullscreen) {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight - 200; // Espace pour les contrôles
		} else {
			canvas.width = 560;
			canvas.height = 200;
		}
	}

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
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight - 200;
		}
	});

	function handleFiles(files) {
		if (files.length > 0) {
			const file = files[0]

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
