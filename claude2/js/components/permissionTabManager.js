/**
 * Permission Manager - Sistema de gestión de permisos integrado
 * Versión con sintaxis de clase ES6 corregida
 */

class PermissionTabManager {
    constructor() {
        this.currentUser = null;
        this.workerTypes = [];
        this.permissions = {};
        this.isAdmin = false;
        this.isInitialized = false;
        this.debugMode = false;
        
        // Evitar usar 'interface' como nombre de propiedad
        this.systemModules = [
            { id: 'dashboard', name: 'Dashboard', icon: 'bar-chart-3', required: true },
            { id: 'clientes', name: 'Clientes', icon: 'users' },
            { id: 'empleados', name: 'Empleados', icon: 'user-check' },
            { id: 'productos', name: 'Productos', icon: 'package' },
            { id: 'pedidos', name: 'Pedidos', icon: 'shopping-cart' },
            { id: 'compras', name: 'Compras', icon: 'shopping-bag' },
            { id: 'proveedores', name: 'Proveedores', icon: 'truck' },
            { id: 'estados', name: 'Estados', icon: 'flag' },
            { id: 'entregas', name: 'Entregas', icon: 'package-check' },
            { id: 'tipos-contacto', name: 'Tipos Contacto', icon: 'contact' },
            { id: 'tipos-pago', name: 'Tipos Pago', icon: 'credit-card' },
            { id: 'tipos-trabajador', name: 'Tipos Trabajador', icon: 'briefcase' },
            { id: 'reportes-ventas', name: 'Reportes de Ventas', icon: 'chart-line' },
            { id: 'reportes-compras', name: 'Reportes de Compras', icon: 'chart-bar' },
            { id: 'reportes-productos', name: 'Reportes de Productos', icon: 'chart-pie' },
            { id: 'balance', name: 'Balance', icon: 'calculator' },
            { id: 'cambiar-password', name: 'Cambiar Contraseña', icon: 'key' },
            { id: 'permisos', name: 'Permisos', icon: 'shield-check' }
        ];
    }

    log(message, data = null) {
        if (this.debugMode) {
            console.log(`[PermissionTabManager] ${message}`, data || '');
        }
    }

    // NUEVA FUNCIÓN: Esperar a que Firebase esté listo
    async waitForFirebase() {
        console.log('Esperando a Firebase...');
        
        const maxWait = 15000; // 15 segundos máximo
        const interval = 500; // Check cada 500ms
        let elapsed = 0;
        
        while (elapsed < maxWait) {
            // Verificar si Firebase y dataService están listos
            if (window.firebaseManager && 
                window.firebaseManager.isInitialized() && 
                window.dataService &&
                window.firebaseManager.getDB()) {
                console.log('Firebase está listo');
                return true;
            }
            
            await new Promise(resolve => setTimeout(resolve, interval));
            elapsed += interval;
            
            if (elapsed % 2000 === 0) {
                console.log(`Esperando Firebase... (${elapsed/1000}s)`);
            }
        }
        
        throw new Error('Firebase no se inicializó en el tiempo esperado');
    }

