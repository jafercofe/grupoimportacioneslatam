// main.js - VERSIÓN COMPATIBLE CON SISTEMA EXISTENTE

class CRMApplication {
    constructor() {
        this.currentTab = 'dashboard';
        this.paginationManagers = {};
        this.initialized = false;
    }

    async initialize() {
        try {
            console.log('🚀 Iniciando CRM Application...');
            
            // 🔥 NUEVO: Inicializar Firebase primero si es necesario
            await this.initializeFirebase();
            
            // Verificar y configurar sistema de autenticación
            this.setupAuthCompatibility();
            
            // Initialize pagination managers
            this.initializePaginationManagers();
            
            // Initialize UI
            this.setupGlobalEventListeners();
            this.initializeLucideIcons();
            
            // Load initial data
            await this.loadDashboard();
            
            // Setup UI based on user info
            this.setupUserInterface();
            
            this.initialized = true;
            
            if (window.notificationService && window.notificationService.success) {
                window.notificationService.success('CRM Sistema inicializado correctamente');
            }
            
            console.log('✅ CRM Application initialized successfully');
            
            // Hide connection alert
            const alertEl = document.getElementById('connection-alert');
            if (alertEl) {
                alertEl.classList.add('hidden');
            }
            
        } catch (error) {
            console.error('❌ Initialization error:', error);
            
            if (window.notificationService && window.notificationService.error) {
                window.notificationService.error('Error al inicializar el sistema: ' + error.message);
            } else {
                console.error('Error al inicializar el sistema:', error.message);
            }
            
            // Show connection alert
            const alertEl = document.getElementById('connection-alert');
            if (alertEl) {
                alertEl.classList.remove('hidden');
            }
        }
    }

    // 🆕 NUEVO: Inicializar Firebase si es necesario
    async initializeFirebase() {
        console.log('🔥 Verificando Firebase...');
        
        try {
            // Verificar si Firebase ya está inicializado
            if (window.firebaseManager && typeof window.firebaseManager.initialize === 'function') {
                console.log('🔧 Inicializando Firebase...');
                await window.firebaseManager.initialize();
                console.log('✅ Firebase inicializado correctamente');
            } else if (window.firebase && window.dataService) {
                // Si Firebase está disponible pero firebaseManager no, inicializar básicamente
                console.log('🔧 Firebase disponible, verificando dataService...');
                
                // Verificar si dataService tiene conexión
                if (!window.dataService.db) {
                    console.log('🔧 Inicializando conexión de dataService...');
                    if (window.firebase.apps.length > 0) {
                        window.dataService.db = window.firebase.firestore();
                        console.log('✅ DataService conectado a Firestore');
                    }
                }
            } else {
                console.warn('⚠️ Firebase no disponible, continuando sin conexión');
            }
        } catch (error) {
            console.warn('⚠️ Error inicializando Firebase:', error.message);
            console.log('📋 Continuando con funcionalidad limitada...');
        }
    }

    // 🆕 NUEVO: Configurar compatibilidad con sistema de auth existente
    setupAuthCompatibility() {
        console.log('🔧 Configurando compatibilidad de autenticación...');
        
        // Si no existe authService, crear uno básico
        if (!window.authService) {
            window.authService = {
                currentUser: { nombre: 'Usuario Sistema', rol: 'USER', email: 'user@sistema.com' },
                getCurrentUser: function() { return this.currentUser; },
                isAuthenticated: function() { return true; },
                hasPermission: function(module, action) { return true; },
                hasRole: function(role) { return true; },
                logAction: function(action, module, data) { 
                    console.log('📝 Action:', action, module, data);
                    return Promise.resolve();
                }
            };
            console.log('🔧 AuthService básico creado');
        }

        // Verificar métodos necesarios y agregar fallbacks
        if (!window.authService.hasPermission) {
            window.authService.hasPermission = function(module, action) { return true; };
        }
        
        if (!window.authService.hasRole) {
            window.authService.hasRole = function(role) { return true; };
        }
        
        if (!window.authService.logAction) {
            window.authService.logAction = function(action, module, data) { 
                console.log('📝 Action:', action, module, data);
                return Promise.resolve();
            };
        }

        if (!window.authService.getCurrentUser) {
            window.authService.getCurrentUser = function() { 
                return { nombre: 'Usuario Sistema', rol: 'USER', email: 'user@sistema.com' };
            };
        }

        // 🔥 IMPORTANTE: Asegurar que currentUser nunca sea null
        if (!window.authService.currentUser) {
            window.authService.currentUser = { 
                nombre: 'Usuario Sistema', 
                rol: 'USER', 
                email: 'user@sistema.com' 
            };
        }

        console.log('✅ Compatibilidad de autenticación configurada');
    }

