import { EventEmitter } from 'events';

export interface IncidentEvent {
  type: 'created' | 'acknowledged' | 'resolved' | 'escalated';
  incident: {
    id: string;
    number: number;
    title: string;
    status: string;
    urgency: string;
    serviceId: string;
    createdAt: string;
    updatedAt: string;
    acknowledgedAt: string | null;
    resolvedAt: string | null;
  };
  timestamp: string;
}

class IncidentEventEmitter extends EventEmitter {
  emitIncidentUpdate(event: IncidentEvent) {
    this.emit('update', event);
  }

  onIncidentUpdate(callback: (event: IncidentEvent) => void) {
    this.on('update', callback);
    return () => {
      this.off('update', callback);
    };
  }
}

const globalForEmitter = globalThis as unknown as {
  incidentEvents: IncidentEventEmitter | undefined;
};

export const incidentEvents =
  globalForEmitter.incidentEvents ?? new IncidentEventEmitter();

// Allow many SSE clients without warning
incidentEvents.setMaxListeners(0);

if (process.env.NODE_ENV !== 'production') {
  globalForEmitter.incidentEvents = incidentEvents;
}
