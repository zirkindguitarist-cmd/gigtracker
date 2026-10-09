const {handle}=require("../lib/core");
module.exports=async(req,res)=>{const r=await handle(req.method,req.headers["x-pass"],req.body);res.status(r.status).json(r.json)};
