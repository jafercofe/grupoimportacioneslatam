// CREAR ARCHIVO: js/components/loginManager.js

class LoginManager {
    constructor() {
        this.empleadosData = [];
        this.currentUser = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        try {
            console.log('Inicializando LoginManager...');
            
            // Verificar si ya hay una sesión activa
            const sessionData = this.getSessionData();
            if (sessionData && this.isValidSession(sessionData)) {
                console.log('Sesión válida encontrada, redirigiendo...');
                this.redirectToApp();
                return;
            }
            
            // Cargar datos de empleados
            await this.loadEmpleadosDirecto();
            
            // Configurar eventos del formulario
            this.setupEventListeners();
            
            this.initialized = true;
            console.log('LoginManager inicializado correctamente');
            
        } catch (error) {
            console.error('Error inicializando LoginManager:', error);
            this.showError('Error al inicializar el sistema de login');
        }
    }

    async loadEmpleados() {
        try {
            console.log('Cargando datos de empleados...');
            
            // Verificar que dataService esté disponible
            if (!window.dataService) {
                throw new Error('DataService no está disponible');
            }
            
            // Verificar que Firebase esté inicializado
            if (!window.firebaseManager?.db) {
                throw new Error('Firebase no está inicializado correctamente');
            }
            
            console.log('DataService disponible, obteniendo empleados...');
            this.empleadosData = await window.dataService.getAll('empleados');
            console.log(`${this.empleadosData.length} empleados cargados para login`);
            
            if (this.empleadosData.length === 0) {
                throw new Error('No se encontraron empleados en el sistema. Contacte al administrador.');
            }
            
            // Debug: mostrar estructura del primer empleado
            if (this.empleadosData.length > 0) {
                console.log('Estructura del primer empleado:', Object.keys(this.empleadosData[0]));
            }
            
        } catch (error) {
            console.error('Error cargando empleados:', error);
            throw new Error(`Error al cargar datos de empleados: ${error.message}`);
        }
    }

