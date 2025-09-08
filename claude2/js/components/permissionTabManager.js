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
            console.log(`[PermissionManager] ${message}`, data || '');
        }
    }

    async initialize() {
        try {
            this.log('Iniciando sistema de permisos...');
            
            await this.loadCurrentUser();
            await this.loadWorkerTypes();
            await this.loadPermissions();
            
            this.setupPermissionTab();
            this.togglePermissionTab();
            
            this.isInitialized = true;
            this.log('Sistema de permisos inicializado correctamente');
            
        } catch (error) {
            this.log('Error en inicialización:', error);
            this.enableFallbackMode();
        }
    }

    async loadCurrentUser() {
        try {
            // Intentar múltiples fuentes para el usuario
            const savedUser = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
            
            if (savedUser) {
                this.currentUser = JSON.parse(savedUser);
            } else if (window.currentUser) {
                this.currentUser = window.currentUser;
            } else {
                // Usuario por defecto
                this.currentUser = {
                    name: 'Administrador Sistema',
                    type: 'Programador',
                    email: 'admin@grupoimportaciones.com'
                };
            }

            this.isAdmin = this.currentUser.type?.toLowerCase() === 'programador';
            this.log('Usuario cargado:', this.currentUser);
        } catch (error) {
            this.log('Error al cargar usuario:', error);
            this.currentUser = {
                name: 'Usuario Fallback',
                type: 'Programador',
                email: 'fallback@sistema.com'
            };
            this.isAdmin = true;
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
        
        const onClick = canModify ? `permissionManager.togglePermission('${workerId}', '${moduleItem.id}')` : 'void(0)';
        
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
            const promises = [];
            
            for (const [workerId, permissions] of Object.entries(this.permissions)) {
                if (permissions && typeof permissions === 'object') {
                    promises.push(
                        window.dataService.update('interface_permissions', workerId, {
                            ...permissions,
                            updatedAt: new Date().toISOString(),
                            updatedBy: this.currentUser.email
                        })
                    );
                }
            }
            
            await Promise.all(promises);
            alert('Permisos guardados exitosamente');
            
        } catch (error) {
            console.error('Error al guardar:', error);
            alert('Error al guardar permisos');
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

// Crear instancia global
window.permissionManager = new PermissionTabManager();

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    setTimeout(async () => {
        try {
            await window.permissionManager.initialize();
            console.log('Sistema de permisos inicializado correctamente');
        } catch (error) {
            console.error('Error al inicializar permisos:', error);
        }
    }, 2000);
});

window.permissionTabManager = new PermissionTabManager();