const crypto=require("crypto");
const U=()=>process.env.UPSTASH_REDIS_REST_URL,T=()=>process.env.UPSTASH_REDIS_REST_TOKEN;
const r=async c=>{const x=await fetch(U(),{method:"POST",headers:{Authorization:"Bearer "+T()},body:JSON.stringify(c)});const j=await x.json();if(j.error)throw new Error(j.error);return j.result};
async function all(){const a=(await r(["HGETALL","gigs"]))||[];const o=[];for(let i=1;i<a.length;i+=2)o.push(JSON.parse(a[i]));return o}
const sign=(id,pu)=>crypto.createHmac("sha256",process.env.APP_PASSWORD||"x").update((pu?pu+":":"")+String(id)).digest("hex").slice(0,24);
const baseUrl=()=>(process.env.SITE_URL||process.env.URL||(process.env.VERCEL_PROJECT_PRODUCTION_URL?"https://"+process.env.VERCEL_PROJECT_PRODUCTION_URL:"")||(process.env.VERCEL_URL?"https://"+process.env.VERCEL_URL:"")).replace(/\/$/,"");
const same=(t,tok)=>{const a=Buffer.from(String(t||"")),b=Buffer.from(tok);return a.length===b.length&&crypto.timingSafeEqual(a,b)};
const ts=s=>{const[y,m,d]=s.split("-").map(Number);return Date.UTC(y,m-1,d)};
const t12=t=>{if(!t)return"";let[h,m]=t.split(":");h=+h;return(h%12||12)+":"+m+(h<12?" AM":" PM")};
const chi=()=>new Date().toLocaleDateString("en-CA",{timeZone:"America/Chicago"});
const qs=(id,pu)=>"?id="+encodeURIComponent(id)+"&t="+sign(id,pu);
async function mail(subject,text){
  const x=await fetch("https://api.resend.com/emails",{method:"POST",
    headers:{Authorization:"Bearer "+process.env.RESEND_API_KEY,"content-type":"application/json"},
    body:JSON.stringify({from:"Gig Tracker <onboarding@resend.dev>",to:[process.env.REMIND_TO],subject,text})});
  if(!x.ok)throw new Error("Resend "+x.status+" "+await x.text());
}

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

async function invoice(id,t,method){
  const canPay=process.env.APP_PASSWORD&&same(t,sign(id,"paid")),canView=process.env.APP_PASSWORD&&(same(t,sign(id))||canPay);
  if(!canView)return{status:403,json:{error:"bad link"}};
  try{const o=await r(["HGET","gigs",id]);if(!o)return{status:404,json:{error:"not found"}};
    const g=JSON.parse(o);
    if(method==="POST"){if(!canPay)return{status:403,json:{error:"bad link"}};
      g.paid=true;g.paidDate=chi();await r(["HSET","gigs",id,JSON.stringify(g)]);}
    const k=["id","title","type","venue","date","start","end","client","phone","email","fee","deposit","paid","paidDate"];
    return{status:200,json:Object.fromEntries(k.map(x=>[x,g[x]||""]))}}
  catch(e){return{status:500,json:{error:String(e.message||e)}}}
}

