// ========================================
// ACTUALIZACIÓN: js/components/reportesProductos.js
// Usando el campo "Agrupar por" existente para filtros granulares
// ========================================

class ReportesProductos {
    constructor() {
        this.productosData = [];
        this.ventasData = [];
        this.comprasData = [];
        this.pedidosDetalleData = [];
        this.comprasDetalleData = [];
        
        this.productosFiltrados = [];
        this.initialized = false;
        
        this.ventasChart = null;
        this.comprasChart = null;

        // Cache de períodos disponibles según agrupación
        this.periodosDisponibles = {
            año: new Set(),
            mes: new Set(),
            semana: new Set(),
            dia: new Set()
        };
    }

    async initialize() {
        if (this.initialized) return;
        
        try {
            console.log('🏭 Inicializando ReportesProductos...');
            
            // Cargar Chart.js si no está disponible
            if (typeof Chart === 'undefined') {
                await this.loadChartJS();
            }
            
            await this.cargarDatos();
            await this.configurarFiltros();
            
            this.initialized = true;
            console.log('✅ ReportesProductos inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando ReportesProductos:', error);
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
            console.log('📊 Cargando datos de productos...');

            // Cargar datos principales
            this.productosData = await window.dataService.getAll('tb_productos');
            this.ventasData = await window.dataService.getAll('tb_pedido');
            this.comprasData = await window.dataService.getAll('TB_COMPRAS');
            
            // Cargar detalles
            this.pedidosDetalleData = await window.dataService.getAll('tb_pedidos_detalle');
            this.comprasDetalleData = await window.dataService.getAll('TB_COMPRA_DETALLE');

            console.log('✅ Datos cargados:', {
                productos: this.productosData.length,
                ventas: this.ventasData.length,
                compras: this.comprasData.length,
                detallesVentas: this.pedidosDetalleData.length,
                detallesCompras: this.comprasDetalleData.length
            });

            // Extraer períodos disponibles para todos los tipos de agrupación
            this.extraerPeriodosDisponibles();

        } catch (error) {
            console.error('❌ Error cargando datos:', error);
            throw error;
        }
    }

    // NUEVA FUNCIÓN: Extraer períodos disponibles según tipo de agrupación
    extraerPeriodosDisponibles() {
        console.log('📅 Extrayendo períodos disponibles...');
        
        // Procesar fechas de ventas
        this.ventasData.forEach(venta => {
            if (venta.PED_FECHA_VENTA) {
                const fecha = new Date(venta.PED_FECHA_VENTA);
                this.agregarPeriodos(fecha);
            }
        });

        // Procesar fechas de compras
        this.comprasData.forEach(compra => {
            if (compra.COM_FECHA_COMPRA) {
                const fecha = new Date(compra.COM_FECHA_COMPRA);
                this.agregarPeriodos(fecha);
            }
        });

        console.log('✅ Períodos extraídos:', {
            años: Array.from(this.periodosDisponibles.año).sort(),
            meses: Array.from(this.periodosDisponibles.mes).sort().slice(0, 5) + '...',
            dias: this.periodosDisponibles.dia.size,
            semanas: this.periodosDisponibles.semana.size
        });
    }

    agregarPeriodos(fecha) {
        if (!fecha || isNaN(fecha.getTime())) return;

        // Año
        this.periodosDisponibles.año.add(fecha.getFullYear());

        // Mes (formato YYYY-MM)
        const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
        this.periodosDisponibles.mes.add(mes);

        // Día (formato YYYY-MM-DD)
        const dia = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
        this.periodosDisponibles.dia.add(dia);

        // Semana (formato YYYY-WW)
        const semana = this.obtenerSemanaDelAno(fecha);
        this.periodosDisponibles.semana.add(`${fecha.getFullYear()}-W${String(semana).padStart(2, '0')}`);
    }

    obtenerSemanaDelAno(fecha) {
        const primerDiaAno = new Date(fecha.getFullYear(), 0, 1);
        const diasTranscurridos = Math.floor((fecha - primerDiaAno) / (24 * 60 * 60 * 1000));
        return Math.ceil((diasTranscurridos + primerDiaAno.getDay() + 1) / 7);
    }

