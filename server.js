import express from "express";
import cors from "cors";
import crypto from "node:crypto";

const app = express();
app.use(cors());
app.use(express.json({limit:"2mb"}));
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN || "";
const VIDEO_MODEL = process.env.VIDEO_MODEL || "wan-video/wan-2.2-i2v-a14b";

const jobs = new Map();

function id(){ return crypto.randomBytes(7).toString("hex"); }

function buildPrompt({platform, style, productName, scene}) {
  const base = `realistic Indonesian UGC ecommerce advertisement, ${productName || "the product"}, natural creator, authentic handheld smartphone footage, realistic skin and hands, real-world lighting, believable product proportions, no logos added, no text in the scene, vertical 9:16, ${style || "viral"} style`;
  const scenes = {
    1:"A creator naturally picks up the product from a table and looks at it with genuine curiosity. Close-up product reveal.",
    2:"The creator holds the product close to the camera and slowly rotates it, showing material, stitching, texture and important details.",
    3:"The creator naturally uses or wears the product in a real home/outdoor setting, showing how it looks during normal use.",
    4:"A practical test of the product in a believable everyday situation. Natural movement, realistic camera shake and focus.",
    5:"A final close-up of the product followed by the creator presenting it toward camera. Friendly creator-style ending."
  };
  return `${base}. ${scenes[scene] || scenes[1]} Camera motion should be subtle and physically plausible. Avoid deformed hands, duplicated objects, warped product geometry, floating objects, plastic-looking skin, fake text, watermarks, or impossible motion.`;
}

async function replicateCreate(input){
  if(!REPLICATE_TOKEN) throw new Error("REPLICATE_API_TOKEN belum diatur di server.");
  const r = await fetch(`https://api.replicate.com/v1/models/${VIDEO_MODEL}/predictions`,{
    method:"POST",
    headers:{Authorization:`Bearer ${REPLICATE_TOKEN}`,"Content-Type":"application/json"},
    body:JSON.stringify({input})
  });
  const data = await r.json();
  if(!r.ok) throw new Error(data.detail || data.error || "Gagal membuat prediction.");
  return data;
}

app.post("/api/jobs", async (req,res)=>{
  try{
    const {platform="Shopee",style="Viral",productName="",productImageUrl="",scene=1} = req.body || {};
    const jobId=id();
    jobs.set(jobId,{id:jobId,status:"queued",progress:5,platform,style,productName,createdAt:Date.now()});

    if(!REPLICATE_TOKEN){
      return res.status(202).json({
        jobId,
        status:"queued",
        demo:true,
        message:"Backend aktif. Pasang REPLICATE_API_TOKEN untuk mulai render AI."
      });
    }

    const prompt=buildPrompt({platform,style,productName,scene});
    const input={prompt};
    if(productImageUrl) input.image=productImageUrl;

    const prediction=await replicateCreate(input);
    jobs.set(jobId,{...jobs.get(jobId),status:prediction.status,progress:15,predictionId:prediction.id,prompt});
    return res.status(202).json({jobId,predictionId:prediction.id,status:prediction.status});
  }catch(e){
    return res.status(500).json({error:e.message});
  }
});

app.get("/api/jobs/:id", async (req,res)=>{
  const job=jobs.get(req.params.id);
  if(!job) return res.status(404).json({error:"Job tidak ditemukan."});
  if(job.demo) return res.json(job);

  if(job.predictionId && REPLICATE_TOKEN){
    try{
      const r=await fetch(`https://api.replicate.com/v1/predictions/${job.predictionId}`,{
        headers:{Authorization:`Bearer ${REPLICATE_TOKEN}`}
      });
      const p=await r.json();
      const map={starting:20,processing:55,succeeded:100,failed:100,canceled:100};
      const updated={...job,status:p.status,progress:map[p.status] ?? job.progress,output:p.output,error:p.error};
      jobs.set(job.id,updated);
      return res.json(updated);
    }catch(e){}
  }
  return res.json(job);
});

app.get("*",(req,res)=>res.sendFile("index.html",{root:"public"}));
app.listen(PORT,()=>console.log(`GlassAffili backend running on :${PORT}`));
