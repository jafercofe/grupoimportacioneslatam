// CREAR ARCHIVO: js/components/balanceManager.js

class BalanceManager {
    constructor() {
        this.ingresos = [];
        this.egresos = [];
        this.ventasAutomaticas = 0;
        this.comprasAutomaticas = 0;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        try {
            console.log('Inicializando BalanceManager...');
            
            // Agregar filas iniciales
            this.agregarFilasIniciales();
            
            // Configurar eventos
            this.configurarEventos();
            
            this.initialized = true;
            console.log('BalanceManager inicializado correctamente');
            
        } catch (error) {
            console.error('Error inicializando BalanceManager:', error);
        }
    }

    agregarFilasIniciales() {
        // Agregar algunas filas por defecto
        this.agregarFila('ingresos', 'Ventas (Automático)', 0, true);
        this.agregarFila('ingresos', '', 0, false);
        
        this.agregarFila('egresos', 'Compras (Automático)', 0, true);
        this.agregarFila('egresos', '', 0, false);
    }

    agregarFila(tipo, concepto = '', monto = 0, esAutomatico = false) {
        const tabla = document.getElementById(`${tipo}-table`);
        if (!tabla) return;

        const fila = document.createElement('tr');
        fila.className = esAutomatico ? 'fila-automatica' : 'fila-manual';
        
        const filaId = `${tipo}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        fila.id = filaId;

        fila.innerHTML = `
            <td>
                <input type="text" style="color:black"
                       placeholder="${tipo === 'ingresos' ? 'Concepto del ingreso...' : 'Concepto del egreso...'}" 
                       value="${concepto}"
                       ${esAutomatico ? 'readonly' : ''}
                       onchange="window.balanceManager?.actualizarConcepto('${filaId}', this.value)">
            </td>
            <td>
                <input type="number" style="color:black"
                       step="0.01" 
                       min="0" 
                       placeholder="0.00"
                       value="${monto}"
                       ${esAutomatico ? 'readonly' : ''}
                       onchange="window.balanceManager?.actualizarMonto('${filaId}', this.value)">
            </td>
            <td>
                ${!esAutomatico ? `
                    <button onclick="window.balanceManager?.eliminarFila('${filaId}')" 
                            class="btn-remove" title="Eliminar">
                        <i data-lucide="trash-2"></i>
                    </button>
                ` : '<span class="auto-label">Auto</span>'}
            </td>
        `;

        tabla.appendChild(fila);

        // Actualizar iconos de Lucide
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // Guardar en arrays
        const item = {
            id: filaId,
            tipo: tipo,
            concepto: concepto,
            monto: parseFloat(monto) || 0,
            esAutomatico: esAutomatico
        };

        if (tipo === 'ingresos') {
            this.ingresos.push(item);
        } else {
            this.egresos.push(item);
        }

        this.calcularTotales();
    }

    eliminarFila(filaId) {
        const fila = document.getElementById(filaId);
        if (fila) {
            fila.remove();
        }

        // Eliminar de arrays
        this.ingresos = this.ingresos.filter(item => item.id !== filaId);
        this.egresos = this.egresos.filter(item => item.id !== filaId);

        this.calcularTotales();
    }

    actualizarConcepto(filaId, concepto) {
        // Actualizar en arrays
        const ingreso = this.ingresos.find(item => item.id === filaId);
        if (ingreso) {
            ingreso.concepto = concepto;
            return;
        }

        const egreso = this.egresos.find(item => item.id === filaId);
        if (egreso) {
            egreso.concepto = concepto;
        }
    }

    actualizarMonto(filaId, monto) {
        const valor = parseFloat(monto) || 0;

        // Actualizar en arrays
        const ingreso = this.ingresos.find(item => item.id === filaId);
        if (ingreso) {
            ingreso.monto = valor;
            this.calcularTotales();
            return;
        }

        const egreso = this.egresos.find(item => item.id === filaId);
        if (egreso) {
            egreso.monto = valor;
            this.calcularTotales();
        }
    }

    async calcularAutomatico() {
        const fechaDesde = document.getElementById('balance-fecha-desde')?.value;
        const fechaHasta = document.getElementById('balance-fecha-hasta')?.value;
        const incluirAutomaticos = document.getElementById('balance-incluir-automaticos')?.value === 'si';

        if (!fechaDesde || !fechaHasta) {
            window.notificationService?.warning('Seleccione las fechas para calcular el balance automático');
            return;
        }

        if (!incluirAutomaticos) {
            this.calcularTotales();
            return;
        }

        try {
            console.log('Calculando balance automático...');

            // NUEVO: Inicializar reportesManager si no está inicializado
            if (!window.reportesManager?.initialized) {
                console.log('Inicializando reportesManager para obtener datos...');
                window.notificationService?.info('Cargando datos de ventas y compras...');
                
                if (window.reportesManager) {
                    await window.reportesManager.initialize();
                } else {
                    console.warn('reportesManager no disponible, usando dataService directamente');
                }
            }

            // Obtener datos de ventas y compras del período
            const datosVentas = await this.obtenerVentasPeriodo(fechaDesde, fechaHasta);
            const datosCompras = await this.obtenerComprasPeriodo(fechaDesde, fechaHasta);

            console.log('Datos obtenidos:', { 
                ventas: datosVentas.total, 
                cantidadVentas: datosVentas.cantidad,
                compras: datosCompras.total, 
                cantidadCompras: datosCompras.cantidad 
            });

            // Actualizar filas automáticas
            this.actualizarFilaAutomatica('ingresos', 'Ventas (Automático)', datosVentas.total);
            this.actualizarFilaAutomatica('egresos', 'Compras (Automático)', datosCompras.total);

            this.ventasAutomaticas = datosVentas.total;
            this.comprasAutomaticas = datosCompras.total;

            this.calcularTotales();
            this.actualizarAnalisis(datosVentas, datosCompras, fechaDesde, fechaHasta);

            console.log('Balance automático calculado:', {
                ventas: datosVentas.total,
                compras: datosCompras.total
            });

            if (datosVentas.total === 0 && datosCompras.total === 0) {
                window.notificationService?.warning(`No se encontraron ventas ni compras en el período ${fechaDesde} a ${fechaHasta}`);
            } else {
                window.notificationService?.success(`Balance calculado: ${datosVentas.cantidad} ventas (S/ ${datosVentas.total.toFixed(2)}) y ${datosCompras.cantidad} compras (S/ ${datosCompras.total.toFixed(2)})`);
            }

        } catch (error) {
            console.error('Error calculando balance automático:', error);
            window.notificationService?.error('Error al calcular el balance: ' + error.message);
        }
    }

    async obtenerVentasPeriodo(fechaDesde, fechaHasta) {
        try {
            // Usar el reportesManager si está disponible
            if (window.reportesManager && window.reportesManager.ventasData) {
                const ventas = window.reportesManager.ventasData.filter(venta => {
                    if (!venta.PED_FECHA_VENTA) return false;
                    
                    const fechaVenta = new Date(venta.PED_FECHA_VENTA);
                    const desde = new Date(fechaDesde);
                    const hasta = new Date(fechaHasta);
                    
                    return fechaVenta >= desde && fechaVenta <= hasta;
                });

                const total = ventas.reduce((sum, venta) => sum + (parseFloat(venta.PED_TOTAL) || 0), 0);
                
                return {
                    cantidad: ventas.length,
                    total: total,
                    ventas: ventas
                };
            }

            // Si no está disponible reportesManager, obtener directamente
            const ventasData = await window.dataService.getAll('tb_pedido');
            const ventasFiltradas = ventasData.filter(venta => {
                if (!venta.PED_FECHA_VENTA) return false;
                
                const fechaVenta = new Date(venta.PED_FECHA_VENTA);
                const desde = new Date(fechaDesde);
                const hasta = new Date(fechaHasta);
                
                return fechaVenta >= desde && fechaVenta <= hasta;
            });

            const total = ventasFiltradas.reduce((sum, venta) => sum + (parseFloat(venta.PED_TOTAL) || 0), 0);

            return {
                cantidad: ventasFiltradas.length,
                total: total,
                ventas: ventasFiltradas
            };

        } catch (error) {
            console.error('Error obteniendo ventas del período:', error);
            return { cantidad: 0, total: 0, ventas: [] };
        }
    }

    async obtenerComprasPeriodo(fechaDesde, fechaHasta) {
        try {
            // Usar el reportesManager si está disponible
            if (window.reportesManager && window.reportesManager.comprasData) {
                const compras = window.reportesManager.comprasData.filter(compra => {
                    if (!compra.COM_FECHA_COMPRA) return false;
                    
                    const fechaCompra = new Date(compra.COM_FECHA_COMPRA);
                    const desde = new Date(fechaDesde);
                    const hasta = new Date(fechaHasta);
                    
                    return fechaCompra >= desde && fechaCompra <= hasta;
                });

                const total = compras.reduce((sum, compra) => sum + (parseFloat(compra.COM_TOTAL_FINAL) || 0), 0);

                return {
                    cantidad: compras.length,
                    total: total,
                    compras: compras
                };
            }

            // Si no está disponible reportesManager, obtener directamente
            const comprasData = await window.dataService.getAll('TB_COMPRAS');
            const comprasFiltradas = comprasData.filter(compra => {
                if (!compra.COM_FECHA_COMPRA) return false;
                
                const fechaCompra = new Date(compra.COM_FECHA_COMPRA);
                const desde = new Date(fechaDesde);
                const hasta = new Date(fechaHasta);
                
                return fechaCompra >= desde && fechaCompra <= hasta;
            });

            const total = comprasFiltradas.reduce((sum, compra) => sum + (parseFloat(compra.COM_TOTAL_FINAL) || 0), 0);

            return {
                cantidad: comprasFiltradas.length,
                total: total,
                compras: comprasFiltradas
            };

        } catch (error) {
            console.error('Error obteniendo compras del período:', error);
            return { cantidad: 0, total: 0, compras: [] };
        }
    }

    actualizarFilaAutomatica(tipo, concepto, monto) {
        // Buscar fila automática existente
        const item = (tipo === 'ingresos' ? this.ingresos : this.egresos)
            .find(item => item.esAutomatico && item.concepto === concepto);

        if (item) {
            item.monto = monto;
            
            // Actualizar en el DOM
            const fila = document.getElementById(item.id);
            if (fila) {
                const inputMonto = fila.querySelector('input[type="number"]');
                if (inputMonto) {
                    inputMonto.value = monto.toFixed(2);
                }
            }
        }
    }

    calcularTotales() {
        // Calcular totales
        const totalIngresos = this.ingresos.reduce((sum, item) => sum + item.monto, 0);
        const totalEgresos = this.egresos.reduce((sum, item) => sum + item.monto, 0);
        const balanceFinal = totalIngresos - totalEgresos;

        // Actualizar en la interfaz
        this.actualizarElemento('subtotal-ingresos', this.formatCurrency(totalIngresos));
        this.actualizarElemento('subtotal-egresos', this.formatCurrency(totalEgresos));
        this.actualizarElemento('total-ingresos', this.formatCurrency(totalIngresos));
        this.actualizarElemento('total-egresos', this.formatCurrency(totalEgresos));
        this.actualizarElemento('balance-final', this.formatCurrency(balanceFinal));

        // Actualizar clase del balance resultado
        const balanceCard = document.getElementById('balance-resultado');
        if (balanceCard) {
            balanceCard.classList.remove('ganancia', 'perdida');
            if (balanceFinal > 0) {
                balanceCard.classList.add('ganancia');
            } else if (balanceFinal < 0) {
                balanceCard.classList.add('perdida');
            }
        }

        return { totalIngresos, totalEgresos, balanceFinal };
    }

    actualizarAnalisis(datosVentas, datosCompras, fechaDesde, fechaHasta) {
        const totales = this.calcularTotales();
        const periodo = `${fechaDesde} al ${fechaHasta}`;

        let analisis = `<strong>Análisis del período ${periodo}:</strong><br><br>`;
        
        analisis += `• Total de ventas: ${datosVentas.cantidad} (${this.formatCurrency(datosVentas.total)})<br>`;
        analisis += `• Total de compras: ${datosCompras.cantidad} (${this.formatCurrency(datosCompras.total)})<br>`;
        analisis += `• Otros ingresos: ${this.formatCurrency(totales.totalIngresos - datosVentas.total)}<br>`;
        analisis += `• Otros egresos: ${this.formatCurrency(totales.totalEgresos - datosCompras.total)}<br><br>`;

        if (totales.balanceFinal > 0) {
            analisis += `<span style="color: #10b981;"><strong>✅ La empresa está generando GANANCIAS por ${this.formatCurrency(totales.balanceFinal)}</strong></span><br>`;
            
            const margenBruto = ((totales.balanceFinal / totales.totalIngresos) * 100).toFixed(2);
            analisis += `• Margen de ganancia: ${margenBruto}%<br>`;
            
        } else if (totales.balanceFinal < 0) {
            analisis += `<span style="color: #ef4444;"><strong>❌ La empresa está teniendo PÉRDIDAS por ${this.formatCurrency(Math.abs(totales.balanceFinal))}</strong></span><br>`;
            analisis += `• Se recomienda revisar los gastos y optimizar las ventas.<br>`;
            
        } else {
            analisis += `<span style="color: #3b82f6;"><strong>⚖️ La empresa está en EQUILIBRIO (sin ganancias ni pérdidas)</strong></span><br>`;
        }

        // Recomendaciones
        if (datosVentas.total > 0 && datosCompras.total > 0) {
            const ratioVentasCompras = (datosVentas.total / datosCompras.total).toFixed(2);
            analisis += `<br>• Ratio Ventas/Compras: ${ratioVentasCompras}:1<br>`;
            
            if (ratioVentasCompras < 1.2) {
                analisis += `<span style="color: #f59e0b;">⚠️ Ratio bajo: considere aumentar precios o reducir costos de compra.</span>`;
            } else if (ratioVentasCompras > 2) {
                analisis += `<span style="color: #10b981;">✅ Excelente ratio de rentabilidad.</span>`;
            }
        }

        this.actualizarElemento('balance-analisis-texto', analisis);
    }

    limpiarBalance() {
        // Limpiar fechas
        document.getElementById('balance-fecha-desde').value = '';
        document.getElementById('balance-fecha-hasta').value = '';

        // Reinicializar arrays
        this.ingresos = [];
        this.egresos = [];

        // Limpiar tablas
        document.getElementById('ingresos-table').innerHTML = '';
        document.getElementById('egresos-table').innerHTML = '';

        // Agregar filas iniciales
        this.agregarFilasIniciales();

        // Limpiar análisis
        this.actualizarElemento('balance-analisis-texto', 'Seleccione un período y haga clic en "Calcular Balance" para ver el análisis.');

        window.notificationService?.success('Balance limpiado correctamente');
    }

    exportarBalance() {
        try {
            console.log('Exportando balance a Excel...');

            const fechaDesde = document.getElementById('balance-fecha-desde')?.value || 'N/A';
            const fechaHasta = document.getElementById('balance-fecha-hasta')?.value || 'N/A';
            const totales = this.calcularTotales();

            // Preparar datos para Excel
            const datos = [];

            // Título y período
            datos.push([`BALANCE DE INGRESOS Y EGRESOS - ${new Date().toLocaleDateString('es-PE')}`]);
            datos.push([`Período: ${fechaDesde} al ${fechaHasta}`]);
            datos.push([]);

            // Sección de Ingresos
            datos.push(['INGRESOS']);
            datos.push(['Concepto', 'Monto (S/)']);
            
            this.ingresos.forEach(ingreso => {
                if (ingreso.concepto.trim() !== '' || ingreso.monto > 0) {
                    datos.push([ingreso.concepto || 'Sin concepto', ingreso.monto]);
                }
            });
            
            datos.push(['SUBTOTAL INGRESOS', totales.totalIngresos]);
            datos.push([]);

            // Sección de Egresos
            datos.push(['EGRESOS']);
            datos.push(['Concepto', 'Monto (S/)']);
            
            this.egresos.forEach(egreso => {
                if (egreso.concepto.trim() !== '' || egreso.monto > 0) {
                    datos.push([egreso.concepto || 'Sin concepto', egreso.monto]);
                }
            });
            
            datos.push(['SUBTOTAL EGRESOS', totales.totalEgresos]);
            datos.push([]);

            // Balance final
            datos.push(['BALANCE FINAL', totales.balanceFinal]);
            datos.push(['RESULTADO', totales.balanceFinal > 0 ? 'GANANCIA' : totales.balanceFinal < 0 ? 'PÉRDIDA' : 'EQUILIBRIO']);

            // Crear Excel
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.aoa_to_sheet(datos);

            // Formato básico
            worksheet['!cols'] = [{ width: 30 }, { width: 15 }];

            XLSX.utils.book_append_sheet(workbook, worksheet, 'Balance');

            const fecha = new Date().toISOString().split('T')[0];
            const nombreArchivo = `balance_${fecha}.xlsx`;

            XLSX.writeFile(workbook, nombreArchivo);

            console.log('Balance exportado exitosamente:', nombreArchivo);
            window.notificationService?.success(`Balance exportado: ${nombreArchivo}`);

        } catch (error) {
            console.error('Error exportando balance:', error);
            window.notificationService?.error('Error al exportar balance: ' + error.message);
        }
    }

    configurarEventos() {
        // Configurar fechas por defecto (último mes)
        const hoy = new Date();
        const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        
        document.getElementById('balance-fecha-desde').value = primerDiaMes.toISOString().split('T')[0];
        document.getElementById('balance-fecha-hasta').value = hoy.toISOString().split('T')[0];
    }

    // Métodos auxiliares
    actualizarElemento(id, valor) {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.innerHTML = valor;
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('es-PE', {
            style: 'currency',
            currency: 'PEN'
        }).format(amount || 0);
    }
}

// Crear instancia global
window.balanceManager = new BalanceManager();