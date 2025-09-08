/**
 * SearchManager - Sistema de búsqueda mejorado para CRM
 * Maneja la búsqueda en tablas con soporte para paginación y cambios dinámicos
 */

const originalLog = console.error;
console.error = function(...args) {
    const message = args.join(' ');
    if (message.includes('Fallo definitivo en búsqueda para permisos')) {
        console.log('Búsqueda para permisos saltada - es normal');
        return;
    }
    originalLog.apply(console, args);
};




class SearchManager {
    static activeSearches = new Map();
    static initialized = false;
    
    static init() {
        if (this.initialized) {
            console.log('SearchManager ya está inicializado');
            return;
        }
        
        console.log('Inicializando SearchManager...');
        
        // Configurar búsqueda para todas las tablas conocidas (incluyendo compras)
        const tables = [
            'clientes', 'empleados', 'productos', 'pedidos',
            'compras',  // NUEVO
            'proveedores', 'estados', 'entregas', 
            'tipos-contacto', 'tipos-pago', 'tipos-trabajador'
        ];
        
        let configured = 0;
        tables.forEach(tableId => {
            if (this.setupTableSearch(`${tableId}-search`, `${tableId}-table`)) {
                configured++;
            }
        });
        
        console.log(`SearchManager configurado para ${configured} de ${tables.length} tablas`);
        
        // Configurar observer para cambios de pestaña
        this.setupTabObserver();
        
        this.initialized = true;
    }
    
    static setupTableSearch(searchInputId, tableId) {
        console.log(`Configurando búsqueda: ${searchInputId} -> ${tableId}`);
        
        const searchInput = document.getElementById(searchInputId);
        const tableBody = document.getElementById(tableId);
        
        if (!searchInput) {
            console.warn(`Input de búsqueda no encontrado: ${searchInputId}`);
            return false;
        }
        
        if (!tableBody) {
            console.warn(`Tabla no encontrada: ${tableId}`);
            return false;
        }
        
        // Limpiar búsquedas anteriores para este input
        if (this.activeSearches.has(searchInputId)) {
            const oldHandler = this.activeSearches.get(searchInputId);
            searchInput.removeEventListener('input', oldHandler.inputHandler);
            searchInput.removeEventListener('keydown', oldHandler.keyHandler);
        }
        
        // Crear funciones de manejo
        const searchFunction = this.debounce((searchTerm) => {
            this.performSearch(tableBody, tableId, searchTerm);
        }, 300);
        
        const inputHandler = (e) => {
            searchFunction(e.target.value);
        };
        
        const keyHandler = (e) => {
            if (e.key === 'Escape') {
                e.target.value = '';
                searchFunction('');
                e.target.blur(); // Quitar focus después de limpiar
            }
        };
        
        // Configurar event listeners
        searchInput.addEventListener('input', inputHandler);
        searchInput.addEventListener('keydown', keyHandler);
        
        // Guardar referencia para poder limpiarlo después
        this.activeSearches.set(searchInputId, {
            inputHandler: inputHandler,
            keyHandler: keyHandler,
            searchFunction: searchFunction
        });
        
        // Mejorar placeholder para empleados
        if (searchInputId === 'empleados-search') {
            searchInput.placeholder = 'Buscar por nombre, apellido, DNI, email, teléfono...';
        }
        
        console.log(`✓ Búsqueda configurada exitosamente para ${searchInputId}`);
        return true;
    }
    
    static performSearch(tableBody, tableId, searchTerm) {
        console.log(`Ejecutando búsqueda en ${tableId} para: "${searchTerm}"`);
        
        const rows = tableBody.querySelectorAll('tr');
        const lowerSearchTerm = searchTerm.toLowerCase().trim();
        
        let visibleRows = 0;
        let totalRows = 0;
        
        rows.forEach((row, index) => {
            // Saltar filas vacías o de carga
            if (row.children.length === 0 || 
                row.classList.contains('search-results-message') ||
                row.querySelector('.loading')) {
                return;
            }
            
            totalRows++;
            let shouldShow = true;
            
            if (lowerSearchTerm) {
                shouldShow = this.matchesSearchTerm(row, lowerSearchTerm, tableId);
            }
            
            row.style.display = shouldShow ? '' : 'none';
            if (shouldShow) visibleRows++;
        });
        
        console.log(`Resultado: ${visibleRows} de ${totalRows} filas visibles para "${searchTerm}"`);
        this.updateSearchResults(tableBody, visibleRows, lowerSearchTerm);
    }
    
