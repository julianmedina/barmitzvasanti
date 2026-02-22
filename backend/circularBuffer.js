/**
 * Circular Buffer (Ring Buffer)
 * Efficient fixed-size FIFO queue for position history
 */

class CircularBuffer {
    constructor(capacity) {
        this.capacity = capacity;
        this.buffer = new Array(capacity);
        this.head = 0;
        this.tail = 0;
        this.size = 0;
    }

    /**
     * Add item to buffer (overwrites oldest if full)
     */
    push(item) {
        this.buffer[this.tail] = item;
        this.tail = (this.tail + 1) % this.capacity;

        if (this.size < this.capacity) {
            this.size++;
        } else {
            // Buffer full, advance head to overwrite oldest
            this.head = (this.head + 1) % this.capacity;
        }
    }

    /**
     * Get item at index (0 = oldest, size-1 = newest)
     */
    get(index) {
        if (index < 0 || index >= this.size) {
            return undefined;
        }
        const actualIndex = (this.head + index) % this.capacity;
        return this.buffer[actualIndex];
    }

    /**
     * Get newest item
     */
    getNewest() {
        if (this.size === 0) return undefined;
        const index = (this.tail - 1 + this.capacity) % this.capacity;
        return this.buffer[index];
    }

    /**
     * Get oldest item
     */
    getOldest() {
        if (this.size === 0) return undefined;
        return this.buffer[this.head];
    }

    /**
     * Find closest item matching a predicate
     */
    findClosest(targetValue, keyFn = item => item) {
        if (this.size === 0) return null;

        let closest = this.get(0);
        let closestDiff = Math.abs(keyFn(closest) - targetValue);

        for (let i = 1; i < this.size; i++) {
            const item = this.get(i);
            const diff = Math.abs(keyFn(item) - targetValue);

            if (diff < closestDiff) {
                closest = item;
                closestDiff = diff;
            }
        }

        return closest;
    }

    /**
     * Convert to array (oldest to newest)
     */
    toArray() {
        const result = [];
        for (let i = 0; i < this.size; i++) {
            result.push(this.get(i));
        }
        return result;
    }

    /**
     * Clear buffer
     */
    clear() {
        this.head = 0;
        this.tail = 0;
        this.size = 0;
    }

    /**
     * Check if buffer is full
     */
    isFull() {
        return this.size === this.capacity;
    }

    /**
     * Check if buffer is empty
     */
    isEmpty() {
        return this.size === 0;
    }
}

module.exports = { CircularBuffer };
