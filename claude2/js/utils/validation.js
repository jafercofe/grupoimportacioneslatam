class ValidationManager {
    static rules = {
        required: (value) => value && value.toString().trim().length > 0,
        email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        dni: (value) => /^\d{8}$/.test(value),
        ruc: (value) => /^\d{11}$/.test(value),
        phone: (value) => /^[+]?[\d\s\-()]+$/.test(value),
        minLength: (value, min) => value && value.toString().length >= min,
        maxLength: (value, max) => value && value.toString().length <= max,
        numeric: (value) => !isNaN(parseFloat(value)) && isFinite(value),
        positive: (value) => parseFloat(value) > 0
    };

    static validateField(value, rules) {
        const errors = [];
        
        for (const [ruleName, ruleValue] of Object.entries(rules)) {
            const ruleFunction = this.rules[ruleName];
            
            if (ruleFunction) {
                let isValid;
                
                if (typeof ruleValue === 'boolean' && ruleValue) {
                    isValid = ruleFunction(value);
                } else if (typeof ruleValue !== 'boolean') {
                    isValid = ruleFunction(value, ruleValue);
                } else {
                    continue;
                }
                
                if (!isValid) {
                    errors.push(this.getErrorMessage(ruleName, ruleValue));
                }
            }
        }
        
        return errors;
    }

    static getErrorMessage(ruleName, ruleValue) {
        const messages = {
            required: 'Este campo es requerido',
            email: 'Email no válido',
            dni: 'DNI debe tener 8 dígitos',
            ruc: 'RUC debe tener 11 dígitos',
            phone: 'Teléfono no válido',
            minLength: `Mínimo ${ruleValue} caracteres`,
            maxLength: `Máximo ${ruleValue} caracteres`,
            numeric: 'Debe ser un número',
            positive: 'Debe ser un número positivo'
        };
        
        return messages[ruleName] || 'Valor inválido';
    }

    static sanitize(input) {
        if (typeof input !== 'string') return input;
        return input
            .trim()
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/[<>]/g, '');
    }
}

// Export globally
window.ValidationManager = ValidationManager;