import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { spawnSync } from 'node:child_process';
for (const root of ['src','tests']) {
  for (const file of fs.readdirSync(root,{recursive:true}).filter(f=>f.endsWith('.ts'))) {
    const input=path.join(root,file), output=path.join('.test-build',root,file.replace(/\.ts$/,'.js'));
    const result=ts.transpileModule(fs.readFileSync(input,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
    const code=result.outputText.replace(/(from\s*|import\s*\()(['"])(\.{1,2}\/[^'"]+)\2/g,(_m,p,q,s)=>p+q+s+(path.extname(s)?'':'.js')+q);
    fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,code);
  }
}
const result=spawnSync(process.execPath,['--test','.test-build/tests/regression.test.js'],{stdio:'inherit'});
process.exit(result.status ?? 1);
