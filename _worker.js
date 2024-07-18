export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Verificar se a requisição é para a lista m3u
    if (url.pathname === '/m3u') {
      const jsonUrl = 'https://yukathekid.github.io/anikodi/channels.json';

      try {
        const response = await fetch(jsonUrl);
        if (!response.ok) {
          return new Response('Erro ao buscar dados do JSON', { status: 500 });
        }
        
        const data = await response.json();
        let m3uContent = '#EXTM3U\n';
        data.forEach(item => {
          m3uContent += `#EXTINF:-1 tvg-id="${item.id}" tvg-name="${item.name}" tvg-logo="${item.logo}" group-title="${item.group}",${item.name}\n`;
          m3uContent += `${item.url}\n`;
        });

        return new Response(m3uContent, {
          headers: {
            'Content-Type': 'audio/mpegurl',
          },
        });
      } catch (error) {
        return new Response('Erro ao processar a lista m3u', { status: 500 });
      }
    }

    // Suporte a múltiplas extensões de imagem
    const supportedExtensions = ['png', 'jpg', 'jpeg', 'gif'];

    // Verificar se a requisição é para o index.html
    if (url.pathname === '/index.html') {
      const indexUrl = 'https://raw.githubusercontent.com/yukathekid/anikodi/main/index.html';
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

    // Handle image serving for different categories and types
    const categories = ['capas', 'logos'];
    for (const category of categories) {
      if (url.pathname.startsWith(`/${category}/`)) {
        const path = url.pathname.replace(`/${category}/`, '');
        const categoryPath = path.split('/')[0];
        const imagePath = path.split('/').slice(1).join('/');

        // Organize files by category and A-Z subdirectories
        const fileUrl = `https://raw.githubusercontent.com/yukathekid/anikodi/main/assets/${category}/${categoryPath}/${imagePath}`;
        
        for (const ext of supportedExtensions) {
          const imageUrl = `${fileUrl}.${ext}`;
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
