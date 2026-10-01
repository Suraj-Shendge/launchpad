const res=await fetch("http://localhost:9222/json"); const pages=await res.json();
const page=pages.find(item=>item.type==="page"&&item.url.startsWith("http://localhost:3000/"));
const ws=new WebSocket(page.webSocketDebuggerUrl); let seq=1; const pending=new Map();
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const done=pending.get(m.id);pending.delete(m.id);done(m);}};
function call(method,params={}){return new Promise((resolve,reject)=>{const id=seq++;pending.set(id,resolve);ws.send(JSON.stringify({id,method,params}));setTimeout(()=>{pending.delete(id);reject(new Error(method+" timeout"));},10000);});}
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
await call("Page.enable"); await call("Page.navigate",{url:"http://localhost:3000/"}); await new Promise(r=>setTimeout(r,4600));
await new Promise(r=>setTimeout(r,450));
const during=(await call("Runtime.evaluate",{expression:`(()=>{const x=document.querySelector(".auction-stack-card");const next=document.querySelectorAll(".auction-stack-card")[1];const s=x?getComputedStyle(x):null;const ns=next?getComputedStyle(next):null;return {name:x?.querySelector("h2")?.textContent,classes:x?.className,animationName:s?.animationName,animationDuration:s?.animationDuration,transform:s?.transform,nextClasses:next?.className,nextAnimation:ns?.animationName,nextTransform:ns?.transform,reduced:matchMedia("(prefers-reduced-motion: reduce)").matches}})()`,returnByValue:true})).result.result.value;
console.log(JSON.stringify(during,null,2));ws.close();
