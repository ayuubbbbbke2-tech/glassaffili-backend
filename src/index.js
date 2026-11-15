const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: corsHeaders
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === "/api/health") {
      return json({
        status: "online",
        app: "GlassAffili",
        generator: "Wan 2.2"
      });
    }

    if (!env.REPLICATE_API_TOKEN) {
  return json({
    error: "Secret REPLICATE_API_TOKEN tidak terbaca oleh Worker"
  }, 500);
    }

    // Membuat video
    if (url.pathname === "/api/jobs" && request.method === "POST") {
      try {
        const body = await request.json();

        const image = body.imageUrl || body.image;
        const prompt = body.prompt ||
          "Create a realistic product showcase video, natural lighting, smooth camera movement, professional UGC style.";

        if (!image || !/^https:\/\//i.test(image)) {
          return json({
            error: "Masukkan URL gambar produk HTTPS yang valid"
          }, 400);
        }

        const model = env.VIDEO_MODEL ||
          "wan-video/wan-2.2-i2v-a14b";

        const response = await fetch(
          `https://api.replicate.com/v1/models/${model}/predictions`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${env.REPLICATE_API_TOKEN}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              input: {
                image,
                prompt,
                resolution: "480p",
                num_frames: 81,
                frames_per_second: 16,
                sample_steps: 30
              }
            })
          }
        );

        const result = await response.json();

        if (!response.ok) {
          return json({
            error: result.detail || result.error || "Replicate gagal membuat video"
          }, response.status);
        }

        return json({
          id: result.id,
          status: result.status,
          prediction: result
        }, 202);

      } catch (error) {
        return json({ error: error.message }, 500);
      }
    }

    // Mengecek proses video
    const match = url.pathname.match(/^\/api\/jobs\/([^/]+)$/);

    if (match && request.method === "GET") {
      try {
        const id = match[1];

        const response = await fetch(
          `https://api.replicate.com/v1/predictions/${encodeURIComponent(id)}`,
          {
            headers: {
              "Authorization": `Bearer ${env.REPLICATE_API_TOKEN}`
            }
          }
        );

        const result = await response.json();

        if (!response.ok) {
          return json({
            error: result.detail || "Gagal mengecek video"
          }, response.status);
        }

        return json({
          id: result.id,
          status: result.status,
          videoUrl: result.status === "succeeded"
            ? result.output
            : null,
          error: result.error
        });

      } catch (error) {
        return json({ error: error.message }, 500);
      }
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return json({ error: "Halaman tidak ditemukan" }, 404);
  }
};
