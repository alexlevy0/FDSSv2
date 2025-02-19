import "./style.css"
import { AudioVisualizer } from "./visualizer.js"
import { UIManager } from "./uiManager.js"
import { AudioManager } from "./audioManager.js"
import { DragAndDropHandler } from "./dragAndDrop.js"

document.addEventListener("DOMContentLoaded", () => {
	// Initialize UI Manager
	const uiManager = new UIManager();
	
	// Initialize Audio Visualizer
	const visualizer = new AudioVisualizer(uiManager.canvas);
	
	// Set visualizer in UI Manager
	uiManager.setVisualizer(visualizer);
	
	// Initialize Audio Manager
	const audioManager = new AudioManager(visualizer, uiManager);
	
	// Initialize Drag and Drop Handler
	new DragAndDropHandler(uiManager.dropZone, (files) => audioManager.handleFiles(files));
	
	// Handle file input changes
	uiManager.fileInput.addEventListener("change", (e) => {
		audioManager.handleFiles(e.target.files);
	});
	
	// Handle microphone button clicks
	uiManager.micButton.addEventListener('click', () => audioManager.toggleMicrophone());
});
