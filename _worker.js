export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
if (url.pathname === '/paste') {
    const pastebinUrl = 'https://pastebin.com/raw/4uW9jHpx'
    
    try {
      // Faz a requisição ao Pastebin
      const response = await fetch(pastebinUrl)
      const content = await response.text()
      
      // Cria uma resposta com o conteúdo e força o download
      return new Response(content, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': 'attachment; filename="conteudo.txt"'
        }
      })
    } catch (error) {
      return new Response('Erro ao baixar o conteúdo do Pastebin', { status: 500 })
    }
}
    const baseJsonUrls = ['animes', 'tv', 'test'];
for (const jsonCategory of baseJsonUrls) {
if (url.pathname === `/playlist/${jsonCategory}`) {
      const jsonUrl = `https://yukathekid.github.io/anikodi/api/v1/${jsonCategory}.base64`;

      try {
        const response = await fetch(jsonUrl);
        if (!response.ok) {
          return new Response('Erro ao buscar dados do JSON', { status: 500 });
        }
          const base64Data = await response.text();
          const jsonString = atob(base64Data); // Decodifica de base64 para string JSON
          const data = JSON.parse(jsonString);
      
        //const data = await response.json();
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
        const pathSegments = path.split('/');
        
        // Adiciona o subdiretório de A a Z
        const letter = pathSegments.shift(); // Remove o primeiro segmento (A-Z)
        const imageId = pathSegments.pop(); // Remove o último segmento (ID da imagem)
        const categoryPath = pathSegments.join('/'); // Junta o restante do caminho
        
        // Construir o URL do arquivo
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
