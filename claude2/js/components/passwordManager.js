// CREAR ARCHIVO: js/components/passwordManager.js

class PasswordManager {
    constructor() {
        this.currentUser = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        try {
            console.log('Inicializando PasswordManager...');
            
            // Obtener usuario actual
            this.currentUser = window.LoginManager?.getCurrentUser();
            if (!this.currentUser) {
                throw new Error('No hay usuario autenticado');
            }
            
            // Mostrar información del usuario
            this.displayUserInfo();
            
            // Configurar eventos
            this.setupEventListeners();
            
            this.initialized = true;
            console.log('PasswordManager inicializado correctamente');
            
        } catch (error) {
            console.error('Error inicializando PasswordManager:', error);
            window.notificationService?.error('Error al cargar el gestor de contraseñas');
        }
    }

    displayUserInfo() {
        const nombreCompleto = `${this.currentUser.nombre || ''} ${this.currentUser.apellido || ''}`.trim();
        
        const userNameElement = document.getElementById('user-name-display');
        const userDniElement = document.getElementById('user-dni-display');
        
        if (userNameElement) {
            userNameElement.textContent = nombreCompleto || `Usuario ${this.currentUser.dni}`;
        }
        
        if (userDniElement) {
            userDniElement.textContent = `DNI: ${this.currentUser.dni}`;
        }
    }

    setupEventListeners() {
        // Evento de envío del formulario
        const form = document.getElementById('passwordChangeForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePasswordChange();
            });
        }

        // Validación en tiempo real de la nueva contraseña
        const newPasswordInput = document.getElementById('new-password');
        if (newPasswordInput) {
            newPasswordInput.addEventListener('input', () => {
                this.checkPasswordStrength();
                this.checkPasswordMatch();
            });
        }

        // Validación de confirmación de contraseña
        const confirmPasswordInput = document.getElementById('confirm-password');
        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', () => {
                this.checkPasswordMatch();
            });
        }
    }

    async handlePasswordChange() {
        const currentPassword = document.getElementById('current-password').value.trim();
        const newPassword = document.getElementById('new-password').value.trim();
        const confirmPassword = document.getElementById('confirm-password').value.trim();

        // Validaciones
        if (!currentPassword || !newPassword || !confirmPassword) {
            window.notificationService?.error('Todos los campos son obligatorios');
            return;
        }

        if (newPassword.length < 4) {
            window.notificationService?.error('La nueva contraseña debe tener al menos 4 caracteres');
            return;
        }

        if (newPassword !== confirmPassword) {
            window.notificationService?.error('Las contraseñas no coinciden');
            return;
        }

        if (currentPassword === newPassword) {
            window.notificationService?.warning('La nueva contraseña debe ser diferente a la actual');
            return;
        }

        // Mostrar estado de carga
        this.setLoading(true);

        try {
            console.log('Iniciando cambio de contraseña...');
            
            // Verificar contraseña actual
            const isCurrentPasswordValid = await this.verifyCurrentPassword(currentPassword);
            if (!isCurrentPasswordValid) {
                window.notificationService?.error('La contraseña actual es incorrecta');
                this.setLoading(false);
                return;
            }

            // Actualizar contraseña en la base de datos
            await this.updatePasswordInDatabase(newPassword);

            // Éxito
            console.log('Contraseña cambiada exitosamente');
            window.notificationService?.success('Contraseña cambiada exitosamente');
            
            // Limpiar formulario
            this.clearForm();
            
        } catch (error) {
            console.error('Error cambiando contraseña:', error);
            window.notificationService?.error('Error al cambiar la contraseña: ' + error.message);
        } finally {
            this.setLoading(false);
        }
    }

    async verifyCurrentPassword(currentPassword) {
        try {
            console.log('Verificando contraseña actual...');
            
            // CORREGIDO: Usar getAll y filtrar por ID en lugar de get()
            const empleadosData = await window.dataService.getAll('empleados');
            
            // Buscar el empleado actual por ID
            const empleadoData = empleadosData.find(emp => emp.id === this.currentUser.userId);
            
            if (!empleadoData) {
                throw new Error('No se pudo obtener información del empleado');
            }

            console.log('Empleado encontrado para verificación:', empleadoData.id);

            // La contraseña por defecto es el DNI
            const dniEmpleado = empleadoData.EMP_DNI || empleadoData.dni || empleadoData.documento || empleadoData.EMP_DOCUMENTO;
            
            // Verificar si tiene contraseña personalizada primero
            if (empleadoData.password && empleadoData.password === currentPassword) {
                console.log('Contraseña personalizada verificada');
                return true;
            }

            if (empleadoData.EMP_PASSWORD && empleadoData.EMP_PASSWORD === currentPassword) {
                console.log('Contraseña EMP_PASSWORD verificada');
                return true;
            }
            
            // Si no tiene contraseña personalizada, verificar DNI por defecto
            if (currentPassword === dniEmpleado) {
                console.log('Contraseña DNI por defecto verificada');
                return true;
            }

            console.log('Contraseña incorrecta');
            return false;

        } catch (error) {
            console.error('Error verificando contraseña actual:', error);
            throw new Error('Error al verificar la contraseña actual');
        }
    }


    async updatePasswordInDatabase(newPassword) {
        try {
            console.log('Actualizando contraseña en base de datos...');

            // Preparar datos para actualizar
            const updateData = {
                password: newPassword,
                EMP_PASSWORD: newPassword, // Para compatibilidad
                password_changed_at: new Date().toISOString(),
                password_changed_by: this.currentUser.userId
            };

            // VERIFICAR si dataService tiene método update, si no, usar alternativo
            if (typeof window.dataService.update === 'function') {
                await window.dataService.update('empleados', this.currentUser.userId, updateData);
            } else {
                // Método alternativo usando Firebase directamente
                const db = window.firebaseManager.db;
                await db.collection('empleados').doc(this.currentUser.userId).update(updateData);
            }

            console.log('Contraseña actualizada en base de datos');

        } catch (error) {
            console.error('Error actualizando contraseña:', error);
            throw new Error('Error al guardar la nueva contraseña en la base de datos');
        }
    }

    checkPasswordStrength() {
        const password = document.getElementById('new-password').value;
        const strengthContainer = document.getElementById('password-strength');
        const strengthText = document.getElementById('strength-text');

        let strength = 0;
        let strengthLabel = '';
        let strengthClass = '';

        if (password.length === 0) {
            strengthLabel = 'Ingresa una contraseña';
            strengthClass = '';
        } else if (password.length < 4) {
            strength = 1;
            strengthLabel = 'Muy débil';
            strengthClass = 'strength-weak';
        } else if (password.length < 6) {
            strength = 2;
            strengthLabel = 'Débil';
            strengthClass = 'strength-weak';
        } else if (password.length < 8) {
            strength = 3;
            strengthLabel = 'Regular';
            strengthClass = 'strength-fair';
        } else {
            // Verificaciones adicionales para contraseñas más largas
            let criteria = 0;
            if (/[a-z]/.test(password)) criteria++;
            if (/[A-Z]/.test(password)) criteria++;
            if (/[0-9]/.test(password)) criteria++;
            if (/[^A-Za-z0-9]/.test(password)) criteria++;

            if (criteria >= 3) {
                strength = 5;
                strengthLabel = 'Muy fuerte';
                strengthClass = 'strength-strong';
            } else if (criteria >= 2) {
                strength = 4;
                strengthLabel = 'Fuerte';
                strengthClass = 'strength-good';
            } else {
                strength = 3;
                strengthLabel = 'Regular';
                strengthClass = 'strength-fair';
            }
        }

        // Actualizar UI
        strengthContainer.className = 'password-strength ' + strengthClass;
        strengthText.textContent = strengthLabel;
    }

    checkPasswordMatch() {
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const matchContainer = document.getElementById('password-match');

        if (confirmPassword.length === 0) {
            matchContainer.textContent = '';
            matchContainer.className = 'password-match';
        } else if (newPassword === confirmPassword) {
            matchContainer.textContent = '✓ Las contraseñas coinciden';
            matchContainer.className = 'password-match match-success';
        } else {
            matchContainer.textContent = '✗ Las contraseñas no coinciden';
            matchContainer.className = 'password-match match-error';
        }
    }

    setLoading(isLoading) {
        const button = document.getElementById('change-password-btn');
        const form = document.getElementById('passwordChangeForm');
        
        if (button) {
            if (isLoading) {
                button.disabled = true;
                button.innerHTML = `
                    <div class="loading-spinner" style="width: 16px; height: 16px; border: 2px solid transparent; border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    Cambiando...
                `;
            } else {
                button.disabled = false;
                button.innerHTML = `
                    <i data-lucide="save"></i>
                    Cambiar Contraseña
                `;
                
                // Actualizar iconos
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
        }

        // Deshabilitar formulario durante la carga
        if (form) {
            const inputs = form.querySelectorAll('input');
            inputs.forEach(input => {
                input.disabled = isLoading;
            });
        }
    }

    clearForm() {
        const form = document.getElementById('passwordChangeForm');
        if (form) {
            form.reset();
            
            // Limpiar indicadores
            document.getElementById('password-strength').className = 'password-strength';
            document.getElementById('strength-text').textContent = 'Ingresa una contraseña';
            document.getElementById('password-match').textContent = '';
            document.getElementById('password-match').className = 'password-match';
        }
    }

    
}

