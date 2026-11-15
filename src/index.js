export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({
        status: "online",
        app: "GlassAffili"
      });
    }

    if (url.pathname === "/api/jobs" && request.method === "POST") {
      return Response.json({
        error: "Video generator sedang disiapkan"
      }, { status: 501 });
    }

    return env.ASSETS.fetch(request);
  }
};
