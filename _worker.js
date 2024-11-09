export default {
  async fetch(request) {
    const url = new URL(request.url);
    const userAgent = request.headers.get('User-Agent') || '';

    // Obter parâmetros do Xtream Codes
    const username = url.searchParams.get('username');
    const password = url.searchParams.get('password');
    const type = url.searchParams.get('type');
    const output = url.searchParams.get('output');

    // Verificar User-Agent para permitir apenas o XCIPTV
    if (!userAgent.includes('XCIPTV')) {
      return new Response('App não autorizado', { status: 403 });
    }

    // Verificar credenciais
    if (username === 'reitv' && password === 'OFFTV2424' && type === 'm3u_plus' && output === 'ts') {
      // Retornar a lista M3U
      return fetch('https://raw.githubusercontent.com/JairPPereira/tvweb/refs/heads/main/jpiptv/playtv.m3u');
    } else {
      return new Response('Credenciais inválidas ou parâmetros incorretos', { status: 403 });
    }
  }
}