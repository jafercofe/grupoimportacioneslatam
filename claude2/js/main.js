class CRMApplication {
    constructor() {
        this.currentTab = 'dashboard';
        this.paginationManagers = {};
        this.initialized = false;
    }

    async initialize() {
        try {
            console.log('Iniciando CRM...');
            
            // Initialize Firebase
            await window.firebaseManager.initialize();
            
            // Initialize pagination managers
            this.initializePaginationManagers();
            
            // Initialize UI
            this.setupGlobalEventListeners();
            this.initializeLucideIcons();
            
            // Load initial data
            await this.loadDashboard();
            
            this.initialized = true;
            
            window.notificationService.success('CRM Sistema inicializado correctamente');
            console.log('CRM Application initialized successfully');
            
            // Hide connection alert
            const alertEl = document.getElementById('connection-alert');
            if (alertEl) {
                alertEl.classList.add('hidden');
            }
            
        } catch (error) {
            console.error('Initialization error:', error);
            window.notificationService.error('Error al inicializar el sistema');
            
            // Show connection alert
            const alertEl = document.getElementById('connection-alert');
            if (alertEl) {
                alertEl.classList.remove('hidden');
            }
        }
    }

    initializePaginationManagers() {
        this.paginationManagers = {
            'clientes': new window.PaginationManager('clientes', 'clientes-table'),
            'empleados': new window.PaginationManager('empleados', 'empleados-table'),
            'productos': new window.PaginationManager('tb_productos', 'productos-table'),
            'pedidos': new window.PaginationManager('tb_pedido', 'pedidos-table'),
            'compras': new window.PaginationManager('TB_COMPRAS', 'compras-table'),  // NUEVO
            'proveedores': new window.PaginationManager('TB_PROVEEDORES', 'proveedores-table'),
            'estados': new window.PaginationManager('TB_ESTADO', 'estados-table'),
            'entregas': new window.PaginationManager('entregas', 'entregas-table'),
            'tipos-contacto': new window.PaginationManager('tipos_contacto', 'tipos-contacto-table'),
            'tipos-pago': new window.PaginationManager('tipos_pago', 'tipos-pago-table'),
            'tipos-trabajador': new window.PaginationManager('tipos_trabajador', 'tipos-trabajador-table')
        };

        // Export for global access
        window.paginationManagers = this.paginationManagers;
        
        console.log('Pagination managers initialized:', Object.keys(this.paginationManagers));
    }

    setupGlobalEventListeners() {
        // Global modal functions
        window.openModal = (type, id = null) => {
            window.modalManager.open(type, id);
        };

        window.closeModal = () => {
            window.modalManager.close();
        };

        window.editItem = (type, id) => {
            window.modalManager.open(type, id);
        };

        // FUNCIÓN DELETE CORREGIDA - con confirmación personalizada y refresh automático
        window.deleteItem = async (type, id) => {
            console.log(`Attempting to delete ${type} with id: ${id}`);
            
            // Mensaje específico para pedidos y compras con eliminación en cascada
            const isOrder = type === 'pedido';
            const isCompra = type === 'compra';
            const isCascadeDelete = isOrder || isCompra;
            
            let message;
            if (isOrder) {
                message = '¿Estás seguro de que deseas eliminar este pedido? Se eliminarán también todos los detalles asociados. Esta acción no se puede deshacer.';
            } else if (isCompra) {
                message = '¿Estás seguro de que deseas eliminar esta compra? Se eliminarán también todos los detalles asociados. Esta acción no se puede deshacer.';
            } else {
                message = '¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.';
            }
            
            // Crear modal de confirmación personalizada
            const confirmed = await window.crmApp.showConfirmationModal(
                'Confirmar eliminación',
                message
            );
            
            if (!confirmed) {
                console.log('Delete cancelled by user');
                return;
            }

            try {
                console.log('Proceeding with delete...');
                const collectionName = window.dataService.getCollectionName(type);
                console.log(`Collection name: ${collectionName}`);
                
                // Mostrar loading durante la eliminación
                let loadingMessage;
                if (isOrder) {
                    loadingMessage = 'Eliminando pedido y detalles...';
                } else if (isCompra) {
                    loadingMessage = 'Eliminando compra y detalles...';
                } else {
                    loadingMessage = 'Eliminando registro...';
                }
                
                const loadingToast = window.notificationService.info(loadingMessage);
                
                await window.dataService.delete(collectionName, id);
                console.log('Delete successful');
                
                // Limpiar toast de loading
                window.notificationService.remove(loadingToast);
                
                // Mensaje de éxito específico
                let successMessage;
                if (isOrder) {
                    successMessage = 'Pedido y todos sus detalles eliminados exitosamente';
                } else if (isCompra) {
                    successMessage = 'Compra y todos sus detalles eliminados exitosamente';
                } else {
                    successMessage = 'Registro eliminado exitosamente';
                }
                
                window.notificationService.success(successMessage);
                
                // Invalidar caches relacionados
                window.smartCache.invalidate(`collection_${collectionName}`);
                if (isOrder) {
                    window.smartCache.invalidate('collection_tb_pedidos_detalle');
                } else if (isCompra) {
                    window.smartCache.invalidate('collection_TB_COMPRAS_DETALLE');
                }
                
                // NUEVO: Actualización específica para compras
                if (isCompra) {
                    console.log('Actualizando tabla de compras después de eliminación...');
                    await window.crmApp.forceRefreshComprasTable();
                } else if (isOrder) {
                    // Para pedidos, refresh de página completa
                    console.log('Refreshing page after order deletion...');
                    setTimeout(() => {
                        location.reload();
                    }, 1500);
                } else {
                    // Para otros tipos, solo refresh de la tabla actual
                    await window.crmApp.refreshCurrentTab();
                }
                
            } catch (error) {
                console.error('Delete error:', error);
                let errorMessage;
                if (isOrder) {
                    errorMessage = `Error al eliminar pedido y detalles: ${error.message}`;
                } else if (isCompra) {
                    errorMessage = `Error al eliminar compra y detalles: ${error.message}`;
                } else {
                    errorMessage = `Error al eliminar: ${error.message}`;
                }
                window.notificationService.error(errorMessage);
            }
        };

        // Global refresh function
        this.refreshCurrentTab = () => {
            this.loadTabData(this.currentTab);
        };
        window.refreshCurrentTab = this.refreshCurrentTab;

        // NUEVO: Configurar búsquedas cuando cambien las pestañas
        this.setupSearchFunctionality();
    }

    // NUEVA FUNCIÓN: Configurar funcionalidad de búsqueda
    setupSearchFunctionality() {
        // Configurar búsqueda para la pestaña actual cuando se muestre
        const originalShowTab = this.showTab.bind(this);
        this.showTab = async function(tabId) {
            await originalShowTab(tabId);
            
            // Configurar búsqueda después de cargar la pestaña
            setTimeout(() => {
                if (window.SearchManager) {
                    // Configurar búsqueda específica para la pestaña actual
                    const searchInputId = `${tabId}-search`;
                    const tableId = `${tabId}-table`;
                    
                    window.SearchManager.setupTableSearch(searchInputId, tableId);
                    
                    // Configuración avanzada para pedidos
                    if (tabId === 'pedidos') {
                        window.SearchManager.setupAdvancedPedidoSearch();
                    }
                    // NUEVO: Configuración avanzada para compras si es necesario
                    else if (tabId === 'compras') {
                        window.SearchManager.setupAdvancedCompraSearch();
                    }
                } else {
                    console.warn('SearchManager no disponible');
                    this.setupBasicSearch(tabId);
                }
            }, 1000);
        };
    }

    // NUEVA FUNCIÓN: Modal de confirmación personalizada
    showConfirmationModal(title, message) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal confirmation-modal show';
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
                            <i data-lucide="trash-2"></i>
                            Sí, eliminar
                        </button>
                        <button class="btn btn-primary confirm-no">
                            <i data-lucide="x"></i>
                            Cancelar
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Initialize Lucide icons for the modal
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
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

            // Close on Escape key
            const escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    document.body.removeChild(modal);
                    document.removeEventListener('keydown', escapeHandler);
                    resolve(false);
                }
            };
            document.addEventListener('keydown', escapeHandler);
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

        // Load tab data
        await this.loadTabData(tabId);
    }

    async loadTabData(tabId) {
        if (tabId === 'dashboard') {
            await this.loadDashboard();
        } else if (this.paginationManagers[tabId]) {
            await this.paginationManagers[tabId].loadPage(1);
        } else {
            console.warn(`No pagination manager found for tab: ${tabId}`);
        }
    }

    async loadDashboard() {
        try {
            const collections = [
                'clientes', 'empleados', 'tb_productos', 'tb_pedido',
                'TB_COMPRAS',  // NUEVO
                'TB_PROVEEDORES', 'TB_ESTADO', 'entregas'
            ];
            
            const counts = await Promise.all(
                collections.map(async (collection) => {
                    try {
                        const data = await window.dataService.getAll(collection);
                        return data.length;
                    } catch (error) {
                        console.warn(`Error loading ${collection}:`, error);
                        return 0;
                    }
                })
            );

            const stats = [
                { label: 'Clientes', value: counts[0], class: 'green' },
                { label: 'Empleados', value: counts[1], class: 'blue' },
                { label: 'Productos', value: counts[2], class: 'yellow' },
                { label: 'Pedidos', value: counts[3], class: 'purple' },
                { label: 'Compras', value: counts[4], class: 'indigo' },  // NUEVO
                { label: 'Proveedores', value: counts[5], class: 'red' },    // Actualizado índice
                { label: 'Estados', value: counts[6], class: 'green' },      // Actualizado índice
                { label: 'Entregas', value: counts[7], class: 'blue' }       // Actualizado índice
            ];

            const statsGrid = document.getElementById('stats-grid');
            if (statsGrid) {
                statsGrid.innerHTML = stats.map(stat => `
                    <div class="stat-card ${stat.class}">
                        <div class="stat-number">${stat.value}</div>
                        <div class="stat-label">${stat.label}</div>
                    </div>
                `).join('');
            }
            
        } catch (error) {
            console.error('Dashboard loading error:', error);
            window.notificationService.error('Error al cargar el dashboard');
        }
    }

    // Performance monitoring (optional)
    getPerformanceStats() {
        return {
            cacheStats: window.smartCache.getStats(),
            currentTab: this.currentTab,
            initialized: this.initialized,
            paginationManagers: Object.keys(this.paginationManagers).length
        };
    }

    async forceRefreshComprasTable() {
        try {
            console.log('Forzando actualización de tabla de compras desde CRMApplication...');
            
            // Limpiar caches
            if (window.smartCache) {
                window.smartCache.invalidate('collection_TB_COMPRAS');
            }
            
            // Actualizar tabla si estamos en la pestaña de compras
            if (this.paginationManagers['compras']) {
                const comprasManager = this.paginationManagers['compras'];
                comprasManager.clearCache();
                
                const activeTab = document.querySelector('.nav-btn.active');
                const isOnComprasTab = activeTab && activeTab.getAttribute('data-tab') === 'compras';
                
                if (isOnComprasTab) {
                    await comprasManager.loadPage(comprasManager.currentPage || 1);
                    console.log('Tabla de compras actualizada desde CRMApplication');
                }
            }
            
        } catch (error) {
            console.error('Error al actualizar tabla de compras:', error);
        }
    }
}

