const {handle}=require("../../lib/core");
exports.handler=async e=>{const r=await handle(e.httpMethod,e.headers["x-pass"],e.body);return{statusCode:r.status,headers:{"content-type":"application/json"},body:JSON.stringify(r.json)}};
