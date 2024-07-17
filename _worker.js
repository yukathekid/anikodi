export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle image serving
    if (url.pathname.startsWith('/api/v1/')) {
      const path = url.pathname.replace('/api/v1/', '');
      const imageUrl = `https://raw.githubusercontent.com/yukathekid/anikodi/main/api/v1/${path}.png`;
      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        return new Response('Image not found', { status: 404 });
      }
      
      const headers = new Headers(response.headers);
      headers.set('Content-Type', 'image/png');
      
      return new Response(response.body, {
        status: response.status,
        headers: headers
      });
    }

    // Let other requests be handled by Cloudflare Pages and _redirects
    return env.ASSETS.fetch(request);
  }
};
