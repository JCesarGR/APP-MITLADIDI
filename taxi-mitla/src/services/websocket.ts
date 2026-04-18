import { API_BASE_URL } from './api';

type MessageHandler = (data: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connectChofer(choferId: string) {
    return this.connect(`/choferes/ws/${choferId}`, 'chofer');
  }

  connectTracking(viajeId: string) {
    return this.connect(`/viajes/${viajeId}/websocket`, 'tracking');
  }

  private connect(path: string, type: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.disconnect();
    }

    const wsUrl = API_BASE_URL.replace('http', 'ws') + path;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log(`WebSocket conectado: ${type}`);
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.notifyHandlers(data.type || 'message', data);
      } catch (e) {
        console.error('Error al parsear mensaje WebSocket:', e);
      }
    };

    this.ws.onerror = (error) => {
      console.error('Error WebSocket:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket desconectado');
      this.attemptReconnect(path, type);
    };
  }

  private attemptReconnect(path: string, type: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconectando... intento ${this.reconnectAttempts}`);
      setTimeout(() => this.connect(path, type), this.reconnectDelay * this.reconnectAttempts);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.handlers.clear();
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  sendLocation(lat: number, lng: number) {
    this.send({ type: 'location', lat, lng });
  }

  on(event: string, handler: MessageHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)?.add(handler);
  }

  off(event: string, handler: MessageHandler) {
    this.handlers.get(event)?.delete(handler);
  }

  private notifyHandlers(event: string, data: any) {
    this.handlers.get(event)?.forEach((handler) => handler(data));
    this.handlers.get('message')?.forEach((handler) => handler(data));
  }
}

export const wsService = new WebSocketService();
