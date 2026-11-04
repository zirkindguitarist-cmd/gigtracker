const {site}=require("../../lib/core");
exports.handler=async e=>{const r=await site(e.queryStringParameters||{},e.httpMethod,e.headers["x-pass"],e.body);return{statusCode:r.status,headers:{"content-type":"application/json"},body:JSON.stringify(r.json)}};
