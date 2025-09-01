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
            console.log('Cargando datos para reportes...');

            // Usar el dataService existente del proyecto
            this.ventasData = await window.dataService.getAll('tb_pedido');
            this.comprasData = await window.dataService.getAll('TB_COMPRAS');
            this.clientesData = await window.dataService.getAll('clientes');
            this.empleadosData = await window.dataService.getAll('empleados');
            this.proveedoresData = await window.dataService.getAll('TB_PROVEEDORES');
            this.estadosData = await window.dataService.getAll('TB_ESTADO');
            this.tiposPagoData = await window.dataService.getAll('tipos_pago');

            console.log('Datos cargados para reportes:', {
                ventas: this.ventasData.length,
                compras: this.comprasData.length,
                clientes: this.clientesData.length,
                empleados: this.empleadosData.length,
                proveedores: this.proveedoresData.length
            });

        } catch (error) {
            console.error('Error cargando datos para reportes:', error);
        }
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
            const estado = document.getElementById('ventas-estado')?.value;
            const tipoPago = document.getElementById('ventas-tipo-pago')?.value;
            const montoDesde = parseFloat(document.getElementById('ventas-monto-desde')?.value) || 0;
            const montoHasta = parseFloat(document.getElementById('ventas-monto-hasta')?.value) || Infinity;

            this.ventasFiltradas = this.ventasData.filter(venta => {
                let incluir = true;

                // Filtro por fecha
                if (fechaDesde && venta.PED_FEC_VENTA) {
                    const fechaVenta = new Date(venta.PED_FEC_VENTA);
                    if (fechaVenta < new Date(fechaDesde)) incluir = false;
                }

                if (fechaHasta && venta.PED_FEC_VENTA) {
                    const fechaVenta = new Date(venta.PED_FEC_VENTA);
                    if (fechaVenta > new Date(fechaHasta)) incluir = false;
                }

                // Filtro por cliente
                if (cliente && venta.PED_CLI_ID !== cliente) incluir = false;

                // Filtro por empleado
                if (empleado && venta.PED_EMP_DNI !== empleado) incluir = false;

                // Filtro por estado
                if (estado && venta.PED_EST_SER !== estado) incluir = false;

                // Filtro por tipo de pago
                if (tipoPago && venta.PED_TIP_PAG_ID !== tipoPago) incluir = false;

                // Filtro por monto
                const total = parseFloat(venta.PED_TOTAL) || 0;
                if (total < montoDesde || total > montoHasta) incluir = false;

                return incluir;
            });

            this.actualizarTablaVentas();
            this.actualizarEstadisticasVentas();
            this.actualizarGraficoVentas();

        } catch (error) {
            console.error('Error aplicando filtros de ventas:', error);
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

            this.actualizarTablaCompras();
            this.actualizarEstadisticasCompras();
            this.actualizarGraficoCompras();

        } catch (error) {
            console.error('Error aplicando filtros de compras:', error);
        }
    }

    actualizarTablaVentas() {
        const tbody = document.getElementById('ventas-table');
        if (!tbody) return;
        
        if (this.ventasFiltradas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">No se encontraron registros</td></tr>';
            return;
        }

        tbody.innerHTML = this.ventasFiltradas.map(venta => {
            const cliente = this.clientesData.find(c => c.id === venta.PED_CLI_ID);
            const empleado = this.empleadosData.find(e => e.id === venta.PED_EMP_DNI);
            const estado = this.estadosData.find(e => e.id === venta.PED_EST_SER);
            const tipoPago = this.tiposPagoData.find(t => t.id === venta.PED_TIP_PAG_ID);

            return `
                <tr>
                    <td>${venta.PED_NUM || 'N/A'}</td>
                    <td>${window.FormatterManager?.formatDate(venta.PED_FEC_VENTA) || this.formatDate(venta.PED_FEC_VENTA)}</td>
                    <td>${cliente?.CLI_NOMBRE || cliente?.nombre || 'Cliente no encontrado'}</td>
                    <td>${empleado ? `${empleado.EMP_NOMBRE || empleado.nombre || ''} ${empleado.EMP_APELLIDO || empleado.apellido || ''}`.trim() : 'Empleado no encontrado'}</td>
                    <td>${window.FormatterManager?.formatCurrency(venta.PED_TOTAL) || this.formatCurrency(venta.PED_TOTAL)}</td>
                    <td>${tipoPago?.TIP_PAG_DESCRIP || tipoPago?.descripcion || 'N/A'}</td>
                    <td><span class="badge badge-blue">${estado?.EST_DESCRIP || estado?.descripcion || 'N/A'}</span></td>
                    <td>${window.FormatterManager?.formatDate(venta.PED_FEC_ENTREGA) || this.formatDate(venta.PED_FEC_ENTREGA)}</td>
                </tr>
            `;
        }).join('');
    }

    actualizarTablaCompras() {
        const tbody = document.getElementById('compras-table');
        if (!tbody) return;
        
        if (this.comprasFiltradas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="text-center">No se encontraron registros</td></tr>';
            return;
        }

        tbody.innerHTML = this.comprasFiltradas.map(compra => {
            const proveedor = this.proveedoresData.find(p => p.id === compra.COM_PRO_ID);
            const estado = this.estadosData.find(e => e.id === compra.COM_ESTADO);
            const tipoPago = this.tiposPagoData.find(t => t.id === compra.COM_TIP_PAG_ID);

            return `
                <tr>
                    <td>${compra.COM_NUM || 'N/A'}</td>
                    <td>${window.FormatterManager?.formatDate(compra.COM_FEC_COMPRA) || this.formatDate(compra.COM_FEC_COMPRA)}</td>
                    <td>${proveedor?.PRO_NOMBRE || proveedor?.nombre || 'Proveedor no encontrado'}</td>
                    <td>${window.FormatterManager?.formatCurrency(compra.COM_TOTAL) || this.formatCurrency(compra.COM_TOTAL)}</td>
                    <td>${window.FormatterManager?.formatCurrency(compra.COM_FLETE) || this.formatCurrency(compra.COM_FLETE)}</td>
                    <td>${window.FormatterManager?.formatCurrency(compra.COM_ADUANAS) || this.formatCurrency(compra.COM_ADUANAS)}</td>
                    <td><strong>${window.FormatterManager?.formatCurrency(compra.COM_TOTAL_FINAL) || this.formatCurrency(compra.COM_TOTAL_FINAL)}</strong></td>
                    <td>${tipoPago?.TIP_PAG_DESCRIP || tipoPago?.descripcion || 'N/A'}</td>
                    <td><span class="badge badge-green">${estado?.EST_DESCRIP || estado?.descripcion || 'N/A'}</span></td>
                    <td>${window.FormatterManager?.formatDate(compra.COM_FEC_RECEPCION) || this.formatDate(compra.COM_FEC_RECEPCION)}</td>
                </tr>
            `;
        }).join('');
    }

    actualizarEstadisticasVentas() {
        const totalRegistros = this.ventasFiltradas.length;
        const montoTotal = this.ventasFiltradas.reduce((sum, venta) => sum + (parseFloat(venta.PED_TOTAL) || 0), 0);
        const promedio = totalRegistros > 0 ? montoTotal / totalRegistros : 0;
        const pendientes = this.ventasFiltradas.filter(venta => {
            const estado = this.estadosData.find(e => e.id === venta.PED_EST_SER);
            return estado?.EST_DESCRIP?.toLowerCase().includes('pendiente') || false;
        }).length;

        const totalRegistrosEl = document.getElementById('ventas-total-registros');
        const montoTotalEl = document.getElementById('ventas-monto-total');
        const promedioEl = document.getElementById('ventas-promedio');
        const pendientesEl = document.getElementById('ventas-pendientes');

        if (totalRegistrosEl) totalRegistrosEl.textContent = totalRegistros;
        if (montoTotalEl) montoTotalEl.textContent = window.FormatterManager?.formatCurrency(montoTotal) || this.formatCurrency(montoTotal);
        if (promedioEl) promedioEl.textContent = window.FormatterManager?.formatCurrency(promedio) || this.formatCurrency(promedio);
        if (pendientesEl) pendientesEl.textContent = pendientes;
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

        // Agrupar ventas por mes
        const ventasPorMes = {};
        this.ventasFiltradas.forEach(venta => {
            if (venta.PED_FEC_VENTA) {
                const fecha = new Date(venta.PED_FEC_VENTA);
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
            'ventas-fecha-desde', 'ventas-fecha-hasta', 'ventas-cliente',
            'ventas-empleado', 'ventas-estado', 'ventas-tipo-pago',
            'ventas-monto-desde', 'ventas-monto-hasta'
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

    // Método para manejar cambio de tab
    async onTabChange(tabName) {
        if (tabName === 'reportes-ventas' || tabName === 'reportes-compras') {
            if (!this.initialized) {
                await this.initialize();
            }
            
            if (tabName === 'reportes-ventas') {
                setTimeout(() => this.aplicarFiltrosVentas(), 100);
            } else {
                setTimeout(() => this.aplicarFiltrosCompras(), 100);
            }
        }
    }
}

// Crear instancia global
window.reportesManager = new ReportesManager();