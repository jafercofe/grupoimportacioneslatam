class PaginationManager {
    constructor(collection, tableId, pageSize = 25) {
        this.collection = collection;
        this.tableId = tableId;
        this.pageSize = pageSize;
        this.currentPage = 1;
        this.lastVisible = null;
        this.firstVisible = null;
        this.pageCache = new Map();
    }

    async loadPage(pageNumber = 1, direction = 'forward') {
        const cacheKey = `${this.collection}_page_${pageNumber}`;
        
        if (this.pageCache.has(cacheKey)) {
            const cachedData = this.pageCache.get(cacheKey);
            this.renderPage(cachedData);
            this.updatePaginationControls();
            return;
        }

        try {
            this.showPageLoading();
            
            const db = window.firebaseManager.getDB();
            let query = db.collection(this.collection).limit(this.pageSize);
            
            if (this.collection === 'tb_pedido') {
                console.log(`Cargando página ${pageNumber} de pedidos`);
            }
            
            if (direction === 'forward' && this.lastVisible) {
                query = query.startAfter(this.lastVisible);
            } else if (direction === 'backward' && this.firstVisible) {
                query = query.endBefore(this.firstVisible);
            }
            
            const snapshot = await query.get();
            
            if (!snapshot.empty) {
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                this.firstVisible = snapshot.docs[0];
                this.lastVisible = snapshot.docs[snapshot.docs.length - 1];
                this.currentPage = pageNumber;
                
                if (this.pageCache.size >= 5) {
                    const firstKey = this.pageCache.keys().next().value;
                    this.pageCache.delete(firstKey);
                }
                this.pageCache.set(cacheKey, data);
                
                this.renderPage(data);
                this.updatePaginationControls();
            } else {
                this.showEmptyPage();
            }
            
        } catch (error) {
            console.error('Error loading page:', error);
            this.showPageError();
        }
    }

    renderPage(data) {
        const tableBody = document.getElementById(this.tableId);
        if (!tableBody) return;

        const rows = data.map(item => this.createTableRow(item)).join('');
        tableBody.innerHTML = rows;
        
        // Cargar datos relacionales según la colección
        if (this.collection === 'tb_pedido') {
            this.loadClientNames();
            this.loadPaymentTypes();
            this.loadPaymentTypes2();
            this.loadDeliveryTypes();
            this.loadEmployeeNames();
            this.loadPedidoTotals();
        } else if (this.collection === 'empleados') {
            this.loadWorkerTypes();
        } else if (this.collection === 'TB_COMPRAS') {
            // NUEVO: Cargar datos relacionales para compras
            this.loadProviderNames();
            this.loadPaymentTypes();
            this.loadPaymentTypes2();
        }
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    createTableRow(item) {
        if (this.collection === 'clientes') {
            return `
                <tr>
                    <td>${item.identificacion || ''}</td>
                    <td>${item.nombre || ''}</td>
                    <td><span class="badge ${item.tipo === 'EMPRESA' ? 'badge-blue' : 'badge-green'}">${item.tipo || 'N/A'}</span></td>
                    <td>${item.telefono || ''}</td>
                    <td>${item.email || ''}</td>
                    <td>${item.ubicacion || ''}</td>
                    <td>
                        <div class="flex gap-2">
                            <button onclick="editItem('cliente', '${item.id}')" class="btn btn-warning btn-sm">
                                <i data-lucide="edit"></i>
                            </button>
                            <button onclick="deleteItem('cliente', '${item.id}')" class="btn btn-danger btn-sm">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        } else if (this.collection === 'empleados') {
            return `
                <tr>
                    <td>${item.dni || item.DNI || ''}</td>
                    <td>${item.nombre || ''}</td>
                    <td>${item.apellido || ''}</td>
                    <td>${item.email || ''}</td>
                    <td>${item.telefono || ''}</td>
                    <td>
                        <span class="badge badge-blue" data-worker-type-id="${item.tipo || item.tipo_trabajador || item.TIP_TRA_COD || ''}">
                            <div class="loading" style="width: 12px; height: 12px; display: inline-block; margin-right: 5px;"></div>
                            Cargando...
                        </span>
                    </td>
                    <td>${this.formatDate(item.fecha_ingreso || item.fechaIngreso || item.FECHA_INGRESO) || ''}</td>
                    <td>${this.formatDate(item.fecha_salida || item.fechaSalida || item.FECHA_SALIDA) || '<span style="color: #10b981;">Activo</span>'}</td>
                    <td>${item.lugar || item.LUGAR || ''}</td>
                    <td><span class="badge ${item.estado === 'INACTIVO' ? 'badge-red' : 'badge-green'}">${item.estado || 'ACTIVO'}</span></td>
                    <td>
                        <div class="flex gap-2">
                            <button onclick="editItem('empleado', '${item.id}')" class="btn btn-warning btn-sm">
                                <i data-lucide="edit"></i>
                            </button>
                            <button onclick="deleteItem('empleado', '${item.id}')" class="btn btn-danger btn-sm">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;

        } else if (this.collection === 'tb_productos') {
            return `
                <tr>
                    <td>${item.PRO_ID || ''}</td>
                    <td>${item.PRO_NOMBRE || ''}</td>
                    <td>${item.PRO_CANTIDAD || 0}</td>
                    <td>S/ ${item.PRO_PRECIO || 0}</td>
                    <td>${item.PRO_OBS || ''}</td>
                    <td>
                        <div class="flex gap-2">
                            <button onclick="editItem('producto', '${item.id}')" class="btn btn-warning btn-sm">
                                <i data-lucide="edit"></i>
                            </button>
                            <button onclick="deleteItem('producto', '${item.id}')" class="btn btn-danger btn-sm">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        } else if (this.collection === 'TB_PROVEEDORES') {
            return `
                <tr>
                    <td>${item.PROV_ID || ''}</td>
                    <td>${item.PROV_NOM || ''}</td>
                    <td>${item.PROV_TELEFONO || ''}</td>
                    <td>${item.PROV_EMAIL || ''}</td>
                    <td>${item.PROV_DIRECCION || ''}</td>
                    <td>${item.PROV_LUGAR || ''}</td>
                    <td>
                        <div class="flex gap-2">
                            <button onclick="editItem('proveedor', '${item.id}')" class="btn btn-warning btn-sm">
                                <i data-lucide="edit"></i>
                            </button>
                            <button onclick="deleteItem('proveedor', '${item.id}')" class="btn btn-danger btn-sm">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        } else if (this.collection === 'tb_pedido') {
            // Determinar si es pago parcial para mostrar campos adicionales
            const esPagoParcial = item.PED_OPCION_PAGO === 'Parcial';
            
            return `
                <tr>
                    <td>${item.PED_NUM || ''}</td>
                    <td>
                        <span class="badge badge-green" data-client-id="${item.PED_ID || ''}">
                            <div class="loading" style="width: 12px; height: 12px; display: inline-block; margin-right: 5px;"></div>
                            Cargando...
                        </span>
                    </td>
                    <td>${item.PED_FECHA_VENTA || ''}</td>
                    <td>${item.PED_FECHA_ENTREGA || ''}</td>
                    
                    <!-- Total con información de pago parcial -->
                    <td>
                        <div class="total-info">
                            <span class="total-pedido" data-pedido-num="${item.PED_NUM || ''}">
                                <div class="loading" style="width: 12px; height: 12px; display: inline-block; margin-right: 5px;"></div>
                                Calculando...
                            </span>
                            ${esPagoParcial ? `
                                <div style="font-size: 0.75rem; color: #f59e0b; margin-top: 2px;">
                                    <span class="badge badge-yellow">Saldo: S/ ${parseFloat(item.PED_SAL || 0).toFixed(2)}</span>
                                </div>
                            ` : ''}
                        </div>
                    </td>
                    
                    <!-- Opción de Pago -->
                    <td>
                        <span class="badge ${item.PED_OPCION_PAGO === 'Parcial' ? 'badge-yellow' : 'badge-green'}">
                            ${item.PED_OPCION_PAGO || 'Total'}
                        </span>
                    </td>
                    
                    <!-- Tipo de Pago Principal -->
                    <td>
                        <span class="badge badge-blue" data-payment-id="${item.PED_PAG_COD || ''}">
                            <div class="loading" style="width: 12px; height: 12px; display: inline-block; margin-right: 5px;"></div>
                            Cargando...
                        </span>
                        ${esPagoParcial ? `
                            <div style="margin-top: 4px;">
                                <span class="badge badge-purple" data-payment-id2="${item.PED_PAG_COD2 || ''}" style="font-size: 0.65rem;">
                                    ${item.PED_PAG_COD2 ? 'Cargando 2do...' : 'Sin 2do tipo'}
                                </span>
                            </div>
                        ` : ''}
                    </td>
                    
                    <!-- Entrega -->
                    <td>
                        <span class="badge badge-blue" data-delivery-id="${item.PED_ENT_COD || ''}">
                            <div class="loading" style="width: 12px; height: 12px; display: inline-block; margin-right: 5px;"></div>
                            Cargando...
                        </span>
                    </td>
                    
                    <!-- Empleado -->
                    <td>
                        <span class="badge badge-blue" data-employee-id="${item.PED_TRA_COD || ''}">
                            <div class="loading" style="width: 12px; height: 12px; display: inline-block; margin-right: 5px;"></div>
                            Cargando...
                        </span>
                    </td>
                    
                    <!-- Estado del Servicio -->
                    <td>
                        <span class="badge ${item.PED_SERVICIO === 'Terminado' ? 'badge-green' : 'badge-yellow'}">
                            ${item.PED_SERVICIO === 'Terminado' ? '✓ Terminado' : '⏳ Pendiente'}
                        </span>
                    </td>
                    
                    <!-- Fecha de Pago Parcial (solo si aplica) -->
                    ${esPagoParcial ? `
                        <td style="font-size: 0.875rem;">
                            ${item.PED_FECHA_PARCIAL || '<span class="fecha-pendiente">Pendiente</span>'}
                        </td>
                    ` : '<td>-</td>'}
                    
                    <td>
                        <div class="flex gap-2">
                            <button onclick="verDetallesPedido('${item.id}', '${item.PED_NUM || ''}')" class="btn btn-primary btn-sm" title="Ver Detalles">
                                <i data-lucide="eye"></i>
                            </button>
                            <button onclick="editItem('pedido', '${item.id}')" class="btn btn-warning btn-sm">
                                <i data-lucide="edit"></i>
                            </button>
                            <button onclick="deleteItem('pedido', '${item.id}')" class="btn btn-danger btn-sm">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        } else if (this.collection === 'TB_COMPRAS') {
            return `
                <tr>
                    <td>${item.COM_NUM || ''}</td>
                    <td>
                        <span class="badge badge-blue" data-provider-id="${item.COM_PROVEEDOR || ''}">
                            <div class="loading" style="width: 12px; height: 12px; display: inline-block; margin-right: 5px;"></div>
                            Cargando...
                        </span>
                    </td>
                    <td>${this.formatDate(item.COM_FECHA_COMPRA) || ''}</td>
                    <td>${this.formatDate(item.COM_FECHA_RECEPCION) || ''}</td>
                    <td class="subtotal-compra">S/ ${parseFloat(item.COM_TOTAL || 0).toFixed(2)}</td>
                    <td>S/ ${parseFloat(item.COM_FLETE || 0).toFixed(2)}</td>
                    <td>S/ ${parseFloat(item.COM_ADUANAS || 0).toFixed(2)}</td>
                    <td class="total-final-compra"><strong>S/ ${parseFloat(item.COM_TOTAL_FINAL || 0).toFixed(2)}</strong></td>
                    <td>
                        <span class="badge badge-green" data-payment-id="${item.COM_TIPO_PAGO || ''}">
                            <div class="loading" style="width: 12px; height: 12px; display: inline-block; margin-right: 5px;"></div>
                            Cargando...
                        </span>
                        ${item.COM_TIPO_PAGO2 ? `
                            <div style="margin-top: 4px;">
                                <span class="badge badge-purple" data-payment-id2="${item.COM_TIPO_PAGO2}" style="font-size: 0.65rem;">
                                    Cargando 2do...
                                </span>
                            </div>
                        ` : ''}
                    </td>
                    <td>
                        <span class="badge ${item.COM_ESTADO_SERVICIO === 'Terminado' ? 'badge-green' : 'badge-yellow'}">
                            ${item.COM_ESTADO_SERVICIO === 'Terminado' ? '✓ Terminado' : '⏳ Pendiente'}
                        </span>
                    </td>
                    <td>
                        <div class="flex gap-2">
                            <button onclick="verDetallesCompra('${item.id}', '${item.COM_NUM || ''}')" class="btn btn-primary btn-sm" title="Ver Detalles">
                                <i data-lucide="eye"></i>
                            </button>
                            <button onclick="editItem('compra', '${item.id}')" class="btn btn-warning btn-sm">
                                <i data-lucide="edit"></i>
                            </button>
                            <button onclick="deleteItem('compra', '${item.id}')" class="btn btn-danger btn-sm">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        } else if (this.collection === 'TB_ESTADO') {
            return `
                <tr>
                    <td>${item.EST_DESCRIP || item.descripcion || ''}</td>
                    <td>
                        <div class="flex gap-2">
                            <button onclick="editItem('estado', '${item.id}')" class="btn btn-warning btn-sm">
                                <i data-lucide="edit"></i>
                            </button>
                            <button onclick="deleteItem('estado', '${item.id}')" class="btn btn-danger btn-sm">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        } else if (this.collection === 'tipos_pago') {
            return `
                <tr>
                    <td>${item.descripcion || ''}</td>
                    <td>${item.detalle || ''}</td>
                    <td>
                        <div class="flex gap-2">
                            <button onclick="editItem('tipo-pago', '${item.id}')" class="btn btn-warning btn-sm">
                                <i data-lucide="edit"></i>
                            </button>
                            <button onclick="deleteItem('tipo-pago', '${item.id}')" class="btn btn-danger btn-sm">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            return `
                <tr>
                    <td>${item.descripcion || ''}</td>
                    <td>
                        <div class="flex gap-2">
                            <button onclick="editItem('${this.getItemType()}', '${item.id}')" class="btn btn-warning btn-sm">
                                <i data-lucide="edit"></i>
                            </button>
                            <button onclick="deleteItem('${this.getItemType()}', '${item.id}')" class="btn btn-danger btn-sm">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    getItemType() {
        const typeMap = {
        'TB_PROVEEDORES': 'proveedor',
        'tb_productos': 'producto', 
        'tb_pedido': 'pedido',
        'TB_COMPRAS': 'compra',                    // NUEVO
        'TB_COMPRA_DETALLE': 'compra-detalle',     // NUEVO
        'TB_ESTADO': 'estado',
        'tipos_contacto': 'tipos-contacto',
        'tipos_pago': 'tipos-pago',
        'tipos_trabajador': 'tipos-trabajador',
        'entregas': 'entrega',
        'empleados': 'empleado',
        'clientes': 'cliente'
    };
        
        return typeMap[this.collection] || this.collection;
    }

    async forceRefreshWithNotification() {
        try {
            console.log(`Forcing refresh with notification for ${this.collection}`);
            
            // Mostrar indicador de carga
            this.showPageLoading();
            
            // Limpiar completamente el cache
            this.clearCache();
            
            // Invalidar también el cache global
            window.smartCache.invalidate(`collection_${this.collection}`);
            
            // Recargar desde la primera página
            await this.loadPage(1);
            
            // Notificación de éxito
            window.notificationService.info('Tabla actualizada correctamente');
            
        } catch (error) {
            console.error(`Error in force refresh for ${this.collection}:`, error);
            this.showPageError();
            window.notificationService.error('Error al actualizar la tabla');
        }
    }


    // NUEVA FUNCIÓN: Cargar tipos de trabajador para empleados
    async loadWorkerTypes() {
        try {
            const workerTypeBadges = document.querySelectorAll(`#${this.tableId} [data-worker-type-id]`);
            
            for (const badge of workerTypeBadges) {
                const workerTypeId = badge.dataset.workerTypeId;
                
                if (!workerTypeId) {
                    badge.innerHTML = 'Sin tipo';
                    badge.classList.remove('badge-blue');
                    badge.classList.add('badge-red');
                    continue;
                }
                
                try {
                    const workerTypes = await window.dataService.getAll('tipos_trabajador');
                    const workerType = workerTypes.find(type => 
                        type.id === workerTypeId || 
                        type.codigo === workerTypeId ||
                        type.descripcion === workerTypeId
                    );
                    
                    if (workerType && workerType.descripcion) {
                        badge.innerHTML = `${workerType.descripcion}`;
                        badge.classList.remove('badge-blue');
                        badge.classList.add('badge-green');
                    } else {
                        badge.innerHTML = `Código: ${workerTypeId}`;
                        badge.classList.remove('badge-blue');
                        badge.classList.add('badge-yellow');
                    }
                } catch (error) {
                    console.warn(`Error loading worker type ${workerTypeId}:`, error);
                    badge.innerHTML = `ID: ${workerTypeId}`;
                    badge.classList.remove('badge-blue');
                    badge.classList.add('badge-red');
                }
            }
        } catch (error) {
            console.error('Error loading worker types:', error);
        }
    }

    async loadClientNames() {
        try {
            const clientBadges = document.querySelectorAll(`#${this.tableId} [data-client-id]`);
            
            for (const badge of clientBadges) {
                const clientId = badge.dataset.clientId;
                if (!clientId) continue;
                
                try {
                    const client = await window.dataService.getById('clientes', clientId);
                    if (client && client.nombre) {
                        badge.innerHTML = `${client.nombre}`;
                        badge.classList.remove('badge-green');
                        badge.classList.add('badge-blue');
                    } else {
                        badge.innerHTML = `Cliente: ${clientId}`;
                        badge.classList.remove('badge-green');
                        badge.classList.add('badge-red');
                    }
                } catch (error) {
                    console.warn(`Error loading client ${clientId}:`, error);
                    badge.innerHTML = `ID: ${clientId}`;
                    badge.classList.remove('badge-green');
                    badge.classList.add('badge-yellow');
                }
            }
        } catch (error) {
            console.error('Error loading client names:', error);
        }
    }

    async loadPaymentTypes() {
        try {
            const paymentBadges = document.querySelectorAll(`#${this.tableId} [data-payment-id]`);
            
            for (const badge of paymentBadges) {
                const paymentId = badge.dataset.paymentId;
                if (!paymentId) {
                    badge.innerHTML = 'Sin tipo';
                    badge.classList.remove('badge-blue');
                    badge.classList.add('badge-red');
                    continue;
                }
                
                try {
                    const paymentTypes = await window.dataService.getAll('tipos_pago');
                    const paymentType = paymentTypes.find(type => 
                        type.id === paymentId || 
                        type.codigo === paymentId ||
                        type.descripcion === paymentId
                    );
                    
                    if (paymentType && paymentType.descripcion) {
                        badge.innerHTML = `${paymentType.descripcion}`;
                        badge.classList.remove('badge-blue');
                        badge.classList.add('badge-green');
                    } else {
                        badge.innerHTML = `Código: ${paymentId}`;
                        badge.classList.remove('badge-blue');
                        badge.classList.add('badge-yellow');
                    }
                } catch (error) {
                    console.warn(`Error loading payment type ${paymentId}:`, error);
                    badge.innerHTML = `ID: ${paymentId}`;
                    badge.classList.remove('badge-blue');
                    badge.classList.add('badge-red');
                }
            }
        } catch (error) {
            console.error('Error loading payment types:', error);
        }
    }

    async loadPaymentTypes2() {
        try {
            const payment2Badges = document.querySelectorAll(`#${this.tableId} [data-payment-id2]`);
            
            for (const badge of payment2Badges) {
                const paymentId = badge.dataset.paymentId2;
                if (!paymentId) {
                    badge.innerHTML = 'Sin 2do tipo';
                    badge.classList.remove('badge-purple');
                    badge.classList.add('badge-red');
                    continue;
                }
                
                try {
                    const paymentTypes = await window.dataService.getAll('tipos_pago');
                    const paymentType = paymentTypes.find(type => 
                        type.id === paymentId || 
                        type.codigo === paymentId ||
                        type.descripcion === paymentId
                    );
                    
                    if (paymentType && paymentType.descripcion) {
                        badge.innerHTML = `2do: ${paymentType.descripcion}`;
                        badge.classList.remove('badge-purple');
                        badge.classList.add('badge-blue');
                    } else {
                        badge.innerHTML = `2do: ${paymentId}`;
                        badge.classList.remove('badge-purple');
                        badge.classList.add('badge-yellow');
                    }
                } catch (error) {
                    console.warn(`Error loading payment type 2 ${paymentId}:`, error);
                    badge.innerHTML = `Error: ${paymentId}`;
                    badge.classList.remove('badge-purple');
                    badge.classList.add('badge-red');
                }
            }
        } catch (error) {
            console.error('Error loading payment types 2:', error);
        }
    }

    async loadDeliveryTypes() {
        try {
            const deliveryBadges = document.querySelectorAll(`#${this.tableId} [data-delivery-id]`);
            
            for (const badge of deliveryBadges) {
                const deliveryId = badge.dataset.deliveryId;
                if (!deliveryId) {
                    badge.innerHTML = 'Sin entrega';
                    badge.classList.remove('badge-blue');
                    badge.classList.add('badge-red');
                    continue;
                }
                
                try {
                    const deliveryTypes = await window.dataService.getAll('entregas');
                    const deliveryType = deliveryTypes.find(type => 
                        type.id === deliveryId || 
                        type.codigo === deliveryId ||
                        type.descripcion === deliveryId
                    );
                    
                    if (deliveryType && deliveryType.descripcion) {
                        badge.innerHTML = `${deliveryType.descripcion}`;
                        badge.classList.remove('badge-blue');
                        badge.classList.add('badge-green');
                    } else {
                        badge.innerHTML = `Código: ${deliveryId}`;
                        badge.classList.remove('badge-blue');
                        badge.classList.add('badge-yellow');
                    }
                } catch (error) {
                    console.warn(`Error loading delivery type ${deliveryId}:`, error);
                    badge.innerHTML = `ID: ${deliveryId}`;
                    badge.classList.remove('badge-blue');
                    badge.classList.add('badge-red');
                }
            }
        } catch (error) {
            console.error('Error loading delivery types:', error);
        }
    }

    async loadEmployeeNames() {
        try {
            const employeeBadges = document.querySelectorAll(`#${this.tableId} [data-employee-id]`);
            
            for (const badge of employeeBadges) {
                const employeeId = badge.dataset.employeeId;
                
                if (!employeeId) {
                    badge.innerHTML = 'Sin empleado';
                    badge.classList.remove('badge-blue');
                    badge.classList.add('badge-red');
                    continue;
                }
                
                try {
                    const employees = await window.dataService.getAll('empleados');
                    let employee = await window.dataService.getById('empleados', employeeId);
                    
                    if (employee && employee.nombre) {
                        const fullName = `${employee.nombre} ${employee.apellido || ''}`.trim();
                        badge.innerHTML = fullName;
                        badge.classList.remove('badge-blue');
                        badge.classList.add('badge-green');
                    } else {
                        let employeeByCode = employees.find(emp => {
                            const empDNI = String(emp.dni || emp.DNI || '');
                            const searchDNI = String(employeeId);
                            return empDNI === searchDNI;
                        });
                        
                        if (!employeeByCode) {
                            const legacyMapping = {
                                "1": "71727047",
                                "2": "12345678",
                                "3": "71727046"
                            };
                            
                            const mappedDNI = legacyMapping[employeeId];
                            if (mappedDNI) {
                                employeeByCode = employees.find(emp => {
                                    const empDNI = String(emp.dni || emp.DNI || '');
                                    return empDNI === mappedDNI;
                                });
                            }
                        }
                        
                        if (employeeByCode && employeeByCode.nombre) {
                            const fullName = `${employeeByCode.nombre} ${employeeByCode.apellido || ''}`.trim();
                            badge.innerHTML = fullName;
                            badge.classList.remove('badge-blue');
                            badge.classList.add('badge-green');
                        } else {
                            badge.innerHTML = `Código: ${employeeId}`;
                            badge.classList.remove('badge-blue');
                            badge.classList.add('badge-yellow');
                        }
                    }
                } catch (error) {
                    console.error(`Error loading employee ${employeeId}:`, error);
                    badge.innerHTML = `Error: ${employeeId}`;
                    badge.classList.remove('badge-blue');
                    badge.classList.add('badge-red');
                }
            }
        } catch (error) {
            console.error('Error loading employee names:', error);
        }
    }

    async loadPedidoTotals() {
        try {
            const totalElements = document.querySelectorAll(`#${this.tableId} .total-pedido[data-pedido-num]`);
            
            for (const element of totalElements) {
                const pedidoNum = element.dataset.pedidoNum;
                if (!pedidoNum) continue;
                
                try {
                    const total = await window.dataService.calcularTotalPedido(pedidoNum);
                    element.innerHTML = `S/ ${total.toFixed(2)}`;
                    element.classList.add('badge', 'badge-green');
                } catch (error) {
                    console.warn(`Error calculating total for pedido ${pedidoNum}:`, error);
                    element.innerHTML = 'Error';
                    element.classList.add('badge', 'badge-red');
                }
            }
        } catch (error) {
            console.error('Error loading pedido totals:', error);
        }
    }

    updatePaginationControls() {
        const containerId = this.tableId.replace('-table', '');
        const container = document.getElementById(containerId);
        
        if (!container) return;
        
        let paginationDiv = container.querySelector('.pagination-controls');
        if (!paginationDiv) {
            paginationDiv = document.createElement('div');
            paginationDiv.className = 'pagination-controls';
            container.appendChild(paginationDiv);
        }
        
        paginationDiv.innerHTML = `
            <div class="pagination-info">Página ${this.currentPage}</div>
            <div class="pagination-buttons">
                <button 
                    class="btn btn-primary btn-sm" 
                    onclick="paginationManagers['${this.collection}'].previousPage()"
                    ${this.currentPage <= 1 ? 'disabled' : ''}
                >
                    <i data-lucide="chevron-left"></i> Anterior
                </button>
                <button 
                    class="btn btn-primary btn-sm" 
                    onclick="paginationManagers['${this.collection}'].nextPage()"
                >
                    Siguiente <i data-lucide="chevron-right"></i>
                </button>
            </div>
        `;
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    async nextPage() {
        await this.loadPage(this.currentPage + 1, 'forward');
    }

    async previousPage() {
        if (this.currentPage > 1) {
            await this.loadPage(this.currentPage - 1, 'backward');
        }
    }

    showPageLoading() {
        const tableBody = document.getElementById(this.tableId);
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="100%" class="text-center"><div class="loading"></div></td></tr>';
        }
    }

    showEmptyPage() {
        const tableBody = document.getElementById(this.tableId);
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="100%" class="text-center">No hay más registros</td></tr>';
        }
    }

    showPageError() {
        const tableBody = document.getElementById(this.tableId);
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="100%" class="text-center">Error al cargar la página</td></tr>';
        }
    }

    clearCache() {
        this.pageCache.clear();
        this.currentPage = 1;
        this.lastVisible = null;
        this.firstVisible = null;
        console.log(`Cache limpiado para ${this.collection}`);
    }

    async forceReload() {
        console.log(`Forzando recarga completa para ${this.collection}`);
        this.clearCache();
        await this.loadPage(1);
    }

    filterCurrentPage(searchTerm) {
        const tableBody = document.getElementById(this.tableId);
        if (!tableBody) return;
        
        const rows = tableBody.querySelectorAll('tr');
        const lowerSearchTerm = searchTerm.toLowerCase();
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const shouldShow = text.includes(lowerSearchTerm);
            row.style.display = shouldShow ? '' : 'none';
        });
    }

    formatDate(dateString) {
        if (!dateString) return '';
        try {
            // Manejar diferentes formatos de fecha
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString; // Si no es válida, devolver el string original
            
            // Formatear como DD/MM/AAAA
            return date.toLocaleDateString('es-PE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            return dateString || '';
        }
    }

    async loadProviderNames() {
        try {
            const providerBadges = document.querySelectorAll(`#${this.tableId} [data-provider-id]`);
            
            for (const badge of providerBadges) {
                const providerId = badge.dataset.providerId;
                if (!providerId) {
                    badge.innerHTML = 'Sin proveedor';
                    badge.classList.remove('badge-blue');
                    badge.classList.add('badge-red');
                    continue;
                }
                
                try {
                    const provider = await window.dataService.getById('TB_PROVEEDORES', providerId);
                    if (provider && provider.PROV_NOM) {
                        badge.innerHTML = `${provider.PROV_NOM}`;
                        badge.classList.remove('badge-blue');
                        badge.classList.add('badge-green');
                    } else {
                        badge.innerHTML = `Proveedor: ${providerId}`;
                        badge.classList.remove('badge-blue');
                        badge.classList.add('badge-red');
                    }
                } catch (error) {
                    console.warn(`Error loading provider ${providerId}:`, error);
                    badge.innerHTML = `ID: ${providerId}`;
                    badge.classList.remove('badge-blue');
                    badge.classList.add('badge-yellow');
                }
            }
        } catch (error) {
            console.error('Error loading provider names:', error);
        }
    }
}