    async initialize() {
        try {
            this.log('Iniciando sistema de permisos...');
            
            // Reportar progreso si el loading manager existe
            if (window.permissionsLoadingManager && window.permissionsLoadingManager.isVisible()) {
                window.permissionsLoadingManager.updateStep(2, 'Verificando usuario...', 'Obteniendo datos de sesión');
            }
            
            // Esperar a que Firebase esté listo
            await this.waitForFirebase();
            
            if (window.permissionsLoadingManager && window.permissionsLoadingManager.isVisible()) {
                window.permissionsLoadingManager.updateStep(2, 'Cargando tipos de trabajador...', 'Consultando configuración');
            }
            
            await this.loadCurrentUser();
            await this.loadWorkerTypes();
            
            if (window.permissionsLoadingManager && window.permissionsLoadingManager.isVisible()) {
                window.permissionsLoadingManager.updateStep(2, 'Obteniendo permisos...', 'Configurando accesos del usuario');
            }
            
            await this.loadPermissions();
            
            this.setupPermissionTab();
            this.togglePermissionTab();
            
            this.isInitialized = true;
            this.log('Sistema de permisos inicializado correctamente');
            
            if (window.permissionsLoadingManager && window.permissionsLoadingManager.isVisible()) {
                window.permissionsLoadingManager.updateStep(3, 'Aplicando permisos...', 'Configurando interfaz de usuario');
            }
            
            // Aplicar permisos después de todo estar listo
            setTimeout(async () => {
                await this.applyPermissionsToInterface();
                
                // Notificar que los permisos están completamente aplicados
                if (window.permissionsLoadingManager && window.permissionsLoadingManager.isVisible()) {
                    window.permissionsLoadingManager.updateStep(4, 'Finalizando configuración...', 'Sistema listo para usar');
                }
            }, 1000);
            
        } catch (error) {
            this.log('Error en inicialización:', error);
            
            if (window.permissionsLoadingManager && window.permissionsLoadingManager.isVisible()) {
                window.permissionsLoadingManager.updateStep(4, 'Error en permisos', 'Aplicando configuración por defecto');
            }
            
            this.enableFallbackMode();
        }
    }

    async loadCurrentUser() {
        try {
            let loggedUser = null;
            
            // 1. Obtener usuario del sistema de login existente
            if (window.getCurrentUser) {
                loggedUser = window.getCurrentUser();
                console.log('Usuario obtenido de getCurrentUser():', loggedUser);
            }
            
            // 2. Si no funciona getCurrentUser, obtener de la sesión
            if (!loggedUser) {
                const sessionData = localStorage.getItem('novo_crm_session');
                if (sessionData) {
                    const session = JSON.parse(sessionData);
                    console.log('Datos de sesión encontrados:', session);
                    
                    // Crear objeto de usuario desde la sesión
                    loggedUser = {
                        id: session.userId,
                        dni: session.dni,
                        email: session.email,
                        nombre: session.nombre || session.name,
                        tipo_trabajador: session.tipo_trabajador
                    };
                }
            }
            
            // 3. Resolver información completa del usuario
            if (loggedUser) {
                await this.resolveUserFromSession(loggedUser);
            } else {
                console.warn('No se encontró usuario logueado');
                this.setDefaultUser();
            }

            this.isAdmin = this.currentUser?.type?.toLowerCase() === 'programador';
            console.log('Usuario final configurado:', this.currentUser);
            console.log('Es administrador:', this.isAdmin);
            
        } catch (error) {
            console.error('Error al cargar usuario:', error);
            this.setDefaultUser();
        }
    }

    async resolveUserFromSession(sessionUser) {
        try {
            // Configurar usuario base
            this.currentUser = {
                id: sessionUser.id,
                dni: sessionUser.dni,
                name: sessionUser.nombre || sessionUser.name || 'Usuario Logueado',
                email: sessionUser.email || 'usuario@sistema.com',
                type: 'Usuario' // Por defecto
            };
            
            // Verificar que Firebase esté disponible
            if (!window.dataService || !window.firebaseManager?.isInitialized()) {
                console.warn('Firebase no está listo, usando datos básicos del usuario');
                return;
            }
            
            // Obtener información completa del empleado desde la base de datos
            if (sessionUser.dni) {
                const empleados = await window.dataService.getAll('empleados');
                const empleado = empleados.find(emp => 
                    emp.dni === sessionUser.dni || emp.id === sessionUser.id
                );
                
                if (empleado) {
                    console.log('Empleado encontrado:', empleado);
                    this.currentUser.name = `${empleado.nombre} ${empleado.apellido}`.trim();
                    this.currentUser.email = empleado.email || this.currentUser.email;
                    
                    // CAMBIO: Obtener tipo de trabajador usando campo 'tipo'
                    if (empleado.tipo) {  // <-- CAMBIO AQUÍ: tipo en lugar de tipo_trabajador
                        const tiposTrabajador = await window.dataService.getAll('tipos_trabajador');
                        const tipoTrabajador = tiposTrabajador.find(tipo => 
                            tipo.id === empleado.tipo  // <-- CAMBIO AQUÍ: tipo en lugar de tipo_trabajador
                        );
                        
                        if (tipoTrabajador) {
                            this.currentUser.type = tipoTrabajador.descripcion;
                            console.log('Tipo asignado:', tipoTrabajador.descripcion);
                        }
                    }
                }
            }
            
        } catch (error) {
            console.error('Error al resolver usuario desde sesión:', error);
        }
    }

