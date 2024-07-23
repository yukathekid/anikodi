export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Novo bloco para camuflagem de URL
    const hlsPathPattern = /^\/cdn\/hls\/([^\/]+)\/([^\/]+)\.mp4$/;
    const match = url.pathname.match(hlsPathPattern);

    if (match) {
      const folder = match[1];
      const ep = match[2];
      const token = url.searchParams.get('token');

      if (token) {
        const realUrl = `https://firebasestorage.googleapis.com/v0/b/hwfilm23.appspot.com/o/Anikodi%2F${folder}%2F${ep}.mp4?alt=media&token=${token}`;

        try {
          // Faz a requisição ao Firebase para verificar se o link é válido
          const response = await fetch(realUrl, {
            method: 'HEAD', // Usamos o método HEAD para verificar apenas os headers
          });

          if (response.ok) {
            // Se o link for válido, faz a requisição completa
            const videoResponse = await fetch(realUrl, {
              method: request.method,
              headers: request.headers,
            });

            return new Response(videoResponse.body, {
              status: videoResponse.status,
              statusText: videoResponse.statusText,
              headers: videoResponse.headers
            });
          } else {
            return new Response('Token inválido para o episódio especificado', { status: 403 });
          }
        } catch (error) {
          return new Response('Erro ao acessar o conteúdo.', { status: 500 });
        }
      } else {
        return new Response('Parâmetro "token" inválido', { status: 400 });
      }
    }

    // Deixa outras requisições serem tratadas pelo Cloudflare Pages e _redirects
    return env.ASSETS.fetch(request);
  }
};
