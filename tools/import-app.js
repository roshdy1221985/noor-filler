// يسحب دروس ملف وحدة من تطبيقات المراجعة المنشورة (unitN.html — الكود فيه مشفّر والبيانات بتتحمّل وقت التشغيل) إلى bank.json
// الاستخدام: node tools/import-app.js <unitN.html> <كود-المسار مثل g11a> <رقم-الفصل 1 أو 2> [رابط-المراجعة]
// محتاج playwright (بيفتح الملف في متصفح مخفي ويقرأ UNIT و LESSONS بعد التحميل)
const fs=require('fs'),path=require('path'),R=p=>path.join(__dirname,'..',p);
const {P,Hh,digits,rich,hwFilter,figOk}=require('./conv.js');
const [file,track,sem,link]=process.argv.slice(2);
if(!file||!/^g(0[5-9]|10|11[ab]|12[ab])$/.test(track||'')||!/^[12]$/.test(sem||'')){console.error('الاستخدام: node tools/import-app.js unit1.html g11a 1 [https://...]');process.exit(1)}
const CURR=JSON.parse(fs.readFileSync(R('curriculum.json'),'utf8')).find(g=>g.t===track);
const ORD=['','الأولى','الثانية','الثالثة','الرابعة','الخامسة','السادسة','السابعة','الثامنة','التاسعة','العاشرة','الحادية عشرة'];
const SUF={'أ':'a','ب':'b','جـ':'c','ج':'c','د':'d'};