    setDefaultUser() {
        this.currentUser = {
            name: 'Usuario Invitado',
            type: 'Usuario',
            email: 'guest@sistema.com'
        };
        this.isAdmin = false;
    }

    async loadWorkerTypes() {
        try {
            if (window.dataService) {
                this.workerTypes = await window.dataService.getAll('tipos_trabajador');
            } else {
                // Fallback si no hay dataService
                this.workerTypes = [
                    { id: 'prog_001', descripcion: 'Programador' },
                    { id: 'admin_001', descripcion: 'Administrador' },
                    { id: 'user_001', descripcion: 'Usuario' }
                ];
            }
            this.log('Tipos de trabajador cargados:', this.workerTypes.length);
        } catch (error) {
            this.log('Error al cargar tipos de trabajador:', error);
            this.workerTypes = [];
        }
    }

    async loadPermissions() {
        try {
            this.permissions = {};
            
            if (window.dataService) {
                const permissionsData = await window.dataService.getAll('interface_permissions');
                permissionsData.forEach(permission => {
                    this.permissions[permission.id] = permission;
                });
            }
            
            // Inicializar permisos por defecto
            for (const workerType of this.workerTypes) {
                if (!this.permissions[workerType.id]) {
                    this.permissions[workerType.id] = this.getDefaultPermissions(workerType.descripcion);
                }
            }
            
            this.log('Permisos cargados:', Object.keys(this.permissions).length);
        } catch (error) {
            this.log('Error al cargar permisos:', error);
            this.initializeDefaultPermissions();
        }
    }

    getDefaultPermissions(workerTypeDescription) {
        const isAdmin = workerTypeDescription?.toLowerCase() === 'programador';
        const permissions = {};
        
        this.systemModules.forEach(moduleItem => {
            if (isAdmin || moduleItem.required) {
                permissions[moduleItem.id] = true;
            } else {
                const basicModules = ['dashboard', 'clientes', 'productos'];
                permissions[moduleItem.id] = basicModules.includes(moduleItem.id);
            }
        });
        
        return permissions;
    }

    initializeDefaultPermissions() {
        this.permissions = {};
        for (const workerType of this.workerTypes) {
            this.permissions[workerType.id] = this.getDefaultPermissions(workerType.descripcion);
        }
    }

    togglePermissionTab() {
        const permissionNavBtn = document.getElementById('permisos-nav-btn');
        if (permissionNavBtn) {
            permissionNavBtn.style.display = this.isAdmin ? '' : 'none';
        }
    }

    setupPermissionTab() {
        if (window.crmApp && window.crmApp.showTab) {
            const originalShowTab = window.crmApp.showTab.bind(window.crmApp);
            
            window.crmApp.showTab = async (tabId) => {
                const result = await originalShowTab(tabId);
                
                if (tabId === 'permisos' && this.isAdmin) {
                    setTimeout(() => {
                        this.loadPermissionTabContent();
                    }, 100);
                }
                
                return result;
            };
        }
    }

    // ===== NUEVAS FUNCIONES DE APLICACIÓN DE PERMISOS =====

