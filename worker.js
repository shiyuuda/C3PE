export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (
      url.pathname === "/api/c3pe-test" &&
      request.method === "GET"
    ) {
      return new Response(
        JSON.stringify({
          ok: true,
          service: "C3PE Worker",
          version: "3.6.2",
          aiBinding: !!env.AI
        }),
        {
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    return env.ASSETS.fetch(request);
  }
};
