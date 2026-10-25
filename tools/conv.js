// تحويل كتابة المراجعات M() إلى (١) نص عادي لخانات نور (٢) HTML لمحررات التحضير
const H='٠١٢٣٤٥٦٧٨٩', SUP={'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻','+':'⁺','−':'⁻','(':'⁽',')':'⁾'};
function parse(s){ // -> tree
  let i=0;
  function grp(){ if(s[i]!=='{')return ''; i++; let d=1,st=i; for(;i<s.length;i++){ if(s[i]==='{')d++; else if(s[i]==='}'){d--; if(!d)break;} } const t=s.slice(st,i); i++; return t; }
  const out=[];
  while(i<s.length){
    const c=s[i];
    if(c==='#'&&/[a-z]/.test(s[i+1])&&s[i+2]==='{'){ const k=s[i+1]; i+=2; const a=grp(); let b=null; if('fdekni'.includes(k)&&s[i]==='{') b=grp(); out.push({k,a:parse(a),b:b===null?null:parse(b)}); continue; }
    if((c==='^'||c==='_')&&s[i+1]==='{'){ i++; out.push({k:c,a:parse(grp())}); continue; }
    out.push(c); i++;
  }
  return out;
}
const digits=t=>t.replace(/(\d)\.(\d)/g,'$1٫$2').replace(/\d/g,d=>H[d]);
const minus=t=>t.replace(/-/g,'−');
const simple=x=>{x=x.trim();return /^[−]?[0-9.]+$/.test(x)||/^[\u0621-\u064A\u0640]+[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]*$/.test(x)};
function plain(tree){
  return tree.map(n=>{ if(typeof n==='string')return n;
    const A=plain(n.a), B=n.b?plain(n.b):'';
    switch(n.k){
      case '^': { const raw=A.replace(/\s/g,''); return /^[0-9\-−+()]+$/.test(raw)?raw.split('').map(ch=>SUP[ch]||ch).join(''):(simple(A)?'^'+A:'^('+A+')'); }
      case '_': return A;
      case 'f': return (simple(A)?A:'('+A+')')+'/'+(simple(B)?B:'('+B+')');
      case 'r': return '√'+(simple(A)?A:'('+A+')');
      case 'c': return '∛'+(simple(A)?A:'('+A+')');
      case 'd': return A?'ء'+A+'/ء'+B:'ء/ء'+B;
      case 'e': return A?'ء²'+A+'/ء'+B+'²':'ء²/ء'+B+'²';
      case 'v': return A+'ـ';
      case 'a': return '|'+A+'|';
      case 'n': return 'نها('+A+' ← '+B+')';
      case 'k': return '√['+A+']('+B+')';
      default: return A;
    }}).join('');
}
function html(tree){
  const e=t=>t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return tree.map(n=>{ if(typeof n==='string')return e(n);
    const A=html(n.a), B=n.b?html(n.b):'';
    switch(n.k){
      case '^': return '<sup>'+A+'</sup>';
      case '_': return '<sub>'+A+'</sub>';
      case 'f': return '<sup>'+A+'</sup>⁄<sub>'+B+'</sub>';
      case 'r': return '√<span style="text-decoration:overline">'+A+'</span>';
      case 'c': return '∛<span style="text-decoration:overline">'+A+'</span>';
      case 'd': return '<sup>ء'+A+'</sup>⁄<sub>ء'+B+'</sub>';
      case 'e': return '<sup>ء²'+A+'</sup>⁄<sub>ء'+B+'²</sub>';
      case 'v': return '<u style="text-decoration-style:wavy">'+A+'</u>';
      case 'a': return '|'+A+'|';
      default: return A;
    }}).join('');
}
const fix=t=>minus(t);
exports.P=s=>digits(plain(parse(fix(String(s))))).replace(/(^|[(=⟸]\s?)−\s+(?=\S)/g,'$1−');
exports.Hh=s=>digits(html(parse(fix(String(s))))).replace(/(\d)/g,d=>d);
exports.digits=digits;
// ===== MathML لمحرر نور (MathType/WIRIS) =====
const MNS='xmlns="http://www.w3.org/1998/Math/MathML"';
function mmlTokens(tree){ // داخل جزيرة رياضية
  const out=[];
  const pushText=t=>{ t=t.replace(/-/g,'−');
    const re=/([0-9]+(?:\.[0-9]+)?)|([\u0621-\u064A\u0640]+)|([+−=×÷()<>≤≥،,|⟸⟵])|(\S)/g; let m;
    while((m=re.exec(t))){ if(m[1])out.push('<mn>'+digits(m[1])+'</mn>'); else if(m[2])out.push('<mi mathvariant="normal">'+m[2]+'</mi>'); else if(m[3])out.push('<mo>'+m[3].replace('<','&lt;').replace('>','&gt;')+'</mo>'); else out.push('<mo>'+m[4]+'</mo>'); } };
  let buf='';
  const flush=()=>{ if(buf){pushText(buf);buf='';} };
  for(const n of tree){
    if(typeof n==='string'){buf+=n;continue;}
    flush();
    const A=mmlTokens(n.a), B=n.b?mmlTokens(n.b):'';
    switch(n.k){
      case '^': { const base=out.pop()||'<mi></mi>'; out.push('<msup>'+base+'<mrow>'+A+'</mrow></msup>'); break; }
      case '_': { const base=out.pop()||'<mi></mi>'; out.push('<msub>'+base+'<mrow>'+A+'</mrow></msub>'); break; }
      case 'f': out.push('<mfrac><mrow>'+A+'</mrow><mrow>'+B+'</mrow></mfrac>'); break;
      case 'd': out.push('<mfrac><mrow><mi mathvariant="normal">ء</mi>'+A+'</mrow><mrow><mi mathvariant="normal">ء</mi>'+B+'</mrow></mfrac>'); break;
      case 'e': out.push('<mfrac><mrow><msup><mi mathvariant="normal">ء</mi><mn>٢</mn></msup>'+A+'</mrow><mrow><mi mathvariant="normal">ء</mi><msup><mrow>'+B+'</mrow><mn>٢</mn></msup></mrow></mfrac>'); break;
      case 'r': out.push('<msqrt>'+A+'</msqrt>'); break;
      case 'c': out.push('<mroot><mrow>'+A+'</mrow><mn>٣</mn></mroot>'); break;
      default: out.push(A);
    }
  }
  flush(); return out.join('');
}
// السؤال كله HTML: الكلام نص عادي، والرياضيات (حول الكسور والجذور والمشتقات) جزر MathML
function rich(s){
  const tree=[];for(const n of parse(String(s).replace(/-/g,'−'))){if(typeof n==='string'&&typeof tree[tree.length-1]==='string')tree[tree.length-1]+=n;else tree.push(n);}
  // نقسم: أي مقطع فيه بنية (#f/#d/#e/#r/#c) أو أسس يتحول لجزيرة كاملة لحد ما نوصل لكلمة عربية طويلة/نهاية
  const segs=[];let cur=[],isMath=false;
  const STOP=['حل','إذا','اذا','كان','فإن','فان','أو','او','من','في','عند','هي','هو','ما','لا','أن','إن','على','عن','و','ثم','بين','كل','مع','قيمة'];
  const wordy=t=>STOP.includes(t.replace(/[^\u0621-\u064A]/g,''))||/[\u0621-\u064A]{3,}/.test(t.replace(/لط|جتا|جا|ظا|نها/g,''));
  for(const n of tree){
    if(typeof n==='string'){
      // نفصل النص لكلمات: الكلمات العربية الطويلة = نص، الباقي = رياضيات
      const parts=n.split(/(\s+)/);
      for(const p of parts){ if(!p)continue;
        const m=!/^\s+$/.test(p)&&!wordy(p);
        if(/^\s+$/.test(p)){cur.push(p);continue;}
        if(m!==isMath&&cur.length){segs.push({m:isMath,c:cur});cur=[];}
        isMath=m;cur.push(p);
      }
    } else { if(!isMath&&cur.length){segs.push({m:false,c:cur});cur=[];} isMath=true;cur.push(n); }
  }
  if(cur.length)segs.push({m:isMath,c:cur});
  return segs.map(sg=>{
    if(!sg.m)return sg.c.join('');
    const lead=(typeof sg.c[0]==='string'&&/^\s+$/.test(sg.c[0]))?' ':'' ;
    const inner=mmlTokens(sg.c.filter(x=>!(typeof x==='string'&&/^\s+$/.test(x))||true).map(x=>typeof x==='string'?x.replace(/\s+/g,' '):x));
    return lead+'<math '+MNS+' dir="rtl">'+inner+'</math> ';
  }).join('').replace(/\s+/g,' ').trim();
}
exports.rich=rich;
