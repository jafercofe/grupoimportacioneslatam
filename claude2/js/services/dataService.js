class DataService {
    constructor() {
        this.collections = {
            'cliente': 'clientes',
            'empleado': 'empleados',
            'producto': 'tb_productos',
            'pedido': 'tb_pedido',
            'pedido-detalle': 'tb_pedido_detalle',
            'compra': 'TB_COMPRAS',                    // NUEVO
            'compra-detalle': 'TB_COMPRA_DETALLE',      // NUEVO
            'proveedor': 'TB_PROVEEDORES',
            'estado': 'TB_ESTADO',
            'entrega': 'entregas',
            'tipo-contacto': 'tipos_contacto',
            'tipo-pago': 'tipos_pago',
            'tipo-trabajador': 'tipos_trabajador'
        };
    }

    getCollectionName(type) {
        return this.collections[type] || type;
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
        const sanitizedData = this.sanitizeData(data);
        const db = window.firebaseManager.getDB();
        
        const docRef = await db.collection(collectionName).add(sanitizedData);
        window.smartCache.invalidate(`collection_${collectionName}`);
        
        return docRef.id;
    }

    async update(collectionName, id, data) {
        const sanitizedData = this.sanitizeData(data);
        const db = window.firebaseManager.getDB();
        
        await db.collection(collectionName).doc(id).update(sanitizedData);
        window.smartCache.invalidate(`collection_${collectionName}`);
    }

    async delete(collectionName, id) {
        const db = window.firebaseManager.getDB();
        
        if (collectionName === 'tb_pedido') {
            await this.deletePedidoWithDetails(id);
        } else if (collectionName === 'TB_COMPRAS') {
            // NUEVO: Eliminación en cascada para compras
            await this.deleteCompraWithDetails(id);
        } else {
            await db.collection(collectionName).doc(id).delete();
        }
        
        window.smartCache.invalidate(`collection_${collectionName}`);
    }

    // NUEVA FUNCIÓN: Eliminar pedido y sus detalles
    async deletePedidoWithDetails(pedidoId) {
        const db = window.firebaseManager.getDB();
        
        try {
            console.log(`Eliminando pedido ${pedidoId} y sus detalles...`);
            
            // 1. Obtener el pedido para conseguir el número
            const pedidoDoc = await db.collection('tb_pedido').doc(pedidoId).get();
            if (!pedidoDoc.exists) {
                throw new Error('Pedido no encontrado');
            }
            
            const pedidoData = pedidoDoc.data();
            const pedidoNum = pedidoData.PED_NUM;
            console.log(`Número de pedido: ${pedidoNum}`);
            
            // 2. Obtener todos los detalles para devolver stock
            const detallesSnapshot = await db.collection('tb_pedidos_detalle')
                .where('PED_DET_NUM', '==', pedidoNum)
                .get();
            
            console.log(`Encontrados ${detallesSnapshot.size} detalles, devolviendo stock...`);
            
            // 3. Devolver stock de cada producto
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
            
            // 4. Eliminar detalles y pedido usando batch
            const batch = db.batch();
            
            detallesSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            batch.delete(db.collection('tb_pedido').doc(pedidoId));
            
            await batch.commit();
            
            console.log(`Pedido ${pedidoId} eliminado y stock devuelto:`, stockUpdates);
            
            // 5. Invalidar caches relacionados
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
            console.log(`Tipo de dato: ${typeof pedidoNum}`);
            
            const db = window.firebaseManager.getDB();
            const snapshot = await db.collection('tb_pedidos_detalle')
                .where('PED_DET_NUM', '==', pedidoNum)
                .get();
            
            console.log(`Documentos encontrados: ${snapshot.size}`);
            
            if (snapshot.empty) {
                console.log('No se encontraron detalles para este pedido');
                
                // Verificar si existe la colección y qué datos tiene
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

    // ===== NUEVAS FUNCIONES DE MANEJO DE INVENTARIO =====

    async updateProductStock(productId, quantityUsed, operation = 'subtract') {
        try {
            console.log(`Actualizando stock: Producto ${productId}, Cantidad ${quantityUsed}, Operación: ${operation}`);
            
            // Obtener producto actual
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
            
            // Actualizar stock en la base de datos
            await this.update('tb_productos', productId, {
                PRO_CANTIDAD: newStock
            });
            
            console.log(`Stock actualizado: ${currentStock} -> ${newStock}`);
            
            // Invalidar cache del producto
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
            
            // Validar stock antes de crear el detalle
            const product = await this.getById('tb_productos', detalle.PED_DET_ID);
            if (!product) {
                throw new Error('Producto no encontrado');
            }
            
            const currentStock = parseFloat(product.PRO_CANTIDAD) || 0;
            const quantityRequested = parseFloat(detalle.PED_DET_CANTIDAD) || 0;
            
            if (currentStock < quantityRequested) {
                throw new Error(`Stock insuficiente. Stock disponible: ${currentStock}, Cantidad solicitada: ${quantityRequested}`);
            }
            
            // Crear el detalle del pedido
            const detalleId = await this.createPedidoDetalle(detalle);
            
            // Actualizar stock del producto
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
            
            // Obtener detalle actual para comparar cantidades
            const currentDetalle = await this.getById('tb_pedidos_detalle', detalleId);
            if (!currentDetalle) {
                throw new Error('Detalle de pedido no encontrado');
            }
            
            const oldQuantity = parseFloat(currentDetalle.PED_DET_CANTIDAD) || 0;
            const newQuantity = parseFloat(newDetalle.PED_DET_CANTIDAD) || 0;
            const productId = currentDetalle.PED_DET_ID;
            
            // Si cambió la cantidad, ajustar inventario
            if (oldQuantity !== newQuantity) {
                const quantityDifference = newQuantity - oldQuantity;
                
                if (quantityDifference > 0) {
                    // Aumentó la cantidad - verificar stock disponible
                    const product = await this.getById('tb_productos', productId);
                    const currentStock = parseFloat(product.PRO_CANTIDAD) || 0;
                    
                    if (currentStock < quantityDifference) {
                        throw new Error(`Stock insuficiente para el aumento. Stock disponible: ${currentStock}, Aumento solicitado: ${quantityDifference}`);
                    }
                    
                    // Restar la diferencia del stock
                    await this.updateProductStock(productId, quantityDifference, 'subtract');
                } else {
                    // Disminuyó la cantidad - devolver stock
                    const quantityToReturn = Math.abs(quantityDifference);
                    await this.updateProductStock(productId, quantityToReturn, 'add');
                }
            }
            
            // Actualizar el detalle
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
            
            // Obtener detalle antes de eliminarlo para devolver stock
            const detalle = await this.getById('tb_pedidos_detalle', detalleId);
            if (!detalle) {
                throw new Error('Detalle de pedido no encontrado');
            }
            
            const quantity = parseFloat(detalle.PED_DET_CANTIDAD) || 0;
            const productId = detalle.PED_DET_ID;
            
            // Eliminar el detalle
            await this.deletePedidoDetalle(detalleId);
            
            // Devolver stock al inventario
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

    // Función para obtener productos con stock bajo
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

    // Función para obtener reporte de movimientos de inventario
    async getInventoryMovements(productId = null, days = 30) {
        try {
            // Esta función podría implementarse para obtener historial de cambios
            // Por ahora retornamos información básica
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
        // Procesar datos especiales para estados
        if (collectionName === 'TB_ESTADO') {
            // Asegurar que tenga el formato correcto para estados
            const processedData = {
                EST_DESCRIP: data.descripcion || data.EST_DESCRIP || '',
                descripcion: data.descripcion || data.EST_DESCRIP || ''
            };
            const sanitizedData = this.sanitizeData(processedData);
            
            const db = window.firebaseManager.getDB();
            await db.collection(collectionName).doc(id).update(sanitizedData);
            window.smartCache.invalidate(`collection_${collectionName}`);
        } else {
            // Proceso normal para otros tipos
            const sanitizedData = this.sanitizeData(data);
            const db = window.firebaseManager.getDB();
            
            await db.collection(collectionName).doc(id).update(sanitizedData);
            window.smartCache.invalidate(`collection_${collectionName}`);
        }
    }

    async getCompraDetalles(compraNum) {
    try {
        console.log(`Consultando detalles para compra: "${compraNum}"`);
        
        const db = window.firebaseManager.getDB();
        const snapshot = await db.collection('TB_COMPRA_DETALLE')
            .where('COM_DET_NUM', '==', compraNum)
            .get();
        
        console.log(`Documentos de detalle encontrados: ${snapshot.size}`);
        
        const detalles = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        console.log('Detalles de compra procesados:', detalles);
        return detalles;
    } catch (error) {
        console.error('Error getting compra detalles:', error);
        return [];
    }
}

async createCompraDetalle(detalle) {
    const sanitizedData = this.sanitizeData(detalle);
    const db = window.firebaseManager.getDB();
    
    // Calcular COM_DET_TOTAL automáticamente
    const cantidad = parseFloat(sanitizedData.COM_DET_CANTIDAD) || 0;
    const precio = parseFloat(sanitizedData.COM_DET_PRECIO) || 0;
    sanitizedData.COM_DET_TOTAL = cantidad * precio;
    
    const docRef = await db.collection('TB_COMPRA_DETALLE').add(sanitizedData);
    return docRef.id;
}

async updateCompraDetalle(id, detalle) {
    const sanitizedData = this.sanitizeData(detalle);
    
    // Calcular COM_DET_TOTAL automáticamente
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
        // Obtener el total de los detalles
        const comTotal = await this.calcularTotalCompra(compraNum);
        
        // Obtener datos actuales de la compra para flete y aduanas
        const compra = await this.getById('TB_COMPRAS', compraId);
        const flete = parseFloat(compra.COM_FLETE) || 0;
        const aduanas = parseFloat(compra.COM_ADUANAS) || 0;
        
        // Calcular total final
        const totalFinal = comTotal + flete + aduanas;
        
        // Actualizar en la base de datos
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

// Función para crear detalle de compra con actualización automática de totales
async createCompraDetalleWithTotals(detalle, compraId) {
    try {
        console.log('Creando detalle de compra con actualización de totales:', detalle);
        
        // Crear el detalle
        const detalleId = await this.createCompraDetalle(detalle);
        
        // Actualizar totales de la compra
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

// Función para actualizar detalle de compra con recálculo de totales
async updateCompraDetalleWithTotals(detalleId, newDetalle, compraId) {
    try {
        console.log('Actualizando detalle con recálculo de totales:', { detalleId, newDetalle });
        
        // Actualizar el detalle
        await this.updateCompraDetalle(detalleId, newDetalle);
        
        // Recalcular totales de la compra
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

// Función para eliminar detalle con recálculo de totales
async deleteCompraDetalleWithTotals(detalleId, compraNum, compraId) {
    try {
        console.log('Eliminando detalle con recálculo de totales:', detalleId);
        
        // Eliminar el detalle
        await this.deleteCompraDetalle(detalleId);
        
        // Recalcular totales de la compra
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

// Función para recalcular COM_TOTAL_FINAL cuando cambien flete o aduanas
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
            
            await this.update('TB_COMPRAS', compraId, {
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
            
            // 1. Obtener la compra para conseguir el número
            const compraDoc = await db.collection('TB_COMPRAS').doc(compraId).get();
            if (!compraDoc.exists) {
                throw new Error('Compra no encontrada');
            }
            
            const compraData = compraDoc.data();
            const compraNum = compraData.COM_NUM;
            console.log(`Número de compra: ${compraNum}`);
            
            // 2. Eliminar todos los detalles asociados
            const detallesSnapshot = await db.collection('TB_COMPRA_DETALLE')
                .where('COM_DET_NUM', '==', compraNum)
                .get();
            
            console.log(`Encontrados ${detallesSnapshot.size} detalles para eliminar`);
            
            // 3. Usar batch para eliminar todo
            const batch = db.batch();
            
            detallesSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            batch.delete(db.collection('TB_COMPRAS').doc(compraId));
            
            await batch.commit();
            
            console.log(`Compra ${compraId} y ${detallesSnapshot.size} detalles eliminados exitosamente`);
            
            // 4. Invalidar caches relacionados
            window.smartCache.invalidate('collection_TB_COMPRAS');
            window.smartCache.invalidate('collection_TB_COMPRA_DETALLE');
            
        } catch (error) {
            console.error('Error en eliminación en cascada de compra:', error);
            throw error;
        }
    }

}

// Export globally
window.dataService = new DataService();