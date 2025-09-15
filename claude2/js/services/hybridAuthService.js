// ===== SISTEMA DE AUTENTICACIÓN HÍBRIDO =====
// js/services/hybridAuthService.js

class HybridAuthService {
    constructor() {
        this.currentUser = null;
        this.userPermissions = null;
        this.isInitializing = false;
        this.authListener = null;
        this.isDevelopment = this.detectEnvironment();
        
        console.log(`🔧 Modo detectado: ${this.isDevelopment ? 'DESARROLLO' : 'PRODUCCIÓN'}`);
        
        this.roles = {
            SUPER_ADMIN: {
                name: 'Super Administrador',
                permissions: ['*'],
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

        // Usuarios de desarrollo (hardcoded)
        this.devUsers = {
            'admin@dev.com': {
                uid: 'dev-admin-001',
                email: 'admin@dev.com',
                password: 'admin123',
                nombre: 'Admin Desarrollo',
                rol: 'SUPER_ADMIN',
                activo: true,
                empresa: 'Desarrollo',
                fechaCreacion: new Date().toISOString()
            },
            'manager@dev.com': {
                uid: 'dev-manager-001',
                email: 'manager@dev.com', 
                password: 'manager123',
                nombre: 'Manager Desarrollo',
                rol: 'MANAGER',
                activo: true,
                empresa: 'Desarrollo',
                fechaCreacion: new Date().toISOString()
            },
            'empleado@dev.com': {
                uid: 'dev-employee-001',
                email: 'empleado@dev.com',
                password: 'empleado123', 
                nombre: 'Empleado Desarrollo',
                rol: 'EMPLOYEE',
                activo: true,
                empresa: 'Desarrollo',
                fechaCreacion: new Date().toISOString()
            },
            'viewer@dev.com': {
                uid: 'dev-viewer-001',
                email: 'viewer@dev.com',
                password: 'viewer123',
                nombre: 'Viewer Desarrollo',
                rol: 'VIEWER',
                activo: true,
                empresa: 'Desarrollo',
                fechaCreacion: new Date().toISOString()
            }
        };
    }

    // 🔍 DETECTAR AMBIENTE
    detectEnvironment() {
        const hostname = window.location.hostname;
        const isDev = hostname === 'localhost' || 
                     hostname === '127.0.0.1' || 
                     hostname.includes('127.0.0.1') ||
                     hostname.includes('localhost') ||
                     window.location.port !== '' ||
                     window.location.href.includes('file://') ||
                     window.location.search.includes('dev=true');
        
        console.log('🔍 Environment detection:', {
            hostname,
            port: window.location.port,
            href: window.location.href,
            isDev
        });
        
        return isDev;
    }

    // 🚀 INICIALIZACIÓN PRINCIPAL
    async initialize() {
        if (this.isInitializing) {
            console.log('⏸️ AuthService ya se está inicializando...');
            return;
        }

        console.log(`🔐 Inicializando ${this.isDevelopment ? 'Simple' : 'Firebase'} Auth...`);
        this.isInitializing = true;

        try {
            if (this.isDevelopment) {
                await this.initializeSimpleAuth();
            } else {
                await this.initializeFirebaseAuth();
            }
            this.isInitializing = false;
            return true;
        } catch (error) {
            console.error('❌ Error inicializando auth:', error);
            this.isInitializing = false;
            throw error;
        }
    }

    // 🔧 INICIALIZACIÓN DESARROLLO (Simple Auth)
    async initializeSimpleAuth() {
        console.log('🛠️ Inicializando Simple Auth para desarrollo...');
        
        return new Promise((resolve) => {
            // Verificar si hay sesión guardada
            const savedSession = localStorage.getItem('dev_session');
            
            if (savedSession) {
                try {
                    const session = JSON.parse(savedSession);
                    
                    // Verificar si la sesión no ha expirado (24 horas)
                    const sessionAge = Date.now() - new Date(session.timestamp).getTime();
                    const maxAge = 24 * 60 * 60 * 1000; // 24 horas
                    
                    if (sessionAge < maxAge && this.devUsers[session.email]) {
                        console.log('✅ Sesión de desarrollo encontrada:', session.email);
                        this.currentUser = { ...this.devUsers[session.email] };
                        this.loadUserPermissions();
                        resolve(true);
                        return;
                    } else {
                        console.log('⏰ Sesión de desarrollo expirada');
                        localStorage.removeItem('dev_session');
                    }
                } catch (error) {
                    console.warn('⚠️ Error leyendo sesión de desarrollo:', error);
                    localStorage.removeItem('dev_session');
                }
            }

            console.log('❌ No hay sesión válida de desarrollo');
            this.handleUnauthenticatedUser();
            resolve(false);
        });
    }

    // 🔥 INICIALIZACIÓN PRODUCCIÓN (Firebase Auth)
    async initializeFirebaseAuth() {
        console.log('🚀 Inicializando Firebase Auth para producción...');
        
        if (!window.firebaseManager) {
            throw new Error('Firebase Manager no disponible');
        }

        const auth = window.firebaseManager.getAuth();
        
        return new Promise((resolve, reject) => {
            if (this.authListener) {
                this.authListener(); // Desconectar listener anterior
            }

            this.authListener = auth.onAuthStateChanged(async (user) => {
                try {
                    if (user) {
                        console.log('👤 Usuario Firebase autenticado:', user.email);
                        await this.loadFirebaseUserData(user);
                        console.log('✅ Datos Firebase cargados:', this.currentUser.rol);
                        resolve(true);
                    } else {
                        console.log('👤 Usuario Firebase no autenticado');
                        this.currentUser = null;
                        this.userPermissions = null;
                        this.handleUnauthenticatedUser();
                        resolve(false);
                    }
                } catch (error) {
                    console.error('❌ Error en Firebase auth state:', error);
                    reject(error);
                }
            });
        });
    }

    // 📊 CARGAR DATOS DE USUARIO FIREBASE
    async loadFirebaseUserData(firebaseUser) {
        try {
            const db = window.firebaseManager.getDB();
            const userDoc = await db.collection('usuarios').doc(firebaseUser.uid).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                
                if (!userData.activo) {
                    throw new Error('Usuario desactivado. Contacta al administrador.');
                }
                
                this.currentUser = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    ...userData
                };
                
                this.loadUserPermissions();
                await this.updateLastAccess();
                
            } else {
                throw new Error('Perfil de usuario no encontrado en Firestore');
            }
        } catch (error) {
            console.error('Error cargando datos Firebase:', error);
            await this.logout();
            throw error;
        }
    }

