export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Verifique o caminho da URL
    if (url.pathname === '/api/lista.m3u') {
      const authorization = request.headers.get('Authorization');

      if (!authorization) {
        return new Response('Unauthorized', { status: 401, headers: { 'WWW-Authenticate': 'Basic' } });
      }

      const auth = authorization.split(' ')[1];
      const [username, password] = atob(auth).split(':');

      const isAuthenticated = await checkCredentials(username, password);

      if (!isAuthenticated) {
        return new Response('Unauthorized', { status: 401, headers: { 'WWW-Authenticate': 'Basic' } });
      }

      // Substitua a URL abaixo pela URL real da lista M3U
      return fetch('https://cloud.anikodi.xyz/data/live/testan.m3u8');
    }

    // Manipule recursos estáticos, se necessário
    return env.ASSETS.fetch(request);
  }
}

async function checkCredentials(username, password) {
  const firestoreProjectId = 'hwfilm23';
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firestoreProjectId}/databases/(default)/documents/users/${username}`;

  const response = await fetch(firestoreUrl);
  const data = await response.json();

  if (!data || !data.fields) {
    return false;
  }

  const storedUsername = data.fields.username.stringValue;
  const storedPassword = data.fields.password.stringValue;

  return storedUsername === username && storedPassword === password;
}
