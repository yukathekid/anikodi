export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Suporte a múltiplas extensões de imagem
    const supportedExtensions = ['png', 'jpg', 'jpeg', 'gif'];

    // Verificar se a requisição é para o index.html
    if (url.pathname === '/api/v1/' || url.pathname === '/api/v1/index.html') {
      const indexUrl = 'https://raw.githubusercontent.com/yukathekid/anikodi/main/api/v1/index.html';
      const response = await fetch(indexUrl);
      
      if (!response.ok) {
        return new Response('Index file not found', { status: 404 });
      }
      
      const headers = new Headers(response.headers);
      headers.set('Content-Type', 'text/html');
      
      return new Response(response.body, {
        status: response.status,
        headers: headers
      });
    }

    // Handle image serving
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
