const pages=await (await fetch("http://localhost:9222/json")).json();
const page=pages.find(item=>item.type==="page"&&item.url.startsWith("http://localhost:3000/"));
const ws=new WebSocket(page.webSocketDebuggerUrl);
const result=await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error("timeout")),8000);
  ws.onopen=()=>ws.send(JSON.stringify({id:1,method:"Runtime.evaluate",params:{expression:`(()=>({reduced:matchMedia("(prefers-reduced-motion: reduce)").matches,card:document.querySelector(".auction-stack-card")&&(()=>{const x=document.querySelector(".auction-stack-card");const s=getComputedStyle(x);return {animationName:s.animationName,animationDuration:s.animationDuration,transform:s.transform,transition:s.transition}})()}))()`,returnByValue:true}}));
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id===1){clearTimeout(timer);resolve(m.result?.result?.value);ws.close();}};
  ws.onerror=reject;
});
console.log(JSON.stringify(result,null,2));
