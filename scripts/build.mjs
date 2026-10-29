import { build } from 'esbuild-wasm';
await build({entryPoints:['src/index.ts'],bundle:true,format:'esm',platform:'browser',target:'es2022',outfile:'dist/index.js',tsconfig:'tsconfig.json',conditions:['workerd','worker','browser']});