    static matchesSearchTerm(row, searchTerm, tableId) {
        // Estrategia de búsqueda específica por tabla
        if (tableId === 'empleados-table') {
            return this.matchesEmpleadoSearch(row, searchTerm);
        } else if (tableId === 'pedidos-table') {
            return this.matchesPedidoSearch(row, searchTerm);
        } else if (tableId === 'compras-table') {  // NUEVO
            return this.matchesCompraSearch(row, searchTerm);
        } else {
            return this.matchesGenericSearch(row, searchTerm);
        }
    }

    
    static matchesEmpleadoSearch(row, searchTerm) {
        const cells = row.children;
        if (cells.length < 8) return false;
        
        // Búsqueda en campos específicos de empleado
        const dni = (cells[0]?.textContent || '').toLowerCase();
        const nombre = (cells[1]?.textContent || '').toLowerCase();
        const apellido = (cells[2]?.textContent || '').toLowerCase();
        const email = (cells[3]?.textContent || '').toLowerCase();
        const telefono = (cells[4]?.textContent || '').toLowerCase();
        const tipo = (cells[5]?.textContent || '').toLowerCase();
        const fechaIngreso = (cells[6]?.textContent || '').toLowerCase();
        const fechaSalida = (cells[7]?.textContent || '').toLowerCase();
        const lugar = (cells[8]?.textContent || '').toLowerCase();
        const estado = (cells[9]?.textContent || '').toLowerCase();
        
        // Búsqueda combinada en nombre completo
        const nombreCompleto = `${nombre} ${apellido}`.trim();
        
        return dni.includes(searchTerm) ||
               nombre.includes(searchTerm) ||
               apellido.includes(searchTerm) ||
               nombreCompleto.includes(searchTerm) ||
               email.includes(searchTerm) ||
               telefono.includes(searchTerm) ||
               tipo.includes(searchTerm) ||
               fechaIngreso.includes(searchTerm) ||
               fechaSalida.includes(searchTerm) ||
               lugar.includes(searchTerm) ||
               estado.includes(searchTerm);
    }
    
    static matchesPedidoSearch(row, searchTerm) {
        const cells = row.children;
        if (cells.length < 10) return false;
        
        // Buscar en campos específicos de pedido
        const numero = (cells[0]?.textContent || '').toLowerCase();
        const cliente = (cells[1]?.textContent || '').toLowerCase();
        const fechaVenta = (cells[2]?.textContent || '').toLowerCase();
        const fechaEntrega = (cells[3]?.textContent || '').toLowerCase();
        const total = (cells[4]?.textContent || '').toLowerCase();
        const opcionPago = (cells[5]?.textContent || '').toLowerCase();
        const tipoPago = (cells[6]?.textContent || '').toLowerCase();
        const entrega = (cells[7]?.textContent || '').toLowerCase();
        const empleado = (cells[8]?.textContent || '').toLowerCase();
        const estadoServicio = (cells[9]?.textContent || '').toLowerCase();
        
        return numero.includes(searchTerm) ||
               cliente.includes(searchTerm) ||
               fechaVenta.includes(searchTerm) ||
               fechaEntrega.includes(searchTerm) ||
               total.includes(searchTerm) ||
               opcionPago.includes(searchTerm) ||
               tipoPago.includes(searchTerm) ||
               entrega.includes(searchTerm) ||
               empleado.includes(searchTerm) ||
               estadoServicio.includes(searchTerm);
    }
    
    static matchesGenericSearch(row, searchTerm) {
        // Búsqueda genérica en todas las celdas excepto la última (acciones)
        let rowText = '';
        for (let i = 0; i < row.children.length - 1; i++) {
            const cell = row.children[i];
            const cellText = cell.textContent || cell.innerText || '';
            rowText += cellText.toLowerCase() + ' ';
        }
        return rowText.includes(searchTerm);
    }
    
