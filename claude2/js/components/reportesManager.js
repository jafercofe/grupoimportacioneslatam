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
            console.log('🎛️ Configurando todos los filtros...');
            
            // Configurar filtros específicos de ventas
            await this.configurarFiltrosVentas();
            await this.configurarFiltrosCompras();
            
            // CONFIGURAR FILTROS DE COMPRAS CON CAMPOS REALES
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
                console.log(`✅ ${this.proveedoresData.length} proveedores configurados en filtro`);
            }

            if (comprasEstado) {
                comprasEstado.innerHTML = '<option value="">Todos los estados</option>';
                this.estadosData.forEach(estado => {
                    const option = document.createElement('option');
                    option.value = estado.id;
                    option.textContent = estado.EST_DESCRIP || estado.descripcion || 'Estado sin nombre';
                    comprasEstado.appendChild(option);
                });
                console.log(`✅ ${this.estadosData.length} estados configurados en filtro`);
            }

            if (comprasTipoPago) {
                comprasTipoPago.innerHTML = '<option value="">Todos los tipos</option>';
                this.tiposPagoData.forEach(tipo => {
                    const option = document.createElement('option');
                    option.value = tipo.id;
                    option.textContent = tipo.TIP_PAG_DESCRIP || tipo.descripcion || 'Tipo sin nombre';
                    comprasTipoPago.appendChild(option);
                });
                console.log(`✅ ${this.tiposPagoData.length} tipos de pago configurados en filtro`);
            }

            console.log('✅ Filtros configurados exitosamente');

        } catch (error) {
            console.error('❌ Error configurando filtros:', error);
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
            
            // ✨ NUEVO: Agregar esta línea para obtener el número de pedido
            const numeroPedido = document.getElementById('ventas-numero-pedido')?.value;

            console.log('🎯 Aplicando filtros con valores:', {
                fechaDesde, fechaHasta, cliente, empleado, estadoServicio, tipoPago, montoDesde, montoHasta, numeroPedido // ← Agregar aquí también
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

                // ✨ NUEVO: Agregar este bloque para filtrar por número de pedido
                if (numeroPedido && numeroPedido.trim() !== '') {
                    const numPedido = (venta.PED_NUM || '').toString().toLowerCase();
                    const filtroNum = numeroPedido.toLowerCase();
                    if (!numPedido.includes(filtroNum)) incluir = false;
                }

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
            if (!this.initialized) {
                await this.initialize();
            }

            const fechaDesde = document.getElementById('compras-fecha-desde')?.value;
            const fechaHasta = document.getElementById('compras-fecha-hasta')?.value;
            const proveedor = document.getElementById('compras-proveedor')?.value;
            const estado = document.getElementById('compras-estado')?.value;
            const tipoPago = document.getElementById('compras-tipo-pago')?.value;
            const montoDesde = parseFloat(document.getElementById('compras-monto-desde')?.value) || 0;
            const montoHasta = parseFloat(document.getElementById('compras-monto-hasta')?.value) || Infinity;
            const incluirFlete = document.getElementById('compras-incluir-flete')?.value;

            this.comprasFiltradas = this.comprasData.filter(compra => {
                let incluir = true;

                // ✨ FILTRO POR FECHA CORREGIDO - buscar en múltiples campos
                if (fechaDesde || fechaHasta) {
                    let fechaCompra = null;
                    
                    // Buscar fecha en múltiples campos posibles
                    const camposFecha = ['COM_FECHA_COMPRA', 'COM_FEC_COMPRA', 'COM_FECHA_RECEPCION', 'COM_FEC_RECEPCION'];
                    
                    for (const campo of camposFecha) {
                        if (compra[campo] && compra[campo] !== 'undefined' && compra[campo] !== '') {
                            fechaCompra = new Date(compra[campo]);
                            if (!isNaN(fechaCompra.getTime())) {
                                break;
                            }
                        }
                    }
                    
                    // Aplicar filtros de fecha si se encontró una fecha válida
                    if (fechaCompra) {
                        if (fechaDesde && fechaCompra < new Date(fechaDesde)) {
                            incluir = false;
                        }
                        if (fechaHasta && fechaCompra > new Date(fechaHasta)) {
                            incluir = false;
                        }
                    } else if (fechaDesde || fechaHasta) {
                        // Si se especificó filtro de fecha pero la compra no tiene fecha válida, excluir
                        incluir = false;
                    }
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

            this.actualizarTablaCompras();
            this.actualizarEstadisticasCompras();
            this.actualizarGraficoCompras();

        } catch (error) {
            console.error('Error aplicando filtros de compras:', error);
        }
    }

    async configurarFiltrosCompras() {
        try {
            console.log('🎛️ Configurando filtros de compras...');

            // Extraer todos los códigos de tipos de pago (COM_TIPO_PAGO y COM_TIPO_PAGO2)
            const tiposPagoSet = new Set();
            this.comprasData.forEach(compra => {
                if (compra.COM_TIPO_PAGO) tiposPagoSet.add(compra.COM_TIPO_PAGO);
                if (compra.COM_TIPO_PAGO2 && compra.COM_TIPO_PAGO2.trim() !== '') tiposPagoSet.add(compra.COM_TIPO_PAGO2);
            });
            const tiposPagoUnicos = Array.from(tiposPagoSet).filter(Boolean);

            // FIX 1: Configurar filtro de proveedores correctamente
            const comprasProveedor = document.getElementById('compras-proveedor');
            if (comprasProveedor) {
                comprasProveedor.innerHTML = '<option value="">Todos los proveedores</option>';
                
                try {
                    // Cargar proveedores con nombres reales
                    const proveedores = await window.dataService.getAll('TB_PROVEEDORES');
                    console.log(`✅ ${proveedores.length} proveedores cargados para filtro`);
                    
                    proveedores.forEach(proveedor => {
                        const option = document.createElement('option');
                        option.value = proveedor.id;
                        option.textContent = proveedor.PROV_NOM || proveedor.nombre || `Proveedor ${proveedor.id}`;
                        comprasProveedor.appendChild(option);
                    });
                    
                } catch (error) {
                    console.error('Error cargando proveedores para filtro:', error);
                    comprasProveedor.innerHTML = '<option value="">Error cargando proveedores</option>';
                }
            }

            // FIX 2: Configurar filtro de estado de servicio con opciones fijas
            const comprasEstadoServicio = document.getElementById('compras-estado-servicio');
            if (comprasEstadoServicio) {
                comprasEstadoServicio.innerHTML = `
                    <option value="">Todos los estados de servicio</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="Terminado">Terminado</option>
                `;
                
                console.log('✅ Estados de servicio de compras configurados: Pendiente y Terminado');
                
                // Debug: Verificar cuántas compras hay de cada tipo
                const pendientes = this.comprasData.filter(c => {
                    const estado = c.COM_ESTADO_SERVICIO || 'Pendiente';
                    const estadoLower = estado.toLowerCase();
                    return !estadoLower.includes('terminado') && !estadoLower.includes('completo');
                }).length;
                
                const terminados = this.comprasData.filter(c => {
                    const estado = c.COM_ESTADO_SERVICIO || '';
                    const estadoLower = estado.toLowerCase();
                    return estadoLower.includes('terminado') || estadoLower.includes('completo');
                }).length;
                
                console.log(`📊 Estadísticas de estado de compras:`, {
                    Pendiente: pendientes,
                    Terminado: terminados,
                    'Total compras': this.comprasData.length
                });
            }

            // Configurar filtro de tipos de pago
            const comprasTipoPago = document.getElementById('compras-tipo-pago');
            if (comprasTipoPago) {
                comprasTipoPago.innerHTML = '<option value="">Todos los tipos</option>';
                
                // Usar los datos de tipos de pago ya cargados
                this.tiposPagoData.forEach(tipo => {
                    const option = document.createElement('option');
                    option.value = tipo.id;
                    option.textContent = tipo.descripcion || tipo.TIP_PAG_DESCRIP || `Tipo ${tipo.id}`;
                    comprasTipoPago.appendChild(option);
                });
                
                console.log(`✅ ${this.tiposPagoData.length} tipos de pago agregados al filtro de compras`);
            }

            console.log('✅ Configuración de filtros de compras completada');

        } catch (error) {
            console.error('❌ Error configurando filtros de compras:', error);
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
                    <td><span class="badge ${this.getEstadoServicioClase(venta.PED_SERVICIO)}">${venta.PED_SERVICIO || 'N/A'}</span></td>
                    <td>${this.formatDate(venta.PED_FECHA_PARCIAL)}</td>
                    <td>
                    <button onclick="verDetallesPedido('${venta.PED_NUM}', '${venta.PED_NUM || ''}')" class="btn btn-primary btn-sm" title="Ver Detalles">
                            <i data-lucide="eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    getEstadoServicioClase(estado) {
        switch (estado) {
            case 'Pendiente':
                return 'badge-yellow';  // Estilo amarillo para pendiente
            case 'Terminado':
                return 'badge-green';   // Estilo verde para terminado
            default:
                return 'badge-blue';    // Estilo por defecto
        }
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
        
        // USAR NOMBRES DE CAMPOS REALES PARA CÁLCULOS
        const subtotal = this.comprasFiltradas.reduce((sum, compra) => {
            return sum + (parseFloat(compra.COM_SUBTOTAL || compra.COM_TOTAL || 0));
        }, 0);
        
        const fleteTotal = this.comprasFiltradas.reduce((sum, compra) => {
            return sum + (parseFloat(compra.COM_FLETE || compra.FLETE || 0));
        }, 0);
        
        const aduanasTotal = this.comprasFiltradas.reduce((sum, compra) => {
            return sum + (parseFloat(compra.COM_ADUANAS || compra.ADUANAS || 0));
        }, 0);
        
        const totalFinal = this.comprasFiltradas.reduce((sum, compra) => {
            return sum + (parseFloat(compra.COM_TOTAL_FINAL || compra.TOTAL_FINAL || 0));
        }, 0);
        
        const promedio = totalRegistros > 0 ? totalFinal / totalRegistros : 0;

        // Actualizar elementos del DOM
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
        
        console.log(`📊 Estadísticas actualizadas: ${totalRegistros} compras, total: ${totalFinal}`);
    }

    actualizarGraficoVentas() {
        const ctx = document.getElementById('ventasChart')?.getContext('2d');
        if (!ctx) return;
        
        if (this.ventasChart) {
            this.ventasChart.destroy();
        }

        // Obtener tipo de agrupación seleccionado
        const tipoAgrupacion = document.getElementById('ventas-agrupacion')?.value || 'mes';
        console.log(`📊 Agrupando ventas por: ${tipoAgrupacion}`);

        // Agrupar ventas según el tipo seleccionado
        const ventasPorPeriodo = {};
        
        this.ventasFiltradas.forEach((venta, index) => {
            let fecha;
            let fechaEncontrada = false;
            
            // Buscar fecha en múltiples campos
            const camposFecha = ['PED_FECHA_VENTA', 'PED_FEC_VENTA', 'PED_FECHA_ENTREGA'];
            
            for (const campo of camposFecha) {
                if (venta[campo] && venta[campo] !== 'undefined' && venta[campo] !== '') {
                    fecha = new Date(venta[campo]);
                    if (!isNaN(fecha.getTime())) {
                        fechaEncontrada = true;
                        break;
                    }
                }
            }
            
            if (!fechaEncontrada) {
                console.warn(`⚠️ Venta ${venta.PED_NUM} sin fecha válida, usando ficticia`);
                fecha = new Date();
                fecha.setMonth(fecha.getMonth() - index);
            }
            
            // Generar clave según tipo de agrupación
            let clavePeriodo;
            
            switch (tipoAgrupacion) {
                case 'año':
                    clavePeriodo = fecha.getFullYear().toString();
                    break;
                    
                case 'mes':
                    clavePeriodo = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
                    break;
                    
                case 'semana':
                    // Calcular número de semana del año
                    const inicioAño = new Date(fecha.getFullYear(), 0, 1);
                    const diasDelAño = Math.floor((fecha - inicioAño) / (24 * 60 * 60 * 1000));
                    const numeroSemana = Math.ceil((diasDelAño + inicioAño.getDay() + 1) / 7);
                    clavePeriodo = `${fecha.getFullYear()}-S${String(numeroSemana).padStart(2, '0')}`;
                    break;
                    
                case 'dia':
                    clavePeriodo = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
                    break;
                    
                default:
                    clavePeriodo = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
            }
            
            if (!ventasPorPeriodo[clavePeriodo]) {
                ventasPorPeriodo[clavePeriodo] = 0;
            }
            ventasPorPeriodo[clavePeriodo] += parseFloat(venta.PED_TOTAL) || 0;
        });

        const labels = Object.keys(ventasPorPeriodo).sort();
        const data = labels.map(label => ventasPorPeriodo[label]);
        
        // Formatear labels para mejor visualización
        const labelsFormateados = labels.map(label => {
            switch (tipoAgrupacion) {
                case 'año':
                    return label;
                case 'mes':
                    const [año, mes] = label.split('-');
                    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
                                'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                    return `${meses[parseInt(mes) - 1]} ${año}`;
                case 'semana':
                    const [añoSem, semana] = label.split('-S');
                    return `Sem ${semana} - ${añoSem}`;
                case 'dia':
                    const [añoD, mesD, dia] = label.split('-');
                    return `${dia}/${mesD}/${añoD}`;
                default:
                    return label;
            }
        });

        console.log(`📈 Datos agrupados por ${tipoAgrupacion}:`, { labels: labelsFormateados, data });

        // Verificar que hay datos
        if (labels.length === 0 || data.every(d => d === 0)) {
            console.warn('⚠️ No hay datos válidos para el gráfico de ventas');
            return;
        }

        // Crear gráfico
        this.ventasChart = new Chart(ctx, {
            type: 'bar', // Cambiado de 'line' a 'bar' como solicitaste antes
            data: {
                labels: labelsFormateados,
                datasets: [{
                    label: `Ventas por ${tipoAgrupacion} (S/)`,
                    data: data,
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 2,
                    borderRadius: 4,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: 'white'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: 'white',
                            maxRotation: tipoAgrupacion === 'dia' ? 45 : 0 // Rotar labels para días
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.2)'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: 'white',
                            callback: (value) => this.formatCurrency(value)
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.2)'
                        }
                    }
                }
            }
        });
        
        console.log(`✅ Gráfico de ventas creado con ${labels.length} períodos (${tipoAgrupacion})`);
    }

    actualizarGraficoCompras() {
        const ctx = document.getElementById('comprasChart')?.getContext('2d');
        if (!ctx) return;
        
        if (this.comprasChart) {
            this.comprasChart.destroy();
        }

        // Obtener tipo de agrupación seleccionado
        const tipoAgrupacion = document.getElementById('compras-agrupacion')?.value || 'mes';
        console.log(`📊 Agrupando compras por: ${tipoAgrupacion}`);

        // Agrupar compras según el tipo seleccionado
        const comprasPorPeriodo = {};
        
        this.comprasFiltradas.forEach((compra, index) => {
            let fecha;
            let fechaEncontrada = false;
            
            // Buscar fecha en múltiples campos (usando el fix que ya funciona)
            const camposFecha = ['COM_FEC_COMPRA', 'COM_FECHA_COMPRA', 'COM_FEC_RECEPCION', 'COM_FECHA_RECEPCION'];
            
            for (const campo of camposFecha) {
                if (compra[campo] && compra[campo] !== 'undefined' && compra[campo] !== '') {
                    fecha = new Date(compra[campo]);
                    if (!isNaN(fecha.getTime())) {
                        fechaEncontrada = true;
                        break;
                    }
                }
            }
            
            if (!fechaEncontrada) {
                console.warn(`⚠️ Compra ${compra.COM_NUM} sin fecha válida, usando ficticia`);
                fecha = new Date();
                fecha.setMonth(fecha.getMonth() - index);
            }
            
            // Generar clave según tipo de agrupación
            let clavePeriodo;
            
            switch (tipoAgrupacion) {
                case 'año':
                    clavePeriodo = fecha.getFullYear().toString();
                    break;
                    
                case 'mes':
                    clavePeriodo = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
                    break;
                    
                case 'semana':
                    const inicioAño = new Date(fecha.getFullYear(), 0, 1);
                    const diasDelAño = Math.floor((fecha - inicioAño) / (24 * 60 * 60 * 1000));
                    const numeroSemana = Math.ceil((diasDelAño + inicioAño.getDay() + 1) / 7);
                    clavePeriodo = `${fecha.getFullYear()}-S${String(numeroSemana).padStart(2, '0')}`;
                    break;
                    
                case 'dia':
                    clavePeriodo = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
                    break;
                    
                default:
                    clavePeriodo = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
            }
            
            if (!comprasPorPeriodo[clavePeriodo]) {
                comprasPorPeriodo[clavePeriodo] = 0;
            }
            comprasPorPeriodo[clavePeriodo] += parseFloat(compra.COM_TOTAL_FINAL) || 0;
        });

        const labels = Object.keys(comprasPorPeriodo).sort();
        const data = labels.map(label => comprasPorPeriodo[label]);
        
        // Formatear labels para mejor visualización
        const labelsFormateados = labels.map(label => {
            switch (tipoAgrupacion) {
                case 'año':
                    return label;
                case 'mes':
                    const [año, mes] = label.split('-');
                    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
                                'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                    return `${meses[parseInt(mes) - 1]} ${año}`;
                case 'semana':
                    const [añoSem, semana] = label.split('-S');
                    return `Sem ${semana} - ${añoSem}`;
                case 'dia':
                    const [añoD, mesD, dia] = label.split('-');
                    return `${dia}/${mesD}/${añoD}`;
                default:
                    return label;
            }
        });

        console.log(`📈 Compras agrupadas por ${tipoAgrupacion}:`, { labels: labelsFormateados, data });

        // Verificar que hay datos
        if (labels.length === 0 || data.every(d => d === 0)) {
            console.warn('⚠️ No hay datos válidos para el gráfico de compras');
            return;
        }

        // Crear gráfico
        this.comprasChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labelsFormateados,
                datasets: [{
                    label: `Compras por ${tipoAgrupacion} (S/)`,
                    data: data,
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    borderColor: 'rgb(239, 68, 68)',
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: 'white'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: 'white',
                            maxRotation: tipoAgrupacion === 'dia' ? 45 : 0
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.2)'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: 'white',
                            callback: (value) => this.formatCurrency(value)
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.2)'
                        }
                    }
                }
            }
        });
        
        console.log(`✅ Gráfico de compras creado con ${labels.length} períodos (${tipoAgrupacion})`);
    }

    limpiarFiltrosVentas() {
        const elementos = [
            'ventas-fecha-desde', 
            'ventas-fecha-hasta', 
            'ventas-cliente',
            'ventas-empleado', 
            'ventas-estado-servicio',
            'ventas-tipo-pago',
            'ventas-monto-desde', 
            'ventas-monto-hasta',
            'ventas-numero-pedido',
            'ventas-agrupacion' // NUEVO: agregar este campo
        ];

        elementos.forEach(id => {
            const elemento = document.getElementById(id);
            if (elemento) {
                // Para el selector de agrupación, volver al valor por defecto
                if (id === 'ventas-agrupacion') {
                    elemento.value = 'mes';
                } else {
                    elemento.value = '';
                }
            }
        });

        this.aplicarFiltrosVentas();
    }

    limpiarFiltrosCompras() {
        const elementos = [
            'compras-fecha-desde', 
            'compras-fecha-hasta', 
            'compras-proveedor',
            'compras-estado', 
            'compras-tipo-pago', 
            'compras-monto-desde',
            'compras-monto-hasta', 
            'compras-incluir-flete',
            'compras-numero-compra',
            'compras-agrupacion' // NUEVO: agregar agrupación
        ];

        elementos.forEach(id => {
            const elemento = document.getElementById(id);
            if (elemento) {
                if (id === 'compras-agrupacion') {
                    elemento.value = 'mes'; // Valor por defecto
                } else {
                    elemento.value = '';
                }
            }
        });

        this.aplicarFiltrosCompras();
    }

    exportarVentas() {
        if (this.ventasFiltradas.length === 0) {
            window.notificationService.warning('No hay datos para exportar');
            return;
        }

        try {
            console.log('📊 Iniciando exportación a Excel...');
            
            // Preparar los datos para Excel
            const datosParaExcel = this.prepararDatosVentasExcel();
            
            // Crear libro de Excel
            const workbook = XLSX.utils.book_new();
            
            // Crear hoja de cálculo con los datos
            const worksheet = XLSX.utils.aoa_to_sheet(datosParaExcel);
            
            // Agregar estilos y formato
            this.aplicarFormatoExcelVentas(worksheet);
            
            // Agregar la hoja al libro
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte de Ventas');
            
            // Generar nombre de archivo con fecha
            const fecha = new Date().toISOString().split('T')[0];
            const nombreArchivo = `reporte_ventas_${fecha}.xlsx`;
            
            // Descargar el archivo
            XLSX.writeFile(workbook, nombreArchivo);
            
            console.log('✅ Archivo Excel exportado exitosamente');
            window.notificationService.success(`Archivo Excel descargado: ${nombreArchivo}`);
            
        } catch (error) {
            console.error('❌ Error exportando a Excel:', error);
            window.notificationService.error('Error al exportar el archivo Excel');
        }
    }

    // 4. AGREGAR función para preparar los datos

    prepararDatosVentasExcel() {
        // Encabezados de las columnas
        const headers = [
            'N° Pedido',
            'Cliente', 
            'Fecha Venta',
            'Fecha Entrega',
            'Total (S/)',
            'Opción Pago',
            'Tipo Pago',
            'Entrega',
            'Empleado',
            'Estado Servicio',
            'Fecha Pago Parcial',
            'Saldo'
        ];
        
        // Título principal
        const titulo = [`REPORTE DE VENTAS - ${new Date().toLocaleDateString('es-PE')}`];
        const subtitulo = [`Total de registros: ${this.ventasFiltradas.length}`];
        const espacioVacio = [''];
        
        // Datos de las ventas
        const filasDatos = this.ventasFiltradas.map(venta => {
            const cliente = this.buscarClientePorId(venta.PED_ID);
            const empleado = this.buscarEmpleadoPorCodigo(venta.PED_TRA_COD);
            const entrega = this.buscarEntregaPorCodigo(venta.PED_ENT_COD);
            const tiposPago = this.obtenerTiposPagoCompletos(venta);
            
            return [
                venta.PED_NUM || 'N/A',
                cliente ? cliente.nombre : (venta.PED_ID || 'Cliente no encontrado'),
                this.formatDateForExcel(venta.PED_FECHA_VENTA),
                this.formatDateForExcel(venta.PED_FECHA_ENTREGA),
                parseFloat(venta.PED_TOTAL) || 0,
                venta.PED_OPCION_PAGO || 'N/A',
                tiposPago,
                entrega ? entrega.descripcion : (venta.PED_ENT_COD || 'N/A'),
                empleado ? empleado.nombre : (venta.PED_TRA_COD || 'Empleado no encontrado'),
                venta.PED_SERVICIO || 'N/A',
                this.formatDateForExcel(venta.PED_FECHA_PARCIAL),
                venta.PED_SAL || ''
            ];
        });
        
        // Fila de totales
        const montoTotal = this.ventasFiltradas.reduce((sum, venta) => sum + (parseFloat(venta.PED_TOTAL) || 0), 0);
        const filaTotales = [
            '', '', '', 'TOTAL:', montoTotal.toFixed(2), '', '', '', '', '', '', ''
        ];
        
        // Combinar todo
        return [
            titulo,
            subtitulo,
            espacioVacio,
            headers,
            ...filasDatos,
            espacioVacio,
            filaTotales
        ];
    }

    // 5. AGREGAR función para aplicar formato a Excel

    aplicarFormatoExcelVentas(worksheet) {
        // Definir el rango de datos
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        
        // Configurar ancho de columnas
        worksheet['!cols'] = [
            { width: 12 }, // N° Pedido
            { width: 25 }, // Cliente
            { width: 12 }, // Fecha Venta
            { width: 12 }, // Fecha Entrega
            { width: 12 }, // Total
            { width: 15 }, // Opción Pago
            { width: 20 }, // Tipo Pago
            { width: 15 }, // Entrega
            { width: 25 }, // Empleado
            { width: 15 }, // Estado Servicio
            { width: 12 }, // Fecha Parcial
            { width: 10 }  // Saldo
        ];
        
        // Aplicar formato a las celdas
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                
                if (!worksheet[cellAddress]) continue;
                
                // Formato para título (fila 0)
                if (R === 0) {
                    worksheet[cellAddress].s = {
                        font: { bold: true, size: 14, color: { rgb: "FFFFFF" } },
                        fill: { fgColor: { rgb: "366092" } },
                        alignment: { horizontal: "center" }
                    };
                }
                // Formato para subtítulo (fila 1)
                else if (R === 1) {
                    worksheet[cellAddress].s = {
                        font: { bold: true, size: 11 },
                        fill: { fgColor: { rgb: "D9E2F3" } },
                        alignment: { horizontal: "center" }
                    };
                }
                // Formato para encabezados (fila 3)
                else if (R === 3) {
                    worksheet[cellAddress].s = {
                        font: { bold: true, color: { rgb: "FFFFFF" } },
                        fill: { fgColor: { rgb: "4F81BD" } },
                        alignment: { horizontal: "center" },
                        border: {
                            top: { style: "thin" },
                            bottom: { style: "thin" },
                            left: { style: "thin" },
                            right: { style: "thin" }
                        }
                    };
                }
                // Formato para datos
                else if (R > 3 && R < range.e.r) {
                    worksheet[cellAddress].s = {
                        border: {
                            top: { style: "thin" },
                            bottom: { style: "thin" },
                            left: { style: "thin" },
                            right: { style: "thin" }
                        }
                    };
                    
                    // Formato especial para columna de totales (columna 4)
                    if (C === 4) {
                        worksheet[cellAddress].s.numFmt = '"S/ "#,##0.00';
                    }
                }
                // Formato para fila de totales (última fila)
                else if (R === range.e.r) {
                    worksheet[cellAddress].s = {
                        font: { bold: true, color: { rgb: "FFFFFF" } },
                        fill: { fgColor: { rgb: "70AD47" } },
                        border: {
                            top: { style: "thick" },
                            bottom: { style: "thick" },
                            left: { style: "thin" },
                            right: { style: "thin" }
                        }
                    };
                    
                    if (C === 4) {
                        worksheet[cellAddress].s.numFmt = '"S/ "#,##0.00';
                    }
                }
            }
        }
        
        console.log('✅ Formato aplicado al Excel');
    }

    // 6. AGREGAR función auxiliar para formatear fechas

    formatDateForExcel(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-PE');
        } catch (error) {
            return dateString;
        }
    }

    
    // REEMPLAZA la función prepararDatosComprasExcel() para incluir TODAS las columnas

    prepararDatosComprasExcel() {
        // 1. DEFINIR columnas con los nombres REALES de la base de datos
        const todasLasColumnas = [
            { key: 'COM_NUM', header: 'N° Compra', ancho: 12, tipo: 'texto' },
            { key: 'COM_FECHA_COMPRA', header: 'Fecha Compra', ancho: 12, tipo: 'fecha' }, // ✅ CORREGIDO
            { key: 'COM_PROVEEDOR', header: 'Proveedor', ancho: 25, tipo: 'relacion' }, // ✅ CORREGIDO
            { key: 'COM_TOTAL', header: 'Subtotal (S/)', ancho: 12, tipo: 'moneda' },
            { key: 'COM_FLETE', header: 'Flete (S/)', ancho: 12, tipo: 'moneda' },
            { key: 'COM_ADUANAS', header: 'Aduanas (S/)', ancho: 12, tipo: 'moneda' },
            { key: 'COM_TOTAL_FINAL', header: 'Total Final (S/)', ancho: 15, tipo: 'moneda' },
            { key: 'COM_TIPO_PAGO', header: 'Tipo Pago', ancho: 20, tipo: 'relacion' }, // ✅ CORREGIDO
            { key: 'COM_ESTADO_SERVICIO', header: 'Estado', ancho: 15, tipo: 'texto' }, // ✅ CORREGIDO
            { key: 'COM_FECHA_RECEPCION', header: 'Fecha Recepción', ancho: 12, tipo: 'fecha' } // ✅ CORREGIDO
        ];
        
        // Agregar más campos que veo en tu diagnóstico
        const camposAdicionales = [
            { key: 'COM_TIPO_PAGO2', header: 'Tipo Pago 2', ancho: 20, tipo: 'relacion' },
            { key: 'COM_FECHA_PAGO_SALDO', header: 'Fecha Pago Saldo', ancho: 12, tipo: 'fecha' },
            { key: 'COM_SALDO', header: 'Saldo', ancho: 10, tipo: 'moneda' },
            { key: 'COM_OBS', header: 'Observaciones', ancho: 30, tipo: 'texto' }
        ];
        
        // Combinar todas las columnas
        const columnasCompletas = [...todasLasColumnas, ...camposAdicionales];
        
        // 2. VERIFICAR qué columnas realmente tienen datos
        const columnasConDatos = [];
        
        columnasCompletas.forEach(columna => {
            let tieneAlgunDato = false;
            
            // Verificar si AL MENOS UN registro tiene datos en esta columna
            for (let compra of this.comprasFiltradas) {
                const valor = compra[columna.key];
                
                if (columna.tipo === 'moneda') {
                    // Para campos de dinero, verificar que sea un número válido > 0
                    if (valor && !isNaN(parseFloat(valor)) && parseFloat(valor) > 0) {
                        tieneAlgunDato = true;
                        break;
                    }
                } else {
                    // Para otros campos, verificar que no esté vacío
                    if (valor && valor !== '' && valor !== null && valor !== undefined) {
                        tieneAlgunDato = true;
                        break;
                    }
                }
            }
            
            if (tieneAlgunDato) {
                columnasConDatos.push(columna);
                console.log(`✅ ${columna.header}: incluida`);
            } else {
                console.log(`⚠️ ${columna.header}: excluida - sin datos`);
            }
        });
        
        console.log(`✅ Exportando ${columnasConDatos.length} columnas con datos reales:`);
        console.log(columnasConDatos.map(c => c.header).join(', '));
        
        // 3. CONSTRUIR headers
        const headers = columnasConDatos.map(col => col.header);
        
        // 4. TÍTULO Y SUBTÍTULO
        const titulo = [`REPORTE DE COMPRAS - ${new Date().toLocaleDateString('es-PE')}`];
        const subtitulo = [`Total de registros: ${this.comprasFiltradas.length}`];
        const espacioVacio = [''];
        
        // 5. DATOS de las compras
        const filasDatos = this.comprasFiltradas.map(compra => {
            return columnasConDatos.map(col => {
                let valor = compra[col.key];
                
                // Procesar según el tipo de campo
                switch (col.tipo) {
                    case 'relacion':
                        // CORREGIR busqueda de relaciones
                        if (col.key === 'COM_PROVEEDOR') {
                            // Buscar nombre del proveedor usando el ID real
                            const proveedor = this.proveedoresData.find(p => p.id === valor);
                            return proveedor?.PROV_NOM || proveedor?.nombre || valor || 'Sin proveedor';
                        } else if (col.key === 'COM_TIPO_PAGO' || col.key === 'COM_TIPO_PAGO2') {
                            // Buscar tipo de pago usando el ID real
                            const tipoPago = this.tiposPagoData.find(t => t.id === valor);
                            return tipoPago?.TIP_PAG_DESCRIP || tipoPago?.descripcion || valor || 'Sin tipo pago';
                        }
                        return valor || '';
                        
                    case 'fecha':
                        // Formatear fechas
                        return this.formatDateForExcel(valor);
                        
                    case 'moneda':
                        // Formatear números
                        return parseFloat(valor) || 0;
                        
                    case 'texto':
                    default:
                        return valor || '';
                }
            });
        });
        
        // 6. FILA DE TOTALES - Solo para columnas de moneda
        const filaTotales = columnasConDatos.map((col, index) => {
            if (col.tipo === 'moneda') {
                const total = this.comprasFiltradas.reduce((sum, compra) => {
                    return sum + (parseFloat(compra[col.key]) || 0);
                }, 0);
                return total;
            } else if (index === 0) {
                // Mostrar "TOTALES:" en la primera columna
                return 'TOTALES:';
            } else {
                return '';
            }
        });
        
        // 7. GUARDAR configuración de columnas para el formato
        this.columnasComprasExcel = columnasConDatos;
        
        // 8. COMBINAR todo
        return [
            titulo,
            subtitulo,
            espacioVacio,
            headers,
            ...filasDatos,
            espacioVacio,
            filaTotales
        ];
    }

    // FUNCIÓN ADICIONAL: Para forzar la inclusión de TODAS las columnas sin análisis
    prepararDatosComprasExcelCompleto() {
        // Esta versión incluye TODAS las columnas sin analizar si tienen datos
        const todasLasColumnas = [
            { key: 'COM_NUM', header: 'N° Compra', ancho: 12, tipo: 'texto' },
            { key: 'COM_FEC_COMPRA', header: 'Fecha Compra', ancho: 12, tipo: 'fecha' },
            { key: 'COM_PRO_ID', header: 'Proveedor', ancho: 25, tipo: 'relacion' },
            { key: 'COM_TOTAL', header: 'Subtotal (S/)', ancho: 12, tipo: 'moneda' },
            { key: 'COM_FLETE', header: 'Flete (S/)', ancho: 12, tipo: 'moneda' },
            { key: 'COM_ADUANAS', header: 'Aduanas (S/)', ancho: 12, tipo: 'moneda' },
            { key: 'COM_TOTAL_FINAL', header: 'Total Final (S/)', ancho: 15, tipo: 'moneda' },
            { key: 'COM_TIP_PAG_ID', header: 'Tipo Pago', ancho: 20, tipo: 'relacion' },
            { key: 'COM_ESTADO', header: 'Estado', ancho: 15, tipo: 'relacion' },
            { key: 'COM_FEC_RECEPCION', header: 'Fecha Recepción', ancho: 12, tipo: 'fecha' }
        ];
        
        console.log(`✅ Exportando TODAS las columnas (${todasLasColumnas.length}):`);
        console.log(todasLasColumnas.map(c => c.header).join(', '));
        
        const headers = todasLasColumnas.map(col => col.header);
        
        const titulo = [`REPORTE DE COMPRAS COMPLETO - ${new Date().toLocaleDateString('es-PE')}`];
        const subtitulo = [`Total de registros: ${this.comprasFiltradas.length}`];
        const espacioVacio = [''];
        
        const filasDatos = this.comprasFiltradas.map(compra => {
            return todasLasColumnas.map(col => {
                let valor = compra[col.key];
                
                switch (col.tipo) {
                    case 'relacion':
                        if (col.key === 'COM_PRO_ID') {
                            const proveedor = this.proveedoresData.find(p => p.id === valor);
                            return proveedor?.PRO_NOMBRE || proveedor?.nombre || valor || '';
                        } else if (col.key === 'COM_TIP_PAG_ID') {
                            const tipoPago = this.tiposPagoData.find(t => t.id === valor);
                            return tipoPago?.TIP_PAG_DESCRIP || tipoPago?.descripcion || valor || '';
                        } else if (col.key === 'COM_ESTADO') {
                            const estado = this.estadosData.find(e => e.id === valor);
                            return estado?.EST_DESCRIP || estado?.descripcion || valor || '';
                        }
                        return valor || '';
                        
                    case 'fecha':
                        return this.formatDateForExcel(valor);
                        
                    case 'moneda':
                        return parseFloat(valor) || 0;
                        
                    default:
                        return valor || '';
                }
            });
        });
        
        const filaTotales = todasLasColumnas.map((col, index) => {
            if (col.tipo === 'moneda') {
                const total = this.comprasFiltradas.reduce((sum, compra) => {
                    return sum + (parseFloat(compra[col.key]) || 0);
                }, 0);
                return total;
            } else if (index === 0) {
                return 'TOTALES:';
            } else {
                return '';
            }
        });
        
        this.columnasComprasExcel = todasLasColumnas;
        
        return [
            titulo,
            subtitulo,
            espacioVacio,
            headers,
            ...filasDatos,
            espacioVacio,
            filaTotales
        ];
    }

    // FUNCIÓN ALTERNATIVA de exportación que incluye TODAS las columnas
    exportarCompras() {
        if (this.comprasFiltradas.length === 0) {
            window.notificationService.warning('No hay datos para exportar');
            return;
        }

        try {
            console.log('📊 Iniciando exportación COMPLETA de compras a Excel...');
            
            // Usar la función que incluye TODAS las columnas
            const datosParaExcel = this.prepararDatosComprasExcel();
            
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.aoa_to_sheet(datosParaExcel);
            
            this.aplicarFormatoExcelCompras(worksheet);
            
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte de Compras');
            
            const fecha = new Date().toISOString().split('T')[0];
            const nombreArchivo = `reporte_compras_completo_${fecha}.xlsx`;
            
            XLSX.writeFile(workbook, nombreArchivo);
            
            console.log('✅ Archivo Excel COMPLETO de compras exportado exitosamente');
            window.notificationService.success(`Archivo Excel completo descargado: ${nombreArchivo}`);
            
        } catch (error) {
            console.error('❌ Error exportando compras completas a Excel:', error);
            window.notificationService.error('Error al exportar el archivo Excel completo');
        }
    }

    

    obtenerNombreProveedor(proveedor, proveedorId) {
        if (proveedor) {
            return proveedor.PRO_NOMBRE || 
                proveedor.PROV_NOMBRE || 
                proveedor.nombre || 
                proveedor.NOMBRE || 
                proveedor.razon_social ||
                `Proveedor ${proveedorId}`;
        }
        
        return proveedorId ? `Proveedor ID: ${proveedorId}` : 'Sin proveedor';
    }

    obtenerDescripcionEstado(estado, estadoId) {
        if (estado) {
            return estado.EST_DESCRIP || 
                estado.descripcion || 
                estado.DESCRIPCION ||
                estado.nombre ||
                estado.NOMBRE ||
                `Estado ${estadoId}`;
        }
        
        return estadoId ? `Estado ID: ${estadoId}` : 'Sin estado';
    }

    obtenerDescripcionTipoPago(tipoPago, tipoId) {
        if (tipoPago) {
            return tipoPago.TIP_PAG_DESCRIP || 
                tipoPago.descripcion || 
                tipoPago.DESCRIPCION ||
                tipoPago.nombre ||
                tipoPago.NOMBRE ||
                `Tipo ${tipoId}`;
        }
        
        return tipoId ? `Tipo ID: ${tipoId}` : 'Sin tipo pago';
    }

    async debugearEstructuraDatos() {
        console.log('🔍 DEBUGGING ESTRUCTURA DE DATOS');
        console.log('=================================');
        
        // Verificar proveedores
        console.log('📦 PROVEEDORES DISPONIBLES:');
        console.log('Total proveedores:', this.proveedoresData.length);
        if (this.proveedoresData.length > 0) {
            console.log('Ejemplo proveedor:', this.proveedoresData[0]);
            console.log('Campos disponibles:', Object.keys(this.proveedoresData[0]));
        }
        
        // Verificar estados
        console.log('🏷️ ESTADOS DISPONIBLES:');
        console.log('Total estados:', this.estadosData.length);
        if (this.estadosData.length > 0) {
            console.log('Ejemplo estado:', this.estadosData[0]);
            console.log('Campos disponibles:', Object.keys(this.estadosData[0]));
        }
        
        // Verificar tipos de pago
        console.log('💳 TIPOS DE PAGO DISPONIBLES:');
        console.log('Total tipos de pago:', this.tiposPagoData.length);
        if (this.tiposPagoData.length > 0) {
            console.log('Ejemplo tipo pago:', this.tiposPagoData[0]);
            console.log('Campos disponibles:', Object.keys(this.tiposPagoData[0]));
        }
        
        // Verificar compras
        console.log('🛒 COMPRAS FILTRADAS:');
        console.log('Total compras:', this.comprasFiltradas.length);
        if (this.comprasFiltradas.length > 0) {
            console.log('Ejemplo compra:', this.comprasFiltradas[0]);
            console.log('Campos disponibles:', Object.keys(this.comprasFiltradas[0]));
        }
        
        console.log('=================================');
    }

    /***************************************************************** */
    /**************************************************************** */
    /**************************************************************** */

