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
            { id: 'tipos-trabajador', name: 'Tipos Trabajador', icon: 'briefcase' }
        ];
    }

    log(message, data = null) {
        if (this.debugMode) {
            console.log(`[PermissionTabManager] ${message}`, data || '');
        }
    }

    async initialize() {
        try {
            this.log('Iniciando sistema de permisos...');
            
            // NUEVO: Esperar a que Firebase esté listo
            await this.waitForFirebase();
            
            await this.loadCurrentUser();
            await this.loadWorkerTypes();
            await this.loadPermissions();
            
            this.setupPermissionTab();
            this.togglePermissionTab();
            
            this.isInitialized = true;
            this.log('Sistema de permisos inicializado correctamente');
            
            // NUEVO: Aplicar permisos después de todo estar listo
            setTimeout(async () => {
                await this.applyPermissionsToInterface();
            }, 1000);
            
        } catch (error) {
            this.log('Error en inicialización:', error);
            this.enableFallbackMode();
        }
    }

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
            this.currentUser = {
                id: sessionUser.id,
                dni: sessionUser.dni,
                name: sessionUser.nombre || sessionUser.name || 'Usuario Logueado',
                email: sessionUser.email || 'usuario@sistema.com',
                type: 'Usuario'
            };
            
            if (window.dataService && sessionUser.dni) {
                const empleados = await window.dataService.getAll('empleados');
                const empleado = empleados.find(emp => emp.dni === sessionUser.dni);
                
                if (empleado) {
                    this.currentUser.name = `${empleado.nombre} ${empleado.apellido}`.trim();
                    this.currentUser.email = empleado.email || this.currentUser.email;
                    
                    // CAMBIO: usar el campo "tipo" (que contiene el ID del tipo de trabajador)
                    if (empleado.tipo) {
                        const tiposTrabajador = await window.dataService.getAll('tipos_trabajador');
                        const tipoTrabajador = tiposTrabajador.find(tipo => tipo.id === empleado.tipo);
                        
                        if (tipoTrabajador) {
                            this.currentUser.type = tipoTrabajador.descripcion;
                            console.log('Tipo asignado:', tipoTrabajador.descripcion);
                        } else {
                            console.log('Tipo de trabajador no encontrado para ID:', empleado.tipo);
                        }
                    } else {
                        console.log('Campo "tipo" no encontrado en empleado');
                    }
                }
            }
            
        } catch (error) {
            console.error('Error al resolver usuario:', error);
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

    async resolveUserWorkerType(loggedUser) {
        try {
            this.currentUser = {
                name: loggedUser.nombre || loggedUser.name || 'Usuario Logueado',
                email: loggedUser.email || 'sin-email@sistema.com',
                type: 'Usuario', // Por defecto
                empleadoId: loggedUser.id || loggedUser.dni
            };
            
            // Obtener el tipo de trabajador desde la base de datos
            if (window.dataService && loggedUser.tipo_trabajador) {
                const tiposTrabajador = await window.dataService.getAll('tipos_trabajador');
                const tipoTrabajador = tiposTrabajador.find(tipo => 
                    tipo.id === loggedUser.tipo_trabajador
                );
                
                if (tipoTrabajador) {
                    this.currentUser.type = tipoTrabajador.descripcion;
                    console.log('Tipo de trabajador encontrado:', tipoTrabajador.descripcion);
                }
            }
            
            // Si no tiene tipo_trabajador, intentar buscar por email/dni en empleados
            else if (window.dataService) {
                const empleados = await window.dataService.getAll('empleados');
                const empleado = empleados.find(emp => 
                    emp.email === loggedUser.email || 
                    emp.dni === loggedUser.dni ||
                    emp.id === loggedUser.id
                );
                
                if (empleado && empleado.tipo_trabajador) {
                    const tiposTrabajador = await window.dataService.getAll('tipos_trabajador');
                    const tipoTrabajador = tiposTrabajador.find(tipo => 
                        tipo.id === empleado.tipo_trabajador
                    );
                    
                    if (tipoTrabajador) {
                        this.currentUser.type = tipoTrabajador.descripcion;
                        console.log('Tipo de trabajador encontrado via empleados:', tipoTrabajador.descripcion);
                    }
                }
            }
            
        } catch (error) {
            console.error('Error al resolver tipo de trabajador:', error);
        }
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
            
            // Interceptar tanto para permisos como para funcionalidad original
            window.crmApp.showTab = async (tabId) => {
                // Verificar permisos primero
                if (tabId !== 'dashboard') {
                    const hasPermission = await this.hasPermissionFor(tabId);
                    if (!hasPermission) {
                        console.warn(`Acceso denegado a pestaña: ${tabId}`);
                        alert(`No tienes permisos para acceder a este módulo`);
                        return false;
                    }
                }

                // Ejecutar función original
                const result = await originalShowTab(tabId);
                
                // Funcionalidad original para pestaña de permisos
                if (tabId === 'permisos' && this.isAdmin) {
                    setTimeout(() => {
                        this.loadPermissionTabContent();
                    }, 100);
                }
                
                return result;
            };
        }
    }

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
        
        const onClick = canModify ? `permissionTabManager.togglePermission('${workerId}', '${moduleItem.id}')` : 'void(0)';
        
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

    async applyPermissionsToInterface() {
        try {
            console.log('Aplicando permisos a la interfaz...');
            
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

            console.log('Permisos aplicados exitosamente');

        } catch (error) {
            console.error('Error aplicando permisos:', error);
        }
    }

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
            if (!this.currentUser) {
                console.warn('No hay usuario actual definido');
                return null;
            }

            // Verificar que Firebase esté disponible
            if (!window.dataService || !window.firebaseManager?.isInitialized()) {
                console.warn('Firebase no está listo, usando modo fallback');
                return null;
            }

            // Buscar empleado por DNI o ID
            const empleados = await window.dataService.getAll('empleados');
            const empleado = empleados.find(emp => 
                emp.dni === this.currentUser.dni || 
                emp.id === this.currentUser.id
            );

            if (!empleado || !empleado.tipo_trabajador) {
                console.warn('Empleado no encontrado o sin tipo de trabajador');
                return null;
            }

            // Buscar tipo de trabajador
            const tipoTrabajador = this.workerTypes.find(tipo => 
                tipo.id === empleado.tipo_trabajador
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

    // NUEVA FUNCIÓN: Permisos por defecto (mínimos)
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

    // NUEVA FUNCIÓN: Aplicar permisos a la interfaz
    async applyPermissionsToInterface() {
        try {
            console.log('🔒 Aplicando permisos a la interfaz...');
            
            const userPermissions = await this.getCurrentUserPermissions();
            console.log('Permisos del usuario actual:', userPermissions);

            // Aplicar a botones de navegación
            this.hideUnauthorizedNavButtons(userPermissions);

            // Interceptar cambios de pestaña
            this.interceptTabNavigation(userPermissions);

            console.log('✅ Permisos aplicados exitosamente');

        } catch (error) {
            console.error('❌ Error aplicando permisos:', error);
        }
    }

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


    // NUEVA FUNCIÓN: Aplicar permisos a navegación
    applyNavigationPermissions(permissions) {
        this.systemModules.forEach(module => {
            const navButton = document.querySelector(`[data-tab="${module.id}"]`);
            if (navButton) {
                const hasPermission = permissions[module.id] === true;
                
                if (hasPermission) {
                    navButton.style.display = '';
                    navButton.removeAttribute('disabled');
                    navButton.classList.remove('nav-btn-disabled');
                } else {
                    // Ocultar botón o deshabilitarlo
                    navButton.style.display = 'none';
                    // O alternativamente, solo deshabilitar:
                    // navButton.setAttribute('disabled', 'true');
                    // navButton.classList.add('nav-btn-disabled');
                }
                
                console.log(`Módulo ${module.id}: ${hasPermission ? 'PERMITIDO' : 'BLOQUEADO'}`);
            }
        });
    }

    // NUEVA FUNCIÓN: Aplicar permisos a contenido de pestañas
    applyTabPermissions(permissions) {
        this.systemModules.forEach(module => {
            const tabContent = document.getElementById(module.id);
            if (tabContent) {
                const hasPermission = permissions[module.id] === true;
                
                if (!hasPermission) {
                    // Agregar overlay de "Sin permisos"
                    this.addNoPermissionOverlay(tabContent, module.name);
                } else {
                    // Remover overlay si existe
                    this.removeNoPermissionOverlay(tabContent);
                }
            }
        });
    }

    // NUEVA FUNCIÓN: Agregar overlay de sin permisos
    addNoPermissionOverlay(tabElement, moduleName) {
        // Verificar si ya existe el overlay
        if (tabElement.querySelector('.no-permission-overlay')) {
            return;
        }

        const overlay = document.createElement('div');
        overlay.className = 'no-permission-overlay';
        overlay.innerHTML = `
            <div class="no-permission-content">
                <i data-lucide="lock" style="font-size: 3rem; color: #ef4444; margin-bottom: 1rem;"></i>
                <h3>Acceso Restringido</h3>
                <p>No tienes permisos para acceder al módulo de <strong>${moduleName}</strong></p>
                <p style="color: #94a3b8; font-size: 0.9rem;">Contacta al administrador para solicitar acceso</p>
            </div>
        `;

        // Estilos del overlay
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            backdrop-filter: blur(2px);
        `;

        overlay.querySelector('.no-permission-content').style.cssText = `
            text-align: center;
            padding: 2rem;
            border-radius: 0.5rem;
            background: white;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            border: 1px solid #e5e7eb;
        `;

        // Hacer el contenedor relativo para el overlay
        tabElement.style.position = 'relative';
        tabElement.appendChild(overlay);

        // Recrear iconos de Lucide
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // NUEVA FUNCIÓN: Remover overlay de sin permisos
    removeNoPermissionOverlay(tabElement) {
        const overlay = tabElement.querySelector('.no-permission-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    // NUEVA FUNCIÓN: Verificar si usuario tiene permiso para un módulo
    async hasPermissionFor(moduleId) {
        try {
            const userPermissions = await this.getCurrentUserPermissions();
            return userPermissions[moduleId] === true;
        } catch (error) {
            console.error('Error verificando permisos:', error);
            return false;
        }
    }

    // NUEVA FUNCIÓN: Interceptar cambio de pestañas
    interceptTabChange(originalShowTab) {
        return async (tabId) => {
            console.log(`Intentando acceder a pestaña: ${tabId}`);
            
            // Verificar permisos
            const hasPermission = await this.hasPermissionFor(tabId);
            
            if (!hasPermission && tabId !== 'dashboard') {
                console.warn(`Acceso denegado a pestaña: ${tabId}`);
                alert(`No tienes permisos para acceder al módulo: ${tabId}`);
                return false;
            }
            
            // Si tiene permisos, ejecutar función original
            return originalShowTab(tabId);
        };
    }






}

// Al final de permissionTabManager.js - ANTES del addEventListener

// Crear instancia global
window.permissionManager = new PermissionTabManager();
console.log('PermissionManager instancia creada:', window.permissionManager);

window.permissionManager.isReadyToInitialize = function() {
    return (
        window.firebaseManager && 
        window.firebaseManager.isInitialized() && 
        window.dataService &&
        window.firebaseManager.getDB()
    );
};

window.permissionManager.debugStatus = function() {
    console.log('=== PERMISSION MANAGER DEBUG ===');
    console.log('Manager inicializado:', this.isInitialized);
    console.log('Usuario actual:', this.currentUser);
    console.log('Es admin:', this.isAdmin);
    console.log('Worker types:', this.workerTypes.length);
    console.log('Permisos cargados:', Object.keys(this.permissions).length);
    console.log('Firebase ready:', this.isReadyToInitialize());
    console.log('===============================');
};

console.log('Permission Manager configurado - inicialización controlada desde main.js');

// Inicializar cuando el DOM esté listo
/*
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM cargado, verificando instancia...');
    console.log('window.permissionManager existe:', !!window.permissionManager);
    
    if (!window.permissionManager) {
        console.error('permissionManager no existe, creando nueva instancia...');
        window.permissionManager = new PermissionTabManager();
    }
    
    // Esperar a que otros sistemas se inicialicen
    setTimeout(async () => {
        try {
            console.log('Iniciando permissionManager...');
            await window.permissionManager.initialize();
            console.log('Sistema de permisos inicializado correctamente');
            
            // Aplicar visibilidad del botón después de un delay
            setTimeout(() => {
                window.permissionManager.togglePermissionTab();
                console.log('Visibilidad del botón aplicada');
            }, 1000);
            
        } catch (error) {
            console.error('Error al inicializar permisos:', error);
        }
    }, 3000);
});
*/


// Inicializar cuando el DOM esté listo
/*
document.addEventListener('DOMContentLoaded', async () => {
    setTimeout(async () => {
        try {
            await window.permissionTabManager.initialize();
            console.log('Sistema de permisos inicializado correctamente');
        } catch (error) {
            console.error('Error al inicializar permisos:', error);
        }
    }, 2000);
});
*/
// Crear alias para compatibilidad con HTML existente
window.permissionTabManager = window.permissionManager;

// Crear instancia global
//window.permissionManager = new PermissionTabManager();

//window.permissionTabManager = new PermissionTabManager();

window.applyUserPermissions = async function() {
    if (window.permissionManager) {
        await window.permissionManager.applyPermissionsToInterface();
    }
};

// CSS adicional para botones deshabilitados (agregar a styles.css)
const additionalCSS = `
.nav-btn-disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background-color: #9ca3af !important;
}

.nav-btn-disabled:hover {
    background-color: #9ca3af !important;
    transform: none !important;
}

.no-permission-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(2px);
}

.no-permission-content {
    text-align: center;
    padding: 2rem;
    border-radius: 0.5rem;
    background: white;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    border: 1px solid #e5e7eb;
}
`;

// Inyectar CSS adicional
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = additionalCSS;
    document.head.appendChild(style);
}