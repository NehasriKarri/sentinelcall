import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.dirname(new URL(import.meta.url).pathname);process.chdir(root);
const assets={};async function walk(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())await walk(p);else if(!e.name.endsWith('.md')){const name='/'+path.relative('../frontend',p);const buf=await fs.readFile(p);assets[name]={base64:buf.toString('base64'),type:({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.svg':'image/svg+xml'})[path.extname(p)]||'application/octet-stream'};}}}
await walk('../frontend');assets['/config.js']={base64:Buffer.from('window.SENTINELCALL_CONFIG={API_BASE:window.location.origin};').toString('base64'),type:'text/javascript'};
const engine=await fs.readFile('worker/engine.mjs','utf8'),data=await fs.readFile('worker/data.json','utf8');
const server=`${engine}\nconst data=${data};const engine=createEngine(data);const assets=${JSON.stringify(assets)};\n`+await fs.readFile('worker/router.mjs','utf8');
await fs.mkdir('dist/server',{recursive:true});await fs.mkdir('dist/.openai',{recursive:true});await fs.writeFile('dist/server/index.js',server);await fs.copyFile('.openai/hosting.json','dist/.openai/hosting.json');console.log('Built same-origin website and API');
