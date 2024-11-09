export default {
  async fetch(request, env, ctx) {
    const userAgent = request.headers.get('User-Agent') || '';
    const url = new URL(request.url);

    // Verifica se o caminho começa com "/ReiTv/1234"
    if (url.pathname.startsWith('/ReiTv/1234')) {
      // Verifica se o User-Agent contém "XCIPTV"
      if (userAgent.includes('XCIPTV')) {
        try {
          // Substitua 'https://exemplo.com/urlLista.m3u' pela URL real da sua lista M3U
          const response = await fetch('https://raw.githubusercontent.com/JairPPereira/tvweb/refs/heads/main/jpiptv/playtv.m3u');

          // Verifica se a resposta do fetch foi bem-sucedida
          if (response.ok) {
            // Retorna a lista M3U com os mesmos cabeçalhos da resposta original
            return new Response(response.body, {
              status: response.status,
              headers: {
                'Content-Type': 'application/vnd.apple.mpegurl',
                'Content-Disposition': 'attachment; filename="playlist.m3u"',
              },
            });
          } else {
            // Se a resposta não for bem-sucedida, retorna um erro correspondente
            return new Response('Erro ao buscar a lista M3U', { status: response.status });
          }
        } catch (error) {
          // Em caso de erro durante a requisição fetch, retorna um erro 500
          return new Response('Erro interno ao processar a requisição', { status: 500 });
        }
      } else {
        // Se o User-Agent não for "XCIPTV", retorna um erro 403
        return new Response(null, { status: 403 });
      }
    }

    // Resposta padrão para caminhos que não correspondem a "/ReiTv/1234"
    return new Response('Não Encontrado', { status: 404 });
  }
};