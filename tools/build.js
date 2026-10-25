// يبني filler.js من src/filler.src.js + bank.json + curriculum.json، ويحدّث الزر الكامل في index.html
// الاستخدام: node tools/build.js
const fs=require('fs'),path=require('path'),R=p=>path.join(__dirname,'..',p);
const bank=JSON.parse(fs.readFileSync(R('bank.json'),'utf8'));
const todo=bank.filter(b=>JSON.stringify(b).includes('TODO'));
if(todo.length){console.error('❌ فيه دروس لسه فيها TODO:\n'+todo.map(b=>'  '+b.id+' '+b.lesson).join('\n'));process.exit(1);}
const ids=new Set();for(const b of bank){if(ids.has(b.id)){console.error('❌ id مكرر: '+b.id);process.exit(1)}ids.add(b.id)}
const emb=bank.map(({id,unit,...r})=>r);
const H=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
const d=new Date(),ver=H(d.getDate())+'/'+H(d.getMonth()+1)+'/'+H(d.getFullYear())+' — '+H(bank.length)+' درس';
let src=fs.readFileSync(R('src/filler.src.js'),'utf8').replace('__BANK__',JSON.stringify(emb)).replace('__CURR__',fs.readFileSync(R('curriculum.json'),'utf8').trim()).replace('__VER__',ver);
let out=src;
try{const {minify}=require('terser');out=null;minify(src,{compress:true,mangle:true}).then(r=>finish(r.code)).catch(e=>{console.error('terser:',e.message);finish(src)});}catch(e){finish(src)}
function finish(code){ if(out===null||code){out=code}
  new Function(out); // فحص إن الكود سليم
  fs.writeFileSync(R('filler.js'),out);
  const bm='javascript:'+out.replace(/%/g,'%25').replace(/#/g,'%23');
  const esc=s=>s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  let idx=fs.readFileSync(R('index.html'),'utf8');
  idx=idx.replace(/<a class="bm alt" href="[^"]*"/,()=> '<a class="bm alt" href="'+esc(bm)+'"');
  fs.writeFileSync(R('index.html'),idx);
  const hw=bank.reduce((a,b)=>a+(b.homework||[]).length,0);
  console.log('✔ filler.js اتبنى: '+bank.length+' درس، '+hw+' سؤال واجب، '+Math.round(out.length/1024)+' KB');
}
