const {pub}=require("../../lib/core");
exports.handler=async e=>{const r=await pub(e.queryStringParameters||{},e.httpMethod,e.body);return{statusCode:r.status,headers:{"content-type":"application/json"},body:JSON.stringify(r.json)}};