// FUNCIÓN CORREGIDA para evitar duplicación de headers

exportarProductos() {
    console.log('🔄 Intentando exportar desde tabla HTML (sin duplicar headers)...');
    
    const tabla = document.getElementById('productos-table-reports');
    if (!tabla) {
        console.error('❌ No se encontró la tabla productos-table-reports');
        window.notificationService.error('No se encontró la tabla de productos');
        return;
    }
    
    // Obtener headers una sola vez
    let headers = [];
    const headerRow = tabla.querySelector('thead tr');
    if (headerRow) {
        headers = Array.from(headerRow.querySelectorAll('th')).map(th => th.textContent.trim());
        console.log('📋 Headers obtenidos de thead:', headers);
    } else {
        const primeraFilaConTh = tabla.querySelector('tr th');
        if (primeraFilaConTh) {
            const filaHeader = primeraFilaConTh.closest('tr');
            headers = Array.from(filaHeader.querySelectorAll('th')).map(th => th.textContent.trim());
            console.log('📋 Headers obtenidos de primera fila con th:', headers);
        } else {
            headers = ['Producto', 'Stock Actual', 'Cantidad Vendida', 'Valor Ventas', 
                      'Cantidad Comprada', 'Valor Compras', 'Balance', 'Margen Est.', 'Estado'];
            console.log('📋 Headers por defecto aplicados:', headers);
        }
    }
    
    // Buscar SOLO filas de datos (tbody o filas con td)
    let filasDeDatos = []; // CORREGIDO: nombre de variable
    const tbody = tabla.querySelector('tbody');
    
    if (tbody) {
        filasDeDatos = Array.from(tbody.querySelectorAll('tr'));
        console.log(`📊 Filas obtenidas de tbody: ${filasDeDatos.length}`);
    } else {
        const todasLasFilas = tabla.querySelectorAll('tr');
        filasDeDatos = Array.from(todasLasFilas).filter(fila => {
            const tieneTd = fila.querySelector('td') !== null;
            const tieneTh = fila.querySelector('th') !== null;
            return tieneTd && !tieneTh;
        });
        console.log(`📊 Filas con td encontradas: ${filasDeDatos.length}`);
    }
    
    // Filtrar solo filas visibles
    const filasVisibles = filasDeDatos.filter(fila => {
        const estilos = window.getComputedStyle(fila);
        return estilos.display !== 'none' && estilos.visibility !== 'hidden';
    });
    
    console.log(`👁️ Filas visibles después de filtros: ${filasVisibles.length}`);
    
    // Filtrar filas con contenido real
    const filasConDatos = filasVisibles.filter(fila => {
        const texto = fila.textContent.trim().toLowerCase();
        const esFilaVacia = texto.includes('loading') || 
                          texto.includes('cargando') || 
                          texto.includes('no se encontraron') ||
                          texto.includes('sin datos') ||
                          texto === '';
        
        return !esFilaVacia;
    });
    
    console.log(`📋 Filas con datos reales: ${filasConDatos.length}`);
    
    if (filasConDatos.length === 0) {
        window.notificationService.warning('No hay datos reales para exportar. Genere el reporte primero.');
        return;
    }
    
    try {
        const datos = [];
        
        datos.push([`REPORTE COMPARATIVO DE PRODUCTOS - ${new Date().toLocaleDateString('es-PE')}`]);
        datos.push([`Productos exportados: ${filasConDatos.length}`]);
        datos.push([]);
        
        datos.push(headers);
        
        filasConDatos.forEach((fila, index) => {
            const celdas = fila.querySelectorAll('td');
            
            if (celdas.length === 0) {
                console.log(`⚠️ Fila ${index + 1} no tiene celdas td, saltando...`);
                return;
            }
            
            const filaData = Array.from(celdas).map(celda => {
                let texto = celda.textContent.trim();
                
                if (texto.includes('S/')) {
                    const numero = texto.replace('S/', '').replace(/,/g, '').trim();
                    const valorNumerico = parseFloat(numero);
                    if (!isNaN(valorNumerico)) {
                        return valorNumerico;
                    }
                }
                
                const valorNumerico = parseFloat(texto.replace(/,/g, ''));
                if (!isNaN(valorNumerico) && texto !== '' && /^[\d\-\+]/.test(texto)) {
                    return valorNumerico;
                }
                
                return texto;
            });
            
            datos.push(filaData);
        });
        
        console.log(`📊 Datos finales preparados: ${datos.length} filas`);
        
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(datos);
        
        worksheet['!cols'] = headers.map((_, i) => {
            if (i === 0) return { width: 30 };
            return { width: 15 };
        });
        
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte Productos');
        
        const fecha = new Date().toISOString().split('T')[0];
        const nombreArchivo = `reporte_productos_${fecha}.xlsx`;
        
        XLSX.writeFile(workbook, nombreArchivo);
        
        console.log('✅ Exportación exitosa sin duplicados:', nombreArchivo);
        window.notificationService.success(`Archivo exportado: ${nombreArchivo} (${filasConDatos.length} productos)`);
        
    } catch (error) {
        console.error('❌ Error durante la exportación:', error);
        window.notificationService.error('Error al exportar: ' + error.message);
    }
}