    initializePaginationManagers() {
        this.paginationManagers = {
            // Gestión básica
            'clientes': new window.PaginationManager('clientes', 'clientes-table'),
            'empleados': new window.PaginationManager('empleados', 'empleados-table'),
            'productos': new window.PaginationManager('tb_productos', 'productos-table'),
            'pedidos': new window.PaginationManager('tb_pedido', 'pedidos-table'),
            'compras': new window.PaginationManager('TB_COMPRAS', 'compras-table'),
            'proveedores': new window.PaginationManager('TB_PROVEEDORES', 'proveedores-table'),
            'estados': new window.PaginationManager('TB_ESTADO', 'estados-table'),
            'entregas': new window.PaginationManager('entregas', 'entregas-table'),
            
            // Tipos de datos
            'tipos-contacto': new window.PaginationManager('tipos_contacto', 'tipos-contacto-table'),
            'tipos-pago': new window.PaginationManager('tipos_pago', 'tipos-pago-table'),
            'tipos-trabajador': new window.PaginationManager('tipos_trabajador', 'tipos-trabajador-table')
        };

        // Inicializar managers especiales
        this.initializeSpecialManagers();

        // Export for global access
        window.paginationManagers = this.paginationManagers;
        
        console.log('✅ Pagination managers initialized:', Object.keys(this.paginationManagers));
    }

    initializeSpecialManagers() {
        // Inicializar managers especiales con verificación de existencia
        const managers = [
            { name: 'ReportesManager', instance: 'reportesManager' },
            { name: 'BalanceManager', instance: 'balanceManager' },
            { name: 'PasswordManager', instance: 'passwordManager' },
            { name: 'PermissionTabManager', instance: 'permissionTabManager' }
        ];

        managers.forEach(manager => {
            try {
                if (window[manager.name] && !window[manager.instance]) {
                    window[manager.instance] = new window[manager.name]();
                    console.log(`✅ ${manager.name} initialized`);
                } else if (window[manager.instance]) {
                    console.log(`✅ ${manager.instance} already available`);
                }
            } catch (error) {
                console.warn(`⚠️ Could not initialize ${manager.name}:`, error.message);
            }
        });
    }

    setupUserInterface() {
        try {
            const user = window.authService.getCurrentUser();
            
            // 🔥 VERIFICACIÓN CRÍTICA: Asegurar que user no sea null
            if (!user || typeof user !== 'object') {
                console.warn('⚠️ Usuario no válido, usando fallback');
                // Crear usuario fallback
                window.authService.currentUser = {
                    nombre: 'Usuario Sistema',
                    rol: 'USER',
                    email: 'user@sistema.com'
                };
                const fallbackUser = window.authService.getCurrentUser();
                this.displayUserInfo(fallbackUser);
                return;
            }

            console.log('🎨 Configurando interfaz para:', user.rol || user.role || 'Usuario');

            // Mostrar información del usuario
            this.displayUserInfo(user);
            
            // Configurar permisos básicos
            this.setupBasicPermissions();
            
        } catch (error) {
            console.warn('⚠️ Error configurando interfaz de usuario:', error);
            
            // Fallback completo en caso de error
            try {
                const fallbackUser = {
                    nombre: 'Usuario Sistema',
                    rol: 'USER',
                    email: 'user@sistema.com'
                };
                this.displayUserInfo(fallbackUser);
            } catch (fallbackError) {
                console.error('❌ Error crítico en setupUserInterface:', fallbackError);
            }
        }
    }