// Event listener for DOM ready
document.addEventListener('DOMContentLoaded', async () => {
    // Create global CRM app instance
    window.crmApp = new CRMApplication();
    await window.crmApp.initialize();
});

// Optional: Performance indicator
function showPerformanceIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'performance-indicator';
    indicator.innerHTML = `
        <span class="metric">Cache: <span class="value" id="cache-size">0</span></span>
        <span class="metric">Tab: <span class="value" id="current-tab">dashboard</span></span>
    `;
    document.body.appendChild(indicator);

    // Update every 5 seconds
    setInterval(() => {
        if (window.crmApp) {
            const stats = window.crmApp.getPerformanceStats();
            document.getElementById('cache-size').textContent = stats.cacheStats.size;
            document.getElementById('current-tab').textContent = stats.currentTab;
        }
    }, 5000);
}

// ===== FUNCIONES DE DEBUGGING Y UTILIDADES PARA INVENTARIO =====
// Agregar al final de main.js o como script separado

// ===== FUNCIONES GLOBALES DE DEBUGGING =====

// Función para ver el estado del inventario de un producto específico
window.debugProductoInventario = async (productId) => {
    try {
        console.log('🔍 === ANÁLISIS DE INVENTARIO DE PRODUCTO ===');
        console.log('Product ID:', productId);
        
        // 1. Obtener información del producto
        const producto = await window.dataService.getById('tb_productos', productId);
        if (!producto) {
            console.log('❌ Producto no encontrado');
            return;
        }
        
        console.log('📦 Producto:', {
            id: producto.id,
            nombre: producto.PRO_NOMBRE,
            stockActual: producto.PRO_CANTIDAD,
            precio: producto.PRO_PRECIO
        });
        
        // 2. Obtener movimientos de compra
        const detallesCompra = await window.dataService.getAll('TB_COMPRA_DETALLE');
        const comprasProducto = detallesCompra.filter(d => d.COM_DET_PRODUCTO === productId);
        
        console.log('📈 Movimientos de COMPRA:', comprasProducto.length);
        comprasProducto.forEach((compra, index) => {
            console.log(`  ${index + 1}. Compra ${compra.COM_DET_NUM}: +${compra.COM_DET_CANTIDAD} unidades`);
        });
        
        const totalComprado = comprasProducto.reduce((sum, d) => sum + (parseFloat(d.COM_DET_CANTIDAD) || 0), 0);
        console.log('📈 Total comprado:', totalComprado);
        
        // 3. Obtener movimientos de venta
        const detallesPedido = await window.dataService.getAll('tb_pedidos_detalle');
        const ventasProducto = detallesPedido.filter(d => d.PED_DET_ID === productId);
        
        console.log('📉 Movimientos de VENTA:', ventasProducto.length);
        ventasProducto.forEach((venta, index) => {
            console.log(`  ${index + 1}. Pedido ${venta.PED_DET_NUM}: -${venta.PED_DET_CANTIDAD} unidades`);
        });
        
        const totalVendido = ventasProducto.reduce((sum, d) => sum + (parseFloat(d.PED_DET_CANTIDAD) || 0), 0);
        console.log('📉 Total vendido:', totalVendido);
        
        // 4. Análisis
        const stockCalculado = totalComprado - totalVendido;
        const stockActual = parseFloat(producto.PRO_CANTIDAD) || 0;
        
        console.log('🧮 ANÁLISIS:');
        console.log('  Stock calculado (compras - ventas):', stockCalculado);
        console.log('  Stock en base de datos:', stockActual);
        console.log('  Diferencia:', stockCalculado - stockActual);
        
        if (stockCalculado === stockActual) {
            console.log('✅ El inventario está correcto');
        } else {
            console.log('❌ HAY INCONSISTENCIA EN EL INVENTARIO');
            console.log('💡 Ejecuta: await corregirInventarioProducto("' + productId + '")');
        }
        
        console.log('============================================');
        
        return {
            producto,
            totalComprado,
            totalVendido,
            stockCalculado,
            stockActual,
            diferencia: stockCalculado - stockActual,
            correcto: stockCalculado === stockActual
        };
        
    } catch (error) {
        console.error('Error en debug de inventario:', error);
    }
};

