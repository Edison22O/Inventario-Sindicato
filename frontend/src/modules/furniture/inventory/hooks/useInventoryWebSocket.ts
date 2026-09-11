import { useWebSocket } from '@/shared/context/WebSocketContext';

export const useInventoryWebSocket = (onUpdate: () => void) => {
  useWebSocket(() => {
    if (onUpdate) {
      onUpdate();
    }
  });
};
