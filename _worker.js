export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/acess') {
      const username = url.searchParams.get('username');
      const password = url.searchParams.get('password');
      const expireParam = parseInt(url.searchParams.get('expire'), 10);

      if (!username || !password || isNaN(expireParam)) {
        return new Response('Bad Request', { status: 400 });
      }

      const response = await checkCredentials(username, password);

      // Se a autenticação falhar, retornamos a mensagem correspondente
      if (!response.isAuthenticated) {
        return new Response(response.message, { status: response.status });
      }

      // Verifica se `expireParam` é igual a `expiryDate` e se a sessão não expirou
      const isSessionExpired = expireParam === response.expire && expireParam < Date.now();

      if (!isSessionExpired) {
        return new Response('Sua sessão expirou. Por favor, renove o acesso.', { status: 403 });
      }

      // Se a autenticação for bem-sucedida e a sessão for válida, redireciona para a URL da lista M3U
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

  // Verifica se o documento foi encontrado
  if (!data || !data.fields) {
    return { isAuthenticated: false, status: 401, message: 'Credenciais inválidas.' };
  }

  const storedUsername = data.fields.username.stringValue;
  const storedPassword = data.fields.password.stringValue;
  const expiryDateISO = data.fields.expiryDate.timestampValue;

  if (!storedUsername || !storedPassword || !expiryDateISO) {
    return { isAuthenticated: false, status: 401, message: 'Credenciais inválidas.' };
  }

  // Verificar se a senha está correta
  const isPasswordCorrect = storedUsername === username && storedPassword === password;

  // Converter o `expiryDate` do Firestore para milissegundos
  const expiryDate = new Date(expiryDateISO).getTime();

  // Se a senha estiver correta, retorna o status e a data de expiração
  if (isPasswordCorrect) {
    return { isAuthenticated: true, expire: expiryDate }; // Autenticação bem-sucedida
  }

  // Se a senha estiver incorreta
  return { isAuthenticated: false, status: 401, message: 'Credenciais inválidas.' };
}
