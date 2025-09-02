class ReportesManager {
    constructor() {
        this.ventasData = [];
        this.comprasData = [];
        this.clientesData = [];
        this.empleadosData = [];
        this.proveedoresData = [];
        this.estadosData = [];
        this.tiposPagoData = [];
        
        this.ventasFiltradas = [];
        this.comprasFiltradas = [];
        
        this.ventasChart = null;
        this.comprasChart = null;
        
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        try {
            console.log('Inicializando ReportesManager...');
            
            // Cargar Chart.js si no está disponible
            if (typeof Chart === 'undefined') {
                await this.loadChartJS();
            }
            
            await this.cargarDatos();
            await this.configurarFiltros();
            
            this.initialized = true;
            console.log('ReportesManager inicializado correctamente');
            
        } catch (error) {
            console.error('Error inicializando ReportesManager:', error);
        }
    }

    async loadChartJS() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async cargarDatos() {
        try {
            console.log('📊 Iniciando carga de datos...');

            if (!window.dataService) {
                throw new Error('dataService no está disponible');
            }

            // Cargar datos principales
            console.log('📈 Cargando datos de ventas...');
            this.ventasData = await window.dataService.getAll('tb_pedido');
            console.log(`✅ ${this.ventasData.length} ventas cargadas`);
            console.log('📄 Muestra de datos de ventas:', this.ventasData[0]);

            console.log('🛒 Cargando datos de compras...');
            this.comprasData = await window.dataService.getAll('TB_COMPRAS');
            console.log(`✅ ${this.comprasData.length} compras cargadas`);

            // Cargar clientes
            try {
                this.clientesData = await window.dataService.getAll('clientes');
                console.log(`✅ ${this.clientesData.length} clientes cargados`);
            } catch (error) {
                console.warn('⚠️ Error cargando clientes:', error);
                this.clientesData = [];
            }

            // Cargar empleados
            try {
                this.empleadosData = await window.dataService.getAll('empleados');
                console.log(`✅ ${this.empleadosData.length} empleados cargados`);
                if (this.empleadosData.length > 0) {
                    console.log('📄 Muestra de empleado:', this.empleadosData[0]);
                }
            } catch (error) {
                console.warn('⚠️ Error cargando empleados:', error);
                this.empleadosData = [];
            }

            // Cargar proveedores
            try {
                this.proveedoresData = await window.dataService.getAll('TB_PROVEEDORES');
                console.log(`✅ ${this.proveedoresData.length} proveedores cargados`);
            } catch (error) {
                console.warn('⚠️ Error cargando proveedores:', error);
                this.proveedoresData = [];
            }

            // Cargar estados
            try {
                this.estadosData = await window.dataService.getAll('TB_ESTADO');
                console.log(`✅ ${this.estadosData.length} estados cargados`);
            } catch (error) {
                console.warn('⚠️ Error cargando estados:', error);
                this.estadosData = [];
            }

            // Cargar tipos de pago
            try {
                this.tiposPagoData = await window.dataService.getAll('tipos_pago');
                console.log(`✅ ${this.tiposPagoData.length} tipos de pago cargados`);
            } catch (error) {
                console.warn('⚠️ Error cargando tipos de pago:', error);
                this.tiposPagoData = [];
            }

            // Cargar entregas
            try {
                this.entregasData = await window.dataService.getAll('entregas');
                console.log(`✅ ${this.entregasData.length} entregas cargadas`);
                if (this.entregasData.length > 0) {
                    console.log('📄 Muestra de entrega:', this.entregasData[0]);
                }
            } catch (error) {
                console.warn('⚠️ Error cargando entregas:', error);
                this.entregasData = [];
            }

            console.log('✅ Carga de datos completada:', {
                ventas: this.ventasData.length,
                compras: this.comprasData.length,
                clientes: this.clientesData.length,
                empleados: this.empleadosData.length,
                proveedores: this.proveedoresData.length,
                estados: this.estadosData.length,
                tiposPago: this.tiposPagoData.length,
                entregas: this.entregasData?.length || 0
            });

        } catch (error) {
            console.error('❌ Error cargando datos para reportes:', error);
            throw error;
        }
    }

    // PASO 2: AGREGAR función para cargar entregas:

    async cargarEntregas() {
        try {
            console.log('🚚 Cargando datos de entregas...');
            this.entregasData = await window.dataService.getAll('entregas');
            console.log(`✅ ${this.entregasData.length} entregas cargadas`);
            
            if (this.entregasData.length > 0) {
                console.log('📄 Muestra de entrega:', this.entregasData[0]);
            }
        } catch (error) {
            console.warn('⚠️ Intentando nombres alternativos para entregas...');
            try {
                this.entregasData = await window.dataService.getAll('tb_entregas');
            } catch (error2) {
                try {
                    this.entregasData = await window.dataService.getAll('TB_ENTREGAS');
                } catch (error3) {
                    console.warn('⚠️ No se pudieron cargar entregas:', error);
                    this.entregasData = [];
                }
            }
        }
    }

    // PASO 3: AGREGAR funciones para buscar empleados y entregas por código:

    buscarEmpleadoPorCodigo(codigoEmpleado) {
        if (!codigoEmpleado || !this.empleadosData.length) return null;
        
        console.log(`🔍 Buscando empleado con código: ${codigoEmpleado}`);
        
        // Buscar por diferentes campos posibles
        const empleado = this.empleadosData.find(emp => {
            return emp.id === codigoEmpleado || 
                emp.EMP_DNI === codigoEmpleado ||
                emp.dni === codigoEmpleado ||
                emp.codigo === codigoEmpleado ||
                emp.EMP_CODIGO === codigoEmpleado;
        });
        
        if (empleado) {
            const nombre = empleado.EMP_NOMBRE || empleado.nombre || empleado.NOMBRE || '';
            const apellido = empleado.EMP_APELLIDO || empleado.apellido || empleado.APELLIDO || '';
            const nombreCompleto = `${nombre} ${apellido}`.trim();
            
            console.log(`✅ Empleado encontrado:`, {
                codigo: codigoEmpleado,
                nombre: nombreCompleto,
                empleado: empleado
            });
            
            return {
                id: empleado.id,
                codigo: codigoEmpleado,
                nombre: nombreCompleto || `Empleado ${codigoEmpleado}`
            };
        }
        
        console.log(`❌ Empleado no encontrado para código: ${codigoEmpleado}`);
        return null;
    }

    buscarEntregaPorCodigo(codigoEntrega) {
        if (!codigoEntrega || !this.entregasData?.length) return null;
        
        console.log(`🔍 Buscando entrega con código: ${codigoEntrega}`);
        
        // Buscar por diferentes campos posibles
        const entrega = this.entregasData.find(ent => {
            return ent.id === codigoEntrega ||
                ent.codigo === codigoEntrega ||
                ent.ENT_CODIGO === codigoEntrega ||
                ent.ENT_ID === codigoEntrega;
        });
        
        if (entrega) {
            const descripcion = entrega.descripcion || 
                            entrega.DESCRIPCION || 
                            entrega.ENT_DESCRIPCION || 
                            entrega.nombre || 
                            entrega.ENT_NOMBRE || 
                            `Entrega ${codigoEntrega}`;
            
            console.log(`✅ Entrega encontrada:`, {
                codigo: codigoEntrega,
                descripcion: descripcion,
                entrega: entrega
            });
            
            return {
                id: entrega.id,
                codigo: codigoEntrega,
                descripcion: descripcion
            };
        }
        
        console.log(`❌ Entrega no encontrada para código: ${codigoEntrega}`);
        return null;
    }

    async configurarFiltros() {
        try {
            // Configurar filtros de ventas
            const ventasCliente = document.getElementById('ventas-cliente');
            const ventasEmpleado = document.getElementById('ventas-empleado');
            const ventasEstado = document.getElementById('ventas-estado');
            const ventasTipoPago = document.getElementById('ventas-tipo-pago');

            if (ventasCliente) {
                ventasCliente.innerHTML = '<option value="">Todos los clientes</option>';
                this.clientesData.forEach(cliente => {
                    const option = document.createElement('option');
                    option.value = cliente.id;
                    option.textContent = cliente.CLI_NOMBRE || cliente.nombre || 'Cliente sin nombre';
                    ventasCliente.appendChild(option);
                });
            }

            if (ventasEmpleado) {
                ventasEmpleado.innerHTML = '<option value="">Todos los empleados</option>';
                this.empleadosData.forEach(empleado => {
                    const option = document.createElement('option');
                    option.value = empleado.id;
                    option.textContent = `${empleado.EMP_NOMBRE || empleado.nombre || ''} ${empleado.EMP_APELLIDO || empleado.apellido || ''}`.trim() || 'Empleado sin nombre';
                    ventasEmpleado.appendChild(option);
                });
            }

            if (ventasEstado) {
                ventasEstado.innerHTML = '<option value="">Todos los estados</option>';
                this.estadosData.forEach(estado => {
                    const option = document.createElement('option');
                    option.value = estado.id;
                    option.textContent = estado.EST_DESCRIP || estado.descripcion || 'Estado sin nombre';
                    ventasEstado.appendChild(option);
                });
            }

            if (ventasTipoPago) {
                ventasTipoPago.innerHTML = '<option value="">Todos los tipos</option>';
                this.tiposPagoData.forEach(tipo => {
                    const option = document.createElement('option');
                    option.value = tipo.id;
                    option.textContent = tipo.TIP_PAG_DESCRIP || tipo.descripcion || 'Tipo sin nombre';
                    ventasTipoPago.appendChild(option);
                });
            }

            // Configurar filtros de compras
            const comprasProveedor = document.getElementById('compras-proveedor');
            const comprasEstado = document.getElementById('compras-estado');
            const comprasTipoPago = document.getElementById('compras-tipo-pago');

            if (comprasProveedor) {
                comprasProveedor.innerHTML = '<option value="">Todos los proveedores</option>';
                this.proveedoresData.forEach(proveedor => {
                    const option = document.createElement('option');
                    option.value = proveedor.id;
                    option.textContent = proveedor.PRO_NOMBRE || proveedor.nombre || 'Proveedor sin nombre';
                    comprasProveedor.appendChild(option);
                });
            }

            if (comprasEstado) {
                comprasEstado.innerHTML = '<option value="">Todos los estados</option>';
                this.estadosData.forEach(estado => {
                    const option = document.createElement('option');
                    option.value = estado.id;
                    option.textContent = estado.EST_DESCRIP || estado.descripcion || 'Estado sin nombre';
                    comprasEstado.appendChild(option);
                });
            }

            if (comprasTipoPago) {
                comprasTipoPago.innerHTML = '<option value="">Todos los tipos</option>';
                this.tiposPagoData.forEach(tipo => {
                    const option = document.createElement('option');
                    option.value = tipo.id;
                    option.textContent = tipo.TIP_PAG_DESCRIP || tipo.descripcion || 'Tipo sin nombre';
                    comprasTipoPago.appendChild(option);
                });
            }

        } catch (error) {
            console.error('Error configurando filtros:', error);
        }
    }

    async aplicarFiltrosVentas() {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            const fechaDesde = document.getElementById('ventas-fecha-desde')?.value;
            const fechaHasta = document.getElementById('ventas-fecha-hasta')?.value;
            const cliente = document.getElementById('ventas-cliente')?.value;
            const empleado = document.getElementById('ventas-empleado')?.value;
            const estadoServicio = document.getElementById('ventas-estado-servicio')?.value;
            const tipoPago = document.getElementById('ventas-tipo-pago')?.value;
            const montoDesde = parseFloat(document.getElementById('ventas-monto-desde')?.value) || 0;
            const montoHasta = parseFloat(document.getElementById('ventas-monto-hasta')?.value) || Infinity;

            console.log('🎯 Aplicando filtros con valores:', {
                fechaDesde, fechaHasta, cliente, empleado, estadoServicio, tipoPago, montoDesde, montoHasta
            });

            this.ventasFiltradas = this.ventasData.filter(venta => {
                let incluir = true;

                // Filtro por fecha
                if (fechaDesde && venta.PED_FECHA_VENTA) {
                    const fechaVenta = new Date(venta.PED_FECHA_VENTA);
                    if (fechaVenta < new Date(fechaDesde)) incluir = false;
                }

                if (fechaHasta && venta.PED_FECHA_VENTA) {
                    const fechaVenta = new Date(venta.PED_FECHA_VENTA);
                    if (fechaVenta > new Date(fechaHasta)) incluir = false;
                }

                // Filtro por cliente
                if (cliente && venta.PED_ID !== cliente) incluir = false;

                // Filtro por empleado
                if (empleado && venta.PED_TRA_COD !== empleado) incluir = false;

                // Filtro por estado de servicio (Pendiente/Terminado)
                if (estadoServicio && venta.PED_SERVICIO !== estadoServicio) incluir = false;

                // Filtro por tipo de pago (cualquiera de los dos)
                if (tipoPago) {
                    const tieneTipoPago1 = venta.PED_PAG_COD === tipoPago;
                    const tieneTipoPago2 = venta.PED_PAG_COD2 === tipoPago;
                    if (!tieneTipoPago1 && !tieneTipoPago2) {
                        incluir = false;
                    }
                }

                // Filtro por monto
                const total = parseFloat(venta.PED_TOTAL) || 0;
                if (total < montoDesde || total > montoHasta) incluir = false;

                return incluir;
            });

            console.log(`✅ Filtros aplicados: ${this.ventasFiltradas.length} de ${this.ventasData.length} ventas`);

            this.actualizarTablaVentas();
            this.actualizarEstadisticasVentas();
            this.actualizarGraficoVentas();

        } catch (error) {
            console.error('❌ Error aplicando filtros de ventas:', error);
        }
    }

    async aplicarFiltrosCompras() {
        try {
            console.log('🔄 INICIANDO APLICAR FILTROS COMPRAS...');
            
            if (!this.initialized) {
                console.log('⚠️ Manager no inicializado, inicializando...');
                await this.initialize();
            }

            // Verificar datos cargados
            console.log(`📊 Datos disponibles: ${this.comprasData.length} compras`);
            if (this.comprasData.length === 0) {
                console.warn('⚠️ No hay datos de compras cargados');
                // Intentar recargar datos
                await this.cargarDatos();
            }

            // Obtener valores de filtros
            const fechaDesde = document.getElementById('compras-fecha-desde')?.value;
            const fechaHasta = document.getElementById('compras-fecha-hasta')?.value;
            const proveedor = document.getElementById('compras-proveedor')?.value;
            const estado = document.getElementById('compras-estado')?.value;
            const tipoPago = document.getElementById('compras-tipo-pago')?.value;
            const montoDesde = parseFloat(document.getElementById('compras-monto-desde')?.value) || 0;
            const montoHasta = parseFloat(document.getElementById('compras-monto-hasta')?.value) || Infinity;
            const incluirFlete = document.getElementById('compras-incluir-flete')?.value;

            console.log('🎯 Filtros aplicados:', {
                fechaDesde, fechaHasta, proveedor, estado, tipoPago, 
                montoDesde, montoHasta, incluirFlete
            });

            // Aplicar filtros
            this.comprasFiltradas = this.comprasData.filter(compra => {
                let incluir = true;

                // Filtro por fecha
                if (fechaDesde && compra.COM_FEC_COMPRA) {
                    const fechaCompra = new Date(compra.COM_FEC_COMPRA);
                    if (fechaCompra < new Date(fechaDesde)) incluir = false;
                }

                if (fechaHasta && compra.COM_FEC_COMPRA) {
                    const fechaCompra = new Date(compra.COM_FEC_COMPRA);
                    if (fechaCompra > new Date(fechaHasta)) incluir = false;
                }

                // Filtro por proveedor
                if (proveedor && compra.COM_PRO_ID !== proveedor) incluir = false;

                // Filtro por estado
                if (estado && compra.COM_ESTADO !== estado) incluir = false;

                // Filtro por tipo de pago
                if (tipoPago && compra.COM_TIP_PAG_ID !== tipoPago) incluir = false;

                // Filtro por monto
                const total = parseFloat(compra.COM_TOTAL_FINAL) || 0;
                if (total < montoDesde || total > montoHasta) incluir = false;

                // Filtro por flete
                if (incluirFlete === 'si') {
                    const flete = parseFloat(compra.COM_FLETE) || 0;
                    if (flete <= 0) incluir = false;
                } else if (incluirFlete === 'no') {
                    const flete = parseFloat(compra.COM_FLETE) || 0;
                    if (flete > 0) incluir = false;
                }

                return incluir;
            });

            console.log(`✅ Filtros aplicados: ${this.comprasFiltradas.length} de ${this.comprasData.length} compras`);
            
            // Mostrar muestra de datos filtrados
            if (this.comprasFiltradas.length > 0) {
                console.log('📄 Muestra de datos filtrados:', this.comprasFiltradas[0]);
            }

            // Actualizar UI
            this.actualizarTablaCompras();
            this.actualizarEstadisticasCompras();
            this.actualizarGraficoCompras();

        } catch (error) {
            console.error('❌ Error aplicando filtros de compras:', error);
            
            // Mostrar error en la tabla
            const tbody = document.getElementById('compras-table');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="10" class="text-center" style="color: #ef4444;">
                            <strong>Error cargando datos:</strong><br>
                            ${error.message}
                            <br><br>
                            <button onclick="window.reportesManager.aplicarFiltrosCompras()" class="btn btn-primary">
                                Reintentar
                            </button>
                        </td>
                    </tr>
                `;
            }
        }
    }

    buscarClientePorId(clienteId) {
        if (!clienteId || !this.clientesData.length) return null;
        
        console.log(`🔍 Buscando cliente con ID: ${clienteId}`);
        
        // Buscar por diferentes campos posibles
        const cliente = this.clientesData.find(cli => {
            return cli.id === clienteId ||
                cli.CLI_ID === clienteId ||
                cli.codigo === clienteId ||
                cli.CLI_CODIGO === clienteId;
        });
        
        if (cliente) {
            const nombre = cliente.CLI_NOMBRE || 
                        cliente.nombre || 
                        cliente.NOMBRE ||
                        cliente.CLI_RAZON_SOCIAL ||
                        cliente.razon_social ||
                        `Cliente ${clienteId}`;
            
            console.log(`✅ Cliente encontrado:`, {
                id: clienteId,
                nombre: nombre,
                cliente: cliente
            });
            
            return {
                id: cliente.id,
                nombre: nombre
            };
        }
        
        console.log(`❌ Cliente no encontrado para ID: ${clienteId}`);
        return null;
    }

    buscarTipoPagoPorCodigo(codigoPago) {
        if (!codigoPago || !this.tiposPagoData.length) return null;
        
        console.log(`🔍 Buscando tipo de pago con código: ${codigoPago}`);
        
        // Buscar por diferentes campos posibles
        const tipoPago = this.tiposPagoData.find(tipo => {
            return tipo.id === codigoPago ||
                tipo.TIP_PAG_ID === codigoPago ||
                tipo.codigo === codigoPago ||
                tipo.TIP_PAG_CODIGO === codigoPago;
        });
        
        if (tipoPago) {
            const descripcion = tipoPago.TIP_PAG_DESCRIP || 
                            tipoPago.descripcion || 
                            tipoPago.DESCRIPCION ||
                            tipoPago.nombre ||
                            tipoPago.TIP_PAG_NOMBRE ||
                            `Tipo Pago ${codigoPago}`;
            
            console.log(`✅ Tipo de pago encontrado:`, {
                codigo: codigoPago,
                descripcion: descripcion,
                tipoPago: tipoPago
            });
            
            return {
                id: tipoPago.id,
                descripcion: descripcion
            };
        }
        
        console.log(`❌ Tipo de pago no encontrado para código: ${codigoPago}`);
        return null;
    }

    actualizarTablaVentas() {
        const tbody = document.getElementById('ventas-table');
        if (!tbody) return;
        
        if (this.ventasFiltradas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="12" class="text-center">No se encontraron registros</td></tr>';
            return;
        }

        tbody.innerHTML = this.ventasFiltradas.map(venta => {
            // Buscar todas las relaciones
            const cliente = this.buscarClientePorId(venta.PED_ID);
            const empleado = this.buscarEmpleadoPorCodigo(venta.PED_TRA_COD);
            const entrega = this.buscarEntregaPorCodigo(venta.PED_ENT_COD);
            
            // NUEVO: Obtener tipos de pago completos (puede ser uno o dos)
            const tiposPagoCompletos = this.obtenerTiposPagoCompletos(venta);
            
            return `
                <tr>
                    <td><strong>${venta.PED_NUM || 'N/A'}</strong></td>
                    <td>${cliente ? cliente.nombre : (venta.PED_ID || 'Cliente no encontrado')}</td>
                    <td>${this.formatDate(venta.PED_FECHA_VENTA)}</td>
                    <td>${this.formatDate(venta.PED_FECHA_ENTREGA)}</td>
                    <td><strong>${this.formatCurrency(venta.PED_TOTAL)}</strong></td>
                    <td>${venta.PED_OPCION_PAGO || 'N/A'}</td>
                    <td><span class="tipos-pago-multiple">${tiposPagoCompletos}</span></td>
                    <td>${entrega ? entrega.descripcion : (venta.PED_ENT_COD || 'N/A')}</td>
                    <td>${empleado ? empleado.nombre : (venta.PED_TRA_COD || 'Empleado no encontrado')}</td>
                    <td><span class="badge badge-blue">${venta.PED_SERVICIO || 'N/A'}</span></td>
                    <td>${this.formatDate(venta.PED_FECHA_PARCIAL)}</td>
                    <td>${venta.PED_SAL || ''}</td>
                </tr>
            `;
        }).join('');
    }

    buscarEstadoPorNombre(nombreEstado) {
        if (!nombreEstado || !this.estadosData.length) return null;
        
        const estado = this.estadosData.find(e => {
            const desc = e.EST_DESCRIP || e.descripcion || e.DESCRIPCION || '';
            return desc.toLowerCase() === nombreEstado.toLowerCase();
        });
        
        if (estado) {
            return {
                id: estado.id,
                descripcion: estado.EST_DESCRIP || estado.descripcion || estado.DESCRIPCION || nombreEstado
            };
        }
        
        // Si no encuentra, devolver el nombre tal como está
        return { descripcion: nombreEstado };
    }

    async configurarFiltrosVentas() {
        console.log('🎛️ Configurando filtros de ventas...');

        // Extraer todos los códigos de tipos de pago (PED_PAG_COD y PED_PAG_COD2)
        const tiposPagoSet = new Set();
        this.ventasData.forEach(venta => {
            if (venta.PED_PAG_COD) tiposPagoSet.add(venta.PED_PAG_COD);
            if (venta.PED_PAG_COD2 && venta.PED_PAG_COD2.trim() !== '') tiposPagoSet.add(venta.PED_PAG_COD2);
        });
        const tiposPagoUnicos = Array.from(tiposPagoSet).filter(Boolean);

        // Configurar filtro de clientes
        const ventasCliente = document.getElementById('ventas-cliente');
        if (ventasCliente) {
            ventasCliente.innerHTML = '<option value="">Todos los clientes</option>';
            const clientesUnicos = [...new Set(this.ventasData.map(v => v.PED_ID))].filter(Boolean);
            clientesUnicos.forEach(clienteId => {
                const cliente = this.buscarClientePorId(clienteId);
                const option = document.createElement('option');
                option.value = clienteId;
                option.textContent = cliente ? cliente.nombre : `Cliente ${clienteId}`;
                ventasCliente.appendChild(option);
            });
            console.log(`✅ ${clientesUnicos.length} clientes agregados al filtro`);
        }

        // Configurar filtro de empleados
        const ventasEmpleado = document.getElementById('ventas-empleado');
        if (ventasEmpleado) {
            ventasEmpleado.innerHTML = '<option value="">Todos los empleados</option>';
            const empleadosUnicos = [...new Set(this.ventasData.map(v => v.PED_TRA_COD))].filter(Boolean);
            empleadosUnicos.forEach(empleadoCod => {
                const empleado = this.buscarEmpleadoPorCodigo(empleadoCod);
                const option = document.createElement('option');
                option.value = empleadoCod;
                option.textContent = empleado ? empleado.nombre : `Empleado ${empleadoCod}`;
                ventasEmpleado.appendChild(option);
            });
            console.log(`✅ ${empleadosUnicos.length} empleados agregados al filtro`);
        }

        // CONFIGURAR filtro de estado de servicio con opciones fijas
        const ventasEstadoServicio = document.getElementById('ventas-estado-servicio');
        if (ventasEstadoServicio) {
            ventasEstadoServicio.innerHTML = `
                <option value="">Todos los estados de servicio</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Terminado">Terminado</option>
            `;
            
            console.log('✅ Estados de servicio configurados: Pendiente y Terminado');
            
            // Debug: Verificar cuántas ventas hay de cada tipo
            const pendientes = this.ventasData.filter(v => v.PED_SERVICIO === 'Pendiente').length;
            const terminados = this.ventasData.filter(v => v.PED_SERVICIO === 'Terminado').length;
            const otros = this.ventasData.filter(v => v.PED_SERVICIO && v.PED_SERVICIO !== 'Pendiente' && v.PED_SERVICIO !== 'Terminado').length;
            
            console.log(`📊 Estadísticas de estado:`, {
                Pendiente: pendientes,
                Terminado: terminados,
                Otros: otros,
                'Sin estado': this.ventasData.filter(v => !v.PED_SERVICIO).length
            });
            
            // Si hay otros valores, mostrarlos para debug
            if (otros > 0) {
                const otrosValores = [...new Set(this.ventasData
                    .filter(v => v.PED_SERVICIO && v.PED_SERVICIO !== 'Pendiente' && v.PED_SERVICIO !== 'Terminado')
                    .map(v => v.PED_SERVICIO)
                )];
                console.log('⚠️ Otros valores encontrados en PED_SERVICIO:', otrosValores);
            }
        }

        // Configurar filtro de tipos de pago
        const ventasTipoPago = document.getElementById('ventas-tipo-pago');
        if (ventasTipoPago) {
            ventasTipoPago.innerHTML = '<option value="">Todos los tipos</option>';
            tiposPagoUnicos.forEach(tipoCod => {
                const tipoPago = this.buscarTipoPagoPorCodigo(tipoCod);
                const option = document.createElement('option');
                option.value = tipoCod;
                option.textContent = tipoPago ? tipoPago.descripcion : `Tipo ${tipoCod}`;
                ventasTipoPago.appendChild(option);
            });
            console.log(`✅ ${tiposPagoUnicos.length} tipos de pago agregados al filtro`);
        }
    }

    buscarTipoPagoPorCodigo(codigoPago) {
        if (!codigoPago || !this.tiposPagoData.length) return null;
        
        // Intentar buscar por ID primero
        let tipo = this.tiposPagoData.find(t => t.id === codigoPago);
        
        if (!tipo) {
            // Intentar buscar por código o descripción
            tipo = this.tiposPagoData.find(t => {
                const desc = t.TIP_PAG_DESCRIP || t.descripcion || t.DESCRIPCION || '';
                return desc.toLowerCase().includes(codigoPago.toLowerCase()) ||
                    t.codigo === codigoPago;
            });
        }
        
        if (tipo) {
            return {
                id: tipo.id,
                descripcion: tipo.TIP_PAG_DESCRIP || tipo.descripcion || tipo.DESCRIPCION || 'Tipo sin nombre'
            };
        }
        
        return { descripcion: codigoPago };
    }

    buscarEntregaPorCodigo(codigoEntrega) {
        if (!codigoEntrega || !this.entregasData?.length) return null;
        
        const entrega = this.entregasData.find(e => e.id === codigoEntrega);
        if (entrega) {
            return {
                id: entrega.id,
                descripcion: entrega.descripcion || entrega.DESCRIPCION || entrega.nombre || 'Entrega sin nombre'
            };
        }
        
        return { descripcion: codigoEntrega };
    }

    buscarCliente(clienteId) {
        if (!clienteId || !this.clientesData.length) return null;
        
        const cliente = this.clientesData.find(c => c.id === clienteId);
        if (cliente) {
            return {
                id: cliente.id,
                nombre: cliente.CLI_NOMBRE || cliente.nombre || cliente.NOMBRE || 'Cliente sin nombre'
            };
        }
        return null;
    }

    buscarEmpleado(empleadoId) {
        if (!empleadoId || !this.empleadosData.length) return null;
        
        const empleado = this.empleadosData.find(e => e.id === empleadoId);
        if (empleado) {
            const nombre = empleado.EMP_NOMBRE || empleado.nombre || empleado.NOMBRE || '';
            const apellido = empleado.EMP_APELLIDO || empleado.apellido || empleado.APELLIDO || '';
            return {
                id: empleado.id,
                nombre: `${nombre} ${apellido}`.trim() || 'Empleado sin nombre'
            };
        }
        return null;
    }

    buscarEstado(estadoId) {
        if (!estadoId || !this.estadosData.length) return null;
        
        const estado = this.estadosData.find(e => e.id === estadoId);
        if (estado) {
            return {
                id: estado.id,
                descripcion: estado.EST_DESCRIP || estado.descripcion || estado.DESCRIPCION || 'Estado sin nombre'
            };
        }
        return null;
    }

    buscarTipoPago(tipoId) {
        if (!tipoId || !this.tiposPagoData.length) return null;
        
        const tipo = this.tiposPagoData.find(t => t.id === tipoId);
        if (tipo) {
            return {
                id: tipo.id,
                descripcion: tipo.TIP_PAG_DESCRIP || tipo.descripcion || tipo.DESCRIPCION || 'Tipo sin nombre'
            };
        }
        return null;
    }

    actualizarTablaCompras() {
        console.log('🔄 ACTUALIZANDO TABLA COMPRAS...');
        
        const tbody = document.getElementById('compras-table');
        if (!tbody) {
            console.error('❌ Elemento compras-table no encontrado');
            return;
        }
        
        console.log(`📊 Compras filtradas para mostrar: ${this.comprasFiltradas.length}`);
        
        if (this.comprasFiltradas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center">
                        <div style="padding: 2rem;">
                            <i data-lucide="inbox" style="width: 48px; height: 48px; margin-bottom: 1rem; color: #6b7280;"></i>
                            <br>
                            <strong>No se encontraron registros</strong>
                            <br>
                            <small style="color: #9ca3af;">Intenta ajustar los filtros de búsqueda</small>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        const filas = this.comprasFiltradas.map((compra, index) => {
            console.log(`Procesando compra ${index + 1}:`, compra);
            
            // Buscar datos relacionados
            const proveedor = this.proveedoresData.find(p => p.id === compra.COM_PRO_ID);
            const estado = this.estadosData.find(e => e.id === compra.COM_ESTADO);
            const tipoPago = this.tiposPagoData.find(t => t.id === compra.COM_TIP_PAG_ID);

            // Usar FormatterManager si está disponible, sino usar funciones propias
            const formatDate = window.FormatterManager?.formatDate || this.formatDate;
            const formatCurrency = window.FormatterManager?.formatCurrency || this.formatCurrency;

            return `
                <tr>
                    <td><strong>${compra.COM_NUM || 'N/A'}</strong></td>
                    <td>${formatDate.call(this, compra.COM_FEC_COMPRA)}</td>
                    <td>${proveedor?.PRO_NOMBRE || proveedor?.nombre || 'Proveedor no encontrado'}</td>
                    <td>${formatCurrency.call(this, compra.COM_TOTAL)}</td>
                    <td>${formatCurrency.call(this, compra.COM_FLETE)}</td>
                    <td>${formatCurrency.call(this, compra.COM_ADUANAS)}</td>
                    <td><strong>${formatCurrency.call(this, compra.COM_TOTAL_FINAL)}</strong></td>
                    <td>${tipoPago?.TIP_PAG_DESCRIP || tipoPago?.descripcion || 'N/A'}</td>
                    <td><span class="badge badge-green">${estado?.EST_DESCRIP || estado?.descripcion || 'N/A'}</span></td>
                    <td>${formatDate.call(this, compra.COM_FEC_RECEPCION)}</td>
                </tr>
            `;
        });

        tbody.innerHTML = filas.join('');
        console.log(`✅ Tabla actualizada con ${this.comprasFiltradas.length} filas`);
        
        // Reinicializar iconos de Lucide si es necesario
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    obtenerTiposPagoCompletos(venta) {
        const tiposPago = [];
        
        // Primer tipo de pago (PED_PAG_COD)
        if (venta.PED_PAG_COD) {
            const tipoPago1 = this.buscarTipoPagoPorCodigo(venta.PED_PAG_COD);
            if (tipoPago1) {
                tiposPago.push(tipoPago1.descripcion);
            } else {
                tiposPago.push(venta.PED_PAG_COD);
            }
        }
        
        // Segundo tipo de pago (PED_PAG_COD2)
        if (venta.PED_PAG_COD2 && venta.PED_PAG_COD2.trim() !== '') {
            const tipoPago2 = this.buscarTipoPagoPorCodigo(venta.PED_PAG_COD2);
            if (tipoPago2) {
                tiposPago.push(tipoPago2.descripcion);
            } else {
                tiposPago.push(venta.PED_PAG_COD2);
            }
        }
        
        // Retornar como texto separado por " + "
        if (tiposPago.length === 0) {
            return 'N/A';
        } else if (tiposPago.length === 1) {
            return tiposPago[0];
        } else {
            return tiposPago.join(' + ');
        }
    }

    actualizarEstadisticasVentas() {
        const totalRegistros = this.ventasFiltradas.length;
        const montoTotal = this.ventasFiltradas.reduce((sum, venta) => sum + (parseFloat(venta.PED_TOTAL) || 0), 0);
        const promedio = totalRegistros > 0 ? montoTotal / totalRegistros : 0;
        
        // Contar pendientes (los que tienen PED_SERVICIO !== 'Terminado')
        const pendientes = this.ventasFiltradas.filter(venta => {
            return venta.PED_SERVICIO !== 'Terminado';
        }).length;

        const totalRegistrosEl = document.getElementById('ventas-total-registros');
        const montoTotalEl = document.getElementById('ventas-monto-total');
        const promedioEl = document.getElementById('ventas-promedio');
        const pendientesEl = document.getElementById('ventas-pendientes');

        if (totalRegistrosEl) totalRegistrosEl.textContent = totalRegistros;
        if (montoTotalEl) montoTotalEl.textContent = this.formatCurrency(montoTotal);
        if (promedioEl) promedioEl.textContent = this.formatCurrency(promedio);
        if (pendientesEl) pendientesEl.textContent = pendientes;
        
        console.log(`📊 Estadísticas actualizadas: ${totalRegistros} ventas, ${pendientes} pendientes`);
    }



    actualizarEstadisticasCompras() {
        const totalRegistros = this.comprasFiltradas.length;
        const subtotal = this.comprasFiltradas.reduce((sum, compra) => sum + (parseFloat(compra.COM_TOTAL) || 0), 0);
        const fleteTotal = this.comprasFiltradas.reduce((sum, compra) => sum + (parseFloat(compra.COM_FLETE) || 0), 0);
        const aduanasTotal = this.comprasFiltradas.reduce((sum, compra) => sum + (parseFloat(compra.COM_ADUANAS) || 0), 0);
        const totalFinal = this.comprasFiltradas.reduce((sum, compra) => sum + (parseFloat(compra.COM_TOTAL_FINAL) || 0), 0);
        const promedio = totalRegistros > 0 ? totalFinal / totalRegistros : 0;

        const totalRegistrosEl = document.getElementById('compras-total-registros');
        const subtotalEl = document.getElementById('compras-subtotal');
        const fleteTotalEl = document.getElementById('compras-flete-total');
        const aduanasTotalEl = document.getElementById('compras-aduanas-total');
        const totalFinalEl = document.getElementById('compras-total-final');
        const promedioEl = document.getElementById('compras-promedio');

        if (totalRegistrosEl) totalRegistrosEl.textContent = totalRegistros;
        if (subtotalEl) subtotalEl.textContent = window.FormatterManager?.formatCurrency(subtotal) || this.formatCurrency(subtotal);
        if (fleteTotalEl) fleteTotalEl.textContent = window.FormatterManager?.formatCurrency(fleteTotal) || this.formatCurrency(fleteTotal);
        if (aduanasTotalEl) aduanasTotalEl.textContent = window.FormatterManager?.formatCurrency(aduanasTotal) || this.formatCurrency(aduanasTotal);
        if (totalFinalEl) totalFinalEl.textContent = window.FormatterManager?.formatCurrency(totalFinal) || this.formatCurrency(totalFinal);
        if (promedioEl) promedioEl.textContent = window.FormatterManager?.formatCurrency(promedio) || this.formatCurrency(promedio);
    }

    actualizarGraficoVentas() {
        const ctx = document.getElementById('ventasChart')?.getContext('2d');
        if (!ctx) return;
        
        if (this.ventasChart) {
            this.ventasChart.destroy();
        }

        // Agrupar ventas por mes usando PED_FECHA_VENTA
        const ventasPorMes = {};
        this.ventasFiltradas.forEach(venta => {
            if (venta.PED_FECHA_VENTA) {
                const fecha = new Date(venta.PED_FECHA_VENTA);
                const mesAno = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
                if (!ventasPorMes[mesAno]) {
                    ventasPorMes[mesAno] = 0;
                }
                ventasPorMes[mesAno] += parseFloat(venta.PED_TOTAL) || 0;
            }
        });

        const labels = Object.keys(ventasPorMes).sort();
        const data = labels.map(label => ventasPorMes[label]);

        this.ventasChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ventas (S/)',
                    data: data,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => this.formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    actualizarGraficoCompras() {
        const ctx = document.getElementById('comprasChart')?.getContext('2d');
        if (!ctx) return;
        
        if (this.comprasChart) {
            this.comprasChart.destroy();
        }

        // Agrupar compras por mes
        const comprasPorMes = {};
        this.comprasFiltradas.forEach(compra => {
            if (compra.COM_FEC_COMPRA) {
                const fecha = new Date(compra.COM_FEC_COMPRA);
                const mesAno = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
                if (!comprasPorMes[mesAno]) {
                    comprasPorMes[mesAno] = 0;
                }
                comprasPorMes[mesAno] += parseFloat(compra.COM_TOTAL_FINAL) || 0;
            }
        });

        const labels = Object.keys(comprasPorMes).sort();
        const data = labels.map(label => comprasPorMes[label]);

        this.comprasChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Compras (S/)',
                    data: data,
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    borderColor: 'rgb(239, 68, 68)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => this.formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    limpiarFiltrosVentas() {
        const elementos = [
            'ventas-fecha-desde', 
            'ventas-fecha-hasta', 
            'ventas-cliente',
            'ventas-empleado', 
            'ventas-estado-servicio',  // NUEVO ID
            'ventas-tipo-pago',
            'ventas-monto-desde', 
            'ventas-monto-hasta'
        ];

        elementos.forEach(id => {
            const elemento = document.getElementById(id);
            if (elemento) elemento.value = '';
        });

        this.aplicarFiltrosVentas();
    }

    limpiarFiltrosCompras() {
        const elementos = [
            'compras-fecha-desde', 'compras-fecha-hasta', 'compras-proveedor',
            'compras-estado', 'compras-tipo-pago', 'compras-monto-desde',
            'compras-monto-hasta', 'compras-incluir-flete'
        ];

        elementos.forEach(id => {
            const elemento = document.getElementById(id);
            if (elemento) elemento.value = '';
        });

        this.aplicarFiltrosCompras();
    }

    exportarVentas() {
        if (this.ventasFiltradas.length === 0) {
            alert('No hay datos para exportar');
            return;
        }

        const csv = this.convertirACSV(this.ventasFiltradas, 'ventas');
        this.descargarCSV(csv, 'reporte_ventas.csv');
    }

    exportarCompras() {
        if (this.comprasFiltradas.length === 0) {
            alert('No hay datos para exportar');
            return;
        }

        const csv = this.convertirACSV(this.comprasFiltradas, 'compras');
        this.descargarCSV(csv, 'reporte_compras.csv');
    }

    convertirACSV(data, tipo) {
        if (tipo === 'ventas') {
            const headers = ['N° Pedido', 'Fecha Venta', 'Cliente', 'Empleado', 'Total', 'Tipo Pago', 'Estado', 'Fecha Entrega'];
            const csvContent = [
                headers.join(','),
                ...data.map(venta => {
                    const cliente = this.clientesData.find(c => c.id === venta.PED_CLI_ID);
                    const empleado = this.empleadosData.find(e => e.id === venta.PED_EMP_DNI);
                    const estado = this.estadosData.find(e => e.id === venta.PED_EST_SER);
                    const tipoPago = this.tiposPagoData.find(t => t.id === venta.PED_TIP_PAG_ID);

                    return [
                        venta.PED_NUM || '',
                        this.formatDate(venta.PED_FEC_VENTA),
                        cliente?.CLI_NOMBRE || cliente?.nombre || '',
                        empleado ? `${empleado.EMP_NOMBRE || empleado.nombre || ''} ${empleado.EMP_APELLIDO || empleado.apellido || ''}`.trim() : '',
                        venta.PED_TOTAL || 0,
                        tipoPago?.TIP_PAG_DESCRIP || tipoPago?.descripcion || '',
                        estado?.EST_DESCRIP || estado?.descripcion || '',
                        this.formatDate(venta.PED_FEC_ENTREGA)
                    ].join(',');
                })
            ].join('\n');
            return csvContent;
        } else {
            const headers = ['N° Compra', 'Fecha Compra', 'Proveedor', 'Subtotal', 'Flete', 'Aduanas', 'Total Final', 'Tipo Pago', 'Estado', 'Fecha Recepción'];
            const csvContent = [
                headers.join(','),
                ...data.map(compra => {
                    const proveedor = this.proveedoresData.find(p => p.id === compra.COM_PRO_ID);
                    const estado = this.estadosData.find(e => e.id === compra.COM_ESTADO);
                    const tipoPago = this.tiposPagoData.find(t => t.id === compra.COM_TIP_PAG_ID);

                    return [
                        compra.COM_NUM || '',
                        this.formatDate(compra.COM_FEC_COMPRA),
                        proveedor?.PRO_NOMBRE || proveedor?.nombre || '',
                        compra.COM_TOTAL || 0,
                        compra.COM_FLETE || 0,
                        compra.COM_ADUANAS || 0,
                        compra.COM_TOTAL_FINAL || 0,
                        tipoPago?.TIP_PAG_DESCRIP || tipoPago?.descripcion || '',
                        estado?.EST_DESCRIP || estado?.descripcion || '',
                        this.formatDate(compra.COM_FEC_RECEPCION)
                    ].join(',');
                })
            ].join('\n');
            return csvContent;
        }
    }

    descargarCSV(csvContent, filename) {
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Métodos de formateo de respaldo
    formatCurrency(amount) {
        return new Intl.NumberFormat('es-PE', {
            style: 'currency',
            currency: 'PEN'
        }).format(amount || 0);
    }

    formatDate(dateString) {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('es-PE');
    }

    // Método para refrescar datos
    async refrescarDatos() {
        await this.cargarDatos();
        await this.configurarFiltros();
        this.aplicarFiltrosVentas();
        this.aplicarFiltrosCompras();
    }

    async onTabChange(tabName) {
        console.log(`🔄 Cambio de pestaña a: ${tabName}`);
        
        if (tabName === 'reportes-ventas') {
            if (!this.initialized) {
                await this.initialize();
            }
            setTimeout(() => {
                console.log('🚀 Aplicando filtros de ventas automáticamente...');
                this.aplicarFiltrosVentas();
            }, 100);
        } 
        else if (tabName === 'reportes-compras') {
            if (!this.initialized) {
                await this.initialize();
            }
            setTimeout(() => {
                console.log('🚀 Aplicando filtros de compras automáticamente...');
                this.aplicarFiltrosCompras(); // ESTA LÍNEA ES CRÍTICA
            }, 100);
        }
    }

    verificarEstadosServicio() {
        console.log('🔍 VERIFICANDO ESTADOS DE SERVICIO');
        console.log('==================================');
        
        // Analizar todos los valores de PED_SERVICIO
        const estadosUnicos = [...new Set(this.ventasData.map(v => v.PED_SERVICIO))];
        console.log('Estados únicos encontrados:', estadosUnicos);
        
        // Contar cada estado
        const conteoEstados = {};
        this.ventasData.forEach(venta => {
            const estado = venta.PED_SERVICIO || 'Sin estado';
            conteoEstados[estado] = (conteoEstados[estado] || 0) + 1;
        });
        
        console.log('Conteo por estado:');
        Object.entries(conteoEstados).forEach(([estado, cantidad]) => {
            console.log(`  ${estado}: ${cantidad} ventas`);
        });
        
        // Mostrar ejemplos de cada estado
        console.log('Ejemplos por estado:');
        estadosUnicos.forEach(estado => {
            const ejemplo = this.ventasData.find(v => v.PED_SERVICIO === estado);
            if (ejemplo) {
                console.log(`  ${estado || 'Sin estado'}: Pedido ${ejemplo.PED_NUM}`);
            }
        });
        
        // Verificar si necesitamos normalizar los datos
        const estadosNoEstandar = estadosUnicos.filter(estado => 
            estado && estado !== 'Pendiente' && estado !== 'Terminado'
        );
        
        if (estadosNoEstandar.length > 0) {
            console.warn('⚠️ Estados no estándar encontrados:', estadosNoEstandar);
            console.log('💡 Considera normalizar estos valores a "Pendiente" o "Terminado"');
        }
    }

    // PASO 5: FUNCIÓN para normalizar estados si es necesario
    // AGREGAR esta función:

    normalizarEstadosServicio() {
        console.log('🔧 NORMALIZANDO ESTADOS DE SERVICIO...');
        
        let cambios = 0;
        
        this.ventasData.forEach(venta => {
            const estadoOriginal = venta.PED_SERVICIO;
            let estadoNormalizado = estadoOriginal;
            
            if (!estadoOriginal) {
                estadoNormalizado = 'Pendiente'; // Por defecto
                cambios++;
            } else {
                const estadoLower = estadoOriginal.toLowerCase();
                
                // Mapear estados similares
                if (estadoLower.includes('terminado') || estadoLower.includes('completo') || estadoLower.includes('finalizado')) {
                    estadoNormalizado = 'Terminado';
                } else if (estadoLower.includes('pendiente') || estadoLower.includes('proceso') || estadoLower.includes('espera')) {
                    estadoNormalizado = 'Pendiente';
                }
                
                if (estadoOriginal !== estadoNormalizado) {
                    cambios++;
                }
            }
            
            venta.PED_SERVICIO = estadoNormalizado;
        });
        
        console.log(`✅ ${cambios} estados normalizados`);
        
        // Reconfigurar filtros después de normalizar
        this.configurarFiltrosVentas();
    }

    async forzarRecargaCompras() {
        console.log('🔄 FORZANDO RECARGA DE COMPRAS...');
        
        try {
            // Limpiar cache
            window.smartCache?.invalidate('collection_TB_COMPRAS');
            window.smartCache?.invalidate('collection_TB_PROVEEDORES');
            window.smartCache?.invalidate('collection_TB_ESTADO');
            
            // Recargar datos
            this.comprasData = [];
            this.comprasFiltradas = [];
            
            await this.cargarDatos();
            await this.configurarFiltros();
            await this.aplicarFiltrosCompras();
            
            console.log('✅ Recarga forzada completada');
            
        } catch (error) {
            console.error('❌ Error en recarga forzada:', error);
        }
    }


    
}


// 6. EXPORTAR FUNCIONES GLOBALES para debugging:

// Agregar al final del archivo reportesManager.js:
window.debugCompras = () => {
    if (window.reportesManager) {
        window.reportesManager.debugCompras();
    } else {
        console.log('ReportesManager no disponible');
    }
};

window.forzarRecargaCompras = async () => {
    if (window.reportesManager) {
        await window.reportesManager.forzarRecargaCompras();
    } else {
        console.log('ReportesManager no disponible');
    }
};

// 7. VERIFICAR HTML - Asegurar que la tabla existe:
// En el HTML de reportes, verificar que existe este elemento:
/*
<tbody id="compras-table">
    <tr><td colspan="10" class="text-center"><div class="loading"></div></td></tr>
</tbody>
*/

// Crear instancia global
window.reportesManager = new ReportesManager();