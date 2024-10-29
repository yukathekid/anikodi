export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
   //teste
    // Verifica se a rota é '/acess'
    if (url.pathname === '/acess') {
      const username = url.searchParams.get('username');
      const password = url.searchParams.get('password');

      // Verifica se 'username' e 'password' foram fornecidos
      if (!username || !password) {
        return new Response('Bad Request', { status: 400 });
      }

      // Chama a função de autenticação
      const isAuthenticated = await checkCredentials(username, password);

      if (!isAuthenticated) {
        return new Response('Unauthorized', { status: 401 });
      }

      // URL da lista M3U, caso a autenticação seja bem-sucedida
      return fetch('https://cloud.anikodi.xyz/data/live/testan.m3u8');
    }

    // Caso não seja a rota '/acess', acessa outros recursos
    return env.ASSETS.fetch(request);
  }
}

// Função para verificar as credenciais no Firestore
async function checkCredentials(username, password) {
  const firestoreProjectId = 'hwfilm23';
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firestoreProjectId}/databases/(default)/documents/users/${username}`;

  // Faz a requisição ao Firestore
  const response = await fetch(firestoreUrl);
  if (!response.ok) {
    return false; // Retorna falso se o documento não existir ou a URL estiver incorreta
  }

  const data = await response.json();

  // Verifica se os campos 'username', 'password' e 'expiryDate' estão no documento
  if (!data || !data.fields) {
    return false;
  }

  const storedUsername = data.fields.username?.stringValue;
  const storedPassword = data.fields.password?.stringValue;
  const expiryDateTimestamp = data.fields.expiryDate?.timestampValue;

  if (!storedUsername || !storedPassword || !expiryDateTimestamp) {
    return false;
  }

  // Verifica se o 'username' e 'password' coincidem com os armazenados
  const isPasswordCorrect = storedUsername === username && storedPassword === password;

  // Converte o timestamp do Firestore para um objeto Date
  const expiryDate = new Date(expiryDateTimestamp);

  // Verifica se a data de expiração é válida
  const isExpired = expiryDate < new Date();

  return isPasswordCorrect && !isExpired;
}
