import { assert } from 'chai';
import { after, before, describe, it } from 'mocha';
import { base64ToArrayBuffer } from '../../src/convert';
import { equalArrayBuffer } from '../helpers/equal_arraybuffer';
describe('convert', function () {
    before(function () {
        global.atob = function (base64) {
            return Buffer.from(base64, 'base64').toString('binary');
        };
    });
    after(function () {
        delete global.atob;
    });
    it('should convert base64 to an array buffer', function () {
        const base64 = '/9j/4AAQSkZJRgABAQEBLAEsAAD//gATQ3JlYXRlZCB3aXRoIEdJTVD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHB' +
            'wYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUF' +
            'BQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wgARCAAIAAgDAREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAAB//EABQBA' +
            'QAAAAAAAAAAAAAAAAAAAAT/2gAMAwEAAhADEAAAAR4YP//EABUQAQEAAAAAAAAAAAAAAAAAAAUE/9oACAEBAAEFAkZ5Qgv/xAAaEQABB' +
            'QEAAAAAAAAAAAAAAAADAAIEEhMx/9oACAEDAQE/ASxdTNLbi//EABoRAAEFAQAAAAAAAAAAAAAAAAMAAgQREzH/2gAIAQIBAT8BJH0K0' +
            'l8X/8QAIBAAAAUDBQAAAAAAAAAAAAAAAQIDBAURElEAEyEiMf/aAAgBAQAGPwJnsPm8ipIJ3qkJS5sNC9R5HI481//EABgQAAMBAQAAA' +
            'AAAAAAAAAAAAAEhMRGB/9oACAEBAAE/IQ0YtspDtExXn//aAAwDAQACAAMAAAAQv//EABkRAAIDAQAAAAAAAAAAAAAAAAEhABFRQf/aA' +
            'AgBAwEBPxBxhnhd7P/EABgRAAIDAAAAAAAAAAAAAAAAACFRAAER/9oACAECAQE/EDjpWdn/xAAYEAEAAwEAAAAAAAAAAAAAAAABACExE' +
            'f/aAAgBAQABPxBByQFt5joB2jSP/9k=';
        const result = new Int16Array([-9985, -7937, 4096, 17994, 17993, 256, 257, 11265, 11265, 0, -257,
            4864, 29251, 24933, 25972, 8292, 26999, 26740, 18208, 19785, -176, 219, 67, 515, 770, 514, 771, 771, 772,
            1027, 2053, 1285, 1028, 2565, 1799, 2054, 2572, 3084, 2571, 2827, 3597, 4114, 3597, 3601, 2827, 5648, 4368,
            5139, 5397, 3093, 5903, 5656, 6164, 5138, 5141, -9217, 17152, 769, 1028, 1029, 2309, 1285, 5129, 2829,
            5133, 5140, 5140, 5140, 5140, 5140, 5140, 5140, 5140, 5140, 5140, 5140, 5140, 5140, 5140, 5140, 5140, 5140,
            5140, 5140, 5140, 5140, 5140, 5140, 5140, -236, 194, 2065, 2048, 2048, 259, 17, 4354, 769, 273, -15105,
            5120, 256, 0, 0, 0, 0, 0, 0, 0, 1792, -15105, 5120, 257, 0, 0, 0, 0, 0, 0, 0, 1024, -9473, 3072, 259, 512,
            784, 16, 256, 6174, -193, 196, 4117, 257, 0, 0, 0, 0, 0, 0, 0, 1029, -9473, 2048, 257, 256, 517, 31046,
            2882, -15105, 6656, 17, 1281, 1, 0, 0, 0, 0, 0, 768, 512, 4612, 12563, -9473, 2048, 769, 257, 319, 23852,
            -11700, -29733, -15105, 6656, 17, 1281, 1, 0, 0, 0, 0, 0, 768, 512, 4356, 12563, -9473, 2048, 513, 257, 319,
            32036, -11766, 5983, -15105, 8192, 16, 1280, 1283, 0, 0, 0, 0, 0, 256, 770, 1284, 4625, 81, 8467, 12578,
            -9473, 2048, 257, 1536, 575, -20377, -17159, -28022, -8695, 2473, -25781, 2829, 31188, -29156, -10436,
            -15105, 6144, 16, 259, 1, 0, 0, 0, 0, 0, 256, 12577, -32495, -9473, 2048, 257, 256, 8511, 6157, -13642,
            -19389, 22348, -97, 218, 780, 1, 2, 3, 0, -16624, -15105, 6400, 17, 770, 1, 0, 0, 0, 0, 0, 256, 33, 20753,
            -191, 218, 264, 259, 16129, 28944, 30854, -5027, -15105, 6144, 17, 770, 0, 0, 0, 0, 0, 0, 8448, 81, 4353,
            -9473, 2048, 513, 257, 4159, -5832, -9895, -15105, 6144, 272, 768, 1, 0, 0, 0, 0, 0, 256, 8448, 4401, -9473,
            2048, 257, 256, 4159, -14015, 27905, 15078, -9727, -28876, -9729]);
        assert.isTrue(equalArrayBuffer(base64ToArrayBuffer(base64), result.buffer), 'ArrayBuffers do not match');
    });
});
