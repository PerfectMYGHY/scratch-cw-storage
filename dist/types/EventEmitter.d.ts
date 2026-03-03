type EventCallback<T = unknown> = (data: T) => void;
interface EventEmitter {
    on<T>(event: string, callback: EventCallback<T>): void;
    emit<T>(event: string, data?: T): void;
    off<T>(event: string, callback?: EventCallback<T>): void;
    getListeners(): Record<string, EventCallback[]>;
}
/**
 * 创建类型安全的 Event Emitter
 * @returns {EventEmitter} 具有 on/emit/off 方法的 EventEmitter 对象
 */
declare const createEventEmitter: () => EventEmitter;
export { createEventEmitter as default, EventEmitter };
