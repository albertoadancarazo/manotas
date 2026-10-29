// Generate an initial admin INSERT from environment variables; no default credentials.
import fs from 'node:fs';
import ts from 'typescript';
if (!process.env.MANOTAS_ADMIN_EMAIL || !process.env.MANOTAS_ADMIN_PASSWORD || process.env.MANOTAS_ADMIN_PASSWORD.length < 12) throw new Error('Set MANOTAS_ADMIN_EMAIL and MANOTAS_ADMIN_PASSWORD (at least 12 characters).');
const source=fs.readFileSync('src/auth.ts','utf8');
fs.mkdirSync('.test-build',{recursive:true});
fs.writeFileSync('.test-build/admin-auth.js',ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
const { hashPassword }=await import('../.test-build/admin-auth.js');
const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
const hash=await hashPassword(process.env.MANOTAS_ADMIN_PASSWORD);
const sql=`INSERT INTO users (id,name,email,password_hash,role) VALUES (${quote(crypto.randomUUID())},'Administración',${quote(process.env.MANOTAS_ADMIN_EMAIL)},${quote(hash)},'ADMIN');\n`;
if (!process.argv[2]) throw new Error('Specify an output SQL file outside version control.');
fs.writeFileSync(process.argv[2],sql,{mode:0o600});
console.log('Admin SQL generated. Apply to the intended local database after migrations.');
