// 定义事件回调类型（使用泛型支持不同事件的 data 类型）
type EventCallback<T = unknown> = (data: T) => void;

// 定义 Emitter 类型接口
interface EventEmitter {
    on<T>(event: string, callback: EventCallback<T>): void;
    emit<T>(event: string, data?: T): void;
    off<T>(event: string, callback?: EventCallback<T>): void;
    // Test
    getListeners(): Record<string, EventCallback[]>;
}

/**
 * 创建类型安全的 Event Emitter
 * @returns {EventEmitter} 具有 on/emit/off 方法的 EventEmitter 对象
 */
const createEventEmitter = (): EventEmitter => {
    // 使用类型断言初始化 listeners 对象
    const listeners: Record<string, EventCallback[]> = {};

    return {
        on<T> (event: string, callback: EventCallback<T>) {
            if (!listeners[event]) {
                listeners[event] = [];
            }
            // 这里需要类型断言，因为同一个事件允许不同泛型类型的回调
            listeners[event].push(callback as EventCallback);
        },

        emit<T> (event: string, data?: T) {
            (listeners[event] || []).forEach(callback => {
                // 使用 T 类型来兼容不同泛型的回调
                callback(data as T);
            });
        },

        off<T> (event: string, callback?: EventCallback<T>) {
            if (callback) {
                listeners[event] = listeners[event].filter(cb => cb !== callback as EventCallback);
            } else {
                delete listeners[event];
            }
        },
        
        getListeners() {
            return listeners;
        }
    };
};

// 使用 export 语法（需要配置 tsconfig.json 的 module 为 CommonJS）
export {
    createEventEmitter as default,
    EventEmitter
};
