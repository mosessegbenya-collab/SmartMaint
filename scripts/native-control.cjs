const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const adb=path.join(process.env.LOCALAPPDATA,'Android','Sdk','platform-tools','adb.exe');
const serial=process.env.SMARTMAINT_DEVICE??'emulator-5554';
const [action,value]=process.argv.slice(2);
const dir=path.resolve('artifacts/runtime');
fs.mkdirSync(dir,{recursive:true});
function command(args,binary=false){return cp.execFileSync(adb,['-s',serial,...args],{timeout:45000,...(binary?{}:{encoding:'utf8'})});}
function dump(){command(['shell','uiautomator','dump','/sdcard/smartmaint-ui.xml']);const xml=command(['exec-out','cat','/sdcard/smartmaint-ui.xml']);fs.writeFileSync(path.join(dir,'ui.xml'),xml);return xml;}
function nodes(xml){return [...xml.matchAll(/<node\b[^>]+>/g)].map(m=>Object.fromEntries([...m[0].matchAll(/([\w-]+)="([^"]*)"/g)].map(a=>[a[1],a[2].replaceAll('&amp;','&').replaceAll('&quot;','"')])));}
if(action==='setup'){console.log(command(['reverse','tcp:8081','tcp:8081']));}
else if(action==='open'){if(!value?.startsWith('/'))throw Error('Supply an app route beginning with /');console.log(command(['shell','am','start','-a','android.intent.action.VIEW','-d',`exp://127.0.0.1:8081/--${value}`]));}
else if(action==='capture'){if(!/^[a-z0-9-]+$/.test(value??''))throw Error('Use a simple screenshot name');const target=path.join(dir,value+'.png');fs.writeFileSync(target,command(['exec-out','screencap','-p'],true));console.log(target);}
else if(action==='dump'){const items=nodes(dump()).filter(n=>n.text||n['content-desc']);console.log(JSON.stringify(items.map(n=>({text:n.text,label:n['content-desc'],bounds:n.bounds})),null,2));}
else if(action==='tap'){const visible=nodes(dump()).filter(n=>{const b=n.bounds?.match(/\d+/g)?.map(Number);return b&&b[2]>b[0]&&b[3]>b[1];});const item=visible.find(n=>n['content-desc']===value)??visible.find(n=>n.text===value);if(!item)throw Error(`Visible control not found: ${value}`);const bounds=item.bounds.match(/\d+/g).map(Number);console.log(command(['shell','input','tap',String(Math.round((bounds[0]+bounds[2])/2)),String(Math.round((bounds[1]+bounds[3])/2))]));}
else if(action==='text'){if(!/^[\w .:@/-]+$/.test(value??''))throw Error('Use synthetic alphanumeric input only');console.log(command(['shell','input','text',value.replaceAll(' ','%s')]));}
else if(action==='scroll'){const dimensions=command(['shell','wm','size']).match(/(\d+)x(\d+)/g).at(-1).split('x').map(Number);const [w,h]=dimensions;console.log(command(['shell','input','swipe',String(w/2|0),String(h*(value==='down'?.25:.8)|0),String(w/2|0),String(h*(value==='down'?.8:.25)|0),'350']));}
else if(action==='back'){console.log(command(['shell','input','keyevent','4']));}
else throw Error('Actions: setup, open /route, capture name, dump, tap label, text synthetic-input, scroll up|down, back');
