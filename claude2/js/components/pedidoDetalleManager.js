class PedidoDetalleManager {
    constructor() {
        this.currentPedidoId = null;
        this.currentPedidoNum = null;
        this.currentEditingItemId = null;
        this.detalles = [];
        this.createModal();
    }

    createModal() {
        // Crear el modal de detalles si no existe
        if (document.getElementById('modal-detalles')) return;

        const modalHTML = `
            <div id="modal-detalles" class="modal">
                <div class="modal-content" style="max-width: 900px;">
                    <div class="modal-header">
                        <h3 id="modal-detalles-title" class="modal-title">Detalles del Pedido</h3>
                        <button onclick="pedidoDetalleManager.close()" class="close-btn">
                            <i data-lucide="x"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="section-header">
                            <div>
                                <h4>Items del Pedido</h4>
                                <p id="pedido-info" style="color: rgba(255,255,255,0.7); font-size: 0.875rem;"></p>
                            </div>
                            <button onclick="pedidoDetalleManager.agregarItem()" class="btn btn-primary">
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
                                        <th>Subtotal</th>
                                        <th>Observaciones</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="detalles-table">
                                    <tr><td colspan="6" class="text-center"><div class="loading"></div></td></tr>
                                </tbody>
                            </table>
                        </div>
                        <div id="pedido-totales" class="totales-section">
                            <div class="total-item">
                                <strong>Total: <span id="total-pedido">S/ 0.00</span></strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal para agregar/editar item -->
            <div id="modal-item-detalle" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="modal-item-title" class="modal-title">Agregar Item</h3>
                        <button onclick="pedidoDetalleManager.closeItemModal()" class="close-btn">
                            <i data-lucide="x"></i>
                        </button>
                    </div>
                    <form id="item-detalle-form">
                        <div class="form-group">
                            <label class="form-label">Producto *</label>
                            <select id="field-producto" class="form-select" required>
                                <option value="">Seleccionar producto...</option>
                            </select>
                            <div id="stock-info" style="font-size: 0.75rem; margin-top: 0.25rem; color: #10b981;"></div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Cantidad *</label>
                            <input type="number" id="field-cantidad" class="form-input" required min="1" step="1">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Precio Unitario *</label>
                            <input type="number" id="field-precio" class="form-input" required min="0" step="0.01">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Observaciones</label>
                            <textarea id="field-observaciones" class="form-input" rows="3" placeholder="Observaciones del item (opcional)"></textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Subtotal</label>
                            <input type="text" id="field-subtotal" class="form-input" readonly style="background: rgba(255,255,255,0.1);">
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">
                                <i data-lucide="save"></i>
                                Guardar Item
                            </button>
                            <button type="button" onclick="pedidoDetalleManager.closeItemModal()" class="btn btn-danger">
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
        const itemForm = document.getElementById('item-detalle-form');
        if (itemForm) {
            itemForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.guardarItem();
            });
        }

        // Auto-calcular subtotal
        const cantidadField = document.getElementById('field-cantidad');
        const precioField = document.getElementById('field-precio');
        const subtotalField = document.getElementById('field-subtotal');

        const calcularSubtotal = () => {
            const cantidad = parseFloat(cantidadField.value) || 0;
            const precio = parseFloat(precioField.value) || 0;
            const subtotal = cantidad * precio;
            subtotalField.value = `S/ ${subtotal.toFixed(2)}`;
        };

        if (cantidadField) cantidadField.addEventListener('input', calcularSubtotal);
        if (precioField) precioField.addEventListener('input', calcularSubtotal);
    }

    async abrir(pedidoId, pedidoNum) {
        this.currentPedidoId = pedidoId;
        this.currentPedidoNum = pedidoNum;
        
        document.getElementById('modal-detalles-title').textContent = `Detalles del Pedido ${pedidoNum}`;
        document.getElementById('pedido-info').textContent = `Número de pedido: ${pedidoNum}`;
        
        await this.cargarDetalles();
        document.getElementById('modal-detalles').classList.add('show');
    }

    close() {
        document.getElementById('modal-detalles').classList.remove('show');
        this.currentPedidoId = null;
        this.currentPedidoNum = null;
    }

    async cargarDetalles() {
        try {
            console.log(`Cargando detalles para pedido número: ${this.currentPedidoNum}`);
            
            this.detalles = await window.dataService.getPedidoDetalles(this.currentPedidoNum);
            
            console.log(`Detalles encontrados:`, this.detalles);
            console.log(`Número de items: ${this.detalles.length}`);
            
            await this.renderDetalles();
            this.calcularTotal();
        } catch (error) {
            console.error('Error cargando detalles:', error);
            document.getElementById('detalles-table').innerHTML = 
                '<tr><td colspan="6" class="text-center">Error al cargar detalles</td></tr>';
        }
    }

    async renderDetalles() {
        const tableBody = document.getElementById('detalles-table');
        console.log('Elemento tabla encontrado:', tableBody);
        
        if (this.detalles.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No hay items en este pedido</td></tr>';
            return;
        }

        console.log('Procesando detalles para renderizado:');
        this.detalles.forEach((detalle, index) => {
            console.log(`Detalle ${index + 1}:`, {
                id: detalle.id,
                PED_DET_NUM: detalle.PED_DET_NUM,
                PED_DET_ID: detalle.PED_DET_ID,
                PED_DET_CANTIDAD: detalle.PED_DET_CANTIDAD,
                PED_DET_PRECIO: detalle.PED_DET_PRECIO,
                PED_DET_OBS: detalle.PED_DET_OBS
            });
        });

        const rows = await Promise.all(this.detalles.map(async (detalle, index) => {
            console.log(`Procesando fila ${index + 1} para producto ID: ${detalle.PED_DET_ID}`);
            
            const producto = await this.getProductoInfo(detalle.PED_DET_ID);
            console.log(`Producto obtenido:`, producto);
            
            const cantidad = parseFloat(detalle.PED_DET_CANTIDAD) || 0;
            const precio = parseFloat(detalle.PED_DET_PRECIO) || 0;
            const subtotal = cantidad * precio;
            
            console.log(`Cálculos: cantidad=${cantidad}, precio=${precio}, subtotal=${subtotal}`);
            
            const row = `
                <tr>
                    <td>${producto ? producto.PRO_NOMBRE : `ID: ${detalle.PED_DET_ID}`}</td>
                    <td>${detalle.PED_DET_CANTIDAD || 0}</td>
                    <td>S/ ${precio.toFixed(2)}</td>
                    <td>S/ ${subtotal.toFixed(2)}</td>
                    <td>${detalle.PED_DET_OBS || '-'}</td>
                    <td>
                        <div class="flex gap-2">
                            <button onclick="pedidoDetalleManager.editarItem('${detalle.id}')" class="btn btn-warning btn-sm">
                                <i data-lucide="edit"></i>
                            </button>
                            <button onclick="pedidoDetalleManager.eliminarItem('${detalle.id}')" class="btn btn-danger btn-sm">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            
            console.log(`Fila generada:`, row);
            return row;
        }));

        console.log('Todas las filas generadas:', rows);
        const finalHTML = rows.join('');
        console.log('HTML final que se insertará:', finalHTML);
        
        tableBody.innerHTML = finalHTML;
        console.log('HTML insertado en la tabla');
        
        // Forzar re-renderizado
        setTimeout(() => {
            tableBody.style.display = 'none';
            tableBody.offsetHeight; // Force reflow
            tableBody.style.display = '';
        }, 10);
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
            console.log('Iconos de Lucide recreados');
        }
        
        console.log('Verificando si la tabla es visible después del renderizado...');
        console.log('Tabla visible:', tableBody.offsetHeight > 0);
        console.log('Modal visible:', document.getElementById('modal-detalles').classList.contains('show'));
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

    calcularTotal() {
        const total = this.detalles.reduce((sum, detalle) => {
            const cantidad = parseFloat(detalle.PED_DET_CANTIDAD) || 0;
            const precio = parseFloat(detalle.PED_DET_PRECIO) || 0;
            return sum + (cantidad * precio);
        }, 0);

        document.getElementById('total-pedido').textContent = `S/ ${total.toFixed(2)}`;
    }

    async agregarItem() {
        this.currentEditingItemId = null;
        document.getElementById('modal-item-title').textContent = 'Agregar Item';
        
        // Limpiar formulario
        document.getElementById('item-detalle-form').reset();
        document.getElementById('field-subtotal').value = 'S/ 0.00';
        
        await this.cargarProductosConStock();
        document.getElementById('modal-item-detalle').classList.add('show');
    }

    async editarItem(itemId) {
        this.currentEditingItemId = itemId;
        const detalle = this.detalles.find(d => d.id === itemId);
        if (!detalle) return;

        document.getElementById('modal-item-title').textContent = 'Editar Item';
        
        // Cargar productos y luego llenar formulario
        await this.cargarProductosConStock();
        
        document.getElementById('field-producto').value = detalle.PED_DET_ID;
        document.getElementById('field-cantidad').value = detalle.PED_DET_CANTIDAD;
        document.getElementById('field-precio').value = detalle.PED_DET_PRECIO;
        document.getElementById('field-observaciones').value = detalle.PED_DET_OBS || '';
        
        const subtotal = (parseFloat(detalle.PED_DET_CANTIDAD) || 0) * (parseFloat(detalle.PED_DET_PRECIO) || 0);
        document.getElementById('field-subtotal').value = `S/ ${subtotal.toFixed(2)}`;
        
        // Trigger change event para mostrar stock info
        document.getElementById('field-producto').dispatchEvent(new Event('change'));
        
        document.getElementById('modal-item-detalle').classList.add('show');
    }

    async cargarProductosConStock() {
        const productoSelect = document.getElementById('field-producto');
        const cantidadField = document.getElementById('field-cantidad');
        const stockInfo = document.getElementById('stock-info');
        
        try {
            const productos = await window.dataService.getAll('tb_productos');
            
            productoSelect.innerHTML = '<option value="">Seleccionar producto...</option>';
            productos.forEach(producto => {
                const stock = parseFloat(producto.PRO_CANTIDAD) || 0;
                const option = document.createElement('option');
                option.value = producto.id;
                option.textContent = `${producto.PRO_NOMBRE} - S/ ${producto.PRO_PRECIO} (Stock: ${stock})`;
                option.dataset.precio = producto.PRO_PRECIO;
                option.dataset.stock = stock;
                
                // Deshabilitar productos sin stock
                if (stock <= 0) {
                    option.disabled = true;
                    option.textContent += ' - SIN STOCK';
                } else if (stock <= 5) {
                    option.textContent += ' - STOCK BAJO';
                }
                
                productoSelect.appendChild(option);
            });

            // Configurar event listeners
            productoSelect.addEventListener('change', (e) => {
                const selectedOption = e.target.selectedOptions[0];
                
                // Auto-llenar precio
                if (selectedOption && selectedOption.dataset.precio) {
                    document.getElementById('field-precio').value = selectedOption.dataset.precio;
                    document.getElementById('field-precio').dispatchEvent(new Event('input'));
                }
                
                // Mostrar información de stock
                if (selectedOption && selectedOption.dataset.stock) {
                    const stock = parseInt(selectedOption.dataset.stock);
                    
                    if (stock <= 0) {
                        stockInfo.style.color = '#ef4444';
                        stockInfo.textContent = 'Sin stock disponible';
                    } else if (stock <= 5) {
                        stockInfo.style.color = '#f59e0b';
                        stockInfo.textContent = `Stock bajo: ${stock} unidades`;
                    } else {
                        stockInfo.style.color = '#10b981';
                        stockInfo.textContent = `Stock disponible: ${stock} unidades`;
                    }
                    
                    // Configurar máximo en campo cantidad
                    if (cantidadField) {
                        cantidadField.setAttribute('max', stock);
                        cantidadField.title = `Máximo disponible: ${stock}`;
                    }
                    
                } else {
                    stockInfo.textContent = '';
                    if (cantidadField) {
                        cantidadField.removeAttribute('max');
                        cantidadField.title = '';
                    }
                }
            });

            // Validación en tiempo real de cantidad vs stock
            if (cantidadField) {
                cantidadField.addEventListener('input', (e) => {
                    const selectedOption = productoSelect.selectedOptions[0];
                    if (selectedOption && selectedOption.dataset.stock) {
                        const stock = parseInt(selectedOption.dataset.stock);
                        const cantidad = parseInt(e.target.value) || 0;
                        
                        if (cantidad > stock) {
                            e.target.style.borderColor = '#ef4444';
                            e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                            stockInfo.textContent = `Cantidad excede stock disponible (${stock})`;
                            stockInfo.style.color = '#ef4444';
                        } else {
                            e.target.style.borderColor = '';
                            e.target.style.backgroundColor = '';
                            if (stock <= 5) {
                                stockInfo.textContent = `Stock bajo: ${stock} unidades`;
                                stockInfo.style.color = '#f59e0b';
                            } else {
                                stockInfo.textContent = `Stock disponible: ${stock} unidades`;
                                stockInfo.style.color = '#10b981';
                            }
                        }
                    }
                });
            }

        } catch (error) {
            console.error('Error cargando productos con stock:', error);
            productoSelect.innerHTML = '<option value="">Error cargando productos</option>';
        }
    }

    async guardarItem() {
        try {
            const formData = {
                PED_DET_NUM: this.currentPedidoNum,
                PED_DET_ID: document.getElementById('field-producto').value,
                PED_DET_CANTIDAD: document.getElementById('field-cantidad').value,
                PED_DET_PRECIO: document.getElementById('field-precio').value,
                PED_DET_OBS: document.getElementById('field-observaciones').value.trim()
            };

            if (!formData.PED_DET_ID || !formData.PED_DET_CANTIDAD || !formData.PED_DET_PRECIO) {
                window.notificationService.error('Producto, cantidad y precio son requeridos');
                return;
            }

            const quantity = parseFloat(formData.PED_DET_CANTIDAD);
            if (quantity <= 0) {
                window.notificationService.error('La cantidad debe ser mayor a 0');
                return;
            }

            try {
                if (this.currentEditingItemId) {
                    // Actualizar item existente con manejo de inventario
                    const result = await window.dataService.updatePedidoDetalleWithInventory(
                        this.currentEditingItemId, 
                        formData
                    );
                    
                    if (result.stockAdjustment !== 0) {
                        const message = result.stockAdjustment > 0 
                            ? `Item actualizado. Stock reducido en ${Math.abs(result.stockAdjustment)} unidades.`
                            : `Item actualizado. Stock aumentado en ${Math.abs(result.stockAdjustment)} unidades.`;
                        window.notificationService.success(message);
                    } else {
                        window.notificationService.success('Item actualizado');
                    }
                } else {
                    // Crear nuevo item con validación de inventario
                    const result = await window.dataService.createPedidoDetalleWithInventory(formData);
                    
                    window.notificationService.success(
                        `Item agregado. Stock actualizado: ${result.stockUpdate.previousStock} → ${result.stockUpdate.newStock}`
                    );
                    
                    // Verificar si el stock está bajo
                    if (result.stockUpdate.newStock <= 5) {
                        window.notificationService.warning(
                            `Atención: Stock bajo para este producto: ${result.stockUpdate.newStock} unidades restantes`
                        );
                    }
                }

                this.closeItemModal();
                await this.cargarDetalles();
                await this.actualizarTotalPedido();
                await this.actualizarTablaPedidos();
                await this.actualizarTablaProductos();

            } catch (inventoryError) {
                if (inventoryError.message.includes('Stock insuficiente')) {
                    window.notificationService.error(`${inventoryError.message}`);
                    
                    // Resaltar el campo de cantidad
                    const cantidadField = document.getElementById('field-cantidad');
                    if (cantidadField) {
                        cantidadField.style.borderColor = '#ef4444';
                        cantidadField.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                        
                        setTimeout(() => {
                            cantidadField.style.borderColor = '';
                            cantidadField.style.backgroundColor = '';
                        }, 3000);
                    }
                } else {
                    window.notificationService.error(`Error: ${inventoryError.message}`);
                }
            }

        } catch (error) {
            console.error('Error guardando item:', error);
            window.notificationService.error('Error al guardar el item');
        }
    }

    async eliminarItem(itemId) {
        if (!confirm('¿Eliminar este item del pedido? Se devolverá el stock al inventario.')) return;

        try {
            const result = await window.dataService.deletePedidoDetalleWithInventory(itemId);
            
            window.notificationService.success(
                `Item eliminado. Stock devuelto: +${result.stockReturned.quantityChanged} unidades`
            );
            
            await this.cargarDetalles();
            await this.actualizarTotalPedido();
            await this.actualizarTablaPedidos();
            await this.actualizarTablaProductos();
            
        } catch (error) {
            console.error('Error eliminando item:', error);
            window.notificationService.error('Error al eliminar el item');
        }
    }

    async actualizarTotalPedido() {
        try {
            const total = await window.dataService.calcularTotalPedido(this.currentPedidoNum);
            
            // Actualizar el PED_TOTAL en la base de datos
            await window.dataService.update('tb_pedido', this.currentPedidoId, {
                PED_TOTAL: total
            });
            
            console.log(`Total del pedido ${this.currentPedidoNum} actualizado a: S/ ${total.toFixed(2)}`);
        } catch (error) {
            console.error('Error actualizando total del pedido:', error);
        }
    }

    async actualizarTablaPedidos() {
        try {
            console.log('Actualizando tabla de pedidos...');
            
            // Verificar si estamos en la pestaña de pedidos
            const currentTab = document.querySelector('.nav-btn.active');
            const isOnPedidosTab = currentTab && currentTab.getAttribute('data-tab') === 'pedidos';
            
            // Si existe el pagination manager de pedidos, actualizar
            if (window.paginationManagers && window.paginationManagers['pedidos']) {
                const pedidosManager = window.paginationManagers['pedidos'];
                
                // Invalidar cache y recargar página actual
                window.smartCache.invalidate('collection_tb_pedido');
                pedidosManager.clearCache();
                
                // Solo recargar si estamos viendo la pestaña de pedidos
                if (isOnPedidosTab) {
                    await pedidosManager.loadPage(pedidosManager.currentPage || 1);
                    console.log('Tabla de pedidos actualizada');
                }
                
                // Notificación discreta si no estamos en la pestaña de pedidos
                if (!isOnPedidosTab) {
                    console.log('Pedido actualizado (tabla se refrescará al cambiar a la pestaña de pedidos)');
                }
                
            } else if (window.crmApp) {
                // Fallback: usar el método del CRM app
                console.log('Usando fallback para actualizar pedidos');
                window.crmApp.refreshCurrentTab();
            }
            
        } catch (error) {
            console.error('Error actualizando tabla de pedidos:', error);
            // No mostrar error al usuario ya que es una actualización en segundo plano
        }
    }

    async actualizarTablaProductos() {
        try {
            // Verificar si estamos en la pestaña de productos
            const currentTab = document.querySelector('.nav-btn.active');
            const isOnProductosTab = currentTab && currentTab.getAttribute('data-tab') === 'productos';
            
            // Si existe el pagination manager de productos, actualizar
            if (window.paginationManagers && window.paginationManagers['productos']) {
                const productosManager = window.paginationManagers['productos'];
                
                // Invalidar cache y recargar si estamos viendo la pestaña
                window.smartCache.invalidate('collection_tb_productos');
                productosManager.clearCache();
                
                if (isOnProductosTab) {
                    await productosManager.loadPage(productosManager.currentPage || 1);
                    console.log('Tabla de productos actualizada tras cambio de inventario');
                }
            }
            
        } catch (error) {
            console.error('Error actualizando tabla de productos:', error);
        }
    }

    closeItemModal() {
        document.getElementById('modal-item-detalle').classList.remove('show');
        this.currentEditingItemId = null;
    }
}

// Función global para abrir detalles de pedido
async function verDetallesPedido(pedidoId, pedidoNum) {
    if (!window.pedidoDetalleManager) {
        window.pedidoDetalleManager = new PedidoDetalleManager();
    }
    await window.pedidoDetalleManager.abrir(pedidoId, pedidoNum);
}

// Inicializar manager global
window.PedidoDetalleManager = PedidoDetalleManager;
window.verDetallesPedido = verDetallesPedido;