const {auth}=require("../../lib/core");
exports.handler=async e=>{const ip=e.headers["x-nf-client-connection-ip"]||String(e.headers["x-forwarded-for"]||"").split(",")[0].trim();const r=await auth(e.httpMethod,e.body,ip);return{statusCode:r.status,headers:{"content-type":"application/json"},body:JSON.stringify(r.json)}};
