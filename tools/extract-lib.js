const fs=require('fs');
function grab(s,name){const i=s.indexOf('const '+name+'=');if(i<0)return null;let j=s.indexOf('=',i)+1;
  const open=s[j],close=open==='['?']':'}';let d=0,k=j,q=null,esc=false;
  for(;k<s.length;k++){const c=s[k];if(q){if(esc){esc=false;continue}if(c==='\\'){esc=true;continue}if(c===q)q=null;continue}
    if(c==='"'||c==="'"||c==='`'){q=c;continue}if(c===open)d++;else if(c===close){d--;if(!d)break}}
  return eval('('+s.slice(j,k+1)+')');}
module.exports=function(file){const s=fs.readFileSync(file,'utf8');const o={};for(const n of ['META','LESSONS','RAW','TS','WS'])o[n]=grab(s,n);return o;};
