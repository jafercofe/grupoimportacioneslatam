class AuthService {
    constructor() {
        this.currentUser = null;
        this.userPermissions = null;
        this.roles = {
            SUPER_ADMIN: {
                name: 'Super Administrador',
                permissions: ['*'], // Todos los permisos
                level: 100
            },
            ADMIN: {
                name: 'Administrador',
                permissions: [
                    'clientes.*', 'empleados.*', 'productos.*', 
                    'pedidos.*', 'compras.*', 'proveedores.*',
                    'estados.*', 'entregas.*', 'tipos.*', 'reportes.*'
                ],
                level: 90
            },
            MANAGER: {
                name: 'Gerente',
                permissions: [
                    'clientes.read', 'clientes.create', 'clientes.update',
                    'empleados.read', 'empleados.update',
                    'productos.read', 'productos.update',
                    'pedidos.*', 'compras.*',
                    'reportes.read'
                ],
                level: 70
            },
            EMPLOYEE: {
                name: 'Empleado',
                permissions: [
                    'clientes.read', 'clientes.create', 'clientes.update',
                    'productos.read',
                    'pedidos.read', 'pedidos.create', 'pedidos.update',
                    'compras.read'
                ],
                level: 50
            },
            VIEWER: {
                name: 'Solo Lectura',
                permissions: [
                    'clientes.read', 'productos.read', 'pedidos.read', 'compras.read'
                ],
                level: 10
            }
        };
    }

    async initialize() {
        console.log('🔐 Inicializando AuthService...');
        
        const auth = window.firebaseManager.getAuth();
        
        return new Promise((resolve, reject) => {
            // Escuchar cambios de autenticación
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    console.log('👤 Usuario autenticado:', user.email);
                    try {
                        await this.loadUserData(user);
                        console.log('✅ Datos de usuario cargados:', this.currentUser.rol);
                        resolve(true);
                    } catch (error) {
                        console.error('❌ Error cargando datos de usuario:', error);
                        reject(error);
                    }
                } else {
                    console.log('👤 Usuario no autenticado');
                    this.currentUser = null;
                    this.userPermissions = null;
                    this.redirectToLogin();
                    resolve(false);
                }
            });
        });
    }

    async loadUserData(firebaseUser) {
        try {
            const db = window.firebaseManager.getDB();
            const userDoc = await db.collection('usuarios').doc(firebaseUser.uid).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                this.currentUser = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    ...userData
                };
                
                // Cargar permisos basados en el rol
                this.loadUserPermissions();
                
                // Actualizar fecha de último acceso
                await this.updateLastAccess();
                
                console.log('📋 Permisos cargados:', this.userPermissions.length, 'permisos');
            } else {
                throw new Error('Perfil de usuario no encontrado en Firestore');
            }
        } catch (error) {
            console.error('Error cargando datos de usuario:', error);
            throw error;
        }
    }

    async updateLastAccess() {
        try {
            const db = window.firebaseManager.getDB();
            await db.collection('usuarios').doc(this.currentUser.uid).update({
                fechaUltimoAcceso: new Date().toISOString()
            });
        } catch (error) {
            console.warn('Error actualizando último acceso:', error);
        }
    }

    loadUserPermissions() {
        if (!this.currentUser || !this.currentUser.rol) {
            this.userPermissions = [];
            return;
        }

        const rol = this.roles[this.currentUser.rol];
        if (rol) {
            this.userPermissions = [...rol.permissions];
            
            // Agregar permisos adicionales específicos del usuario
            if (this.currentUser.permisos && this.currentUser.permisos.length > 0) {
                this.userPermissions = [...this.userPermissions, ...this.currentUser.permisos];
            }
        } else {
            this.userPermissions = [];
        }
    }

    // 🔥 VERIFICACIÓN DE PERMISOS - CORAZÓN DEL SISTEMA
    hasPermission(module, action) {
        if (!this.currentUser || !this.userPermissions) {
            console.warn(`❌ Permiso denegado: Usuario no autenticado`);
            return false;
        }

        // Super admin tiene todos los permisos
        if (this.userPermissions.includes('*')) {
            return true;
        }

        // Verificar permiso específico: "modulo.accion"
        const specificPermission = `${module}.${action}`;
        if (this.userPermissions.includes(specificPermission)) {
            return true;
        }

        // Verificar permiso wildcard: "modulo.*"
        const wildcardPermission = `${module}.*`;
        if (this.userPermissions.includes(wildcardPermission)) {
            return true;
        }

        console.warn(`❌ Permiso denegado: ${specificPermission} para usuario ${this.currentUser.email}`);
        return false;
    }

    // Verificar si el usuario tiene un rol específico o superior
    hasRole(requiredRole) {
        if (!this.currentUser || !this.currentUser.rol) {
            return false;
        }

        const userRole = this.roles[this.currentUser.rol];
        const required = this.roles[requiredRole];

        if (!userRole || !required) {
            return false;
        }

        return userRole.level >= required.level;
    }

    // Obtener información del usuario actual
    getCurrentUser() {
        return this.currentUser;
    }

    // Verificar si está autenticado
    isAuthenticated() {
        return !!this.currentUser;
    }

    // Logout
    async logout() {
        try {
            const auth = window.firebaseManager.getAuth();
            await auth.signOut();
            console.log('✅ Logout exitoso');
        } catch (error) {
            console.error('Error en logout:', error);
            throw error;
        }
    }

    // Redirecciones
    redirectToLogin() {
        if (!window.location.pathname.includes('login.html')) {
            console.log('🔄 Redirigiendo a login...');
            window.location.href = 'login.html';
        }
    }

    // 🔥 AUDITORÍA DE ACCIONES
    async logAction(action, module, data = {}) {
        if (!this.currentUser) return;

        try {
            const db = window.firebaseManager.getDB();
            const auditLog = {
                usuario: this.currentUser.uid,
                email: this.currentUser.email,
                accion: action,
                modulo: module,
                datos: data,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent.substring(0, 200)
            };

            await db.collection('auditoria').add(auditLog);
            console.log('📝 Acción registrada:', action, module);
        } catch (error) {
            console.error('Error registrando auditoría:', error);
        }
    }
}

// Crear instancia global
window.authService = new AuthService();