const {remind}=require("../lib/core");
module.exports=async(req,res)=>{
  const ok=(process.env.CRON_SECRET&&req.headers.authorization==="Bearer "+process.env.CRON_SECRET)||req.headers["x-pass"]===process.env.APP_PASSWORD;
  if(!ok)return res.status(401).json({error:"auth"});
  res.json(await remind());
};
