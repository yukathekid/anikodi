addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

const videos = [
  'https://username.github.io/repo-name/video1.mp4',
  'https://username.github.io/repo-name/video2.mp4',
  // Adicione mais URLs de vídeos aqui
];

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Verificar se a requisição é para a lista m3u
  if (path === '/m3u') {
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
        m3uContent += `#EXTINF:-1 tvg-id="${item.id}" tvg-name="${item.name}" tvg-logo="${item.logo}" group-title="${item.group}",${item.name}\n`;
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

  // Verificar se a requisição é para a lista M3U8 ao vivo
  if (path === '/live.m3u8') {
    // Gera o arquivo M3U8 em loop contínuo
    let m3u8Content = '#EXTM3U\n';
    for (let i = 0; i < 100; i++) { // Faz um loop para simular transmissão contínua
      videos.forEach((video, index) => {
        m3u8Content += `#EXTINF:-1, Video ${index + 1}\n${video}\n`;
      });
    }
    return new Response(m3u8Content, {
      headers: { 'Content-Type': 'application/vnd.apple.mpegurl' }
    });
  }

  // Suporte a múltiplas extensões de imagem
  const supportedExtensions = ['png', 'jpg', 'jpeg', 'gif'];

  // Verificar se a requisição é para o index.html
  if (path === '/api/v1/' || path === '/api/v1/index') {
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
    if (path.startsWith(`/api/v1/${category}/`)) {
      const subPath = path.replace(`/api/v1/${category}/`, '');
      
      for (const ext of supportedExtensions) {
        const imageUrl = `https://raw.githubusercontent.com/yukathekid/anikodi/main/api/v1/${category}/${subPath}.${ext}`;
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
