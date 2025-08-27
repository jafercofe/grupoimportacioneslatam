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


// Uncomment to show performance indicator
// showPerformanceIndicator();