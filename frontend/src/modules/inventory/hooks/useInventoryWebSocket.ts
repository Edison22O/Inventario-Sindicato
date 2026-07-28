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
            const wsUrl = `${protocol}//${host}/ws/inventory/`;

            ws.current = new WebSocket(wsUrl);

            ws.current.onopen = () => {
                console.log('WebSocket Connected');
            };

            ws.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'inventory_update') {
                    const actionText = data.message.action === 'create' ? 'creado' : (data.message.action === 'update' ? 'actualizado' : 'eliminado');
                    const modelText = data.message.model;
                    
                    toast.success(`${modelText} ${actionText}. Refrescando datos...`, {
                        id: 'ws-update', 
                        duration: 2000,
                    });
                    
                    if (savedOnUpdate.current) {
                        savedOnUpdate.current();
                    }
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