// Funciones globales para la interfaz
window.togglePasswordVisibility = function(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.setAttribute('data-lucide', 'eye-off');
    } else {
        input.type = 'password';
        icon.setAttribute('data-lucide', 'eye');
    }
    
    // Actualizar iconos
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
};

window.clearPasswordForm = function() {
    if (window.passwordManager) {
        window.passwordManager.clearForm();
    }
};

async function resetEmployeePassword(empleadoId) {
    try {
        const updateData = {
            password: null, // Eliminar contraseña personalizada
            EMP_PASSWORD: null,
            password_reset_at: new Date().toISOString(),
            password_reset_by: getCurrentUser()?.userId
        };
        
        await window.dataService.update('empleados', empleadoId, updateData);
        console.log('Contraseña reseteada a DNI por defecto');
        
    } catch (error) {
        console.error('Error reseteando contraseña:', error);
    }
}

// Forzar cambio de contraseña en próximo login
async function forcePasswordChange(empleadoId) {
    try {
        const updateData = {
            force_password_change: true,
            force_password_change_reason: 'Requerido por administrador'
        };
        
        await window.dataService.update('empleados', empleadoId, updateData);
        console.log('Cambio de contraseña forzado');
        
    } catch (error) {
        console.error('Error forzando cambio de contraseña:', error);
    }
}

// Crear instancia global
window.passwordManager = new PasswordManager();