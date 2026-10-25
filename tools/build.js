// يبني من src/filler.src.js + bank.json + curriculum.json:
//   filler.js          — كود التعبئة + خريطة المنهج بس (الزر الصغير بيحمّله)
//   banks/<المسار>.js  — بنك كل مسار لوحده (filler.js بيحمّل بنك الصف اللي في صفحة نور بس)
//   الزر الكامل في index.html — كل البنك جواه
// الاستخدام: node tools/build.js
const fs=require('fs'),path=require('path'),R=p=>path.join(__dirname,'..',p);
const bank=JSON.parse(fs.readFileSync(R('bank.json'),'utf8'));
const todo=bank.filter(b=>JSON.stringify(b).includes('TODO'));
if(todo.length){console.error('❌ فيه دروس لسه فيها TODO:\n'+todo.map(b=>'  '+b.id+' '+b.lesson).join('\n'));process.exit(1);}
const ids=new Set();for(const b of bank){if(ids.has(b.id)){console.error('❌ id مكرر: '+b.id);process.exit(1)}ids.add(b.id)}
const CURR=fs.readFileSync(R('curriculum.json'),'utf8').trim(),tracks=JSON.parse(CURR).map(g=>g.t);
const noTrack=bank.filter(b=>!tracks.includes(b.track));
if(noTrack.length){console.error('❌ دروس من غير track صحيح:\n'+noTrack.map(b=>'  '+b.id).join('\n'));process.exit(1);}
const emb=bank.map(({id,unit,...r})=>r);
const AVAIL=tracks.filter(t=>emb.some(b=>b.track===t));
const H=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
const d=new Date(),ver=H(d.getDate())+'/'+H(d.getMonth()+1)+'/'+H(d.getFullYear())+' — '+H(bank.length)+' درس';
const SRC=fs.readFileSync(R('src/filler.src.js'),'utf8');
const make=b=>SRC.replace('__BANK__',()=>b).replace('__AVAIL__',()=>JSON.stringify(AVAIL)).replace('__CURR__',()=>CURR).replace('__VER__',()=>ver);
let terser=null;try{terser=require('terser')}catch(e){console.warn('⚠ terser مش متسطب (npm install) — الكود هيتكتب من غير ضغط')}
const min=async s=>{if(!terser)return s;try{return (await terser.minify(s,{compress:true,mangle:true})).code}catch(e){console.error('terser:',e.message);return s}};
const KB=s=>Math.round(Buffer.byteLength(s,'utf8')/1024)+' KB';

(async()=>{
  const small=await min(make('null')),full=await min(make(JSON.stringify(emb)));
  new Function(small);new Function(full); // فحص إن الكود سليم
  fs.writeFileSync(R('filler.js'),small);
  fs.mkdirSync(R('banks'),{recursive:true});
  for(const f of fs.readdirSync(R('banks')))if(/\.js$/.test(f)&&!AVAIL.includes(f.slice(0,-3)))fs.unlinkSync(R('banks/'+f)); // بنوك مسارات اتشالت
  const sizes=AVAIL.map(t=>{const list=emb.filter(b=>b.track===t);
    const js='(window.NOOR_BANK=window.NOOR_BANK||{})['+JSON.stringify(t)+']='+JSON.stringify(list)+';\n';
    new Function(js);fs.writeFileSync(R('banks/'+t+'.js'),js);
    return '  banks/'+t+'.js: '+list.length+' درس، '+KB(js);});
  const bm='javascript:'+full.replace(/%/g,'%25').replace(/#/g,'%23');
  const esc=s=>s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  let idx=fs.readFileSync(R('index.html'),'utf8');
  idx=idx.replace(/<a class="bm alt" href="[^"]*"/,()=> '<a class="bm alt" href="'+esc(bm)+'"');
  fs.writeFileSync(R('index.html'),idx);
  const hw=bank.reduce((a,b)=>a+(b.homework||[]).length,0);
  console.log('✔ اتبنى: '+bank.length+' درس، '+hw+' سؤال واجب\n  filler.js: '+KB(small)+'\n'+sizes.join('\n')+'\n  الزر الكامل: '+KB(full));
})();
