import { Spring } from "./spring.js";

export class AudioVisualizer {
	constructor(canvas) {
		this.canvas = canvas;
		this.gl = canvas.getContext("webgl");
		this.audioContext = null;
		this.analyser = null;
		this.dataArray = null;
		this.rotation = 0;
		this.lines = [];
		this.gridLines = 100;
		this.zoom = 1.0;
		this.minZoom = 0.5;
		this.maxZoom = 5.0;
		this.gridSize = 4.0;
		this.aspectRatio = this.canvas.width / this.canvas.height;
		this.init();
		this.setupZoomControl();
	}

	setupZoomControl() {
		this.canvas.addEventListener(
			"wheel",
			(e) => {
				e.preventDefault();

				// Calculer le nouveau zoom
				const zoomDelta = e.deltaY * -0.001;
				this.zoom = Math.min(
					Math.max(this.zoom + zoomDelta, this.minZoom),
					this.maxZoom,
				);
			},
			{ passive: false },
		);
	}

	init() {
		if (!this.gl) {
			console.error("WebGL non supporté");
			return;
		}

		// Initialiser les lignes de la grille avec un espacement plus fin
		for (let j = 1; j < this.gridLines; j++) {
			this.lines.push({
				axis: "x",
				offset: new Spring(0.85, 0.1, (j / this.gridLines) * 2 - 1),
			});
			this.lines.push({
				axis: "y",
				offset: new Spring(0.85, 0.1, (j / this.gridLines) * 2 - 1),
			});
		}

		// Vertex shader avec transformation 3D et couleur améliorée
		const vsSource = `
            attribute vec3 aPosition;
            
            uniform mat4 uProjectionMatrix;
            uniform mat4 uViewMatrix;
            uniform mat4 uModelMatrix;
            uniform sampler2D uFrequencyData;
            uniform float uGridMaxHeight;
            
            varying vec4 vColor;
            
            void main() {
                vec2 lookup = (aPosition.xy + 1.0) * 0.5;
                float frequency = texture2D(uFrequencyData, lookup).r;
                
                vec3 position = aPosition;
                position.z = frequency * uGridMaxHeight * (1.0 + sin(frequency * 10.0) * 0.3);
                
                gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(position, 1.0);
                
                vec3 color = vec3(
                    sin(frequency * 8.0 + position.x) * 0.5 + 0.5,
                    sin(frequency * 6.0 + position.y) * 0.5 + 0.5,
                    cos(frequency * 4.0) * 0.5 + 0.5
                );
                float alpha = clamp(frequency * 3.5, 0.3, 1.0);
                vColor = vec4(color, alpha);
            }
        `;

		// Fragment shader
		const fsSource = `
            precision mediump float;
            varying vec4 vColor;
            
            void main() {
                gl_FragColor = vColor;
            }
        `;

		const vertexShader = this.compileShader(vsSource, this.gl.VERTEX_SHADER);
		const fragmentShader = this.compileShader(
			fsSource,
			this.gl.FRAGMENT_SHADER,
		);

		this.program = this.gl.createProgram();
		this.gl.attachShader(this.program, vertexShader);
		this.gl.attachShader(this.program, fragmentShader);
		this.gl.linkProgram(this.program);

		if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
			console.error("Erreur lors de l'initialisation des shaders");
			return;
		}

		this.gl.useProgram(this.program);

