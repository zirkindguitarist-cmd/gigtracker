const {pub}=require("../lib/core");
module.exports=async(req,res)=>{const r=await pub(req.query,req.method,req.body);res.status(r.status).json(r.json)};