    async configurarFiltros() {
        try {
            // Configurar dropdown de productos (mantener funcionalidad existente)
            const productoSelect = document.getElementById('productos-filtro-producto');
            if (productoSelect) {
                productoSelect.innerHTML = '<option value="">Todos los productos</option>';
                
                this.productosData.forEach(producto => {
                    const option = document.createElement('option');
                    option.value = producto.id;
                    option.textContent = `${producto.PRO_NOMBRE} (Stock: ${producto.PRO_CANTIDAD || 0})`;
                    productoSelect.appendChild(option);
                });

                console.log(`✅ ${this.productosData.length} productos agregados al filtro`);
            }

        } catch (error) {
            console.error('❌ Error configurando filtros:', error);
        }
    }

    // FUNCIÓN MEJORADA: Construir rango de fechas usando agrupación seleccionada
    construirRangoFechas() {
        const fechaDesdeInput = document.getElementById('productos-fecha-desde')?.value;
        const fechaHastaInput = document.getElementById('productos-fecha-hasta')?.value;
        const agrupacion = document.getElementById('productos-agrupacion')?.value || 'mes';

        let fechaDesde = null;
        let fechaHasta = null;

        // Si hay fechas específicas, usarlas directamente
        if (fechaDesdeInput) {
            fechaDesde = new Date(fechaDesdeInput + 'T00:00:00');
        }
        if (fechaHastaInput) {
            fechaHasta = new Date(fechaHastaInput + 'T23:59:59');
        }

        // Si no hay fechas específicas, usar agrupación para determinar período por defecto
        if (!fechaDesde && !fechaHasta) {
            const ahora = new Date();
            
            switch (agrupacion) {
                case 'año':
                    // Año actual completo
                    fechaDesde = new Date(ahora.getFullYear(), 0, 1, 0, 0, 0);
                    fechaHasta = new Date(ahora.getFullYear(), 11, 31, 23, 59, 59);
                    break;
                case 'mes':
                    // Mes actual completo
                    fechaDesde = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0);
                    fechaHasta = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59);
                    break;
                case 'semana':
                    // Semana actual
                    const inicioSemana = new Date(ahora);
                    inicioSemana.setDate(ahora.getDate() - ahora.getDay());
                    inicioSemana.setHours(0, 0, 0, 0);
                    
                    const finSemana = new Date(inicioSemana);
                    finSemana.setDate(inicioSemana.getDate() + 6);
                    finSemana.setHours(23, 59, 59, 999);
                    
                    fechaDesde = inicioSemana;
                    fechaHasta = finSemana;
                    break;
                case 'dia':
                    // Día actual
                    fechaDesde = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0);
                    fechaHasta = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59);
                    break;
                default:
                    // Sin filtro temporal por defecto
                    break;
            }
        }

        console.log('📅 Rango de fechas construido:', {
            agrupacion,
            fechaDesdeInput,
            fechaHastaInput,
            fechaDesde: fechaDesde?.toISOString(),
            fechaHasta: fechaHasta?.toISOString()
        });

        return { fechaDesde, fechaHasta, agrupacion };
    }

    async aplicarFiltros() {
        try {
            console.log('🔄 Aplicando filtros de productos...');

            if (!this.initialized) {
                await this.initialize();
            }

            // Usar la función mejorada de construcción de fechas
            const { fechaDesde, fechaHasta, agrupacion } = this.construirRangoFechas();

            // Obtener otros filtros (mantener lógica existente)
            const productoFiltro = document.getElementById('productos-filtro-producto')?.value;
            const tipoAnalisis = document.getElementById('productos-tipo-analisis')?.value || 'completo';
            const cantidadMinima = parseInt(document.getElementById('productos-cantidad-minima')?.value) || 0;

            console.log('Filtros aplicados:', { 
                fechaDesde: fechaDesde?.toDateString(), 
                fechaHasta: fechaHasta?.toDateString(), 
                agrupacion,
                productoFiltro, 
                tipoAnalisis, 
                cantidadMinima 
            });

            // Procesar datos con fechas y agrupación
            const analisisProductos = await this.analizarProductos(fechaDesde, fechaHasta, productoFiltro, cantidadMinima);

            // Filtrar según tipo de análisis
            this.productosFiltrados = this.filtrarPorTipoAnalisis(analisisProductos, tipoAnalisis);

            // Actualizar interfaz
            this.actualizarTabla();
            this.actualizarEstadisticas();
            this.actualizarGraficos();
            this.mostrarAnalisisDetallado();

            console.log('✅ Filtros aplicados exitosamente');

        } catch (error) {
            console.error('❌ Error aplicando filtros:', error);
            window.notificationService.error('Error al generar el reporte');
        }
    }

    async analizarProductos(fechaDesde, fechaHasta, productoFiltro, cantidadMinima) {
        const analisis = {};

        // Inicializar análisis para cada producto
        this.productosData.forEach(producto => {
            if (productoFiltro && producto.id !== productoFiltro) return;

            analisis[producto.id] = {
                id: producto.id,
                nombre: producto.PRO_NOMBRE || 'Sin nombre',
                stockActual: parseFloat(producto.PRO_CANTIDAD) || 0,
                precioVenta: parseFloat(producto.PRO_PRECIO) || 0,
                
                // Ventas
                cantidadVendida: 0,
                valorVentas: 0,
                numeroVentas: 0,
                
                // Compras
                cantidadComprada: 0,
                valorCompras: 0,
                numeroCompras: 0,
                
                // Análisis
                balance: 0,
                margenEstimado: 0,
                rotacion: 0,
                estado: 'Normal'
            };
        });

        // Analizar ventas
        for (const detalle of this.pedidosDetalleData) {
            if (!analisis[detalle.PED_DET_ID]) continue;

            // Verificar fechas
            const venta = this.ventasData.find(v => v.PED_NUM === detalle.PED_DET_NUM);
            if (fechaDesde || fechaHasta) {
                if (!venta || !venta.PED_FECHA_VENTA) continue;
                
                const fechaVenta = new Date(venta.PED_FECHA_VENTA);
                
                if (fechaDesde && fechaVenta < fechaDesde) continue;
                if (fechaHasta && fechaVenta > fechaHasta) continue;
            }

            const cantidad = parseFloat(detalle.PED_DET_CANTIDAD) || 0;
            const precio = parseFloat(detalle.PED_DET_PRECIO) || 0;

            analisis[detalle.PED_DET_ID].cantidadVendida += cantidad;
            analisis[detalle.PED_DET_ID].valorVentas += cantidad * precio;
            analisis[detalle.PED_DET_ID].numeroVentas += 1;
        }

        // Analizar compras
        for (const detalle of this.comprasDetalleData) {
            if (!analisis[detalle.COM_DET_PRODUCTO]) continue;

            // Verificar fechas
            const compra = this.comprasData.find(c => c.COM_NUM === detalle.COM_DET_NUM);
            if (fechaDesde || fechaHasta) {
                if (!compra || !compra.COM_FECHA_COMPRA) continue;
                
                const fechaCompra = new Date(compra.COM_FECHA_COMPRA);
                
                if (fechaDesde && fechaCompra < fechaDesde) continue;
                if (fechaHasta && fechaCompra > fechaHasta) continue;
            }

            const cantidad = parseFloat(detalle.COM_DET_CANTIDAD) || 0;
            const precio = parseFloat(detalle.COM_DET_PRECIO) || 0;

            analisis[detalle.COM_DET_PRODUCTO].cantidadComprada += cantidad;
            analisis[detalle.COM_DET_PRODUCTO].valorCompras += cantidad * precio;
            analisis[detalle.COM_DET_PRODUCTO].numeroCompras += 1;
        }

        // Calcular métricas adicionales
        Object.values(analisis).forEach(producto => {
            // Balance (comprado - vendido)
            producto.balance = producto.cantidadComprada - producto.cantidadVendida;
            
            // Margen estimado (ventas - compras)
            producto.margenEstimado = producto.valorVentas - producto.valorCompras;
            
            // Rotación (veces que se ha vendido vs stock)
            producto.rotacion = producto.stockActual > 0 ? 
                (producto.cantidadVendida / producto.stockActual) : 0;
            
            // Determinar estado
            if (producto.stockActual <= 5 && producto.cantidadVendida > 0) {
                producto.estado = 'Stock Crítico';
            } else if (producto.cantidadVendida === 0 && producto.stockActual > 20) {
                producto.estado = 'Sin Movimiento';
            } else if (producto.rotacion > 2) {
                producto.estado = 'Alta Rotación';
            } else if (producto.cantidadVendida > 0 || producto.cantidadComprada > 0) {
                producto.estado = 'Activo';
            }
            
            // Filtrar por cantidad mínima
            if (producto.cantidadVendida < cantidadMinima && producto.cantidadComprada < cantidadMinima) {
                delete analisis[producto.id];
            }
        });

        return Object.values(analisis);
    }

    // NUEVA FUNCIÓN: Actualizar gráficos según agrupación seleccionada
    actualizarGraficoProductos() {
        console.log('📊 Actualizando gráficos según agrupación...');
        const agrupacion = document.getElementById('productos-agrupacion')?.value || 'mes';
        console.log('🔄 Agrupación seleccionada:', agrupacion);
        this.actualizarGraficos();
        if (window.notificationService) {
            window.notificationService.info(`Gráficos actualizados: ${agrupacion}`);
        }
    }

    filtrarPorTipoAnalisis(productos, tipo) {
        switch (tipo) {
            case 'solo-ventas':
                return productos.filter(p => p.cantidadVendida > 0);
            case 'solo-compras':
                return productos.filter(p => p.cantidadComprada > 0);
            case 'mas-vendidos':
                return productos.filter(p => p.cantidadVendida > 0)
                               .sort((a, b) => b.cantidadVendida - a.cantidadVendida)
                               .slice(0, 20);
            case 'mas-comprados':
                return productos.filter(p => p.cantidadComprada > 0)
                               .sort((a, b) => b.cantidadComprada - a.cantidadComprada)
                               .slice(0, 20);
            case 'completo':
            default:
                return productos.sort((a, b) => (b.valorVentas + b.valorCompras) - (a.valorVentas + a.valorCompras));
        }
    }

    actualizarTabla() {
        const tbody = document.getElementById('productos-table-reports');
        if (!tbody) return;

        if (this.productosFiltrados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center">No hay productos que mostrar</td></tr>';
            return;
        }

        tbody.innerHTML = this.productosFiltrados.map(producto => {
            const estadoClase = this.getEstadoClase(producto.estado);
            const balanceClase = producto.balance >= 0 ? 'text-green' : 'text-red';
            const margenClase = producto.margenEstimado >= 0 ? 'text-green' : 'text-red';

            return `
                <tr>
                    <td><strong>${producto.nombre}</strong></td>
                    <td>${producto.stockActual}</td>
                    <td>${producto.cantidadVendida}</td>
                    <td>S/ ${this.formatNumber(producto.valorVentas)}</td>
                    <td>${producto.cantidadComprada}</td>
                    <td>S/ ${this.formatNumber(producto.valorCompras)}</td>
                    <td class="${balanceClase}">${producto.balance > 0 ? '+' : ''}${producto.balance}</td>
                    <td class="${margenClase}">S/ ${this.formatNumber(producto.margenEstimado)}</td>
                    <td><span class="badge ${estadoClase}">${producto.estado}</span></td>
                </tr>
            `;
        }).join('');
    }

    actualizarEstadisticas() {
        const totalAnalizados = this.productosFiltrados.length;
        const totalVendidos = this.productosFiltrados.reduce((sum, p) => sum + p.cantidadVendida, 0);
        const totalComprados = this.productosFiltrados.reduce((sum, p) => sum + p.cantidadComprada, 0);
        const valorVentas = this.productosFiltrados.reduce((sum, p) => sum + p.valorVentas, 0);
        const valorCompras = this.productosFiltrados.reduce((sum, p) => sum + p.valorCompras, 0);
        const margenTotal = valorVentas - valorCompras;

        document.getElementById('productos-total-analizados').textContent = totalAnalizados;
        document.getElementById('productos-total-vendidos').textContent = totalVendidos;
        document.getElementById('productos-total-comprados').textContent = totalComprados;
        document.getElementById('productos-valor-ventas').textContent = `S/ ${this.formatNumber(valorVentas)}`;
        document.getElementById('productos-valor-compras').textContent = `S/ ${this.formatNumber(valorCompras)}`;
        document.getElementById('productos-margen').textContent = `S/ ${this.formatNumber(margenTotal)}`;
    }

    actualizarGraficos() {
        this.crearGraficoVentas();
        this.crearGraficoCompras();
    }

    crearGraficoVentas() {
        const ctx = document.getElementById('ventasProductosChart')?.getContext('2d');
        if (!ctx) return;

        if (this.ventasChart) {
            this.ventasChart.destroy();
        }

        const topVentas = this.productosFiltrados
            .filter(p => p.cantidadVendida > 0)
            .sort((a, b) => b.cantidadVendida - a.cantidadVendida)
            .slice(0, 10);

        this.ventasChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topVentas.map(p => p.nombre.length > 15 ? p.nombre.substring(0, 15) + '...' : p.nombre),
                datasets: [{
                    label: 'Cantidad Vendida',
                    data: topVentas.map(p => p.cantidadVendida),
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: 'rgb(16, 185, 129)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: { color: 'white' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: 'white' }
                    },
                    x: {
                        ticks: { 
                            color: 'white',
                            maxRotation: 45
                        }
                    }
                }
            }
        });
    }

    crearGraficoCompras() {
        const ctx = document.getElementById('comprasProductosChart')?.getContext('2d');
        if (!ctx) return;

        if (this.comprasChart) {
            this.comprasChart.destroy();
        }

        const topCompras = this.productosFiltrados
            .filter(p => p.cantidadComprada > 0)
            .sort((a, b) => b.cantidadComprada - a.cantidadComprada)
            .slice(0, 10);

        this.comprasChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topCompras.map(p => p.nombre.length > 15 ? p.nombre.substring(0, 15) + '...' : p.nombre),
                datasets: [{
                    label: 'Cantidad Comprada',
                    data: topCompras.map(p => p.cantidadComprada),
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    borderColor: 'rgb(239, 68, 68)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: { color: 'white' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: 'white' }
                    },
                    x: {
                        ticks: { 
                            color: 'white',
                            maxRotation: 45
                        }
                    }
                }
            }
        });
    }

    mostrarAnalisisDetallado() {
        const section = document.getElementById('productos-analisis-detallado');
        if (!section) return;

        // Productos con mayor rotación
        const mayorRotacion = this.productosFiltrados
            .filter(p => p.rotacion > 0)
            .sort((a, b) => b.rotacion - a.rotacion)
            .slice(0, 5);

        // Productos con stock crítico
        const stockCritico = this.productosFiltrados
            .filter(p => p.estado === 'Stock Crítico')
            .slice(0, 5);

        // Oportunidades de compra
        const oportunidades = this.productosFiltrados
            .filter(p => p.cantidadVendida > 0 && p.stockActual < p.cantidadVendida)
            .sort((a, b) => (b.cantidadVendida - b.stockActual) - (a.cantidadVendida - a.stockActual))
            .slice(0, 5);

        // HTML para mayor rotación
        const htmlMayorRotacion = mayorRotacion.length > 0 
            ? mayorRotacion.map(p => `
                <div>
                    <strong>${p.nombre}</strong><br>
                    <span style="color: #10b981;">Rotación: ${p.rotacion.toFixed(2)}x</span><br>
                    <small style="color: rgba(255,255,255,0.7);">
                        Vendido: ${p.cantidadVendida} | Stock: ${p.stockActual}
                    </small>
                </div>
            `).join('')
            : '<div style="text-align: center; color: rgba(255,255,255,0.6); font-style: italic;">Sin datos suficientes</div>';

        // HTML para stock crítico
        const htmlStockCritico = stockCritico.length > 0
            ? stockCritico.map(p => `
                <div>
                    <strong>${p.nombre}</strong><br>
                    <span style="color: #ef4444;">Stock: ${p.stockActual} unidades</span><br>
                    <small style="color: rgba(255,255,255,0.7);">
                        Vendido: ${p.cantidadVendida} | Necesario: Reabastecer
                    </small>
                </div>
            `).join('')
            : '<div style="text-align: center; color: rgba(255,255,255,0.6); font-style: italic;">No hay productos con stock crítico</div>';

        // HTML para oportunidades
        const htmlOportunidades = oportunidades.length > 0
            ? oportunidades.map(p => {
                const cantidadSugerida = Math.max(p.cantidadVendida - p.stockActual, p.cantidadVendida * 0.5);
                return `
                <div>
                    <strong>${p.nombre}</strong><br>
                    <span style="color: #f59e0b;">Comprar: ${Math.ceil(cantidadSugerida)} unidades</span><br>
                    <small style="color: rgba(255,255,255,0.7);">
                        Stock: ${p.stockActual} | Demanda: ${p.cantidadVendida}
                    </small>
                </div>
                `;
            }).join('')
            : '<div style="text-align: center; color: rgba(255,255,255,0.6); font-style: italic;">No se identificaron oportunidades</div>';

        // Actualizar contenido
        document.getElementById('productos-mayor-rotacion').innerHTML = htmlMayorRotacion;
        document.getElementById('productos-stock-critico').innerHTML = htmlStockCritico;
        document.getElementById('productos-oportunidades').innerHTML = htmlOportunidades;

        // Mostrar la sección
        section.style.display = 'block';
    }

    limpiarFiltros() {
        const elementos = [
            'productos-fecha-desde',
            'productos-fecha-hasta',
            'productos-filtro-producto',
            'productos-tipo-analisis',
            'productos-cantidad-minima'
        ];

        elementos.forEach(id => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.value = '';
            }
        });

        // Resetear agrupación a mes por defecto
        const agrupacion = document.getElementById('productos-agrupacion');
        if (agrupacion) {
            agrupacion.value = 'mes';
        }

        // Resetear tipo de análisis
        const tipoAnalisis = document.getElementById('productos-tipo-analisis');
        if (tipoAnalisis) {
            tipoAnalisis.value = 'completo';
        }

        this.aplicarFiltros();
    }

    exportarReporte() {
        if (this.productosFiltrados.length === 0) {
            window.notificationService.warning('No hay datos para exportar');
            return;
        }

        const headers = [
            'Producto', 'Stock Actual', 'Cantidad Vendida', 'Valor Ventas', 
            'Cantidad Comprada', 'Valor Compras', 'Balance', 'Margen Est.', 'Estado'
        ];

        const csvContent = [
            headers.join(','),
            ...this.productosFiltrados.map(producto => [
                `"${producto.nombre}"`,
                producto.stockActual,
                producto.cantidadVendida,
                producto.valorVentas.toFixed(2),
                producto.cantidadComprada,
                producto.valorCompras.toFixed(2),
                producto.balance,
                producto.margenEstimado.toFixed(2),
                `"${producto.estado}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `reporte_productos_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Funciones auxiliares
    getEstadoClase(estado) {
        switch (estado) {
            case 'Stock Crítico': return 'badge-red';
            case 'Alta Rotación': return 'badge-green';
            case 'Sin Movimiento': return 'badge-yellow';
            case 'Activo': return 'badge-blue';
            default: return 'badge-blue';
        }
    }

    formatNumber(value, decimals = 2) {
        if (isNaN(value)) return '0.00';
        return Number(value).toLocaleString('es-PE', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }
}

// Crear instancia global
window.reportesProductos = new ReportesProductos();