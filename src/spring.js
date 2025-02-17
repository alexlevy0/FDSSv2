export class Spring {
    constructor(dampening = 0.75, stiffness = 0.1, initialValue = 0) {
        this.dampening = dampening;
        this.stiffness = stiffness;
        this.value = initialValue;
        this.target = initialValue;
        this.velocity = 0;
    }

    tick(dt = 1, immediate = false) {
        if (immediate) {
            this.value = this.target;
            this.velocity = 0;
            return this.value;
        }

        const acceleration = (this.target - this.value) * this.stiffness;
        this.velocity += acceleration;
        this.velocity *= this.dampening;
        this.value += this.velocity * dt;

        return this.value;
    }

    updateValue(newTarget) {
        this.target = newTarget;
    }
} 