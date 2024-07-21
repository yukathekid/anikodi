export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // URL do vídeo de "Canal fora do Ar"
    const backupVideoUrl = "https://github.com/yukathekid/anikodi/blob/main/assets/TV%20Fora%20do%20Ar%20%5BHD%5D.mp4";

    // Verifica se a requisição é para o conteúdo do Pastebin
    if (url.pathname === '/paste') {
      const pastebinUrl = 'https://piroplay.xyz/cdn/hls/1f3225e82ea03a704c3a0f93272468d0/master.txt?s=4';
      
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

    // Define as categorias base para as URLs JSON
    const baseJsonUrls = ['stream'];

    for (const jsonCategory of baseJsonUrls) {
      if (url.pathname === `/live/${jsonCategory}`) {
        const jsonUrl = `https://cloud.anikodi.xyz/data/live/${jsonCategory}.txt`;

        try {
          const response = await fetch(jsonUrl);
          if (!response.ok) {
            throw new Error('Erro ao buscar dados do JSON');
          }

          const base64Data = await response.text();
          const jsonString = atob(base64Data); // Decodifica de base64 para string JSON
          const data = JSON.parse(jsonString);

          let m3uContent = '#EXTM3U\n';
          for (const item of data) {
            try {
              // Verifica se o link está disponível
              const linkResponse = await fetch(item.url, { method: 'HEAD' });
              if (!linkResponse.ok) {
                throw new Error('Link não disponível');
              }
              m3uContent += `#EXTINF:-1 tvg-id="${item.id}" tvg-name="${item.name}" tvg-logo="${item.logo}" group-title="${item.group}",${item.name}\n`;
              m3uContent += `${item.url}\n`;
            } catch (error) {
              // Se o link não estiver disponível, usa o vídeo de backup
              m3uContent += `#EXTINF:-1 tvg-id="${item.id}" tvg-name="${item.name}" tvg-logo="${item.logo}" group-title="${item.group}",${item.name}\n`;
              m3uContent += `${backupVideoUrl}\n`;
            }
          }

          return new Response(m3uContent, {
            headers: {
              'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8'
            }
          });
        } catch (error) {
          return new Response(error.message, { status: 500 });
        }
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

        const fileUrl = `https://anikodi.xyz/assets/${category}/${letter}/${categoryPath}/${imageId}`;

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