    static updateSearchResults(tableBody, visibleRows, searchTerm) {
        // Remover mensaje anterior
        const existingMessage = tableBody.querySelector('.search-results-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // Mostrar mensaje si no hay resultados
        if (searchTerm && visibleRows === 0) {
            const noResultsRow = document.createElement('tr');
            noResultsRow.className = 'search-results-message';
            noResultsRow.innerHTML = `
                <td colspan="100%" style="text-align: center; padding: 2rem; color: #6b7280; font-style: italic;">
                    <div style="margin-bottom: 0.5rem;">
                        <i data-lucide="search-x" style="width: 24px; height: 24px; margin-bottom: 0.5rem;"></i>
                    </div>
                    No se encontraron resultados para "<strong>${searchTerm}</strong>"
                    <br>
                    <small style="font-size: 0.8rem; margin-top: 0.5rem; display: block; color: #9ca3af;">
                        Intenta con otros términos de búsqueda
                    </small>
                </td>
            `;
            tableBody.appendChild(noResultsRow);
            
            // Inicializar ícono de Lucide si está disponible
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    }
    
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    static clearAllSearches() {
        console.log('Limpiando todas las búsquedas...');
        
        this.activeSearches.forEach((handlers, inputId) => {
            const input = document.getElementById(inputId);
            if (input) {
                input.value = '';
                // Trigger search to show all rows
                if (handlers.searchFunction) {
                    handlers.searchFunction('');
                }
            }
        });
        
        console.log('Todas las búsquedas limpiadas');
    }
    
    static reinitializeTableSearch(tableId) {
        const reporteTabs = ['reportes-ventas', 'reportes-compras'];
        if (reporteTabs.includes(tableId)) {
            console.log(`Búsqueda omitida para reporte: ${tableId} (tiene filtros propios)`);
            return; // SALIR SIN HACER NADA
        }
        const searchInputId = `${tableId}-search`;
        console.log(`Reinicializando búsqueda para: ${tableId}`);
        
        // Esperar a que la tabla esté completamente renderizada
        setTimeout(() => {
            const success = this.setupTableSearch(searchInputId, `${tableId}-table`);
            if (success) {
                console.log(`✓ Búsqueda reinicializada para ${tableId}`);
            } else {
                console.warn(`✗ Fallo al reinicializar búsqueda para ${tableId}`);
                
                // Retry una vez más con más delay
                setTimeout(() => {
                    const retrySuccess = this.setupTableSearch(searchInputId, `${tableId}-table`);
                    if (retrySuccess) {
                        console.log(`✓ Búsqueda reinicializada para ${tableId} (segundo intento)`);
                    } else {
                        console.error(`✗ Fallo definitivo en búsqueda para ${tableId}`);
                    }
                }, 1000);
            }
        }, 500);
    }
    
    static setupTabObserver() {
        // Observer para detectar cambios de pestaña
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && 
                    mutation.attributeName === 'class' &&
                    mutation.target.classList.contains('tab-content') &&
                    mutation.target.classList.contains('active')) {
                    
                    const tabId = mutation.target.id;
                    console.log(`Tab activada: ${tabId}, reinicializando búsqueda...`);
                    
                    // Reinicializar búsqueda para la nueva pestaña
                    this.reinitializeTableSearch(tabId);
                }
            });
        });
        
        // Observar cambios en las pestañas
        document.querySelectorAll('.tab-content').forEach(tab => {
            observer.observe(tab, { attributes: true, attributeFilter: ['class'] });
        });
        
        console.log('Tab observer configurado');
    }
    
    static setupAdvancedPedidoSearch() {
        const searchInput = document.getElementById('pedidos-search');
        if (!searchInput) return;
        
        // Placeholder más descriptivo para pedidos
        searchInput.placeholder = 'Buscar por número, cliente, empleado, estado, fechas...';
        
        console.log('Búsqueda avanzada configurada para pedidos');
    }
    
    static getStats() {
        return {
            initialized: this.initialized,
            activeSearches: this.activeSearches.size,
            searchInputs: Array.from(this.activeSearches.keys())
        };
    }
    
    // Función para debugging
    static debug() {
        console.log('=== SearchManager Debug Info ===');
        console.log('Estado:', this.getStats());
        console.log('Inputs activos:', Array.from(this.activeSearches.keys()));
        
        // Verificar cada input
        this.activeSearches.forEach((handlers, inputId) => {
            const input = document.getElementById(inputId);
            const table = document.getElementById(inputId.replace('-search', '-table'));
            console.log(`${inputId}:`, {
                inputExists: !!input,
                tableExists: !!table,
                hasValue: input ? input.value : 'N/A'
            });
        });
    }

    static matchesCompraSearch(row, searchTerm) {
        const cells = row.children;
        if (cells.length < 10) return false;
        
        // Buscar en campos específicos de compra
        const numero = (cells[0]?.textContent || '').toLowerCase();
        const proveedor = (cells[1]?.textContent || '').toLowerCase();
        const fechaCompra = (cells[2]?.textContent || '').toLowerCase();
        const fechaRecepcion = (cells[3]?.textContent || '').toLowerCase();
        const subtotal = (cells[4]?.textContent || '').toLowerCase();
        const flete = (cells[5]?.textContent || '').toLowerCase();
        const aduanas = (cells[6]?.textContent || '').toLowerCase();
        const totalFinal = (cells[7]?.textContent || '').toLowerCase();
        const tipoPago = (cells[8]?.textContent || '').toLowerCase();
        const estado = (cells[9]?.textContent || '').toLowerCase();
        
        return numero.includes(searchTerm) ||
            proveedor.includes(searchTerm) ||
            fechaCompra.includes(searchTerm) ||
            fechaRecepcion.includes(searchTerm) ||
            subtotal.includes(searchTerm) ||
            flete.includes(searchTerm) ||
            aduanas.includes(searchTerm) ||
            totalFinal.includes(searchTerm) ||
            tipoPago.includes(searchTerm) ||
            estado.includes(searchTerm);
    }

    // 4. AGREGAR función para configuración avanzada de búsqueda de compras:

    static setupAdvancedCompraSearch() {
        const searchInput = document.getElementById('compras-search');
        if (!searchInput) return;
        
        // Placeholder más descriptivo para compras
        searchInput.placeholder = 'Buscar por número, proveedor, estado, fechas, montos...';
        
        console.log('Búsqueda avanzada configurada para compras');
    }

}