    // Obtener permisos del usuario actual logueado
    async getCurrentUserPermissions() {
        try {
            if (!this.currentUser) {
                console.warn('No hay usuario actual definido');
                return this.getDefaultUserPermissions();
            }

            // Si es programador, tiene acceso total
            if (this.isAdmin) {
                console.log('Usuario administrador - acceso total');
                return this.getAllPermissions();
            }

            // Buscar el tipo de trabajador del usuario actual
            const userWorkerType = await this.findUserWorkerType();
            if (!userWorkerType) {
                console.warn('No se encontró tipo de trabajador, usando permisos por defecto');
                return this.getDefaultUserPermissions();
            }

            // Intentar obtener permisos específicos del tipo de trabajador
            try {
                const userPermissions = await this.loadPermissionsForWorkerType(userWorkerType.id);
                if (userPermissions) {
                    console.log(`Permisos cargados para ${userWorkerType.descripcion}:`, userPermissions);
                    return userPermissions;
                }
            } catch (permError) {
                console.warn('Error cargando permisos específicos:', permError);
            }

            // Si no se pueden cargar permisos específicos, usar defaults para el tipo
            console.warn(`Usando permisos por defecto para: ${userWorkerType.descripcion}`);
            return this.getDefaultPermissions(userWorkerType.descripcion);

        } catch (error) {
            console.error('Error obteniendo permisos del usuario:', error);
            return this.getDefaultUserPermissions();
        }
    }

    // Cargar permisos específicos de Firebase para un tipo de trabajador
    async loadPermissionsForWorkerType(workerTypeId) {
        try {
            if (!window.dataService) return null;
            
            const permissionDoc = await window.dataService.getById('interface_permissions', workerTypeId);
            if (!permissionDoc) return null;
            
            // Extraer solo los permisos de módulos, excluyendo metadatos
            const permissions = {};
            this.systemModules.forEach(module => {
                permissions[module.id] = permissionDoc[module.id] === true;
            });
            
            return permissions;
            
        } catch (error) {
            console.error('Error cargando permisos desde Firebase:', error);
            return null;
        }
    }

    async findUserWorkerType() {
        try {
            if (!this.currentUser || !window.dataService) {
                return null;
            }

            // Verificar que Firebase esté disponible
            if (!window.firebaseManager?.isInitialized()) {
                console.warn('Firebase no está listo para buscar tipo de trabajador');
                return null;
            }

            // Buscar empleado por DNI o ID
            const empleados = await window.dataService.getAll('empleados');
            const empleado = empleados.find(emp => 
                emp.dni === this.currentUser.dni || 
                emp.id === this.currentUser.id
            );

            if (!empleado || !empleado.tipo) {  // <-- CAMBIO AQUÍ: tipo en lugar de tipo_trabajador
                console.warn('Empleado no encontrado o sin tipo de trabajador');
                return null;
            }

            // Buscar tipo de trabajador
            const tipoTrabajador = this.workerTypes.find(tipo => 
                tipo.id === empleado.tipo  // <-- CAMBIO AQUÍ: tipo en lugar de tipo_trabajador
            );

            if (tipoTrabajador) {
                console.log('Tipo de trabajador encontrado:', tipoTrabajador.descripcion);
            }

            return tipoTrabajador;

        } catch (error) {
            console.error('Error buscando tipo de trabajador:', error);
            return null;
        }
    }

    // Permisos mínimos por defecto
    getDefaultUserPermissions() {
        return {
            dashboard: true,  // Siempre permitido
            clientes: false,
            empleados: false,
            productos: false,
            pedidos: false,
            compras: false,
            proveedores: false,
            estados: false,
            entregas: false,
            'tipos-contacto': false,
            'tipos-pago': false,
            'tipos-trabajador': false
        };
    }

    // Todos los permisos (para admin)
    getAllPermissions() {
        const allPermissions = {};
        this.systemModules.forEach(module => {
            allPermissions[module.id] = true;
        });
        return allPermissions;
    }

