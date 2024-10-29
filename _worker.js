export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/acess') {
      const username = url.searchParams.get('username');
      const password = url.searchParams.get('password');

      if (!username || !password) {
        return new Response('Bad Request', { status: 400 });
      }

      const firestoreProjectId = 'hwfilm23';
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firestoreProjectId}/databases/(default)/documents/users/${username}`;

      // Testa a conexão com o Firestore e a leitura dos dados
      const response = await fetch(firestoreUrl);
      if (!response.ok) {
        return new Response('Firestore document not found', { status: 404 });
      }

      const data = await response.json();
      if (!data || !data.fields) {
        return new Response('Invalid document format', { status: 500 });
      }

      const storedUsername = data.fields.username?.stringValue;
      const storedPassword = data.fields.password?.stringValue;

      if (storedUsername === username && storedPassword === password) {
        // Substitua pela URL da lista M3U se autenticado com sucesso
        return fetch('https://cloud.anikodi.xyz/data/live/testan.m3u8');
      } else {
        return new Response('Unauthorized', { status: 401 });
      }
    }

    return env.ASSETS.fetch(request);
  }
}
