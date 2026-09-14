import crypto from "node:crypto";
const AK=process.env.AWS_ACCESS_KEY_ID!, SK=process.env.AWS_SECRET_ACCESS_KEY!;
const B=(process.env.BUCKET_NAME||"").replace(/"/g,""), E=(process.env.AWS_ENDPOINT_URL_S3||"").replace(/"/g,"").replace(/\/$/,"");
const H=new URL(E).host, R=(process.env.AWS_REGION||"auto").replace(/"/g,"");
const hm=(k:any,d:string)=>crypto.createHmac("sha256",k).update(d).digest();
async function page(prefix:string, tok?:string){
  const a=new Date().toISOString().replace(/[-:]|\.\d{3}/g,""), d=a.slice(0,8);
  const parts:[string,string][] = [["list-type","2"],["max-keys","1000"],["prefix",prefix]];
  if(tok) parts.push(["continuation-token",tok]);
  const q = parts.map(([k,v])=>[k,v] as [string,string]).sort((x,y)=>x[0]<y[0]?-1:1)
    .map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
  const cr=["GET",`/${B}`,q,`host:${H}\nx-amz-content-sha256:UNSIGNED-PAYLOAD\nx-amz-date:${a}\n`,
    "host;x-amz-content-sha256;x-amz-date","UNSIGNED-PAYLOAD"].join("\n");
  const sc=`${d}/${R}/s3/aws4_request`;
  const sts=["AWS4-HMAC-SHA256",a,sc,crypto.createHash("sha256").update(cr).digest("hex")].join("\n");
  const sig=crypto.createHmac("sha256",hm(hm(hm(hm("AWS4"+SK,d),R),"s3"),"aws4_request")).update(sts).digest("hex");
  const r=await fetch(`${E}/${B}?${q}`,{headers:{Authorization:`AWS4-HMAC-SHA256 Credential=${AK}/${sc}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${sig}`,
    "x-amz-content-sha256":"UNSIGNED-PAYLOAD","x-amz-date":a}});
  const xml=await r.text();
  const items=[...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)].map(([,c])=>({k:(c.match(/<Key>([^<]+)</)||[])[1]||"",s:+((c.match(/<Size>(\d+)</)||[])[1]||0)}));
  return { items,
           next:(xml.match(/<NextContinuationToken>([^<]+)</)||[])[1] };
}
async function all(p:string){ let t:string|undefined, out:{k:string,s:number}[]=[];
  do { const r=await page(p,t); out=out.concat(r.items); t=r.next; } while(t); return out; }
async function main(){
for (const [name,id] of [["Sesión 3 (nueva)","6aa0e9e72418e7f3a4061099"],["Sesión 2 (ref)","6a9ac38d2d83f8834741d02c"]] as [string,string][]) {
  const items = await all(`fixtergeek/videos/6a78ff744a8e00e3b2eea500/${id}/hls/`);
  const dirs = new Map<string,{n:number,b:number}>();
  for (const it of items){ const rest = it.k.split("/hls/")[1]; const seg = rest.includes("/") ? rest.split("/")[0] : "(raíz) "+rest;
    const e=dirs.get(seg)||{n:0,b:0}; e.n++; e.b+=it.s; dirs.set(seg,e); }
  console.log(`\n=== ${name} — ${items.length} objetos`);
  for (const [k,v] of [...dirs].sort()) console.log(`   ${k.padEnd(22)} ${String(v.n).padStart(4)} obj  ${(v.b/1e6).toFixed(0)} MB`);
}
}
main().then(()=>process.exit(0));
