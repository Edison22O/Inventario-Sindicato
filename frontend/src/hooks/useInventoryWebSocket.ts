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
        // Usa la ruta en la que está escuchando Nginx
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
                
                // Trigger the latest callback to refetch data
                if (savedOnUpdate.current) {
                    savedOnUpdate.current();
                }
            }
        };

        ws.current.onerror = (error) => {
            console.error('WebSocket Error:', error);
        };

        ws.current.onclose = () => {
            console.log('WebSocket Disconnected. Reconnecting...');
        };

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, []); // Empty dependency array means the WebSocket connects only once per component mount
};
