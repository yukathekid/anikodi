export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Verificar se a requisição é para a lista m3u
    if (url.pathname === '/m3u') {
      // URL do seu arquivo JSON no GitHub Pages
      const jsonUrl = 'https://yukathekid.github.io/anikodi/channels.json';

      try {
        // Faz a requisição para o JSON
        const response = await fetch(jsonUrl);
        if (!response.ok) {
          return new Response('Erro ao buscar dados do JSON', { status: 500 });
        }
        
        const data = await response.json();

        // Formata o conteúdo do JSON para o formato m3u
        let m3uContent = '#EXTM3U\n';
        data.forEach(item => {
          // Adapte de acordo com a estrutura do seu JSON
          m3uContent += `#EXTINF:-1 tvg-id="${item.id}" tvg-name="${item.name}" tvg-logo="${item.logo}" group-title="${item.group}",${item.title}\n`;
          m3uContent += `${item.url}\n`;
        });

        // Retorna a lista m3u
        return new Response(m3uContent, {
          headers: {
            'Content-Type': 'audio/mpegurl', // Define o tipo de conteúdo como m3u
          },
        });
      } catch (error) {
        return new Response('Erro ao processar a lista m3u', { status: 500 });
      }
    }

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