async function load(f){
  let pw;try{pw=require('playwright')}catch(e){console.error('❌ محتاج playwright: npm i -g playwright');process.exit(1)}
  const b=await pw.chromium.launch(),p=await b.newPage();
  await p.goto('file://'+path.resolve(f),{waitUntil:'load'});await p.waitForTimeout(2500);
  const d=await p.evaluate(()=>JSON.stringify({UNIT,LESSONS}));await b.close();return JSON.parse(d);
}
// كتابة التطبيق: الرياضيات بين $…$ و س^2 من غير أقواس — نحولها لصيغة conv.js
const caret=m=>m.replace(/\^(?!\{)(-?[0-9]+|[^\s{])/g,'^{$1}');
const parts=s=>String(s).split(/(\$[^$]*\$)/).filter(Boolean).map(x=>x[0]==='$'&&x.length>1&&x.endsWith('$')?{m:caret(x.slice(1,-1))}:{t:x});
const TAG=/(<\/?[a-zA-Z][^<>]*>)/;   // وسوم HTML بس — مش علامات < و > في المتباينات
const textHtml=t=>t.split(TAG).map(x=>TAG.test(x)?x:digits(x.replace(/#[a-z]\{[^}]*\}(\{[^}]*\})?/g,c=>Hh(c)))).join('');
const H=s=>parts(s).map(x=>x.m!==undefined?Hh(x.m):textHtml(x.t)).join('').replace(/شكل U/g,'شكل ∪').replace(/\s+/g,' ').trim();   // HTML للتحضير
const strip=s=>String(s).replace(/<br\s*\/?>/g,' ').replace(/<\/?[a-zA-Z][^<>]*>/g,'');
const T1=s=>parts(strip(s)).map(x=>x.m!==undefined?P(x.m):digits(x.t)).join('').replace(/\s+/g,' ').trim();   // نص عادي
const RH=s=>parts(strip(s)).map(x=>x.m!==undefined?rich(x.m):digits(x.t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')).join('').replace(/\s+/g,' ').trim(); // HTML مع MathML للواجب
const bad=s=>/<(svg|img|table|canvas)/i.test(s);
const T=rows=>"<table border='1' cellpadding='6' style='border-collapse:collapse;width:100%'><tr><th>المرحلة والزمن</th><th>دور المعلم</th><th>دور الطالب</th><th>الاستراتيجية</th></tr>"+rows.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</table>';

(async()=>{
  const {UNIT,LESSONS}=await load(file), bank=JSON.parse(fs.readFileSync(R('bank.json'),'utf8'));
  const CU=CURR.s[sem-1].u[UNIT.n-(sem==2?CURR.s[0].u.length:0)-1];
  if(!CU){console.error('❌ الوحدة '+UNIT.n+' مش موجودة في خريطة المنهج للفصل '+sem);process.exit(1)}
  const unitName='الوحدة '+ORD[UNIT.n]+': '+CU.n;
  let added=0,updated=0,skipped=[];
  LESSONS.forEach(L=>{
    const m=strip(L.num).replace(/[‎‏\s]/g,'').match(/^([٠-٩]+)-([٠-٩]+)(.*)$/);
    if(!m){skipped.push(strip(L.num)+' '+L.title);return}           // دروس المراجعة «م» مش دروس في نور
    const ln=+digits(m[1]).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)),suf=m[3].trim();
    const cname=CU.l[ln-1];if(!cname){skipped.push(L.title);return}
    const sub=L.title.replace(/^[^:]*:\s*/,'').replace(/[ً-ْ]/g,'');
    const name=suf?cname.replace(/^(\S+)\s/,'$1 '+suf+' ')+': '+sub:cname;
    const id=track+'-s'+sem+'-'+UNIT.n+'-'+ln+(SUF[suf]||'');
    // أي سؤال بيعتمد على رسمة أو على سؤال تاني بيتشال من هنا، فالتحضير والواجب ياخدوا اللي بعده
    const clean=a=>(a||[]).map(x=>{const t=bad(x.q)?null:figOk(x.q,x.o);return t===null?null:Object.assign({},x,{q:t})}).filter(Boolean);
    const quiz=clean(L.quiz),ws=clean(L.ws),prac=clean(L.prac),exs=clean(L.ex);
    const mcq=quiz.filter(q=>q.o&&!bad(q.q)),hi=quiz.find(q=>q.lv==='H'&&!bad(q.q)),low=prac.find(p=>p.t==='mc'&&p.ex)||prac.find(p=>p.t==='mc'&&p.o)||quiz.find(q=>q.o&&q.lv==='L');
    const hw=[],seen=new Set(),push=h=>{h=hwFilter(h);if(h&&!seen.has(h.text)){seen.add(h.text);hw.push(h)}};
    prac.forEach(p=>{if(bad(p.q)||(p.o||[]).some(bad))return;
      if(p.t==='tf')push({type:'tf',level:1,degree:1,text:T1(p.q),html:RH(p.q),answer:!!p.a});
      else if(p.t==='mc'&&p.o)push({type:'mcq',level:(p.cov||[]).some(c=>/^و/.test(c))?3:2,degree:1,text:T1(p.q),html:RH(p.q),options:p.o.map(T1),answer:p.a+1});});
    mcq.forEach(q=>push({type:'mcq',level:q.lv==='L'?1:q.lv==='M'?2:3,degree:1,text:T1(q.q),html:RH(q.q),options:q.o.map(T1),answer:q.a+1}));
    const old=bank.find(b=>b.id===id);
    const wr=(L.info&&L.info.wr)||[];
    const lesson={id,track,grade:'الصف '+CURR.n,unit:unitName,lesson:name,
      extra_objective:old&&old.extra_objective||'TODO: هدف «أستطيع أن…» للدرس',
      criteria:'all',taxonomies:['604','605'],strategies:['4','8','1','9'],teaching_aids:['0','3','5','6'],
      concepts_html:(L.rules||[]).filter(r=>!bad(r.b)).map(r=>`<p><b>${H(r.h)}</b></p><ul>${String(r.b).split(/<br\s*\/?>/).filter(x=>x.trim()).map(x=>'<li>'+H(x)+'</li>').join('')}</ul>`).join('')
        +(wr.length?`<p><b>أخطاء شائعة:</b></p><ul>${wr.map(w=>'<li>✗ '+H(w[0])+' ← الصحيح: '+H(w[1])+'</li>').join('')}</ul>`:''),
      warmup_html:old&&old.warmup_html||'<p><b>التعلم القبلي:</b> TODO</p><p><b>التمهيد:</b> TODO</p>',
      procedures_html:T([['تمهيد (٥ د)','يطرح سؤال التعلم القبلي والتمهيد','يجيب ويتوقع','العصف الذهني'],
        ['استكشاف (٧ د)','يعرض المختبر التفاعلي للدرس من تطبيق المراجعة على السبورة الذكية','يلاحظ ويستنتج القاعدة','التعلم بالاكتشاف'],
        ...exs.slice(0,2).map((e,i)=>[`نمذجة: مثال ${digits(String(i+1))} (٦ د)`,H(e.q)+'<br>'+(e.s||[]).map(s=>H(s[0])+(s[1]?' <i>('+H(s[1])+')</i>':'')).join('<br>'),'يدوّن الخطوة وسببها','النمذجة']),
        ['تطبيق (١١ د)',ws.slice(0,2).map((w,i)=>'<b>تمرين '+digits(String(i+1))+':</b> '+H(w.q)).join('<br>'),'يحل ثنائيًا ويصحح مع زميله','التعلم التعاوني والمتمايز'],
        ['غلق (٥ د)','يلخص القواعد والأخطاء الشائعة','يجيب تذكرة الخروج','—']]),
      formative_html:`<p><b>نشاط فردي/ثنائي:</b> ${ws[2]?H(ws[2].q)+' <i>(الإجابة: '+H(ws[2].a)+')</i>':''}</p><p><b>نشاط علاجي للمتعثرين:</b> ${low?H(low.q)+' '+low.o.map(H).join(' / ')+(low.ex||low.guide?' <i>(تلميح: '+H(low.ex||low.guide)+')</i>':''):''}</p><p><b>سؤال قدرات عليا للمتميزين:</b> ${hi?H(hi.q)+' <i>(الإجابة: '+H(hi.short||hi.sol||'')+')</i>':ws[ws.length-1]?H(ws[ws.length-1].q):''}</p>`,
      final_html:`<p><b>تذكرة خروج:</b> ${mcq[0]?H(mcq[0].q)+'</p><p>'+mcq[0].o.map(o=>'⬭ '+H(o)).join('<br>'):''}</p><p><b>الواجب:</b> واجب إلكتروني على منصة نور${link?'، ومراجعة الدرس في تطبيق المراجعة: '+link:''}</p>`,
      homework:hw};
    const i=bank.findIndex(b=>b.id===id);
    if(i>=0){bank[i]=lesson;updated++}else{bank.push(lesson);added++}
  });
  fs.writeFileSync(R('bank.json'),JSON.stringify(bank,null,1));
  console.log(`✔ ${unitName}: ${added} درس جديد، ${updated} درس اتحدّث.`+(skipped.length?' اتسابت: '+skipped.join(' ، '):'')+' الدروس اللي فيها TODO لازم تتكمّل قبل البناء.');
})();
