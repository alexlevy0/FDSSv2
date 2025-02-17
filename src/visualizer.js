import { Spring } from './spring.js';

export class AudioVisualizer {
	constructor(canvas) {
		this.canvas = canvas
		this.gl = canvas.getContext("webgl")
		this.audioContext = null
		this.analyser = null
		this.dataArray = null
		this.rotation = 0
		this.lines = []
		this.gridLines = 20
		this.init()
	}

	init() {
		if (!this.gl) {
			console.error("WebGL non supporté")
			return
		}

		// Initialiser les lignes de la grille
		for (let j = 1; j < this.gridLines; j++) {
			this.lines.push({
				axis: 'x',
				offset: new Spring(0.75, 0.1, j / this.gridLines * 2 - 1)
			})
			this.lines.push({
				axis: 'y',
				offset: new Spring(0.75, 0.1, j / this.gridLines * 2 - 1)
			})
		}

		// Vertex shader avec transformation 3D et couleur
		const vsSource = `
            attribute vec3 aPosition;
            
            uniform mat4 uProjectionMatrix;
            uniform mat4 uViewMatrix;
            uniform sampler2D uFrequencyData;
            uniform float uGridMaxHeight;
            
            varying vec4 vColor;
            
            void main() {
                vec2 lookup = (aPosition.xy + 1.0) * 0.5;
                float frequency = texture2D(uFrequencyData, lookup).r;
                
                vec3 position = aPosition;
                position.z = frequency * uGridMaxHeight;
                
                gl_Position = uProjectionMatrix * uViewMatrix * vec4(position, 1.0);
                
                vec3 color = vec3(
                    sin(frequency * 5.0) * 0.5 + 0.5,
                    sin(frequency * 3.0) * 0.5 + 0.5,
                    cos(frequency * 2.0) * 0.5 + 0.5
                );
                float alpha = clamp(frequency * 2.0, 0.1, 1.0);
                vColor = vec4(color, alpha);
            }
        `

		// Fragment shader
		const fsSource = `
            precision mediump float;
            varying vec4 vColor;
            
            void main() {
                gl_FragColor = vColor;
            }
        `

		const vertexShader = this.compileShader(vsSource, this.gl.VERTEX_SHADER)
		const fragmentShader = this.compileShader(fsSource, this.gl.FRAGMENT_SHADER)

		this.program = this.gl.createProgram()
		this.gl.attachShader(this.program, vertexShader)
		this.gl.attachShader(this.program, fragmentShader)
		this.gl.linkProgram(this.program)

		if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
			console.error("Erreur lors de l'initialisation des shaders")
			return
		}

		this.gl.useProgram(this.program)