prepararDatosProductosComparativosExcel() {
    // Obtener datos procesados del reporte de productos
    const productosData = window.reportesProductos.productosComparativos;
    
    // Headers fijos basados en la tabla de la interfaz
    const headers = [
        'Producto',
        'Stock Actual', 
        'Cantidad Vendida',
        'Valor Ventas (S/)',
        'Cantidad Comprada', 
        'Valor Compras (S/)',
        'Balance',
        'Margen Est. (S/)',
        'Estado'
    ];
    
    // Título y subtítulo
    const fechaDesde = document.getElementById('productos-fecha-desde')?.value || 'N/A';
    const fechaHasta = document.getElementById('productos-fecha-hasta')?.value || 'N/A';
    const tipoAnalisis = document.getElementById('productos-tipo-analisis')?.value || 'completo';
    
    const titulo = [`REPORTE COMPARATIVO DE PRODUCTOS - ${new Date().toLocaleDateString('es-PE')}`];
    const subtitulo = [`Período: ${fechaDesde} a ${fechaHasta} | Tipo: ${tipoAnalisis} | Total productos: ${productosData.length}`];
    const espacioVacio = [''];
    
    // Procesar datos de productos
    const filasDatos = productosData.map(producto => {
        return [
            producto.nombre || producto.PRO_NOM || 'Producto sin nombre',
            parseInt(producto.stockActual) || 0,
            parseInt(producto.cantidadVendida) || 0,
            parseFloat(producto.valorVentas) || 0,
            parseInt(producto.cantidadComprada) || 0,
            parseFloat(producto.valorCompras) || 0,
            parseInt(producto.balance) || 0,
            parseFloat(producto.margenEstimado) || 0,
            this.determinarEstadoProducto(producto)
        ];
    });
    
    // Calcular totales
    const totales = [
        'TOTALES:',
        '', // Stock no se suma
        filasDatos.reduce((sum, fila) => sum + (fila[2] || 0), 0), // Cantidad vendida
        filasDatos.reduce((sum, fila) => sum + (fila[3] || 0), 0), // Valor ventas
        filasDatos.reduce((sum, fila) => sum + (fila[4] || 0), 0), // Cantidad comprada
        filasDatos.reduce((sum, fila) => sum + (fila[5] || 0), 0), // Valor compras
        filasDatos.reduce((sum, fila) => sum + (fila[6] || 0), 0), // Balance
        filasDatos.reduce((sum, fila) => sum + (fila[7] || 0), 0), // Margen
        `${productosData.length} productos`
    ];
    
    // Estadísticas adicionales
    const estadisticas = [
        ['ESTADÍSTICAS DEL PERÍODO:'],
        ['Productos con ventas:', productosData.filter(p => (p.cantidadVendida || 0) > 0).length],
        ['Productos con compras:', productosData.filter(p => (p.cantidadComprada || 0) > 0).length],
        ['Productos sin movimiento:', productosData.filter(p => (p.cantidadVendida || 0) === 0 && (p.cantidadComprada || 0) === 0).length],
        ['Margen total estimado:', `S/ ${totales[7].toFixed(2)}`]
    ];
    
    // Combinar todo
    return [
        titulo,
        subtitulo,
        espacioVacio,
        headers,
        ...filasDatos,
        espacioVacio,
        totales,
        espacioVacio,
        ...estadisticas
    ];
}

