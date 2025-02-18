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
		this.animationSpeed = 1.0;

		// Définir les paramètres par défaut
		const defaultParams = {
			maxHeight: 5.0,
			bassWeight: 1.4,
			midWeight: 1.2,
			highWeight: 1.1,
			smoothingTimeConstant: 0.5,
			waveIntensity: 0.15,
			colorIntensity: 0.5,
			alphaBase: 0.4,
			alphaMultiplier: 4.0,
			responseIntensity: 4.5,
			gridDensity: 200,
			crossSize: 0.1,
			crossIntensity: 1.0,
			crossRotationSpeed: 1.0,
			crossWaveFrequency: 1.0,
			gridWaveSpeed: 1.0,
			gridWaveFrequency: 1.0,
			colorCycleSpeed: 1.0,
			colorSaturation: 1.0,
			depthEffect: 1.0,
			particleCount: 5000,
			particleSize: 7.0,
			particleSizeVariation: 5.0,
			particleSpeed: 0.5,
			particleSpeedVariation: 0.3,
			particleAlpha: 0.7,
			particlePulseIntensity: 0.5,
			particleSpread: 10.0,
			particleColorMix: 1.0,
			particleMotionRadius: 1.0
		};

		// Charger les paramètres sauvegardés et les fusionner avec les valeurs par défaut
		const savedParams = localStorage.getItem('visualizerParams');
		if (savedParams) {
			try {
				const params = JSON.parse(savedParams);
				if (params.animationSpeed !== undefined) {
					this.animationSpeed = params.animationSpeed;
				}
				if (params.zoom !== undefined) {
					this.zoom = Math.min(Math.max(params.zoom, this.minZoom), this.maxZoom);
				}
				this.gridParams = { ...defaultParams, ...params };
			} catch (e) {
				console.error('Erreur lors du chargement des paramètres:', e);
				this.gridParams = defaultParams;
			}
		} else {
			this.gridParams = defaultParams;
		}

		// Ajouter le contrôle de la caméra
		this.isDragging = false;
		this.lastMouseX = 0;
		this.lastMouseY = 0;
		this.cameraRotationX = 0;
		this.cameraRotationY = 0;
		this.autoRotate = true;

		this.init();
		this.setupZoomControl();
		this.setupMouseControl();
		this.setupSpeedControl();
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

	setupMouseControl() {
		this.canvas.addEventListener("mousedown", (e) => {
			this.isDragging = true;
			this.lastMouseX = e.clientX;
			this.lastMouseY = e.clientY;
			this.autoRotate = false;
		});

		document.addEventListener("mouseup", () => {
			this.isDragging = false;
		});

		document.addEventListener("mousemove", (e) => {
			if (!this.isDragging) return;

			const deltaX = e.clientX - this.lastMouseX;
			const deltaY = e.clientY - this.lastMouseY;

			this.cameraRotationY += deltaX * 0.005;
			this.cameraRotationX = Math.max(
				-Math.PI / 3,
				Math.min(Math.PI / 3, this.cameraRotationX + deltaY * 0.005),
			);

			this.lastMouseX = e.clientX;
			this.lastMouseY = e.clientY;
		});

		// Double-clic pour réinitialiser la rotation automatique
		this.canvas.addEventListener("dblclick", () => {
			this.autoRotate = true;
			this.cameraRotationX = 0;
			this.cameraRotationY = 0;
		});
	}

	setupSpeedControl() {
		// Créer le conteneur principal
		const controlsContainer = document.createElement("div");
		controlsContainer.style.position = "fixed";
		controlsContainer.style.left = "20px";
		controlsContainer.style.bottom = "20px";
		controlsContainer.style.zIndex = "1000";
		controlsContainer.style.background = "rgba(0, 0, 0, 0.8)";
		controlsContainer.style.borderRadius = "12px";
		controlsContainer.style.width = "250px";
		controlsContainer.style.transition = "transform 0.3s ease-in-out";

		// Créer le header
		const header = document.createElement("div");
		header.style.padding = "15px";
		header.style.display = "flex";
		header.style.justifyContent = "space-between";
		header.style.alignItems = "center";
		header.style.borderBottom = "1px solid rgba(255, 255, 255, 0.1)";
		header.style.cursor = "pointer";

		// Titre
		const title = document.createElement("h3");
		title.textContent = "Contrôles de la grille";
		title.style.color = "#fff";
		title.style.margin = "0";
		title.style.fontSize = "14px";
		title.style.fontFamily = "Arial, sans-serif";

		// Bouton toggle
		const toggleButton = document.createElement("button");
		toggleButton.innerHTML = "▼";
		toggleButton.style.background = "none";
		toggleButton.style.border = "none";
		toggleButton.style.color = "#fff";
		toggleButton.style.fontSize = "12px";
		toggleButton.style.cursor = "pointer";
		toggleButton.style.padding = "5px";
		toggleButton.style.transition = "transform 0.3s ease";

		header.appendChild(title);
		header.appendChild(toggleButton);
		controlsContainer.appendChild(header);

		// Conteneur pour les sliders
		const slidersContainer = document.createElement("div");
		slidersContainer.style.padding = "15px";
		slidersContainer.style.maxHeight = "60vh";
		slidersContainer.style.overflowY = "auto";
		slidersContainer.style.display = "flex";
		slidersContainer.style.flexDirection = "column";
		slidersContainer.style.gap = "10px";
		slidersContainer.style.transition = "max-height 0.3s ease-in-out, padding 0.3s ease-in-out";
		controlsContainer.appendChild(slidersContainer);

		// État initial
		let isExpanded = false;
		slidersContainer.style.maxHeight = "0";
		slidersContainer.style.padding = "0 15px";
		toggleButton.style.transform = "rotate(-90deg)";

		// Fonction pour toggle le menu
		const toggleMenu = () => {
			isExpanded = !isExpanded;
			slidersContainer.style.maxHeight = isExpanded ? "60vh" : "0";
			slidersContainer.style.padding = isExpanded ? "15px" : "0 15px";
			toggleButton.style.transform = isExpanded ? "rotate(0deg)" : "rotate(-90deg)";
		};

		// Ajouter les événements de clic
		header.addEventListener("click", toggleMenu);

		// Configuration des sliders
		const sliderConfigs = [
			{
				name: "Zoom caméra",
				key: "zoom",
				min: 0.5,
				max: 5.0,
				step: 0.1,
				default: 1.0,
			},
			{
				name: "Vitesse d'animation",
				key: "animationSpeed",
				min: 0.1,
				max: 3.0,
				step: 0.1,
				default: 1.0,
			},
			{
				name: "Hauteur maximale",
				key: "maxHeight",
				min: 1.0,
				max: 10.0,
				step: 0.5,
				default: 1.5,
				param: "gridParams",
			},
			{
				name: "Poids des basses",
				key: "bassWeight",
				min: 0.5,
				max: 2.0,
				step: 0.1,
				default: 1.4,
				param: "gridParams",
			},
			{
				name: "Poids des mediums",
				key: "midWeight",
				min: 0.5,
				max: 2.0,
				step: 0.1,
				default: 1.2,
				param: "gridParams",
			},
			{
				name: "Poids des aigus",
				key: "highWeight",
				min: 0.5,
				max: 2.0,
				step: 0.1,
				default: 1.1,
				param: "gridParams",
			},
			{
				name: "Lissage temporel",
				key: "smoothingTimeConstant",
				min: 0.1,
				max: 0.95,
				step: 0.05,
				default: 0.5,
				param: "gridParams",
				onChange: (value) => {
					if (this.analyser) {
						this.analyser.smoothingTimeConstant = value;
					}
				},
			},
			{
				name: "Intensité des vagues",
				key: "waveIntensity",
				min: 0.0,
				max: 0.5,
				step: 0.01,
				default: 0.15,
				param: "gridParams",
			},
			{
				name: "Intensité des couleurs",
				key: "colorIntensity",
				min: 0.1,
				max: 1.0,
				step: 0.1,
				default: 0.5,
				param: "gridParams",
			},
			{
				name: "Transparence de base",
				key: "alphaBase",
				min: 0.1,
				max: 0.9,
				step: 0.1,
				default: 0.4,
				param: "gridParams",
			},
			{
				name: "Multiplicateur alpha",
				key: "alphaMultiplier",
				min: 1.0,
				max: 8.0,
				step: 0.5,
				default: 4.0,
				param: "gridParams",
			},
			{
				name: "Intensité de réponse",
				key: "responseIntensity",
				min: 1.0,
				max: 8.0,
				step: 0.5,
				default: 4.5,
				param: "gridParams",
			},
		];

		// Nouveaux sliders pour la grille et la croix
		const additionalSliders = [
			{
				name: "Densité de la grille",
				key: "gridDensity",
				min: 50,
				max: 400,
				step: 10,
				default: 200,
				param: "gridParams",
				onChange: (value) => {
					this.gridLines = value;
					this.setGridSize(this.gridSize);
				}
			},
			{
				name: "Taille de la croix",
				key: "crossSize",
				min: 0.0,
				max: 0.5,
				step: 0.01,
				default: 0.1,
				param: "gridParams"
			},
			{
				name: "Intensité de la croix",
				key: "crossIntensity",
				min: 0.0,
				max: 2.0,
				step: 0.1,
				default: 1.0,
				param: "gridParams"
			},
			{
				name: "Vitesse rotation croix",
				key: "crossRotationSpeed",
				min: 0.0,
				max: 2.0,
				step: 0.1,
				default: 1.0,
				param: "gridParams"
			},
			{
				name: "Fréquence vagues croix",
				key: "crossWaveFrequency",
				min: 0.1,
				max: 5.0,
				step: 0.1,
				default: 1.0,
				param: "gridParams"
			},
			{
				name: "Vitesse vagues grille",
				key: "gridWaveSpeed",
				min: 0.1,
				max: 5.0,
				step: 0.1,
				default: 1.0,
				param: "gridParams"
			},
			{
				name: "Fréquence vagues grille",
				key: "gridWaveFrequency",
				min: 0.1,
				max: 5.0,
				step: 0.1,
				default: 1.0,
				param: "gridParams"
			},
			{
				name: "Vitesse cycle couleurs",
				key: "colorCycleSpeed",
				min: 0.1,
				max: 3.0,
				step: 0.1,
				default: 1.0,
				param: "gridParams"
			},
			{
				name: "Saturation couleurs",
				key: "colorSaturation",
				min: 0.0,
				max: 2.0,
				step: 0.1,
				default: 1.0,
				param: "gridParams"
			},
			{
				name: "Effet de profondeur",
				key: "depthEffect",
				min: 0.0,
				max: 2.0,
				step: 0.1,
				default: 1.0,
				param: "gridParams"
			}
		];

		// Nouveaux sliders pour les particules
		const particleSliders = [
			{
				name: "Nombre de particules",
				key: "particleCount",
				min: 1000,
				max: 20000,
				step: 1000,
				default: 5000,
				param: "gridParams",
				onChange: () => {
					// Réinitialiser le système de particules avec le nouveau nombre
					this.initParticleSystem();
				}
			},
			{
				name: "Taille des particules",
				key: "particleSize",
				min: 1.0,
				max: 20.0,
				step: 0.5,
				default: 7.0,
				param: "gridParams",
				onChange: () => this.initParticleSystem()
			},
			{
				name: "Variation de taille",
				key: "particleSizeVariation",
				min: 0.0,
				max: 10.0,
				step: 0.5,
				default: 5.0,
				param: "gridParams",
				onChange: () => this.initParticleSystem()
			},
			{
				name: "Vitesse des particules",
				key: "particleSpeed",
				min: 0.1,
				max: 2.0,
				step: 0.1,
				default: 0.5,
				param: "gridParams"
			},
			{
				name: "Intensité de pulsation",
				key: "particlePulseIntensity",
				min: 0.0,
				max: 2.0,
				step: 0.1,
				default: 0.5,
				param: "gridParams"
			},
			{
				name: "Transparence",
				key: "particleAlpha",
				min: 0.1,
				max: 1.0,
				step: 0.1,
				default: 0.7,
				param: "gridParams"
			},
			{
				name: "Dispersion",
				key: "particleSpread",
				min: 5.0,
				max: 20.0,
				step: 0.5,
				default: 10.0,
				param: "gridParams",
				onChange: () => this.initParticleSystem()
			},
			{
				name: "Mélange de couleurs",
				key: "particleColorMix",
				min: 0.0,
				max: 1.0,
				step: 0.1,
				default: 1.0,
				param: "gridParams",
				onChange: () => this.initParticleSystem()
			},
			{
				name: "Rayon de mouvement",
				key: "particleMotionRadius",
				min: 0.1,
				max: 2.0,
				step: 0.1,
				default: 1.0,
				param: "gridParams",
				onChange: () => this.initParticleSystem()
			}
		];

		// Ajouter les nouveaux sliders à la configuration existante
		sliderConfigs.push(...additionalSliders);
		sliderConfigs.push(...particleSliders);

		// Modifier la création des sliders pour utiliser les valeurs sauvegardées
		for (const config of sliderConfigs) {
			const container = document.createElement("div");
			container.style.display = "flex";
			container.style.flexDirection = "column";
			container.style.gap = "2px";

			const label = document.createElement("label");
			label.textContent = config.name;
			label.style.color = "#fff";
			label.style.fontSize = "12px";
			label.style.fontFamily = "Arial, sans-serif";

			const sliderContainer = document.createElement("div");
			sliderContainer.style.display = "flex";
			sliderContainer.style.alignItems = "center";
			sliderContainer.style.gap = "10px";

			const slider = document.createElement("input");
			slider.type = "range";
			slider.min = config.min;
			slider.max = config.max;
			slider.step = config.step;
			
			// Utiliser la valeur sauvegardée ou la valeur par défaut
			const savedValue = config.param ? 
				this[config.param][config.key] : 
				this[config.key];
			slider.value = savedValue;

			slider.style.width = "150px";
			slider.style.accentColor = "#4CAF50";

			const value = document.createElement("span");
			value.textContent = savedValue.toFixed(2);
			value.style.color = "#fff";
			value.style.fontSize = "12px";
			value.style.fontFamily = "monospace";
			value.style.minWidth = "45px";

			slider.addEventListener("input", (e) => {
				const val = Number.parseFloat(e.target.value);
				value.textContent = val.toFixed(2);

				if (config.param) {
					this[config.param][config.key] = val;
				} else {
					this[config.key] = val;
				}

				if (config.onChange) {
					config.onChange(val);
				}

				// Sauvegarder les paramètres après chaque changement
				this.saveParams();
			});

			sliderContainer.appendChild(slider);
			sliderContainer.appendChild(value);
			container.appendChild(label);
			container.appendChild(sliderContainer);
			slidersContainer.appendChild(container);
		}

		document.body.appendChild(controlsContainer);
	}

	init() {
		if (!this.gl) {
			console.error("WebGL non supporté");
			return;
		}

		// Initialiser le système de particules
		this.initParticleSystem();

		// Augmenter le nombre de lignes pour plus de détail
		this.gridLines = 200;

		// Initialiser les lignes de la grille avec un espacement plus fin
		for (let j = 1; j < this.gridLines; j++) {
			this.lines.push({
				axis: "x",
				offset: new Spring(0.02, 0.9, (j / this.gridLines) * 2 - 1),
			});
			this.lines.push({
				axis: "y",
				offset: new Spring(0.02, 0.9, (j / this.gridLines) * 2 - 1),
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
            uniform float uTime;
            uniform float uWaveIntensity;
            uniform float uColorIntensity;
            uniform float uAlphaBase;
            uniform float uAlphaMultiplier;
            uniform float uCrossSize;
            uniform float uCrossIntensity;
            uniform float uCrossRotationSpeed;
            uniform float uCrossWaveFrequency;
            uniform float uGridWaveSpeed;
            uniform float uGridWaveFrequency;
            uniform float uColorCycleSpeed;
            uniform float uColorSaturation;
            uniform float uDepthEffect;
            
            varying vec4 vColor;
            
            void main() {
                vec2 lookup = (aPosition.xy + 1.0) * 0.5;
                float x = lookup.x;
                float y = lookup.y;
                
                // Calcul de la distance au centre pour l'effet de croix
                vec2 center = vec2(0.5, 0.5);
                vec2 toCenter = lookup - center;
                float distanceToCenter = length(toCenter);
                
                // Rotation de la croix
                float crossRotation = uTime * uCrossRotationSpeed;
                vec2 rotatedCoord = vec2(
                    toCenter.x * cos(crossRotation) - toCenter.y * sin(crossRotation),
                    toCenter.x * sin(crossRotation) + toCenter.y * cos(crossRotation)
                );
                
                // Effet de croix
                float crossEffect = max(
                    smoothstep(uCrossSize, 0.0, abs(rotatedCoord.x)),
                    smoothstep(uCrossSize, 0.0, abs(rotatedCoord.y))
                ) * uCrossIntensity;
                
                vec2 coord1 = vec2(x, y);
                vec2 coord2 = vec2(1.0 - y, x);
                vec2 coord3 = vec2(1.0 - x, 1.0 - y);
                vec2 coord4 = vec2(y, 1.0 - x);
                
                float freq1 = texture2D(uFrequencyData, coord1).r;
                float freq2 = texture2D(uFrequencyData, coord2).r;
                float freq3 = texture2D(uFrequencyData, coord3).r;
                float freq4 = texture2D(uFrequencyData, coord4).r;
                
                float yWeight = smoothstep(0.0, 1.0, y);
                float xWeight = smoothstep(0.0, 1.0, x);
                
                float frequency = max(
                    max(freq1 * (1.0 + yWeight), freq2 * (1.0 + xWeight)),
                    max(freq3 * (2.0 - yWeight), freq4 * (2.0 - xWeight))
                );
                
                // Ajouter l'effet de croix à la fréquence
                frequency = mix(frequency, frequency * (1.0 + crossEffect), crossEffect);
                
                vec3 position = aPosition;
                
                // Vagues de la grille avec paramètres ajustables
                float gridWave = sin(
                    x * uGridWaveFrequency * 6.0 + 
                    y * uGridWaveFrequency * 4.0 + 
                    uTime * uGridWaveSpeed * 2.0
                ) * uWaveIntensity;
                
                // Vagues de la croix
                float crossWave = sin(
                    distanceToCenter * uCrossWaveFrequency * 10.0 + 
                    uTime * uGridWaveSpeed
                ) * crossEffect * uWaveIntensity;
                
                position.z = frequency * uGridMaxHeight * (
                    1.0 + 
                    gridWave + 
                    crossWave + 
                    sin(frequency * 10.0) * 0.3
                );
                
                // Effet de profondeur
                position.z *= mix(1.0, 1.0 - distanceToCenter, uDepthEffect);
                
                gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(position, 1.0);
                
                // Couleurs avec cycle et saturation ajustables
                vec3 color = vec3(
                    sin(frequency * 8.0 + y * 3.0 + uTime * uColorCycleSpeed) * 0.5 + 0.5,
                    sin(frequency * 6.0 + x * 5.0 + uTime * uColorCycleSpeed * 0.7) * 0.5 + 0.5,
                    cos(frequency * 4.0 + (x + y) * 2.0 + uTime * uColorCycleSpeed * 0.5) * 0.5 + 0.5
                );
                
                // Ajuster la saturation
                vec3 gray = vec3(dot(color, vec3(0.299, 0.587, 0.114)));
                color = mix(gray, color, uColorSaturation);
                
                float heightIntensity = smoothstep(0.0, 1.0, position.z / uGridMaxHeight);
                color = mix(color, vec3(1.0), frequency * uColorIntensity + heightIntensity * 0.3);
                
                // Ajuster l'alpha en fonction de la croix
                float alpha = clamp(
                    frequency * uAlphaMultiplier + crossEffect, 
                    uAlphaBase, 
                    1.0
                );
                
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
		this.timeLocation = this.gl.getUniformLocation(this.program, "uTime");
		this.waveIntensityLocation = this.gl.getUniformLocation(
			this.program,
			"uWaveIntensity"
		);
		this.colorIntensityLocation = this.gl.getUniformLocation(
			this.program,
			"uColorIntensity"
		);
		this.alphaBaseLocation = this.gl.getUniformLocation(
			this.program,
			"uAlphaBase"
		);
		this.alphaMultiplierLocation = this.gl.getUniformLocation(
			this.program,
			"uAlphaMultiplier"
		);
		this.crossSizeLocation = this.gl.getUniformLocation(
			this.program,
			"uCrossSize"
		);
		this.crossIntensityLocation = this.gl.getUniformLocation(
			this.program,
			"uCrossIntensity"
		);
		this.crossRotationSpeedLocation = this.gl.getUniformLocation(
			this.program,
			"uCrossRotationSpeed"
		);
		this.crossWaveFrequencyLocation = this.gl.getUniformLocation(
			this.program,
			"uCrossWaveFrequency"
		);
		this.gridWaveSpeedLocation = this.gl.getUniformLocation(
			this.program,
			"uGridWaveSpeed"
		);
		this.gridWaveFrequencyLocation = this.gl.getUniformLocation(
			this.program,
			"uGridWaveFrequency"
		);
		this.colorCycleSpeedLocation = this.gl.getUniformLocation(
			this.program,
			"uColorCycleSpeed"
		);
		this.colorSaturationLocation = this.gl.getUniformLocation(
			this.program,
			"uColorSaturation"
		);
		this.depthEffectLocation = this.gl.getUniformLocation(
			this.program,
			"uDepthEffect"
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
				offset: new Spring(0.02, 0.9, (j / this.gridLines) * 2 - 1),
			});
			this.lines.push({
				axis: "y",
				offset: new Spring(0.02, 0.9, (j / this.gridLines) * 2 - 1),
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
		this.analyser = this.audioContext.createAnalyser();
		this.analyser.fftSize = 2048;
		// Réduire le lissage pour plus de réactivité
		this.analyser.smoothingTimeConstant = this.gridParams.smoothingTimeConstant;
		// Ajuster la plage de décibels pour une meilleure dynamique
		this.analyser.minDecibels = -70;
		this.analyser.maxDecibels = -30;

		if (audioElement) {
			const source = this.audioContext.createMediaElementSource(audioElement);
			source.connect(this.analyser);
			this.analyser.connect(this.audioContext.destination);
		}

		this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
	}

	updateFrequencyTexture() {
		this.analyser.getByteFrequencyData(this.dataArray);

		const normalizedData = new Uint8Array(this.dataArray.length);
		const frequencyBins = this.dataArray.length;

		// Utiliser les paramètres ajustables
		const { bassWeight, midWeight, highWeight } = this.gridParams;

		for (let i = 0; i < frequencyBins; i++) {
			let sum = 0;
			let count = 0;

			for (
				let j = Math.max(0, i - 2);
				j <= Math.min(frequencyBins - 1, i + 2);
				j++
			) {
				sum += this.dataArray[j];
				count++;
			}

			const value = sum / count;
			let weight = midWeight;

			if (i < frequencyBins * 0.33) {
				weight = bassWeight;
				if (i < frequencyBins * 0.1) {
					weight *= 1.3;
				}
			} else if (i > frequencyBins * 0.66) {
				weight = highWeight;
				if (i > frequencyBins * 0.9) {
					weight *= 1.2;
				}
			}

			const normalizedValue = value / 255;
			const response =
				normalizedValue < 0.1
					? normalizedValue * this.gridParams.responseIntensity
					: normalizedValue ** 0.25;

			normalizedData[i] = Math.min(255, response * 255 * weight);
		}

		// Distribution circulaire des données dans la texture
		const textureSize = Math.ceil(Math.sqrt(this.dataArray.length));
		const paddedData = new Uint8Array(textureSize * textureSize);

		for (let y = 0; y < textureSize; y++) {
			for (let x = 0; x < textureSize; x++) {
				// Calculer l'index source avec une distribution circulaire
				const angle = Math.atan2(y - textureSize / 2, x - textureSize / 2);
				const radius = Math.sqrt(
					(x - textureSize / 2) ** 2 + (y - textureSize / 2) ** 2,
				);
				const sourceIndex = Math.floor(
					(((angle + Math.PI) / (2 * Math.PI)) * normalizedData.length +
						radius) %
						normalizedData.length,
				);
				paddedData[y * textureSize + x] = normalizedData[sourceIndex];
			}
		}

		this.gl.bindTexture(this.gl.TEXTURE_2D, this.frequencyTexture);
		this.gl.texImage2D(
			this.gl.TEXTURE_2D,
			0,
			this.gl.LUMINANCE,
			textureSize,
			textureSize,
			0,
			this.gl.LUMINANCE,
			this.gl.UNSIGNED_BYTE,
			paddedData,
		);
	}

	draw() {
		if (!this.gl || !this.analyser) return;

		this.updateFrequencyTexture();

		const time = performance.now() / 1000;
		this.rotation +=
			(0.002 + Math.sin(time * 0.1) * 0.001) * this.animationSpeed;

		const projectionMatrix = this.perspective(
			(60 * Math.PI) / 180,
			this.aspectRatio,
			0.1,
			100.0,
		);
		const viewMatrix = this.createViewMatrix();
		const modelMatrix = this.createModelMatrix();

		// Calculer l'intensité des basses pour les particules
		const bassFrequencies = this.dataArray.slice(0, Math.floor(this.dataArray.length * 0.1));
		const bassIntensity = bassFrequencies.reduce((sum, value) => sum + value, 0) / (bassFrequencies.length * 255);

		// Effacer le canvas
		this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

		// Dessiner les particules en premier
		this.gl.enable(this.gl.BLEND);
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE);
		this.drawParticles(projectionMatrix, viewMatrix, modelMatrix, bassIntensity);

		// Restaurer le blend mode pour la grille
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

		// Dessiner la grille
		this.gl.useProgram(this.program);
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
		
		// Mettre à jour les uniformes avec les valeurs des paramètres
		this.gl.uniform1f(this.gridMaxHeightLocation, this.gridParams.maxHeight);
		this.gl.uniform1f(this.timeLocation, time * this.animationSpeed);
		this.gl.uniform1f(this.waveIntensityLocation, this.gridParams.waveIntensity);
		this.gl.uniform1f(this.colorIntensityLocation, this.gridParams.colorIntensity);
		this.gl.uniform1f(this.alphaBaseLocation, this.gridParams.alphaBase);
		this.gl.uniform1f(this.alphaMultiplierLocation, this.gridParams.alphaMultiplier);
		this.gl.uniform1f(this.crossSizeLocation, this.gridParams.crossSize);
		this.gl.uniform1f(this.crossIntensityLocation, this.gridParams.crossIntensity);
		this.gl.uniform1f(this.crossRotationSpeedLocation, this.gridParams.crossRotationSpeed);
		this.gl.uniform1f(this.crossWaveFrequencyLocation, this.gridParams.crossWaveFrequency);
		this.gl.uniform1f(this.gridWaveSpeedLocation, this.gridParams.gridWaveSpeed);
		this.gl.uniform1f(this.gridWaveFrequencyLocation, this.gridParams.gridWaveFrequency);
		this.gl.uniform1f(this.colorCycleSpeedLocation, this.gridParams.colorCycleSpeed);
		this.gl.uniform1f(this.colorSaturationLocation, this.gridParams.colorSaturation);
		this.gl.uniform1f(this.depthEffectLocation, this.gridParams.depthEffect);

		this.gl.drawArrays(this.gl.LINES, 0, positions.length / 3);

		requestAnimationFrame(() => this.draw());
	}

	createModelMatrix() {
		// Matrice de mise à l'échelle pour le zoom
		const scale = this.zoom;
		return [scale, 0, 0, 0, 0, scale, 0, 0, 0, 0, scale, 0, 0, 0, 0, 1];
	}

	createViewMatrix() {
		const time = performance.now() / 1000;

		// Calculer la position de la caméra
		const radius = Math.max(12.0, 12.0 * this.aspectRatio) / this.zoom;

		// Si la rotation automatique est activée, utiliser le temps
		if (this.autoRotate) {
			this.rotation += 0.002 + Math.sin(time * 0.1) * 0.001;
			this.cameraRotationY = this.rotation;
		}

		// Appliquer les rotations de la caméra
		const eyeX =
			Math.sin(this.cameraRotationY) * Math.cos(this.cameraRotationX) * radius;
		const eyeY = Math.sin(this.cameraRotationX) * radius;
		const eyeZ =
			Math.cos(this.cameraRotationY) * Math.cos(this.cameraRotationX) * radius;

		const eye = [eyeX, 5.0 / this.zoom + eyeY, eyeZ];
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

	initParticleSystem() {
		// Vertex shader pour les particules
		const particleVsSource = `
			attribute vec3 aPosition;
			attribute vec2 aOffset;
			attribute float aSize;
			attribute vec3 aColor;
			
			uniform mat4 uProjectionMatrix;
			uniform mat4 uViewMatrix;
			uniform mat4 uModelMatrix;
			uniform float uTime;
			uniform float uBassIntensity;
			uniform float uParticleSpeed;
			uniform float uParticlePulseIntensity;
			uniform float uParticleAlpha;
			
			varying vec3 vColor;
			varying float vAlpha;
			
			void main() {
				// Position de base de la particule
				vec3 position = aPosition;
				
				// Mouvement sinusoïdal basé sur le temps et la position
				float speed = uParticleSpeed;
				position.x += sin(uTime * speed + position.y) * aOffset.x;
				position.y += cos(uTime * speed + position.x) * aOffset.y;
				position.z += sin(uTime * speed * 0.5) * (aOffset.x + aOffset.y) * 0.5;
				
				// Ajouter un effet de pulsation basé sur les basses
				float pulse = 1.0 + uBassIntensity * uParticlePulseIntensity;
				position *= pulse;
				
				gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(position, 1.0);
				
				// Taille variable des points en fonction de la distance et des basses
				float size = aSize * (1.0 + uBassIntensity * uParticlePulseIntensity);
				gl_PointSize = size / gl_Position.w;
				
				// Couleur et transparence
				vColor = aColor;
				vAlpha = uParticleAlpha * (1.0 - gl_Position.z / 10.0);
			}
		`;

		// Fragment shader pour les particules
		const particleFsSource = `
			precision mediump float;
			varying vec3 vColor;
			varying float vAlpha;
			
			void main() {
				// Créer une particule circulaire avec un dégradé doux
				vec2 coord = gl_PointCoord * 2.0 - 1.0;
				float r = length(coord);
				float a = 1.0 - smoothstep(0.0, 1.0, r);
				
				gl_FragColor = vec4(vColor, vAlpha * a);
			}
		`;

		// Compiler les shaders pour les particules
		const particleVs = this.compileShader(particleVsSource, this.gl.VERTEX_SHADER);
		const particleFs = this.compileShader(particleFsSource, this.gl.FRAGMENT_SHADER);

		// Créer le programme pour les particules
		this.particleProgram = this.gl.createProgram();
		this.gl.attachShader(this.particleProgram, particleVs);
		this.gl.attachShader(this.particleProgram, particleFs);
		this.gl.linkProgram(this.particleProgram);

		if (!this.gl.getProgramParameter(this.particleProgram, this.gl.LINK_STATUS)) {
			console.error("Erreur lors de l'initialisation des shaders de particules");
			return;
		}

		// Créer les particules
		const numParticles = this.gridParams.particleCount;
		const particlePositions = new Float32Array(numParticles * 3);
		const particleOffsets = new Float32Array(numParticles * 2);
		const particleSizes = new Float32Array(numParticles);
		const particleColors = new Float32Array(numParticles * 3);

		for (let i = 0; i < numParticles; i++) {
			// Position aléatoire dans un cube
			particlePositions[i * 3] = (Math.random() - 0.5) * this.gridParams.particleSpread;
			particlePositions[i * 3 + 1] = (Math.random() - 0.5) * this.gridParams.particleSpread;
			particlePositions[i * 3 + 2] = (Math.random() - 0.5) * this.gridParams.particleSpread;

			// Offset pour le mouvement
			particleOffsets[i * 2] = (Math.random() * 2 - 1) * this.gridParams.particleMotionRadius;
			particleOffsets[i * 2 + 1] = (Math.random() * 2 - 1) * this.gridParams.particleMotionRadius;

			// Taille aléatoire
			particleSizes[i] = this.gridParams.particleSize + 
				(Math.random() - 0.5) * this.gridParams.particleSizeVariation;

			// Couleur avec mélange ajustable
			const baseColor = [Math.random(), Math.random(), Math.random()];
			const mixColor = [1, 1, 1]; // Couleur de mélange (blanc)
			const mix = Math.random() * this.gridParams.particleColorMix;
			
			particleColors[i * 3] = baseColor[0] * (1 - mix) + mixColor[0] * mix;
			particleColors[i * 3 + 1] = baseColor[1] * (1 - mix) + mixColor[1] * mix;
			particleColors[i * 3 + 2] = baseColor[2] * (1 - mix) + mixColor[2] * mix;
		}

		// Créer et remplir les buffers
		this.particlePositionBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.particlePositionBuffer);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, particlePositions, this.gl.STATIC_DRAW);

		this.particleOffsetBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.particleOffsetBuffer);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, particleOffsets, this.gl.STATIC_DRAW);

		this.particleSizeBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.particleSizeBuffer);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, particleSizes, this.gl.STATIC_DRAW);

		this.particleColorBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.particleColorBuffer);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, particleColors, this.gl.STATIC_DRAW);

		// Obtenir les emplacements des attributs et uniformes
		this.particleProgram.positionLocation = this.gl.getAttribLocation(this.particleProgram, "aPosition");
		this.particleProgram.offsetLocation = this.gl.getAttribLocation(this.particleProgram, "aOffset");
		this.particleProgram.sizeLocation = this.gl.getAttribLocation(this.particleProgram, "aSize");
		this.particleProgram.colorLocation = this.gl.getAttribLocation(this.particleProgram, "aColor");

		this.particleProgram.projectionLocation = this.gl.getUniformLocation(this.particleProgram, "uProjectionMatrix");
		this.particleProgram.viewLocation = this.gl.getUniformLocation(this.particleProgram, "uViewMatrix");
		this.particleProgram.modelLocation = this.gl.getUniformLocation(this.particleProgram, "uModelMatrix");
		this.particleProgram.timeLocation = this.gl.getUniformLocation(this.particleProgram, "uTime");
		this.particleProgram.bassIntensityLocation = this.gl.getUniformLocation(this.particleProgram, "uBassIntensity");
		this.particleProgram.particleSpeedLocation = this.gl.getUniformLocation(this.particleProgram, "uParticleSpeed");
		this.particleProgram.particlePulseIntensityLocation = this.gl.getUniformLocation(this.particleProgram, "uParticlePulseIntensity");
		this.particleProgram.particleAlphaLocation = this.gl.getUniformLocation(this.particleProgram, "uParticleAlpha");

		this.numParticles = numParticles;
	}

	drawParticles(projectionMatrix, viewMatrix, modelMatrix, bassIntensity) {
		this.gl.useProgram(this.particleProgram);

		// Activer les attributs
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.particlePositionBuffer);
		this.gl.enableVertexAttribArray(this.particleProgram.positionLocation);
		this.gl.vertexAttribPointer(this.particleProgram.positionLocation, 3, this.gl.FLOAT, false, 0, 0);

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.particleOffsetBuffer);
		this.gl.enableVertexAttribArray(this.particleProgram.offsetLocation);
		this.gl.vertexAttribPointer(this.particleProgram.offsetLocation, 2, this.gl.FLOAT, false, 0, 0);

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.particleSizeBuffer);
		this.gl.enableVertexAttribArray(this.particleProgram.sizeLocation);
		this.gl.vertexAttribPointer(this.particleProgram.sizeLocation, 1, this.gl.FLOAT, false, 0, 0);

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.particleColorBuffer);
		this.gl.enableVertexAttribArray(this.particleProgram.colorLocation);
		this.gl.vertexAttribPointer(this.particleProgram.colorLocation, 3, this.gl.FLOAT, false, 0, 0);

		// Définir les uniformes
		this.gl.uniformMatrix4fv(this.particleProgram.projectionLocation, false, projectionMatrix);
		this.gl.uniformMatrix4fv(this.particleProgram.viewLocation, false, viewMatrix);
		this.gl.uniformMatrix4fv(this.particleProgram.modelLocation, false, modelMatrix);
		this.gl.uniform1f(this.particleProgram.timeLocation, performance.now() / 1000);
		this.gl.uniform1f(this.particleProgram.bassIntensityLocation, bassIntensity);
		this.gl.uniform1f(this.particleProgram.particleSpeedLocation, this.gridParams.particleSpeed);
		this.gl.uniform1f(this.particleProgram.particlePulseIntensityLocation, this.gridParams.particlePulseIntensity);
		this.gl.uniform1f(this.particleProgram.particleAlphaLocation, this.gridParams.particleAlpha);

		// Dessiner les particules
		this.gl.drawArrays(this.gl.POINTS, 0, this.numParticles);
	}

	// Fonction pour sauvegarder les paramètres
	saveParams() {
		const params = {
			...this.gridParams,
			animationSpeed: this.animationSpeed,
			zoom: this.zoom
		};
		localStorage.setItem('visualizerParams', JSON.stringify(params));
	}
}
