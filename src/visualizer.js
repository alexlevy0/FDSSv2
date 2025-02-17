export class AudioVisualizer {
	constructor(canvas) {
		this.canvas = canvas
		this.gl = canvas.getContext("webgl")
		this.audioContext = null
		this.analyser = null
		this.dataArray = null
		this.init()
	}

	init() {
		if (!this.gl) {
			console.error("WebGL non supporté")
			return
		}

		// Vertex shader
		const vsSource = `
            attribute vec4 aVertexPosition;
            void main() {
                gl_Position = aVertexPosition;
                gl_PointSize = 2.0;
            }
        `

		// Fragment shader
		const fsSource = `
            precision mediump float;
            void main() {
                gl_FragColor = vec4(0.0, 0.7, 1.0, 1.0);
            }
        `

		// Créer et compiler les shaders
		const vertexShader = this.compileShader(vsSource, this.gl.VERTEX_SHADER)
		const fragmentShader = this.compileShader(fsSource, this.gl.FRAGMENT_SHADER)

		// Créer et lier le programme
		this.program = this.gl.createProgram()
		this.gl.attachShader(this.program, vertexShader)
		this.gl.attachShader(this.program, fragmentShader)
		this.gl.linkProgram(this.program)

		if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
			console.error("Erreur lors de l'initialisation des shaders")
			return
		}

		this.gl.useProgram(this.program)

		// Initialiser les buffers
		this.positionBuffer = this.gl.createBuffer()
		this.positionAttributeLocation = this.gl.getAttribLocation(this.program, "aVertexPosition")
		this.gl.enableVertexAttribArray(this.positionAttributeLocation)
	}

	compileShader(source, type) {
		const shader = this.gl.createShader(type)
		this.gl.shaderSource(shader, source)
		this.gl.compileShader(shader)

		if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
			console.error("Erreur de compilation du shader:", this.gl.getShaderInfoLog(shader))
			this.gl.deleteShader(shader)
			return null
		}
		return shader
	}

	setupAudioContext(audioElement) {
		this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
		const source = this.audioContext.createMediaElementSource(audioElement)
		this.analyser = this.audioContext.createAnalyser()
		this.analyser.fftSize = 256

		source.connect(this.analyser)
		this.analyser.connect(this.audioContext.destination)

		this.dataArray = new Uint8Array(this.analyser.frequencyBinCount)
	}

	draw() {
		if (!this.gl || !this.analyser) return

		this.analyser.getByteFrequencyData(this.dataArray)

		const positions = []
		for (let i = 0; i < this.dataArray.length; i++) {
			const x = (i / this.dataArray.length) * 2 - 1
			const y = this.dataArray[i] / 128.0 - 1
			positions.push(x, y)
		}

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer)
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW)

		this.gl.vertexAttribPointer(this.positionAttributeLocation, 2, this.gl.FLOAT, false, 0, 0)

		this.gl.clearColor(0.0, 0.0, 0.0, 1.0)
		this.gl.clear(this.gl.COLOR_BUFFER_BIT)

		this.gl.drawArrays(this.gl.POINTS, 0, positions.length / 2)

		requestAnimationFrame(() => this.draw())
	}
}
