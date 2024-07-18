export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Suporte a múltiplas extensões de imagem
    const supportedExtensions = ['png', 'jpg', 'jpeg', 'gif'];

    // Verificar se a requisição é para o index.html
    if (url.pathname === '/api/v1/' || url.pathname === '/api/v1/index') {
      const indexUrl = 'https://raw.githubusercontent.com/yukathekid/anikodi/main/api/v1/index.md';
      const response = await fetch(indexUrl);
      
      if (!response.ok) {
        return new Response('Index file not found', { status: 404 });
      }
      
      const headers = new Headers(response.headers);
      headers.set('Content-Type', 'text/markdown');
      
      return new Response(response.body, {
        status: response.status,
        headers: headers
      });
    }

    // Handle image serving for different categories
    const categories = ['filmes', 'series', 'tv', 'radio', 'animes'];
    for (const category of categories) {
      if (url.pathname.startsWith(`/api/v1/${category}/`)) {
        const path = url.pathname.replace(`/api/v1/${category}/`, '');
        
        for (const ext of supportedExtensions) {
          const imageUrl = `https://raw.githubusercontent.com/yukathekid/anikodi/main/api/v1/${category}/${path}.${ext}`;
          const response = await fetch(imageUrl);
          
          if (response.ok) {
            const headers = new Headers(response.headers);
            headers.set('Content-Type', `image/${ext === 'jpg' ? 'jpeg' : ext}`);
            
            return new Response(response.body, {
              status: response.status,
              headers: headers
            });
          }
        }
        
        return new Response('Image not found in supported formats', { status: 404 });
      }
    }

    // Let other requests be handled by Cloudflare Pages and _redirects
    return env.ASSETS.fetch(request);
  }
};
