export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Verifica se a requisição é para o conteúdo do Pastebin
    if (url.pathname === '/paste') {
      const pastebinUrl = 'https://raw.githubusercontent.com/Ramys/Iptv-Brasil-2024/master/Iptv3.m3u8';
      
      try {
        // Faz a requisição ao Pastebin
        const response = await fetch(pastebinUrl);
        const content = await response.text();
        
        // Cria uma resposta com o conteúdo e força o download
        return new Response(content, {
          headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': 'attachment; filename="conteudo.txt"'
          }
        });
      } catch (error) {
        return new Response('Erro ao baixar o conteúdo do Pastebin', { status: 500 });
      }
    }

    // Extrai a categoria da URL
    const pathSegments = url.pathname.split('/');
    const category = pathSegments[2];

    if (['channels', 'animes'].includes(category)) {
      const indexUrl = 'https://cloud.anikodi.xyz/data/index.json'; // URL para o índice principal

      try {
        const indexResponse = await fetch(indexUrl);
        if (!indexResponse.ok) {
          return new Response('Erro ao buscar índice principal', { status: 500 });
        }

        const indexData = await indexResponse.json();
        const jsonFiles = indexData[category];
        if (!jsonFiles) {
          return new Response('Categoria não encontrada', { status: 404 });
        }

        // Buscar e processar todos os arquivos JSON
        const jsonUrls = jsonFiles.map(file => `https://cloud.anikodi.xyz/data/${category}/${file}`);
        const jsonData = await Promise.all(jsonUrls.map(url => fetch(url).then(res => res.json())));
        
        let m3uContent = '#EXTM3U\n';
        jsonData.flat().forEach(item => {
          m3uContent += `#EXTINF:-1 tvg-id="${item.id}" tvg-name="${item.name}" tvg-logo="${item.logo}" group-title="${item.group}",${item.name}\n`;
          m3uContent += `${item.url}\n`;
        });

        return new Response(m3uContent, {
          headers: {
            'Content-Type': 'application/vnd.apple.mpegurl'
          }
        });
      } catch (error) {
        return new Response('Erro ao processar a lista M3U', { status: 500 });
      }
    }

    // Suporte a múltiplas extensões de imagem
    const supportedExtensions = ['png', 'jpg', 'jpeg', 'gif'];

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

    const categories = ['capas', 'logos'];
    for (const category of categories) {
      if (url.pathname.startsWith(`/${category}/`)) {
        const path = url.pathname.replace(`/${category}/`, '');
        const pathSegments = path.split('/');
        
        const letter = pathSegments.shift();
        const imageId = pathSegments.pop();
        const categoryPath = pathSegments.join('/');

        const fileUrl = `https://raw.githubusercontent.com/yukathekid/anikodi/main/assets/${category}/${letter}/${categoryPath}/${imageId}`;

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