		// Créer la texture pour les données de fréquence
		this.frequencyTexture = this.gl.createTexture()
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.frequencyTexture)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE)

		// Obtenir les emplacements des attributs et uniformes
		this.positionBuffer = this.gl.createBuffer()
		this.positionAttribLocation = this.gl.getAttribLocation(this.program, 'aPosition')
		this.projectionMatrixLocation = this.gl.getUniformLocation(this.program, 'uProjectionMatrix')
		this.viewMatrixLocation = this.gl.getUniformLocation(this.program, 'uViewMatrix')
		this.frequencyDataLocation = this.gl.getUniformLocation(this.program, 'uFrequencyData')
		this.gridMaxHeightLocation = this.gl.getUniformLocation(this.program, 'uGridMaxHeight')

		this.gl.enableVertexAttribArray(this.positionAttribLocation)

		// Activer la transparence et la profondeur
		this.gl.enable(this.gl.BLEND)
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)
		this.gl.enable(this.gl.DEPTH_TEST)
		this.gl.depthFunc(this.gl.LEQUAL)

		// Démarrer l'animation des lignes
		this.startLinesAnimation()
	}

	startLinesAnimation() {
		setInterval(() => {
			this.lines.forEach((line, i) => {
				const randomOffset = Math.random() * 2 - 1
				setTimeout(() => {
					line.offset.updateValue(randomOffset)
				}, i * 50)
			})
		}, 5000)
	}

	getLinesPositions() {
		const granularity = 50
		const positions = new Float32Array(this.lines.length * granularity * 6)
		let k = 0

		for (let line of this.lines) {
			const nextOffset = line.offset.tick()
			for (let q = 0; q < granularity; q++) {
				const t = q / granularity * 2 - 1
				const nextT = (q + 1) / granularity * 2 - 1
				
				positions[k++] = line.axis === 'x' ? nextOffset : t
				positions[k++] = line.axis === 'y' ? nextOffset : t
				positions[k++] = 0

				positions[k++] = line.axis === 'x' ? nextOffset : nextT
				positions[k++] = line.axis === 'y' ? nextOffset : nextT
				positions[k++] = 0
			}
		}

		return positions
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

	updateFrequencyTexture() {
		this.analyser.getByteFrequencyData(this.dataArray)
		
		// Normaliser les données
		const normalizedData = new Uint8Array(this.dataArray.length)
		for (let i = 0; i < this.dataArray.length; i++) {
			normalizedData[i] = this.dataArray[i]
		}

		this.gl.bindTexture(this.gl.TEXTURE_2D, this.frequencyTexture)
		this.gl.texImage2D(
			this.gl.TEXTURE_2D,
			0,
			this.gl.LUMINANCE,
			this.dataArray.length / 2,
			2,
			0,
			this.gl.LUMINANCE,
			this.gl.UNSIGNED_BYTE,
			normalizedData
		)
	}

	draw() {
		if (!this.gl || !this.analyser) return

		this.updateFrequencyTexture()
		
		// Mise à jour de la rotation
		this.rotation += 0.005

		// Matrices de vue et projection
		const projectionMatrix = this.perspective(45 * Math.PI / 180, this.canvas.width / this.canvas.height, 0.1, 100.0)
		const viewMatrix = this.createViewMatrix()

		// Mettre à jour les positions des lignes
		const positions = this.getLinesPositions()
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer)
		this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW)
		this.gl.vertexAttribPointer(this.positionAttribLocation, 3, this.gl.FLOAT, false, 0, 0)

		// Définir les uniformes
		this.gl.uniformMatrix4fv(this.projectionMatrixLocation, false, projectionMatrix)
		this.gl.uniformMatrix4fv(this.viewMatrixLocation, false, viewMatrix)
		this.gl.uniform1i(this.frequencyDataLocation, 0)
		this.gl.uniform1f(this.gridMaxHeightLocation, 2.0)

		// Effacer le canvas
		this.gl.clearColor(0.0, 0.0, 0.0, 1.0)
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT)

		// Dessiner les lignes
		this.gl.drawArrays(this.gl.LINES, 0, positions.length / 3)

		requestAnimationFrame(() => this.draw())
	}

	createViewMatrix() {
		const radius = 8.0
		const eye = [
			Math.sin(this.rotation) * radius,
			3.0,
			Math.cos(this.rotation) * radius
		]
		const center = [0, 0, 0]
		const up = [0, 1, 0]
		return this.lookAt(eye, center, up)
	}

	perspective(fovy, aspect, near, far) {
		const f = 1.0 / Math.tan(fovy / 2)
		const nf = 1 / (near - far)
		return [
			f / aspect, 0, 0, 0,
			0, f, 0, 0,
			0, 0, (far + near) * nf, -1,
			0, 0, 2 * far * near * nf, 0
		]
	}

	lookAt(eye, center, up) {
		const z = this.normalize(this.subtract(eye, center))
		const x = this.normalize(this.cross(up, z))
		const y = this.cross(z, x)
		
		return [
			x[0], y[0], z[0], 0,
			x[1], y[1], z[1], 0,
			x[2], y[2], z[2], 0,
			-this.dot(x, eye), -this.dot(y, eye), -this.dot(z, eye), 1
		]
	}

	normalize(v) {
		const length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])
		return [v[0] / length, v[1] / length, v[2] / length]
	}

	subtract(a, b) {
		return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
	}

	cross(a, b) {
		return [
			a[1] * b[2] - a[2] * b[1],
			a[2] * b[0] - a[0] * b[2],
			a[0] * b[1] - a[1] * b[0]
		]
	}

	dot(a, b) {
		return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
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
}
