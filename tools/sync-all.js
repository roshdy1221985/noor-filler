// «حدّث كل البنوك»: يلف على ريبوهات المراجعات في reviews.json ويحدّث البنك من ملفات unitN.html
// الاستخدام: node tools/sync-all.js
//   • وحدة جديدة (مش في البنك)        ← تتسحب بـ import-app.js برابطها على github.io
//   • وحدة ملفها اتغير (البصمة في sources.json) ← تتسحب تاني، والأهداف والتمهيد اللي اتكتبوا بيفضلوا
//   • وحدة متغيرتش                      ← متتلمسش
//   • وحدة دخلت البنك بطريقة تانية قبل import-app (زي الثاني عشر أساسي) ← محمية: بيسجّل بصمتها بس، ولو اتغيرت بينبّه من غير ما يسحب
// الفصل بيتحدد من curriculum.json برقم الوحدة. الريبوهات بتتنسخ في .reviews/ (متجاهَل في git).
// بعد ما يخلص: اكتب الـ TODO، واختبر المطابقة بعناوين نور، وابني (npm run build).
const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto'),{execFileSync}=require('child_process');
const R=p=>path.join(__dirname,'..',p),J=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const cfg=J(R('reviews.json')),CURR=J(R('curriculum.json')),SRC=R('sources.json'),CACHE=R('.reviews');
const sources=fs.existsSync(SRC)?J(SRC):{};
const sh=(cmd,args,o={})=>execFileSync(cmd,args,{encoding:'utf8',maxBuffer:64<<20,env:{...process.env,GIT_LFS_SKIP_SMUDGE:'1'},...o});
const unitLessons=(bank,track,sem,n)=>bank.filter(b=>b.track===track&&(b.id.startsWith(track+'-s'+sem+'-'+n+'-')));
const legacyLessons=(bank,track,n)=>bank.filter(b=>b.track===track&&new RegExp('^'+track+'-u'+n+'-').test(b.id));
function importUnit(file,track,sem,link,bankPath){ // بيرجّع إحصائيات import-app
  const out=sh(process.execPath,[R('tools/import-app.js'),file,track,String(sem),link],{env:{...process.env,NOOR_BANK:bankPath}});
  const m=out.match(/^@@STATS (.*)$/m);if(!m)throw new Error('import-app مرجّعش إحصائيات:\n'+out);return JSON.parse(m[1]);}