// Public endpoint: ?a=request (client booking form) and ?a=decide (your approve/deny link)
async function pub(q,method,body){
  try{
    const b=typeof body==="string"?JSON.parse(body||"{}"):(body||{});
    if(q.a==="request"&&method==="POST"){
      if(b.website)return{status:200,json:{ok:1}};
      const c=(s,n)=>String(s||"").trim().slice(0,n||200);
      const name=c(b.name,100),phone=c(b.phone,40),email=c(b.email,120),date=c(b.date,10);
      if(!name||!/^\d{4}-\d{2}-\d{2}$/.test(date)||(!phone&&!email))return{status:400,json:{error:"Please fill in your name, the date, and a phone number or email."}};
      const day=chi(),n=await r(["INCR","rl:"+day]);if(n===1)await r(["EXPIRE","rl:"+day,172800]);
      if(n>40)return{status:429,json:{error:"Too many requests today. Please try again tomorrow."}};
      const type=c(b.type,60)||"Other",start=/^\d{2}:\d{2}$/.test(b.start||"")?b.start:"";
      const music=c(b.music,1500),more=c(b.notes,1500);
      const g={id:"r"+Date.now().toString(36)+Math.random().toString(36).slice(2,5),status:"pending",type,client:name,phone,email,date,start,
        venue:c(b.venue,150),address:c(b.address,200),notes:[music&&"Music preferences: "+music,more&&"Notes: "+more].filter(Boolean).join("\n\n"),title:type+" – "+name};
      await r(["HSET","gigs",g.id,JSON.stringify(g)]);
      try{await mail("New gig request: "+g.title+" ("+date+")",[g.title,"",date+(start?"  "+t12(start):""),
        g.venue?"Venue: "+g.venue:"",g.address?"Address: "+g.address:"","Contact: "+[name,phone,email].filter(Boolean).join(" / "),
        g.notes?"\n"+g.notes:"",baseUrl()?"\nReview, approve or deny:\n"+baseUrl()+"/decide.html"+qs(g.id,"decide"):""].filter(x=>x!=="").join("\n"))}catch(e){}
      return{status:200,json:{ok:1}}}
    if(q.a==="decide"){
      if(!process.env.APP_PASSWORD||!same(q.t,sign(q.id,"decide")))return{status:403,json:{error:"bad link"}};
      const o=await r(["HGET","gigs",q.id]);if(!o)return{status:404,json:{error:"gone"}};
      const g=JSON.parse(o);
      if(method==="POST"){
        if(g.status!=="pending")return{status:200,json:{done:"already"}};
        if(b.action==="approve"){g.status="";await r(["HSET","gigs",q.id,JSON.stringify(g)]);return{status:200,json:{done:"approved"}}}
        if(b.action==="deny"){await r(["HDEL","gigs",q.id]);return{status:200,json:{done:"denied"}}}
        return{status:400,json:{error:"bad action"}}}
      const k=["title","type","client","phone","email","date","start","venue","address","notes"];
      return{status:200,json:{...Object.fromEntries(k.map(x=>[x,g[x]||""])),pending:g.status==="pending"}}}
    return{status:404,json:{error:"not found"}};
  }catch(e){return{status:500,json:{error:String(e.message||e)}}}
}


// ---- Business website: media gallery, reviews, services ----
async function hall(key){const a=(await r(["HGETALL",key]))||[];const o=[];for(let i=1;i<a.length;i+=2)o.push(JSON.parse(a[i]));return o}
const SERVICES=[
  {title:"Live One-Man Band",text:"Live keyboard and piano performance that fills the room, all from one performer."},
  {title:"DJ Services",text:"Music for dancing and celebrating, tailored to your crowd."},
  {title:"Ceremony & Background Music",text:"Soft live music while guests arrive, dine and mingle."}];
