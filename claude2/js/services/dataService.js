class DataService {
    constructor() {
        this.collections = {
            'cliente': 'clientes',
            'empleado': 'empleados',
            'producto': 'tb_productos',
            'pedido': 'tb_pedido',
            'pedido-detalle': 'tb_pedido_detalle',
            'compra': 'TB_COMPRAS',
            'compra-detalle': 'TB_COMPRA_DETALLE',
            'proveedor': 'TB_PROVEEDORES',
            'estado': 'TB_ESTADO',
            'entrega': 'entregas',
            'tipo-contacto': 'tipos_contacto',
            'tipo-pago': 'tipos_pago',
            'tipo-trabajador': 'tipos_trabajador'
        };

        
        console.log('📋 Collections mapping loaded:', this.collections);
        console.log('🎯 tipos-trabajador maps to:', this.collections['tipo-trabajador']);
    }

    getCollectionName(type) {
        // Corrección específica para tipos-trabajador
        if (type === 'tipos-trabajador') {
            return 'tipos_trabajador';
        }
        
        const mapped = this.collections[type] || type;
        return mapped;
    }

    async getAll(collectionName, useCache = true) {
        const cacheKey = `collection_${collectionName}`;
        
        if (useCache) {
            const cached = window.smartCache.get(cacheKey);
            if (cached) {
                console.log(`Cache hit for ${collectionName}`);
                return cached;
            }
        }

        console.log(`Loading ${collectionName} from Firebase`);
        const db = window.firebaseManager.getDB();
        const snapshot = await db.collection(collectionName).get();
        
        const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        if (useCache) {
            window.smartCache.set(cacheKey, data);
        }
        
        return data;
    }

    async getById(collectionName, id) {
        const db = window.firebaseManager.getDB();
        const doc = await db.collection(collectionName).doc(id).get();
        
        if (doc.exists) {
            return { id: doc.id, ...doc.data() };
        }
        
        return null;
    }

    async create(collectionName, data) {
        // Procesar datos especiales para estados
        if (collectionName === 'TB_ESTADO') {
            // Asegurar que tenga el formato correcto para estados
            const processedData = {
                EST_DESCRIP: data.descripcion || data.EST_DESCRIP || '',
                descripcion: data.descripcion || data.EST_DESCRIP || ''
            };
            const sanitizedData = this.sanitizeData(processedData);
            
            const db = window.firebaseManager.getDB();
            const docRef = await db.collection(collectionName).add(sanitizedData);
            window.smartCache.invalidate(`collection_${collectionName}`);
            
            return docRef.id;
        } else {
            // Proceso normal para otros tipos
            const sanitizedData = this.sanitizeData(data);
            const db = window.firebaseManager.getDB();
            
            const docRef = await db.collection(collectionName).add(sanitizedData);
            window.smartCache.invalidate(`collection_${collectionName}`);
            
            return docRef.id;
        }
    }

    async update(collectionName, id, data) {
        try {
            console.log(`🔍 UPDATE INICIADO: ${collectionName}/${id}`, data);
            
            // INTERCEPCIÓN PARA COMPRAS (código existente)
            if (collectionName === 'TB_COMPRAS') {
                console.log('🎯 Detectada actualización de compra, analizando...');
                
                const currentCompra = await this.getById(collectionName, id);
                if (!currentCompra) {
                    throw new Error('Compra no encontrada');
                }
                
                const currentEstado = currentCompra.COM_ESTADO_SERVICIO;
                const newEstado = data.COM_ESTADO_SERVICIO;
                const wasProcessed = currentCompra.COM_INVENTARIO_PROCESADO === true;
                
                console.log('📊 ANÁLISIS DE ESTADO COMPRA:', {
                    compraId: id,
                    compraNum: currentCompra.COM_NUM,
                    estadoActual: currentEstado,
                    estadoNuevo: newEstado,
                    yaFueProcesado: wasProcessed
                });
                
                // Lógica de compras (mantener código existente)...
                if (newEstado === 'Terminado' && currentEstado !== 'Terminado' && !wasProcessed) {
                    console.log('✅ COMPRA: Procesando inventario (Pendiente → Terminado)');
                    
                    const sanitizedData = this.sanitizeData(data);
                    const db = window.firebaseManager.getDB();
                    await db.collection(collectionName).doc(id).set(sanitizedData, { merge: true });
                    window.smartCache.invalidate(`collection_${collectionName}`);
                    
                    const mergedData = { ...currentCompra, ...data };
                    const inventoryResult = await this.processCompraInventoryUpdate(id, mergedData);
                    
                    if (inventoryResult.success) {
                        await this.markCompraAsInventoryProcessed(id);
                        console.log('✅ Procesamiento de compra completado');
                        return inventoryResult;
                    } else {
                        throw new Error(`Error procesando inventario: ${inventoryResult.error}`);
                    }
                }
                else if (currentEstado === 'Terminado' && newEstado === 'Pendiente' && wasProcessed) {
                    console.log('🔄 COMPRA: EJECUTANDO REVERSIÓN (Terminado → Pendiente)');
                    
                    const sanitizedData = this.sanitizeData(data);
                    const db = window.firebaseManager.getDB();
                    await db.collection(collectionName).doc(id).set(sanitizedData, { merge: true });
                    window.smartCache.invalidate(`collection_${collectionName}`);
                    
                    const revertResult = await this.executeInventoryReversion(id, currentCompra);
                    
                    if (revertResult.success) {
                        await this.markCompraAsInventoryNotProcessed(id);
                        console.log('✅ Reversión de compra completada');
                        return revertResult;
                    } else {
                        throw new Error(`Error revirtiendo inventario: ${revertResult.error}`);
                    }
                }
                else {
                    console.log('ℹ️ COMPRA: Actualización normal');
                    const sanitizedData = this.sanitizeData(data);
                    const db = window.firebaseManager.getDB();
                    await db.collection(collectionName).doc(id).set(sanitizedData, { merge: true });
                    window.smartCache.invalidate(`collection_${collectionName}`);
                    return { success: true, normalUpdate: true };
                }
            }
            
            // NUEVA INTERCEPCIÓN PARA PEDIDOS
            else if (collectionName === 'tb_pedido') {
                console.log('🎯 Detectada actualización de pedido, analizando...');
                
                const currentPedido = await this.getById(collectionName, id);
                if (!currentPedido) {
                    throw new Error('Pedido no encontrado');
                }
                
                const currentEstado = currentPedido.PED_SERVICIO;
                const newEstado = data.PED_SERVICIO;
                const wasProcessed = currentPedido.PED_INVENTARIO_PROCESADO === true;
                
                console.log('📊 ANÁLISIS DE ESTADO PEDIDO:', {
                    pedidoId: id,
                    pedidoNum: currentPedido.PED_NUM,
                    estadoActual: currentEstado,
                    estadoNuevo: newEstado,
                    yaFueProcesado: wasProcessed
                });
                
                // CASO 1: Pedido Pendiente → Terminado (RESTAR del inventario)
                if (newEstado === 'Terminado' && currentEstado !== 'Terminado' && !wasProcessed) {
                    console.log('✅ PEDIDO: Procesando inventario (Pendiente → Terminado) - RESTANDO stock');
                    
                    const sanitizedData = this.sanitizeData(data);
                    const db = window.firebaseManager.getDB();
                    await db.collection(collectionName).doc(id).set(sanitizedData, { merge: true });
                    window.smartCache.invalidate(`collection_${collectionName}`);
                    
                    const mergedData = { ...currentPedido, ...data };
                    const inventoryResult = await this.processPedidoInventoryUpdate(id, mergedData);
                    
                    if (inventoryResult.success) {
                        await this.markPedidoAsInventoryProcessed(id);
                        console.log('✅ Procesamiento de pedido completado');
                        return inventoryResult;
                    } else {
                        throw new Error(`Error procesando inventario: ${inventoryResult.error}`);
                    }
                }
                
                // CASO 2: Pedido Terminado → Pendiente (SUMAR al inventario - reversión)
                else if (currentEstado === 'Terminado' && newEstado === 'Pendiente' && wasProcessed) {
                    console.log('🔄 PEDIDO: EJECUTANDO REVERSIÓN (Terminado → Pendiente) - SUMANDO stock');
                    
                    const sanitizedData = this.sanitizeData(data);
                    const db = window.firebaseManager.getDB();
                    await db.collection(collectionName).doc(id).set(sanitizedData, { merge: true });
                    window.smartCache.invalidate(`collection_${collectionName}`);
                    
                    const revertResult = await this.executePedidoInventoryReversion(id, currentPedido);
                    
                    if (revertResult.success) {
                        await this.markPedidoAsInventoryNotProcessed(id);
                        console.log('✅ Reversión de pedido completada');
                        return revertResult;
                    } else {
                        throw new Error(`Error revirtiendo inventario: ${revertResult.error}`);
                    }
                }
                
                // CASO 3: Otros cambios
                else {
                    console.log('ℹ️ PEDIDO: Actualización normal (sin cambios de inventario)');
                    const sanitizedData = this.sanitizeData(data);
                    const db = window.firebaseManager.getDB();
                    await db.collection(collectionName).doc(id).set(sanitizedData, { merge: true });
                    window.smartCache.invalidate(`collection_${collectionName}`);
                    return { success: true, normalUpdate: true };
                }
            }
            
            // Proceso normal para otros tipos de documentos
            if (collectionName === 'TB_ESTADO') {
                const processedData = {
                    EST_DESCRIP: data.descripcion || data.EST_DESCRIP || '',
                    descripcion: data.descripcion || data.EST_DESCRIP || ''
                };
                const sanitizedData = this.sanitizeData(processedData);
                
                const db = window.firebaseManager.getDB();
                await db.collection(collectionName).doc(id).set(sanitizedData, { merge: true });
                window.smartCache.invalidate(`collection_${collectionName}`);
            } else {
                const sanitizedData = this.sanitizeData(data);
                const db = window.firebaseManager.getDB();
                
                await db.collection(collectionName).doc(id).set(sanitizedData, { merge: true });
                window.smartCache.invalidate(`collection_${collectionName}`);
            }
            
        } catch (error) {
            console.error('❌ ERROR EN UPDATE:', error);
            throw error;
        }
    }

    // NUEVA FUNCIÓN: Procesar inventario de pedido (RESTAR stock)
    async processPedidoInventoryUpdate(pedidoId, pedidoData) {
        try {
            console.log('📦 INICIANDO PROCESAMIENTO DE INVENTARIO PARA PEDIDO:', pedidoId);
            console.log('📋 Datos del pedido:', pedidoData);
            
            if (pedidoData.PED_SERVICIO !== 'Terminado') {
                console.log('❌ Estado no es Terminado, cancelando procesamiento');
                return { success: false, reason: 'Estado no es Terminado' };
            }
            
            const pedidoNum = pedidoData.PED_NUM;
            if (!pedidoNum) {
                throw new Error('Número de pedido no encontrado');
            }
            
            console.log(`📋 Obteniendo detalles de pedido ${pedidoNum}...`);
            
            const detallesPedido = await this.getPedidoDetalles(pedidoNum);
            
            if (detallesPedido.length === 0) {
                console.log('⚠️ No hay detalles para procesar en el pedido');
                return { success: true, itemsProcessed: 0 };
            }
            
            console.log(`📊 Procesando ${detallesPedido.length} items del pedido:`, detallesPedido);
            
            const inventoryUpdates = [];
            const errors = [];
            
            for (const detalle of detallesPedido) {
                const productoId = detalle.PED_DET_ID;
                const cantidadVendida = parseFloat(detalle.PED_DET_CANTIDAD) || 0;
                
                console.log(`🔄 Procesando producto: ${productoId}, Cantidad vendida: ${cantidadVendida}`);
                
                if (cantidadVendida <= 0) {
                    console.warn(`⚠️ Cantidad inválida para producto ${productoId}:`, cantidadVendida);
                    errors.push(`Cantidad inválida para producto ${productoId}`);
                    continue;
                }
                
                try {
                    const existingProduct = await this.getById('tb_productos', productoId);
                    
                    if (existingProduct) {
                        const currentStock = parseFloat(existingProduct.PRO_CANTIDAD) || 0;
                        
                        // VERIFICAR QUE HAY SUFICIENTE STOCK
                        if (currentStock < cantidadVendida) {
                            console.error(`❌ Stock insuficiente para producto ${productoId}: Stock actual ${currentStock}, Cantidad requerida ${cantidadVendida}`);
                            errors.push(`Stock insuficiente para producto ${existingProduct.PRO_NOMBRE}: ${currentStock} disponible, ${cantidadVendida} requerido`);
                            continue;
                        }
                        
                        const newStock = currentStock - cantidadVendida; // RESTAR del stock
                        
                        console.log(`📉 Restando stock de producto ${productoId}: ${currentStock} → ${newStock} (-${cantidadVendida})`);
                        
                        await this.updateProduct(productoId, {
                            PRO_CANTIDAD: newStock
                        });
                        
                        inventoryUpdates.push({
                            productId: productoId,
                            productName: existingProduct.PRO_NOMBRE,
                            action: 'decreased',
                            previousStock: currentStock,
                            soldAmount: cantidadVendida,
                            newStock: newStock
                        });
                        
                    } else {
                        console.warn(`⚠️ Producto ${productoId} no encontrado en inventario`);
                        errors.push(`Producto ${productoId} no encontrado en inventario`);
                    }
                    
                } catch (error) {
                    console.error(`❌ Error procesando producto ${productoId}:`, error);
                    errors.push(`Error en producto ${productoId}: ${error.message}`);
                }
            }
            
            // Invalidar cache de productos
            window.smartCache.invalidate('collection_tb_productos');
            
            const result = {
                success: true,
                pedidoNum: pedidoNum,
                itemsProcessed: inventoryUpdates.length,
                inventoryUpdates: inventoryUpdates,
                errors: errors,
                totalItemsInPedido: detallesPedido.length,
                type: 'pedido_processing'
            };
            
            console.log('✅ PROCESAMIENTO DE PEDIDO COMPLETADO:', result);
            
            // Mostrar notificación específica para pedidos
            this.showPedidoInventoryUpdateNotification(result);
            
            return result;
            
        } catch (error) {
            console.error('❌ Error procesando actualización de inventario de pedido:', error);
            window.notificationService.error(`Error actualizando inventario de pedido: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // NUEVA FUNCIÓN: Revertir inventario de pedido (SUMAR stock de vuelta)
    async executePedidoInventoryReversion(pedidoId, pedidoData) {
        try {
            console.log('🔄 EJECUTANDO REVERSIÓN DE INVENTARIO DE PEDIDO');
            console.log('📋 Datos del pedido para reversión:', pedidoData);
            
            const pedidoNum = pedidoData.PED_NUM;
            if (!pedidoNum) {
                throw new Error('Número de pedido no encontrado');
            }
            
            console.log(`📦 Obteniendo detalles de pedido ${pedidoNum}...`);
            
            const detallesPedido = await this.getPedidoDetalles(pedidoNum);
            console.log(`📊 Detalles encontrados:`, detallesPedido);
            
            if (detallesPedido.length === 0) {
                console.log('⚠️ No hay detalles para revertir');
                return { success: true, itemsReverted: 0, message: 'Sin productos para revertir' };
            }
            
            const inventoryReverts = [];
            const errors = [];
            
            console.log(`🔄 Procesando ${detallesPedido.length} productos para reversión...`);
            
            for (let i = 0; i < detallesPedido.length; i++) {
                const detalle = detallesPedido[i];
                const productoId = detalle.PED_DET_ID;
                const cantidadASumar = parseFloat(detalle.PED_DET_CANTIDAD) || 0;
                
                console.log(`📦 [${i+1}/${detallesPedido.length}] Procesando producto: ${productoId}`);
                console.log(`📈 Cantidad a sumar de vuelta: ${cantidadASumar}`);
                
                if (cantidadASumar <= 0) {
                    console.warn(`⚠️ Cantidad inválida: ${cantidadASumar}`);
                    continue;
                }
                
                try {
                    const producto = await this.getById('tb_productos', productoId);
                    
                    if (producto) {
                        const stockActual = parseFloat(producto.PRO_CANTIDAD) || 0;
                        const nuevoStock = stockActual + cantidadASumar; // SUMAR de vuelta al stock
                        
                        console.log(`📊 ${producto.PRO_NOMBRE}: ${stockActual} → ${nuevoStock} (+${cantidadASumar})`);
                        
                        // Actualizar directamente en Firebase
                        const db = window.firebaseManager.getDB();
                        await db.collection('tb_productos').doc(productoId).update({
                            PRO_CANTIDAD: nuevoStock
                        });
                        
                        console.log(`✅ Producto ${productoId} actualizado en BD`);
                        
                        inventoryReverts.push({
                            productId: productoId,
                            productName: producto.PRO_NOMBRE,
                            action: 'restored',
                            previousStock: stockActual,
                            restoredAmount: cantidadASumar,
                            newStock: nuevoStock
                        });
                        
                    } else {
                        console.warn(`⚠️ Producto ${productoId} no encontrado`);
                        errors.push(`Producto ${productoId} no encontrado`);
                    }
                    
                } catch (error) {
                    console.error(`❌ Error procesando producto ${productoId}:`, error);
                    errors.push(`Error en producto ${productoId}: ${error.message}`);
                }
            }
            
            // Invalidar cache de productos
            window.smartCache.invalidate('collection_tb_productos');
            
            const result = {
                success: true,
                pedidoNum: pedidoNum,
                itemsReverted: inventoryReverts.length,
                inventoryReverts: inventoryReverts,
                errors: errors,
                totalItemsInPedido: detallesPedido.length,
                type: 'pedido_reversion'
            };
            
            console.log('🎉 REVERSIÓN DE PEDIDO COMPLETADA:', result);
            
            // Mostrar notificación específica para reversión de pedidos
            this.showPedidoInventoryRevertNotification(result);
            
            return result;
            
        } catch (error) {
            console.error('❌ ERROR EJECUTANDO REVERSIÓN DE PEDIDO:', error);
            return { success: false, error: error.message };
        }
    }

    // NUEVA FUNCIÓN: Marcar pedido como procesado en inventario
    async markPedidoAsInventoryProcessed(pedidoId) {
        try {
            const db = window.firebaseManager.getDB();
            await db.collection('tb_pedido').doc(pedidoId).update({
                PED_INVENTARIO_PROCESADO: true,
                PED_FECHA_PROCESO_INVENTARIO: new Date().toISOString()
            });
            
            console.log(`✅ Pedido ${pedidoId} marcado como procesado en inventario`);
        } catch (error) {
            console.error('❌ Error marcando pedido como procesado:', error);
        }
    }

    // NUEVA FUNCIÓN: Marcar pedido como no procesado en inventario
    async markPedidoAsInventoryNotProcessed(pedidoId) {
        try {
            const db = window.firebaseManager.getDB();
            await db.collection('tb_pedido').doc(pedidoId).update({
                PED_INVENTARIO_PROCESADO: false,
                PED_FECHA_PROCESO_INVENTARIO: null,
                PED_FECHA_REVERSION_INVENTARIO: new Date().toISOString()
            });
            
            console.log(`✅ Pedido ${pedidoId} marcado como no procesado en inventario`);
        } catch (error) {
            console.error('❌ Error marcando pedido como no procesado:', error);
        }
    }

    // NUEVA FUNCIÓN: Mostrar notificación de actualización de inventario de pedidos
    showPedidoInventoryUpdateNotification(result) {
        if (!result.success) return;
        
        const { inventoryUpdates, itemsProcessed, errors } = result;
        
        if (itemsProcessed === 0 && errors.length === 0) {
            window.notificationService.info('Pedido marcado como terminado (sin productos para procesar)');
            return;
        }
        
        let message = `📦 Inventario actualizado por pedido: ${itemsProcessed} productos procesados`;
        
        if (inventoryUpdates.length > 0) {
            message += `\n📉 ${inventoryUpdates.length} productos con stock reducido`;
        }
        
        if (errors.length > 0) {
            message += `\n⚠️ ${errors.length} errores encontrados`;
            
            // Verificar si hubo productos con stock insuficiente
            const stockErrors = errors.filter(e => e.includes('Stock insuficiente'));
            if (stockErrors.length > 0) {
                message += `\n❌ ${stockErrors.length} productos sin stock suficiente`;
            }
        }
        
        // Mostrar notificación
        if (errors.length > 0) {
            window.notificationService.warning(message, 7000);
        } else {
            window.notificationService.success(message, 5000);
        }
        
        // Log detallado
        console.group('📊 RESUMEN DE ACTUALIZACIÓN DE INVENTARIO - PEDIDO');
        console.log('🏷️ Pedido:', result.pedidoNum);
        console.log('📉 Items procesados:', itemsProcessed);
        
        if (inventoryUpdates.length > 0) {
            console.log('📦 Productos con stock reducido:');
            inventoryUpdates.forEach(update => {
                console.log(`  📉 ${update.productName}: ${update.previousStock} → ${update.newStock} (-${update.soldAmount})`);
            });
        }
        
        if (errors.length > 0) {
            console.log('⚠️ Errores:');
            errors.forEach(error => {
                console.log(`  ❌ ${error}`);
            });
        }
        
        console.groupEnd();
    }

    // NUEVA FUNCIÓN: Mostrar notificación de reversión de inventario de pedidos
    showPedidoInventoryRevertNotification(result) {
        if (!result.success) return;
        
        const { inventoryReverts, itemsReverted, errors } = result;
        
        if (itemsReverted === 0 && errors.length === 0) {
            window.notificationService.info('Pedido revertido a pendiente (sin productos para revertir)');
            return;
        }
        
        let message = `🔄 Inventario revertido por pedido: ${itemsReverted} productos procesados`;
        
        if (inventoryReverts.length > 0) {
            message += `\n📈 ${inventoryReverts.length} productos con stock restaurado`;
        }
        
        if (errors.length > 0) {
            message += `\n⚠️ ${errors.length} errores encontrados`;
        }
        
        // Mostrar notificación
        if (errors.length > 0) {
            window.notificationService.warning(message, 7000);
        } else {
            window.notificationService.success(message, 5000);
        }
        
        // Log detallado
        console.group('📊 RESUMEN DE REVERSIÓN DE INVENTARIO - PEDIDO');
        console.log('🏷️ Pedido:', result.pedidoNum);
        console.log('📈 Items revertidos:', itemsReverted);
        
        if (inventoryReverts.length > 0) {
            console.log('📦 Productos con stock restaurado:');
            inventoryReverts.forEach(revert => {
                console.log(`  📈 ${revert.productName}: ${revert.previousStock} → ${revert.newStock} (+${revert.restoredAmount})`);
            });
        }
        
        if (errors.length > 0) {
            console.log('⚠️ Errores en reversión:');
            errors.forEach(error => {
                console.log(`  ❌ ${error}`);
            });
        }
        
        console.groupEnd();
    }

    async executeInventoryReversion(compraId, compraData) {
        try {
            console.log('🔄 EJECUTANDO REVERSIÓN DE INVENTARIO');
            console.log('📋 Datos de compra para reversión:', compraData);
            
            const compraNum = compraData.COM_NUM;
            if (!compraNum) {
                throw new Error('Número de compra no encontrado');
            }
            
            console.log(`📦 Obteniendo detalles de compra ${compraNum}...`);
            
            // Obtener detalles de la compra
            const detallesCompra = await this.getCompraDetalles(compraNum);
            console.log(`📊 Detalles encontrados:`, detallesCompra);
            
            if (detallesCompra.length === 0) {
                console.log('⚠️ No hay detalles para revertir');
                return { success: true, itemsReverted: 0, message: 'Sin productos para revertir' };
            }
            
            const inventoryReverts = [];
            const errors = [];
            
            console.log(`🔄 Procesando ${detallesCompra.length} productos para reversión...`);
            
            // Procesar cada producto
            for (let i = 0; i < detallesCompra.length; i++) {
                const detalle = detallesCompra[i];
                const productoId = detalle.COM_DET_PRODUCTO;
                const cantidadARestar = parseFloat(detalle.COM_DET_CANTIDAD) || 0;
                
                console.log(`📦 [${i+1}/${detallesCompra.length}] Procesando producto: ${productoId}`);
                console.log(`📉 Cantidad a restar: ${cantidadARestar}`);
                
                if (cantidadARestar <= 0) {
                    console.warn(`⚠️ Cantidad inválida: ${cantidadARestar}`);
                    continue;
                }
                
                try {
                    // Obtener producto actual
                    const producto = await this.getById('tb_productos', productoId);
                    
                    if (producto) {
                        const stockActual = parseFloat(producto.PRO_CANTIDAD) || 0;
                        const nuevoStock = Math.max(0, stockActual - cantidadARestar); // Prevenir negativo
                        
                        console.log(`📊 ${producto.PRO_NOMBRE}: ${stockActual} → ${nuevoStock} (-${cantidadARestar})`);
                        
                        // Actualizar directamente en Firebase
                        const db = window.firebaseManager.getDB();
                        await db.collection('tb_productos').doc(productoId).update({
                            PRO_CANTIDAD: nuevoStock
                        });
                        
                        console.log(`✅ Producto ${productoId} actualizado en BD`);
                        
                        inventoryReverts.push({
                            productId: productoId,
                            productName: producto.PRO_NOMBRE,
                            action: 'reverted',
                            previousStock: stockActual,
                            revertedAmount: cantidadARestar,
                            newStock: nuevoStock,
                            wasNegativePrevented: (stockActual - cantidadARestar) < 0
                        });
                        
                    } else {
                        console.warn(`⚠️ Producto ${productoId} no encontrado`);
                        errors.push(`Producto ${productoId} no encontrado`);
                    }
                    
                } catch (error) {
                    console.error(`❌ Error procesando producto ${productoId}:`, error);
                    errors.push(`Error en producto ${productoId}: ${error.message}`);
                }
            }
            
            // Invalidar cache de productos
            window.smartCache.invalidate('collection_tb_productos');
            
            const result = {
                success: true,
                compraNum: compraNum,
                itemsReverted: inventoryReverts.length,
                inventoryReverts: inventoryReverts,
                errors: errors,
                totalItemsInCompra: detallesCompra.length
            };
            
            console.log('🎉 REVERSIÓN COMPLETADA:', result);
            
            // Mostrar notificación
            this.showInventoryRevertNotification(result);
            
            return result;
            
        } catch (error) {
            console.error('❌ ERROR EJECUTANDO REVERSIÓN:', error);
            return { success: false, error: error.message };
        }
    }

    async revertCompraInventoryUpdate(compraId, compraData) {
        try {
            console.log('🔄 Iniciando reversión de inventario para compra:', compraId);
            console.log('Datos de compra:', compraData);
            
            const compraNum = compraData.COM_NUM;
            if (!compraNum) {
                throw new Error('Número de compra no encontrado');
            }
            
            console.log(`📋 Obteniendo detalles de compra ${compraNum} para reversión...`);
            
            const detallesCompra = await this.getCompraDetalles(compraNum);
            
            if (detallesCompra.length === 0) {
                console.log('⚠️ No hay detalles para revertir en la compra');
                return { success: true, itemsReverted: 0 };
            }
            
            console.log(`📊 Revirtiendo ${detallesCompra.length} items de la compra:`, detallesCompra);
            
            const inventoryReverts = [];
            const errors = [];
            
            for (const detalle of detallesCompra) {
                const productoId = detalle.COM_DET_PRODUCTO;
                const cantidad = parseFloat(detalle.COM_DET_CANTIDAD) || 0;
                
                console.log(`🔄 Revirtiendo producto: ${productoId}, Cantidad a restar: ${cantidad}`);
                
                if (cantidad <= 0) {
                    console.warn(`⚠️ Cantidad inválida para reversión del producto ${productoId}:`, cantidad);
                    continue;
                }
                
                try {
                    const existingProduct = await this.getById('tb_productos', productoId);
                    
                    if (existingProduct) {
                        const currentStock = parseFloat(existingProduct.PRO_CANTIDAD) || 0;
                        const newStock = Math.max(0, currentStock - cantidad);
                        
                        console.log(`📉 Revirtiendo stock de producto ${productoId}: ${currentStock} -> ${newStock} (-${cantidad})`);
                        
                        await this.updateProduct(productoId, {
                            PRO_CANTIDAD: newStock
                        });
                        
                        inventoryReverts.push({
                            productId: productoId,
                            productName: existingProduct.PRO_NOMBRE,
                            action: 'reverted',
                            previousStock: currentStock,
                            revertedAmount: cantidad,
                            newStock: newStock,
                            wasNegativePrevented: (currentStock - cantidad) < 0
                        });
                        
                    } else {
                        console.warn(`⚠️ Producto ${productoId} no encontrado para reversión`);
                        errors.push(`Producto ${productoId} no encontrado`);
                    }
                    
                } catch (error) {
                    console.error(`❌ Error revirtiendo producto ${productoId}:`, error);
                    errors.push(`Error en producto ${productoId}: ${error.message}`);
                }
            }
            
            // CORREGIDO: Solo usar invalidate, no remove
            window.smartCache.invalidate('collection_tb_productos');
            
            const result = {
                success: true,
                compraNum: compraNum,
                itemsReverted: inventoryReverts.length,
                inventoryReverts: inventoryReverts,
                errors: errors,
                totalItemsInCompra: detallesCompra.length
            };
            
            console.log('✅ Reversión de inventario completada:', result);
            
            // Mostrar notificación de reversión
            this.showInventoryRevertNotification(result);
            
            return result;
            
        } catch (error) {
            console.error('❌ Error revirtiendo actualización de inventario:', error);
            window.notificationService.error(`Error revirtiendo inventario: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // NUEVA FUNCIÓN: Mostrar notificación de reversión de inventario
    showInventoryRevertNotification(result) {
        if (!result.success) return;
        
        const { inventoryReverts, itemsReverted, errors } = result;
        
        if (itemsReverted === 0 && errors.length === 0) {
            window.notificationService.info('Compra revertida a pendiente (sin productos para revertir)');
            return;
        }
        
        let message = `🔄 Inventario revertido: ${itemsReverted} productos procesados`;
        
        if (inventoryReverts.length > 0) {
            message += `\n📉 ${inventoryReverts.length} productos con stock reducido`;
        }
        
        if (errors.length > 0) {
            message += `\n⚠️ ${errors.length} errores encontrados`;
        }
        
        // Verificar si hubo productos que llegaron a stock 0
        const zeroStockProducts = inventoryReverts.filter(r => r.newStock === 0);
        if (zeroStockProducts.length > 0) {
            message += `\n⚠️ ${zeroStockProducts.length} productos con stock en 0`;
        }
        
        // Verificar si se previno stock negativo
        const preventedNegative = inventoryReverts.filter(r => r.wasNegativePrevented);
        if (preventedNegative.length > 0) {
            message += `\n🛡️ Stock negativo prevenido en ${preventedNegative.length} productos`;
        }
        
        // Mostrar notificación con duración extendida
        if (errors.length > 0 || preventedNegative.length > 0) {
            window.notificationService.warning(message, 7000);
        } else {
            window.notificationService.success(message, 5000);
        }
        
        // Log detallado para debugging
        console.group('📊 RESUMEN DE REVERSIÓN DE INVENTARIO');
        console.log('🏷️ Compra:', result.compraNum);
        console.log('📉 Items revertidos:', itemsReverted);
        
        if (inventoryReverts.length > 0) {
            console.log('📦 Productos revertidos:');
            inventoryReverts.forEach(revert => {
                const warning = revert.wasNegativePrevented ? ' ⚠️ (Stock negativo prevenido)' : '';
                console.log(`  ↩️ ${revert.productName}: ${revert.previousStock} -> ${revert.newStock} (-${revert.revertedAmount})${warning}`);
            });
        }
        
        if (errors.length > 0) {
            console.log('⚠️ Errores en reversión:');
            errors.forEach(error => {
                console.log(`  ❌ ${error}`);
            });
        }
        
        console.groupEnd();
    }

    // NUEVA FUNCIÓN: Marcar compra como no procesada en inventario
    async markCompraAsInventoryNotProcessed(compraId) {
        try {
            const db = window.firebaseManager.getDB();
            await db.collection('TB_COMPRAS').doc(compraId).update({
                COM_INVENTARIO_PROCESADO: false,
                COM_FECHA_PROCESO_INVENTARIO: null,
                COM_FECHA_REVERSION_INVENTARIO: new Date().toISOString()
            });
            
            console.log(`✅ Compra ${compraId} marcada como no procesada en inventario`);
        } catch (error) {
            console.error('❌ Error marcando compra como no procesada:', error);
        }
    }

    async processCompraInventoryUpdate(compraId, compraData) {
        try {
            console.log('📦 Iniciando procesamiento de inventario para compra:', compraId);
            console.log('Datos de compra:', compraData);
            
            if (compraData.COM_ESTADO_SERVICIO !== 'Terminado') {
                console.log('❌ Estado no es Terminado, cancelando procesamiento');
                return { success: false, reason: 'Estado no es Terminado' };
            }
            
            const compraNum = compraData.COM_NUM;
            if (!compraNum) {
                throw new Error('Número de compra no encontrado');
            }
            
            console.log(`📋 Obteniendo detalles de compra ${compraNum}...`);
            
            const detallesCompra = await this.getCompraDetalles(compraNum);
            
            if (detallesCompra.length === 0) {
                console.log('⚠️ No hay detalles para procesar en la compra');
                return { success: true, itemsProcessed: 0 };
            }
            
            console.log(`📊 Procesando ${detallesCompra.length} items de la compra:`, detallesCompra);
            
            const inventoryUpdates = [];
            const newProducts = [];
            const errors = [];
            
            for (const detalle of detallesCompra) {
                const productoId = detalle.COM_DET_PRODUCTO;
                const cantidad = parseFloat(detalle.COM_DET_CANTIDAD) || 0;
                const precioUnitario = parseFloat(detalle.COM_DET_PRECIO) || 0;
                
                console.log(`🔄 Procesando producto: ${productoId}, Cantidad: ${cantidad}, Precio: ${precioUnitario}`);
                
                if (cantidad <= 0) {
                    console.warn(`⚠️ Cantidad inválida para producto ${productoId}:`, cantidad);
                    errors.push(`Cantidad inválida para producto ${productoId}`);
                    continue;
                }
                
                try {
                    const existingProduct = await this.getById('tb_productos', productoId);
                    
                    if (existingProduct) {
                        // Producto existe - actualizar cantidad
                        const currentStock = parseFloat(existingProduct.PRO_CANTIDAD) || 0;
                        const newStock = currentStock + cantidad;
                        
                        console.log(`📈 Actualizando producto existente ${productoId}: ${currentStock} -> ${newStock}`);
                        
                        const updateData = {
                            PRO_CANTIDAD: newStock
                        };
                        
                        const currentPrice = parseFloat(existingProduct.PRO_PRECIO) || 0;
                        if (Math.abs(currentPrice - precioUnitario) > 0.01) {
                            updateData.PRO_PRECIO = precioUnitario;
                            console.log(`💰 Actualizando precio: ${currentPrice} -> ${precioUnitario}`);
                        }
                        
                        await this.updateProduct(productoId, updateData);
                        
                        inventoryUpdates.push({
                            productId: productoId,
                            productName: existingProduct.PRO_NOMBRE,
                            action: 'updated',
                            previousStock: currentStock,
                            addedStock: cantidad,
                            newStock: newStock,
                            priceUpdated: updateData.PRO_PRECIO ? true : false,
                            newPrice: updateData.PRO_PRECIO || currentPrice
                        });
                        
                    } else {
                        // Producto no existe - crear nuevo
                        console.log(`🆕 Creando nuevo producto: ${productoId}`);
                        
                        const newProductData = {
                            PRO_ID: productoId,
                            PRO_NOMBRE: `Producto ${productoId}`,
                            PRO_CANTIDAD: cantidad,
                            PRO_PRECIO: precioUnitario,
                            PRO_OBS: `Creado desde compra ${compraNum} el ${new Date().toLocaleDateString()}`
                        };
                        
                        await this.createProduct(newProductData);
                        
                        newProducts.push({
                            productId: productoId,
                            productName: newProductData.PRO_NOMBRE,
                            action: 'created',
                            stock: cantidad,
                            price: precioUnitario,
                            source: `Compra ${compraNum}`
                        });
                    }
                    
                } catch (error) {
                    console.error(`❌ Error procesando producto ${productoId}:`, error);
                    errors.push(`Error en producto ${productoId}: ${error.message}`);
                }
            }
            
            // CORREGIDO: Solo usar invalidate, no remove
            window.smartCache.invalidate('collection_tb_productos');
            
            const result = {
                success: true,
                compraNum: compraNum,
                itemsProcessed: inventoryUpdates.length + newProducts.length,
                inventoryUpdates: inventoryUpdates,
                newProducts: newProducts,
                errors: errors,
                totalItemsInCompra: detallesCompra.length
            };
            
            console.log('✅ Procesamiento de inventario completado:', result);
            
            // Mostrar notificación de éxito
            this.showInventoryUpdateNotification(result);
            
            return result;
            
        } catch (error) {
            console.error('❌ Error procesando actualización de inventario:', error);
            window.notificationService.error(`Error actualizando inventario: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // Función auxiliar para actualizar producto
    async updateProduct(productId, updateData) {
        const sanitizedData = this.sanitizeData(updateData);
        const db = window.firebaseManager.getDB();
        await db.collection('tb_productos').doc(productId).update(sanitizedData);
        console.log(`✅ Producto ${productId} actualizado:`, updateData);
    }

    // Función auxiliar para crear producto
    async createProduct(productData) {
        const sanitizedData = this.sanitizeData(productData);
        const db = window.firebaseManager.getDB();
        const docRef = await db.collection('tb_productos').add(sanitizedData);
        console.log(`✅ Nuevo producto creado con ID:`, docRef.id);
        return docRef.id;
    }

    showInventoryUpdateNotification(result) {
        if (!result.success) return;
        
        const { inventoryUpdates, newProducts, itemsProcessed, errors } = result;
        
        if (itemsProcessed === 0 && errors.length === 0) {
            window.notificationService.info('Compra marcada como terminada (sin productos para procesar)');
            return;
        }
        
        let message = `✅ Inventario actualizado: ${itemsProcessed} productos procesados`;
        
        if (inventoryUpdates.length > 0) {
            message += `\n📦 ${inventoryUpdates.length} productos actualizados`;
        }
        
        if (newProducts.length > 0) {
            message += `\n🆕 ${newProducts.length} productos nuevos creados`;
        }
        
        if (errors.length > 0) {
            message += `\n⚠️ ${errors.length} errores encontrados`;
        }
        
        // Mostrar notificación extendida
        if (errors.length > 0) {
            window.notificationService.warning(message, 7000);
        } else {
            window.notificationService.success(message, 5000);
        }
        
        // Log detallado para debugging
        console.group('📊 RESUMEN DE ACTUALIZACIÓN DE INVENTARIO');
        console.log('🏷️ Compra:', result.compraNum);
        console.log('📈 Items procesados:', itemsProcessed);
        
        if (inventoryUpdates.length > 0) {
            console.log('📦 Productos actualizados:');
            inventoryUpdates.forEach(update => {
                console.log(`  ✓ ${update.productName}: ${update.previousStock} -> ${update.newStock} (+${update.addedStock})`);
            });
        }
        
        if (newProducts.length > 0) {
            console.log('🆕 Productos nuevos:');
            newProducts.forEach(product => {
                console.log(`  ✓ ${product.productName}: ${product.stock} unidades a S/ ${product.price}`);
            });
        }
        
        if (errors.length > 0) {
            console.log('⚠️ Errores:');
            errors.forEach(error => {
                console.log(`  ❌ ${error}`);
            });
        }
        
        console.groupEnd();
    }

    // Función para marcar una compra como procesada en inventario
    async markCompraAsInventoryProcessed(compraId) {
        try {
            const db = window.firebaseManager.getDB();
            await db.collection('TB_COMPRAS').doc(compraId).update({
                COM_INVENTARIO_PROCESADO: true,
                COM_FECHA_PROCESO_INVENTARIO: new Date().toISOString()
            });
            
            console.log(`✅ Compra ${compraId} marcada como procesada en inventario`);
        } catch (error) {
            console.error('❌ Error marcando compra como procesada:', error);
        }
    }

    async delete(collectionName, id) {
        const db = window.firebaseManager.getDB();
        
        if (collectionName === 'tb_pedido') {
            await this.deletePedidoWithDetails(id);
        } else if (collectionName === 'TB_COMPRAS') {
            await this.deleteCompraWithDetails(id);
        } else {
            await db.collection(collectionName).doc(id).delete();
        }
        
        window.smartCache.invalidate(`collection_${collectionName}`);
    }

    async deletePedidoWithDetails(pedidoId) {
        const db = window.firebaseManager.getDB();
        
        try {
            console.log(`Eliminando pedido ${pedidoId} y sus detalles...`);
            
            const pedidoDoc = await db.collection('tb_pedido').doc(pedidoId).get();
            if (!pedidoDoc.exists) {
                throw new Error('Pedido no encontrado');
            }
            
            const pedidoData = pedidoDoc.data();
            const pedidoNum = pedidoData.PED_NUM;
            console.log(`Número de pedido: ${pedidoNum}`);
            
            const detallesSnapshot = await db.collection('tb_pedidos_detalle')
                .where('PED_DET_NUM', '==', pedidoNum)
                .get();
            
            console.log(`Encontrados ${detallesSnapshot.size} detalles, devolviendo stock...`);
            
            const stockUpdates = [];
            for (const detalleDoc of detallesSnapshot.docs) {
                const detalle = detalleDoc.data();
                try {
                    const stockUpdate = await this.updateProductStock(
                        detalle.PED_DET_ID,
                        detalle.PED_DET_CANTIDAD,
                        'add'
                    );
                    stockUpdates.push(stockUpdate);
                } catch (error) {
                    console.warn(`Error devolviendo stock para producto ${detalle.PED_DET_ID}:`, error);
                }
            }
            
            const batch = db.batch();
            
            detallesSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            batch.delete(db.collection('tb_pedido').doc(pedidoId));
            
            await batch.commit();
            
            console.log(`Pedido ${pedidoId} eliminado y stock devuelto:`, stockUpdates);
            
            window.smartCache.invalidate('collection_tb_pedido');
            window.smartCache.invalidate('collection_tb_pedidos_detalle');
            window.smartCache.invalidate('collection_tb_productos');
            
        } catch (error) {
            console.error('Error en eliminación en cascada:', error);
            throw error;
        }
    }

    async getPaginated(collectionName, { limit = 25, startAfter = null, orderBy = null }) {
        const db = window.firebaseManager.getDB();
        let query = db.collection(collectionName);
        
        if (orderBy) {
            query = query.orderBy(orderBy);
        }
        
        if (startAfter) {
            query = query.startAfter(startAfter);
        }
        
        query = query.limit(limit);
        
        const snapshot = await query.get();
        return {
            docs: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            lastDoc: snapshot.docs[snapshot.docs.length - 1],
            hasMore: snapshot.docs.length === limit
        };
    }

    sanitizeData(data) {
        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            sanitized[key] = window.ValidationManager.sanitize(value);
        }
        return sanitized;
    }

    async getPedidoDetalles(pedidoNum) {
        try {
            console.log(`Consultando detalles para pedido: "${pedidoNum}"`);
            
            const db = window.firebaseManager.getDB();
            const snapshot = await db.collection('tb_pedidos_detalle')
                .where('PED_DET_NUM', '==', pedidoNum)
                .get();
            
            console.log(`Documentos encontrados: ${snapshot.size}`);
            
            if (snapshot.empty) {
                console.log('No se encontraron detalles para este pedido');
                
                const allSnapshot = await db.collection('tb_pedidos_detalle').limit(5).get();
                console.log('Ejemplo de documentos en tb_pedidos_detalle:');
                allSnapshot.docs.forEach((doc, index) => {
                    console.log(`Documento ${index + 1}:`, doc.data());
                });
            }
            
            const detalles = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log('Detalles procesados:', detalles);
            return detalles;
        } catch (error) {
            console.error('Error getting pedido detalles:', error);
            return [];
        }
    }

    async createPedidoDetalle(detalle) {
        const sanitizedData = this.sanitizeData(detalle);
        const db = window.firebaseManager.getDB();
        
        const docRef = await db.collection('tb_pedidos_detalle').add(sanitizedData);
        return docRef.id;
    }

    async updatePedidoDetalle(id, detalle) {
        const sanitizedData = this.sanitizeData(detalle);
        const db = window.firebaseManager.getDB();
        
        await db.collection('tb_pedidos_detalle').doc(id).update(sanitizedData);
    }

    async deletePedidoDetalle(id) {
        const db = window.firebaseManager.getDB();
        await db.collection('tb_pedidos_detalle').doc(id).delete();
    }

    async calcularTotalPedido(pedidoNum) {
        try {
            const detalles = await this.getPedidoDetalles(pedidoNum);
            const total = detalles.reduce((sum, detalle) => {
                const cantidad = parseFloat(detalle.PED_DET_CANTIDAD) || 0;
                const precio = parseFloat(detalle.PED_DET_PRECIO) || 0;
                return sum + (cantidad * precio);
            }, 0);
            return total;
        } catch (error) {
            console.error(`Error calculando total para pedido ${pedidoNum}:`, error);
            return 0;
        }
    }

    async updateProductStock(productId, quantityUsed, operation = 'subtract') {
        try {
            console.log(`Actualizando stock: Producto ${productId}, Cantidad ${quantityUsed}, Operación: ${operation}`);
            
            const product = await this.getById('tb_productos', productId);
            if (!product) {
                throw new Error(`Producto ${productId} no encontrado`);
            }
            
            const currentStock = parseFloat(product.PRO_CANTIDAD) || 0;
            const quantity = parseFloat(quantityUsed) || 0;
            
            let newStock;
            if (operation === 'subtract') {
                newStock = currentStock - quantity;
                if (newStock < 0) {
                    throw new Error(`Stock insuficiente. Stock actual: ${currentStock}, Cantidad solicitada: ${quantity}`);
                }
            } else if (operation === 'add') {
                newStock = currentStock + quantity;
            } else {
                throw new Error(`Operación inválida: ${operation}`);
            }
            
            await this.update('tb_productos', productId, {
                PRO_CANTIDAD: newStock
            });
            
            console.log(`Stock actualizado: ${currentStock} -> ${newStock}`);
            
            window.smartCache.invalidate('collection_tb_productos');
            
            return {
                productId,
                previousStock: currentStock,
                newStock: newStock,
                quantityChanged: quantity,
                operation
            };
            
        } catch (error) {
            console.error('Error actualizando stock:', error);
            throw error;
        }
    }

    async createPedidoDetalleWithInventory(detalle) {
        try {
            console.log('Creando detalle de pedido con actualización de inventario:', detalle);
            
            const product = await this.getById('tb_productos', detalle.PED_DET_ID);
            if (!product) {
                throw new Error('Producto no encontrado');
            }
            
            const currentStock = parseFloat(product.PRO_CANTIDAD) || 0;
            const quantityRequested = parseFloat(detalle.PED_DET_CANTIDAD) || 0;
            
            if (currentStock < quantityRequested) {
                throw new Error(`Stock insuficiente. Stock disponible: ${currentStock}, Cantidad solicitada: ${quantityRequested}`);
            }
            
            const detalleId = await this.createPedidoDetalle(detalle);
            
            const stockUpdate = await this.updateProductStock(
                detalle.PED_DET_ID, 
                detalle.PED_DET_CANTIDAD, 
                'subtract'
            );
            
            console.log('Detalle creado e inventario actualizado:', {
                detalleId,
                stockUpdate
            });
            
            return {
                detalleId,
                stockUpdate
            };
            
        } catch (error) {
            console.error('Error creando detalle con inventario:', error);
            throw error;
        }
    }

    async updatePedidoDetalleWithInventory(detalleId, newDetalle) {
        try {
            console.log('Actualizando detalle con inventario:', { detalleId, newDetalle });
            
            const currentDetalle = await this.getById('tb_pedidos_detalle', detalleId);
            if (!currentDetalle) {
                throw new Error('Detalle de pedido no encontrado');
            }
            
            const oldQuantity = parseFloat(currentDetalle.PED_DET_CANTIDAD) || 0;
            const newQuantity = parseFloat(newDetalle.PED_DET_CANTIDAD) || 0;
            const productId = currentDetalle.PED_DET_ID;
            
            if (oldQuantity !== newQuantity) {
                const quantityDifference = newQuantity - oldQuantity;
                
                if (quantityDifference > 0) {
                    const product = await this.getById('tb_productos', productId);
                    const currentStock = parseFloat(product.PRO_CANTIDAD) || 0;
                    
                    if (currentStock < quantityDifference) {
                        throw new Error(`Stock insuficiente para el aumento. Stock disponible: ${currentStock}, Aumento solicitado: ${quantityDifference}`);
                    }
                    
                    await this.updateProductStock(productId, quantityDifference, 'subtract');
                } else {
                    const quantityToReturn = Math.abs(quantityDifference);
                    await this.updateProductStock(productId, quantityToReturn, 'add');
                }
            }
            
            await this.updatePedidoDetalle(detalleId, newDetalle);
            
            console.log('Detalle actualizado e inventario ajustado');
            
            return {
                detalleId,
                oldQuantity,
                newQuantity,
                stockAdjustment: newQuantity - oldQuantity
            };
            
        } catch (error) {
            console.error('Error actualizando detalle con inventario:', error);
            throw error;
        }
    }

    async deletePedidoDetalleWithInventory(detalleId) {
        try {
            console.log('Eliminando detalle con devolución de inventario:', detalleId);
            
            const detalle = await this.getById('tb_pedidos_detalle', detalleId);
            if (!detalle) {
                throw new Error('Detalle de pedido no encontrado');
            }
            
            const quantity = parseFloat(detalle.PED_DET_CANTIDAD) || 0;
            const productId = detalle.PED_DET_ID;
            
            await this.deletePedidoDetalle(detalleId);
            
            const stockUpdate = await this.updateProductStock(productId, quantity, 'add');
            
            console.log('Detalle eliminado y stock devuelto:', stockUpdate);
            
            return {
                detalleId,
                stockReturned: stockUpdate
            };
            
        } catch (error) {
            console.error('Error eliminando detalle con inventario:', error);
            throw error;
        }
    }

    async getProductsWithLowStock(threshold = 10) {
        try {
            const products = await this.getAll('tb_productos');
            return products.filter(product => {
                const stock = parseFloat(product.PRO_CANTIDAD) || 0;
                return stock <= threshold;
            }).map(product => ({
                id: product.id,
                name: product.PRO_NOMBRE,
                currentStock: parseFloat(product.PRO_CANTIDAD) || 0,
                price: parseFloat(product.PRO_PRECIO) || 0
            }));
        } catch (error) {
            console.error('Error obteniendo productos con stock bajo:', error);
            return [];
        }
    }

    async getInventoryMovements(productId = null, days = 30) {
        try {
            const products = productId 
                ? [await this.getById('tb_productos', productId)].filter(Boolean)
                : await this.getAll('tb_productos');
                
            return products.map(product => ({
                productId: product.id,
                productName: product.PRO_NOMBRE,
                currentStock: parseFloat(product.PRO_CANTIDAD) || 0,
                price: parseFloat(product.PRO_PRECIO) || 0,
                lastUpdated: new Date().toISOString()
            }));
        } catch (error) {
            console.error('Error obteniendo movimientos de inventario:', error);
            return [];
        }
    }

    async getCompraDetalles(compraNum) {
        try {
            console.log(`📋 Consultando detalles para compra: "${compraNum}"`);
            
            const db = window.firebaseManager.getDB();
            const snapshot = await db.collection('TB_COMPRA_DETALLE')
                .where('COM_DET_NUM', '==', compraNum)
                .get();
            
            console.log(`📊 Documentos de detalle encontrados: ${snapshot.size}`);
            
            const detalles = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log('📋 Detalles de compra procesados:', detalles);
            return detalles;
        } catch (error) {
            console.error('❌ Error getting compra detalles:', error);
            return [];
        }
    }

    async createCompraDetalle(detalle) {
        const sanitizedData = this.sanitizeData(detalle);
        const db = window.firebaseManager.getDB();
        
        const cantidad = parseFloat(sanitizedData.COM_DET_CANTIDAD) || 0;
        const precio = parseFloat(sanitizedData.COM_DET_PRECIO) || 0;
        sanitizedData.COM_DET_TOTAL = cantidad * precio;
        
        const docRef = await db.collection('TB_COMPRA_DETALLE').add(sanitizedData);
        return docRef.id;
    }

    async updateCompraDetalle(id, detalle) {
        const sanitizedData = this.sanitizeData(detalle);
        
        const cantidad = parseFloat(sanitizedData.COM_DET_CANTIDAD) || 0;
        const precio = parseFloat(sanitizedData.COM_DET_PRECIO) || 0;
        sanitizedData.COM_DET_TOTAL = cantidad * precio;
        
        const db = window.firebaseManager.getDB();
        await db.collection('TB_COMPRA_DETALLE').doc(id).update(sanitizedData);
    }

    async deleteCompraDetalle(id) {
        const db = window.firebaseManager.getDB();
        await db.collection('TB_COMPRA_DETALLE').doc(id).delete();
    }

    async calcularTotalCompra(compraNum) {
        try {
            const detalles = await this.getCompraDetalles(compraNum);
            const total = detalles.reduce((sum, detalle) => {
                const cantidad = parseFloat(detalle.COM_DET_CANTIDAD) || 0;
                const precio = parseFloat(detalle.COM_DET_PRECIO) || 0;
                return sum + (cantidad * precio);
            }, 0);
            return total;
        } catch (error) {
            console.error(`Error calculando total para compra ${compraNum}:`, error);
            return 0;
        }
    }

    async updateCompraTotal(compraId, compraNum) {
        try {
            const comTotal = await this.calcularTotalCompra(compraNum);
            
            const compra = await this.getById('TB_COMPRAS', compraId);
            const flete = parseFloat(compra.COM_FLETE) || 0;
            const aduanas = parseFloat(compra.COM_ADUANAS) || 0;
            
            const totalFinal = comTotal + flete + aduanas;
            
            await this.update('TB_COMPRAS', compraId, {
                COM_TOTAL: comTotal,
                COM_TOTAL_FINAL: totalFinal
            });
            
            console.log(`Totales de compra actualizados - Subtotal: ${comTotal}, Total Final: ${totalFinal}`);
            
            return {
                comTotal,
                totalFinal,
                flete,
                aduanas
            };
            
        } catch (error) {
            console.error('Error actualizando totales de compra:', error);
            throw error;
        }
    }

    async createCompraDetalleWithTotals(detalle, compraId) {
        try {
            console.log('Creando detalle de compra con actualización de totales:', detalle);
            
            const detalleId = await this.createCompraDetalle(detalle);
            
            const totals = await this.updateCompraTotal(compraId, detalle.COM_DET_NUM);
            
            console.log('Detalle creado y totales actualizados:', {
                detalleId,
                totals
            });
            
            return {
                detalleId,
                totals
            };
            
        } catch (error) {
            console.error('Error creando detalle con totales:', error);
            throw error;
        }
    }

    async updateCompraDetalleWithTotals(detalleId, newDetalle, compraId) {
        try {
            console.log('Actualizando detalle con recálculo de totales:', { detalleId, newDetalle });
            
            await this.updateCompraDetalle(detalleId, newDetalle);
            
            const totals = await this.updateCompraTotal(compraId, newDetalle.COM_DET_NUM);
            
            console.log('Detalle actualizado y totales recalculados');
            
            return {
                detalleId,
                totals
            };
            
        } catch (error) {
            console.error('Error actualizando detalle con totales:', error);
            throw error;
        }
    }

    async deleteCompraDetalleWithTotals(detalleId, compraNum, compraId) {
        try {
            console.log('Eliminando detalle con recálculo de totales:', detalleId);
            
            await this.deleteCompraDetalle(detalleId);
            
            const totals = await this.updateCompraTotal(compraId, compraNum);
            
            console.log('Detalle eliminado y totales recalculados:', totals);
            
            return {
                detalleId,
                totals
            };
            
        } catch (error) {
            console.error('Error eliminando detalle con totales:', error);
            throw error;
        }
    }

    async recalculateCompraFinalTotal(compraId) {
        try {
            const compra = await this.getById('TB_COMPRAS', compraId);
            if (!compra) {
                throw new Error('Compra no encontrada');
            }
            
            const comTotal = parseFloat(compra.COM_TOTAL) || 0;
            const flete = parseFloat(compra.COM_FLETE) || 0;
            const aduanas = parseFloat(compra.COM_ADUANAS) || 0;
            const totalFinal = comTotal + flete + aduanas;
            
            const db = window.firebaseManager.getDB();
            await db.collection('TB_COMPRAS').doc(compraId).update({
                COM_TOTAL_FINAL: totalFinal
            });
            
            return {
                comTotal,
                flete,
                aduanas,
                totalFinal
            };
            
        } catch (error) {
            console.error('Error recalculando total final:', error);
            throw error;
        }
    }

    async deleteCompraWithDetails(compraId) {
        const db = window.firebaseManager.getDB();
        
        try {
            console.log(`Eliminando compra ${compraId} y sus detalles...`);
            
            const compraDoc = await db.collection('TB_COMPRAS').doc(compraId).get();
            if (!compraDoc.exists) {
                throw new Error('Compra no encontrada');
            }
            
            const compraData = compraDoc.data();
            const compraNum = compraData.COM_NUM;
            console.log(`Número de compra: ${compraNum}`);
            
            const detallesSnapshot = await db.collection('TB_COMPRA_DETALLE')
                .where('COM_DET_NUM', '==', compraNum)
                .get();
            
            console.log(`Encontrados ${detallesSnapshot.size} detalles para eliminar`);
            
            const batch = db.batch();
            
            detallesSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            batch.delete(db.collection('TB_COMPRAS').doc(compraId));
            
            await batch.commit();
            
            console.log(`Compra ${compraId} y ${detallesSnapshot.size} detalles eliminados exitosamente`);
            
            window.smartCache.invalidate('collection_TB_COMPRAS');
            window.smartCache.invalidate('collection_TB_COMPRA_DETALLE');
            
        } catch (error) {
            console.error('Error en eliminación en cascada de compra:', error);
            throw error;
        }
    }

    

    // NUEVA FUNCIÓN: Verificar y mostrar cambios en tabla de productos
    async verifyProductTableUpdates(inventoryChanges) {
        try {
            console.log('🔍 Verificando cambios en tabla de productos...');
            
            if (!inventoryChanges || (!inventoryChanges.inventoryUpdates && !inventoryChanges.inventoryReverts)) {
                return;
            }
            
            // Obtener cambios de inventario
            const changes = inventoryChanges.inventoryUpdates || inventoryChanges.inventoryReverts || [];
            
            if (changes.length === 0) {
                console.log('ℹ️ No hay cambios de inventario para verificar');
                return;
            }
            
            // Esperar un momento para que se procesen los cambios
            setTimeout(async () => {
                console.log('🔍 Verificando estado actual de productos afectados...');
                
                for (const change of changes) {
                    try {
                        const producto = await this.getById('tb_productos', change.productId);
                        if (producto) {
                            const currentStock = parseFloat(producto.PRO_CANTIDAD) || 0;
                            const expectedStock = change.newStock;
                            
                            console.log(`📊 ${change.productName}: Esperado ${expectedStock}, Actual ${currentStock}`);
                            
                            if (Math.abs(currentStock - expectedStock) > 0.01) {
                                console.warn(`⚠️ Discrepancia en ${change.productName}: esperado ${expectedStock}, actual ${currentStock}`);
                            } else {
                                console.log(`✅ ${change.productName}: Actualización verificada correctamente`);
                            }
                        }
                    } catch (error) {
                        console.error(`❌ Error verificando producto ${change.productId}:`, error);
                    }
                }
                
                // Forzar un refresh final de la tabla de productos
                await this.forceRefreshProductosTable();
                
            }, 500);
            
        } catch (error) {
            console.error('❌ Error verificando actualizaciones de tabla:', error);
        }
    }

    async forceRefreshProductosTable() {
        try {
            console.log('🔄 Forzando actualización específica de tabla de productos...');
            
            // 1. Invalidar cache (solo métodos que existen)
            window.smartCache.invalidate('collection_tb_productos');
            
            // 2. Si hay pagination manager para productos, forzar recarga
            if (window.paginationManagers && window.paginationManagers['productos']) {
                const productosManager = window.paginationManagers['productos'];
                
                console.log('📦 Limpiando cache y recargando tabla de productos...');
                
                // Limpiar cache del manager
                productosManager.clearCache();
                
                // Forzar recarga completa
                if (typeof productosManager.forceReload === 'function') {
                    await productosManager.forceReload();
                } else {
                    // Fallback si no existe forceReload
                    await productosManager.loadPage(1);
                }
                
                console.log('✅ Tabla de productos refrescada exitosamente');
            }
            
            // 3. Si estamos en la pestaña de productos, asegurar que se vea la actualización
            const activeTab = document.querySelector('.nav-btn.active');
            if (activeTab && activeTab.getAttribute('data-tab') === 'productos') {
                console.log('🎯 Usuario está en pestaña de productos - forzando actualización visual');
                
                // Delay pequeño y refresh adicional para asegurar que se vea
                setTimeout(async () => {
                    if (window.paginationManagers && window.paginationManagers['productos']) {
                        await window.paginationManagers['productos'].loadPage(1);
                        console.log('🔄 Refresh visual completado');
                    }
                }, 300);
            }
            
            return { success: true };
            
        } catch (error) {
            console.error('❌ Error forzando refresh de productos:', error);
            return { success: false, error: error.message };
        }
    }
}



    window.forceRefreshProductos = async function() {
        console.log('🔧 Forzando refresh de productos desde consola...');
        
        try {
            // Limpiar cache usando solo métodos disponibles
            window.smartCache.invalidate('collection_tb_productos');
            
            // Forzar recarga si hay manager
            if (window.paginationManagers && window.paginationManagers['productos']) {
                const manager = window.paginationManagers['productos'];
                manager.clearCache();
                
                if (typeof manager.forceReload === 'function') {
                    await manager.forceReload();
                } else {
                    await manager.loadPage(1);
                }
                
                console.log('✅ Refresh forzado completado');
            } else {
                console.warn('⚠️ No se encontró pagination manager para productos');
            }
            
            return true;
        } catch (error) {
            console.error('❌ Error en refresh forzado:', error);
            return false;
        }
    };

    // FUNCIÓN DE EMERGENCIA CORREGIDA
    window.emergencyRefreshProductos = async function() {
        console.log('🚨 REFRESH DE EMERGENCIA PARA PRODUCTOS');
        
        try {
            // Limpiar cache usando métodos disponibles
            if (window.smartCache && typeof window.smartCache.clear === 'function') {
                window.smartCache.clear();
            } else if (window.smartCache && typeof window.smartCache.invalidate === 'function') {
                window.smartCache.invalidate('collection_tb_productos');
            }
            
            // Recargar página completa si es necesario
            const activeTab = document.querySelector('.nav-btn.active');
            if (activeTab && activeTab.getAttribute('data-tab') === 'productos') {
                console.log('🔄 Recargando página completa...');
                location.reload();
            } else {
                // Solo refrescar manager
                if (window.paginationManagers && window.paginationManagers['productos']) {
                    const manager = window.paginationManagers['productos'];
                    manager.clearCache();
                    await manager.loadPage(1);
                }
            }
            
            window.notificationService.success('Tabla de productos refrescada exitosamente');
        } catch (error) {
            console.error('❌ Error en refresh de emergencia:', error);
            window.notificationService.error('Error refrescando productos');
        }
    };


// FUNCIÓN DE DEBUG MEJORADA para verificar estado de productos
window.debugProductosState = async function() {
    console.group('🔍 DEBUG: Estado de Productos');
    
    try {
        // Verificar cache
        const cached = window.smartCache.get('collection_tb_productos');
        console.log('📦 Productos en cache:', cached ? cached.length : 'No cache');
        
        // Verificar base de datos directamente
        const db = window.firebaseManager.getDB();
        const snapshot = await db.collection('tb_productos').get();
        const fromDB = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('🗄️ Productos en BD:', fromDB.length);
        
        // Verificar tabla visual
        const tableBody = document.getElementById('productos-table');
        const visibleRows = tableBody ? tableBody.querySelectorAll('tr').length : 0;
        console.log('👁️ Filas visibles en tabla:', visibleRows);
        
        // Verificar pagination manager
        const manager = window.paginationManagers ? window.paginationManagers['productos'] : null;
        console.log('🔧 Pagination manager presente:', !!manager);
        
        if (manager) {
            console.log('📄 Página actual:', manager.currentPage);
            console.log('📝 Cache del manager:', manager.pageCache.size, 'páginas');
        }
        
        // Mostrar algunos productos para comparar
        if (fromDB.length > 0) {
            console.log('📊 Primeros 3 productos en BD:');
            fromDB.slice(0, 3).forEach(p => {
                console.log(`  - ${p.PRO_NOMBRE}: ${p.PRO_CANTIDAD} unidades a S/ ${p.PRO_PRECIO}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error en debug:', error);
    }
    
    console.groupEnd();
};

// Export globally
window.dataService = new DataService();