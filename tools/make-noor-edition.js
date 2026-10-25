// «نسخة نور» من ملف مراجعة: ملف HTML واحد مستقل ينفع يترفع في منصة نور كدرس تفاعلي HTML5
// الاستخدام: node tools/make-noor-edition.js <ملف-المراجعة.html> [مجلد-الناتج] [--open-map] [--name=اسم]
//   الناتج (افتراضيًا noor-editions/ — متجاهَل في git): <الاسم>-noor.html + <الاسم>-noor.zip (جواه index.html)
//   --open-map : يفتح كل قلاع خريطة الرحلة من الأول (وضع المعلم)
// اللي بيعمله:
//   ١) يشيل أي service worker و manifest وأيقونات وميتا PWA، وزر «كل الوحدات» (#apphome)
//   ٢) يضمّن أي سكربت أو CSS أو خط أو صورة بتتحمّل من النت أو من ملف جنبه (data: URI أو جوه الملف)
//   ٣) يضيف سطر ثابت تحت: «نسخة مخصصة لطلاب أ. رشدي سيد — منصة نور»
//   ٤) ينبّه لو لقى كلام عن تفعيل أو تجربة أو اشتراك محتاج مراجعة يدوية
// ⚠ الناتج مفتوح من غير قفل: ممنوع يترفع على GitHub أو أي مكان عام.
const fs=require('fs'),path=require('path'),zlib=require('zlib'),{execFileSync}=require('child_process');
const args=process.argv.slice(2),flags=args.filter(a=>a.startsWith('--')),pos=args.filter(a=>!a.startsWith('--'));
const [inFile,outDir=path.join(__dirname,'..','noor-editions')]=pos;
if(!inFile||!fs.existsSync(inFile)){console.error('الاستخدام: node tools/make-noor-edition.js review.html [مجلد-الناتج] [--open-map] [--name=اسم]');process.exit(1)}
const openMap=flags.includes('--open-map'),nameFlag=(flags.find(f=>f.startsWith('--name='))||'').slice(7);
const baseDir=path.dirname(path.resolve(inFile)),name=nameFlag||path.basename(inFile,'.html');
let s=fs.readFileSync(inFile,'utf8');const log=[],warn=[];
const cut=(re,what)=>{const n=(s.match(re)||[]).length;if(n){s=s.replace(re,'');log.push(what+' ('+n+')')}};