determinarEstadoProducto(producto) {
    const vendida = producto.cantidadVendida || 0;
    const comprada = producto.cantidadComprada || 0;
    const stock = producto.stockActual || 0;
    const balance = producto.balance || 0;
    
    if (vendida > 0 && comprada > 0) {
        return 'Activo';
    } else if (vendida > 0) {
        return 'Solo Ventas';
    } else if (comprada > 0) {
        return 'Solo Compras';
    } else if (stock > 0) {
        return 'Stock Sin Movimiento';
    } else {
        return 'Sin Actividad';
    }
}

aplicarFormatoExcelProductosComparativos(worksheet) {
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    
    // Configurar ancho de columnas
    worksheet['!cols'] = [
        { width: 30 }, // Producto
        { width: 12 }, // Stock
        { width: 15 }, // Cant. Vendida
        { width: 15 }, // Valor Ventas
        { width: 15 }, // Cant. Comprada
        { width: 15 }, // Valor Compras
        { width: 12 }, // Balance
        { width: 15 }, // Margen
        { width: 20 }  // Estado
    ];
    
    // Aplicar estilos
    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            
            if (!worksheet[cellAddress]) continue;
            
            // Título (fila 0)
            if (R === 0) {
                worksheet[cellAddress].s = {
                    font: { bold: true, size: 14, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: "9932CC" } }, // Púrpura para productos
                    alignment: { horizontal: "center" }
                };
            }
            // Subtítulo (fila 1)
            else if (R === 1) {
                worksheet[cellAddress].s = {
                    font: { bold: true, size: 11 },
                    fill: { fgColor: { rgb: "E6E6FA" } },
                    alignment: { horizontal: "center" }
                };
            }
            // Headers (fila 3)
            else if (R === 3) {
                worksheet[cellAddress].s = {
                    font: { bold: true, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: "4B0082" } }, // Índigo para headers
                    alignment: { horizontal: "center" },
                    border: {
                        top: { style: "thin" },
                        bottom: { style: "thin" },
                        left: { style: "thin" },
                        right: { style: "thin" }
                    }
                };
            }
            // Datos de productos
            else if (R > 3 && R < range.e.r - 6) { // Excluyendo totales y estadísticas
                worksheet[cellAddress].s = {
                    border: {
                        top: { style: "thin" },
                        bottom: { style: "thin" },
                        left: { style: "thin" },
                        right: { style: "thin" }
                    }
                };
                
                // Formato para columnas de dinero (Valor Ventas, Valor Compras, Margen)
                if (C === 3 || C === 5 || C === 7) {
                    worksheet[cellAddress].s.numFmt = '"S/ "#,##0.00';
                }
                
                // Formato para columnas de cantidad
                if (C === 1 || C === 2 || C === 4 || C === 6) {
                    worksheet[cellAddress].s.numFmt = '#,##0';
                }
            }
            // Fila de totales
            else if (worksheet[cellAddress].v && String(worksheet[cellAddress].v).includes('TOTALES:')) {
                worksheet[cellAddress].s = {
                    font: { bold: true, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: "228B22" } }, // Verde para totales
                    border: {
                        top: { style: "thick" },
                        bottom: { style: "thick" },
                        left: { style: "thin" },
                        right: { style: "thin" }
                    }
                };
                
                if (C === 3 || C === 5 || C === 7) {
                    worksheet[cellAddress].s.numFmt = '"S/ "#,##0.00';
                }
            }
            // Estadísticas
            else if (worksheet[cellAddress].v && String(worksheet[cellAddress].v).includes('ESTADÍSTICAS')) {
                worksheet[cellAddress].s = {
                    font: { bold: true, size: 12, color: { rgb: "000080" } },
                    fill: { fgColor: { rgb: "F0F8FF" } }
                };
            }
        }
    }
    
    console.log('✅ Formato aplicado al Excel de productos comparativos');
}
    /**************************************************************** */
    /**************************************************************** */
    // AGREGAR esta función de diagnóstico en tu reportesManager.js

