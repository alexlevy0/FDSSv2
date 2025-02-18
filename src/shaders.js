// Vertex shader principal pour la grille
export const mainVertexShader = `
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
        
        vec2 center = vec2(0.5, 0.5);
        vec2 toCenter = lookup - center;
        float distanceToCenter = length(toCenter);
        
        float crossRotation = uTime * uCrossRotationSpeed;
        vec2 rotatedCoord = vec2(
            toCenter.x * cos(crossRotation) - toCenter.y * sin(crossRotation),
            toCenter.x * sin(crossRotation) + toCenter.y * cos(crossRotation)
        );
        
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
        
        frequency = mix(frequency, frequency * (1.0 + crossEffect), crossEffect);
        
        vec3 position = aPosition;
        
        float gridWave = sin(
            x * uGridWaveFrequency * 6.0 + 
            y * uGridWaveFrequency * 4.0 + 
            uTime * uGridWaveSpeed * 2.0
        ) * uWaveIntensity;
        
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
        
        position.z *= mix(1.0, 1.0 - distanceToCenter, uDepthEffect);
        
        gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(position, 1.0);
        
        vec3 color = vec3(
            sin(frequency * 8.0 + y * 3.0 + uTime * uColorCycleSpeed) * 0.5 + 0.5,
            sin(frequency * 6.0 + x * 5.0 + uTime * uColorCycleSpeed * 0.7) * 0.5 + 0.5,
            cos(frequency * 4.0 + (x + y) * 2.0 + uTime * uColorCycleSpeed * 0.5) * 0.5 + 0.5
        );
        
        vec3 gray = vec3(dot(color, vec3(0.299, 0.587, 0.114)));
        color = mix(gray, color, uColorSaturation);
        
        float heightIntensity = smoothstep(0.0, 1.0, position.z / uGridMaxHeight);
        color = mix(color, vec3(1.0), frequency * uColorIntensity + heightIntensity * 0.3);
        
        float alpha = clamp(
            frequency * uAlphaMultiplier + crossEffect, 
            uAlphaBase, 
            1.0
        );
        
        vColor = vec4(color, alpha);
    }
`;

// Fragment shader principal pour la grille
export const mainFragmentShader = `
    precision mediump float;
    varying vec4 vColor;
    
    void main() {
        gl_FragColor = vColor;
    }
`;

// Vertex shader pour les particules
export const particleVertexShader = `
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
        vec3 position = aPosition;
        
        float speed = uParticleSpeed;
        position.x += sin(uTime * speed + position.y) * aOffset.x;
        position.y += cos(uTime * speed + position.x) * aOffset.y;
        position.z += sin(uTime * speed * 0.5) * (aOffset.x + aOffset.y) * 0.5;
        
        float pulse = 1.0 + uBassIntensity * uParticlePulseIntensity;
        position *= pulse;
        
        gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(position, 1.0);
        
        float size = aSize * (1.0 + uBassIntensity * uParticlePulseIntensity);
        gl_PointSize = size / gl_Position.w;
        
        vColor = aColor;
        vAlpha = uParticleAlpha * (1.0 - gl_Position.z / 10.0);
    }
`;

// Fragment shader pour les particules
export const particleFragmentShader = `
    precision mediump float;
    varying vec3 vColor;
    varying float vAlpha;
    
    void main() {
        vec2 coord = gl_PointCoord * 2.0 - 1.0;
        float r = length(coord);
        float a = 1.0 - smoothstep(0.0, 1.0, r);
        
        gl_FragColor = vec4(vColor, vAlpha * a);
    }
`; 