async function services(){try{const j=JSON.parse(await r(["GET","services"]));if(Array.isArray(j)&&j.length)return j}catch(e){}return SERVICES}
const rid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
async function site(q,method,pass,body){
  try{
    const b=typeof body==="string"?JSON.parse(body||"{}"):(body||{});
    const auth=!!process.env.APP_PASSWORD&&pass===process.env.APP_PASSWORD;
    if(q.a==="public"&&method==="GET"){
      const media=(await hall("media")).sort((x,y)=>y.created-x.created);
      const reviews=(await hall("reviews")).filter(x=>x.ok).sort((x,y)=>y.created-x.created).map(({id,name,rating,text,created})=>({id,name,rating,text,created}));
      return{status:200,json:{media,reviews,services:await services()}}}
    if(q.a==="review"&&method==="POST"){
      if(b.website)return{status:200,json:{ok:1}};
      const c=(v,n)=>String(v||"").trim().slice(0,n),name=c(b.name,60),text=c(b.text,1200),rating=Math.round(+b.rating);
      if(!name||text.length<5||!(rating>=1&&rating<=5))return{status:400,json:{error:"Please add your name, a star rating and a few words."}};
      const day=chi(),n=await r(["INCR","rl:rv:"+day]);if(n===1)await r(["EXPIRE","rl:rv:"+day,172800]);
      if(n>20)return{status:429,json:{error:"Too many reviews today. Please try again tomorrow."}};
      const v={id:rid("v"),name,rating,text,created:Date.now(),ok:false};
      await r(["HSET","reviews",v.id,JSON.stringify(v)]);
      try{await mail("New review to approve from "+name+" ("+rating+"/5)",name+" ("+rating+"/5):\n\n"+text+(baseUrl()?"\n\nApprove or delete it here:\n"+baseUrl()+"/admin.html":""))}catch(e){}
      return{status:200,json:{ok:1}}}
    if(!auth)return{status:401,json:{error:"auth"}};
    if(q.a==="admin"&&method==="GET"){
      return{status:200,json:{media:(await hall("media")).sort((x,y)=>y.created-x.created),reviews:(await hall("reviews")).sort((x,y)=>y.created-x.created),services:await services(),
        cloud:{name:process.env.CLOUDINARY_CLOUD_NAME||"",preset:process.env.CLOUDINARY_UPLOAD_PRESET||""}}}}
    if(method==="POST"){
      if(q.a==="addmedia"){
        const url=String(b.url||"");if(!/^https:\/\/res\.cloudinary\.com\//.test(url)||url.length>500)return{status:400,json:{error:"bad url"}};
        const m={id:rid("m"),url,type:b.type==="video"?"video":"image",created:Date.now()};
        await r(["HSET","media",m.id,JSON.stringify(m)]);return{status:200,json:{ok:1}}}
      if(q.a==="delmedia"){await r(["HDEL","media",String(b.id||"")]);return{status:200,json:{ok:1}}}
      if(q.a==="reviewok"){const o=await r(["HGET","reviews",String(b.id||"")]);if(!o)return{status:404,json:{error:"gone"}};
        const v=JSON.parse(o);v.ok=!!b.ok;await r(["HSET","reviews",v.id,JSON.stringify(v)]);return{status:200,json:{ok:1}}}
      if(q.a==="delreview"){await r(["HDEL","reviews",String(b.id||"")]);return{status:200,json:{ok:1}}}
      if(q.a==="services"){const l=Array.isArray(b.services)?b.services.slice(0,12).map(x=>({title:String(x.title||"").slice(0,80),text:String(x.text||"").slice(0,400)})).filter(x=>x.title):[];
        await r(["SET","services",JSON.stringify(l)]);return{status:200,json:{ok:1}}}}
    return{status:404,json:{error:"not found"}};
  }catch(e){return{status:500,json:{error:String(e.message||e)}}}
}

async function remind(){
  const today=chi(),out={sent:[],errors:[]},list=await all(),b=baseUrl();
  for(const g of list){
    if(g.status==="pending")continue;
    const days=Math.round((ts(g.date)-ts(today))/864e5);
    const label={7:"in 1 week",2:"in 2 days",0:"TODAY"}[days];
    if(!label||(g.sent&&g.sent[days]))continue;
    const bal=(+g.fee||0)-(+g.deposit||0);
    const text=[g.title,"",g.date+(g.start?"  "+t12(g.start):""),
      g.venue?"Venue: "+g.venue:"",g.address?"Address: "+g.address:"",
      g.client?"Client: "+g.client+(g.phone?" ("+g.phone+")":""):"",
      g.fee?"Fee: $"+g.fee+"  Deposit: $"+(g.deposit||0)+"  Balance due: $"+bal:"",
      g.notes?"\nNotes:\n"+g.notes:"",
      days===0&&g.fee&&b?"\nINVOICE for the client (open, download, forward):\n"+b+"/invoice.html"+qs(g.id)+"\n\nMark paid (after you collect):\n"+b+"/mark.html"+qs(g.id,"paid"):""].filter(x=>x!=="").join("\n");
    try{await mail("Gig "+label+": "+(g.title||"Untitled"),text);
      g.sent={...(g.sent||{}),[days]:1};await r(["HSET","gigs",g.id,JSON.stringify(g)]);out.sent.push(g.title+" ("+label+")");
    }catch(e){out.errors.push(g.title+": "+e.message)}
  }
  for(const g of list){
    if(g.status==="pending")continue;
    const bal=(+g.fee||0)-(+g.deposit||0),days=Math.round((ts(g.date)-ts(today))/864e5);
    if(!g.fee||g.paid||bal<=0||days>-1)continue;
    if(g.followed&&Math.round((ts(today)-ts(g.followed))/864e5)<2)continue;
    const text=["Follow up: payment not received yet.","",g.title+" ("+g.date+")",
      g.client?"Client: "+g.client:"",g.phone?"Phone: "+g.phone:"",g.email?"Email: "+g.email:"","Balance due: $"+bal,
      b?"\nInvoice to resend:\n"+b+"/invoice.html"+qs(g.id):"",
      b?"\nGot paid? Tap to mark it paid and stop these reminders:\n"+b+"/mark.html"+qs(g.id,"paid"):""].filter(x=>x!=="").join("\n");
    try{await mail("Follow up: "+(g.client||g.title)+" owes $"+bal,text);
      g.followed=today;await r(["HSET","gigs",g.id,JSON.stringify(g)]);out.sent.push("follow-up: "+g.title);
    }catch(e){out.errors.push(g.title+": "+e.message)}
  }
  return out;
}
module.exports={handle,remind,invoice,pub,site,sign};