		// Créer la texture pour les données de fréquence
		this.frequencyTexture = this.gl.createTexture();
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.frequencyTexture);
		this.gl.texParameteri(
			this.gl.TEXTURE_2D,
			this.gl.TEXTURE_MIN_FILTER,
			this.gl.LINEAR,
		);
		this.gl.texParameteri(
			this.gl.TEXTURE_2D,
			this.gl.TEXTURE_MAG_FILTER,
			this.gl.LINEAR,
		);
		this.gl.texParameteri(
			this.gl.TEXTURE_2D,
			this.gl.TEXTURE_WRAP_S,
			this.gl.CLAMP_TO_EDGE,
		);
		this.gl.texParameteri(
			this.gl.TEXTURE_2D,
			this.gl.TEXTURE_WRAP_T,
			this.gl.CLAMP_TO_EDGE,
		);

		// Obtenir les emplacements des attributs et uniformes
		this.positionBuffer = this.gl.createBuffer();
		this.positionAttribLocation = this.gl.getAttribLocation(
			this.program,
			"aPosition",
		);
		this.projectionMatrixLocation = this.gl.getUniformLocation(
			this.program,
			"uProjectionMatrix",
		);
		this.viewMatrixLocation = this.gl.getUniformLocation(
			this.program,
			"uViewMatrix",
		);
		this.modelMatrixLocation = this.gl.getUniformLocation(
			this.program,
			"uModelMatrix",
		);
		this.frequencyDataLocation = this.gl.getUniformLocation(
			this.program,
			"uFrequencyData",
		);
		this.gridMaxHeightLocation = this.gl.getUniformLocation(
			this.program,
			"uGridMaxHeight",
		);

		this.gl.enableVertexAttribArray(this.positionAttribLocation);

		// Activer la transparence et la profondeur
		this.gl.enable(this.gl.BLEND);
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
		this.gl.enable(this.gl.DEPTH_TEST);
		this.gl.depthFunc(this.gl.LEQUAL);

		// Démarrer l'animation des lignes
		this.startLinesAnimation();
	}

	startLinesAnimation() {
		setInterval(() => {
			this.lines.forEach((line, i) => {
				const randomOffset = Math.random() * 2 - 1;
				setTimeout(() => {
					line.offset.updateValue(randomOffset);
				}, i * 50);
			});
		}, 5000);
	}

	updateViewport(width, height) {
		this.canvas.width = width;
		this.canvas.height = height;
		this.aspectRatio = width / height;
		this.gl.viewport(0, 0, width, height);
	}

	setGridSize(size) {
		this.gridSize = size;
		// Recréer les lignes avec la nouvelle taille
		this.lines = [];
		for (let j = 1; j < this.gridLines; j++) {
			this.lines.push({
				axis: "x",
				offset: new Spring(0.85, 0.1, (j / this.gridLines) * 2 - 1),
			});
			this.lines.push({
				axis: "y",
				offset: new Spring(0.85, 0.1, (j / this.gridLines) * 2 - 1),
			});
		}
	}

	getLinesPositions() {
		const granularity = 100;
		const positions = new Float32Array(this.lines.length * granularity * 6);
		let k = 0;

		// Calculer la taille de la grille en fonction du ratio d'aspect
		const sizeX = this.gridSize;
		const sizeY = this.gridSize / this.aspectRatio;

		for (const line of this.lines) {
			const nextOffset = line.offset.tick();
			for (let q = 0; q < granularity; q++) {
				const t = (q / granularity) * 2 - 1;
				const nextT = ((q + 1) / granularity) * 2 - 1;

				if (line.axis === "x") {
					// Ligne horizontale
					positions[k++] = nextOffset * sizeX;
					positions[k++] = t * sizeY;
					positions[k++] = 0;

					positions[k++] = nextOffset * sizeX;
					positions[k++] = nextT * sizeY;
					positions[k++] = 0;
				} else {
					// Ligne verticale
					positions[k++] = t * sizeX;
					positions[k++] = nextOffset * sizeY;
					positions[k++] = 0;

					positions[k++] = nextT * sizeX;
					positions[k++] = nextOffset * sizeY;
					positions[k++] = 0;
				}
			}
		}

		return positions;
	}

	setupAudioContext(audioElement) {
		this.audioContext = new (
			window.AudioContext || window.webkitAudioContext
		)();
		const source = this.audioContext.createMediaElementSource(audioElement);
		this.analyser = this.audioContext.createAnalyser();
		this.analyser.fftSize = 2048;
		this.analyser.smoothingTimeConstant = 0.65;

		source.connect(this.analyser);
		this.analyser.connect(this.audioContext.destination);

		this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
	}

	updateFrequencyTexture() {
		this.analyser.getByteFrequencyData(this.dataArray);

		const normalizedData = new Uint8Array(this.dataArray.length);
		for (let i = 0; i < this.dataArray.length; i++) {
			// Améliorer la courbe de réponse pour plus d'impact
			const value = this.dataArray[i];
			normalizedData[i] = (value / 255) ** 0.4 * 255;
		}

		this.gl.bindTexture(this.gl.TEXTURE_2D, this.frequencyTexture);
		this.gl.texImage2D(
			this.gl.TEXTURE_2D,
			0,
			this.gl.LUMINANCE,
			this.dataArray.length / 2,
			2,
			0,
			this.gl.LUMINANCE,
			this.gl.UNSIGNED_BYTE,
			normalizedData,
		);
	}

	draw() {
		if (!this.gl || !this.analyser) return;

		this.updateFrequencyTexture();

		// Rotation plus dynamique
		this.rotation += 0.003;

		const projectionMatrix = this.perspective(
			(60 * Math.PI) / 180,
			this.aspectRatio,
			0.1,
			100.0,
		);
		const viewMatrix = this.createViewMatrix();
		const modelMatrix = this.createModelMatrix();

		const positions = this.getLinesPositions();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
		this.gl.vertexAttribPointer(
			this.positionAttribLocation,
			3,
			this.gl.FLOAT,
			false,
			0,
			0,
		);

		this.gl.uniformMatrix4fv(
			this.projectionMatrixLocation,
			false,
			projectionMatrix,
		);
		this.gl.uniformMatrix4fv(this.viewMatrixLocation, false, viewMatrix);
		this.gl.uniformMatrix4fv(this.modelMatrixLocation, false, modelMatrix);
		this.gl.uniform1i(this.frequencyDataLocation, 0);
		this.gl.uniform1f(this.gridMaxHeightLocation, 4.5);

		this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

		this.gl.drawArrays(this.gl.LINES, 0, positions.length / 3);

		requestAnimationFrame(() => this.draw());
	}

	createModelMatrix() {
		// Matrice de mise à l'échelle pour le zoom
		const scale = this.zoom;
		return [scale, 0, 0, 0, 0, scale, 0, 0, 0, 0, scale, 0, 0, 0, 0, 1];
	}

	createViewMatrix() {
		// Ajuster le rayon en fonction du ratio d'aspect
		const radius = Math.max(12.0, 12.0 * this.aspectRatio) / this.zoom;
		const eye = [
			Math.sin(this.rotation) * radius,
			5.0 / this.zoom,
			Math.cos(this.rotation) * radius,
		];
		const center = [0, 0, 0];
		const up = [0, 1, 0];
		return this.lookAt(eye, center, up);
	}

	perspective(fovy, aspect, near, far) {
		const f = 1.0 / Math.tan(fovy / 2);
		const nf = 1 / (near - far);
		return [
			f / aspect,
			0,
			0,
			0,
			0,
			f,
			0,
			0,
			0,
			0,
			(far + near) * nf,
			-1,
			0,
			0,
			2 * far * near * nf,
			0,
		];
	}

	lookAt(eye, center, up) {
		const z = this.normalize(this.subtract(eye, center));
		const x = this.normalize(this.cross(up, z));
		const y = this.cross(z, x);

		return [
			x[0],
			y[0],
			z[0],
			0,
			x[1],
			y[1],
			z[1],
			0,
			x[2],
			y[2],
			z[2],
			0,
			-this.dot(x, eye),
			-this.dot(y, eye),
			-this.dot(z, eye),
			1,
		];
	}

	normalize(v) {
		const length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
		return [v[0] / length, v[1] / length, v[2] / length];
	}

	subtract(a, b) {
		return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
	}

	cross(a, b) {
		return [
			a[1] * b[2] - a[2] * b[1],
			a[2] * b[0] - a[0] * b[2],
			a[0] * b[1] - a[1] * b[0],
		];
	}

	dot(a, b) {
		return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
	}

	compileShader(source, type) {
		const shader = this.gl.createShader(type);
		this.gl.shaderSource(shader, source);
		this.gl.compileShader(shader);

		if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
			console.error(
				"Erreur de compilation du shader:",
				this.gl.getShaderInfoLog(shader),
			);
			this.gl.deleteShader(shader);
			return null;
		}
		return shader;
	}
}