    async loadEmpleadosDirecto() {
        try {
            console.log('Cargando empleados directamente desde Firebase...');
            
            if (!window.firebaseManager?.db) {
                throw new Error('Firebase no está disponible');
            }
            
            // Acceder directamente a Firebase
            const empleadosRef = window.firebaseManager.db.collection('empleados');
            const snapshot = await empleadosRef.get();
            
            this.empleadosData = [];
            snapshot.forEach(doc => {
                this.empleadosData.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            console.log(`${this.empleadosData.length} empleados cargados directamente`);
            
            if (this.empleadosData.length === 0) {
                throw new Error('No se encontraron empleados en el sistema');
            }
            
        } catch (error) {
            console.error('Error cargando empleados directamente:', error);
            throw error;
        }
    }


    setupEventListeners() {
        const form = document.getElementById('loginForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Enter en DNI pasa a contraseña
        const dniInput = document.getElementById('dni');
        if (dniInput) {
            dniInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('password').focus();
                }
            });
        }

        // Enter en contraseña envía el formulario
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleLogin();
                }
            });
        }
    }

    async handleLogin() {
        const dni = document.getElementById('dni').value.trim();
        const password = document.getElementById('password').value.trim();

        // Validaciones básicas
        if (!dni || !password) {
            this.showError('Por favor, ingresa tu DNI y contraseña');
            return;
        }

        if (dni.length !== 8 || !/^\d{8}$/.test(dni)) {
            this.showError('El DNI debe tener exactamente 8 dígitos');
            return;
        }

        this.setLoading(true);
        this.hideError();

        try {
            console.log(`Intentando login con DNI: ${dni}`);
            
            // Buscar empleado por DNI
            const empleado = this.empleadosData.find(emp => {
                // Verificar diferentes campos donde puede estar el DNI
                return emp.EMP_DNI === dni || 
                       emp.dni === dni || 
                       emp.documento === dni ||
                       emp.EMP_DOCUMENTO === dni ||
                       emp.id === dni;
            });

            if (!empleado) {
                this.showError('DNI no encontrado en el sistema');
                this.setLoading(false);
                return;
            }

            console.log('Empleado encontrado:', empleado);

            // Verificar contraseña
            const isValidPassword = this.validatePassword(empleado, password);
            
            if (!isValidPassword) {
                this.showError('Contraseña incorrecta');
                this.setLoading(false);
                return;
            }

            // Login exitoso
            console.log('Login exitoso para empleado:', empleado);
            
            // Guardar sesión
            this.saveSession(empleado);
            
            // Mostrar mensaje de éxito
            this.showSuccess(empleado);
            
            // Redirigir después de un momento
            setTimeout(() => {
                this.redirectToApp();
            }, 1500);

        } catch (error) {
            console.error('Error en login:', error);
            this.showError('Error al procesar el login. Intenta nuevamente.');
            this.setLoading(false);
        }
    }

    validatePassword(empleado, password) {
        // La contraseña por defecto es el DNI
        const dniEmpleado = empleado.EMP_DNI || empleado.dni || empleado.documento || empleado.EMP_DOCUMENTO;
        
        // NUEVO: Verificar si tiene contraseña personalizada primero
        if (empleado.password && empleado.password === password) {
            return true;
        }
        
        if (empleado.EMP_PASSWORD && empleado.EMP_PASSWORD === password) {
            return true;
        }
        
        // Si no tiene contraseña personalizada, usar DNI por defecto
        if (password === dniEmpleado) {
            return true;
        }

        return false;
    }


    saveSession(empleado) {
        const sessionData = {
            userId: empleado.id,
            dni: empleado.EMP_DNI || empleado.dni,
            nombre: empleado.EMP_NOMBRE || empleado.nombre,
            apellido: empleado.EMP_APELLIDO || empleado.apellido,
            email: empleado.email || empleado.EMP_EMAIL,
            tipo: empleado.EMP_TIP_TRA_ID || empleado.tipo,
            loginTime: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() // 8 horas
        };

        // Guardar en localStorage
        localStorage.setItem('novo_crm_session', JSON.stringify(sessionData));
        
        // Guardar en sessionStorage también para mayor seguridad
        sessionStorage.setItem('novo_crm_user', JSON.stringify(sessionData));

        this.currentUser = sessionData;
        console.log('Sesión guardada:', sessionData);
    }

    getSessionData() {
        try {
            const sessionData = localStorage.getItem('novo_crm_session');
            return sessionData ? JSON.parse(sessionData) : null;
        } catch (error) {
            console.error('Error obteniendo datos de sesión:', error);
            return null;
        }
    }

    isValidSession(sessionData) {
        if (!sessionData || !sessionData.expiresAt || !sessionData.userId) {
            return false;
        }

        const expiresAt = new Date(sessionData.expiresAt);
        const now = new Date();

        return expiresAt > now;
    }

    showSuccess(empleado) {
        const nombreCompleto = `${empleado.EMP_NOMBRE || empleado.nombre || ''} ${empleado.EMP_APELLIDO || empleado.apellido || ''}`.trim();
        
        const button = document.getElementById('loginButton');
        if (button) {
            button.innerHTML = `
                <i data-lucide="check-circle"></i>
                <span>¡Bienvenido ${nombreCompleto}!</span>
            `;
            button.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        }

        // Actualizar iconos
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    showError(message) {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';

            setTimeout(() => {
                this.hideError();
            }, 5000);
        }
        console.error('Login error:', message);
    }

    hideError() {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    setLoading(isLoading) {
        const button = document.getElementById('loginButton');
        
        if (!button) return;

        if (isLoading) {
            button.disabled = true;
            button.innerHTML = `
                <div class="loading-spinner"></div>
                <span>Verificando...</span>
            `;
            button.style.opacity = '0.8';
        } else {
            button.disabled = false;
            button.innerHTML = `
                <span>Iniciar Sesión</span>
                <i data-lucide="log-in"></i>
            `;
            button.style.opacity = '1';
            
            // Actualizar iconos
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    }
    redirectToApp() {
        // Redirigir a la aplicación principal
        window.location.href = 'index.html';
    }

    // Función estática para verificar autenticación en otras páginas
    static checkAuthentication() {
        const sessionData = localStorage.getItem('novo_crm_session');
        
        if (!sessionData) {
            LoginManager.redirectToLogin();
            return null;
        }

        try {
            const session = JSON.parse(sessionData);
            
            // Verificar si la sesión es válida
            const expiresAt = new Date(session.expiresAt);
            const now = new Date();
            
            if (expiresAt <= now) {
                console.log('Sesión expirada');
                LoginManager.logout();
                return null;
            }

            console.log('Usuario autenticado:', session);
            return session;
        } catch (error) {
            console.error('Error verificando autenticación:', error);
            LoginManager.redirectToLogin();
            return null;
        }
    }

    static redirectToLogin() {
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }

    static logout() {
        // Limpiar datos de sesión
        localStorage.removeItem('novo_crm_session');
        sessionStorage.removeItem('novo_crm_user');
        
        // Redirigir al login
        window.location.href = 'login.html';
    }

    static getCurrentUser() {
        return LoginManager.checkAuthentication();
    }

    
}

// Exportar para uso global
window.LoginManager = LoginManager;

function hasChangedDefaultPassword() {
    const user = getCurrentUser();
    if (!user) return false;
    
    // Aquí puedes implementar lógica para verificar si el usuario
    // sigue usando la contraseña por defecto (DNI)
    return true; // Por ahora asumimos que sí
}

// Mostrar notificación para cambiar contraseña por defecto
function checkPasswordSecurity() {
    const user = getCurrentUser();
    if (user && !hasChangedDefaultPassword()) {
        // Mostrar sugerencia para cambiar contraseña
        setTimeout(() => {
            if (confirm('Para mayor seguridad, se recomienda cambiar tu contraseña por defecto. ¿Deseas hacerlo ahora?')) {
                window.crmApp?.showTab('cambiar-password');
            }
        }, 3000); // Después de 3 segundos de cargar la app
    }
}