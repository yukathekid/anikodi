export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/acess') {
      const username = url.searchParams.get('username');
      const password = url.searchParams.get('password');

      if (!username || !password) {
        return new Response('Missing username or password', { status: 400 });
      }

      const isAuthenticated = await checkCredentials(username, password);

      if (!isAuthenticated) {
        return new Response('Authentication failed', { status: 401 });
      }

      // Se passar pela autenticação, tenta retornar a lista M3U
      return new Response('Authentication successful. Fetching M3U8...', { status: 200 });
    }

    return new Response('Not Found', { status: 404 });
  }
}

async function checkCredentials(username, password) {
  const firestoreProjectId = 'hwfilm23';
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firestoreProjectId}/databases/(default)/documents/users/${username}`;

  // Tenta buscar o documento do Firestore
  const response = await fetch(firestoreUrl);
  
  if (!response.ok) {
    return false;  // Falha ao buscar documento (404 ou outro erro)
  }

  const data = await response.json();

  if (!data || !data.fields) {
    return false;  // Documento não encontrado ou mal formatado
  }

  const storedUsername = data.fields.username.stringValue;
  const storedPassword = data.fields.password.stringValue;
  const expiryDateTimestamp = data.fields.expiryDate?.timestampValue;

  if (!storedUsername || !storedPassword || !expiryDateTimestamp) {
    return false;  // Dados ausentes no Firestore
  }

  // Verifica a senha e a data de expiração
  const isPasswordCorrect = storedUsername === username && storedPassword === password;
  const expiryDate = new Date(expiryDateTimestamp);
  const isExpired = expiryDate < new Date();

  return isPasswordCorrect && !isExpired;
    }
