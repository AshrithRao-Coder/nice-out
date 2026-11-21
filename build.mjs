import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const root=new URL('./',import.meta.url),output=new URL('dist/',root);
const files=['index.html','style.css','jokes.js','app.js','manifest.webmanifest','icon-192.png','icon-512.png','icon-maskable.png','_headers'];
const workerPath=new URL('sw.js',root),worker=await readFile(workerPath,'utf8');
const declaration=/const VERSION = "[^"]+";/;
if (!declaration.test(worker)) throw new Error('Missing offline cache version in sw.js');
const hash=createHash('sha256').update(worker.replace(declaration,'const VERSION = "<build>";'));
const contents=await Promise.all(files.map(file=>readFile(new URL(file,root))));
for (let i=0;i<files.length;i++) hash.update(files[i]).update(contents[i]);
const version=`nice-out-${hash.digest('hex').slice(0,16)}`;
const updated=worker.replace(declaration,()=>`const VERSION = "${version}";`);
await mkdir(output,{recursive:true});
await writeFile(workerPath,updated);
await Promise.all([
  ...files.map(file=>copyFile(new URL(file,root),new URL(file,output))),
  writeFile(new URL('sw.js',output),updated),
]);
console.log(`Built NiceOut in dist/ (${version}).`);