PaginationManager.prototype.forceRefreshWithNotification = async function() {
    try {
        console.log(`Forcing refresh with notification for ${this.collection}`);
        
        // Mostrar indicador de carga
        this.showPageLoading();
        
        // Limpiar completamente el cache
        this.clearCache();
        
        // Invalidar también el cache global
        window.smartCache.invalidate(`collection_${this.collection}`);
        
        // Recargar desde la primera página
        await this.loadPage(1);
        
        console.log('Force refresh completed successfully');
        
    } catch (error) {
        console.error(`Error in force refresh for ${this.collection}:`, error);
        this.showPageError();
        throw error; // Re-lanzar para que el llamador pueda manejar el error
    }
};

window.smartRefresh = async function(collectionName, showNotification = true) {
    try {
        console.log(`Smart refresh requested for: ${collectionName}`);
        
        // Mapeo de colecciones a pestañas
        const collectionToTabMap = {
            'clientes': 'clientes',
            'empleados': 'empleados', 
            'tb_productos': 'productos',
            'tb_pedido': 'pedidos',
            'TB_COMPRAS': 'compras',
            'TB_PROVEEDORES': 'proveedores',
            'TB_ESTADO': 'estados',
            'entregas': 'entregas',
            'tipos_contacto': 'tipos-contacto',
            'tipos_pago': 'tipos-pago',
            'tipos_trabajador': 'tipos-trabajador'
        };
        
        const tabName = collectionToTabMap[collectionName];
        
        if (tabName && window.paginationManagers && window.paginationManagers[tabName]) {
            await window.paginationManagers[tabName].forceRefreshWithNotification();
            if (showNotification) {
                window.notificationService.success('Tabla actualizada exitosamente');
            }
        } else {
            console.warn(`No pagination manager found for ${collectionName}`);
            // Fallback a refresh general
            if (window.crmApp) {
                await window.crmApp.refreshCurrentTab();
                if (showNotification) {
                    window.notificationService.info('Datos actualizados');
                }
            }
        }
        
    } catch (error) {
        console.error('Smart refresh failed:', error);
        if (showNotification) {
            window.notificationService.error('Error al actualizar la tabla');
        }
        throw error;
    }
};

window.PaginationManager = PaginationManager;