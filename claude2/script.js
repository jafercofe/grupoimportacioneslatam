// ENHANCED CRM SYSTEM WITH SECURITY & PERFORMANCE IMPROVEMENTS

// SECURE FIREBASE CONFIGURATION
// Note: In production, use environment variables and Firebase Security Rules
const firebaseConfig = {
            apiKey: "AIzaSyBlzaQCL7M98QeifzkEMZ4d8deC7oHqCT0",
            authDomain: "novo-crm-e9779.firebaseapp.com",
            projectId: "novo-crm-e9779",
            storageBucket: "novo-crm-e9779.firebasestorage.app",
            messagingSenderId: "43652899432",
            appId: "1:43652899432:web:6c787bced791b8ea6d91dd"
        };

// GLOBAL VARIABLES & CACHE
let db;
let firebaseInitialized = false;
let currentData = {};
let editingItem = null;
let currentType = null;

// Caching system for better performance
const cache = {
    estados: null,
    entregas: null,
    tiposPago: null,
    tiposTrabajador: null,
    lastUpdated: {}
};

// Constants
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const COLLECTIONS = {
    'estado': 'TB_ESTADO',
    'entrega': 'entregas',
    'tipo-contacto': 'tipos_contacto',
    'tipo-pago': 'tipos_pago',
    'tipo-trabajador': 'tipos_trabajador',
    'empleado': 'empleados',
    'producto': 'tb_productos',
    'pedido': 'tb_pedido',
    'cliente': 'clientes',
    'proveedor': 'TB_PROVEEDORES'
};

// UTILITY FUNCTIONS
class Utils {
    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    static validateDNI(dni) {
        return /^\d{8}$/.test(dni);
    }
    
    static validateRUC(ruc) {
        return /^\d{11}$/.test(ruc);
    }
    
    static formatCurrency(amount) {
        return new Intl.NumberFormat('es-PE', {
            style: 'currency',
            currency: 'PEN'
        }).format(amount);
    }
    
    static formatDate(dateString) {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('es-PE');
    }
    
    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// NOTIFICATION SYSTEM
class NotificationManager {
    static show(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span>${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.onclick = () => this.remove(notification);
        
        if (duration > 0) {
            setTimeout(() => this.remove(notification), duration);
        }
    }
    
    static remove(notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
    
    static success(message) {
        this.show(message, 'success');
    }
    
    static error(message) {
        this.show(message, 'error', 0);
    }
    
    static warning(message) {
        this.show(message, 'warning');
    }
}

// FIREBASE INITIALIZATION WITH BETTER ERROR HANDLING
async function initFirebase() {
    try {
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase SDK no está cargado');
        }
        
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        
        // Test connection
        await db.collection('test').limit(1).get();
        
        firebaseInitialized = true;
        console.log("Firebase inicializado correctamente");
        NotificationManager.success("Conexión establecida con la base de datos");
        
        // Hide connection alert if it exists
        const alertEl = document.getElementById('connection-alert');
        if (alertEl) {
            alertEl.classList.add('hidden');
        }
        
        return true;
    } catch (error) {
        console.error("Error inicializando Firebase:", error);
        NotificationManager.error(`Error de conexión: ${error.message}`);
        
        // Show connection alert
        const alertEl = document.getElementById('connection-alert');
        if (alertEl) {
            alertEl.classList.remove('hidden');
        }
        
        return false;
    }
}

// ENHANCED CACHING SYSTEM
class CacheManager {
    static async get(key, fetcher) {
        const now = Date.now();
        
        if (cache[key] && cache.lastUpdated[key] && 
            (now - cache.lastUpdated[key]) < CACHE_DURATION) {
            return cache[key];
        }
        
        try {
            const data = await fetcher();
            cache[key] = data;
            cache.lastUpdated[key] = now;
            return data;
        } catch (error) {
            console.error(`Error fetching ${key}:`, error);
            return cache[key] || [];
        }
    }
    
    static invalidate(key) {
        if (key) {
            cache[key] = null;
            delete cache.lastUpdated[key];
        } else {
            // Clear all cache
            Object.keys(cache).forEach(k => {
                if (k !== 'lastUpdated') cache[k] = null;
            });
            cache.lastUpdated = {};
        }
    }
}

// ENHANCED FORM VALIDATION
class FormValidator {
    static validateField(field, rules) {
        const value = field.value.trim();
        const errors = [];
        
        if (rules.required && !value) {
            errors.push(`${rules.label} es requerido`);
        }
        
        if (value && rules.minLength && value.length < rules.minLength) {
            errors.push(`${rules.label} debe tener al menos ${rules.minLength} caracteres`);
        }
        
        if (value && rules.maxLength && value.length > rules.maxLength) {
            errors.push(`${rules.label} no debe exceder ${rules.maxLength} caracteres`);
        }
        
        if (value && rules.email && !Utils.validateEmail(value)) {
            errors.push('Email no válido');
        }
        
        if (value && rules.dni && !Utils.validateDNI(value)) {
            errors.push('DNI debe tener 8 dígitos');
        }
        
        if (value && rules.min && parseFloat(value) < rules.min) {
            errors.push(`${rules.label} debe ser mayor a ${rules.min}`);
        }
        
        return errors;
    }
    
