const {remind}=require("../../lib/core");
exports.handler=async e=>{
  if(e&&e.httpMethod&&e.headers["x-pass"]!==process.env.APP_PASSWORD)return{statusCode:401,body:"{}"};
  return{statusCode:200,body:JSON.stringify(await remind())};
};
