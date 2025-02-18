/**
 * Normalise un vecteur 3D
 * @param {number[]} v - Vecteur à normaliser [x, y, z]
 * @returns {number[]} Vecteur normalisé
 */
export function normalize(v) {
    const length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return [v[0] / length, v[1] / length, v[2] / length];
}

/**
 * Soustrait deux vecteurs 3D
 * @param {number[]} a - Premier vecteur [x, y, z]
 * @param {number[]} b - Second vecteur [x, y, z]
 * @returns {number[]} Résultat de la soustraction
 */
export function subtract(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

/**
 * Calcule le produit vectoriel de deux vecteurs 3D
 * @param {number[]} a - Premier vecteur [x, y, z]
 * @param {number[]} b - Second vecteur [x, y, z]
 * @returns {number[]} Produit vectoriel
 */
export function cross(a, b) {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ];
}

/**
 * Calcule le produit scalaire de deux vecteurs 3D
 * @param {number[]} a - Premier vecteur [x, y, z]
 * @param {number[]} b - Second vecteur [x, y, z]
 * @returns {number} Produit scalaire
 */
export function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * Crée une matrice de perspective
 * @param {number} fovy - Angle de vue vertical en radians
 * @param {number} aspect - Ratio largeur/hauteur
 * @param {number} near - Distance du plan proche
 * @param {number} far - Distance du plan lointain
 * @returns {number[]} Matrice de perspective 4x4
 */
export function perspective(fovy, aspect, near, far) {
    const f = 1.0 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    return [
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) * nf, -1,
        0, 0, 2 * far * near * nf, 0,
    ];
}

/**
 * Crée une matrice de vue "lookAt"
 * @param {number[]} eye - Position de la caméra [x, y, z]
 * @param {number[]} center - Point ciblé [x, y, z]
 * @param {number[]} up - Vecteur "haut" [x, y, z]
 * @returns {number[]} Matrice de vue 4x4
 */
export function lookAt(eye, center, up) {
    const z = normalize(subtract(eye, center));
    const x = normalize(cross(up, z));
    const y = cross(z, x);

    return [
        x[0], y[0], z[0], 0,
        x[1], y[1], z[1], 0,
        x[2], y[2], z[2], 0,
        -dot(x, eye), -dot(y, eye), -dot(z, eye), 1,
    ];
}

/**
 * Crée une matrice de mise à l'échelle
 * @param {number} scale - Facteur d'échelle uniforme
 * @returns {number[]} Matrice de mise à l'échelle 4x4
 */
export function createScaleMatrix(scale) {
    return [
        scale, 0, 0, 0,
        0, scale, 0, 0,
        0, 0, scale, 0,
        0, 0, 0, 1
    ];
} 