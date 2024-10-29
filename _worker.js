export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/acess') {
      const username = url.searchParams.get('username');
      const password = url.searchParams.get('password');

      if (!username || !password) {
        return new Response('Bad Request: Missing credentials', { status: 400 });
      }

      const isAuthenticated = await checkCredentials(username, password);

      if (!isAuthenticated) {
        return new Response('Unauthorized: Invalid credentials or expired account', { status: 401 });
      }

      return fetch('https://cloud.anikodi.xyz/data/live/testan.m3u8');
    }

    return env.ASSETS.fetch(request);
  }
}

async function checkCredentials(username, password) {
  const firestoreProjectId = 'hwfilm23';
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firestoreProjectId}/databases/(default)/documents/users/${username}`;

  const response = await fetch(firestoreUrl);
  if (!response.ok) {
    return false;  // Falha no acesso ao Firestore
  }

  const data = await response.json();
  if (!data || !data.fields) {
    return false;  // Dados não encontrados ou estrutura inválida
  }

  const storedUsername = data.fields.username?.stringValue;
  const storedPassword = data.fields.password?.stringValue;
  const expiryDateTimestamp = data.fields.expiryDate?.timestampValue;

  if (!storedUsername || !storedPassword || !expiryDateTimestamp) {
    return false;  // Dados ausentes no documento Firestore
  }

  const isPasswordCorrect = storedUsername === username && storedPassword === password;
  const expiryDate = new Date(expiryDateTimestamp);
  const isExpired = expiryDate < new Date();

  if (!isPasswordCorrect) {
    return false;  // Senha incorreta
  }

  if (isExpired) {
    return false;  // Conta expirada
  }

  return isPasswordCorrect && !isExpired;
}