debugComprasExcel() {
     if (this.comprasFiltradas.length === 0) {
        console.log('❌ No hay datos de compras filtradas para analizar');
        return;
    }
    
    console.log('=== DIAGNÓSTICO COMPRAS (CAMPOS CORREGIDOS) ===');
    console.log(`📊 Total registros: ${this.comprasFiltradas.length}`);
    
    // Definir todas las columnas con nombres REALES
    const columnasReales = {
        numeroCompra: { key: 'COM_NUM', header: 'N° Compra' },
        fechaCompra: { key: 'COM_FECHA_COMPRA', header: 'Fecha Compra' }, // ✅ CORREGIDO
        proveedor: { key: 'COM_PROVEEDOR', header: 'Proveedor' }, // ✅ CORREGIDO
        subtotal: { key: 'COM_TOTAL', header: 'Subtotal (S/)' },
        flete: { key: 'COM_FLETE', header: 'Flete (S/)' },
        aduanas: { key: 'COM_ADUANAS', header: 'Aduanas (S/)' },
        totalFinal: { key: 'COM_TOTAL_FINAL', header: 'Total Final (S/)' },
        tipoPago: { key: 'COM_TIPO_PAGO', header: 'Tipo Pago' }, // ✅ CORREGIDO
        estado: { key: 'COM_ESTADO_SERVICIO', header: 'Estado' }, // ✅ CORREGIDO
        fechaRecepcion: { key: 'COM_FECHA_RECEPCION', header: 'Fecha Recepción' }, // ✅ CORREGIDO
        tipoPago2: { key: 'COM_TIPO_PAGO2', header: 'Tipo Pago 2' }, // ✅ NUEVO
        fechaPagoSaldo: { key: 'COM_FECHA_PAGO_SALDO', header: 'Fecha Pago Saldo' }, // ✅ NUEVO
        saldo: { key: 'COM_SALDO', header: 'Saldo' }, // ✅ NUEVO
        observaciones: { key: 'COM_OBS', header: 'Observaciones' } // ✅ NUEVO
    };
    
    console.log('\n📋 ANÁLISIS POR COLUMNA (CON NOMBRES CORRECTOS):');
    
    const columnasConDatos = [];
    const columnasSinDatos = [];
    
    Object.entries(columnasReales).forEach(([nombre, config]) => {
        let registrosConDatos = 0;
        let ejemplos = [];
        
        this.comprasFiltradas.forEach((compra, index) => {
            const valor = compra[config.key];
            let tieneValor = false;
            
            if (config.key.includes('TOTAL') || config.key.includes('FLETE') || 
                config.key.includes('ADUANAS') || config.key.includes('SALDO')) {
                // Para campos numéricos
                tieneValor = valor && parseFloat(valor) > 0;
            } else {
                // Para otros campos
                tieneValor = valor && valor !== '' && valor !== null && valor !== undefined;
            }
            
            if (tieneValor) {
                registrosConDatos++;
                if (ejemplos.length < 3) {
                    ejemplos.push(valor);
                }
            }
        });
        
        const porcentaje = ((registrosConDatos / this.comprasFiltradas.length) * 100).toFixed(1);
        
        if (registrosConDatos > 0) {
            columnasConDatos.push({
                ...config,
                registrosConDatos,
                porcentaje
            });
            
            console.log(`✅ ${config.header}:`);
            console.log(`   Con datos: ${registrosConDatos}/${this.comprasFiltradas.length} (${porcentaje}%)`);
            if (ejemplos.length > 0) {
                console.log(`   Ejemplos: [${ejemplos.join(', ')}]`);
            }
        } else {
            columnasSinDatos.push(config);
            console.log(`❌ ${config.header}: SIN DATOS (0%)`);
        }
    });
    
    console.log('\n📊 RESUMEN CORREGIDO:');
    console.log(`✅ Columnas que SE INCLUIRÁN: ${columnasConDatos.length}`);
    columnasConDatos.forEach(col => {
        console.log(`   - ${col.header} (${col.porcentaje}%)`);
    });
    
    if (columnasSinDatos.length > 0) {
        console.log(`\n❌ Columnas que SE EXCLUIRÁN: ${columnasSinDatos.length}`);
        columnasSinDatos.forEach(col => {
            console.log(`   - ${col.header}`);
        });
    }
    
    return {
        totalRegistros: this.comprasFiltradas.length,
        columnasConDatos: columnasConDatos.map(c => c.header),
        columnasSinDatos: columnasSinDatos.map(c => c.header)
    };
}

