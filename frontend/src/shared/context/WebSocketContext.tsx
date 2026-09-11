import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export interface WebSocketMessagePayload {
  model: string;
  action: 'create' | 'update' | 'delete' | string;
  [key: string]: any;
}

export interface WebSocketContextType {
  isConnected: boolean;
  isConnecting: boolean;
  subscribe: (callback: (payload: WebSocketMessagePayload) => void) => () => void;
  send: (data: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

const MODEL_TRANSLATIONS: Record<string, string> = {
  // Vehículos
  'Vehicle': 'Vehículo',
  'VehicleTrip': 'Control de salida / Viaje',
  'VehicleFuelLog': 'Vale de combustible',
  'VehicleRegistrationRecord': 'Matrícula vehicular',
  'VehicleMaintenance': 'Mantenimiento vehicular',
  'VehicleMaintenanceRecord': 'Registro de mantenimiento',
  'DriverProfile': 'Perfil de conductor',
  'VehicleSupplier': 'Proveedor vehicular',
  'FuelBudget': 'Presupuesto de combustible',
  'DriverVehicleHandover': 'Acta de entrega / recepción',

  // Inventario Tecnológico
  'Product': 'Producto tecnológico',
  'Department': 'Departamento',
  'Category': 'Categoría',
  'Supplier': 'Proveedor',
  'MaintenanceLog': 'Mantenimiento tecnológico',

  // Inventario de Mobiliario
  'FurnitureProduct': 'Mueble',
  'FurnitureDepartment': 'Departamento de mobiliario',
  'FurnitureCategory': 'Categoría de mobiliario',
  'FurnitureSupplier': 'Proveedor de mobiliario',
  'FurnitureMaintenanceLog': 'Mantenimiento de muebles',

  // Prácticas de Conducción y Educación
  'LearningPhase': 'Fase de aprendizaje',
  'PhaseActivity': 'Actividad académica',
  'GradeTemplate': 'Plantilla de calificaciones',
  'StudentEvaluation': 'Evaluación de estudiante',
  'PracticalAttendance': 'Asistencia práctica',
  'InstructorSchedule': 'Horario de instructor',
  'WeeklyInstructorReport': 'Reporte semanal de instructor',

  // Administración y Core
  'User': 'Usuario',
  'Role': 'Rol de usuario',
  'SystemSettings': 'Configuración del sistema',
};

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const subscribersRef = useRef<Set<(payload: WebSocketMessagePayload) => void>>(new Set());
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const subscribe = useCallback((callback: (payload: WebSocketMessagePayload) => void) => {
    subscribersRef.current.add(callback);
    return () => {
      subscribersRef.current.delete(callback);
    };
  }, []);

  const send = useCallback((data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setIsConnecting(true);
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/inventory/?ngrok-skip-browser-warning=true`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        console.log('[WebSocket] Conectado al servidor en tiempo real');

        // Setup ping heartbeat every 30s
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'inventory_update' && data.message) {
            const payload: WebSocketMessagePayload = data.message;
            const actionText = payload.action === 'create' ? 'creado/a' : (payload.action === 'update' ? 'actualizado/a' : 'eliminado/a');
            const rawModel = payload.model || 'Registro';
            const modelText = MODEL_TRANSLATIONS[rawModel] || rawModel;

            toast.dismiss('ws-update');
            toast.success(`${modelText} ${actionText} en tiempo real. Sincronizando datos...`, {
              id: 'ws-update',
              duration: 2500,
            });

            // Dispatch to all active subscribers
            subscribersRef.current.forEach((cb) => {
              try {
                cb(payload);
              } catch (err) {
                console.error('[WebSocket Subscriber Error]', err);
              }
            });
          }
        } catch (e) {
          console.error('[WebSocket Message Parse Error]', e);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket Error]', error);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

        console.log('[WebSocket] Desconectado. Reconectando en 3 segundos...');
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };
    } catch (err) {
      console.error('[WebSocket Connection Error]', err);
      setIsConnected(false);
      setIsConnecting(false);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000);
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return (
    <WebSocketContext.Provider value={{ isConnected, isConnecting, subscribe, send }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (onUpdate?: (payload?: WebSocketMessagePayload) => void) => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket debe usarse dentro de un WebSocketProvider');
  }

  const savedCallback = useRef(onUpdate);

  useEffect(() => {
    savedCallback.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!savedCallback.current) return;

    const unsubscribe = context.subscribe((payload) => {
      if (savedCallback.current) {
        savedCallback.current(payload);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [context]);

  return context;
};
