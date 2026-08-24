import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

export const useInventoryWebSocket = (onUpdate: () => void) => {
    const ws = useRef<WebSocket | null>(null);
    const savedOnUpdate = useRef(onUpdate);

    // Update the ref each render so if it changes, the newest callback is invoked
    useEffect(() => {
        savedOnUpdate.current = onUpdate;
    }, [onUpdate]);

    useEffect(() => {
        let reconnectTimeout: ReturnType<typeof setTimeout>;
        let isComponentMounted = true;

        const connect = () => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host;
            const wsUrl = `${protocol}//${host}/ws/inventory/?ngrok-skip-browser-warning=true`;

            ws.current = new WebSocket(wsUrl);

            ws.current.onopen = () => {
                console.log('WebSocket Connected');
            };

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'inventory_update') {
                        const actionText = data.message.action === 'create' ? 'creado' : (data.message.action === 'update' ? 'actualizado' : 'eliminado');
                        const rawModel = data.message.model || 'Registro';

                        const modelTranslations: { [key: string]: string } = {
                            'Vehicle': 'Vehículo',
                            'VehicleTrip': 'Viaje',
                            'VehicleFuelLog': 'Vale de combustible',
                            'VehicleRegistrationRecord': 'Matrícula',
                            'VehicleMaintenance': 'Mantenimiento',
                            'VehicleMaintenanceRecord': 'Registro de mantenimiento',
                            'DriverProfile': 'Conductor',
                            'VehicleSupplier': 'Proveedor',
                            'Product': 'Producto',
                            'Department': 'Departamento',
                            'Category': 'Categoría',
                            'Supplier': 'Proveedor',
                            'FurnitureProduct': 'Mueble',
                            'FurnitureDepartment': 'Departamento',
                            'FurnitureCategory': 'Categoría',
                            'FurnitureSupplier': 'Proveedor'
                        };

                        const modelText = modelTranslations[rawModel] || rawModel;
                        
                        // Clear any existing WebSocket toast to prevent stuck/hanging alerts
                        toast.dismiss('ws-update');
                        toast.success(`${modelText} ${actionText}. Refrescando datos...`, {
                            id: 'ws-update', 
                            duration: 2500,
                        });
                        
                        if (savedOnUpdate.current) {
                            savedOnUpdate.current();
                        }
                    }
                } catch (e) {
                    console.error('Error processing WebSocket message:', e);
                }
            };

            ws.current.onerror = (error) => {
                // Ignore errors if component is unmounted
                if (isComponentMounted) {
                    console.error('WebSocket Error:', error);
                }
            };

            ws.current.onclose = () => {
                if (isComponentMounted) {
                    console.log('WebSocket Disconnected. Intentando reconectar en 3 segundos...');
                    reconnectTimeout = setTimeout(connect, 3000);
                }
            };
        };

        connect();

        return () => {
            isComponentMounted = false;
            clearTimeout(reconnectTimeout);
            if (ws.current) {
                // If connecting, closing it throws a harmless browser warning in dev mode.
                ws.current.close();
            }
        };
    }, []);
};