fs.mkdirSync(CACHE,{recursive:true});
const report=[];
for(const [repo,track] of Object.entries(cfg.repos)){
  const g=CURR.find(x=>x.t===track),dir=path.join(CACHE,repo),url='https://github.com/'+cfg.owner+'/'+repo;
  const row={repo,track,new:[],updated:[],same:[],protected:[],warn:[],filtered:0,filteredHw:0,miss:[]};report.push(row);
  if(!g){row.warn.push('المسار '+track+' مش في curriculum.json');continue}
  try{ if(fs.existsSync(path.join(dir,'.git'))){sh('git',['-C',dir,'fetch','-q','--depth','1','origin']);sh('git',['-C',dir,'reset','-q','--hard','FETCH_HEAD'])}
       else sh('git',['clone','-q','--depth','1',url,dir]); }
  catch(e){row.warn.push('مقدرتش أجيب الريبو: '+String(e.message).split('\n')[0]);continue}
  const files=fs.readdirSync(dir).map(f=>[f,(f.match(/^unit(\d+)\.html$/)||[])[1]]).filter(x=>x[1]).sort((a,b)=>a[1]-b[1]);
  const s1=g.s[0].u.length,total=s1+((g.s[1]||{u:[]}).u.length);
  sources[repo]=sources[repo]||{};
  for(const [f,nStr] of files){
    const n=+nStr,file=path.join(dir,f),hash=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    if(n>total){row.warn.push(f+': الوحدة '+n+' مش في المنهج');continue}
    const sem=n<=s1?1:2,link='https://'+cfg.owner.toLowerCase()+'.github.io/'+repo+'/'+f,rec=sources[repo][f],bank=J(R('bank.json'));
    const done=st=>{row.filtered+=st.fAll;row.filteredHw+=st.fHw;row.miss.push(...st.miss);if(st.skipped.length)row.warn.push(f+': اتسابت '+st.skipped.join(' ، '))};
    const save=extra=>{sources[repo][f]=Object.assign({hash,track,unit:n,sem,at:new Date().toISOString().slice(0,10)},extra||{})};
    if(legacyLessons(bank,track,n).length){ // محمية
      if(!rec){save({legacy:true});row.protected.push(f+' (سجّلت بصمتها)')}
      else if(rec.hash!==hash){row.protected.push(f);row.warn.push(f+' اتغير في الريبو، بس دروسه محمية (اتعملت قبل import-app) — متسحبش. لو عايز تسحبها قول لـ Claude')}
      else row.protected.push(f);
      continue;}
    const inBank=unitLessons(bank,track,sem,n).length>0;
    if(rec&&rec.hash===hash&&inBank){row.same.push(f);continue}
    if(!inBank){ const st=importUnit(file,track,sem,link,R('bank.json'));done(st);save();row.new.push(f+' ('+st.added+' درس)');continue}
    // في البنك: ملفه اتغير، أو أول مرة من غير بصمة ← نسحب في نسخة مؤقتة ونقارن
    const tmp=path.join(os.tmpdir(),'noor-sync-'+process.pid+'.json');fs.writeFileSync(tmp,JSON.stringify(bank,null,1));
    const st=importUnit(file,track,sem,link,tmp),after=J(tmp);fs.unlinkSync(tmp);
    const key=b=>JSON.stringify(unitLessons(b,track,sem,n).sort((x,y)=>x.id<y.id?-1:1));
    if(key(after)===key(bank)){save();row.same.push(f+(rec?'':' (سجّلت بصمتها)'));continue}
    fs.writeFileSync(R('bank.json'),JSON.stringify(after,null,1));done(st);save();
    row.updated.push(f+' ('+st.updated+' درس اتحدّث'+(st.added?'، '+st.added+' جديد':'')+')');
  }
}
fs.writeFileSync(SRC,JSON.stringify(sources,null,1)+'\n');

// الملخص
const bank=J(R('bank.json')),todo=bank.filter(b=>JSON.stringify(b).includes('TODO'));
console.log('\n═══ ملخص «حدّث كل البنوك» ═══');
for(const r of report){
  const t=todo.filter(b=>b.track===r.track).length;
  console.log('\n■ '+r.repo+' ← '+r.track+'\n  جديدة: '+r.new.length+(r.new.length?' — '+r.new.join(' ، '):'')
    +'\n  اتحدثت: '+r.updated.length+(r.updated.length?' — '+r.updated.join(' ، '):'')
    +'\n  زي ما هي: '+r.same.length+(r.same.length?' — '+r.same.join(' ، '):'')
    +(r.protected.length?'\n  محمية (من قبل import-app): '+r.protected.join(' ، '):'')
    +((r.new.length||r.updated.length)?'\n  الفلتر شال: '+r.filtered+' سؤال بيعتمد على رسمة أو سؤال تاني ('+r.filteredHw+' منهم كانوا للواجب)':'')
    +'\n  دروس محتاجة TODO: '+t
    +(r.miss.length?'\n  دروس في المنهج من غير مراجعة: '+[...new Set(r.miss)].join(' ، '):'')
    +r.warn.map(w=>'\n  ⚠ '+w).join(''));
}
console.log('\n'+(todo.length?'✍ اكتب الـ TODO للدروس دي: '+todo.map(b=>b.id).join(' ، '):'✔ مفيش TODO')+'\nبعدها: اختبر بعناوين نور (tools/test-match.js) ← npm run build ← commit + push على main');