    // FUNCIÓN PRINCIPAL: Aplicar permisos a la interfaz
    async applyPermissionsToInterface() {
        try {
            console.log('🔒 Aplicando permisos a la interfaz...');
            
            // Verificar que todo esté listo
            if (!this.isInitialized) {
                console.warn('Sistema de permisos no está inicializado');
                return;
            }

            if (!window.crmApp) {
                console.warn('CRM App no está disponible');
                return;
            }

            const userPermissions = await this.getCurrentUserPermissions();
            console.log('Permisos del usuario actual:', userPermissions);

            // Aplicar a botones de navegación
            this.hideUnauthorizedNavButtons(userPermissions);

            // Interceptar cambios de pestaña
            this.interceptTabNavigation(userPermissions);

            console.log('✅ Permisos aplicados exitosamente');
            
            // NUEVO: Disparar evento personalizado cuando los permisos estén completamente aplicados
            const permissionsReadyEvent = new CustomEvent('permissionsReady', {
                detail: { 
                    userPermissions,
                    isAdmin: this.isAdmin,
                    userName: this.currentUser?.name 
                }
            });
            document.dispatchEvent(permissionsReadyEvent);

        } catch (error) {
            console.error('❌ Error aplicando permisos:', error);
        }
    }
    // Ocultar botones de navegación no autorizados
    hideUnauthorizedNavButtons(permissions) {
        this.systemModules.forEach(module => {
            const navButton = document.querySelector(`[data-tab="${module.id}"]`);
            if (navButton) {
                const hasPermission = permissions[module.id] === true;
                
                if (hasPermission) {
                    navButton.style.display = '';
                    navButton.removeAttribute('disabled');
                    console.log(`✅ ${module.id}: PERMITIDO`);
                } else {
                    navButton.style.display = 'none';
                    console.log(`🚫 ${module.id}: BLOQUEADO`);
                }
            }
        });
    }

    // Interceptar navegación entre pestañas
    interceptTabNavigation(userPermissions) {
        if (!window.crmApp || !window.crmApp.showTab) return;
        
        // Guardar función original si no lo hemos hecho
        if (!window.crmApp._originalShowTab) {
            window.crmApp._originalShowTab = window.crmApp.showTab.bind(window.crmApp);
        }
        
        // Sobrescribir con verificación de permisos
        window.crmApp.showTab = (tabId) => {
            console.log(`🔍 Intentando acceder a: ${tabId}`);
            
            // Dashboard siempre permitido
            if (tabId === 'dashboard') {
                return window.crmApp._originalShowTab(tabId);
            }
            
            // Verificar permisos
            const hasPermission = userPermissions[tabId] === true;
            
            if (!hasPermission) {
                console.warn(`🚫 Acceso denegado a: ${tabId}`);
                alert(`No tienes permisos para acceder al módulo: ${tabId.replace('-', ' ')}`);
                return false;
            }
            
            // Si tiene permisos, ejecutar función original
            console.log(`✅ Acceso permitido a: ${tabId}`);
            return window.crmApp._originalShowTab(tabId);
        };
    }

    // Verificar si usuario tiene permiso para un módulo específico
    async hasPermissionFor(moduleId) {
        try {
            const userPermissions = await this.getCurrentUserPermissions();
            return userPermissions[moduleId] === true;
        } catch (error) {
            console.error('Error verificando permisos:', error);
            return false;
        }
    }

    // ===== FUNCIONES ORIGINALES DE LA INTERFAZ DE PERMISOS =====

    loadPermissionTabContent() {
        try {
            this.renderUserInfo();
            this.renderStats();
            this.renderPermissions();
            this.enableAdminButtons();
            
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
        } catch (error) {
            this.log('Error al renderizar contenido:', error);
        }
    }

    renderUserInfo() {
        const userInfo = document.getElementById('permission-user-info');
        if (!userInfo) return;

        userInfo.innerHTML = `
            <div class="permission-user-avatar ${this.isAdmin ? 'admin' : 'regular'}">
                <i data-lucide="${this.isAdmin ? 'crown' : 'user'}"></i>
            </div>
            <div>
                <h4>${this.currentUser.name}</h4>
                <p style="margin: 5px 0; color: #94a3b8;">
                    <strong>${this.currentUser.type}</strong> • ${this.currentUser.email}
                </p>
                <p style="margin: 0; font-size: 0.85rem; color: #f59e0b; font-weight: bold;">
                    ${this.isAdmin ? '✨ Control Total del Sistema' : '👁️ Solo Visualización'}
                </p>
            </div>
        `;
    }

