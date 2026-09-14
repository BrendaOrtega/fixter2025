import crypto from "node:crypto";
console.log("BUCKET:",JSON.stringify(process.env.BUCKET_NAME),"ENDPOINT:",JSON.stringify(process.env.AWS_ENDPOINT_URL_S3),"REGION:",JSON.stringify(process.env.AWS_REGION));
const AK=process.env.AWS_ACCESS_KEY_ID!, SK=process.env.AWS_SECRET_ACCESS_KEY!;
const B=(process.env.BUCKET_NAME||"").replace(/"/g,""), E=(process.env.AWS_ENDPOINT_URL_S3||"https://t3.storage.dev").replace(/"/g,"").replace(/\/$/,"");
const H=new URL(E).host, R=(process.env.AWS_REGION||"auto").replace(/"/g,"");
const hm=(k:any,d:string)=>crypto.createHmac("sha256",k).update(d).digest();
async function ls(prefix:string){
  const a=new Date().toISOString().replace(/[-:]|\.\d{3}/g,""), d=a.slice(0,8);
  const q=`list-type=2&max-keys=50&prefix=${encodeURIComponent(prefix)}`;
  const cr=["GET",`/${B}`,q,`host:${H}\nx-amz-content-sha256:UNSIGNED-PAYLOAD\nx-amz-date:${a}\n`,
    "host;x-amz-content-sha256;x-amz-date","UNSIGNED-PAYLOAD"].join("\n");
  const sc=`${d}/${R}/s3/aws4_request`;
  const sts=["AWS4-HMAC-SHA256",a,sc,crypto.createHash("sha256").update(cr).digest("hex")].join("\n");
  const sig=crypto.createHmac("sha256",hm(hm(hm(hm("AWS4"+SK,d),R),"s3"),"aws4_request")).update(sts).digest("hex");
  const r=await fetch(`${E}/${B}?${q}`,{headers:{Authorization:`AWS4-HMAC-SHA256 Credential=${AK}/${sc}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${sig}`,
    "x-amz-content-sha256":"UNSIGNED-PAYLOAD","x-amz-date":a}});
  console.log("HTTP",r.status); const xml=await r.text();
  if(!r.ok){console.log(xml.slice(0,300));return;}
  console.log([...xml.matchAll(/<Key>([^<]+)</g)].map(m=>m[1]).slice(0,15).join("\n")||"(vacío)");
}
ls(process.env.P||"fixtergeek/videos/").then(()=>process.exit(0));