// Función para corregir el inventario de un producto específico
window.corregirInventarioProducto = async (productId) => {
    try {
        console.log('🔧 Corrigiendo inventario del producto:', productId);
        
        const resultado = await window.dataService.recalcularInventarioDesdeCeros(productId);
        
        if (resultado && resultado[0]) {
            const info = resultado[0];
            if (info.corregido) {
                console.log('✅ Inventario corregido:', {
                    producto: info.productName,
                    stockAnterior: info.stockAnterior,
                    stockNuevo: info.stockNuevo
                });
                
                // Actualizar tabla de productos si está visible
                if (window.paginationManagers && window.paginationManagers['productos']) {
                    await window.paginationManagers['productos'].loadPage(window.paginationManagers['productos'].currentPage || 1);
                }
                
                window.notificationService.success(`Inventario de ${info.productName} corregido: ${info.stockAnterior} → ${info.stockNuevo}`);
            } else {
                console.log('✅ El inventario ya estaba correcto');
                window.notificationService.info(`El inventario de ${info.productName} ya estaba correcto`);
            }
        }
        
        return resultado;
        
    } catch (error) {
        console.error('Error corrigiendo inventario:', error);
        window.notificationService.error('Error al corregir inventario: ' + error.message);
    }
};

// Función para ver todos los productos con problemas de inventario
window.verificarTodoElInventario = async () => {
    try {
        console.log('🔍 === VERIFICACIÓN COMPLETA DE INVENTARIO ===');
        
        const resultados = await window.dataService.recalcularInventarioDesdeCeros();
        
        const conProblemas = resultados.filter(r => r.corregido || r.error);
        const sinProblemas = resultados.filter(r => !r.corregido && !r.error);
        
        console.log(`✅ Productos correctos: ${sinProblemas.length}`);
        console.log(`❌ Productos con problemas: ${conProblemas.length}`);
        
        if (conProblemas.length > 0) {
            console.log('🔧 Productos corregidos:');
            conProblemas.forEach((producto, index) => {
                if (producto.error) {
                    console.log(`  ${index + 1}. ERROR - ${producto.productName}: ${producto.error}`);
                } else {
                    console.log(`  ${index + 1}. ${producto.productName}: ${producto.stockAnterior} → ${producto.stockNuevo}`);
                }
            });
        }
        
        console.log('===============================================');
        
        // Actualizar tabla de productos si está visible
        if (window.paginationManagers && window.paginationManagers['productos']) {
            await window.paginationManagers['productos'].loadPage(window.paginationManagers['productos'].currentPage || 1);
        }
        
        if (conProblemas.length > 0) {
            window.notificationService.success(`Inventario verificado: ${conProblemas.length} productos corregidos`);
        } else {
            window.notificationService.success('✅ Todo el inventario está correcto');
        }
        
        return resultados;
        
    } catch (error) {
        console.error('Error verificando inventario:', error);
        window.notificationService.error('Error verificando inventario: ' + error.message);
    }
};