    displayUserInfo(user) {
        // Crear indicador básico de usuario
        if (!document.getElementById('user-indicator')) {
            const userIndicator = document.createElement('div');
            userIndicator.id = 'user-indicator';
            userIndicator.style.cssText = `
                position: fixed;
                top: 20px;
                left: 20px;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 0.75rem;
                padding: 0.75rem 1rem;
                color: white;
                font-size: 0.875rem;
                z-index: 1000;
                border: 1px solid rgba(255, 255, 255, 0.2);
                display: flex;
                align-items: center;
                gap: 0.5rem;
            `;
            
            const userName = user.nombre || user.name || user.email || 'Usuario';
            const userRole = user.rol || user.role || 'USER';
            
            userIndicator.innerHTML = `
                <i data-lucide="user" style="width: 16px; height: 16px;"></i>
                <div>
                    <div style="font-weight: 600;">${userName}</div>
                    <div style="font-size: 0.75rem; opacity: 0.8;">${userRole}</div>
                </div>
                <button onclick="crmApp.showUserMenu()" style="background: none; border: none; color: white; cursor: pointer; padding: 0.25rem;">
                    <i data-lucide="more-vertical" style="width: 16px; height: 16px;"></i>
                </button>
            `;
            
            document.body.appendChild(userIndicator);
            
            // Recrear iconos
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    }

    setupBasicPermissions() {
        // Configuración básica de permisos sin sistema complejo
        const restrictedTabs = ['permisos'];
        
        document.querySelectorAll('.nav-btn[data-tab]').forEach(button => {
            const tab = button.getAttribute('data-tab');
            
            if (restrictedTabs.includes(tab)) {
                const user = window.authService.getCurrentUser();
                const hasAdminRole = user && (user.rol === 'ADMIN' || user.rol === 'SUPER_ADMIN' || 
                                            user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');
                
                if (!hasAdminRole) {
                    button.style.opacity = '0.5';
                    button.style.cursor = 'not-allowed';
                    button.title = 'Requiere permisos de administrador';
                    
                    button.addEventListener('click', (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        this.showNotification('No tienes permisos de administrador para esta sección', 'warning');
                    });
                }
            }
        });
    }

    // Método auxiliar para mostrar notificaciones
    showNotification(message, type = 'info') {
        if (window.notificationService) {
            switch (type) {
                case 'success':
                    window.notificationService.success(message);
                    break;
                case 'error':
                    window.notificationService.error(message);
                    break;
                case 'warning':
                    window.notificationService.warning(message);
                    break;
                default:
                    window.notificationService.info(message);
                    break;
            }
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }

    showUserMenu() {
        // Crear menú simple de usuario
        let userMenu = document.getElementById('user-menu');
        
        if (!userMenu) {
            userMenu = document.createElement('div');
            userMenu.id = 'user-menu';
            userMenu.style.cssText = `
                position: fixed;
                top: 80px;
                left: 20px;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 0.75rem;
                padding: 1rem;
                color: white;
                font-size: 0.875rem;
                z-index: 1001;
                border: 1px solid rgba(255, 255, 255, 0.2);
                min-width: 200px;
                display: none;
            `;
            
            const user = window.authService.getCurrentUser();
            
            userMenu.innerHTML = `
                <div style="margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.2);">
                    <div style="font-weight: 600;">${user.nombre || user.name || 'Usuario'}</div>
                    <div style="font-size: 0.75rem; opacity: 0.8;">${user.email || 'N/A'}</div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <button onclick="crmApp.showTab('cambiar-password')" style="background: rgba(59, 130, 246, 0.2); color: #3b82f6; border: none; padding: 0.5rem; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem;">
                        <i data-lucide="key" style="width: 14px; height: 14px; margin-right: 4px;"></i>
                        Cambiar Contraseña
                    </button>
                    <button onclick="crmApp.logout()" style="background: rgba(239, 68, 68, 0.2); color: #ef4444; border: none; padding: 0.5rem; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem;">
                        <i data-lucide="log-out" style="width: 14px; height: 14px; margin-right: 4px;"></i>
                        Cerrar Sesión
                    </button>
                </div>
            `;
            
            document.body.appendChild(userMenu);
            
            // Cerrar menú al hacer click fuera
            document.addEventListener('click', (e) => {
                if (!userMenu.contains(e.target) && !document.getElementById('user-indicator').contains(e.target)) {
                    userMenu.style.display = 'none';
                }
            });
            
            // Recrear iconos
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
        
        // Toggle visibility
        const isVisible = userMenu.style.display !== 'none';
        userMenu.style.display = isVisible ? 'none' : 'block';
    }

    async logout() {
        try {
            const confirmed = await this.showConfirmationModal(
                'Confirmar Cierre de Sesión',
                '¿Estás seguro de que deseas cerrar sesión?'
            );
            
            if (!confirmed) return;
            
            console.log('🚪 Iniciando proceso de logout...');
            
            // 🔥 PASO 1: Limpiar estado local inmediatamente
            console.log('🧹 Limpiando estado local...');
            if (window.authService) {
                window.authService.currentUser = null;
                if (window.authService.userPermissions) {
                    window.authService.userPermissions = null;
                }
            }
            
            // 🔥 PASO 2: Limpiar cache si existe
            if (window.smartCache && window.smartCache.clear) {
                window.smartCache.clear();
                console.log('🗑️ Cache limpiado');
            }
            
            // 🔥 PASO 3: Registrar logout si es posible (SIN ESPERAR)
            try {
                if (window.authService && window.authService.logAction && typeof window.authService.logAction === 'function') {
                    // No esperar el resultado, hacerlo en paralelo
                    window.authService.logAction('logout', 'auth').catch(err => {
                        console.warn('⚠️ Error en log de auditoría (ignorado):', err.message);
                    });
                }
            } catch (logError) {
                console.warn('⚠️ Error iniciando log de auditoría (ignorado):', logError.message);
            }
            
            // 🔥 PASO 4: Logout de Firebase/Auth service
            console.log('🔐 Cerrando sesión de Firebase...');
            try {
                // Intentar logout completo si está disponible
                if (window.authService && window.authService.logout && typeof window.authService.logout === 'function') {
                    // Si es el authService original con Firebase
                    if (window.firebaseManager && window.firebaseManager.getAuth) {
                        const auth = window.firebaseManager.getAuth();
                        if (auth && auth.signOut) {
                            await auth.signOut();
                            console.log('✅ Firebase signOut exitoso');
                        }
                    } 
                    // Si es Firebase directo
                    else if (window.firebase && window.firebase.auth) {
                        const auth = window.firebase.auth();
                        if (auth && auth.signOut) {
                            await auth.signOut();
                            console.log('✅ Firebase auth signOut exitoso');
                        }
                    }
                    // Logout del authService personalizado si existe
                    else {
                        console.log('🔧 Ejecutando logout personalizado');
                        // Si es nuestro authService compatible, ya se limpió arriba
                    }
                }
            } catch (logoutError) {
                console.warn('⚠️ Error en logout de Firebase (continuando):', logoutError.message);
            }
            
            // 🔥 PASO 5: Limpiar sessionStorage y localStorage
            console.log('🧹 Limpiando storage...');
            try {
                // Limpiar items relacionados con auth
                const authKeys = ['authUser', 'currentUser', 'userSession', 'dev_session', 'firebase:authUser'];
                authKeys.forEach(key => {
                    localStorage.removeItem(key);
                    sessionStorage.removeItem(key);
                });
                
                // Limpiar cualquier clave que contenga 'auth' o 'user'
                Object.keys(localStorage).forEach(key => {
                    if (key.toLowerCase().includes('auth') || key.toLowerCase().includes('user')) {
                        localStorage.removeItem(key);
                    }
                });
                
                Object.keys(sessionStorage).forEach(key => {
                    if (key.toLowerCase().includes('auth') || key.toLowerCase().includes('user')) {
                        sessionStorage.removeItem(key);
                    }
                });
                
                console.log('✅ Storage limpiado');
            } catch (storageError) {
                console.warn('⚠️ Error limpiando storage:', storageError.message);
            }
            
            // 🔥 PASO 6: Limpiar Firebase persistence
            try {
                if (window.firebase && window.firebase.auth) {
                    const auth = window.firebase.auth();
                    if (auth && auth.setPersistence) {
                        await auth.setPersistence(window.firebase.auth.Auth.Persistence.NONE);
                        console.log('✅ Firebase persistence desactivado');
                    }
                }
            } catch (persistenceError) {
                console.warn('⚠️ Error desactivando persistence:', persistenceError.message);
            }
            
            console.log('✅ Proceso de logout completado');
            this.showNotification('Sesión cerrada exitosamente', 'success');
            
            // 🔥 PASO 7: Redirección forzada con parámetro de logout
            console.log('🔄 Redirigiendo a login...');
            setTimeout(() => {
                // Agregar parámetro para indicar que es un logout intencional
                const loginUrl = 'login.html?logout=true&t=' + Date.now();
                console.log('🔗 Redirigiendo a:', loginUrl);
                
                // Usar replace para evitar que puedan volver atrás
                window.location.replace(loginUrl);
                
                // Fallback adicional en caso de que replace no funcione
                setTimeout(() => {
                    if (!window.location.href.includes('login.html')) {
                        console.log('🔄 Forzando redirección adicional...');
                        window.location.href = loginUrl;
                        
                        // Último recurso: reload a login
                        setTimeout(() => {
                            if (!window.location.href.includes('login.html')) {
                                window.location.reload();
                                window.location.href = 'login.html';
                            }
                        }, 1000);
                    }
                }, 1500);
            }, 1000);
            
        } catch (error) {
            console.error('❌ Error crítico en logout:', error);
            
            // Logout forzado en caso de error
            console.log('🚨 Ejecutando logout forzado...');
            
            // Limpiar todo de forma brutal
            if (window.authService) {
                window.authService.currentUser = null;
                window.authService.userPermissions = null;
            }
            
            // Limpiar storage completamente
            localStorage.clear();
            sessionStorage.clear();
            
            this.showNotification('Error en logout. Limpiando sesión y redirigiendo...', 'warning');
            
            // Redirección forzada inmediata con parámetro
            setTimeout(() => {
                const loginUrl = 'login.html?logout=forced&t=' + Date.now();
                window.location.replace(loginUrl);
            }, 2000);
        }
    }

    setupGlobalEventListeners() {
        // Global modal functions
        window.openModal = (type, id = null) => {
            if (window.modalManager && window.modalManager.open) {
                window.modalManager.open(type, id);
            } else {
                console.warn('ModalManager no disponible');
            }
        };

        window.closeModal = () => {
            if (window.modalManager && window.modalManager.close) {
                window.modalManager.close();
            }
        };

        window.editItem = (type, id) => {
            window.openModal(type, id);
        };

        // Función DELETE compatible
        window.deleteItem = async (type, id) => {
            console.log(`🗑️ Attempting to delete ${type} with id: ${id}`);
            
            const confirmed = await this.showConfirmationModal(
                'Confirmar eliminación',
                '¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.'
            );
            
            if (!confirmed) return;

            try {
                if (!window.dataService) {
                    throw new Error('DataService no disponible');
                }

                const collectionName = window.dataService.getCollectionName ? 
                                     window.dataService.getCollectionName(type) : type;
                
                await window.dataService.delete(collectionName, id);
                
                this.showNotification('Registro eliminado exitosamente', 'success');
                
                // Invalidar cache si existe
                if (window.smartCache) {
                    window.smartCache.invalidate(`collection_${collectionName}`);
                }
                
                // Refresh current tab
                await this.refreshCurrentTab();
                
            } catch (error) {
                console.error('Delete error:', error);
                this.showNotification('Error al eliminar: ' + error.message, 'error');
            }
        };

        // Global refresh function
        this.refreshCurrentTab = () => {
            this.loadTabData(this.currentTab);
        };
        window.refreshCurrentTab = this.refreshCurrentTab;
    }

    showConfirmationModal(title, message) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal confirmation-modal';
            modal.style.display = 'flex';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3 class="modal-title">${title}</h3>
                    </div>
                    <div class="modal-body" style="padding: 1rem 0;">
                        <p style="color: white; margin: 0;">${message}</p>
                    </div>
                    <div class="form-actions">
                        <button class="btn btn-danger confirm-yes">
                            Sí, confirmar
                        </button>
                        <button class="btn btn-primary confirm-no">
                            Cancelar
                        </button>
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

    initializeLucideIcons() {
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
    }

    async showTab(tabId) {
        if (!this.initialized) {
            console.warn('CRM not initialized yet');
            return;
        }

        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // Show tab content
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        const tabContent = document.getElementById(tabId);
        if (tabContent) {
            tabContent.classList.add('active');
        }

        this.currentTab = tabId;

        // Log navigation if possible
        if (window.authService.logAction) {
            await window.authService.logAction('navigate', 'ui', { tab: tabId });
        }

        // Load tab data
        await this.loadTabData(tabId);
    }

    async loadTabData(tabId) {
        try {
            console.log(`📊 Cargando datos para tab: ${tabId}`);

            if (tabId === 'dashboard') {
                await this.loadDashboard();
            } 
            // Reportes
            else if (tabId === 'reportes-ventas' && window.reportesManager) {
                await this.safeLoadManager('reportesManager', 'loadVentasReport');
            }
            else if (tabId === 'reportes-compras' && window.reportesManager) {
                await this.safeLoadManager('reportesManager', 'loadComprasReport');
            }
            else if (tabId === 'reportes-productos' && window.reportesProductos) {
                await this.safeLoadManager('reportesProductos', 'initialize');
            }
            // Balance
            else if (tabId === 'balance' && window.balanceManager) {
                await this.safeLoadManager('balanceManager', 'initialize');
            }
            // Password
            else if (tabId === 'cambiar-password' && window.passwordManager) {
                await this.safeLoadManager('passwordManager', 'initialize');
            }
            // Permisos
            else if (tabId === 'permisos' && window.permissionTabManager) {
                await this.safeLoadManager('permissionTabManager', 'initialize');
            }
            // Tabs con pagination manager
            else if (this.paginationManagers[tabId]) {
                await this.paginationManagers[tabId].loadPage(1);
            } 
            else {
                console.warn(`No hay manager encontrado para tab: ${tabId}`);
            }
        } catch (error) {
            console.error(`Error cargando datos para ${tabId}:`, error);
            this.showNotification(`Error al cargar ${tabId}: ${error.message}`, 'error');
        }
    }

    // Método auxiliar para cargar managers de forma segura
    async safeLoadManager(managerName, methodName) {
        try {
            const manager = window[managerName];
            if (manager && typeof manager[methodName] === 'function') {
                await manager[methodName]();
                console.log(`✅ ${managerName}.${methodName}() ejecutado exitosamente`);
            } else {
                console.warn(`⚠️ ${managerName}.${methodName} no disponible`);
            }
        } catch (error) {
            console.error(`❌ Error ejecutando ${managerName}.${methodName}:`, error);
            throw error;
        }
    }

    async loadDashboard() {
        try {
            console.log('📊 Cargando dashboard...');
            
            // 🔥 VERIFICAR DATASERVICE Y CONEXIÓN A BD
            if (!window.dataService) {
                console.warn('⚠️ DataService no disponible, mostrando dashboard básico');
                this.loadBasicDashboard();
                return;
            }

            // Verificar si dataService tiene conexión a base de datos
            if (!window.dataService.db && window.dataService.getDB) {
                try {
                    const db = window.dataService.getDB();
                    if (!db) {
                        console.warn('⚠️ Base de datos no disponible, mostrando dashboard básico');
                        this.loadBasicDashboard();
                        return;
                    }
                } catch (dbError) {
                    console.warn('⚠️ Error verificando base de datos:', dbError.message);
                    this.loadBasicDashboard();
                    return;
                }
            }

            const collections = [
                'clientes', 'empleados', 'tb_productos', 'tb_pedido',
                'TB_COMPRAS', 'TB_PROVEEDORES', 'TB_ESTADO', 'entregas'
            ];
            
            console.log('📊 Intentando cargar datos de colecciones...');
            
            const counts = await Promise.all(
                collections.map(async (collection) => {
                    try {
                        const data = await window.dataService.getAll(collection);
                        console.log(`✅ ${collection}: ${data.length} registros`);
                        return data.length;
                    } catch (error) {
                        console.warn(`⚠️ Error loading ${collection}:`, error.message);
                        
                        // Si es error de permisos, registrar y continuar
                        if (error.message.includes('Missing or insufficient permissions')) {
                            console.warn(`🔒 Sin permisos para ${collection}`);
                        }
                        
                        return 0;
                    }
                })
            );

            // Verificar si todos los counts son 0 (posible problema de permisos)
            const totalRecords = counts.reduce((sum, count) => sum + count, 0);
            
            if (totalRecords === 0) {
                console.warn('⚠️ No se pudieron cargar datos (posible problema de permisos)');
                this.loadOfflineDashboard();
                return;
            }

            const stats = [
                { label: 'Clientes', value: counts[0], class: 'green' },
                { label: 'Empleados', value: counts[1], class: 'blue' },
                { label: 'Productos', value: counts[2], class: 'yellow' },
                { label: 'Pedidos', value: counts[3], class: 'purple' },
                { label: 'Compras', value: counts[4], class: 'indigo' },
                { label: 'Proveedores', value: counts[5], class: 'red' },
                { label: 'Estados', value: counts[6], class: 'green' },
                { label: 'Entregas', value: counts[7], class: 'blue' }
            ];

            this.renderDashboard(stats);
            
            console.log('✅ Dashboard cargado correctamente');
            
        } catch (error) {
            console.error('❌ Dashboard loading error:', error);
            
            // En caso de error, mostrar dashboard offline
            console.log('🔄 Cargando dashboard offline como fallback...');
            this.loadOfflineDashboard();
        }
    }

    // 🆕 NUEVO: Dashboard offline cuando hay problemas de permisos
    loadOfflineDashboard() {
        console.log('📴 Cargando dashboard en modo offline...');
        
        const stats = [
            { label: 'Clientes', value: '🔒', class: 'green' },
            { label: 'Empleados', value: '🔒', class: 'blue' },
            { label: 'Productos', value: '🔒', class: 'yellow' },
            { label: 'Pedidos', value: '🔒', class: 'purple' },
            { label: 'Compras', value: '🔒', class: 'indigo' },
            { label: 'Proveedores', value: '🔒', class: 'red' }
        ];
        
        this.renderOfflineDashboard(stats);
    }

    // 🆕 NUEVO: Renderizar dashboard offline
    renderOfflineDashboard(stats) {
        const statsGrid = document.getElementById('stats-grid');
        if (!statsGrid) return;

        try {
            const user = window.authService.getCurrentUser();
            const fallbackUser = user || { nombre: 'Usuario Sistema', rol: 'USER' };
            
            let dashboardContent = `
                <div style="grid-column: 1 / -1; text-align: center; margin-bottom: 2rem;">
                    <h3 style="color: white; margin-bottom: 1rem;">
                        Bienvenido, ${fallbackUser.nombre || 'Usuario'}
                        <span style="font-size: 0.875rem; opacity: 0.8;">(${fallbackUser.rol || 'Usuario'})</span>
                    </h3>
                    <div style="background: rgba(255, 193, 7, 0.2); border-radius: 0.5rem; padding: 1rem; margin: 1rem 0; border: 1px solid rgba(255, 193, 7, 0.3);">
                        <div style="color: #ffc107; font-weight: 600; margin-bottom: 0.5rem;">
                            🔒 Modo Sin Conexión a Base de Datos
                        </div>
                        <div style="color: rgba(255, 255, 255, 0.9); font-size: 0.875rem;">
                            No se pudieron cargar los datos. Posibles causas:
                            <br>• Sin permisos de Firestore configurados
                            <br>• Problema de conectividad
                            <br>• Usuario no autenticado
                        </div>
                        <button onclick="location.reload()" style="background: #ffc107; color: #000; border: none; padding: 0.5rem 1rem; border-radius: 0.375rem; margin-top: 1rem; cursor: pointer; font-weight: 600;">
                            🔄 Reintentar
                        </button>
                    </div>
                </div>
            `;

            dashboardContent += stats.map(stat => `
                <div class="stat-card ${stat.class}" style="opacity: 0.7;">
                    <div class="stat-number">${stat.value}</div>
                    <div class="stat-label">${stat.label}</div>
                </div>
            `).join('');

            // Agregar instrucciones para desarrolladores
            dashboardContent += `
                <div style="grid-column: 1 / -1; margin-top: 2rem; background: rgba(59, 130, 246, 0.1); border-radius: 0.75rem; padding: 1.5rem; border: 1px solid rgba(59, 130, 246, 0.2);">
                    <h4 style="color: #3b82f6; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                        🛠️ Para Desarrolladores
                    </h4>
                    <div style="color: rgba(255, 255, 255, 0.9); font-size: 0.875rem; line-height: 1.5;">
                        <strong>Para solucionar este problema:</strong><br>
                        1. Ve a <a href="https://console.firebase.google.com" target="_blank" style="color: #3b82f6;">Firebase Console</a><br>
                        2. Selecciona tu proyecto: <code>novo-crm-e9779</code><br>
                        3. Ve a Firestore Database → Rules<br>
                        4. Configura las reglas de seguridad (ver consola para detalles)<br>
                        5. O usa modo de desarrollo: <code>allow read, write: if true;</code>
                    </div>
                </div>
            `;

            statsGrid.innerHTML = dashboardContent;
            
        } catch (error) {
            console.error('❌ Error en dashboard offline:', error);
            statsGrid.innerHTML = '<div style="color: white; text-align: center; grid-column: 1 / -1;">Error crítico en dashboard</div>';
        }
    }

    loadBasicDashboard() {
        const stats = [
            { label: 'Clientes', value: '-', class: 'green' },
            { label: 'Empleados', value: '-', class: 'blue' },
            { label: 'Productos', value: '-', class: 'yellow' },
            { label: 'Pedidos', value: '-', class: 'purple' },
            { label: 'Compras', value: '-', class: 'indigo' },
            { label: 'Proveedores', value: '-', class: 'red' }
        ];
        
        this.renderDashboard(stats);
    }

    renderDashboard(stats) {
        const statsGrid = document.getElementById('stats-grid');
        if (!statsGrid) {
            console.warn('⚠️ Stats grid element not found');
            return;
        }

        try {
            const user = window.authService.getCurrentUser();
            
            // 🔥 VERIFICACIÓN CRÍTICA: Asegurar que user no sea null
            if (!user || typeof user !== 'object') {
                console.warn('⚠️ Usuario inválido en renderDashboard, usando fallback');
                const fallbackUser = {
                    nombre: 'Usuario Sistema',
                    rol: 'USER',
                    email: 'user@sistema.com'
                };
                
                let dashboardContent = `
                    <div style="grid-column: 1 / -1; text-align: center; margin-bottom: 2rem;">
                        <h3 style="color: white; margin-bottom: 1rem;">
                            Bienvenido, ${fallbackUser.nombre}
                            <span style="font-size: 0.875rem; opacity: 0.8;">(${fallbackUser.rol})</span>
                        </h3>
                    </div>
                `;

                dashboardContent += stats.map(stat => `
                    <div class="stat-card ${stat.class}">
                        <div class="stat-number">${stat.value}</div>
                        <div class="stat-label">${stat.label}</div>
                    </div>
                `).join('');

                statsGrid.innerHTML = dashboardContent;
                return;
            }
            
            let dashboardContent = `
                <div style="grid-column: 1 / -1; text-align: center; margin-bottom: 2rem;">
                    <h3 style="color: white; margin-bottom: 1rem;">
                        Bienvenido, ${user.nombre || user.name || 'Usuario'}
                        <span style="font-size: 0.875rem; opacity: 0.8;">(${user.rol || user.role || 'Usuario'})</span>
                    </h3>
                </div>
            `;

            dashboardContent += stats.map(stat => `
                <div class="stat-card ${stat.class}">
                    <div class="stat-number">${stat.value}</div>
                    <div class="stat-label">${stat.label}</div>
                </div>
            `).join('');

            statsGrid.innerHTML = dashboardContent;
            
        } catch (error) {
            console.error('❌ Error renderizando dashboard:', error);
            
            // Fallback básico en caso de error
            try {
                statsGrid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center;">
                        <h3 style="color: white;">Panel de Control</h3>
                    </div>
                    ${stats.map(stat => `
                        <div class="stat-card ${stat.class}">
                            <div class="stat-number">${stat.value}</div>
                            <div class="stat-label">${stat.label}</div>
                        </div>
                    `).join('')}
                `;
            } catch (fallbackError) {
                console.error('❌ Error crítico en renderDashboard fallback:', fallbackError);
                statsGrid.innerHTML = '<div style="color: white; text-align: center;">Error cargando dashboard</div>';
            }
        }
    }

    // Performance monitoring básico
    getPerformanceStats() {
        const user = window.authService.getCurrentUser();
        return {
            currentTab: this.currentTab,
            initialized: this.initialized,
            paginationManagers: Object.keys(this.paginationManagers).length,
            user: user ? {
                email: user.email,
                rol: user.rol || user.role,
                nombre: user.nombre || user.name
            } : null
        };
    }

    enableDebugMode() {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('🔧 Habilitando modo debug...');
            
            window.crmDebug = {
                getUser: () => window.authService.getCurrentUser(),
                getStats: () => this.getPerformanceStats(),
                clearCache: () => window.smartCache ? window.smartCache.clear() : console.log('No cache available'),
                forceLogout: () => this.logout(),
                showTab: (tabId) => this.showTab(tabId),
                reloadTab: () => this.loadTabData(this.currentTab)
            };
            
            console.log('✅ Modo debug habilitado. Usa window.crmDebug para comandos de debug');
        }
    }
}

// Event listener for DOM ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔄 DOM cargado, iniciando CRM...');
    
    // 🔥 PATCH: Inicializar Firebase si no está inicializado
    try {
        if (window.firebase && window.firebase.apps.length === 0) {
            console.log('🔥 Inicializando Firebase...');
            
            // Configuración Firebase desde firebase.js
            if (window.firebaseConfig) {
                window.firebase.initializeApp(window.firebaseConfig);
                console.log('✅ Firebase inicializado con configuración global');
                
                // Inicializar dataService.db si existe
                if (window.dataService && !window.dataService.db) {
                    window.dataService.db = window.firebase.firestore();
                    console.log('✅ DataService conectado a Firestore');
                }
            }
        } else if (window.firebase && window.firebase.apps.length > 0) {
            console.log('✅ Firebase ya inicializado');
            
            // Verificar conexión de dataService
            if (window.dataService && !window.dataService.db) {
                window.dataService.db = window.firebase.firestore();
                console.log('✅ DataService conectado a Firestore existente');
            }
        }
    } catch (firebaseError) {
        console.warn('⚠️ Error inicializando Firebase:', firebaseError.message);
        console.log('📋 Continuando sin conexión a base de datos...');
    }
    
    try {
        // Create global CRM app instance
        window.crmApp = new CRMApplication();
        await window.crmApp.initialize();
        
        // Enable debug mode in development
        window.crmApp.enableDebugMode();
        
        console.log('✅ CRM Application inicializado exitosamente');
        
    } catch (error) {
        console.error('❌ Error initializing CRM:', error);
        
        // Mostrar error de forma compatible
        if (window.notificationService && window.notificationService.error) {
            window.notificationService.error('Error crítico al inicializar el sistema');
        } else {
            console.error('Error crítico al inicializar el sistema');
            alert('Error al inicializar el sistema. Revisa la consola para más detalles.');
        }
    }
});

// Funciones globales para compatibilidad
window.logout = function() {
    if (window.crmApp && window.crmApp.logout) {
        window.crmApp.logout();
    } else {
        console.log('Logout function not available');
        window.location.replace('login.html');
    }
};

window.checkAuthState = function() {
    return window.authService ? window.authService.isAuthenticated() : true;
};

window.getCurrentUser = function() {
    return window.authService ? window.authService.getCurrentUser() : null;
};

// Global error handler para desarrollo
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.addEventListener('error', (event) => {
        console.error('🚨 Global Error:', {
            message: event.error?.message,
            stack: event.error?.stack,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
        });
    });
    
    console.log('🔧 Global error handler habilitado para desarrollo');
}