    static showFieldError(field, errors) {
        // Remove existing error messages
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        
        if (errors.length > 0) {
            field.classList.add('field-invalid');
            const errorDiv = document.createElement('div');
            errorDiv.className = 'field-error';
            errorDiv.textContent = errors[0];
            field.parentNode.appendChild(errorDiv);
        } else {
            field.classList.remove('field-invalid');
        }
    }
    
    static validateForm(formElement, rules) {
        let isValid = true;
        
        Object.keys(rules).forEach(fieldName => {
            const field = formElement.querySelector(`#${fieldName}`);
            if (field) {
                const errors = this.validateField(field, rules[fieldName]);
                this.showFieldError(field, errors);
                if (errors.length > 0) isValid = false;
            }
        });
        
        return isValid;
    }
}

// ENHANCED TABLE MANAGER
class TableManager {
    static addSearchFilter(tableId, searchInputId) {
        const searchInput = document.getElementById(searchInputId);
        const table = document.getElementById(tableId);
        
        if (!searchInput || !table) return;
        
        const debouncedSearch = Utils.debounce((searchTerm) => {
            const rows = table.querySelectorAll('tbody tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                const matches = text.includes(searchTerm.toLowerCase());
                row.style.display = matches ? '' : 'none';
            });
        }, 300);
        
        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });
    }
    
    static addColumnSorting(tableId) {
        const table = document.getElementById(tableId);
        if (!table) return;
        
        const headers = table.querySelectorAll('th');
        headers.forEach((header, index) => {
            if (header.textContent.trim() === 'Acciones') return;
            
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                this.sortTable(table, index);
            });
        });
    }
    
    static sortTable(table, columnIndex) {
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        
        const isNumeric = rows.every(row => {
            const cell = row.children[columnIndex];
            return cell && !isNaN(parseFloat(cell.textContent));
        });
        
        rows.sort((a, b) => {
            const aText = a.children[columnIndex]?.textContent.trim() || '';
            const bText = b.children[columnIndex]?.textContent.trim() || '';
            
            if (isNumeric) {
                return parseFloat(aText) - parseFloat(bText);
            } else {
                return aText.localeCompare(bText);
            }
        });
        
        rows.forEach(row => tbody.appendChild(row));
    }
}

// ENHANCED DATA LOADING WITH PAGINATION
async function loadTableWithPagination(collection, tableId, page = 1, limit = 50) {
    const tableBody = document.getElementById(tableId);
    if (!tableBody || !firebaseInitialized) return;

    try {
        // Show loading state
        tableBody.innerHTML = '<tr><td colspan="100%" class="text-center"><div class="loading"></div></td></tr>';
        
        const offset = (page - 1) * limit;
        const snapshot = await db.collection(collection)
            .orderBy(firebase.firestore.FieldPath.documentId())
            .limit(limit)
            .offset(offset)
            .get();
        
        if (snapshot.empty) {
            tableBody.innerHTML = `<tr><td colspan="100%" class="text-center">
                <div class="empty-state"><h3>No hay registros</h3></div>
            </td></tr>`;
            return;
        }

        // Process data based on collection type
        await processTableData(collection, tableId, snapshot);
        
        // Add table enhancements
        TableManager.addColumnSorting(tableId.replace('-table', ''));
        
    } catch (error) {
        console.error(`Error loading ${collection}:`, error);
        NotificationManager.error(`Error al cargar datos: ${error.message}`);
        tableBody.innerHTML = '<tr><td colspan="100%" class="text-center">Error al cargar datos</td></tr>';
    }
}

