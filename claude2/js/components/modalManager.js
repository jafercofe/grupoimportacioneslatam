class ModalManager {
    constructor() {
        this.currentType = null;
        this.editingItem = null;
        this.modal = document.getElementById('modal');
        this.form = document.getElementById('modal-form');
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.form) {
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSubmit();
            });
        }

        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.close();
            }
        });

        // Close modal on backdrop click
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.close();
                }
            });
        }
    }

    async open(type, id = null) {
        this.currentType = type;
        this.editingItem = id;
        
        const title = document.getElementById('modal-title');
        const fields = document.getElementById('modal-fields');
        
        title.textContent = id ? `Editar ${type}` : `Nuevo ${type}`;
        fields.innerHTML = this.getFormFields(type);
        
        // NUEVO: Mostrar/ocultar campos específicos para modo edición
        if (type === 'compra') {
            const editOnlyFields = document.querySelectorAll('.edit-only-field');
            editOnlyFields.forEach(field => {
                // Mostrar campos adicionales solo en modo edición
                field.style.display = id ? 'block' : 'none';
                
                // Si estamos en modo edición, hacer algunos campos requeridos
                if (id) {
                    const estadoField = field.querySelector('#field-COM_ESTADO_SERVICIO');
                    if (estadoField) {
                        estadoField.setAttribute('required', 'required');
                    }
                }
            });
        }
        
        // Configurar dropdowns específicos según el tipo
        if (type === 'pedido') {
            await this.setupPedidoForm(id);
        } else if (type === 'empleado') {
            await this.loadWorkerTypeDropdown();
        } else if (type === 'compra') {
            await this.setupCompraForm(id);
        }
        
        // Load data if editing
        if (id) {
            await this.loadEditData(type, id);
        }
        
        this.modal.classList.add('show');
    }

    async setupPedidoForm(editingId) {
        try {
            // Cargar dropdowns
            await Promise.all([
                this.loadClientDropdown(),
                this.loadPaymentTypeDropdown(),
                this.loadPaymentTypeDropdown2(),
                this.loadDeliveryTypeDropdown(),
                this.loadEmployeeDropdown()
            ]);
            
            // Configurar eventos para opción de pago
            const opcionPagoSelect = document.getElementById('field-PED_OPCION_PAGO');
            const saldoGroup = document.getElementById('saldo-group');
            const totalGroup = document.getElementById('total-group');
            const pagoParcialGroup = document.getElementById('pago-parcial-group');
            const fechaParcialGroup = document.getElementById('fecha-parcial-group');
            
            // Mostrar/ocultar campos según el modo (crear/editar)
            if (editingId) {
                // Al editar, mostrar el campo total
                if (totalGroup) totalGroup.style.display = 'block';
            } else {
                // Al crear, ocultar el campo total
                if (totalGroup) totalGroup.style.display = 'none';
            }
            
            if (opcionPagoSelect) {
                opcionPagoSelect.addEventListener('change', (e) => {
                    const opcion = e.target.value;
                    
                    if (opcion === 'Parcial') {
                        if (saldoGroup) saldoGroup.style.display = 'block';
                        
                        // Si estamos editando, mostrar campos adicionales para pago parcial
                        if (editingId) {
                            if (pagoParcialGroup) pagoParcialGroup.style.display = 'block';
                            if (fechaParcialGroup) fechaParcialGroup.style.display = 'block';
                        }
                        
                        // Hacer el campo PED_SAL requerido
                        const saldoField = document.getElementById('field-PED_SAL');
                        if (saldoField) saldoField.setAttribute('required', 'required');
                        
                    } else {
                        if (saldoGroup) saldoGroup.style.display = 'none';
                        if (pagoParcialGroup) pagoParcialGroup.style.display = 'none';
                        if (fechaParcialGroup) fechaParcialGroup.style.display = 'none';
                        
                        // Quitar requerimiento del campo PED_SAL
                        const saldoField = document.getElementById('field-PED_SAL');
                        if (saldoField) {
                            saldoField.removeAttribute('required');
                            saldoField.value = '';
                        }
                        
                        // Limpiar campos de pago parcial
                        const pagoCod2 = document.getElementById('field-PED_PAG_COD2');
                        const fechaParcial = document.getElementById('field-PED_FECHA_PARCIAL');
                        if (pagoCod2) pagoCod2.value = '';
                        if (fechaParcial) fechaParcial.value = '';
                    }
                });
            }
            
        } catch (error) {
            console.error('Error setting up pedido form:', error);
        }
    }

    close() {
        this.modal.classList.remove('show');
        this.currentType = null;
        this.editingItem = null;
        
        // Clear form
        if (this.form) {
            this.form.reset();
        }
    }

    async loadEditData(type, id) {
        try {
            const collectionName = window.dataService.getCollectionName(type);
            const data = await window.dataService.getById(collectionName, id);
            
            if (data) {
                if (type === 'pedido') {
                    await this.loadPedidoEditData(data);
                } else if (type === 'estado') {
                    const descripcion = data.EST_DESCRIP || data.descripcion || '';
                    const descripcionField = document.getElementById('field-descripcion');
                    if (descripcionField) {
                        descripcionField.value = descripcion;
                    }
                } else if (type === 'compra') {
                    await this.loadCompraEditData(data);
                } else {
                    Object.keys(data).forEach(key => {
                        const field = document.getElementById(`field-${key}`);
                        if (field) {
                            field.value = data[key] || '';
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error loading edit data:', error);
            window.notificationService.error('Error al cargar los datos');
        }
    }

    async loadPedidoEditData(data) {
        try {
            // Cargar datos básicos primero
            Object.keys(data).forEach(key => {
                const field = document.getElementById(`field-${key}`);
                if (field && !['PED_ID', 'PED_PAG_COD', 'PED_PAG_COD2', 'PED_ENT_COD', 'PED_TRA_COD'].includes(key)) {
                    field.value = data[key] || '';
                }
            });

            // Cargar dropdowns
            await this.loadClientDropdown(data.PED_ID);
            await this.loadPaymentTypeDropdown(data.PED_PAG_COD);
            await this.loadPaymentTypeDropdown2(data.PED_PAG_COD2);
            await this.loadDeliveryTypeDropdown(data.PED_ENT_COD);
            await this.loadEmployeeDropdown(data.PED_TRA_COD);
            
            // Configurar campos condicionales basados en PED_OPCION_PAGO
            const opcionPago = data.PED_OPCION_PAGO;
            if (opcionPago === 'Parcial') {
                document.getElementById('saldo-group').style.display = 'block';
                document.getElementById('pago-parcial-group').style.display = 'block';
                document.getElementById('fecha-parcial-group').style.display = 'block';
            }
            
            // Mostrar el campo total al editar
            const totalGroup = document.getElementById('total-group');
            if (totalGroup) totalGroup.style.display = 'block';
            
        } catch (error) {
            console.error('Error loading pedido edit data:', error);
        }
    }

    // NUEVA FUNCIÓN: Cargar tipos de trabajador para empleados
    async loadWorkerTypeDropdown(selectedTypeId) {
        const typeSelect = document.getElementById('field-tipo');
        if (!typeSelect) return;

        try {
            const workerTypes = await window.dataService.getAll('tipos_trabajador');
            
            typeSelect.innerHTML = '<option value="">Seleccionar tipo...</option>';
            workerTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type.id;
                option.textContent = type.descripcion || type.id;
                option.selected = type.id === selectedTypeId;
                typeSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading worker types:', error);
            typeSelect.innerHTML = '<option value="">Error cargando tipos</option>';
        }
    }

    async loadClientDropdown(selectedClientId) {
        const clientSelect = document.getElementById('field-PED_ID');
        if (!clientSelect) return;

        try {
            const clients = await window.dataService.getAll('clientes');
            
            clientSelect.innerHTML = '<option value="">Seleccionar cliente</option>';
            clients.forEach(client => {
                const option = document.createElement('option');
                option.value = client.id;
                option.textContent = client.nombre || client.id;
                option.selected = client.id === selectedClientId;
                clientSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading clients:', error);
            clientSelect.innerHTML = `<option value="${selectedClientId}">ID: ${selectedClientId}</option>`;
        }
    }

    async loadPaymentTypeDropdown(selectedPaymentId) {
        const paymentSelect = document.getElementById('field-PED_PAG_COD') || document.getElementById('field-COM_TIPO_PAGO');
        if (!paymentSelect) return;

        try {
            const paymentTypes = await window.dataService.getAll('tipos_pago');
            
            paymentSelect.innerHTML = '<option value="">Seleccionar tipo de pago</option>';
            paymentTypes.forEach(payment => {
                const option = document.createElement('option');
                option.value = payment.id;
                option.textContent = payment.descripcion || payment.id;
                // Solo seleccionar si hay un ID específico Y coincide
                option.selected = selectedPaymentId && (payment.id === selectedPaymentId || payment.codigo === selectedPaymentId);
                paymentSelect.appendChild(option);
            });
            
            // Forzar que no haya selección si no se pasó selectedPaymentId
            if (!selectedPaymentId) {
                paymentSelect.value = '';
            }
            
        } catch (error) {
            console.error('Error loading payment types:', error);
            paymentSelect.innerHTML = `<option value="">Error cargando tipos de pago</option>`;
        }
    }

    async loadPaymentTypeDropdown2(selectedPaymentId) {
        const paymentSelect = document.getElementById('field-PED_PAG_COD2') || document.getElementById('field-COM_TIPO_PAGO2');
        if (!paymentSelect) return;

        try {
            const paymentTypes = await window.dataService.getAll('tipos_pago');
            
            paymentSelect.innerHTML = '<option value="">Seleccionar segundo tipo de pago</option>';
            paymentTypes.forEach(payment => {
                const option = document.createElement('option');
                option.value = payment.id;
                option.textContent = payment.descripcion || payment.id;
                option.selected = payment.id === selectedPaymentId || payment.codigo === selectedPaymentId;
                paymentSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading payment types 2:', error);
            paymentSelect.innerHTML = `<option value="${selectedPaymentId}">Código: ${selectedPaymentId}</option>`;
        }
    }

    async loadDeliveryTypeDropdown(selectedDeliveryId) {
        const deliverySelect = document.getElementById('field-PED_ENT_COD');
        if (!deliverySelect) return;

        try {
            const deliveryTypes = await window.dataService.getAll('entregas');
            
            deliverySelect.innerHTML = '<option value="">Seleccionar tipo de entrega</option>';
            deliveryTypes.forEach(delivery => {
                const option = document.createElement('option');
                option.value = delivery.id;
                option.textContent = delivery.descripcion || delivery.id;
                // Solo seleccionar si hay un ID específico Y coincide
                option.selected = selectedDeliveryId && (delivery.id === selectedDeliveryId || delivery.codigo === selectedDeliveryId);
                deliverySelect.appendChild(option);
            });
            
            // Forzar que no haya selección si no se pasó selectedDeliveryId
            if (!selectedDeliveryId) {
                deliverySelect.value = '';
            }
            
        } catch (error) {
            console.error('Error loading delivery types:', error);
            deliverySelect.innerHTML = `<option value="">Error cargando tipos de entrega</option>`;
        }
    }

    async loadEmployeeDropdown(selectedEmployeeId) {
        const employeeSelect = document.getElementById('field-PED_TRA_COD');
        if (!employeeSelect) return;

        try {
            const employees = await window.dataService.getAll('empleados');
            
            employeeSelect.innerHTML = '<option value="">Seleccionar empleado</option>';
            
            // Mapeo temporal para códigos legacy
            const legacyMapping = {
                "1": "71727047",
                "2": "12345678", 
                "3": "71727046"
            };
            
            console.log('Loading employee dropdown with selectedId:', selectedEmployeeId);
            
            employees.forEach(employee => {
                const option = document.createElement('option');
                
                // Determinar el valor que se guardará (preferir DNI)
                const employeeDNI = String(employee.dni || employee.DNI || '');
                option.value = employeeDNI || employee.id;
                option.textContent = `${employee.nombre} ${employee.apellido || ''}`.trim();
                
                // Lógica de selección mejorada
                let shouldSelect = false;
                
                if (selectedEmployeeId) {
                    // Verificar coincidencia directa con DNI
                    if (employeeDNI === String(selectedEmployeeId)) {
                        shouldSelect = true;
                        console.log(`Direct DNI match: ${employeeDNI} === ${selectedEmployeeId}`);
                    }
                    // Verificar si es un código legacy que mapea a este empleado
                    else if (legacyMapping[selectedEmployeeId] === employeeDNI) {
                        shouldSelect = true;
                        console.log(`Legacy mapping match: ${selectedEmployeeId} → ${legacyMapping[selectedEmployeeId]} === ${employeeDNI}`);
                        // Actualizar el valor del select para que guarde el DNI correcto
                        option.value = employeeDNI;
                    }
                    // Verificar coincidencia por ID del documento
                    else if (employee.id === selectedEmployeeId) {
                        shouldSelect = true;
                        console.log(`Document ID match: ${employee.id} === ${selectedEmployeeId}`);
                    }
                }
                
                option.selected = shouldSelect;
                if (shouldSelect) {
                    console.log(`Selected employee: ${option.textContent} (value: ${option.value})`);
                }
                
                employeeSelect.appendChild(option);
            });
            
            // Agregar opción para el código legacy si no se encontró empleado
            if (selectedEmployeeId && !employeeSelect.value && legacyMapping[selectedEmployeeId]) {
                const legacyOption = document.createElement('option');
                legacyOption.value = selectedEmployeeId; // Mantener el código original temporalmente
                legacyOption.textContent = `Código Legacy: ${selectedEmployeeId}`;
                legacyOption.selected = true;
                legacyOption.style.color = '#f59e0b'; // Color amarillo para indicar que es temporal
                employeeSelect.appendChild(legacyOption);
                console.log(`Added legacy option for: ${selectedEmployeeId}`);
            }
            
        } catch (error) {
            console.error('Error loading employees:', error);
            employeeSelect.innerHTML = `<option value="${selectedEmployeeId}" selected>Error: ${selectedEmployeeId}</option>`;
        }
    }

    async refreshCurrentTable() {
        try {
            // Obtener la pestaña activa actual
            const activeTab = document.querySelector('.nav-btn.active');
            if (!activeTab) return;
            
            const currentTab = activeTab.getAttribute('data-tab');
            console.log('Refreshing table for tab:', currentTab);
            
            // Si hay un pagination manager para esta pestaña, refrescar la página actual
            if (window.paginationManagers && window.paginationManagers[currentTab]) {
                const manager = window.paginationManagers[currentTab];
                console.log('Clearing cache and reloading page:', manager.currentPage);
                
                // Limpiar cache y recargar página actual
                manager.clearCache();
                await manager.loadPage(manager.currentPage || 1);
                
                window.notificationService.success('Tabla actualizada');
            } else {
                // Fallback al método anterior
                window.crmApp.refreshCurrentTab();
            }
        } catch (error) {
            console.error('Error refreshing table:', error);
            // Fallback al método anterior si hay error
            if (window.crmApp) {
                window.crmApp.refreshCurrentTab();
            }
        }
    }

    // Reemplazar la función handleSubmit() en modalManager.js

    async handleSubmit() {
        try {
            const formData = this.getFormData();
            const errors = this.validateForm(formData);
            
            if (errors.length > 0) {
                window.notificationService.error(`Errores: ${errors.join(', ')}`);
                return;
            }

            const collectionName = window.dataService.getCollectionName(this.currentType);
            
            console.log('📝 Guardando datos:', { type: this.currentType, data: formData, isEditing: !!this.editingItem });
            
            if (this.editingItem) {
                // CASO ESPECIAL: Compras con cambios de estado que afectan inventario
                if (this.currentType === 'compra' && formData.COM_ESTADO_SERVICIO) {
                    console.log('🔄 Detectando cambio de estado en compra...');
                    
                    const currentCompra = await window.dataService.getById(collectionName, this.editingItem);
                    const currentEstado = currentCompra ? currentCompra.COM_ESTADO_SERVICIO : null;
                    const newEstado = formData.COM_ESTADO_SERVICIO;
                    
                    console.log(`Estado COMPRA: ${currentEstado} → ${newEstado}`);
                    
                    const isGoingToTerminado = (currentEstado !== 'Terminado' && newEstado === 'Terminado');
                    const isGoingToPendiente = (currentEstado === 'Terminado' && newEstado === 'Pendiente');
                    const needsInventoryProcessing = isGoingToTerminado || isGoingToPendiente;
                    
                    if (needsInventoryProcessing) {
                        const loadingMessage = isGoingToTerminado 
                            ? 'Procesando compra y sumando al inventario...'
                            : 'Revirtiendo compra y restando del inventario...';
                        
                        const loadingToast = window.notificationService.info(loadingMessage, 0);
                        
                        try {
                            const result = await window.dataService.update(collectionName, this.editingItem, formData);
                            
                            window.notificationService.remove(loadingToast);
                            console.log('📊 Resultado del procesamiento de COMPRA:', result);
                            
                            if (result && result.success) {
                                console.log('✅ Inventario de compra procesado/revertido exitosamente');
                                await this.guaranteedProductRefresh();
                                await this.guaranteedComprasRefresh();
                                
                                setTimeout(async () => {
                                    console.log('🔄 Refresh adicional con delay para compras...');
                                    await this.guaranteedProductRefresh();
                                }, 1000);
                            } else {
                                window.notificationService.success('Compra actualizada');
                                await this.refreshCurrentTable();
                            }
                            
                        } catch (error) {
                            window.notificationService.remove(loadingToast);
                            console.error('❌ Error actualizando compra:', error);
                            window.notificationService.error(`Error al actualizar compra: ${error.message}`);
                            return;
                        }
                    } else {
                        console.log('ℹ️ Cambio de compra sin impacto en inventario');
                        await window.dataService.update(collectionName, this.editingItem, formData);
                        window.notificationService.success('Registro actualizado');
                        await this.refreshCurrentTable();
                    }
                }
                
                // NUEVO CASO ESPECIAL: Pedidos con cambios de estado que afectan inventario
                else if (this.currentType === 'pedido' && formData.PED_SERVICIO) {
                    console.log('🔄 Detectando cambio de estado en pedido...');
                    
                    const currentPedido = await window.dataService.getById(collectionName, this.editingItem);
                    const currentEstado = currentPedido ? currentPedido.PED_SERVICIO : null;
                    const newEstado = formData.PED_SERVICIO;
                    
                    console.log(`Estado PEDIDO: ${currentEstado} → ${newEstado}`);
                    
                    const isGoingToTerminado = (currentEstado !== 'Terminado' && newEstado === 'Terminado');
                    const isGoingToPendiente = (currentEstado === 'Terminado' && newEstado === 'Pendiente');
                    const needsInventoryProcessing = isGoingToTerminado || isGoingToPendiente;
                    
                    if (needsInventoryProcessing) {
                        const loadingMessage = isGoingToTerminado 
                            ? 'Procesando pedido y restando del inventario...'
                            : 'Revirtiendo pedido y sumando al inventario...';
                        
                        const loadingToast = window.notificationService.info(loadingMessage, 0);
                        
                        try {
                            const result = await window.dataService.update(collectionName, this.editingItem, formData);
                            
                            window.notificationService.remove(loadingToast);
                            console.log('📊 Resultado del procesamiento de PEDIDO:', result);
                            
                            if (result && result.success) {
                                if (result.alreadyProcessed) {
                                    window.notificationService.success('Pedido actualizado (inventario ya procesado previamente)');
                                } else if (result.normalUpdate) {
                                    window.notificationService.success('Pedido actualizado');
                                    await this.refreshCurrentTable();
                                } else {
                                    console.log('✅ Inventario de pedido procesado/revertido exitosamente');
                                    
                                    // Refrescar tanto pedidos como productos
                                    await this.guaranteedProductRefresh();
                                    await this.guaranteedPedidosRefresh();
                                    
                                    // Refresh adicional con delay
                                    setTimeout(async () => {
                                        console.log('🔄 Refresh adicional con delay para pedidos...');
                                        await this.guaranteedProductRefresh();
                                    }, 1000);
                                }
                            } else {
                                window.notificationService.success('Pedido actualizado');
                                await this.refreshCurrentTable();
                            }
                            
                        } catch (error) {
                            window.notificationService.remove(loadingToast);
                            console.error('❌ Error actualizando pedido:', error);
                            window.notificationService.error(`Error al actualizar pedido: ${error.message}`);
                            return;
                        }
                    } else {
                        console.log('ℹ️ Cambio de pedido sin impacto en inventario');
                        await window.dataService.update(collectionName, this.editingItem, formData);
                        window.notificationService.success('Registro actualizado');
                        await this.refreshCurrentTable();
                    }
                }
                
                else {
                    // Actualización normal (no es compra ni pedido con cambio de estado)
                    await window.dataService.update(collectionName, this.editingItem, formData);
                    window.notificationService.success('Registro actualizado');

                    if (this.currentType === 'compra') {
                        await window.dataService.recalculateCompraFinalTotal(this.editingItem);
                    }
                    
                    await this.refreshCurrentTable();
                }

            } else {
                // Crear nuevo registro
                const newId = await window.dataService.create(collectionName, formData);
                window.notificationService.success('Registro creado');
                
                // Si es un pedido nuevo, abrir inmediatamente los detalles
                if (this.currentType === 'pedido') {
                    const pedidoNum = formData.PED_NUM;
                    this.close();
                    
                    setTimeout(async () => {
                        if (window.verDetallesPedido) {
                            await window.verDetallesPedido(newId, pedidoNum);
                        }
                    }, 300);
                    return;
                }
                
                await this.refreshCurrentTable();
            }
            
            this.close();
            
        } catch (error) {
            console.error('❌ Error saving:', error);
            window.notificationService.error(`Error al guardar: ${error.message}`);
        }
    }

    // NUEVA FUNCIÓN: Refresh garantizado de pedidos
    async guaranteedPedidosRefresh() {
        try {
            console.log('🔄 Ejecutando refresh garantizado de pedidos...');
            
            // Limpiar cache de pedidos
            window.smartCache.invalidate('collection_tb_pedido');
            
            if (window.paginationManagers && window.paginationManagers['pedidos']) {
                const manager = window.paginationManagers['pedidos'];
                manager.clearCache();
                
                if (typeof manager.forceReload === 'function') {
                    await manager.forceReload();
                } else {
                    await manager.loadPage(manager.currentPage || 1);
                }
                
                console.log('✅ Tabla de pedidos refrescada');
            }
            
            // Si estamos en pestaña de pedidos, refresh visual adicional
            const activeTab = document.querySelector('.nav-btn.active');
            if (activeTab && activeTab.getAttribute('data-tab') === 'pedidos') {
                console.log('🎯 Usuario en pestaña pedidos - refresh visual adicional');
                
                setTimeout(async () => {
                    if (window.paginationManagers && window.paginationManagers['pedidos']) {
                        await window.paginationManagers['pedidos'].loadPage(1);
                    }
                }, 500);
            }
            
            return true;
        } catch (error) {
            console.error('❌ Error en refresh garantizado de pedidos:', error);
            return false;
        }
    }


    async forceRefreshMultipleTables(tableNames) {
        try {
            console.log('🔄 FORZANDO refresh de múltiples tablas:', tableNames);
            
            // PASO 1: Invalidar todos los caches relacionados
            tableNames.forEach(tableName => {
                const collectionName = window.dataService.getCollectionName(tableName);
                console.log(`🗑️ Invalidando cache para: ${tableName} (${collectionName})`);
                
                // Invalidar cache principal
                window.smartCache.invalidate(`collection_${collectionName}`);
                
                // Limpiar cache del pagination manager si existe
                if (window.paginationManagers && window.paginationManagers[tableName]) {
                    window.paginationManagers[tableName].clearCache();
                }
            });
            
            // PASO 2: Esperar un momento para que se propaguen los cambios
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // PASO 3: Refrescar cada tabla de forma secuencial
            for (const tableName of tableNames) {
                console.log(`🔄 Refrescando tabla: ${tableName}`);
                
                if (window.paginationManagers && window.paginationManagers[tableName]) {
                    const manager = window.paginationManagers[tableName];
                    
                    // Limpiar cache del manager
                    manager.clearCache();
                    
                    // Forzar recarga desde base de datos
                    if (typeof manager.forceReload === 'function') {
                        await manager.forceReload();
                    } else {
                        await manager.loadPage(manager.currentPage || 1);
                    }
                    
                    console.log(`✅ Tabla ${tableName} refrescada exitosamente`);
                } else {
                    console.warn(`⚠️ No se encontró pagination manager para: ${tableName}`);
                }
            }
            
            // PASO 4: Si estamos en alguna pestaña afectada, asegurar que se vea actualizada
            const activeTab = document.querySelector('.nav-btn.active');
            if (activeTab) {
                const currentTab = activeTab.getAttribute('data-tab');
                if (tableNames.includes(currentTab)) {
                    console.log(`🎯 Pestaña activa (${currentTab}) está en las tablas a refrescar - forzando recarga visual`);
                    
                    // Pequeño delay y re-refresh de la pestaña activa para asegurar visualización
                    setTimeout(async () => {
                        if (window.paginationManagers && window.paginationManagers[currentTab]) {
                            await window.paginationManagers[currentTab].loadPage(
                                window.paginationManagers[currentTab].currentPage || 1
                            );
                        }
                    }, 200);
                }
            }
            
            console.log('✅ Force refresh múltiple completado exitosamente');
            
        } catch (error) {
            console.error('❌ Error en force refresh múltiple:', error);
            
            // Fallback: refresh básico
            console.log('🔄 Intentando fallback refresh...');
            await this.refreshCurrentTable();
        }
    }


    async refreshMultipleTables(tableNames) {
        try {
            console.log('🔄 Refrescando múltiples tablas (método estándar):', tableNames);
            
            // Invalidar caches primero
            tableNames.forEach(tableName => {
                const collectionName = window.dataService.getCollectionName(tableName);
                window.smartCache.invalidate(`collection_${collectionName}`);
            });
            
            // Refrescar en paralelo
            const refreshPromises = tableNames.map(async (tableName) => {
                if (window.paginationManagers && window.paginationManagers[tableName]) {
                    const manager = window.paginationManagers[tableName];
                    console.log(`📋 Refrescando tabla: ${tableName}`);
                    
                    // Limpiar cache y recargar página actual
                    manager.clearCache();
                    await manager.loadPage(manager.currentPage || 1);
                    return { table: tableName, success: true };
                } else {
                    console.warn(`⚠️ Manager no encontrado para: ${tableName}`);
                    return { table: tableName, success: false };
                }
            });
            
            const results = await Promise.all(refreshPromises);
            
            const successful = results.filter(r => r.success);
            console.log(`✅ ${successful.length}/${results.length} tablas refrescadas exitosamente`);
            
            // Si falló alguna, usar método forzado
            if (successful.length < results.length) {
                console.log('🔄 Algunos refreshes fallaron, usando método forzado...');
                await this.forceRefreshMultipleTables(tableNames);
            }
            
        } catch (error) {
            console.error('❌ Error refrescando múltiples tablas:', error);
            // Fallback final
            await this.refreshCurrentTable();
        }
    }

// Agregar función para mostrar indicador visual cuando una compra afectará el inventario
    setupCompraInventoryWarning() {
        const estadoField = document.getElementById('field-COM_ESTADO_SERVICIO');
        
        if (!estadoField) return;
        
        const showInventoryWarning = () => {
            const selectedEstado = estadoField.value;
            const warningContainer = document.getElementById('inventory-warning');
            
            // Eliminar warning anterior si existe
            if (warningContainer) {
                warningContainer.remove();
            }
            
            if (selectedEstado === 'Terminado') {
                // Crear y mostrar warning
                const warning = document.createElement('div');
                warning.id = 'inventory-warning';
                warning.className = 'form-group';
                warning.style.cssText = `
                    background: rgba(34, 197, 94, 0.1);
                    border: 1px solid rgba(34, 197, 94, 0.3);
                    border-radius: 8px;
                    padding: 12px;
                    margin-top: 8px;
                `;
                warning.innerHTML = `
                    <div style="display: flex; align-items: center; color: #22c55e; font-size: 0.875rem;">
                        <span style="margin-right: 8px;">📦</span>
                        <div>
                            <strong>Actualización de Inventario</strong><br>
                            Al marcar esta compra como "Terminado", los productos se agregarán automáticamente al inventario.
                        </div>
                    </div>
                `;
                
                // Insertar después del campo de estado
                estadoField.closest('.form-group').insertAdjacentElement('afterend', warning);
            }
        };
        
        estadoField.addEventListener('change', showInventoryWarning);
        
        // Ejecutar inmediatamente si ya hay un valor seleccionado
        setTimeout(showInventoryWarning, 100);
    }

    getFormData() {
        const formData = {};
        const inputs = this.form.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            if (input.id.startsWith('field-')) {
                const fieldName = input.id.replace('field-', '');
                let value = input.value.trim();
                
                // Caso especial para estados - usar EST_DESCRIP en lugar de descripcion
                if (this.currentType === 'estado' && fieldName === 'descripcion') {
                    formData['EST_DESCRIP'] = value;
                    formData['descripcion'] = value; // Mantener ambos para compatibilidad
                } else {
                    formData[fieldName] = value;
                }
            }
        });
        
        return formData;
    }

    validateForm(formData) {
        const errors = [];
        
        // Type-specific validation
        switch (this.currentType) {
            case 'cliente':
                if (!formData.identificacion) errors.push('Identificación es requerida');
                if (!formData.nombre) errors.push('Nombre es requerido');
                if (formData.email && !window.ValidationManager.rules.email(formData.email)) {
                    errors.push('Email inválido');
                }
                break;
                
            case 'empleado':
                if (!formData.dni) errors.push('DNI es requerido');
                if (formData.dni && !window.ValidationManager.rules.dni(formData.dni)) {
                    errors.push('DNI debe tener 8 dígitos');
                }
                if (!formData.nombre) errors.push('Nombre es requerido');
                if (!formData.apellido) errors.push('Apellido es requerido');
                
                if (formData.fecha_ingreso && formData.fecha_salida) {
                    const fechaIngreso = new Date(formData.fecha_ingreso);
                    const fechaSalida = new Date(formData.fecha_salida);
                    
                    if (fechaSalida <= fechaIngreso) {
                        errors.push('La fecha de salida debe ser posterior a la fecha de ingreso');
                    }
                }
                
                if (formData.email && !window.ValidationManager.rules.email(formData.email)) {
                    errors.push('Email inválido');
                }
                break;
                
            case 'producto':
                if (!formData.PRO_NOMBRE) errors.push('Nombre del producto es requerido');
                if (!formData.PRO_PRECIO) errors.push('Precio es requerido');
                if (formData.PRO_PRECIO && !window.ValidationManager.rules.positive(formData.PRO_PRECIO)) {
                    errors.push('Precio debe ser positivo');
                }
                break;

            case 'pedido':
                if (!formData.PED_NUM) errors.push('Número de pedido es requerido');
                if (!formData.PED_ID) errors.push('Cliente es requerido');
                if (!formData.PED_OPCION_PAGO) errors.push('Opción de pago es requerida');
                if (!formData.PED_SERVICIO) errors.push('Estado del servicio es requerido');
                
                if (formData.PED_OPCION_PAGO === 'Parcial') {
                    if (!formData.PED_SAL) errors.push('Monto del saldo es requerido para pago parcial');
                    if (formData.PED_SAL && !window.ValidationManager.rules.positive(formData.PED_SAL)) {
                        errors.push('El monto del saldo debe ser positivo');
                    }
                }
                break;
                
            case 'compra':
                if (!formData.COM_NUM) errors.push('Número de compra es requerido');
                if (!formData.COM_PROVEEDOR) errors.push('Proveedor es requerido');
                
                // Solo validar estado del servicio si estamos editando
                if (this.editingItem && !formData.COM_ESTADO_SERVICIO) {
                    errors.push('Estado del servicio es requerido');
                }
                
                // Validar campos numéricos
                if (formData.COM_FLETE && !window.ValidationManager.rules.positive(formData.COM_FLETE)) {
                    errors.push('El flete debe ser un valor positivo');
                }
                if (formData.COM_ADUANAS && !window.ValidationManager.rules.positive(formData.COM_ADUANAS)) {
                    errors.push('Las aduanas deben ser un valor positivo');
                }
                if (formData.COM_SALDO && !window.ValidationManager.rules.positive(formData.COM_SALDO)) {
                    errors.push('El saldo debe ser un valor positivo');
                }
                
                // Validar fechas solo si están presentes
                if (formData.COM_FECHA_COMPRA && formData.COM_FECHA_RECEPCION) {
                    const fechaCompra = new Date(formData.COM_FECHA_COMPRA);
                    const fechaRecepcion = new Date(formData.COM_FECHA_RECEPCION);
                    
                    if (fechaRecepcion < fechaCompra) {
                        errors.push('La fecha de recepción no puede ser anterior a la fecha de compra');
                    }
                }
                
                // Validar fecha de pago de saldo si hay saldo pendiente
                if (formData.COM_SALDO && parseFloat(formData.COM_SALDO) > 0 && formData.COM_FECHA_PAGO_SALDO) {
                    const fechaPagoSaldo = new Date(formData.COM_FECHA_PAGO_SALDO);
                    const fechaCompra = formData.COM_FECHA_COMPRA ? new Date(formData.COM_FECHA_COMPRA) : null;
                    
                    if (fechaCompra && fechaPagoSaldo < fechaCompra) {
                        errors.push('La fecha de pago de saldo no puede ser anterior a la fecha de compra');
                    }
                }
                break;
                
            case 'tipo-pago':
            case 'tipo-trabajador':
            case 'tipo-contacto':
                if (!formData.descripcion) errors.push('Descripción es requerida');
                break;
        }
        
        return errors;
    }

    setupEmployeeFormLogic() {
        const fechaSalidaInput = document.getElementById('field-fecha_salida');
        const estadoSelect = document.getElementById('field-estado');
        
        if (fechaSalidaInput && estadoSelect) {
            fechaSalidaInput.addEventListener('change', (e) => {
                const fechaSalida = e.target.value;
                
                if (fechaSalida) {
                    // Si hay fecha de salida, sugerir estado inactivo
                    const today = new Date().toISOString().split('T')[0];
                    if (fechaSalida <= today) {
                        estadoSelect.value = 'INACTIVO';
                        estadoSelect.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                    }
                } else {
                    // Si no hay fecha de salida, sugerir estado activo
                    estadoSelect.value = 'ACTIVO';
                    estadoSelect.style.backgroundColor = '';
                }
            });
            
            // También validar al cambiar el estado manualmente
            estadoSelect.addEventListener('change', (e) => {
                if (e.target.value === 'INACTIVO' && !fechaSalidaInput.value) {
                    // Mostrar advertencia visual
                    fechaSalidaInput.style.borderColor = '#f59e0b';
                    fechaSalidaInput.placeholder = 'Recomendado agregar fecha de salida para empleados inactivos';
                } else {
                    fechaSalidaInput.style.borderColor = '';
                    fechaSalidaInput.placeholder = '';
                }
            });
        }
    }

    async setupCompraForm(editingId) {
        try {
            // Cargar dropdowns
            await Promise.all([
                this.loadProviderDropdown(),
                this.loadPaymentTypeDropdown(),
                this.loadPaymentTypeDropdown2()
            ]);
            
            // Configurar eventos para campos que afectan el total final
            const fleteField = document.getElementById('field-COM_FLETE');
            const aduanasField = document.getElementById('field-COM_ADUANAS');
            const totalFinalField = document.getElementById('field-COM_TOTAL_FINAL');
            const totalField = document.getElementById('field-COM_TOTAL');
            
            // Función para recalcular total final
            const recalculateTotal = () => {
                const total = parseFloat(totalField.value) || 0;
                const flete = parseFloat(fleteField.value) || 0;
                const aduanas = parseFloat(aduanasField.value) || 0;
                const totalFinal = total + flete + aduanas;
                totalFinalField.value = totalFinal.toFixed(2);
            };
            
            // Event listeners para recalcular automáticamente
            if (fleteField) fleteField.addEventListener('input', recalculateTotal);
            if (aduanasField) aduanasField.addEventListener('input', recalculateTotal);
            if (totalField) totalField.addEventListener('input', recalculateTotal);
            
            // Si estamos editando, mostrar campos adicionales y configurar warnings
            if (editingId) {
                console.log('Modo edición activado - mostrando campos adicionales para compras');
                
                // Asegurar que los campos de edición estén visibles
                const editOnlyFields = document.querySelectorAll('.edit-only-field');
                editOnlyFields.forEach(field => {
                    field.style.display = 'block';
                });
                
                // Hacer COM_ESTADO_SERVICIO requerido en modo edición
                const estadoField = document.getElementById('field-COM_ESTADO_SERVICIO');
                if (estadoField) {
                    estadoField.setAttribute('required', 'required');
                    
                    // Configurar warning de inventario
                    setTimeout(() => {
                        this.setupCompraInventoryWarning();
                    }, 200);
                }
                
                // Configurar lógica condicional para saldo y fecha de pago
                const saldoField = document.getElementById('field-COM_SALDO');
                const fechaPagoSaldoField = document.getElementById('field-COM_FECHA_PAGO_SALDO');
                const tipoPago2Field = document.getElementById('field-COM_TIPO_PAGO2');
                
                if (saldoField && fechaPagoSaldoField) {
                    // Mostrar/ocultar fecha de pago basado en si hay saldo
                    const toggleFechaPago = () => {
                        const saldoValue = parseFloat(saldoField.value) || 0;
                        const fechaGroup = fechaPagoSaldoField.closest('.form-group');
                        const tipoPago2Group = tipoPago2Field ? tipoPago2Field.closest('.form-group') : null;
                        
                        if (saldoValue > 0) {
                            if (fechaGroup) {
                                fechaGroup.style.opacity = '1';
                                fechaPagoSaldoField.style.borderColor = '#f59e0b'; // Highlight
                            }
                            if (tipoPago2Group) {
                                tipoPago2Group.style.opacity = '1';
                                tipoPago2Field.style.borderColor = '#f59e0b'; // Highlight
                            }
                        } else {
                            if (fechaGroup) {
                                fechaGroup.style.opacity = '0.6';
                                fechaPagoSaldoField.style.borderColor = '';
                                fechaPagoSaldoField.value = ''; // Limpiar si no hay saldo
                            }
                            if (tipoPago2Group) {
                                tipoPago2Group.style.opacity = '0.6';
                                tipoPago2Field.style.borderColor = '';
                                tipoPago2Field.value = ''; // Limpiar si no hay saldo
                            }
                        }
                    };
                    
                    saldoField.addEventListener('input', toggleFechaPago);
                    // Ejecutar inmediatamente para configurar estado inicial
                    setTimeout(toggleFechaPago, 100);
                }
            }
            
        } catch (error) {
            console.error('Error setting up compra form:', error);
        }   
    }

    async loadProviderDropdown(selectedProviderId) {
        const providerSelect = document.getElementById('field-COM_PROVEEDOR');
        if (!providerSelect) return;

        try {
            const providers = await window.dataService.getAll('TB_PROVEEDORES');
            
            providerSelect.innerHTML = '<option value="">Seleccionar proveedor</option>';
            providers.forEach(provider => {
                const option = document.createElement('option');
                option.value = provider.id;
                option.textContent = provider.PROV_NOM || provider.id;
                option.selected = provider.id === selectedProviderId;
                providerSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading providers:', error);
            providerSelect.innerHTML = `<option value="">Error cargando proveedores</option>`;
        }
    }

    async loadCompraEditData(data) {
        try {
            // Cargar datos básicos primero
            Object.keys(data).forEach(key => {
                const field = document.getElementById(`field-${key}`);
                if (field && !['COM_PROVEEDOR', 'COM_TIPO_PAGO', 'COM_TIPO_PAGO2'].includes(key)) {
                    field.value = data[key] || '';
                }
            });

            // Cargar dropdowns con valores seleccionados
            await this.loadProviderDropdown(data.COM_PROVEEDOR);
            await this.loadPaymentTypeDropdown(data.COM_TIPO_PAGO);
            await this.loadPaymentTypeDropdown2(data.COM_TIPO_PAGO2);
            
            // NUEVO: Asegurar que los campos de edición estén visibles y poblados
            console.log('Cargando datos adicionales para edición de compra:', {
                COM_ESTADO_SERVICIO: data.COM_ESTADO_SERVICIO,
                COM_FECHA_PAGO_SALDO: data.COM_FECHA_PAGO_SALDO,
                COM_FECHA_RECEPCION: data.COM_FECHA_RECEPCION,
                COM_TIPO_PAGO2: data.COM_TIPO_PAGO2
            });
            
            // Mostrar y llenar campos adicionales
            const editOnlyFields = document.querySelectorAll('.edit-only-field');
            editOnlyFields.forEach(field => {
                field.style.display = 'block';
            });
            
            // Llenar campos específicos
            const estadoField = document.getElementById('field-COM_ESTADO_SERVICIO');
            const fechaRecepcionField = document.getElementById('field-COM_FECHA_RECEPCION');
            const fechaPagoSaldoField = document.getElementById('field-COM_FECHA_PAGO_SALDO');
            
            if (estadoField && data.COM_ESTADO_SERVICIO) {
                estadoField.value = data.COM_ESTADO_SERVICIO;
            }
            if (fechaRecepcionField && data.COM_FECHA_RECEPCION) {
                fechaRecepcionField.value = data.COM_FECHA_RECEPCION;
            }
            if (fechaPagoSaldoField && data.COM_FECHA_PAGO_SALDO) {
                fechaPagoSaldoField.value = data.COM_FECHA_PAGO_SALDO;
            }
            
            // Recalcular total final después de cargar datos
            setTimeout(() => {
                const fleteField = document.getElementById('field-COM_FLETE');
                if (fleteField) {
                    fleteField.dispatchEvent(new Event('input'));
                }
            }, 100);
            
        } catch (error) {
            console.error('Error loading compra edit data:', error);
        }
    }

    async guaranteedProductRefresh() {
        try {
            console.log('🔄 Ejecutando refresh garantizado de productos...');
            
            // Paso 1: Limpiar cache (solo métodos disponibles)
            window.smartCache.invalidate('collection_tb_productos');
            
            // Paso 2: Forzar recarga del pagination manager
            if (window.paginationManagers && window.paginationManagers['productos']) {
                const manager = window.paginationManagers['productos'];
                
                // Limpiar cache del manager
                manager.clearCache();
                
                // Forzar recarga desde base de datos
                if (typeof manager.forceReload === 'function') {
                    await manager.forceReload();
                } else {
                    // Fallback si forceReload no existe
                    await manager.loadPage(1);
                }
                
                console.log('✅ Tabla de productos refrescada (método garantizado)');
            }
            
            // Paso 3: Si estamos en pestaña de productos, refresh visual adicional
            const activeTab = document.querySelector('.nav-btn.active');
            if (activeTab && activeTab.getAttribute('data-tab') === 'productos') {
                console.log('🎯 Usuario en pestaña productos - refresh visual adicional');
                
                setTimeout(async () => {
                    if (window.paginationManagers && window.paginationManagers['productos']) {
                        await window.paginationManagers['productos'].loadPage(1);
                    }
                }, 500);
            }
            
            return true;
        } catch (error) {
            console.error('❌ Error en refresh garantizado de productos:', error);
            return false;
        }
    }

    async guaranteedComprasRefresh() {
        try {
            console.log('🔄 Ejecutando refresh garantizado de compras...');
            
            // Limpiar cache de compras
            window.smartCache.invalidate('collection_TB_COMPRAS');
            
            if (window.paginationManagers && window.paginationManagers['compras']) {
                const manager = window.paginationManagers['compras'];
                manager.clearCache();
                await manager.loadPage(manager.currentPage || 1);
                console.log('✅ Tabla de compras refrescada');
            }
            
            return true;
        } catch (error) {
            console.error('❌ Error en refresh garantizado de compras:', error);
            return false;
        }
    }

    getFormFields(type) {
        const fieldTemplates = {
            'cliente': `
                <div class="form-group">
                    <label class="form-label">Identificación *</label>
                    <input type="text" id="field-identificacion" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Nombre *</label>
                    <input type="text" id="field-nombre" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Tipo *</label>
                    <select id="field-tipo" class="form-select" required>
                        <option value="">Seleccionar</option>
                        <option value="PERSONA">Persona</option>
                        <option value="EMPRESA">Empresa</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Teléfono</label>
                    <input type="tel" id="field-telefono" class="form-input">
                </div>
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" id="field-email" class="form-input">
                </div>
                <div class="form-group">
                    <label class="form-label">Ubicación</label>
                    <input type="text" id="field-ubicacion" class="form-input">
                </div>
            `,
            'empleado': `
                <div class="form-group">
                    <label class="form-label">DNI *</label>
                    <input type="text" id="field-dni" class="form-input" required maxlength="8">
                </div>
                <div class="form-group">
                    <label class="form-label">Nombre *</label>
                    <input type="text" id="field-nombre" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Apellido *</label>
                    <input type="text" id="field-apellido" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" id="field-email" class="form-input">
                </div>
                <div class="form-group">
                    <label class="form-label">Teléfono</label>
                    <input type="tel" id="field-telefono" class="form-input">
                </div>
                <div class="form-group">
                    <label class="form-label">Tipo de Trabajador</label>
                    <select id="field-tipo" class="form-select">
                        <option value="">Cargando tipos...</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Fecha de Ingreso</label>
                    <input type="date" id="field-fecha_ingreso" class="form-input">
                </div>
                <div class="form-group">
                    <label class="form-label">Fecha de Salida</label>
                    <input type="date" id="field-fecha_salida" class="form-input">
                    <small style="color: rgba(255,255,255,0.7); font-size: 0.75rem; margin-top: 0.25rem; display: block;">
                        Dejar vacío si el empleado está activo
                    </small>
                </div>
                <div class="form-group">
                    <label class="form-label">Lugar de Trabajo</label>
                    <input type="text" id="field-lugar" class="form-input" placeholder="Ej: Oficina Central, Sucursal Norte, etc.">
                </div>
                <div class="form-group">
                    <label class="form-label">Estado</label>
                    <select id="field-estado" class="form-select">
                        <option value="ACTIVO">Activo</option>
                        <option value="INACTIVO">Inactivo</option>
                    </select>
                </div>
            `,
            'producto': `
                <div class="form-group">
                    <label class="form-label">ID Producto *</label>
                    <input type="text" id="field-PRO_ID" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Nombre *</label>
                    <input type="text" id="field-PRO_NOMBRE" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Cantidad *</label>
                    <input type="number" id="field-PRO_CANTIDAD" class="form-input" required min="0">
                </div>
                <div class="form-group">
                    <label class="form-label">Precio *</label>
                    <input type="number" id="field-PRO_PRECIO" class="form-input" required min="0" step="0.01">
                </div>
                <div class="form-group">
                    <label class="form-label">Observaciones</label>
                    <input type="text" id="field-PRO_OBS" class="form-input">
                </div>
            `,
            'pedido': `
                <div class="form-group">
                    <label class="form-label">Número de Pedido *</label>
                    <input type="text" id="field-PED_NUM" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Cliente *</label>
                    <select id="field-PED_ID" class="form-select" required>
                        <option value="">Cargando clientes...</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Fecha de Venta</label>
                    <input type="date" id="field-PED_FECHA_VENTA" class="form-input">
                </div>
                <div class="form-group">
                    <label class="form-label">Fecha de Entrega</label>
                    <input type="date" id="field-PED_FECHA_ENTREGA" class="form-input">
                </div>
                
                <!-- Campo Total - Solo visible al editar -->
                <div class="form-group" id="total-group" style="display: none;">
                    <label class="form-label">Total</label>
                    <input type="number" id="field-PED_TOTAL" class="form-input" min="0" step="0.01" readonly style="background: rgba(255,255,255,0.05);">
                </div>
                
                <!-- Nuevo: Opción de Pago -->
                <div class="form-group">
                    <label class="form-label">Opción de Pago *</label>
                    <select id="field-PED_OPCION_PAGO" class="form-select" required>
                        <option value="">Seleccionar opción</option>
                        <option value="Total">Total</option>
                        <option value="Parcial">Parcial</option>
                    </select>
                </div>
                
                <!-- Nuevo: Campo para monto parcial (inicialmente oculto) -->
                <div class="form-group" id="saldo-group" style="display: none;">
                    <label class="form-label">Monto del Saldo *</label>
                    <input type="number" id="field-PED_SAL" class="form-input" min="0" step="0.01" placeholder="Ingrese el monto del saldo">
                </div>
                
                <!-- Campos adicionales para pagos parciales - Solo visibles al editar -->
                <div class="form-group" id="pago-parcial-group" style="display: none;">
                    <label class="form-label">Segundo Tipo de Pago</label>
                    <select id="field-PED_PAG_COD2" class="form-select">
                        <option value="">Cargando tipos de pago...</option>
                    </select>
                </div>
                
                <div class="form-group" id="fecha-parcial-group" style="display: none;">
                    <label class="form-label">Fecha de Pago Parcial</label>
                    <input type="date" id="field-PED_FECHA_PARCIAL" class="form-input">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Tipo de Pago</label>
                    <select id="field-PED_PAG_COD" class="form-select">
                        <option value="">Cargando tipos de pago...</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Tipo de Entrega</label>
                    <select id="field-PED_ENT_COD" class="form-select">
                        <option value="">Cargando tipos de entrega...</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Empleado</label>
                    <select id="field-PED_TRA_COD" class="form-select">
                        <option value="">Cargando empleados...</option>
                    </select>
                </div>
                
                <!-- Nuevo: Estado del Servicio -->
                <div class="form-group">
                    <label class="form-label">Estado del Servicio *</label>
                    <select id="field-PED_SERVICIO" class="form-select" required>
                        <option value="">Seleccionar estado</option>
                        <option value="Pendiente">Pendiente</option>
                        <option value="Terminado">Terminado</option>
                    </select>
                </div>
            `,
            'compra': `
                <div class="form-group">
                    <label class="form-label">Número de Compra *</label>
                    <input type="text" id="field-COM_NUM" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Proveedor *</label>
                    <select id="field-COM_PROVEEDOR" class="form-select" required>
                        <option value="">Cargando proveedores...</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Fecha de Compra</label>
                    <input type="date" id="field-COM_FECHA_COMPRA" class="form-input">
                </div>
                
                <!-- CAMPO ADICIONAL SOLO PARA EDICIÓN: Fecha de Recepción -->
                <div class="form-group edit-only-field" style="display: none;">
                    <label class="form-label">Fecha de Recepción</label>
                    <input type="date" id="field-COM_FECHA_RECEPCION" class="form-input">
                    <small style="color: rgba(255,255,255,0.7); font-size: 0.75rem; margin-top: 0.25rem; display: block;">
                        Fecha en que se recibieron los productos del proveedor
                    </small>
                </div>
                
                <!-- Totales -->
                <div class="form-group">
                    <label class="form-label">Subtotal (Calculado automáticamente)</label>
                    <input type="number" id="field-COM_TOTAL" class="form-input" readonly 
                        style="background: rgba(255,255,255,0.05);" step="0.01" min="0">
                </div>
                <div class="form-group">
                    <label class="form-label">Flete</label>
                    <input type="number" id="field-COM_FLETE" class="form-input" step="0.01" min="0" 
                        placeholder="0.00">
                </div>
                <div class="form-group">
                    <label class="form-label">Aduanas</label>
                    <input type="number" id="field-COM_ADUANAS" class="form-input" step="0.01" min="0" 
                        placeholder="0.00">
                </div>
                <div class="form-group">
                    <label class="form-label">Total Final (Calculado automáticamente)</label>
                    <input type="number" id="field-COM_TOTAL_FINAL" class="form-input" readonly 
                        style="background: rgba(255,255,255,0.05); font-weight: bold;" step="0.01">
                </div>
                
                <!-- Pagos -->
                <div class="form-group">
                    <label class="form-label">Tipo de Pago Principal</label>
                    <select id="field-COM_TIPO_PAGO" class="form-select">
                        <option value="">Cargando tipos de pago...</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Saldo Pendiente</label>
                    <input type="number" id="field-COM_SALDO" class="form-input" step="0.01" min="0" 
                        placeholder="0.00">
                </div>
                
                <!-- CAMPOS ADICIONALES SOLO PARA EDICIÓN: Segundo Tipo de Pago -->
                <div class="form-group edit-only-field" style="display: none;">
                    <label class="form-label">Segundo Tipo de Pago</label>
                    <select id="field-COM_TIPO_PAGO2" class="form-select">
                        <option value="">Seleccionar segundo tipo de pago</option>
                    </select>
                    <small style="color: rgba(255,255,255,0.7); font-size: 0.75rem; margin-top: 0.25rem; display: block;">
                        Usado cuando hay pagos con diferentes métodos
                    </small>
                </div>
                
                <!-- CAMPOS ADICIONALES SOLO PARA EDICIÓN: Fecha de Pago de Saldo -->
                <div class="form-group edit-only-field" style="display: none;">
                    <label class="form-label">Fecha de Pago de Saldo</label>
                    <input type="date" id="field-COM_FECHA_PAGO_SALDO" class="form-input">
                    <small style="color: rgba(255,255,255,0.7); font-size: 0.75rem; margin-top: 0.25rem; display: block;">
                        Fecha programada o realizada del pago del saldo pendiente
                    </small>
                </div>
                
                <!-- CAMPOS ADICIONALES SOLO PARA EDICIÓN: Estado del Servicio -->
                <div class="form-group edit-only-field" style="display: none;">
                    <label class="form-label">Estado del Servicio *</label>
                    <select id="field-COM_ESTADO_SERVICIO" class="form-select">
                        <option value="">Seleccionar estado</option>
                        <option value="Pendiente">Pendiente</option>
                        <option value="Terminado">Terminado</option>
                    </select>
                    <small style="color: rgba(255,255,255,0.7); font-size: 0.75rem; margin-top: 0.25rem; display: block;">
                        Estado actual del proceso de compra
                    </small>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Observaciones</label>
                    <textarea id="field-COM_OBS" class="form-input" rows="3" 
                            placeholder="Observaciones adicionales (opcional)"></textarea>
                </div>
            `,
            'proveedor': `
                <div class="form-group">
                    <label class="form-label">ID Proveedor *</label>
                    <input type="text" id="field-PROV_ID" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Nombre *</label>
                    <input type="text" id="field-PROV_NOM" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Teléfono</label>
                    <input type="tel" id="field-PROV_TELEFONO" class="form-input">
                </div>
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" id="field-PROV_EMAIL" class="form-input">
                </div>
                <div class="form-group">
                    <label class="form-label">Dirección</label>
                    <input type="text" id="field-PROV_DIRECCION" class="form-input">
                </div>
                <div class="form-group">
                    <label class="form-label">Lugar</label>
                    <input type="text" id="field-PROV_LUGAR" class="form-input">
                </div>
            `,
            'estado': `
                <div class="form-group">
                    <label class="form-label">Descripción *</label>
                    <input type="text" id="field-descripcion" class="form-input" required placeholder="Ingrese la descripción del estado">
                </div>
            `,
            'tipo-pago': `
                <div class="form-group">
                    <label class="form-label">Descripción *</label>
                    <input type="text" id="field-descripcion" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Detalle</label>
                    <input type="text" id="field-detalle" class="form-input">
                </div>
            `,
            'tipo-trabajador':`
                <div class="form-group">
                    <label for="descripcion">Descripción:</label>
                    <input type="text" id="descripcion" name="descripcion" required>
                </div>
                <div class="form-group">
                    <label for="interface_preferences">Preferencias de Interfaces:</label>
                    <div class="interface-preferences-container">
                        <div class="interfaces-grid" id="interfaces-grid">
                            <!-- Se llenará dinámicamente -->
                        </div>
                    </div>
                </div>
            `,
        };
        
        return fieldTemplates[type] || `
            <div class="form-group">
                <label class="form-label">Descripción *</label>
                <input type="text" id="field-descripcion" class="form-input" required>
            </div>
        `;
    }
}

function renderInterfacePreferences(existingPreferences = {}) {
    const interfacesGrid = document.getElementById('interfaces-grid');
    if (!interfacesGrid) return;

    const systemInterfaces = [
        { id: 'dashboard', name: 'Dashboard', icon: 'bar-chart-3', required: true },
        { id: 'clientes', name: 'Clientes', icon: 'users' },
        { id: 'empleados', name: 'Empleados', icon: 'user-check' },
        { id: 'productos', name: 'Productos', icon: 'package' },
        { id: 'pedidos', name: 'Pedidos', icon: 'shopping-cart' },
        { id: 'compras', name: 'Compras', icon: 'shopping-bag' },
        { id: 'proveedores', name: 'Proveedores', icon: 'truck' },
        { id: 'estados', name: 'Estados', icon: 'flag' },
        { id: 'entregas', name: 'Entregas', icon: 'package-check' },
        { id: 'tipos-contacto', name: 'Tipos Contacto', icon: 'contact' },
        { id: 'tipos-pago', name: 'Tipos Pago', icon: 'credit-card' },
        { id: 'tipos-trabajador', name: 'Tipos Trabajador', icon: 'briefcase' }
    ];

    interfacesGrid.innerHTML = systemInterfaces.map(interface => {
        const isEnabled = existingPreferences[interface.id] || interface.required || false;
        const isRequired = interface.required;
        
        return `
            <div class="interface-preference-item ${isEnabled ? 'enabled' : 'disabled'} ${isRequired ? 'required' : ''}" 
                 onclick="${isRequired ? 'void(0)' : `toggleInterfacePreference('${interface.id}')`}"
                 data-interface="${interface.id}">
                <input type="hidden" 
                       name="interface_${interface.id}" 
                       value="${isEnabled}"
                       id="interface_${interface.id}">
                <div class="interface-icon">
                    <i data-lucide="${interface.icon}"></i>
                </div>
                <div class="interface-name">${interface.name}</div>
                <div class="interface-status ${isEnabled ? 'enabled' : 'disabled'}">
                    ${isRequired ? 'Requerido' : (isEnabled ? 'Habilitado' : 'Deshabilitado')}
                </div>
            </div>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function toggleInterfacePreference(interfaceId) {
    const checkbox = document.getElementById(`interface_${interfaceId}`);
    const item = document.querySelector(`[data-interface="${interfaceId}"]`);
    
    if (!checkbox || !item) return;
    
    const currentValue = checkbox.value === 'true';
    const newValue = !currentValue;
    
    checkbox.value = newValue;
    
    if (newValue) {
        item.classList.remove('disabled');
        item.classList.add('enabled');
        item.querySelector('.interface-status').textContent = 'Habilitado';
        item.querySelector('.interface-status').className = 'interface-status enabled';
    } else {
        item.classList.remove('enabled');
        item.classList.add('disabled');
        item.querySelector('.interface-status').textContent = 'Deshabilitado';
        item.querySelector('.interface-status').className = 'interface-status disabled';
    }
}

async function saveTipoTrabajador(formData, id = null) {
    try {
        // Recopilar datos básicos
        const tipoData = {
            descripcion: formData.get('descripcion')
        };
        
        // Recopilar preferencias de interfaces
        const interfacePreferences = {};
        const systemInterfaces = [
            'dashboard', 'clientes', 'empleados', 'productos', 'pedidos', 'compras',
            'proveedores', 'estados', 'entregas', 'tipos-contacto', 'tipos-pago', 'tipos-trabajador'
        ];
        
        systemInterfaces.forEach(interfaceId => {
            const preference = formData.get(`interface_${interfaceId}`);
            interfacePreferences[interfaceId] = preference === 'true';
        });
        
        // Agregar preferencias al objeto principal
        tipoData.interface_preferences = interfacePreferences;
        tipoData.updatedAt = new Date().toISOString();
        
        // Guardar en base de datos
        if (id) {
            await window.dataService.update('tipos_trabajador', id, tipoData);
        } else {
            await window.dataService.create('tipos_trabajador', tipoData);
        }
        
        console.log('Tipo de trabajador guardado con preferencias:', tipoData);
        return tipoData;
        
    } catch (error) {
        console.error('Error al guardar tipo de trabajador:', error);
        throw error;
    }
}

function loadTipoTrabajadorData(tipoTrabajador) {
    // Cargar descripción
    const descripcionInput = document.getElementById('descripcion');
    if (descripcionInput) {
        descripcionInput.value = tipoTrabajador.descripcion || '';
    }
    
    // Cargar preferencias de interfaces
    const preferences = tipoTrabajador.interface_preferences || {};
    renderInterfacePreferences(preferences);
}

function renderTiposTrabajadorTable(tiposTrabajador) {
    const tableBody = document.getElementById('tipos-trabajador-table');
    if (!tableBody) return;
    
    tableBody.innerHTML = tiposTrabajador.map(tipo => {
        const preferences = tipo.interface_preferences || {};
        const enabledCount = Object.values(preferences).filter(Boolean).length;
        const totalCount = Object.keys(preferences).length;
        
        return `
            <tr>
                <td>${tipo.descripcion}</td>
                <td>
                    <div class="preferences-summary">
                        <span class="preferences-count">${enabledCount}/${totalCount || 12}</span>
                        <div class="preferences-bar">
                            <div class="preferences-fill" style="width: ${totalCount > 0 ? (enabledCount/totalCount)*100 : 0}%"></div>
                        </div>
                    </div>
                </td>
                <td>
                    <button onclick="editItem('tipo-trabajador', '${tipo.id}')" class="btn btn-sm btn-primary">
                        <i data-lucide="edit"></i>
                        Editar
                    </button>
                    <button onclick="deleteItem('tipo-trabajador', '${tipo.id}')" class="btn btn-sm btn-danger">
                        <i data-lucide="trash-2"></i>
                        Eliminar
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}



// Hacer funciones disponibles globalmente
window.renderInterfacePreferences = renderInterfacePreferences;
window.toggleInterfacePreference = toggleInterfacePreference;

// Export globally
window.modalManager = new ModalManager();