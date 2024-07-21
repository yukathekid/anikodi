export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // URL do vídeo de "Canal fora do Ar"
    const backupVideoUrl = "https://seu_dominio.com/canal_fora_do_ar.mp4";
    const timeout = 5000; // Timeout de 5 segundos

    // Função para criar uma requisição com timeout
    async function fetchWithTimeout(resource, options) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      const response = await fetch(resource, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    }

    // Define as categorias base para as URLs JSON
    const baseJsonUrls = ['stream'];

    for (const jsonCategory of baseJsonUrls) {
      if (url.pathname === `/live/${jsonCategory}`) {
        const jsonUrl = `https://cloud.anikodi.xyz/data/live/${jsonCategory}.txt`;

        try {
          const response = await fetchWithTimeout(jsonUrl);
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
              const linkResponse = await fetchWithTimeout(item.url, { method: 'HEAD' });
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

    // Let other requests be handled by Cloudflare Pages and _redirects
    return env.ASSETS.fetch(request);
  }
};
