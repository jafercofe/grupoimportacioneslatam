class AuthMiddleware {
    constructor() {
        this.protectedActions = {
            'dataService.create': (module) => `${module}.create`,
            'dataService.update': (module) => `${module}.update`, 
            'dataService.delete': (module) => `${module}.delete`,
            'dataService.getAll': (module) => `${module}.read`
        };
    }

    // 🔥 MIDDLEWARE PRINCIPAL - INTERCEPTA TODAS LAS OPERACIONES
    async checkPermission(action, module, data = {}) {
        // Verificar si el usuario está autenticado
        if (!window.authService.isAuthenticated()) {
            const error = new Error('❌ Usuario no autenticado');
            window.notificationService?.error?.('Debes iniciar sesión para realizar esta acción');
            throw error;
        }

        // Obtener el permiso requerido para esta acción
        const requiredPermission = this.getRequiredPermission(action, module);
        
        if (!requiredPermission) {
            // Acción no protegida, permitir
            return true;
        }

        // Verificar si el usuario tiene el permiso
        const actionType = requiredPermission.split('.')[1];
        const hasPermission = window.authService.hasPermission(module, actionType);
        
        if (!hasPermission) {
            // Registrar intento de acceso no autorizado
            await window.authService.logAction('ACCESO_DENEGADO', module, {
                accion: action,
                datos: data
            });
            
            const error = new Error(`❌ Sin permisos para ${actionType} en ${module}`);
            window.notificationService?.error?.(`Sin permisos para ${actionType === 'delete' ? 'eliminar' : actionType === 'create' ? 'crear' : actionType === 'update' ? 'editar' : 'ver'} registros de ${module}`);
            throw error;
        }

        // Registrar acción autorizada
        await window.authService.logAction(action, module, {
            id: data.id,
            type: actionType
        });
        
        return true;
    }

    getRequiredPermission(action, module) {
        const permissionFunction = this.protectedActions[action];
        if (permissionFunction) {
            return permissionFunction(module);
        }
        return null;
    }

    // 🔥 PROTEGER DATASERVICE CON MIDDLEWARE
    wrapDataService() {
        console.log('🛡️ Protegiendo DataService con middleware...');
        
        const originalDataService = window.dataService;
        const middleware = this;

        // Interceptar método create
        const originalCreate = originalDataService.create.bind(originalDataService);
        originalDataService.create = async function(collectionName, data) {
            const module = middleware.getModuleFromCollection(collectionName);
            await middleware.checkPermission('dataService.create', module, data);
            return originalCreate(collectionName, data);
        };

        // Interceptar método update
        const originalUpdate = originalDataService.update.bind(originalDataService);
        originalDataService.update = async function(collectionName, id, data) {
            const module = middleware.getModuleFromCollection(collectionName);
            await middleware.checkPermission('dataService.update', module, {id, data});
            return originalUpdate(collectionName, id, data);
        };

        // Interceptar método delete
        const originalDelete = originalDataService.delete.bind(originalDataService);
        originalDataService.delete = async function(collectionName, id) {
            const module = middleware.getModuleFromCollection(collectionName);
            await middleware.checkPermission('dataService.delete', module, {id});
            return originalDelete(collectionName, id);
        };

        console.log('✅ DataService protegido correctamente');
    }

    // Mapear nombres de colección a módulos
    getModuleFromCollection(collectionName) {
        const mapping = {
            'clientes': 'clientes',
            'empleados': 'empleados',
            'tb_productos': 'productos',
            'tb_pedido': 'pedidos',
            'tb_pedidos_detalle': 'pedidos',
            'TB_COMPRAS': 'compras',
            'TB_COMPRA_DETALLE': 'compras',
            'TB_PROVEEDORES': 'proveedores',
            'TB_ESTADO': 'estados',
            'entregas': 'entregas',
            'tipos_contacto': 'tipos',
            'tipos_pago': 'tipos',
            'tipos_trabajador': 'tipos'
        };

        return mapping[collectionName] || 'general';
    }
}

window.authMiddleware = new AuthMiddleware();