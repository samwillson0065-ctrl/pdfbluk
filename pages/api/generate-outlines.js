import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
function sanitizeFileName(name) {
  return name.toLowerCase().replace(/[^a-z0-9\-_. ]+/g, "").replace(/\s+/g, "_").substring(0,60) || "article";
}
export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  const {instruction,titles=[],count=5}=req.body||{};
  let articles=[];
  if(titles.length>0){
    articles=titles.map((t,idx)=>({title:t,filename:sanitizeFileName(t)+".pdf",outline:"Custom title provided"}));
  }else{
    if(!instruction) return res.status(400).json({error:"No instruction provided."});
    const n=Math.min(Math.max(parseInt(count,10),1),20);
    const prompt=`Generate ${n} unique article titles with a short outline each as JSON array.
Each item: { "title": "", "filename": "", "outline": "" }`;
    const completion=await openai.chat.completions.create({
      model:"gpt-4o-mini",
      messages:[{role:"system",content:"Return only valid JSON."},{role:"user",content:prompt+"\nInstruction: "+instruction}],
      max_tokens:1200,temperature:0.8});
    let arr=[];try{arr=JSON.parse(completion.choices[0].message.content);}catch{arr=[];}
    articles=arr.map((a,idx)=>({
      title:a.title||("Article "+(idx+1)),
      filename:sanitizeFileName(a.filename||a.title||("article_"+(idx+1)))+".pdf",
      outline:a.outline||""
    }));
  }
  res.status(200).json({articles});
}