// Función para generar reporte de inventario
window.generarReporteInventario = async () => {
    try {
        console.log('📊 === REPORTE DE INVENTARIO ===');
        
        const reporte = await window.dataService.generarReporteInventario();
        
        console.table(reporte.map(p => ({
            Producto: p.nombre,
            'Stock Actual': p.stockActual,
            'Total Comprado': p.totalComprado,
            'Total Vendido': p.totalVendido,
            'Valor Inventario': `S/ ${p.valorInventario.toFixed(2)}`,
            'Estado': p.estadoStock
        })));
        
        // Resumen
        const totalProductos = reporte.length;
        const sinStock = reporte.filter(p => p.stockActual <= 0).length;
        const stockBajo = reporte.filter(p => p.stockActual > 0 && p.stockActual <= 10).length;
        const valorTotal = reporte.reduce((sum, p) => sum + p.valorInventario, 0);
        
        console.log('📈 RESUMEN:');
        console.log(`  Total de productos: ${totalProductos}`);
        console.log(`  Sin stock: ${sinStock}`);
        console.log(`  Stock bajo (≤10): ${stockBajo}`);
        console.log(`  Valor total del inventario: S/ ${valorTotal.toFixed(2)}`);
        console.log('============================');
        
        return reporte;
        
    } catch (error) {
        console.error('Error generando reporte:', error);
        window.notificationService.error('Error generando reporte: ' + error.message);
    }
};

    window.monitorearInventario = () => {
        console.log('👁️ Monitor de inventario activado');
        
        // Interceptar las funciones de compra para mostrar cambios
        const originalCreate = window.dataService.createCompraDetalleWithInventory;
        const originalUpdate = window.dataService.updateCompraDetalleWithInventory;
        const originalDelete = window.dataService.deleteCompraDetalleWithInventory;
        
        if (originalCreate) {
            window.dataService.createCompraDetalleWithInventory = async function(...args) {
                const result = await originalCreate.apply(this, args);
                if (result.stockUpdate && result.stockUpdate.updated) {
                    console.log('📦 CAMBIO DE INVENTARIO - CREACIÓN:', result.stockUpdate);
                    window.notificationService.info(`Stock actualizado: ${result.stockUpdate.productName} → ${result.stockUpdate.newStock}`);
                    
                    // NUEVO: Actualizar tabla de productos automáticamente
                    setTimeout(async () => {
                        await window.actualizarTablaProductos();
                    }, 500);
                }
                return result;
            };
        }
        
        if (originalUpdate) {
            window.dataService.updateCompraDetalleWithInventory = async function(...args) {
                const result = await originalUpdate.apply(this, args);
                if (result.stockUpdate && result.stockUpdate.updated) {
                    console.log('📦 CAMBIO DE INVENTARIO - ACTUALIZACIÓN:', result.stockUpdate);
                    window.notificationService.info(`Stock actualizado: ${result.stockUpdate.productName} → ${result.stockUpdate.newStock}`);
                    
                    // NUEVO: Actualizar tabla de productos automáticamente
                    setTimeout(async () => {
                        await window.actualizarTablaProductos();
                    }, 500);
                }
                return result;
            };
        }
        
        if (originalDelete) {
            window.dataService.deleteCompraDetalleWithInventory = async function(...args) {
                const result = await originalDelete.apply(this, args);
                if (result.stockUpdate && result.stockUpdate.updated) {
                    console.log('📦 CAMBIO DE INVENTARIO - ELIMINACIÓN:', result.stockUpdate);
                    window.notificationService.info(`Stock actualizado: ${result.stockUpdate.productName} → ${result.stockUpdate.newStock}`);
                    
                    // NUEVO: Actualizar tabla de productos automáticamente
                    setTimeout(async () => {
                        await window.actualizarTablaProductos();
                    }, 500);
                }
                return result;
            };
        }
        
        console.log('✅ Monitor de inventario configurado con actualización automática de productos');
    };

