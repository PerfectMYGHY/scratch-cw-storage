export {};
type EventCallback<T = unknown> = (data: T) => void;
interface ScratchEventEmitter {
    on<T>(event: string, callback: EventCallback<T>): void;
    emit<T>(event: string, data?: T): void;
    off(event: string): void;
}
/**
 * 创建类型安全的 Event Emitter
 * @returns 具有 on/emit/off 方法的 EventEmitter 对象
 */
declare const createEventEmitter: () => ScratchEventEmitter;
export { createEventEmitter as default, type ScratchEventEmitter };
