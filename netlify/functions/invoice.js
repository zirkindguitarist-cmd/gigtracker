const {invoice}=require("../../lib/core");
exports.handler=async e=>{const q=e.queryStringParameters||{};const r=await invoice(q.id,q.t,e.httpMethod,e.body);return{statusCode:r.status,headers:{"content-type":"application/json"},body:JSON.stringify(r.json)}};
