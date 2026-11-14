import init,{ImageInput,convert_image_to_webp_auto} from "./pkg/eco_pixel.js";
const $=id=>document.getElementById(id);
const drop=$("drop"),fileEl=$("file"),lossyEl=$("lossy"),statusEl=$("status"),listEl=$("list"),totalsEl=$("totals");
let appReady=false,runId=0,urls=[],lastFiles=[];
const setStatus=(m,c="")=>{statusEl.textContent=m;statusEl.className=c};
const nf=new Intl.NumberFormat("pt-BR");
const fmt=n=>n<1024?n+" B":n<1048576?(n/1024).toFixed(1).replace(".",",")+" KB":(n/1048576).toFixed(2).replace(".",",")+" MB";
const track=u=>(urls.push(u),u);

init()
  .then(()=>{appReady=true;setStatus("Pronto. Escolha suas imagens.")})
  .catch(e=>setStatus("Não foi possível carregar o núcleo WebAssembly: "+(e?.message??e),"error"));

async function luma(blob,w,h){
  const bm=await createImageBitmap(blob,{resizeWidth:w,resizeHeight:h,resizeQuality:"high"});
  const x=new OffscreenCanvas(w,h).getContext("2d");x.drawImage(bm,0,0);
  const d=x.getImageData(0,0,w,h).data,g=new Float32Array(w*h);
  for(let i=0;i<g.length;i++)g[i]=.299*d[4*i]+.587*d[4*i+1]+.114*d[4*i+2];
  return g;
}
async function quality(orig,webp){
  const probe=await createImageBitmap(orig);
  const s=Math.min(1,512/Math.max(probe.width,probe.height));
  const w=Math.max(8,Math.round(probe.width*s)),h=Math.max(8,Math.round(probe.height*s));
  const a=await luma(orig,w,h),b=await luma(webp,w,h);
  let mse=0;for(let i=0;i<a.length;i++){const d=a[i]-b[i];mse+=d*d}mse/=a.length;
  const psnr=mse===0?Infinity:10*Math.log10(255*255/mse);
  const C1=6.5025,C2=58.5225;let sum=0,n=0;
  for(let y=0;y+8<=h;y+=8)for(let x=0;x+8<=w;x+=8){
    let ma=0,mb=0;
    for(let j=0;j<8;j++)for(let i=0;i<8;i++){const k=(y+j)*w+x+i;ma+=a[k];mb+=b[k]}
    ma/=64;mb/=64;let va=0,vb=0,c=0;
    for(let j=0;j<8;j++)for(let i=0;i<8;i++){const k=(y+j)*w+x+i;va+=(a[k]-ma)**2;vb+=(b[k]-mb)**2;c+=(a[k]-ma)*(b[k]-mb)}
    va/=63;vb/=63;c/=63;
    sum+=((2*ma*mb+C1)*(2*c+C2))/((ma*ma+mb*mb+C1)*(va+vb+C2));n++;
  }
  const ssim=n?sum/n:1;
  const cls=ssim>0.94?["Alta fidelidade","good"]:ssim>0.84?["Fidelidade moderada","bad"]:["Alta degradação perceptual","err"];
  return{psnr,ssim,cls};
}
function row(dt,dd,cls){const a=document.createElement("dt"),b=document.createElement("dd");a.textContent=dt;b.textContent=dd;if(cls)b.className=cls;return[a,b]}
function thumb(label,src){const f=document.createElement("figure"),i=document.createElement("img");i.src=src;i.alt=label;f.append(i,label);return f}

