const U=()=>process.env.UPSTASH_REDIS_REST_URL,T=()=>process.env.UPSTASH_REDIS_REST_TOKEN;
const r=async c=>{const x=await fetch(U(),{method:"POST",headers:{Authorization:"Bearer "+T()},body:JSON.stringify(c)});const j=await x.json();if(j.error)throw new Error(j.error);return j.result};
async function all(){const a=(await r(["HGETALL","gigs"]))||[];const o=[];for(let i=1;i<a.length;i+=2)o.push(JSON.parse(a[i]));return o}

async function handle(m,pass,body){
  if(!process.env.APP_PASSWORD||pass!==process.env.APP_PASSWORD)return{status:401,json:{error:"auth"}};
  try{
    if(m==="GET")return{status:200,json:await all()};
    if(m==="POST"){
      const b=typeof body==="string"?JSON.parse(body||"{}"):(body||{});
      if(b.del){await r(["HDEL","gigs",b.del]);return{status:200,json:{ok:1}}}
      const g=b.gig;if(!g||!g.id||!g.date)return{status:400,json:{error:"bad gig"}};
      const old=await r(["HGET","gigs",g.id]);const prev=old?JSON.parse(old):{};
      g.sent=g.date===prev.date?(prev.sent||{}):{};g.followed=prev.followed||"";
      await r(["HSET","gigs",g.id,JSON.stringify(g)]);
      return{status:200,json:{ok:1}}}
    return{status:405,json:{error:"method"}};
  }catch(e){return{status:500,json:{error:String(e.message||e)}}}
}

const crypto=require("crypto");
const sign=(id,pu)=>crypto.createHmac("sha256",process.env.APP_PASSWORD||"x").update((pu?pu+":":"")+String(id)).digest("hex").slice(0,24);
const baseUrl=()=>(process.env.SITE_URL||process.env.URL||(process.env.VERCEL_PROJECT_PRODUCTION_URL?"https://"+process.env.VERCEL_PROJECT_PRODUCTION_URL:"")||(process.env.VERCEL_URL?"https://"+process.env.VERCEL_URL:"")).replace(/\/$/,"");
async function invoice(id,t,method,body){
  const ok=(tok)=>{const a=Buffer.from(String(t||"")),b=Buffer.from(tok);return a.length===b.length&&crypto.timingSafeEqual(a,b)};
  const canPay=process.env.APP_PASSWORD&&ok(sign(id,"paid")),canView=process.env.APP_PASSWORD&&(ok(sign(id))||canPay);
  if(!canView)return{status:403,json:{error:"bad link"}};
  try{const o=await r(["HGET","gigs",id]);if(!o)return{status:404,json:{error:"not found"}};
    const g=JSON.parse(o);
    if(method==="POST"){if(!canPay)return{status:403,json:{error:"bad link"}};
      g.paid=true;g.paidDate=new Date().toLocaleDateString("en-CA",{timeZone:"America/Chicago"});
      await r(["HSET","gigs",id,JSON.stringify(g)]);}
    const k=["id","title","type","venue","date","start","end","client","phone","email","fee","deposit","paid","paidDate"];
    return{status:200,json:Object.fromEntries(k.map(x=>[x,g[x]||""]))}}
  catch(e){return{status:500,json:{error:String(e.message||e)}}}
}
const ts=s=>{const[y,m,d]=s.split("-").map(Number);return Date.UTC(y,m-1,d)};
const t12=t=>{if(!t)return"";let[h,m]=t.split(":");h=+h;return(h%12||12)+":"+m+(h<12?" AM":" PM")};

async function remind(){
  const today=new Date().toLocaleDateString("en-CA",{timeZone:"America/Chicago"});
  const out={sent:[],errors:[]};
  const list=await all();
  for(const g of list){
    const days=Math.round((ts(g.date)-ts(today))/864e5);
    const label={7:"in 1 week",2:"in 2 days",0:"TODAY"}[days];
    if(!label||(g.sent&&g.sent[days]))continue;
    const bal=(+g.fee||0)-(+g.deposit||0);
    const text=[g.title,"",g.date+(g.start?"  "+t12(g.start)+(g.end?" - "+t12(g.end):""):""),
      g.venue?"Venue: "+g.venue:"",g.address?"Address: "+g.address:"",
      g.client?"Client: "+g.client+(g.phone?" ("+g.phone+")":""):"",
      g.fee?"Fee: $"+g.fee+"  Deposit: $"+(g.deposit||0)+"  Balance due: $"+bal:"",
      g.notes?"\nNotes:\n"+g.notes:"",
      days===0&&g.fee&&baseUrl()?"\nINVOICE for the client (open, download, forward):\n"+baseUrl()+"/invoice.html?id="+encodeURIComponent(g.id)+"&t="+sign(g.id)+"\n\nMark paid (after you collect):\n"+baseUrl()+"/mark.html?id="+encodeURIComponent(g.id)+"&t="+sign(g.id,"paid"):""].filter(x=>x!=="").join("\n");
    try{
      const x=await fetch("https://api.resend.com/emails",{method:"POST",
        headers:{Authorization:"Bearer "+process.env.RESEND_API_KEY,"content-type":"application/json"},
        body:JSON.stringify({from:"Gig Tracker <onboarding@resend.dev>",to:[process.env.REMIND_TO],
          subject:"Gig "+label+": "+(g.title||"Untitled"),text})});
      if(!x.ok)throw new Error("Resend "+x.status+" "+await x.text());
      g.sent={...(g.sent||{}),[days]:1};
      await r(["HSET","gigs",g.id,JSON.stringify(g)]);
      out.sent.push(g.title+" ("+label+")");
    }catch(e){out.errors.push(g.title+": "+e.message)}
  }
  for(const g of list){
    const bal=(+g.fee||0)-(+g.deposit||0);
    const days=Math.round((ts(g.date)-ts(today))/864e5);
    if(!g.fee||g.paid||bal<=0||days>-1)continue;
    if(g.followed&&Math.round((ts(today)-ts(g.followed))/864e5)<2)continue;
    const b=baseUrl(),q="?id="+encodeURIComponent(g.id)+"&t=";
    const text=["Follow up: payment not received yet.","",g.title+" ("+g.date+")",
      g.client?"Client: "+g.client:"",g.phone?"Phone: "+g.phone:"",g.email?"Email: "+g.email:"",
      "Balance due: $"+bal,
      b?"\nInvoice to resend:\n"+b+"/invoice.html"+q+sign(g.id):"",
      b?"\nGot paid? Tap to mark it paid and stop these reminders:\n"+b+"/mark.html"+q+sign(g.id,"paid"):""].filter(x=>x!=="").join("\n");
    try{
      const x=await fetch("https://api.resend.com/emails",{method:"POST",
        headers:{Authorization:"Bearer "+process.env.RESEND_API_KEY,"content-type":"application/json"},
        body:JSON.stringify({from:"Gig Tracker <onboarding@resend.dev>",to:[process.env.REMIND_TO],
          subject:"Follow up: "+(g.client||g.title)+" owes $"+bal,text})});
      if(!x.ok)throw new Error("Resend "+x.status+" "+await x.text());
      g.followed=today;await r(["HSET","gigs",g.id,JSON.stringify(g)]);
      out.sent.push("follow-up: "+g.title);
    }catch(e){out.errors.push(g.title+": "+e.message)}
  }
  return out;
}
module.exports={handle,remind,invoice,sign};
