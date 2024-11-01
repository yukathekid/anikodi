export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Verifica se a URL acessada é /m3u/animes
    if (url.pathname === '/m3u/animes') {
      const userAgent = request.headers.get('User-Agent');
      const isKodi = userAgent && /Kodi\/\d+\.\d+/i.test(userAgent);
      const isVLC = userAgent && /VLC\/\d+\.\d+/i.test(userAgent);
      const isSpecificUserAgent = userAgent === 'Mozilla/5.0 (Linux; Android 13; M2103K19G Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.6478.134 Mobile Safari/537.36';

      // Se o User-Agent não for do Kodi ou do User-Agent específico, negar acesso
      if (!isKodi && !isVLC && !isSpecificUserAgent) {
        return new Response('Forbbien 403', {
          status: 403,
          headers: {
            'Content-Type': 'text/plain'
          }
        });
      }

      // Retorna o redirecionamento
      return fetch('https://anikodi.xyz/assets/list3u.m3u');
    }

    return env.ASSETS.fetch(request);
  }
};
