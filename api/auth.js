const {auth}=require("../lib/core");
module.exports=async(req,res)=>{const ip=String(req.headers["x-forwarded-for"]||"").split(",")[0].trim();const r=await auth(req.method,req.body,ip);res.status(r.status).json(r.json)};
