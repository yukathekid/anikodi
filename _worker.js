export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Verifica se a URL acessada é /m3u/animes
    if (url.pathname === '/m3u/animes') {
      // Retorna o redirecionamento
      return fetch('https://vectorplayer.com/default.m3u');
    }

    return env.ASSETS.fetch(request);
  }
};