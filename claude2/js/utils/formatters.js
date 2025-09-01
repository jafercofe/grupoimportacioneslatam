class FormatterManager {
    static formatCurrency(amount) {
        return new Intl.NumberFormat('es-PE', {
            style: 'currency',
            currency: 'PEN'
        }).format(amount || 0);
    }
    
    static formatDate(dateString) {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('es-PE');
    }
    
    static formatDateTime(dateString) {
        if (!dateString) return '';
        return new Date(dateString).toLocaleString('es-PE');
    }
    
    static formatPhone(phone) {
        if (!phone) return '';
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 9) {
            return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
        }
        return phone;
    }
    
    static formatDNI(dni) {
        if (!dni) return '';
        const cleaned = dni.replace(/\D/g, '');
        if (cleaned.length === 8) {
            return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5)}`;
        }
        return dni;
    }

    static formatRUC(ruc) {
        if (!ruc) return '';
        const cleaned = ruc.replace(/\D/g, '');
        if (cleaned.length === 11) {
            return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 10)}-${cleaned.slice(10)}`;
        }
        return ruc;
    }

    static formatNumber(number, decimals = 2) {
        if (isNaN(number)) return '0';
        return Number(number).toLocaleString('es-PE', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    static formatPercentage(value) {
        if (isNaN(value)) return '0%';
        return new Intl.NumberFormat('es-PE', {
            style: 'percent',
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        }).format(value / 100);
    }

    static truncateText(text, maxLength = 50) {
        if (!text || text.length <= maxLength) return text || '';
        return text.slice(0, maxLength) + '...';
    }

    static capitalizeWords(str) {
        if (!str) return '';
        return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    }

    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Export globally
window.FormatterManager = FormatterManager;