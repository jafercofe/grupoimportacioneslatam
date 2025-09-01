class SmartCache {
    constructor() {
        this.cache = new Map();
        this.timestamps = new Map();
        this.maxAge = 5 * 60 * 1000; // 5 minutos
        this.maxSize = 100; // máximo 100 entradas
        
        // Limpiar cache automáticamente cada minuto
        setInterval(() => this.cleanup(), 60000);
    }

    set(key, value, customMaxAge = null) {
        // Si el cache está lleno, eliminar la entrada más antigua
        if (this.cache.size >= this.maxSize) {
            this.removeOldest();
        }
        
        this.cache.set(key, value);
        this.timestamps.set(key, Date.now());
        
        if (customMaxAge) {
            this.timestamps.set(key + '_custom_age', customMaxAge);
        }
    }

    get(key) {
        if (!this.cache.has(key)) {
            return null;
        }
        
        const timestamp = this.timestamps.get(key);
        const customAge = this.timestamps.get(key + '_custom_age');
        const maxAge = customAge || this.maxAge;
        
        if (Date.now() - timestamp > maxAge) {
            this.delete(key);
            return null;
        }
        
        return this.cache.get(key);
    }

    delete(key) {
        this.cache.delete(key);
        this.timestamps.delete(key);
        this.timestamps.delete(key + '_custom_age');
    }

    has(key) {
        return this.cache.has(key) && this.get(key) !== null;
    }

    removeOldest() {
        let oldestKey = null;
        let oldestTime = Date.now();
        
        for (const [key, timestamp] of this.timestamps) {
            if (timestamp < oldestTime && !key.endsWith('_custom_age')) {
                oldestTime = timestamp;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.delete(oldestKey);
        }
    }

    cleanup() {
        const now = Date.now();
        const keysToDelete = [];
        
        for (const [key, timestamp] of this.timestamps) {
            if (key.endsWith('_custom_age')) continue;
            
            const customAge = this.timestamps.get(key + '_custom_age');
            const maxAge = customAge || this.maxAge;
            
            if (now - timestamp > maxAge) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => this.delete(key));
        
        if (keysToDelete.length > 0) {
            console.log(`Cache cleanup: removed ${keysToDelete.length} expired entries`);
        }
    }

    clear() {
        this.cache.clear();
        this.timestamps.clear();
    }

    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            maxAge: this.maxAge
        };
    }

    invalidate(pattern = null) {
        if (!pattern) {
            this.clear();
            return;
        }
        
        const keysToDelete = [];
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => this.delete(key));
    }
}

// Export globally
window.smartCache = new SmartCache();