// ENHANCED SAVE FUNCTIONS WITH VALIDATION
async function saveItemWithValidation() {
    if (!firebaseInitialized || !currentType) {
        NotificationManager.error('Sistema no inicializado correctamente');
        return;
    }
    
    try {
        const formElement = document.getElementById('modal-form');
        let isValid = true;
        
        // Type-specific validation
        if (currentType === 'cliente') {
            const validationRules = {
                'field-identificacion': { required: true, label: 'Identificación' },
                'field-nombre': { required: true, label: 'Nombre', maxLength: 50 },
                'field-tipo': { required: true, label: 'Tipo' },
                'field-email': { email: true, label: 'Email' }
            };
            isValid = FormValidator.validateForm(formElement, validationRules);
        } else if (currentType === 'empleado') {
            const validationRules = {
                'field-dni': { required: true, dni: true, label: 'DNI' },
                'field-nombre': { required: true, label: 'Nombre' },
                'field-apellido': { required: true, label: 'Apellido' },
                'field-email': { email: true, label: 'Email' }
            };
            isValid = FormValidator.validateForm(formElement, validationRules);
        } else if (currentType === 'producto') {
            const validationRules = {
                'field-PRO_ID': { required: true, label: 'ID Producto' },
                'field-PRO_NOMBRE': { required: true, label: 'Nombre' },
                'field-PRO_CANTIDAD': { required: true, min: 0, label: 'Cantidad' },
                'field-PRO_PRECIO': { required: true, min: 0.01, label: 'Precio' }
            };
            isValid = FormValidator.validateForm(formElement, validationRules);
        }
        
        if (!isValid) {
            NotificationManager.warning('Por favor corrige los errores en el formulario');
            return;
        }
        
        // Save data
        await saveItem();
        
        NotificationManager.success('Registro guardado exitosamente');
        
        // Invalidate relevant cache
        CacheManager.invalidate();
        
        closeModal();
        
        // Reload current tab
        const currentTab = document.querySelector('.nav-btn.active');
        if (currentTab) {
            const tabId = currentTab.getAttribute('data-tab');
            await loadTabData(tabId);
        }
        
    } catch (error) {
        console.error('Error al guardar:', error);
        NotificationManager.error(`Error al guardar: ${error.message}`);
    }
}

// ENHANCED DELETE WITH CONFIRMATION
async function deleteItemWithConfirmation(type, id) {
    // Create custom confirmation modal
    const confirmed = await showConfirmationModal(
        'Confirmar eliminación',
        '¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.'
    );
    
    if (!confirmed) return;
    
    try {
        const collection = COLLECTIONS[type] || type;
        await db.collection(collection).doc(id).delete();
        
        NotificationManager.success('Registro eliminado exitosamente');
        
        // Invalidate cache
        CacheManager.invalidate();
        
        // Reload current tab
        const currentTab = document.querySelector('.nav-btn.active');
        if (currentTab) {
            const tabId = currentTab.getAttribute('data-tab');
            await loadTabData(tabId);
        }
        
    } catch (error) {
        console.error('Error deleting item:', error);
        NotificationManager.error(`Error al eliminar: ${error.message}`);
    }
}

// CONFIRMATION MODAL
function showConfirmationModal(title, message) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal confirmation-modal show';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                </div>
                <div class="modal-body">
                    <p>${message}</p>
                </div>
                <div class="form-actions">
                    <button class="btn btn-danger confirm-yes">Sí, eliminar</button>
                    <button class="btn btn-primary confirm-no">Cancelar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.confirm-yes').onclick = () => {
            document.body.removeChild(modal);
            resolve(true);
        };
        
        modal.querySelector('.confirm-no').onclick = () => {
            document.body.removeChild(modal);
            resolve(false);
        };
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
                resolve(false);
            }
        });
    });
}

// Keep all your existing functions but replace key ones with enhanced versions
// Replace the original functions with these enhanced versions:

// Replace initFirebase, saveItem with saveItemWithValidation, deleteItem with deleteItemWithConfirmation
// Add the notification system CSS and enhanced form styling

// INITIALIZATION WITH BETTER ERROR HANDLING
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Inicializando CRM mejorado...');
    
    try {
        // Initialize Lucide icons
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
        
        // Setup enhanced form handling
        const modalForm = document.getElementById('modal-form');
        if (modalForm) {
            modalForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const saveBtn = e.target.querySelector('button[type="submit"]');
                if (saveBtn) {
                    const originalText = saveBtn.innerHTML;
                    saveBtn.disabled = true;
                    saveBtn.innerHTML = '<div class="loading"></div> Guardando...';
                    
                    await saveItemWithValidation();
                    
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalText;
                }
            });
        }
        
        // Initialize Firebase
        const initialized = await initFirebase();
        if (initialized) {
            await loadDashboard();
        }
        
    } catch (error) {
        console.error('Error en la inicialización:', error);
        NotificationManager.error('Error al inicializar la aplicación');
    }
});

// Export enhanced functions for use in HTML
window.CRM = {
    showTab,
    openModal,
    closeModal,
    editItem,
    deleteItem: deleteItemWithConfirmation,
    saveItem: saveItemWithValidation,
    Utils,
    NotificationManager
};