// ١) PWA
cut(/<link[^>]+rel=["']?manifest["']?[^>]*>/gi,'manifest');
cut(/<link[^>]+rel=["']?(apple-touch-icon|apple-touch-startup-image|mask-icon)["']?[^>]*>/gi,'أيقونات التطبيق');
cut(/<meta[^>]+name=["']?(theme-color|apple-mobile-web-app-[a-z-]+|mobile-web-app-capable|msapplication-[a-z-]+)["']?[^>]*>/gi,'ميتا PWA');
cut(/<script>\s*(?:if\s*\(navigator\.standalone\)[^;]*;\s*)?if\s*\(\s*['"]serviceWorker['"]\s+in\s+navigator[^<]*<\/script>/g,'تسجيل service worker');
cut(/navigator\.serviceWorker\.register\([^)]*\)(?:\.(?:then|catch)\([^)]*\))*;?/g,'تسجيل service worker (جوه سكربت)');
cut(/<a id="apphome"[^>]*>[\s\S]*?<\/a>(?:<style>#apphome[\s\S]*?<\/style>)?/g,'زر «كل الوحدات»');

// ٢) تضمين أي حاجة بتتحمّل من بره
const MIME={'.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.otf':'font/otf','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml','.webp':'image/webp','.css':'text/css','.js':'text/javascript'};
const get=u=>{ // ملف جنبه، أو تحميل من النت (curl بيحترم البروكسي)
  if(/^https?:/i.test(u)){try{return execFileSync('curl',['-sSfL','--max-time','60',u],{maxBuffer:64<<20})}catch(e){warn.push('مقدرتش أحمّل '+u);return null}}
  if(/^(data:|#|mailto:|tel:|javascript:)/i.test(u))return null;
  const f=path.join(baseDir,decodeURIComponent(u.split(/[?#]/)[0]));return fs.existsSync(f)?fs.readFileSync(f):null;};
const dataURI=(u,buf)=>'data:'+(MIME[path.extname(u.split(/[?#]/)[0]).toLowerCase()]||'application/octet-stream')+';base64,'+buf.toString('base64');
const inlineCss=(css,from)=>css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g,(m,q,u)=>{if(/^(data:|#)/.test(u))return m;
  const abs=/^https?:/.test(u)||!/^https?:/.test(from)?u:new URL(u,from).href;const b=get(abs);if(!b)return m;log.push('ضمّنت '+abs.slice(0,80));return 'url('+dataURI(abs,b)+')'});
s=s.replace(/<link[^>]+rel=["']?stylesheet["']?[^>]*>/gi,tag=>{const u=(tag.match(/href=["']([^"']+)/)||[])[1];const b=u&&get(u);if(!b)return tag;log.push('ضمّنت CSS '+u.slice(0,80));return '<style>'+inlineCss(b.toString('utf8'),u)+'</style>'});
s=s.replace(/@import\s+(?:url\()?\s*['"]?([^'")]+)['"]?\s*\)?\s*;/g,(m,u)=>{const b=get(u);if(!b)return m;log.push('ضمّنت @import '+u.slice(0,80));return inlineCss(b.toString('utf8'),u)});
s=s.replace(/<style([^>]*)>([\s\S]*?)<\/style>/g,(m,a,css)=>'<style'+a+'>'+inlineCss(css,'')+'</style>');
s=s.replace(/<script([^>]*)\ssrc=["']([^"']+)["']([^>]*)><\/script>/gi,(m,a,u,b)=>{const buf=get(u);if(!buf){warn.push('سكربت خارجي متضمّنش: '+u);return m}log.push('ضمّنت سكربت '+u.slice(0,80));return '<script'+a+b+'>'+buf.toString('utf8').replace(/<\/script/gi,'<\\/script')+'</script>'});
s=s.replace(/(<(?:img|source|audio|video)[^>]*\ssrc=)(["'])([^"']+)\2/gi,(m,p,q,u)=>{const b=get(u);if(!b)return m;log.push('ضمّنت ملف '+u.slice(0,80));return p+q+dataURI(u,b)+q});
s=s.replace(/<link[^>]+rel=["']?(?:icon|shortcut icon|preload|prefetch|preconnect|dns-prefetch)["']?[^>]*>/gi,tag=>{if(/href=["']data:/.test(tag))return tag;log.push('شلت '+tag.slice(0,60));return ''});
const ext=[...new Set((s.match(/(?:src|href)\s*=\s*["']https?:[^"']+/gi)||[]).map(x=>x.replace(/^[^"']+["']/,'')))];
const extLoads=ext.filter(u=>!new RegExp('<a\\b[^>]*href=["\']'+u.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).test(s));
if(extLoads.length)warn.push('لسه فيه تحميل من بره: '+extLoads.join(' ، '));
const links=ext.filter(u=>!extLoads.includes(u));

// ٣) سطر نور + (اختياري) فتح الخريطة
const FOOT='<div id="noor-ed" dir="rtl" style="position:fixed;left:0;right:0;bottom:0;z-index:2147483000;background:rgba(13,27,42,.92);color:#fff;font:12px/1.6 Tajawal,Tahoma,sans-serif;text-align:center;padding:3px 8px calc(3px + env(safe-area-inset-bottom));pointer-events:none">نسخة مخصصة لطلاب أ. رشدي سيد — منصة نور</div>'
  +'<style>body{padding-bottom:calc(26px + env(safe-area-inset-bottom))!important}@media print{#noor-ed{display:none}}</style>'
  +(openMap?'<script>try{if(typeof QS==="object"&&!QS.teacher){QS.teacher=true;typeof render==="function"&&render()}}catch(e){}</script>':'');
if(s.includes('id="noor-ed"'))warn.push('الملف فيه سطر نور قبل كده — مضفتوش تاني');else{const i=s.lastIndexOf('</body>');s=i<0?s+FOOT:s.slice(0,i)+FOOT+s.slice(i);log.push('سطر «منصة نور»'+(openMap?' + فتح كل القلاع':''))}
s=s.replace(/<title>([^<]*)<\/title>/,(m,t)=>'<title>'+t+' — منصة نور</title>');

// ٤) تنبيه لو فيه قفل محتاج مراجعة يدوية
const plain=s.replace(/data:[^"')\s]+/g,'');
const LOCK=/كود التفعيل|كود\\x20التفعيل|تفعيل النسخة|فترة التجربة|فترة\\x20التجربة|انتهت (?:الفترة|التجربة|صلاحية)|activation|licen[cs]e|trial/i;
if(LOCK.test(plain))warn.push('لقيت كلام عن تفعيل/تجربة/ترخيص — راجع القفل يدويًا قبل التسليم');
if(/_0x[0-9a-f]{4,}/.test(plain))log.push('الكود مشفّر — كلمات القفل المشفّرة متتشافش هنا؛ افحص بالمتصفح لو شاكك');

// الناتج: HTML واحد + zip جواه index.html
fs.mkdirSync(outDir,{recursive:true});
const html=path.join(outDir,name+'-noor.html'),zip=path.join(outDir,name+'-noor.zip');
fs.writeFileSync(html,s);fs.writeFileSync(zip,makeZip([['index.html',Buffer.from(s,'utf8')]]));
console.log('✔ '+html+' ('+Math.round(Buffer.byteLength(s)/1024)+' KB)\n✔ '+zip+' ('+Math.round(fs.statSync(zip).size/1024)+' KB)\n'
  +log.map(x=>'  • '+x).join('\n')+(links.length?'\n  روابط خارجية (بتفتح بس لو المعلم/الطالب داس عليها): '+links.join(' ، '):'')
  +(warn.length?'\n'+warn.map(x=>'  ⚠ '+x).join('\n'):'')+'\n⚠ النسخة دي مفتوحة من غير قفل: متترفعش على GitHub أو أي مكان عام.');

function makeZip(files){ // zip بسيط (deflate) من غير مكتبات
  const loc=[],cen=[];let off=0;const d=new Date(),dt=((d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1)),dd=(((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate());
  for(const [n,data] of files){const nm=Buffer.from(n,'utf8'),c=zlib.deflateRawSync(data,{level:9}),crc=zlib.crc32(data);
    const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50,0);h.writeUInt16LE(20,4);h.writeUInt16LE(0x0800,6);h.writeUInt16LE(8,8);h.writeUInt16LE(dt,10);h.writeUInt16LE(dd,12);h.writeUInt32LE(crc,14);h.writeUInt32LE(c.length,18);h.writeUInt32LE(data.length,22);h.writeUInt16LE(nm.length,26);
    loc.push(h,nm,c);
    const e=Buffer.alloc(46);e.writeUInt32LE(0x02014b50,0);e.writeUInt16LE(20,4);e.writeUInt16LE(20,6);e.writeUInt16LE(0x0800,8);e.writeUInt16LE(8,10);e.writeUInt16LE(dt,12);e.writeUInt16LE(dd,14);e.writeUInt32LE(crc,16);e.writeUInt32LE(c.length,20);e.writeUInt32LE(data.length,24);e.writeUInt16LE(nm.length,28);e.writeUInt32LE(off,42);
    cen.push(e,nm);off+=30+nm.length+c.length;}
  const cl=cen.reduce((a,b)=>a+b.length,0),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(cl,12);end.writeUInt32LE(off,16);
  return Buffer.concat([...loc,...cen,end]);}
