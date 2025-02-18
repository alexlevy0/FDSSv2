// Configuration des sliders principaux
export const mainSliderConfigs = [
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
        onChange: (value, visualizer) => {
            if (visualizer.analyser) {
                visualizer.analyser.smoothingTimeConstant = value;
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

// Configuration des sliders pour la grille et la croix
export const gridCrossSliderConfigs = [
    {
        name: "Densité de la grille",
        key: "gridDensity",
        min: 50,
        max: 400,
        step: 10,
        default: 200,
        param: "gridParams",
        onChange: (value, visualizer) => {
            visualizer.gridLines = value;
            visualizer.setGridSize(visualizer.gridSize);
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

// Configuration des sliders pour les particules
export const particleSliderConfigs = [
    {
        name: "Nombre de particules",
        key: "particleCount",
        min: 1000,
        max: 20000,
        step: 1000,
        default: 5000,
        param: "gridParams",
        onChange: (value, visualizer) => {
            visualizer.initParticleSystem();
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
        onChange: (value, visualizer) => visualizer.initParticleSystem()
    },
    {
        name: "Variation de taille",
        key: "particleSizeVariation",
        min: 0.0,
        max: 10.0,
        step: 0.5,
        default: 5.0,
        param: "gridParams",
        onChange: (value, visualizer) => visualizer.initParticleSystem()
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
        onChange: (value, visualizer) => visualizer.initParticleSystem()
    },
    {
        name: "Mélange de couleurs",
        key: "particleColorMix",
        min: 0.0,
        max: 1.0,
        step: 0.1,
        default: 1.0,
        param: "gridParams",
        onChange: (value, visualizer) => visualizer.initParticleSystem()
    },
    {
        name: "Rayon de mouvement",
        key: "particleMotionRadius",
        min: 0.1,
        max: 2.0,
        step: 0.1,
        default: 1.0,
        param: "gridParams",
        onChange: (value, visualizer) => visualizer.initParticleSystem()
    }
]; 