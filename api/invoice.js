const {invoice}=require("../lib/core");
module.exports=async(req,res)=>{const r=await invoice(req.query.id,req.query.t,req.method,req.body);res.status(r.status).json(r.json)};