    // 🔐 LOGIN MÉTODO DUAL
    async login(email, password) {
        console.log(`🔑 Login attempt: ${email} (${this.isDevelopment ? 'DEV' : 'PROD'})`);
        
        if (this.isDevelopment) {
            return await this.simpleLogin(email, password);
        } else {
            return await this.firebaseLogin(email, password);
        }
    }

    // 🛠️ LOGIN SIMPLE PARA DESARROLLO
    async simpleLogin(email, password) {
        console.log('🛠️ Simple login para desarrollo...');
        
        const user = this.devUsers[email];
        
        if (!user) {
            throw new Error('Usuario no encontrado en base de desarrollo');
        }
        
        if (user.password !== password) {
            throw new Error('Contraseña incorrecta');
        }
        
        if (!user.activo) {
            throw new Error('Usuario desactivado');
        }
        
        // Crear sesión
        const session = {
            email: email,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('dev_session', JSON.stringify(session));
        
        // Cargar usuario
        this.currentUser = { ...user };
        this.loadUserPermissions();
        
        console.log('✅ Login de desarrollo exitoso:', user.nombre);
        return true;
    }

    // 🚀 LOGIN FIREBASE PARA PRODUCCIÓN
    async firebaseLogin(email, password) {
        console.log('🚀 Firebase login para producción...');
        
        if (!window.firebaseManager) {
            throw new Error('Firebase no disponible');
        }
        
        const auth = window.firebaseManager.getAuth();
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        
        console.log('✅ Login Firebase exitoso:', userCredential.user.email);
        return true;
    }

    // 🚪 LOGOUT MÉTODO DUAL
    async logout() {
        console.log(`🚪 Logout (${this.isDevelopment ? 'DEV' : 'PROD'})`);
        
        try {
            if (this.isDevelopment) {
                // Simple logout
                localStorage.removeItem('dev_session');
            } else {
                // Firebase logout
                if (window.firebaseManager) {
                    const auth = window.firebaseManager.getAuth();
                    await auth.signOut();
                }
            }
            
            // Limpiar estado local
            this.currentUser = null;
            this.userPermissions = null;
            
            // Limpiar cache
            if (window.smartCache) {
                window.smartCache.clear();
            }
            
            console.log('✅ Logout exitoso');
            
        } catch (error) {
            console.error('Error en logout:', error);
            // Limpiar estado aunque haya error
            this.currentUser = null;
            this.userPermissions = null;
            localStorage.removeItem('dev_session');
            throw error;
        }
    }

    // 📝 CARGAR PERMISOS DE USUARIO
    loadUserPermissions() {
        if (!this.currentUser || !this.currentUser.rol) {
            this.userPermissions = [];
            return;
        }

        const rol = this.roles[this.currentUser.rol];
        if (rol) {
            this.userPermissions = [...rol.permissions];
            
            if (this.currentUser.permisos && this.currentUser.permisos.length > 0) {
                this.userPermissions = [...this.userPermissions, ...this.currentUser.permisos];
            }
        } else {
            this.userPermissions = [];
        }
        
        console.log('📋 Permisos cargados:', this.userPermissions.length, 'permisos');
    }

    // ⏰ ACTUALIZAR ÚLTIMO ACCESO (solo producción)
    async updateLastAccess() {
        if (this.isDevelopment || !this.currentUser) return;
        
        try {
            const db = window.firebaseManager.getDB();
            await db.collection('usuarios').doc(this.currentUser.uid).update({
                fechaUltimoAcceso: new Date().toISOString()
            });
        } catch (error) {
            console.warn('Error actualizando último acceso:', error);
        }
    }

    // 🔒 VERIFICACIÓN DE PERMISOS
    hasPermission(module, action) {
        if (!this.currentUser || !this.userPermissions) {
            console.warn(`❌ Permiso denegado: Usuario no autenticado`);
            return false;
        }

        // Super admin tiene todos los permisos
        if (this.userPermissions.includes('*')) {
            return true;
        }

        const specificPermission = `${module}.${action}`;
        const wildcardPermission = `${module}.*`;
        
        const hasPermission = this.userPermissions.includes(specificPermission) || 
                             this.userPermissions.includes(wildcardPermission);

        if (!hasPermission) {
            console.warn(`❌ Permiso denegado: ${specificPermission} para usuario ${this.currentUser.email}`);
        }

        return hasPermission;
    }

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

    // 📊 GETTERS
    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    getEnvironment() {
        return this.isDevelopment ? 'development' : 'production';
    }

    // 🔄 MANEJO DE USUARIO NO AUTENTICADO
    handleUnauthenticatedUser() {
        const currentPath = window.location.pathname.toLowerCase();
        const isLoginPage = currentPath.includes('login.html') || 
                           currentPath.endsWith('login.html') || 
                           currentPath === '/' || 
                           currentPath === '';

        if (!isLoginPage) {
            console.log('🔄 Redirigiendo a login desde:', currentPath);
            sessionStorage.setItem('redirectAfterLogin', currentPath);
            window.location.replace('login.html');
        }
    }

    // 🚀 REDIRECCIÓN POST-LOGIN
    redirectAfterLogin() {
        const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
        sessionStorage.removeItem('redirectAfterLogin');
        
        if (redirectUrl && redirectUrl !== '/login.html' && redirectUrl !== '/') {
            console.log('🚀 Redirigiendo a página anterior:', redirectUrl);
            window.location.replace(redirectUrl);
        } else {
            console.log('🚀 Redirigiendo a página principal');
            window.location.replace('index.html');
        }
    }

    // 📝 AUDITORÍA
    async logAction(action, module, data = {}) {
        if (!this.currentUser) return;

        const auditLog = {
            usuario: this.currentUser.uid,
            email: this.currentUser.email,
            accion: action,
            modulo: module,
            datos: data,
            timestamp: new Date().toISOString(),
            ambiente: this.getEnvironment(),
            userAgent: navigator.userAgent.substring(0, 200)
        };

        try {
            if (this.isDevelopment) {
                // En desarrollo, solo log a consola
                console.log('📝 [DEV] Acción:', auditLog);
            } else {
                // En producción, guardar en Firestore
                const db = window.firebaseManager.getDB();
                await db.collection('auditoria').add(auditLog);
                console.log('📝 [PROD] Acción registrada:', action, module);
            }
        } catch (error) {
            console.error('Error registrando auditoría:', error);
        }
    }

    // 🧹 CLEANUP
    destroy() {
        if (this.authListener) {
            this.authListener();
            this.authListener = null;
        }
        this.currentUser = null;
        this.userPermissions = null;
        this.isInitializing = false;
        
        if (this.isDevelopment) {
            localStorage.removeItem('dev_session');
        }
    }

    // 🛠️ OBTENER USUARIOS DE DESARROLLO (para testing)
    getDevUsers() {
        return this.isDevelopment ? Object.keys(this.devUsers).map(email => ({
            email,
            password: this.devUsers[email].password,
            rol: this.devUsers[email].rol,
            nombre: this.devUsers[email].nombre
        })) : [];
    }
}

// Crear instancia global
window.authService = new HybridAuthService();