import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
function sanitizeFileName(name) {
  return name.toLowerCase().replace(/[^a-z0-9\-_. ]+/g, "").replace(/\s+/g, "_").substring(0,60) || "article";
}
export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  const {instruction,titles=[]}=req.body||{};
  if(!instruction) return res.status(400).json({error:"Instruction is required."});
  if(!titles.length) return res.status(400).json({error:"At least one title is required."});
  const prompt=`You are given a master instruction and some article titles. For each title, generate a short 2-3 sentence outline that follows the instruction. Return a JSON array of objects: { "title": "", "filename": "", "outline": "" }.\nInstruction: ${instruction}\nTitles: ${titles.join(", ")}`;
  const completion=await openai.chat.completions.create({
    model:"gpt-4o-mini",
    messages:[{role:"system",content:"Return only valid JSON."},{role:"user",content:prompt}],
    max_tokens:1200
  });
  let articles=[];try{articles=JSON.parse(completion.choices[0].message.content);}catch{articles=[];}
  articles=articles.map((a,i)=>({
    title:a.title||titles[i],
    filename:sanitizeFileName(a.filename||a.title||`article_${i+1}`)+".pdf",
    outline:a.outline||""
  }));
  res.status(200).json({articles});
}