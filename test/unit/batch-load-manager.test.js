const BatchLoadManager = require('../../src/BatchLoadManager').default;

const wait = (milliseconds) => new Promise((resolve, reject) => {
    setTimeout(resolve, milliseconds);
});

test('添加单个任务', async () => {
    const manager = new BatchLoadManager();

    let result = false;

    manager.addTask(() => new Promise((resolve, reject) => {
        console.log("===========任务1开始");
        wait(1500).then(() => {
            result = true;
            console.log("任务1完成");
            resolve(new Uint8Array([1, 2, 3]));
        })
    }));

    await manager.waitAllDone();

    expect(result).toBe(true);
});

test('添加多个任务1(50个)', async () => {
    const manager = new BatchLoadManager();

    let results = [];
    const total = 50;

    for (let i=0;i<total;i++) {
        manager.addTask(() => new Promise((resolve, reject) => {
            console.log(`===========任务${i + 1}开始`);
            wait(1500).then(()=>{
                results.push(true);
                console.log(`任务${i + 1}完成`);
                resolve(new Uint8Array([1, 2, 3]));
            })
        }));
    }

    await manager.waitAllDone();

    // 断言长度为50
    expect(results).toHaveLength(total);
    // 断言所有元素为true
    expect(results.every(item => item === true)).toBe(true);
});

test('添加多个任务2(150个)', async () => {
    const manager = new BatchLoadManager();

    let results = [];
    const total = 150;

    for (let i=0;i<total;i++) {
        manager.addTask(() => new Promise((resolve, reject) => {
            console.log(`===========任务${i + 1}开始`);
            wait(1500).then(()=>{
                results.push(true);
                console.log(`任务${i + 1}完成`);
                resolve(new Uint8Array([1, 2, 3]));
            })
        }));
    }

    await manager.waitAllDone();

    // 断言长度为150
    expect(results).toHaveLength(total);
    // 断言所有元素为true
    expect(results.every(item => item === true)).toBe(true);
});

test('添加多个任务3(250个)', async () => {
    const manager = new BatchLoadManager();

    let results = [];
    const total = 250;

    for (let i=0;i<total;i++) {
        manager.addTask(() => new Promise((resolve, reject) => {
            console.log(`===========任务${i + 1}开始`);
            wait(1500).then(()=>{
                results.push(true);
                console.log(`任务${i + 1}完成`);
                resolve(new Uint8Array([1, 2, 3]));
            })
        }));
    }

    await manager.waitAllDone();

    // 断言长度为250
    expect(results).toHaveLength(total);
    // 断言所有元素为true
    expect(results.every(item => item === true)).toBe(true);
});

test('添加多个任务4(1369个)', async () => {
    const manager = new BatchLoadManager();

    let results = [];
    const total = 1369;

    for (let i=0;i<total;i++) {
        manager.addTask(() => new Promise((resolve, reject) => {
            console.log(`===========任务${i + 1}开始`);
            wait(1500).then(()=>{
                results.push(true);
                console.log(`任务${i + 1}完成`);
                resolve(new Uint8Array([1, 2, 3]));
            })
        })).then((data) => {
            console.log(`任务${i + 1}结果：`, data);
        });
    }

    await manager.waitAllDone();

    // 断言长度为1369
    expect(results).toHaveLength(total);
    // 断言所有元素为true
    expect(results.every(item => item === true)).toBe(true);
}, 60e3);