    renderStats() {
        const totalWorkers = this.workerTypes.length;
        const totalModules = this.systemModules.length;
        let activePermissions = 0;
        
        Object.values(this.permissions).forEach(workerPermissions => {
            if (workerPermissions && typeof workerPermissions === 'object') {
                activePermissions += Object.values(workerPermissions).filter(Boolean).length;
            }
        });
        
        const elements = {
            'perm-total-workers': totalWorkers,
            'perm-total-interfaces': totalModules,
            'perm-active-permissions': activePermissions,
            'perm-user-access': this.isAdmin ? totalModules : 0
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }

    renderPermissions() {
        const container = document.getElementById('permissions-container');
        if (!container) return;

        if (this.workerTypes.length === 0) {
            container.innerHTML = `
                <div class="loading-center">
                    <i data-lucide="alert-circle" style="font-size: 2rem; color: #f59e0b;"></i>
                    <h4>No hay tipos de trabajador configurados</h4>
                    <p style="color: #94a3b8;">Configure primero los tipos de trabajador.</p>
                </div>
            `;
            return;
        }

        const permissionsHTML = `
            <div class="worker-permissions-grid">
                ${this.workerTypes.map(workerType => this.renderWorkerTypeCard(workerType)).join('')}
            </div>
        `;

        container.innerHTML = permissionsHTML;
    }

    renderWorkerTypeCard(workerType) {
        const workerPermissions = this.permissions[workerType.id] || {};
        const isProgrammer = workerType.descripcion?.toLowerCase() === 'programador';
        
        return `
            <div class="worker-permission-card">
                <div class="worker-type-header">
                    <div class="worker-type-icon ${isProgrammer ? 'programmer' : 'regular'}">
                        <i data-lucide="${isProgrammer ? 'crown' : 'briefcase'}"></i>
                    </div>
                    <div class="worker-type-info">
                        <h4>${workerType.descripcion}</h4>
                        <span class="worker-type-badge ${isProgrammer ? 'admin' : ''}">
                            ${isProgrammer ? 'Administrador' : 'Usuario Regular'}
                        </span>
                    </div>
                </div>
                <div class="interfaces-permission-grid">
                    ${this.systemModules.map(moduleItem => 
                        this.renderModulePermission(workerType.id, moduleItem, workerPermissions, isProgrammer)
                    ).join('')}
                </div>
            </div>
        `;
    }

    renderModulePermission(workerId, moduleItem, workerPermissions, isProgrammer) {
        const hasPermission = workerPermissions[moduleItem.id] || false;
        const canModify = this.isAdmin && !isProgrammer;
        
        let statusClass = hasPermission ? 'enabled' : 'disabled';
        let statusText = hasPermission ? 'Habilitado' : 'Deshabilitado';
        
        if (isProgrammer) {
            statusClass = 'locked';
            statusText = 'Control Total';
        }
        
        const onClick = canModify ? `window.permissionManager.togglePermission('${workerId}', '${moduleItem.id}')` : 'void(0)';
        
        return `
            <div class="interface-permission-item ${statusClass}" 
                 onclick="${onClick}"
                 title="${moduleItem.name} - ${statusText}">
                <i class="interface-permission-icon" data-lucide="${moduleItem.icon}"></i>
                <div class="interface-permission-name">${moduleItem.name}</div>
                <div class="interface-permission-status ${statusClass}">${statusText}</div>
            </div>
        `;
    }

    enableAdminButtons() {
        if (this.isAdmin) {
            const saveBtn = document.getElementById('save-all-permissions-btn');
            const resetBtn = document.getElementById('reset-permissions-btn');
            
            if (saveBtn) saveBtn.disabled = false;
            if (resetBtn) resetBtn.disabled = false;
        }
    }

    togglePermission(workerId, moduleId) {
        if (!this.isAdmin) {
            alert('Solo los programadores pueden modificar permisos');
            return;
        }

        if (!this.permissions[workerId]) {
            this.permissions[workerId] = {};
        }
        
        this.permissions[workerId][moduleId] = !this.permissions[workerId][moduleId];
        
        this.renderPermissions();
        this.renderStats();
        
        const moduleName = this.systemModules.find(i => i.id === moduleId)?.name || moduleId;
        const workerName = this.workerTypes.find(w => w.id === workerId)?.descripcion || workerId;
        const status = this.permissions[workerId][moduleId] ? 'habilitado' : 'deshabilitado';
        
        console.log(`${moduleName} ${status} para ${workerName}`);
        
        setTimeout(() => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }, 100);
    }