async function processFile(file,allowLossy){
  const bytes=new Uint8Array(await file.arrayBuffer());
  const t0=performance.now();
  const input=ImageInput.from_bytes(bytes);
  const o=convert_image_to_webp_auto(input,allowLossy);
  const ms=performance.now()-t0;
  const data=o.data;
  const r={name:file.name,file,w:o.width,h:o.height,orig:o.original_bytes,webp:o.webp_bytes,saved:o.bytes_saved,smaller:o.is_smaller,
    co2:o.co2_saved_grams,mode:o.mode+(o.mode==="lossy"&&o.quality?` (qualidade ${o.quality})`:"")+(o.animated?`, animada (${o.frame_count} quadros)`:""),ms,
    blob:new Blob([data],{type:"image/webp"})};
  try{r.q=await quality(file,r.blob)}catch{}
  return r;
}
function render(r){
  const el=document.createElement("article");el.className="item";
  const th=document.createElement("div");th.className="thumbs";
  th.append(thumb("Original",track(URL.createObjectURL(r.file))),thumb("WebP",track(URL.createObjectURL(r.blob))));
  const body=document.createElement("div"),h=document.createElement("h3");h.textContent=r.name;
  const pct=r.orig?r.saved/r.orig*100:0,dl=document.createElement("dl");
  dl.append(...row("Dimensões",`${r.w} × ${r.h}`),...row("Modo",r.mode),
    ...row("Original",fmt(r.orig)),...row("WebP",fmt(r.webp)),
    ...(r.smaller?row("Economia",`${fmt(r.saved)} (${pct.toFixed(1).replace(".",",")}% menor)`,"good"):row("Economia","Nenhuma: o WebP ficou maior, mantenha o original.","bad")),
    ...row("CO₂e evitado",`${(r.co2*1000).toFixed(3).replace(".",",")} mg`));
  if(r.q)dl.append(...row("SSIM",`${r.q.ssim.toFixed(4).replace(".",",")} · ${r.q.cls[0]}`,r.q.cls[1]),...row("PSNR",isFinite(r.q.psnr)?r.q.psnr.toFixed(1).replace(".",",")+" dB":"∞ (idêntica)"));
  const a=document.createElement("a");a.className="btn";a.textContent="Baixar WebP";
  a.href=track(URL.createObjectURL(r.blob));a.download=r.name.replace(/\.[^.]+$/,"")+".webp";
  body.append(h,dl,a);el.append(th,body);listEl.append(el);
}
function renderError(name,e){
  const el=document.createElement("article");el.className="item";el.style.gridTemplateColumns="1fr";
  const p=document.createElement("p");p.className="err";p.textContent=`${name}: falha na conversão. ${e?.message??e}`;
  el.append(p);listEl.append(el);
}
function renderTotals(rs){
  const ok=rs.filter(r=>r.smaller),saved=ok.reduce((s,r)=>s+r.saved,0),orig=rs.reduce((s,r)=>s+r.orig,0),co2=ok.reduce((s,r)=>s+r.co2,0)*1000;
  const items=[[fmt(saved),"economizados"],[orig?(saved/orig*100).toFixed(1).replace(".",",")+"%":"0%","de redução total"],[co2.toFixed(3).replace(".",",")+" mg","de CO₂e evitado"],[String(rs.length),rs.length===1?"imagem":"imagens"]];
  totalsEl.replaceChildren(...items.map(([v,l])=>{const d=document.createElement("div");d.className="stat";const b=document.createElement("b");b.textContent=v;const s=document.createElement("span");s.textContent=l;d.append(b,s);return d}));
  totalsEl.style.display="grid";
}
async function run(files){
  if(!files.length)return;
  if(!appReady){setStatus("O núcleo ainda está carregando, tente de novo em instantes.");return}
  lastFiles=files;const me=++runId;
  urls.forEach(u=>URL.revokeObjectURL(u));urls=[];listEl.replaceChildren();totalsEl.style.display="none";
  const results=[];
  for(let i=0;i<files.length;i++){
    setStatus(`Convertendo ${i+1} de ${files.length}…`);
    await new Promise(r=>setTimeout(r,0));
    if(me!==runId)return;
    try{const r=await processFile(files[i],lossyEl.checked);results.push(r);render(r)}
    catch(e){renderError(files[i].name,e)}
  }
  if(results.length)renderTotals(results);
  setStatus(results.length?"Pronto.":"Nenhuma imagem pôde ser convertida.",results.length?"":"error");
}
const ok=f=>/^image\/(jpeg|png|gif)$/.test(f.type);
drop.addEventListener("click",()=>fileEl.click());
drop.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();fileEl.click()}});
fileEl.addEventListener("change",()=>run([...fileEl.files].filter(ok)));
lossyEl.addEventListener("change",()=>run(lastFiles));
["dragenter","dragover"].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.add("over")}));
["dragleave","drop"].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.remove("over")}));
drop.addEventListener("drop",e=>{const fs=[...e.dataTransfer.files],good=fs.filter(ok);if(good.length<fs.length)setStatus("Apenas JPEG, PNG, GIF são aceitos; os demais foram ignorados.");run(good)});
