import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const env = {...process.env, WRANGLER_LOG_PATH: path.resolve('.wrangler/logs'), WRANGLER_SEND_METRICS: 'false'};
if (!env.XDG_CONFIG_HOME && fs.existsSync('.wrangler/auth-config/.wrangler/config/default.toml')) env.XDG_CONFIG_HOME=path.resolve('.wrangler/auth-config');
const result=spawnSync(process.execPath,['--require',path.resolve('scripts/wrangler-wasm.cjs'),path.resolve('node_modules/wrangler/bin/wrangler.js'),...process.argv.slice(2)],{stdio:'inherit',env});
process.exit(result.status ?? 1);