// Función para obtener productos con stock bajo
window.obtenerStockBajo = async (umbral = 10) => {
    try {
        const productos = await window.dataService.getAll('tb_productos');
        const stockBajo = productos.filter(p => {
            const stock = parseFloat(p.PRO_CANTIDAD) || 0;
            return stock <= umbral;
        }).map(p => ({
            id: p.id,
            nombre: p.PRO_NOMBRE,
            stock: parseFloat(p.PRO_CANTIDAD) || 0,
            precio: parseFloat(p.PRO_PRECIO) || 0
        })).sort((a, b) => a.stock - b.stock);
        
        console.log(`⚠️ Productos con stock ≤ ${umbral}:`, stockBajo.length);
        console.table(stockBajo);
        
        return stockBajo;
        
    } catch (error) {
        console.error('Error obteniendo stock bajo:', error);
    }
};

// Auto-activar monitor si está en modo desarrollo
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    setTimeout(() => {
        window.monitorearInventario();
        console.log('🔧 Modo desarrollo detectado - Monitor de inventario activado automáticamente');
    }, 2000);
}

// ===== FUNCIONES DE DEBUGGING ACTUALIZADAS PARA ESTADO DE COMPRA =====
// Agregar estas funciones actualizadas al final de main.js

// Función para analizar inventario considerando solo compras terminadas
window.debugProductoInventarioConEstado = async (productId) => {
    try {
        console.log('🔍 === ANÁLISIS DE INVENTARIO CON ESTADO (SOLO TERMINADAS) ===');
        console.log('Product ID:', productId);
        
        // 1. Obtener información del producto
        const producto = await window.dataService.getById('tb_productos', productId);
        if (!producto) {
            console.log('❌ Producto no encontrado');
            return;
        }
        
        console.log('📦 Producto:', {
            id: producto.id,
            nombre: producto.PRO_NOMBRE,
            stockActual: producto.PRO_CANTIDAD,
            precio: producto.PRO_PRECIO
        });
        
        // 2. Obtener TODAS las compras y sus estados
        const todasCompras = await window.dataService.getAll('TB_COMPRAS');
        const comprasMap = {};
        todasCompras.forEach(compra => {
            comprasMap[compra.COM_NUM] = {
                estado: compra.COM_ESTADO_SERVICIO,
                numero: compra.COM_NUM,
                id: compra.id
            };
        });
        
        // 3. Obtener movimientos de compra y filtrar por estado
        const detallesCompra = await window.dataService.getAll('TB_COMPRA_DETALLE');
        const comprasProducto = detallesCompra.filter(d => d.COM_DET_PRODUCTO === productId);
        
        console.log('📈 ANÁLISIS DE COMPRAS:');
        console.log('  Total de movimientos de compra:', comprasProducto.length);
        
        let comprasTerminadas = [];
        let comprasPendientes = [];
        
        comprasProducto.forEach(compra => {
            const infoCompra = comprasMap[compra.COM_DET_NUM];
            const movimiento = {
                numero: compra.COM_DET_NUM,
                cantidad: parseFloat(compra.COM_DET_CANTIDAD) || 0,
                estado: infoCompra?.estado || 'Estado desconocido'
            };
            
            if (infoCompra?.estado === 'Terminado') {
                comprasTerminadas.push(movimiento);
            } else {
                comprasPendientes.push(movimiento);
            }
        });
        
        console.log('✅ Compras TERMINADAS (afectan inventario):', comprasTerminadas.length);
        comprasTerminadas.forEach((compra, index) => {
            console.log(`  ${index + 1}. Compra ${compra.numero}: +${compra.cantidad} unidades (${compra.estado})`);
        });
        
        console.log('⏸️ Compras PENDIENTES (NO afectan inventario):', comprasPendientes.length);
        comprasPendientes.forEach((compra, index) => {
            console.log(`  ${index + 1}. Compra ${compra.numero}: ${compra.cantidad} unidades (${compra.estado}) - NO CONTABILIZADA`);
        });
        
        const totalCompradoTerminado = comprasTerminadas.reduce((sum, c) => sum + c.cantidad, 0);
        const totalCompradoPendiente = comprasPendientes.reduce((sum, c) => sum + c.cantidad, 0);
        
        console.log('📊 TOTALES DE COMPRAS:');
        console.log('  Terminadas (contabilizadas):', totalCompradoTerminado);
        console.log('  Pendientes (no contabilizadas):', totalCompradoPendiente);
        console.log('  Total en sistema:', totalCompradoTerminado + totalCompradoPendiente);
        
        // 4. Obtener movimientos de venta (pedidos)
        const detallesPedido = await window.dataService.getAll('tb_pedidos_detalle');
        const ventasProducto = detallesPedido.filter(d => d.PED_DET_ID === productId);
        
        console.log('📉 Movimientos de VENTA:', ventasProducto.length);
        ventasProducto.forEach((venta, index) => {
            console.log(`  ${index + 1}. Pedido ${venta.PED_DET_NUM}: -${venta.PED_DET_CANTIDAD} unidades`);
        });
        
        const totalVendido = ventasProducto.reduce((sum, d) => sum + (parseFloat(d.PED_DET_CANTIDAD) || 0), 0);
        console.log('📉 Total vendido:', totalVendido);
        
        // 5. Análisis final
        const stockCalculado = totalCompradoTerminado - totalVendido;
        const stockActual = parseFloat(producto.PRO_CANTIDAD) || 0;
        
        console.log('🧮 ANÁLISIS FINAL:');
        console.log('  Stock calculado (compras terminadas - ventas):', stockCalculado);
        console.log('  Stock en base de datos:', stockActual);
        console.log('  Diferencia:', stockCalculado - stockActual);
        
        if (stockCalculado === stockActual) {
            console.log('✅ El inventario está correcto considerando solo compras terminadas');
        } else {
            console.log('❌ HAY INCONSISTENCIA EN EL INVENTARIO');
            if (totalCompradoPendiente > 0) {
                console.log('💡 Nota: Hay compras pendientes que podrían explicar la diferencia');
            }
            console.log('💡 Ejecuta: await corregirInventarioProducto("' + productId + '")');
        }
        
        console.log('=======================================================');
        
        return {
            producto,
            comprasTerminadas: comprasTerminadas.length,
            comprasPendientes: comprasPendientes.length,
            totalCompradoTerminado,
            totalCompradoPendiente,
            totalVendido,
            stockCalculado,
            stockActual,
            diferencia: stockCalculado - stockActual,
            correcto: stockCalculado === stockActual
        };
        
    } catch (error) {
        console.error('Error en debug de inventario con estado:', error);
    }
};

