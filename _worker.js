export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/acess') {
      const username = url.searchParams.get('username');
      const password = url.searchParams.get('password');

      if (!username || !password) {
        return new Response('Bad Request', { status: 400 });
      }

      const { isAuthenticated, message } = await checkCredentials(username, password);

      if (!isAuthenticated) {
        return new Response(message, { status: message === 'Session expired' ? 403 : 401 });
      }

      // Substitua a URL abaixo pela URL real da lista M3U
      return fetch('https://vectorplayer.com/default.m3u');
    }

    return env.ASSETS.fetch(request);
  }
}

async function checkCredentials(username, password) {
  const firestoreProjectId = 'hwfilm23';
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firestoreProjectId}/databases/(default)/documents/users/${username}`;

  const response = await fetch(firestoreUrl);
  const data = await response.json();

  if (!data || !data.fields) {
    return { isAuthenticated: false, message: 'Unauthorized' };
  }

  const storedUsername = data.fields.username.stringValue;
  const storedPassword = data.fields.password.stringValue;
  const expiryDateTimestamp = data.fields.expiryDate?.timestampValue;

  if (!storedUsername || !storedPassword || !expiryDateTimestamp) {
    return { isAuthenticated: false, message: 'Unauthorized' };
  }

  // Verificar se a senha está correta
  const isPasswordCorrect = storedUsername === username && storedPassword === password;

  // Converter o timestamp do Firestore para um objeto Date
  const expiryDate = new Date(expiryDateTimestamp);

  // Verificar se a data de expiração é válida
  const isExpired = expiryDate < new Date();

  if (!isPasswordCorrect) {
    return { isAuthenticated: false, message: 'Unauthorized' };
  }

  if (isExpired) {
    return { isAuthenticated: false, message: 'Session expired' };
  }

  return { isAuthenticated: true, message: 'Authenticated' };
      }
