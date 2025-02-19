export class DragAndDropHandler {
    constructor(dropZone, onFilesDrop) {
        this.dropZone = dropZone;
        this.onFilesDrop = onFilesDrop;
        this.init();
    }

    init() {
        // Prevent default browser behavior for drag & drop
        const preventDefaultEvents = ["dragenter", "dragover", "dragleave", "drop"];
        for (const eventName of preventDefaultEvents) {
            this.dropZone.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        }

        // Add visual effects during drag
        const highlightEvents = ["dragenter", "dragover"];
        for (const eventName of highlightEvents) {
            this.dropZone.addEventListener(eventName, () => this.highlight(), false);
        }
        
        const unhighlightEvents = ["dragleave", "drop"];
        for (const eventName of unhighlightEvents) {
            this.dropZone.addEventListener(eventName, () => this.unhighlight(), false);
        }

        // Handle drop
        this.dropZone.addEventListener("drop", (e) => this.handleDrop(e), false);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    highlight() {
        this.dropZone.classList.add("dragover");
    }

    unhighlight() {
        this.dropZone.classList.remove("dragover");
    }

    handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        this.onFilesDrop(files);
    }
} 