export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/v1/', '');

    if (url.pathname.startsWith('/api/v1/')) {
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

    return new Response('Path not found', { status: 404 });
  }
};
