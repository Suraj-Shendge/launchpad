const pages=await (await fetch("http://localhost:9222/json")).json();
const page=pages.find(item=>item.type==="page"&&item.url.startsWith("http://localhost:3000/"));
if(!page) throw new Error("No ProjectHub page connected to CDP");
const ws=new WebSocket(page.webSocketDebuggerUrl);
let nextId=1;
const pending=new Map();
ws.onmessage=event=>{
  const message=JSON.parse(event.data);
  if(message.id&&pending.has(message.id)){const done=pending.get(message.id);pending.delete(message.id);done(message);}
};
function call(method,params={}){
  return new Promise((resolve,reject)=>{
    const id=nextId++;pending.set(id,resolve);
    ws.send(JSON.stringify({id,method,params}));
    setTimeout(()=>{pending.delete(id);reject(new Error(method+" timeout"));},10000);
  });
}
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
await call("Page.enable");
await call("Page.navigate",{url:"http://localhost:3000/"});
await new Promise(resolve=>setTimeout(resolve,2500));
const expression=`(()=>({
  title:document.title,
  navPill:!!document.querySelector(".site-header .nav-inner"),
  heroLaunch:!!document.querySelector(".hero-launch"),
  auctionCards:document.querySelectorAll(".auction-stack-card").length,
  sectionTitles:[...document.querySelectorAll(".section-title")].map(x=>x.textContent?.trim()),
  visitor:!!document.querySelector(".visitor-counter"),
  submitLinks:[...document.querySelectorAll('a[href="/submit"]')].map(x=>x.textContent?.trim()),
  launchLinks:[...document.querySelectorAll('a[href="/launch"]')].map(x=>x.textContent?.trim()),
  width:{innerWidth:window.innerWidth,scrollWidth:document.documentElement.scrollWidth}
}))()`;
console.log(JSON.stringify((await call("Runtime.evaluate",{expression,returnByValue:true})).result?.result?.value,null,2));
ws.close();