// FUNCIÓN PARA PROBAR LA EXPORTACIÓN SIN DESCARGAR
probarExportacionCompras() {
    console.log('🧪 PROBANDO EXPORTACIÓN DE COMPRAS...');
    
    try {
        const datos = this.prepararDatosComprasExcel();
        
        console.log('✅ Datos preparados exitosamente');
        console.log(`📊 Filas generadas: ${datos.length}`);
        console.log(`📋 Headers: [${datos[3]?.join(', ')}]`);
        console.log('📄 Primera fila de datos:', datos[4]);
        console.log('📄 Última fila (totales):', datos[datos.length - 1]);
        
        return {
            success: true,
            filas: datos.length,
            headers: datos[3],
            primeraFila: datos[4],
            totales: datos[datos.length - 1]
        };
        
    } catch (error) {
        console.error('❌ Error preparando datos:', error);
        return { success: false, error: error.message };
    }
}

// PARA EJECUTAR EN CONSOLA:
// window.reportesManager.debugComprasExcel()      // Ver análisis completo
// window.reportesManager.probarExportacionCompras()  // Probar sin descargar
    /**************************************************************** */
    /**************************************************************** */
    /**************************************************************** */
    /**************************************************************** */


    // 4. AGREGAR función para aplicar formato a Excel de compras

    aplicarFormatoExcelCompras(worksheet) {
        // Definir el rango de datos
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        
        // Configurar ancho de columnas
        worksheet['!cols'] = [
            { width: 12 }, // N° Compra
            { width: 12 }, // Fecha Compra
            { width: 25 }, // Proveedor
            { width: 12 }, // Subtotal
            { width: 10 }, // Flete
            { width: 10 }, // Aduanas
            { width: 12 }, // Total Final
            { width: 15 }, // Tipo Pago
            { width: 15 }, // Estado
            { width: 12 }  // Fecha Recepción
        ];
        
        // Aplicar formato a las celdas
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                
                if (!worksheet[cellAddress]) continue;
                
                // Formato para título (fila 0)
                if (R === 0) {
                    worksheet[cellAddress].s = {
                        font: { bold: true, size: 14, color: { rgb: "FFFFFF" } },
                        fill: { fgColor: { rgb: "D35400" } }, // Naranja para compras
                        alignment: { horizontal: "center" }
                    };
                }
                // Formato para subtítulo (fila 1)
                else if (R === 1) {
                    worksheet[cellAddress].s = {
                        font: { bold: true, size: 11 },
                        fill: { fgColor: { rgb: "F8E6D3" } }, // Naranja claro
                        alignment: { horizontal: "center" }
                    };
                }
                // Formato para encabezados (fila 3)
                else if (R === 3) {
                    worksheet[cellAddress].s = {
                        font: { bold: true, color: { rgb: "FFFFFF" } },
                        fill: { fgColor: { rgb: "E67E22" } }, // Naranja medio para compras
                        alignment: { horizontal: "center" },
                        border: {
                            top: { style: "thin" },
                            bottom: { style: "thin" },
                            left: { style: "thin" },
                            right: { style: "thin" }
                        }
                    };
                }
                // Formato para datos
                else if (R > 3 && R < range.e.r) {
                    worksheet[cellAddress].s = {
                        border: {
                            top: { style: "thin" },
                            bottom: { style: "thin" },
                            left: { style: "thin" },
                            right: { style: "thin" }
                        }
                    };
                    
                    // Formato monetario para columnas de dinero (3, 4, 5, 6)
                    if (C >= 3 && C <= 6) {
                        worksheet[cellAddress].s.numFmt = '"S/ "#,##0.00';
                    }
                }
                // Formato para fila de totales (última fila)
                else if (R === range.e.r) {
                    worksheet[cellAddress].s = {
                        font: { bold: true, color: { rgb: "FFFFFF" } },
                        fill: { fgColor: { rgb: "27AE60" } }, // Verde para totales
                        border: {
                            top: { style: "thick" },
                            bottom: { style: "thick" },
                            left: { style: "thin" },
                            right: { style: "thin" }
                        }
                    };
                    
                    // Formato monetario para totales
                    if (C >= 3 && C <= 6) {
                        worksheet[cellAddress].s.numFmt = '"S/ "#,##0.00';
                    }
                }
            }
        }
        
        console.log('✅ Formato aplicado al Excel de compras');
    }

    formatDateForExcel(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-PE');
        } catch (error) {
            return dateString;
        }
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
        if (tabName === 'reportes-ventas') {
            if (!this.initialized) {
                await this.initialize();
            }
            await this.configurarFiltrosVentas(); // Asegurar que se configuren
            setTimeout(() => this.aplicarFiltrosVentas(), 100);
            
        } else if (tabName === 'reportes-compras') {
            if (!this.initialized) {
                await this.initialize();
            }
            await this.configurarFiltrosCompras(); // Asegurar que se configuren
            setTimeout(() => this.aplicarFiltrosCompras(), 100);
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

    mostrarErrorEnTabla(mensaje) {
        const tbody = document.getElementById('compras-table');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center" style="color: #ef4444; padding: 2rem;">
                        <div style="margin-bottom: 1rem;">
                            <i data-lucide="alert-circle" style<tr>
                    <td>${item.PED_NUM || ''}</td>="width: 48px; height: 48px; color: #ef4444;"></i>
                        </div>
                        <strong>Error:</strong><br>
                        ${mensaje}
                        <br><br>
                        <button onclick="window.reportesManager.aplicarFiltrosCompras()" class="btn btn-primary">
                            <i data-lucide="refresh-cw"></i>
                            Reintentar
                        </button>
                        <button onclick="forzarRecargaCompras()" class="btn btn-secondary" style="margin-left: 0.5rem;">
                            <i data-lucide="download"></i>
                            Recargar Datos
                        </button>
                    </td>
                </tr>
            `;
            
            // Reinicializar iconos de Lucide
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    }

    async actualizarTablaCompras() {
        console.log('🔄 === ACTUALIZANDO TABLA COMPRAS ===');
        
        // FIX 1: Buscar la tabla específicamente en la pestaña de reportes
        const tbody = document.querySelector('#reportes-compras #compras-table') || document.getElementById('compras-table');
        
        if (!tbody) {
            console.error('❌ No se encontró la tabla de compras');
            return;
        }
        
        console.log('📊 Datos para mostrar:', this.comprasFiltradas.length, 'compras');
        
        if (this.comprasFiltradas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="text-center">No se encontraron registros</td></tr>';
            console.log('📝 Tabla vacía mostrada');
            return;
        }

        console.log('🔄 Generando filas de la tabla...');
        
        // FIX 2 y 3: Cargar datos relacionales para mostrar nombres correctos
        let proveedoresMap = {};
        let estadosMap = {};
        
        try {
            // Cargar proveedores
            const proveedores = await window.dataService.getAll('TB_PROVEEDORES');
            proveedores.forEach(proveedor => {
                proveedoresMap[proveedor.id] = proveedor.PROV_NOM || proveedor.nombre || 'Proveedor sin nombre';
            });
            
            // Cargar estados (aunque parece que usas valores directos)
            const estados = await window.dataService.getAll('TB_ESTADO');
            estados.forEach(estado => {
                estadosMap[estado.id] = estado.EST_DESCRIP || estado.descripcion || estado.id;
            });
            
            console.log('✅ Datos relacionales cargados:', {
                proveedores: Object.keys(proveedoresMap).length,
                estados: Object.keys(estadosMap).length
            });
            
        } catch (error) {
            console.warn('⚠️ Error cargando datos relacionales:', error);
        }

        // Generar filas con datos corregidos
        const rows = this.comprasFiltradas.map((compra, index) => {
            // Log para debugging
            if (index < 3) {
                console.log(`   Procesando compra ${index + 1}:`, {
                    COM_NUM: compra.COM_NUM,
                    'Fecha (real)': compra.COM_FECHA_COMPRA,
                    'Proveedor (real)': compra.COM_PROVEEDOR,
                    'Estado (real)': compra.COM_ESTADO_SERVICIO,
                    COM_TOTAL_FINAL: compra.COM_TOTAL_FINAL
                });
            }
            
            // FIX 2: Obtener nombre del proveedor
            const proveedorNombre = proveedoresMap[compra.COM_PROVEEDOR] || 
                                `ID: ${compra.COM_PROVEEDOR}` || 
                                'Sin proveedor';
            
            // FIX 3: Procesar estado - usar COM_ESTADO_SERVICIO directamente
            let estadoTexto = compra.COM_ESTADO_SERVICIO || 'Pendiente';
            let estadoClase = 'badge-yellow'; // Por defecto pendiente
            
            // Normalizar estados
            const estadoLower = estadoTexto.toLowerCase();
            if (estadoLower.includes('terminado') || estadoLower.includes('completo') || estadoLower.includes('finalizado')) {
                estadoTexto = 'Terminado';
                estadoClase = 'badge-green';
            } else {
                estadoTexto = 'Pendiente';
                estadoClase = 'badge-yellow';
            }

            // Generar fila de la tabla
            return `
                <tr>
                    <td><strong>${compra.COM_NUM || 'N/A'}</strong></td>
                    <td>${this.formatDate(compra.COM_FECHA_COMPRA)}</td>
                    <td>${proveedorNombre}</td>
                    <td>S/&nbsp;${this.formatNumber(compra.COM_TOTAL || 0)}</td>
                    <td>S/&nbsp;${this.formatNumber(compra.COM_FLETE || 0)}</td>
                    <td>S/&nbsp;${this.formatNumber(compra.COM_ADUANAS || 0)}</td>
                    <td><strong>S/&nbsp;${this.formatNumber(compra.COM_TOTAL_FINAL || 0)}</strong></td>
                    <td>${this.obtenerTipoPagoTexto(compra)}</td>
                    <td><span class="badge ${estadoClase}">${estadoTexto}</span></td>
                    <td>${this.formatDate(compra.COM_FECHA_RECEPCION)}</td>
                    <td>
                        <button onclick="verDetallesCompra('${compra.COM_NUM}', '${compra.COM_NUM || ''}')" class="btn btn-primary btn-sm" title="Ver Detalles">
                            <i data-lucide="eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        // Actualizar tabla
        tbody.innerHTML = rows.join('');
        
        console.log('✅ Tabla actualizada con', rows.length, 'filas');
        console.log('✅ === ACTUALIZACIÓN DE TABLA COMPLETADA ===');
    }

    // FUNCIÓN AUXILIAR: Obtener texto del tipo de pago
    obtenerTipoPagoTexto(compra) {
        // Buscar en datos de tipos de pago
        let tipoPago1 = '';
        let tipoPago2 = '';
        
        if (compra.COM_TIPO_PAGO) {
            const tipo1 = this.tiposPagoData.find(t => t.id === compra.COM_TIPO_PAGO);
            tipoPago1 = tipo1 ? (tipo1.descripcion || tipo1.TIP_PAG_DESCRIP || compra.COM_TIPO_PAGO) : compra.COM_TIPO_PAGO;
        }
        
        if (compra.COM_TIPO_PAGO2) {
            const tipo2 = this.tiposPagoData.find(t => t.id === compra.COM_TIPO_PAGO2);
            tipoPago2 = tipo2 ? (tipo2.descripcion || tipo2.TIP_PAG_DESCRIP || compra.COM_TIPO_PAGO2) : compra.COM_TIPO_PAGO2;
        }
        
        if (tipoPago1 && tipoPago2) {
            return `${tipoPago1} + ${tipoPago2}`;
        } else if (tipoPago1) {
            return tipoPago1;
        } else {
            return 'N/A';
        }
    }

    // FUNCIÓN AUXILIAR: Formatear números (si no existe ya)
    formatNumber(value, decimals = 2) {
        if (isNaN(value)) return '0.00';
        return Number(value).toLocaleString('es-PE', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    // 5. FUNCIÓN para inicialización forzada
    async inicializarForzado() {
        console.log('🚀 INICIALIZACIÓN FORZADA DE REPORTES MANAGER');
        
        try {
            // Resetear estado
            this.initialized = false;
            this.comprasData = [];
            this.comprasFiltradas = [];
            this.proveedoresData = [];
            this.estadosData = [];
            this.tiposPagoData = [];
            
            // Limpiar cache
            if (window.smartCache) {
                window.smartCache.clear();
            }
            
            // Inicializar
            await this.initialize();
            
            // Aplicar filtros automáticamente
            await this.aplicarFiltrosCompras();
            
            console.log('✅ Inicialización forzada completada');
            
        } catch (error) {
            console.error('❌ Error en inicialización forzada:', error);
            throw error;
        }
    }

    mostrarEstructuraDatos() {
        console.log('🔍 === ANÁLISIS DE ESTRUCTURA DE DATOS ===');
        
        if (this.comprasData && this.comprasData.length > 0) {
            const compra = this.comprasData[0];
            console.log('📄 Campos disponibles en compras:');
            Object.keys(compra).forEach(key => {
                console.log(`   ${key}: ${compra[key]}`);
            });
            
            console.log('\n🔄 Mapeo de campos sugerido:');
            console.log('   Fecha de compra: COM_FECHA_COMPRA o COM_FECHA_PROCESO_INVENTARIO');
            console.log('   Proveedor: COM_PROVEEDOR');
            console.log('   Estado: COM_ESTADO');
            console.log('   Tipo de pago: COM_TIPO_PAGO');
            console.log('   Total final: COM_TOTAL_FINAL');
            console.log('   Fecha recepción: COM_FECHA_RECEPCION');
        }
        
        console.log('===========================================');
    }

    
}


// =====================================================
// DIAGNÓSTICO Y CORRECCIÓN DE TABLA HTML
// El problema es que el JavaScript funciona pero el HTML no se actualiza
// =====================================================

// 1. FUNCIÓN DE DIAGNÓSTICO COMPLETO
function diagnosticarTablaCompras() {
    console.log('🔍 === DIAGNÓSTICO DE TABLA HTML ===');
    
    // Verificar elemento tabla
    const tabla = document.getElementById('compras-table');
    console.log('🔍 Elemento compras-table:', tabla);
    
    if (tabla) {
        console.log('✅ Tabla existe');
        console.log('📊 Contenido actual de la tabla:');
        console.log(tabla.innerHTML);
        console.log('📊 Número de hijos:', tabla.children.length);
        console.log('📊 Estilos aplicados:', window.getComputedStyle(tabla));
        console.log('📊 Elemento padre:', tabla.parentElement);
        console.log('📊 Display style:', tabla.style.display);
        console.log('📊 Visibility:', tabla.style.visibility);
        console.log('📊 Opacity:', tabla.style.opacity);
    } else {
        console.error('❌ Tabla NO existe');
        
        // Buscar elementos similares
        const posiblesTablas = [
            'compras-table', 'compra-table', 'table-compras', 
            'reportes-compras-table', 'compras_table'
        ];
        
        posiblesTablas.forEach(id => {
            const elemento = document.getElementById(id);
            if (elemento) {
                console.log(`💡 Encontrado elemento similar: ${id}`, elemento);
            }
        });
        
        // Buscar por clase
        const tablasPorClase = document.querySelectorAll('tbody');
        console.log('📊 Todos los tbody encontrados:', tablasPorClase);
    }
    
    // Verificar contenedor de reportes
    const contenedorReportes = document.getElementById('reportes-compras');
    console.log('🔍 Contenedor reportes-compras:', contenedorReportes);
    
    if (contenedorReportes) {
        console.log('✅ Contenedor existe');
        console.log('📊 Display:', window.getComputedStyle(contenedorReportes).display);
        console.log('📊 Visibility:', window.getComputedStyle(contenedorReportes).visibility);
        console.log('📊 Clase activa:', contenedorReportes.classList.contains('active'));
    } else {
        console.error('❌ Contenedor reportes-compras NO existe');
    }
    
    // Verificar estructura completa
    console.log('🔍 Estructura de reportes:');
    const reportesSection = document.getElementById('reportes');
    if (reportesSection) {
        console.log('✅ Sección reportes existe');
        const tablaContainer = reportesSection.querySelector('.table-container');
        if (tablaContainer) {
            console.log('✅ Contenedor de tabla existe');
            const tabla = tablaContainer.querySelector('table tbody');
            if (tabla) {
                console.log('✅ tbody existe dentro del contenedor');
                console.log('ID del tbody:', tabla.id);
            }
        }
    }
    
    console.log('=================================');
}

// 2. FUNCIÓN PARA INSERTAR DATOS DE PRUEBA DIRECTAMENTE
function insertarDatosPrueba() {
    console.log('🧪 Insertando datos de prueba...');
    
    const tabla = document.getElementById('compras-table');
    if (!tabla) {
        console.error('❌ No se puede insertar datos - tabla no existe');
        return;
    }
    
    // Insertar HTML de prueba directamente
    tabla.innerHTML = `
        <tr style="background: rgba(255,255,255,0.1);">
            <td><strong>TEST-001</strong></td>
            <td>28/08/2025</td>
            <td>Proveedor Prueba</td>
            <td>S/ 50,000.00</td>
            <td>S/ 500.00</td>
            <td>S/ 1,200.00</td>
            <td><strong>S/ 51,700.00</strong></td>
            <td>Efectivo</td>
            <td><span class="badge badge-green">Completado</span></td>
            <td>31/08/2025</td>
        </tr>
        <tr style="background: rgba(255,255,255,0.1);">
            <td><strong>TEST-002</strong></td>
            <td>29/08/2025</td>
            <td>Otro Proveedor</td>
            <td>S/ 25,000.00</td>
            <td>S/ 300.00</td>
            <td>S/ 800.00</td>
            <td><strong>S/ 26,100.00</strong></td>
            <td>Transferencia</td>
            <td><span class="badge badge-green">Recibido</span></td>
            <td>02/09/2025</td>
        </tr>
    `;
    
    console.log('✅ Datos de prueba insertados');
    
    // Verificar si se ven
    setTimeout(() => {
        console.log('🔍 Verificando visibilidad después de inserción:');
        console.log('Contenido actual:', tabla.innerHTML.substring(0, 200) + '...');
        
        if (tabla.children.length > 0) {
            console.log('✅ Filas creadas correctamente');
            
            // Verificar estilos de las filas
            Array.from(tabla.children).forEach((fila, index) => {
                console.log(`Fila ${index + 1}:`, {
                    display: window.getComputedStyle(fila).display,
                    visibility: window.getComputedStyle(fila).visibility,
                    opacity: window.getComputedStyle(fila).opacity,
                    height: window.getComputedStyle(fila).height
                });
            });
        } else {
            console.error('❌ No se crearon filas');
        }
    }, 100);
}

// 3. FUNCIÓN PARA VERIFICAR VISIBILIDAD DE ELEMENTOS
function verificarVisibilidad() {
    console.log('👁️ === VERIFICANDO VISIBILIDAD ===');
    
    const elementos = [
        'reportes',
        'reportes-compras', 
        'compras-table'
    ];
    
    elementos.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            const estilos = window.getComputedStyle(elemento);
            console.log(`${id}:`, {
                display: estilos.display,
                visibility: estilos.visibility,
                opacity: estilos.opacity,
                position: estilos.position,
                zIndex: estilos.zIndex,
                width: estilos.width,
                height: estilos.height
            });
        } else {
            console.log(`${id}: NO EXISTE`);
        }
    });
    
    console.log('=================================');
}

