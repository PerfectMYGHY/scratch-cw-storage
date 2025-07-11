const { Worker } = require('jest-worker');

const {FetchWorkerTool} = require('../../src/FetchWorkerTool');


const {TextDecoder, TextEncoder} = require('util');
const fetchMock = require('jest-fetch-mock');

fetchMock.enableMocks();

const testUrl = 'https://scratch-cw.top:8006/assets/internalapi/asset/fa1d0ad5a317fe048468da8d3cb2c6c7.svg/get/';

const encoding = 'utf-8';
const decoder = new TextDecoder(encoding);
const encoder = new TextEncoder(encoding);

const text = 'Hello! The server responsed! (^_^)';

// 模拟带随机延迟和错误概率的fetch
const mockFetchWithRandomBehavior = () => {
  fetch.mockImplementation(async (url, options) => {
    // 随机延迟 (10-30秒)
    const delay = Math.floor(Math.random() * 21_000) + 10_000;
    await new Promise(resolve => setTimeout(resolve, delay));

    // 7%概率返回500错误
    const shouldFail = Math.random() < 0.07;
    if (shouldFail) {
      return Promise.reject({
        status: 500,
        statusText: 'Internal Server Error'
      });
    }

    // 正常响应 (默认返回Uint8Array)
    return Promise.resolve({
      ok: true,
      status: 200,
      arrayBuffer: async () => encoder.encode(text).buffer
    });
  });
};

beforeEach(() => {
    fetchMock.resetMocks();
    mockFetchWithRandomBehavior(); // 启用自定义mock
});

test('多次请求1(50次)', async () => {
    const tool = new FetchWorkerTool();

    const result = [];
    const tasks = []
    const times = 50;

    for (let i=0;i<times;i++) {
        tasks.push(tool.get({url: testUrl}).then((r) => {
            console.log(`第${i}次结果：`, decoder.decode(r), "====", text)
            result.push(decoder.decode(r) === text);
        }));

    }

    await Promise.all(tasks);

    console.log('最终结果：', result);
    expect(result.every(item => item === true)).toBe(true);
}, 30e3*50);

test('多次请求2(150次)', async () => {
    const tool = new FetchWorkerTool();

    const result = [];
    const tasks = []
    const times = 150;

    for (let i=0;i<times;i++) {
        tasks.push(tool.get({url: testUrl}).then((r) => {
            console.log(`第${i}次结果：`, decoder.decode(r), "====", text)
            result.push(decoder.decode(r) === text);
        }));

    }

    await Promise.all(tasks);

    console.log('最终结果：', result);
    expect(result.every(item => item === true)).toBe(true);
}, 30e3*150);

test('多次请求3(250次)', async () => {
    const tool = new FetchWorkerTool();

    const result = [];
    const tasks = []
    const times = 250;

    for (let i=0;i<times;i++) {
        tasks.push(tool.get({url: testUrl}).then((r) => {
            console.log(`第${i}次结果：`, decoder.decode(r), "====", text)
            result.push(decoder.decode(r) === text);
        }));

    }

    await Promise.all(tasks);

    console.log('最终结果：', result);
    expect(result.every(item => item === true)).toBe(true);
}, 30e3*250);

test('多次请求4(1369次)', async () => {
    const tool = new FetchWorkerTool();

    const result = [];
    const tasks = []
    const times = 1369;

    for (let i=0;i<times;i++) {
        tasks.push(tool.get({url: testUrl}).then((r) => {
            console.log(`第${i}次结果：`, decoder.decode(r), "====", text)
            result.push(decoder.decode(r) === text);
        }));

    }

    await Promise.all(tasks);

    console.log('最终结果：', result);
    expect(result.every(item => item === true)).toBe(true);
}, 30e3*1369);
