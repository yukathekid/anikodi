export default {
  async fetch(request) {
    const url = new URL(request.url);
    const userAgent = request.headers.get('User-Agent') || '';

    // Obter parâmetros do Xtream Codes
    const username = url.searchParams.get('username');
    const password = url.searchParams.get('password');

    // Verificar User-Agent para permitir apenas o XCIPTV
    if (!userAgent.includes('XCIPTV')) {
      return new Response('App não autorizado', { status: 403 });
    }

    // Verificar credenciais
    if (username === 'reitv' && password === 'OFFTV2424') {
      // Retornar a lista M3U
      return fetch('https://raw.githubusercontent.com/JairPPereira/tvweb/refs/heads/main/jpiptv/playtv.m3u');
    } else {
      return new Response('Credenciais inválidas ou parâmetros incorretos', { status: 403 });
    }
  }
}