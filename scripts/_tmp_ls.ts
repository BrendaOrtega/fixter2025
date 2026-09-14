import crypto from "node:crypto";
const AK=process.env.AWS_ACCESS_KEY_ID!, SK=process.env.AWS_SECRET_ACCESS_KEY!;
const B=process.env.BUCKET_NAME!, E=(process.env.AWS_ENDPOINT_URL_S3||"https://t3.storage.dev").replace(/\/$/,"");
const H=new URL(E).host, R=(process.env.AWS_REGION||"auto").replace(/"/g,"");
const hm=(k:any,d:string)=>crypto.createHmac("sha256",k).update(d).digest();
async function ls(prefix:string){
  const a=new Date().toISOString().replace(/[-:]|\.\d{3}/g,""), d=a.slice(0,8);
  const q=`list-type=2&max-keys=200&prefix=${encodeURIComponent(prefix)}`;
  const cr=["GET",`/${B}`,q,`host:${H}\nx-amz-content-sha256:UNSIGNED-PAYLOAD\nx-amz-date:${a}\n`,
    "host;x-amz-content-sha256;x-amz-date","UNSIGNED-PAYLOAD"].join("\n");
  const sc=`${d}/${R}/s3/aws4_request`;
  const sts=["AWS4-HMAC-SHA256",a,sc,crypto.createHash("sha256").update(cr).digest("hex")].join("\n");
  const sig=crypto.createHmac("sha256",hm(hm(hm(hm("AWS4"+SK,d),R),"s3"),"aws4_request")).update(sts).digest("hex");
  const r=await fetch(`${E}/${B}?${q}`,{headers:{Authorization:`AWS4-HMAC-SHA256 Credential=${AK}/${sc}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${sig}`,
    "x-amz-content-sha256":"UNSIGNED-PAYLOAD","x-amz-date":a}});
  const xml=await r.text();
  return [...xml.matchAll(/<Key>([^<]+)<\/Key>[\s\S]*?<Size>(\d+)</g)].map(m=>({k:m[1],s:+m[2]}));
}
async function main(){
for (const [name,id] of [["Sesión 1","6a9816adfc6f9b4518a3f275"],["Sesión 2","6a9ac38d2d83f8834741d02c"],["4 agentes (ref OK)","6a91035d7991c37dfdd51111"]] as const) {
  const items = await ls(`fixtergeek/videos/6a78ff744a8e00e3b2eea500/${id}/hls/`);
  const dirs = new Map<string,{n:number,b:number}>();
  for (const it of items){ const seg=it.k.split("/hls/")[1].split("/")[0];
    const e=dirs.get(seg)||{n:0,b:0}; e.n++; e.b+=it.s; dirs.set(seg,e); }
  console.log(`\n=== ${name}  (${items.length} objetos${items.length>=200?"+, truncado":""})`);
  for (const [k,v] of dirs) console.log(`   ${k.padEnd(16)} ${String(v.n).padStart(4)} obj  ${(v.b/1e6).toFixed(1)} MB`);
}
}
main().then(()=>process.exit(0));
