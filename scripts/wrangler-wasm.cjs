// Use the same portable esbuild implementation as the project build.
const wasm = require('esbuild-wasm');
const id = require.resolve('esbuild');
require(id);
require.cache[id].exports = wasm;