    async saveAllPermissions() {
        if (!this.isAdmin) {
            alert('Solo los programadores pueden guardar cambios');
            return;
        }

        if (!window.dataService) {
            alert('Sistema de demostración - Los cambios no se guardan permanentemente');
            return;
        }

        try {
            console.log('💾 Iniciando guardado de permisos...');
            const db = window.firebaseManager.getDB();
            const batch = db.batch();
            
            for (const [workerId, permissions] of Object.entries(this.permissions)) {
                if (permissions && typeof permissions === 'object') {
                    console.log(`📝 Preparando permisos para worker: ${workerId}`);
                    
                    const permissionData = {
                        ...permissions,
                        updatedAt: new Date().toISOString(),
                        updatedBy: this.currentUser.email || 'sistema',
                        workerId: workerId
                    };
                    
                    // Usar set() con merge: true para crear o actualizar
                    const docRef = db.collection('interface_permissions').doc(workerId);
                    batch.set(docRef, permissionData, { merge: true });
                }
            }
            
            await batch.commit();
            console.log('✅ Permisos guardados exitosamente');
            alert('Permisos guardados exitosamente');
            
            // Invalidar cache
            if (window.smartCache) {
                window.smartCache.invalidate('collection_interface_permissions');
            }
            
        } catch (error) {
            console.error('❌ Error al guardar permisos:', error);
            alert('Error al guardar permisos: ' + error.message);
        }
    }

    async resetAllPermissions() {
        if (!this.isAdmin) {
            alert('Solo los programadores pueden resetear permisos');
            return;
        }

        if (!confirm('¿Resetear todos los permisos? Esta acción no se puede deshacer.')) {
            return;
        }

        this.initializeDefaultPermissions();
        await this.saveAllPermissions();
        this.renderPermissions();
        this.renderStats();
        
        setTimeout(() => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }, 100);
    }

    async refreshPermissions() {
        await this.loadWorkerTypes();
        await this.loadPermissions();
        this.loadPermissionTabContent();
    }

    enableFallbackMode() {
        this.log('Activando modo fallback');
        this.isInitialized = true;
    }

    getDebugInfo() {
        return {
            isInitialized: this.isInitialized,
            currentUser: this.currentUser,
            isAdmin: this.isAdmin,
            workerTypesCount: this.workerTypes.length,
            permissionsCount: Object.keys(this.permissions).length
        };
    }
}

// Crear instancia global ÚNICA
window.permissionManager = new PermissionTabManager();
console.log('PermissionManager instancia creada:', window.permissionManager);

// NO agregar DOMContentLoaded aquí - se manejará desde main.js

// Funciones globales de debug
window.debugCurrentUserPermissions = async function() {
    if (!window.permissionManager) {
        console.error('Permission manager no disponible');
        return;
    }
    
    console.log('=== DEBUG PERMISOS USUARIO ACTUAL ===');
    
    const manager = window.permissionManager;
    console.log('Usuario logueado:', manager.currentUser);
    console.log('Es admin:', manager.isAdmin);
    
    const workerType = await manager.findUserWorkerType();
    console.log('Tipo de trabajador:', workerType);
    
    const permissions = await manager.getCurrentUserPermissions();
    console.log('Permisos asignados:');
    
    Object.entries(permissions).forEach(([module, hasAccess]) => {
        const status = hasAccess ? '✅ PERMITIDO' : '❌ BLOQUEADO';
        console.log(`  ${module}: ${status}`);
    });
    
    return permissions;
};

window.reloadUserPermissions = async function() {
    if (window.permissionManager) {
        console.log('Recargando permisos...');
        await window.permissionManager.applyPermissionsToInterface();
        console.log('Permisos recargados');
    } else {
        console.error('Permission manager no disponible');
    }
};