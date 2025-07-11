const TextDecoder = require('util').TextDecoder;

// jest.mock('cross-fetch');
// const mockFetch = require('cross-fetch');
const fetchMock = require('jest-fetch-mock');

fetchMock.enableMocks();

const a200testUrl = 'https://scratch-cw.top:8006/assets/internalapi/asset/fa1d0ad5a317fe048468da8d3cb2c6c7.svg/get/';
const a404testUrl = 'https://scratch-cw.top:8006/assets/internalapi/asset/dsfdsfdsfgdsfgdsgdfsgrgrhhhhhher.svg/get/';
const {FetchTool} = require('../../src/FetchTool');

beforeEach(() => {
    fetchMock.resetMocks();
});

test('send success returns response.text()', async () => {
    const tool = new FetchTool();

    const result = await tool.send({url: a200testUrl});
    expect(result).toBe(fetchMock.successText);
});

test('send failure returns response.status', async () => {
    const tool = new FetchTool();

    const catcher = jest.fn();

    try {
        await tool.send({url: a404testUrl});
    } catch (e) {
        catcher(e);
    }

    expect(catcher).toHaveBeenCalledWith(500);
});

test('get success returns Uint8Array.body(response.arrayBuffer())', async () => {
    const encoding = 'utf-8';
    const decoder = new TextDecoder(encoding);

    const tool = new FetchTool();

    const result = await tool.get({url: a200testUrl});
    expect(decoder.decode(result)).toBe(fetchMock.successText);
});

test('get with 404 response returns null data', async () => {
    const tool = new FetchTool();

    const result = await tool.get({url: a404testUrl});
    expect(result).toBeNull();
});

test('get failure returns response.status', async () => {
    const tool = new FetchTool();
    const catcher = jest.fn();

    try {
        await tool.get({url: a404testUrl});
    } catch (e) {
        catcher(e);
    }

    expect(catcher).toHaveBeenCalledWith(500);
});
