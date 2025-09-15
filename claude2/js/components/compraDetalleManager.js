class CompraDetalleManager {
    constructor() {
        this.currentCompraId = null;
        this.currentCompraNum = null;
        this.currentEditingItemId = null;
        this.detalles = [];
        this.isReadOnlyMode = false; // NUEVO: Controla si está en modo solo lectura
        this.compraEstado = null; // NUEVO: Estado actual de la compra
        this.createModal();
    }

    createModal() {
        // Crear el modal de detalles si no existe
        if (document.getElementById('modal-detalles-compra')) return;

        const modalHTML = `
            <div id="modal-detalles-compra" class="modal">
                <div class="modal-content" style="max-width: 900px;">
                    <div class="modal-header">
                        <h3 id="modal-detalles-compra-title" class="modal-title">Detalles de la Compra</h3>
                        <button onclick="compraDetalleManager.close()" class="close-btn">
                            <i data-lucide="x"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="section-header">
                            <div>
                                <h4>Items de la Compra</h4>
                                <p id="compra-info" style="color: rgba(255,255,255,0.7); font-size: 0.875rem;"></p>
                                <!-- NUEVO: Indicador de estado de compra -->
                                <div id="compra-estado-indicator" class="estado-indicator" style="display: none;">
                                    <span class="estado-badge"></span>
                                    <span class="estado-message"></span>
                                </div>
                            </div>
                            <button id="agregar-item-btn" onclick="compraDetalleManager.agregarItem()" class="btn btn-primary">
                                <i data-lucide="plus"></i>
                                Agregar Item
                            </button>
                        </div>
                        <div class="table-container">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Producto</th>
                                        <th>Cantidad</th>
                                        <th>Precio Unit.</th>
                                        <th>Total</th>
                                        <th id="acciones-header">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="detalles-compra-table">
                                    <tr><td colspan="5" class="text-center"><div class="loading"></div></td></tr>
                                </tbody>
                            </table>
                        </div>
                        <div id="compra-totales" class="totales-section">
                            <div class="total-item">
                                <strong>Subtotal: <span id="subtotal-compra">S/ 0.00</span></strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal para agregar/editar item de compra -->
            <div id="modal-item-compra-detalle" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="modal-item-compra-title" class="modal-title">Agregar Item</h3>
                        <button onclick="compraDetalleManager.closeItemModal()" class="close-btn">
                            <i data-lucide="x"></i>
                        </button>
                    </div>
                    <form id="item-compra-detalle-form">
                        <div class="form-group">
                            <label class="form-label">Producto *</label>
                            <select id="field-compra-producto" class="form-select" required>
                                <option value="">Seleccionar producto...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Cantidad *</label>
                            <input type="number" id="field-compra-cantidad" class="form-input" required min="1" step="1">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Precio Unitario *</label>
                            <input type="number" id="field-compra-precio" class="form-input" required min="0" step="0.01">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Total</label>
                            <input type="text" id="field-compra-total" class="form-input" readonly style="background: rgba(255,255,255,0.1);">
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">
                                <i data-lucide="save"></i>
                                Guardar Item
                            </button>
                            <button type="button" onclick="compraDetalleManager.closeItemModal()" class="btn btn-danger">
                                <i data-lucide="x"></i>
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.setupEventListeners();
    }

    setupEventListeners() {
        const itemForm = document.getElementById('item-compra-detalle-form');
        if (itemForm) {
            itemForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.guardarItem();
            });
        }

        // Auto-calcular total
        const cantidadField = document.getElementById('field-compra-cantidad');
        const precioField = document.getElementById('field-compra-precio');
        const totalField = document.getElementById('field-compra-total');

        const calcularTotal = () => {
            const cantidad = parseFloat(cantidadField.value) || 0;
            const precio = parseFloat(precioField.value) || 0;
            const total = cantidad * precio;
            totalField.value = `S/ ${total.toFixed(2)}`;
        };

        if (cantidadField) cantidadField.addEventListener('input', calcularTotal);
        if (precioField) precioField.addEventListener('input', calcularTotal);
    }

    async abrir(compraId, compraNum) {
        this.currentCompraId = compraId;
        this.currentCompraNum = compraNum;
        
        // NUEVO: Obtener estado de la compra
        await this.loadCompraStatus();
        
        document.getElementById('modal-detalles-compra-title').textContent = `Detalles de la Compra ${compraNum}`;
        document.getElementById('compra-info').textContent = `Número de compra: ${compraNum}`;
        
        await this.cargarDetalles();
        
        // NUEVO: Configurar interfaz según estado de compra
        this.configureInterfaceMode();
        
        document.getElementById('modal-detalles-compra').classList.add('show');
    }

    // NUEVA FUNCIÓN: Cargar estado de la compra
    async loadCompraStatus() {
        try {
            const compra = await window.dataService.getById('TB_COMPRAS', this.currentCompraId);
            if (compra) {
                this.compraEstado = compra.COM_ESTADO_SERVICIO;
                this.isReadOnlyMode = this.compraEstado === 'Terminado';
                
                console.log(`📋 Estado de compra ${this.currentCompraNum}: ${this.compraEstado}, Modo lectura: ${this.isReadOnlyMode}`);
            }
        } catch (error) {
            console.error('Error cargando estado de compra:', error);
            this.compraEstado = null;
            this.isReadOnlyMode = false;
        }
    }

    // NUEVA FUNCIÓN: Configurar interfaz según modo
    configureInterfaceMode() {
        const agregarBtn = document.getElementById('agregar-item-btn');
        const estadoIndicator = document.getElementById('compra-estado-indicator');
        const accionesHeader = document.getElementById('acciones-header');
        
        if (this.isReadOnlyMode) {
            // MODO SOLO LECTURA
            console.log('🔒 Configurando modo solo lectura para compra terminada');
            
            // Ocultar botón de agregar
            if (agregarBtn) {
                agregarBtn.style.display = 'none';
            }
            
            // Mostrar indicador de estado
            if (estadoIndicator) {
                estadoIndicator.style.display = 'flex';
                estadoIndicator.innerHTML = `
                    <span class="estado-badge terminado">✓ TERMINADO</span>
                    <span class="estado-message">Esta compra está terminada. Solo visualización disponible.</span>
                `;
            }
            
            // Cambiar header de acciones
            if (accionesHeader) {
                accionesHeader.textContent = 'Vista';
            }
            
        } else {
            // MODO EDICIÓN NORMAL
            console.log('✏️ Configurando modo edición normal');
            
            // Mostrar botón de agregar
            if (agregarBtn) {
                agregarBtn.style.display = 'flex';
            }
            
            // Mostrar indicador de estado pendiente
            if (estadoIndicator && this.compraEstado) {
                estadoIndicator.style.display = 'flex';
                estadoIndicator.innerHTML = `
                    <span class="estado-badge pendiente">⏳ PENDIENTE</span>
                    <span class="estado-message">Puedes agregar, editar y eliminar items.</span>
                `;
            } else if (estadoIndicator) {
                estadoIndicator.style.display = 'none';
            }
            
            // Header normal de acciones
            if (accionesHeader) {
                accionesHeader.textContent = 'Acciones';
            }
        }
    }

    close() {
        document.getElementById('modal-detalles-compra').classList.remove('show');
        this.currentCompraId = null;
        this.currentCompraNum = null;
        this.isReadOnlyMode = false;
        this.compraEstado = null;
    }

    async cargarDetalles() {
        try {
            console.log(`Cargando detalles para compra número: ${this.currentCompraNum}`);
            
            this.detalles = await window.dataService.getCompraDetalles(this.currentCompraNum);
            
            console.log(`Detalles encontrados:`, this.detalles);
            console.log(`Número de items: ${this.detalles.length}`);
            
            await this.renderDetalles();
            this.calcularSubtotal();
        } catch (error) {
            console.error('Error cargando detalles:', error);
            document.getElementById('detalles-compra-table').innerHTML = 
                '<tr><td colspan="5" class="text-center">Error al cargar detalles</td></tr>';
        }
    }

    async renderDetalles() {
        const tableBody = document.getElementById('detalles-compra-table');
        
        if (this.detalles.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No hay items en esta compra</td></tr>';
            return;
        }

        const rows = await Promise.all(this.detalles.map(async (detalle, index) => {
            const producto = await this.getProductoInfo(detalle.COM_DET_PRODUCTO);
            
            const cantidad = parseFloat(detalle.COM_DET_CANTIDAD) || 0;
            const precio = parseFloat(detalle.COM_DET_PRECIO) || 0;
            const total = parseFloat(detalle.COM_DET_TOTAL) || (cantidad * precio);
            
            // NUEVO: Botones condicionalmente habilitados/deshabilitados
            let botonesAccion = '';
            
            if (this.isReadOnlyMode) {
                // Solo botón de vista en modo lectura
                botonesAccion = `
                    <div class="flex gap-2">
                        <button onclick="compraDetalleManager.verItem('${detalle.id}')" class="btn btn-info btn-sm" title="Ver detalles">
                            <i data-lucide="eye"></i>
                        </button>
                        <span class="readonly-indicator">🔒</span>
                    </div>
                `;
            } else {
                // Botones completos en modo edición
                botonesAccion = `
                    <div class="flex gap-2">
                        <button onclick="compraDetalleManager.editarItem('${detalle.id}')" class="btn btn-warning btn-sm">
                            <i data-lucide="edit"></i>
                        </button>
                        <button onclick="compraDetalleManager.eliminarItem('${detalle.id}')" class="btn btn-danger btn-sm">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                `;
            }
            
            return `
                <tr class="${this.isReadOnlyMode ? 'readonly-row' : ''}">
                    <td>${producto ? producto.PRO_NOMBRE : `ID: ${detalle.COM_DET_PRODUCTO}`}</td>
                    <td>${detalle.COM_DET_CANTIDAD || 0}</td>
                    <td>S/ ${precio.toFixed(2)}</td>
                    <td>S/ ${total.toFixed(2)}</td>
                    <td>${botonesAccion}</td>
                </tr>
            `;
        }));

        tableBody.innerHTML = rows.join('');
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    async getProductoInfo(productoId) {
        try {
            const producto = await window.dataService.getById('tb_productos', productoId);
            return producto;
        } catch (error) {
            console.warn(`Error obteniendo producto ${productoId}:`, error);
            return null;
        }
    }

    calcularSubtotal() {
        const subtotal = this.detalles.reduce((sum, detalle) => {
            const cantidad = parseFloat(detalle.COM_DET_CANTIDAD) || 0;
            const precio = parseFloat(detalle.COM_DET_PRECIO) || 0;
            return sum + (cantidad * precio);
        }, 0);

        document.getElementById('subtotal-compra').textContent = `S/ ${subtotal.toFixed(2)}`;
    }

    async agregarItem() {
        // NUEVO: Verificar si está en modo solo lectura
        if (this.isReadOnlyMode) {
            window.notificationService.warning('No se pueden agregar items a una compra terminada');
            return;
        }
        
        this.currentEditingItemId = null;
        document.getElementById('modal-item-compra-title').textContent = 'Agregar Item';
        
        // Limpiar formulario
        document.getElementById('item-compra-detalle-form').reset();
        document.getElementById('field-compra-total').value = 'S/ 0.00';
        
        await this.cargarProductos();
        document.getElementById('modal-item-compra-detalle').classList.add('show');
    }

    async editarItem(itemId) {
        // NUEVO: Verificar si está en modo solo lectura
        if (this.isReadOnlyMode) {
            window.notificationService.warning('No se pueden editar items de una compra terminada');
            return;
        }
        
        const detalle = this.detalles.find(d => d.id === itemId);
        if (!detalle) return;

        this.currentEditingItemId = itemId;
        document.getElementById('modal-item-compra-title').textContent = 'Editar Item';
        
        await this.cargarProductos();
        
        document.getElementById('field-compra-producto').value = detalle.COM_DET_PRODUCTO;
        document.getElementById('field-compra-cantidad').value = detalle.COM_DET_CANTIDAD;
        document.getElementById('field-compra-precio').value = detalle.COM_DET_PRECIO;
        
        const total = (parseFloat(detalle.COM_DET_CANTIDAD) || 0) * (parseFloat(detalle.COM_DET_PRECIO) || 0);
        document.getElementById('field-compra-total').value = `S/ ${total.toFixed(2)}`;
        
        document.getElementById('modal-item-compra-detalle').classList.add('show');
    }

    // NUEVA FUNCIÓN: Ver item (solo lectura)
    async verItem(itemId) {
        const detalle = this.detalles.find(d => d.id === itemId);
        if (!detalle) return;
        
        const producto = await this.getProductoInfo(detalle.COM_DET_PRODUCTO);
        const cantidad = parseFloat(detalle.COM_DET_CANTIDAD) || 0;
        const precio = parseFloat(detalle.COM_DET_PRECIO) || 0;
        const total = cantidad * precio;
        
        // Mostrar modal de información
        const infoModal = document.createElement('div');
        infoModal.className = 'modal show';
        infoModal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h3 class="modal-title">📋 Información del Item</h3>
                    <button onclick="this.closest('.modal').remove()" class="close-btn">
                        <i data-lucide="x"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="info-item">
                        <strong>Producto:</strong><br>
                        ${producto ? producto.PRO_NOMBRE : `ID: ${detalle.COM_DET_PRODUCTO}`}
                    </div>
                    <div class="info-item">
                        <strong>Cantidad:</strong> ${cantidad} unidades
                    </div>
                    <div class="info-item">
                        <strong>Precio Unitario:</strong> S/ ${precio.toFixed(2)}
                    </div>
                    <div class="info-item">
                        <strong>Total:</strong> <span style="color: #22c55e; font-weight: bold;">S/ ${total.toFixed(2)}</span>
                    </div>
                </div>
                <div class="form-actions">
                    <button onclick="this.closest('.modal').remove()" class="btn btn-primary">
                        <i data-lucide="check"></i>
                        Cerrar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(infoModal);
        
        // Inicializar iconos
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    async cargarProductos() {
        const productoSelect = document.getElementById('field-compra-producto');
        
        try {
            const productos = await window.dataService.getAll('tb_productos');
            
            productoSelect.innerHTML = '<option value="">Seleccionar producto...</option>';
            productos.forEach(producto => {
                const option = document.createElement('option');
                option.value = producto.id;
                option.textContent = `${producto.PRO_NOMBRE} - S/ ${producto.PRO_PRECIO}`;
                productoSelect.appendChild(option);
            });

        } catch (error) {
            console.error('Error cargando productos:', error);
            productoSelect.innerHTML = '<option value="">Error cargando productos</option>';
        }
    }

    async guardarItem() {
        // NUEVO: Verificación adicional de modo solo lectura
        if (this.isReadOnlyMode) {
            window.notificationService.error('No se pueden guardar cambios en una compra terminada');
            return;
        }
        
        try {
            const formData = {
                COM_DET_NUM: this.currentCompraNum,
                COM_DET_PRODUCTO: document.getElementById('field-compra-producto').value,
                COM_DET_CANTIDAD: document.getElementById('field-compra-cantidad').value,
                COM_DET_PRECIO: document.getElementById('field-compra-precio').value
            };

            if (!formData.COM_DET_PRODUCTO || !formData.COM_DET_CANTIDAD || !formData.COM_DET_PRECIO) {
                window.notificationService.error('Producto, cantidad y precio son requeridos');
                return;
            }

            const quantity = parseFloat(formData.COM_DET_CANTIDAD);
            if (quantity <= 0) {
                window.notificationService.error('La cantidad debe ser mayor a 0');
                return;
            }

            if (this.currentEditingItemId) {
                const result = await window.dataService.updateCompraDetalleWithTotals(
                    this.currentEditingItemId, 
                    formData,
                    this.currentCompraId
                );
                window.notificationService.success('Item actualizado');
            } else {
                const result = await window.dataService.createCompraDetalleWithTotals(
                    formData,
                    this.currentCompraId
                );
                window.notificationService.success('Item agregado');
            }

            this.closeItemModal();
            await this.cargarDetalles();
            await this.actualizarTablaCompras();

        } catch (error) {
            console.error('Error guardando item:', error);
            window.notificationService.error('Error al guardar el item');
        }
    }

    async eliminarItem(itemId) {
        // NUEVO: Verificar si está en modo solo lectura
        if (this.isReadOnlyMode) {
            window.notificationService.warning('No se pueden eliminar items de una compra terminada');
            return;
        }
        
        if (!confirm('¿Eliminar este item de la compra?')) return;

        try {
            await window.dataService.deleteCompraDetalleWithTotals(
                itemId, 
                this.currentCompraNum, 
                this.currentCompraId
            );
            
            window.notificationService.success('Item eliminado');
            
            await this.cargarDetalles();
            await this.actualizarTablaCompras();
            
        } catch (error) {
            console.error('Error eliminando item:', error);
            window.notificationService.error('Error al eliminar el item');
        }
    }

    async actualizarTablaCompras() {
        try {
            const currentTab = document.querySelector('.nav-btn.active');
            const isOnComprasTab = currentTab && currentTab.getAttribute('data-tab') === 'compras';
            
            if (window.paginationManagers && window.paginationManagers['compras']) {
                const comprasManager = window.paginationManagers['compras'];
                
                window.smartCache.invalidate('collection_TB_COMPRAS');
                comprasManager.clearCache();
                
                if (isOnComprasTab) {
                    await comprasManager.loadPage(comprasManager.currentPage || 1);
                    console.log('Tabla de compras actualizada');
                }
            }
            
        } catch (error) {
            console.error('Error actualizando tabla de compras:', error);
        }
    }

    closeItemModal() {
        document.getElementById('modal-item-compra-detalle').classList.remove('show');
        this.currentEditingItemId = null;
    }
}

// Función global para abrir detalles de compra
async function verDetallesCompra(compraId, compraNum) {
    if (!window.compraDetalleManager) {
        window.compraDetalleManager = new CompraDetalleManager();
    }
    await window.compraDetalleManager.abrir(compraId, compraNum);
}

// Inicializar manager global
window.CompraDetalleManager = CompraDetalleManager;
window.verDetallesCompra = verDetallesCompra;