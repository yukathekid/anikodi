export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/acess') {
      const username = url.searchParams.get('username');
      const password = url.searchParams.get('password');

      if (!username || !password) {
        return new Response('Bad Request', { status: 400 });
      }

      const response = await checkCredentials(username, password);

      // Se a autenticação falhar, retornamos a mensagem correspondente
      if (!response.isAuthenticated) {
        return new Response(response.message, { status: response.status });
      }

      // Se a autenticação for bem-sucedida, proxy para a lista M3U
      const m3uResponse = await fetch('https://vectorplayer.com/default.m3u');

      // Retorna o conteúdo da lista M3U
      return new Response(await m3uResponse.text(), {
        headers: { 'Content-Type': 'application/x-mpegURL' } // Define o tipo de conteúdo
      });
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
  const expiryDateTimestamp = data.fields.expiryDate?.timestampValue;

  if (!storedUsername || !storedPassword || !expiryDateTimestamp) {
    return { isAuthenticated: false, status: 401, message: 'Credenciais inválidas.' };
  }

  // Verificar se a senha está correta
  const isPasswordCorrect = storedUsername === username && storedPassword === password;

  // Converter o timestamp do Firestore para um objeto Date
  const expiryDate = new Date(expiryDateTimestamp);

  // Verificar se a data de expiração é válida
  const isExpired = expiryDate < new Date();

  // Se a senha estiver correta, mas a sessão estiver expirada
  if (isPasswordCorrect && isExpired) {
    return { isAuthenticated: false, status: 401, message: 'Sua sessão expirou. Por favor, renove o acesso.' };
  }

  // Se a senha estiver correta e não estiver expirada
  if (isPasswordCorrect) {
    return { isAuthenticated: true };
  }

  // Se a senha estiver incorreta
  return { isAuthenticated: false, status: 401, message: 'Credenciais inválidas.' };
}
