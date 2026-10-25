// يسحب دروس ملف مراجعة تفاعلية (نظام أ. رشدي) إلى bank.json
// الاستخدام: node tools/import-review.js <ملف-المراجعة.html> <كود-المسار مثل g11a> <رقم-الفصل 1 أو 2> [رابط-المراجعة]
const fs=require('fs'),path=require('path'),R=p=>path.join(__dirname,'..',p);
const extract=require('./extract-lib.js'),{P,Hh,digits,rich,hwFilter}=require('./conv.js');
const [file,track,sem,link]=process.argv.slice(2);
if(!file||!/^g(0[5-9]|10|11[ab]|12[ab])$/.test(track||'')||!/^[12]$/.test(sem||'')){console.error('الاستخدام: node tools/import-review.js review.html g11a 1 [https://...]');process.exit(1)}
const CURR=JSON.parse(fs.readFileSync(R('curriculum.json'),'utf8')).find(g=>g.t===track);
const U=extract(file), bank=JSON.parse(fs.readFileSync(R('bank.json'),'utf8'));
const T=rows=>"<table border='1' cellpadding='6' style='border-collapse:collapse;width:100%'><tr><th>المرحلة والزمن</th><th>دور المعلم</th><th>دور الطالب</th><th>الاستراتيجية</th></tr>"+rows.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</table>';
let added=0,updated=0;
U.LESSONS.forEach((L,idx)=>{
  const ws=U.WS[L.id]||[],ts=U.TS[L.id]||[];
  const low=U.RAW.find(r=>r[0]===idx&&r[1]===1),hi=ts.find(t=>t[2]==='H'),exit=ts.find(t=>t[0]==='mcq');
  const hw=[];
  U.RAW.filter(r=>r[0]===idx).forEach(r=>hw.push({type:'mcq',level:r[1],degree:1,text:P(r[2]),html:rich(r[2]),options:r[3].map(P),answer:1}));
  ts.filter(t=>t[0]==='mcq').forEach(t=>{const o=t[5].map(P),k=o.indexOf(P(t[6]));if(k>=0)hw.push({type:'mcq',level:t[2]==='L'?1:t[2]==='M'?2:3,degree:1,text:P(t[4]),html:rich(t[4]),options:o,answer:k+1})});
  const id=track+'-s'+sem+'-'+L.id.replace(/[^0-9]+/g,'-');
  const old=bank.find(b=>b.id===id||(b.track===track&&b.lesson&&b.lesson.endsWith(L.title)));
  const lesson={id:old?old.id:id,track,grade:'الصف '+CURR.n,unit:U.META.unitName,lesson:digits(L.id)+' '+L.title,
    extra_objective:old&&old.extra_objective||'TODO: هدف «أستطيع أن…» للدرس',
    criteria:'all',taxonomies:['604','605'],strategies:['4','8','1','9'],teaching_aids:['0','3','5','6'],
    concepts_html:L.rules.map(([h,b])=>`<p><b>${Hh(h)}</b></p><ul>${b.map(x=>'<li>'+Hh(x)+'</li>').join('')}</ul>`).join('')+(L.warn&&L.warn.length?`<p><b>أخطاء شائعة:</b></p><ul>${L.warn.map(x=>'<li>'+Hh(x)+'</li>').join('')}</ul>`:''),
    warmup_html:old&&old.warmup_html||'<p><b>التعلم القبلي:</b> TODO</p><p><b>التمهيد:</b> TODO</p>',
    procedures_html:T([['تمهيد (٥ د)','يطرح سؤال التعلم القبلي والتمهيد','يجيب ويتوقع','العصف الذهني'],
      ['استكشاف (٧ د)','يعرض المختبر التفاعلي للدرس من تطبيق المراجعة على السبورة الذكية','يلاحظ ويستنتج القاعدة','التعلم بالاكتشاف'],
      ...(L.ex||[]).slice(0,2).map((e,i)=>[`نمذجة: مثال ${digits(String(i+1))} (٦ د)`,Hh(e.q)+'<br>'+e.s.map(s=>Hh(s[0])+(s[1]?' <i>('+Hh(s[1])+')</i>':'')).join('<br>'),'يدوّن الخطوة وسببها','النمذجة']),
      ['تطبيق (١١ د)',ws.slice(0,2).map(w=>'<b>'+Hh(w[0])+':</b> '+Hh(w[1])).join('<br>'),'يحل ثنائيًا ويصحح مع زميله','التعلم التعاوني والمتمايز'],
      ['غلق (٥ د)','يلخص القواعد والأخطاء الشائعة','يجيب تذكرة الخروج','—']]),
    formative_html:`<p><b>نشاط فردي/ثنائي:</b> ${ws[2]?'<b>'+Hh(ws[2][0])+':</b> '+Hh(ws[2][1])+' <i>(الإجابة: '+Hh(ws[2][2])+')</i>':''}</p><p><b>نشاط علاجي للمتعثرين:</b> ${low?Hh(low[2])+' '+low[3].map(Hh).join(' / ')+' <i>(تلميح: '+Hh(low[4])+')</i>':''}</p><p><b>سؤال قدرات عليا للمتميزين:</b> ${hi?Hh(hi[4])+' <i>(الإجابة: '+Hh(hi[6])+')</i>':ws[5]?Hh(ws[5][1]):''}</p>`,
    final_html:`<p><b>تذكرة خروج:</b> ${exit?Hh(exit[4])+'</p><p>'+exit[5].map(o=>'⬭ '+Hh(o)).join('<br>'):''}</p><p><b>الواجب:</b> واجب إلكتروني على منصة نور${link?'، ومراجعة الدرس في تطبيق المراجعة: '+link:''}</p>`,
    homework:hw.concat(old?(old.homework||[]).filter(h=>h.type==='tf'):[]).map(hwFilter).filter(Boolean)};
  if(old){Object.assign(old,lesson);updated++}else{bank.push(lesson);added++}
});
fs.writeFileSync(R('bank.json'),JSON.stringify(bank,null,1));
console.log(`✔ ${U.META.unitName}: ${added} درس جديد، ${updated} درس اتحدّث. الدروس اللي فيها TODO لازم تتكمّل قبل البناء.`);
