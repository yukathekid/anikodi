export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const userAgent = request.headers.get('User-Agent') || '';

    // Simule os parâmetros do Xtream Codes
    const username = url.searchParams.get('username');
    const password = url.searchParams.get('password');
    
    // Verificação básica do User-Agent para permitir apenas o XCIPTV
    if (!userAgent.includes('XCIPTV')) {
      return new Response('App não autorizado', { status: 403 });
    }

    // Verifica se o username e password correspondem aos valores esperados
    if (username === 'reitv' && password === 'OFFTV2424') {
      return fetch('https://raw.githubusercontent.com/JairPPereira/tvweb/refs/heads/main/jpiptv/playtv.m3u');
    } else {
      return new Response('Credenciais inválidas', { status: 403 });
    }
  }
}