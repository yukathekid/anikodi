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

      // Retorna uma mensagem apropriada baseada na autenticação
      return new Response(message, { status: isAuthenticated ? 200 : 401 });
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
    return { isAuthenticated: false, message: 'Credenciais inválidas.' }; // Mensagem para credenciais inválidas
  }

  const storedUsername = data.fields.username.stringValue;
  const storedPassword = data.fields.password.stringValue;
  const expiryDateTimestamp = data.fields.expiryDate?.timestampValue;

  if (!storedUsername || !storedPassword || !expiryDateTimestamp) {
    return { isAuthenticated: false, message: 'Credenciais inválidas.' };
  }

  // Verificar se a senha está correta
  const isPasswordCorrect = storedUsername === username && storedPassword === password;

  // Converter o timestamp do Firestore para um objeto Date
  const expiryDate = new Date(expiryDateTimestamp);

  // Verificar se a data de expiração é válida
  const isExpired = expiryDate < new Date();

  if (!isPasswordCorrect) {
    return { isAuthenticated: false, message: 'Credenciais inválidas.' }; // Mensagem para credenciais inválidas
  }

  // Se a senha estiver correta, mas a sessão estiver expirada
  if (isExpired) {
    return { isAuthenticated: false, message: 'Sua sessão expirou. Por favor, renove o acesso.' }; // Mensagem sem sugerir novo login
  }

  return { isAuthenticated: true, message: 'Autenticação bem-sucedida.' };
}