// Función para cambiar el estado de una compra y actualizar inventario
window.cambiarEstadoCompra = async (compraId, nuevoEstado) => {
    try {
        console.log('🔄 Cambiando estado de compra:', { compraId, nuevoEstado });
        
        // Obtener estado actual
        const compra = await window.dataService.getById('TB_COMPRAS', compraId);
        if (!compra) {
            console.error('❌ Compra no encontrada:', compraId);
            return;
        }
        
        const estadoAnterior = compra.COM_ESTADO_SERVICIO;
        console.log('📋 Estado anterior:', estadoAnterior);
        
        if (estadoAnterior === nuevoEstado) {
            console.log('📋 El estado ya es', nuevoEstado);
            return;
        }
        
        // Actualizar el estado
        await window.dataService.update('TB_COMPRAS', compraId, {
            COM_ESTADO_SERVICIO: nuevoEstado
        });
        
        console.log('✅ Estado actualizado en la base de datos');
        
        // Actualizar inventario
        const resultado = await window.dataService.actualizarInventarioCambioEstado(
            compraId,
            nuevoEstado,
            estadoAnterior
        );
        
        console.log('✅ Inventario actualizado:', resultado);
        
        // Mostrar resumen
        if (estadoAnterior !== 'Terminado' && nuevoEstado === 'Terminado') {
            console.log(`🔥 COMPRA TERMINADA - Se aumentó el inventario de ${resultado.detallesProcesados} productos`);
            window.notificationService.success(`Compra terminada - Inventario aumentado para ${resultado.detallesProcesados} productos`);
        } else if (estadoAnterior === 'Terminado' && nuevoEstado !== 'Terminado') {
            console.log(`⏸️ COMPRA CANCELADA - Se redujo el inventario de ${resultado.detallesProcesados} productos`);
            window.notificationService.info(`Compra cancelada - Inventario reducido para ${resultado.detallesProcesados} productos`);
        }
        
        // Actualizar tablas si están visibles
        if (window.paginationManagers) {
            if (window.paginationManagers['compras']) {
                await window.paginationManagers['compras'].loadPage(window.paginationManagers['compras'].currentPage || 1);
            }
            if (window.paginationManagers['productos']) {
                await window.paginationManagers['productos'].loadPage(window.paginationManagers['productos'].currentPage || 1);
            }
        }
        
        return resultado;
        
    } catch (error) {
        console.error('Error cambiando estado de compra:', error);
        window.notificationService.error('Error al cambiar estado: ' + error.message);
    }
};

