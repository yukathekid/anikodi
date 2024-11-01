export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Verifica se a URL acessada é /m3u/animes
    if (url.pathname === '/m3u/animes') {
      // URL de destino para redirecionamento
      const targetUrl = 'https://vectorplayer.com/default.m3u';

      // Retorna o redirecionamento
      return fetch('https://vectorplayer.com/default.m3u');
    }

    return env.ASSETS.fetch(request);

    // Retorna um 404 caso o caminho não corresponda ao desejado
    return new Response('Not found', { status: 404 });
  }
};