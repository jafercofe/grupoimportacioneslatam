/**
 * Error Handler para CRM
 * Maneja errores de "message channel closed" y otros problemas de Firebase
 */

// 1. Error handler global para capturar errores no manejados
window.addEventListener('unhandledrejection', function(event) {
    // Ignorar errores específicos de extensiones del navegador
    if (event.reason && event.reason.message && 
        (event.reason.message.includes('message channel closed') ||
         event.reason.message.includes('Extension context invalidated') ||
         event.reason.message.includes('The message port closed'))) {
        console.warn('Ignorando error de extensión del navegador:', event.reason.message);
        event.preventDefault();
        return;
    }
    
    // Log otros errores no manejados para debugging
    console.error('Unhandled promise rejection:', event.reason);
});

// 2. Interceptar errores de extensiones de Chrome
if (typeof chrome !== 'undefined' && chrome.runtime) {
    const originalSendMessage = chrome.runtime.sendMessage;
    chrome.runtime.sendMessage = function(extensionId, message, options, responseCallback) {
        try {
            return originalSendMessage.call(this, extensionId, message, options, responseCallback);
        } catch (error) {
            if (error.message.includes('message channel closed') || 
                error.message.includes('Extension context invalidated')) {
                console.warn('Ignorando error de extensión Chrome:', error.message);
                return;
            }
            throw error;
        }
    };
}

// 3. Firebase Manager mejorado con manejo de errores
class SafeFirebaseManager {
    constructor() {
        this.db = null;
        this.initialized = false;
        this.config = {
            apiKey: "AIzaSyBlzaQCL7M98QeifzkEMZ4d8deC7oHqCT0",
            authDomain: "novo-crm-e9779.firebaseapp.com",
            projectId: "novo-crm-e9779",
            storageBucket: "novo-crm-e9779.firebasestorage.app",
            messagingSenderId: "43652899432",
            appId: "1:43652899432:web:6c787bced791b8ea6d91dd"
        };
        
        this.retryAttempts = 3;
        this.retryDelay = 1000;
    }

    async initialize() {
        try {
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK no está cargado');
            }
            
            // Verificar si ya está inicializado
            if (firebase.apps.length === 0) {
                firebase.initializeApp(this.config);
            }
            
            this.db = firebase.firestore();
            
            // Configurar Firestore para mejor rendimiento
            this.db.settings({
                cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
            });
            
            // Test connection con retry
            await this.testConnection();
            
            this.initialized = true;
            console.log("Firebase inicializado correctamente con error handling");
            return this.db;
        } catch (error) {
            console.error("Error inicializando Firebase:", error);
            throw error;
        }
    }

    async testConnection(attempt = 1) {
        try {
            await Promise.race([
                this.db.collection('test').limit(1).get(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Connection timeout')), 8000)
                )
            ]);
        } catch (error) {
            if (attempt < this.retryAttempts && 
                !error.message.includes('message channel closed')) {
                console.warn(`Test connection failed, retry ${attempt}/${this.retryAttempts}`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
                return this.testConnection(attempt + 1);
            }
            
            if (error.message.includes('message channel closed')) {
                console.warn('Ignorando error de canal de mensaje en test de conexión');
                return; // Asumir que la conexión está bien
            }
            
            throw error;
        }
    }

    getDB() {
        return this.db;
    }

    isInitialized() {
        return this.initialized;
    }

    // Método seguro para operaciones Firebase con timeout y retry
    async safeOperation(operation, operationName = 'Firebase operation', timeoutMs = 10000) {
        if (!this.initialized) {
            throw new Error('Firebase no está inicializado');
        }

        const maxRetries = 2;
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`${operationName} - Intento ${attempt}`);
                
                return await Promise.race([
                    operation(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error(`${operationName} timeout after ${timeoutMs}ms`)), timeoutMs)
                    )
                ]);
                
            } catch (error) {
                lastError = error;
                
                // Ignorar errores de canal de mensaje
                if (error.message.includes('message channel closed') ||
                    error.message.includes('Extension context invalidated')) {
                    console.warn(`Ignorando error de canal en ${operationName}, reintentando...`);
                    
                    if (attempt < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                        continue;
                    }
                    
                    // Si es el último intento, ejecutar directamente sin Promise.race
                    try {
                        return await operation();
                    } catch (finalError) {
                        console.warn('Error final ignorado:', finalError);
                        throw new Error(`${operationName} completada con advertencias`);
                    }
                }
                
                // Para timeouts, reintentar
                if (error.message.includes('timeout') && attempt < maxRetries) {
                    console.warn(`Timeout en ${operationName}, reintentando...`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                    continue;
                }
                
                // Otros errores, fallar inmediatamente
                throw error;
            }
        }

        throw lastError;
    }
}

