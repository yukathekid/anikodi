export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle redirections defined in _redirects
    const redirects = {
      '/playlist/animes': '/playlists/animes.m3u',
      '/playlist/movies': '/playlists/movies.m3u',
      // Adicione mais redirecionamentos conforme necessário
    };

    if (redirects[url.pathname]) {
      return Response.redirect(`${url.origin}${redirects[url.pathname]}`, 200);
    }

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

    // Default response if no other conditions are met
    return new Response('Path not found', { status: 404 });
  }
};
