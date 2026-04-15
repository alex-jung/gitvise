// Singleton EventBus for core events.
// Core emits via eventBus.emit(); plugins subscribe via api.on().

type CoreEvent =
  | "github:sync:complete"
  | "github:sync:start"
  | "github:sync:error"
  | "setup:complete"
  | "license:change";

type Handler = (payload?: unknown) => void;
export type Unsubscribe = () => void;

const _listeners = new Map<string, Set<Handler>>();

export const eventBus = {
  emit(event: CoreEvent | string, payload?: unknown): void {
    _listeners.get(event)?.forEach((h) => {
      try {
        h(payload);
      } catch (err) {
        console.error(`[event-bus] Handler error for "${event}":`, err);
      }
    });
  },

  on(event: CoreEvent | string, handler: Handler): Unsubscribe {
    if (!_listeners.has(event)) _listeners.set(event, new Set());
    _listeners.get(event)!.add(handler);
    return () => _listeners.get(event)?.delete(handler);
  },
};
