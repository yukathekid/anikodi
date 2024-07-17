export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Suporte a múltiplas extensões de imagem
    const supportedExtensions = ['png', 'jpg', 'jpeg', 'gif'];

    if (url.pathname.startsWith('/api/v1/')) {
      const basePath = url.pathname.replace('/api/v1/', '');
      
      for (const ext of supportedExtensions) {
        const imageUrl = `https://raw.githubusercontent.com/yukathekid/anikodi/main/api/v1/${basePath}.${ext}`;
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
      
      // Se nenhuma das extensões for encontrada, retorna 404
      return new Response('Image not found in supported formats', { status: 404 });
    }

    // Let other requests be handled by Cloudflare Pages and _redirects
    return env.ASSETS.fetch(request);
  }
};