// 4. Función de eliminación segura para pedidos
window.safeDeletePedido = async function(pedidoId) {
    const db = window.firebaseManager.getDB();
    
    return window.firebaseManager.safeOperation(async () => {
        console.log(`Iniciando eliminación segura de pedido ${pedidoId}`);
        
        // 1. Obtener información del pedido
        const pedidoDoc = await db.collection('tb_pedido').doc(pedidoId).get();
        if (!pedidoDoc.exists) {
            throw new Error('Pedido no encontrado');
        }
        
        const pedidoData = pedidoDoc.data();
        const pedidoNum = pedidoData.PED_NUM;
        console.log(`Eliminando pedido número: ${pedidoNum}`);
        
        // 2. Buscar detalles asociados
        const detallesSnapshot = await db.collection('tb_pedidos_detalle')
            .where('PED_DET_NUM', '==', pedidoNum)
            .get();
        
        console.log(`Encontrados ${detallesSnapshot.size} detalles para eliminar`);
        
        // 3. Eliminar en batches para evitar limits de Firebase
        const batchSize = 400; // Límite seguro para Firebase batch
        const batches = [];
        let currentBatch = db.batch();
        let operationCount = 0;
        
        // Agregar detalles a batches
        detallesSnapshot.docs.forEach(doc => {
            if (operationCount >= batchSize) {
                batches.push(currentBatch);
                currentBatch = db.batch();
                operationCount = 0;
            }
            currentBatch.delete(doc.ref);
            operationCount++;
        });
        
        // Agregar el pedido principal al último batch
        if (operationCount >= batchSize) {
            batches.push(currentBatch);
            currentBatch = db.batch();
        }
        currentBatch.delete(db.collection('tb_pedido').doc(pedidoId));
        batches.push(currentBatch);
        
        // 4. Ejecutar todos los batches secuencialmente
        console.log(`Ejecutando ${batches.length} batches de eliminación...`);
        
        for (let i = 0; i < batches.length; i++) {
            console.log(`Ejecutando batch ${i + 1}/${batches.length}`);
            await batches[i].commit();
            
            // Pequeña pausa entre batches para evitar rate limiting
            if (i < batches.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        console.log(`Pedido ${pedidoId} y ${detallesSnapshot.size} detalles eliminados exitosamente`);
        
        // 5. Limpiar cache
        if (window.smartCache) {
            window.smartCache.invalidate('collection_tb_pedido');
            window.smartCache.invalidate('collection_tb_pedidos_detalle');
        }
        
        return {
            pedidoId,
            pedidoNum,
            detallesEliminados: detallesSnapshot.size
        };
        
    }, `Eliminar pedido ${pedidoId}`, 15000); // Timeout más largo para operaciones complejas
};

// 5. Monitor de conectividad
class ConnectivityMonitor {
    constructor() {
        this.isOnline = navigator.onLine;
        this.hasReportedOffline = false;
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            if (this.hasReportedOffline && window.notificationService) {
                window.notificationService.success('Conexión a internet restaurada');
                this.hasReportedOffline = false;
            }
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            if (!this.hasReportedOffline && window.notificationService) {
                window.notificationService.warning('Conexión a internet perdida. Las operaciones pueden fallar.');
                this.hasReportedOffline = true;
            }
        });
    }
    
    checkConnection() {
        if (!this.isOnline && !this.hasReportedOffline && window.notificationService) {
            window.notificationService.warning('Sin conexión a internet. Verifica tu conexión.');
            this.hasReportedOffline = true;
        }
        return this.isOnline;
    }
}

// 6. Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Reemplazar Firebase Manager con versión segura
    if (!window.firebaseManager || window.firebaseManager.constructor.name !== 'SafeFirebaseManager') {
        window.firebaseManager = new SafeFirebaseManager();
    }
    
    // Inicializar monitor de conectividad
    window.connectivityMonitor = new ConnectivityMonitor();
    
    console.log('Error Handler inicializado correctamente');
});

// 7. Cleanup al cerrar la página
window.addEventListener('beforeunload', function() {
    try {
        console.log('Limpiando recursos antes de cerrar...');
        
        // Cancelar cualquier operación pendiente
        if (window.firebaseManager && window.firebaseManager.db) {
            // Firebase se limpia automáticamente
        }
        
        // Limpiar intervalos si existen
        const intervals = window.setInterval(function(){}, Number.MAX_SAFE_INTEGER);
        for (let i = 1; i < intervals; i++) {
            window.clearInterval(i);
        }
        
    } catch (error) {
        console.warn('Error durante limpieza:', error);
    }
});

// 8. Configuración global de timeout para fetch si existe
if (typeof fetch !== 'undefined') {
    const originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
        // Agregar timeout por defecto si no se especifica
        if (!options.signal) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), options.timeout || 10000);
            options.signal = controller.signal;
            
            return originalFetch(url, options).finally(() => {
                clearTimeout(timeoutId);
            });
        }
        return originalFetch(url, options);
    };
}

console.log('ErrorHandler.js cargado exitosamente');

// Exportar a window para acceso global (sin usar ES6 modules)
window.SafeFirebaseManager = SafeFirebaseManager;
window.ConnectivityMonitor = ConnectivityMonitor;