// Función para ver el estado de todas las compras
window.verEstadosCompras = async () => {
    try {
        console.log('📊 === ESTADOS DE TODAS LAS COMPRAS ===');
        
        const compras = await window.dataService.getAll('TB_COMPRAS');
        
        const estadosCount = {};
        const comprasInfo = [];
        
        compras.forEach(compra => {
            const estado = compra.COM_ESTADO_SERVICIO || 'Sin estado';
            estadosCount[estado] = (estadosCount[estado] || 0) + 1;
            
            comprasInfo.push({
                ID: compra.id,
                Numero: compra.COM_NUM,
                Proveedor: compra.COM_PROVEEDOR,
                Estado: estado,
                Total: `S/ ${(parseFloat(compra.COM_TOTAL_FINAL) || 0).toFixed(2)}`
            });
        });
        
        console.log('📈 Resumen por estados:');
        Object.entries(estadosCount).forEach(([estado, cantidad]) => {
            console.log(`  ${estado}: ${cantidad} compras`);
        });
        
        console.log('📋 Detalle de compras:');
        console.table(comprasInfo);
        
        console.log('=====================================');
        
        return { estadosCount, comprasInfo };
        
    } catch (error) {
        console.error('Error viendo estados de compras:', error);
    }
};

// Función para recalcular inventario considerando solo compras terminadas
window.recalcularInventarioSoloTerminadas = async () => {
    try {
        console.log('🔄 === RECÁLCULO DE INVENTARIO (SOLO COMPRAS TERMINADAS) ===');
        
        const productos = await window.dataService.getAll('tb_productos');
        const todasCompras = await window.dataService.getAll('TB_COMPRAS');
        const comprasMap = {};
        
        // Crear mapa de estados de compras
        todasCompras.forEach(compra => {
            comprasMap[compra.COM_NUM] = compra.COM_ESTADO_SERVICIO;
        });
        
        const resultados = [];
        
        for (const producto of productos) {
            try {
                console.log(`📊 Recalculando: ${producto.PRO_NOMBRE}`);
                
                // Obtener detalles de compra
                const detallesCompra = await window.dataService.getAll('TB_COMPRA_DETALLE');
                const comprasProducto = detallesCompra.filter(d => 
                    d.COM_DET_PRODUCTO === producto.id && 
                    comprasMap[d.COM_DET_NUM] === 'Terminado'  // SOLO TERMINADAS
                );
                
                // Obtener detalles de venta
                const detallesPedido = await window.dataService.getAll('tb_pedidos_detalle');
                const ventasProducto = detallesPedido.filter(d => d.PED_DET_ID === producto.id);
                
                const totalCompradoTerminado = comprasProducto.reduce((sum, d) => sum + (parseFloat(d.COM_DET_CANTIDAD) || 0), 0);
                const totalVendido = ventasProducto.reduce((sum, d) => sum + (parseFloat(d.PED_DET_CANTIDAD) || 0), 0);
                const stockCalculado = totalCompradoTerminado - totalVendido;
                const stockActual = parseFloat(producto.PRO_CANTIDAD) || 0;
                
                console.log(`  Compras terminadas: ${totalCompradoTerminado}, Ventas: ${totalVendido}, Stock calculado: ${stockCalculado}, Stock actual: ${stockActual}`);
                
                if (stockCalculado !== stockActual) {
                    await window.dataService.update('tb_productos', producto.id, {
                        PRO_CANTIDAD: stockCalculado
                    });
                    console.log(`✅ Corregido: ${stockActual} → ${stockCalculado}`);
                }
                
                resultados.push({
                    producto: producto.PRO_NOMBRE,
                    comprasTerminadas: comprasProducto.length,
                    totalCompradoTerminado,
                    totalVendido,
                    stockAnterior: stockActual,
                    stockNuevo: stockCalculado,
                    corregido: stockCalculado !== stockActual
                });
                
            } catch (error) {
                console.error(`Error procesando ${producto.PRO_NOMBRE}:`, error);
            }
        }
        
        const corregidos = resultados.filter(r => r.corregido);
        
        console.log('✅ RECÁLCULO COMPLETADO');
        console.log(`  Productos procesados: ${resultados.length}`);
        console.log(`  Productos corregidos: ${corregidos.length}`);
        
        if (corregidos.length > 0) {
            console.table(corregidos);
            window.notificationService.success(`Inventario recalculado: ${corregidos.length} productos corregidos`);
        } else {
            window.notificationService.success('✅ Todo el inventario estaba correcto');
        }
        
        // Limpiar cache e invalidar
        window.smartCache.invalidate('collection_tb_productos');
        
        // Actualizar tabla de productos si está visible
        if (window.paginationManagers?.productos) {
            await window.paginationManagers.productos.loadPage(window.paginationManagers.productos.currentPage || 1);
        }
        
        return resultados;
        
    } catch (error) {
        console.error('Error recalculando inventario:', error);
        window.notificationService.error('Error en recálculo: ' + error.message);
    }
};

window.actualizarTablaProductos = async () => {
    try {
        console.log('🌐 Actualizando tabla de productos globalmente...');
        
        // Limpiar cache
        if (window.smartCache) {
            window.smartCache.invalidate('collection_tb_productos');
        }
        
        // Actualizar usando pagination manager
        if (window.paginationManagers && window.paginationManagers['productos']) {
            const productosManager = window.paginationManagers['productos'];
            comprasManager.clearCache();
            
            const currentTab = document.querySelector('.nav-btn.active');
            const isOnProductosTab = currentTab && currentTab.getAttribute('data-tab') === 'productos';
            
            if (isOnProductosTab) {
                await productosManager.loadPage(productosManager.currentPage || 1);
                console.log('✅ Tabla de productos actualizada globalmente');
                return true;
            } else {
                console.log('📋 Tabla de productos no visible, cache invalidado');
                return false;
            }
        }
        
        return false;
        
    } catch (error) {
        console.error('❌ Error en actualización global de productos:', error);
        return false;
    }
};




// Uncomment to show performance indicator
// showPerformanceIndicator();