function aplicarFiltrosVentasConAgrupacion() {
    if (window.reportesManager && window.reportesManager.aplicarFiltrosVentas) {
        window.reportesManager.aplicarFiltrosVentas();
    }
}

// 4. FUNCIÓN MEJORADA PARA ACTUALIZAR TABLA (REEMPLAZAR EN reportesManager.js)
function actualizarTablaComprasMejorada() {
    console.log('🔄 === ACTUALIZANDO TABLA COMPRAS MEJORADA ===');
    
    // Buscar tabla por múltiples métodos
    let tbody = document.getElementById('compras-table');
    
    if (!tbody) {
        console.log('⚠️ compras-table no encontrado, buscando alternativas...');
        
        // Buscar dentro del contenedor de reportes de compras
        const contenedor = document.getElementById('reportes-compras');
        if (contenedor) {
            tbody = contenedor.querySelector('tbody');
            if (tbody) {
                console.log('✅ tbody encontrado dentro del contenedor reportes-compras');
                // Asignar ID si no lo tiene
                if (!tbody.id) {
                    tbody.id = 'compras-table';
                    console.log('✅ ID asignado al tbody');
                }
            }
        }
    }
    
    if (!tbody) {
        console.error('❌ No se pudo encontrar el tbody de la tabla');
        
        // Intentar crear la estructura si no existe
        const contenedor = document.getElementById('reportes-compras');
        if (contenedor) {
            console.log('🔧 Creando estructura de tabla...');
            
            const tablaHTML = `
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>N° Compra</th>
                                <th>Fecha Compra</th>
                                <th>Proveedor</th>
                                <th>Subtotal</th>
                                <th>Flete</th>
                                <th>Aduanas</th>
                                <th>Total Final</th>
                                <th>Tipo Pago</th>
                                <th>Estado</th>
                                <th>Fecha Recepción</th>
                            </tr>
                        </thead>
                        <tbody id="compras-table">
                            <tr><td colspan="10" class="text-center"><div class="loading"></div></td></tr>
                        </tbody>
                    </table>
                </div>
            `;
            
            contenedor.insertAdjacentHTML('beforeend', tablaHTML);
            tbody = document.getElementById('compras-table');
            console.log('✅ Estructura de tabla creada');
        }
    }
    
    if (!tbody) {
        console.error('❌ Elemento tabla sigue sin existir después de todos los intentos');
        return;
    }
    
    console.log('✅ Tabla encontrada, procediendo con actualización...');
    console.log(`📊 Datos para mostrar: ${window.reportesManager?.comprasFiltradas?.length || 0} compras`);
    
    const comprasFiltradas = window.reportesManager?.comprasFiltradas || [];
    
    if (comprasFiltradas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center" style="padding: 3rem; color: rgba(255, 255, 255, 0.7);">
                    <div style="margin-bottom: 1rem;">
                        <strong>No se encontraron registros</strong>
                        <br>
                        <small style="color: #9ca3af;">No hay datos de compras para mostrar</small>
                    </div>
                    <button onclick="insertarDatosPrueba()" class="btn btn-primary">
                        Insertar Datos de Prueba
                    </button>
                </td>
            </tr>
        `;
        return;
    }

    // Generar filas con datos reales
    const manager = window.reportesManager;
    const filas = comprasFiltradas.map((compra, index) => {
        console.log(`   📝 Generando fila ${index + 1} para compra: ${compra.COM_NUM}`);
        
        // Obtener datos relacionados
        const proveedorId = compra.COM_PROVEEDOR;
        const estadoId = compra.COM_ESTADO_SERVICIO || compra.COM_ESTADO;
        const tipoPagoId = compra.COM_TIPO_PAGO;
        
        const proveedor = manager?.proveedoresData?.find(p => p.id === proveedorId);
        const estado = manager?.estadosData?.find(e => e.id === estadoId);
        const tipoPago = manager?.tiposPagoData?.find(t => t.id === tipoPagoId);

        // Obtener fechas y montos
        const fechaCompra = compra.COM_FECHA_COMPRA;
        const fechaRecepcion = compra.COM_FECHA_RECEPCION;
        
        const subtotal = compra.COM_TOTAL || 0;
        const flete = compra.COM_FLETE || 0;
        const aduanas = compra.COM_ADUANAS || 0;
        const totalFinal = compra.COM_TOTAL_FINAL || 0;

        // Formatear valores
        const formatCurrency = manager?.formatCurrency?.bind(manager) || 
                              window.FormatterManager?.formatCurrency || 
                              ((val) => `S/ ${parseFloat(val).toLocaleString('es-PE', {minimumFractionDigits: 2})}`);
        
        const formatDate = manager?.formatDate?.bind(manager) || 
                          window.FormatterManager?.formatDate || 
                          ((date) => date ? new Date(date).toLocaleDateString('es-PE') : '');

        return `
            <tr style="background: rgba(255,255,255,0.05);">
                <td><strong>${compra.COM_NUM || 'N/A'}</strong></td>
                <td>${formatDate(fechaCompra)}</td>
                <td>${proveedor?.PRO_NOMBRE || proveedor?.nombre || `ID: ${proveedorId}` || 'Sin proveedor'}</td>
                <td>${formatCurrency(subtotal)}</td>
                <td>${formatCurrency(flete)}</td>
                <td>${formatCurrency(aduanas)}</td>
                <td><strong style="color: #10b981;">${formatCurrency(totalFinal)}</strong></td>
                <td>${tipoPago?.TIP_PAG_DESCRIP || tipoPago?.descripcion || `ID: ${tipoPagoId}` || 'N/A'}</td>
                <td><span class="badge badge-green">${estado?.EST_DESCRIP || estado?.descripcion || estadoId || 'N/A'}</span></td>
                <td>${formatDate(fechaRecepcion)}</td>
            </tr>
        `;
    });

    // Insertar filas en la tabla
    tbody.innerHTML = filas.join('');
    
    console.log(`✅ Tabla actualizada con ${comprasFiltradas.length} filas`);
    
    // Forzar repaint
    tbody.style.display = 'none';
    tbody.offsetHeight; // Trigger reflow
    tbody.style.display = '';
    
    console.log('✅ === ACTUALIZACIÓN DE TABLA COMPLETADA ===');
    
    // Verificar resultado final
    setTimeout(() => {
        console.log('🔍 Verificación final:');
        console.log('Filas creadas:', tbody.children.length);
        console.log('Primera fila visible:', tbody.children.length > 0 ? 'SÍ' : 'NO');
    }, 100);
}

// 5. EXPORTAR FUNCIONES GLOBALMENTE
window.diagnosticarTablaCompras = diagnosticarTablaCompras;
window.insertarDatosPrueba = insertarDatosPrueba;
window.verificarVisibilidad = verificarVisibilidad;
window.actualizarTablaComprasMejorada = actualizarTablaComprasMejorada;

// 6. FUNCIÓN PARA REEMPLAZAR LA FUNCIÓN ACTUAL EN reportesManager
window.repararTablaCompras = () => {
    console.log('🔧 REPARANDO TABLA DE COMPRAS...');
    
    if (window.reportesManager) {
        // Reemplazar la función actual con la mejorada
        window.reportesManager.actualizarTablaCompras = actualizarTablaComprasMejorada;
        console.log('✅ Función actualizarTablaCompras reemplazada');
        
        // Ejecutar inmediatamente
        actualizarTablaComprasMejorada();
        
    } else {
        console.error('❌ reportesManager no disponible');
    }
};

console.log('🚀 Funciones de diagnóstico cargadas. Ejecuta:');
console.log('   diagnosticarTablaCompras() - Para diagnóstico completo');
console.log('   insertarDatosPrueba() - Para insertar datos de prueba');
console.log('   repararTablaCompras() - Para reparar la tabla');

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

window.forzarRecargaCompras = async () => {
    if (window.reportesManager) {
        try {
            await window.reportesManager.inicializarForzado();
            console.log('Recarga forzada completada');
        } catch (error) {
            console.error('Error en recarga forzada:', error);
        }
    } else {
        console.log('ReportesManager no disponible');
    }
};

window.probarCompras = async () => {
    console.log('🧪 PROBANDO COMPRAS...');
    if (window.reportesManager) {
        await window.reportesManager.aplicarFiltrosCompras();
    } else {
        console.log('ReportesManager no disponible');
    }
};

window.mostrarEstructuraDatos = () => {
    if (window.reportesManager) {
        window.reportesManager.mostrarEstructuraDatos();
    }
};

// 7. AUTO-EJECUTAR al cargar si está en la pestaña de compras
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        // Verificar si estamos en la pestaña de reportes de compras
        const comprasTab = document.getElementById('reportes-compras');
        if (comprasTab && comprasTab.classList.contains('active')) {
            console.log('🔄 Auto-ejecutando filtros de compras...');
            if (window.reportesManager) {
                window.reportesManager.aplicarFiltrosCompras();
            }
        }
    }, 2000);
});

/****************************************************************** */

/****************************************************************** */




/****************************************************************** */

/****************************************************************** */

// 7. VERIFICAR HTML - Asegurar que la tabla existe:
// En el HTML de reportes, verificar que existe este elemento:
/*
<tbody id="compras-table">
    <tr><td colspan="10" class="text-center"><div class="loading"></div></td></tr>
</tbody>
*/

// Crear instancia global
window.reportesManager = new ReportesManager();