// Auto-inicialización inteligente
function initializeSearchManager() {
    if (typeof window.SearchManager === 'undefined') {
        console.warn('SearchManager class not found');
        return;
    }
    
    console.log('Iniciando inicialización de SearchManager...');
    
    // Intentar inicializar varias veces para asegurar que las tablas estén renderizadas
    let attempts = 0;
    const maxAttempts = 5;
    
    const tryInitialize = () => {
        attempts++;
        console.log(`Intento de inicialización ${attempts}/${maxAttempts}`);
        
        // Verificar si al menos una tabla existe
        const tableExists = ['clientes', 'empleados', 'productos', 'pedidos'].some(id => {
            return document.getElementById(`${id}-table`) !== null;
        });
        
        if (tableExists || attempts >= maxAttempts) {
            console.log('Procediendo con inicialización...');
            window.SearchManager.init();
            
            // Configuración especial para pedidos si existe
            if (document.getElementById('pedidos-search')) {
                window.SearchManager.setupAdvancedPedidoSearch();
            }
        } else {
            console.log('Tablas no encontradas, reintentando...');
            setTimeout(tryInitialize, 1000);
        }
    };
    
    tryInitialize();
}

// Exportar globalmente
window.SearchManager = SearchManager;

// Inicialización cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeSearchManager, 1500);
    });
} else {
    setTimeout(initializeSearchManager, 1500);
}

// Debug global para testing
window.debugSearch = () => {
    if (window.SearchManager) {
        window.SearchManager.debug();
    }
};

if (window.SearchManager && window.SearchManager.setupTableSearch) {
    const originalSetupTableSearch = window.SearchManager.setupTableSearch;
    
    window.SearchManager.setupTableSearch = function(searchInputId, tableId) {
        // Saltar configuración de búsqueda para pestaña de permisos
        if (searchInputId && (searchInputId.includes('permisos') || tableId.includes('permisos'))) {
            console.log('Saltando configuración de búsqueda para pestaña de permisos');
            return;
        }
        
        return originalSetupTableSearch.call(this, searchInputId, tableId);
    };
}

// Parche para excluir la pestaña de permisos del sistema de búsqueda
(function patchSearchManager() {
    // Lista de pestañas que no necesitan búsqueda
    const excludedTabs = ['permisos'];
    
    // Interceptar setupTableSearch
    if (window.SearchManager && window.SearchManager.setupTableSearch) {
        const originalSetupTableSearch = window.SearchManager.setupTableSearch;
        window.SearchManager.setupTableSearch = function(searchInputId, tableId) {
            if (excludedTabs.some(tab => searchInputId.includes(tab) || tableId.includes(tab))) {
                console.log(`Búsqueda saltada para: ${searchInputId}`);
                return { success: true, message: 'Pestaña excluida del sistema de búsqueda' };
            }
            return originalSetupTableSearch.call(this, searchInputId, tableId);
        };
    }
    
    // Interceptar setupAdvancedSearch si existe
    if (window.SearchManager && window.SearchManager.setupAdvancedSearch) {
        const originalSetupAdvancedSearch = window.SearchManager.setupAdvancedSearch;
        window.SearchManager.setupAdvancedSearch = function(tabId) {
            if (excludedTabs.includes(tabId)) {
                console.log(`Búsqueda avanzada saltada para: ${tabId}`);
                return { success: true, message: 'Pestaña excluida del sistema de búsqueda' };
            }
            return originalSetupAdvancedSearch.call(this, tabId);
        };
    }
    
    // Interceptar cualquier función que maneje búsquedas por pestañas
    const originalConsoleError = console.error;
    console.error = function(...args) {
        const message = args.join(' ');
        if (message.includes('búsqueda para permisos') || message.includes('search for permisos')) {
            console.log('Error de búsqueda para permisos suprimido (comportamiento normal)');
            return;
        }
        originalConsoleError.apply(console, args);
    };
    
    console.log('SearchManager parcheado para excluir pestaña de permisos');
})();