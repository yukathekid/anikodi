export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean); // Divide o caminho em segmentos

    // Verifica se o caminho está no formato correto
    if (pathSegments[0] === 'm3u' && pathSegments[1] && pathSegments[2]) {
      const listType = pathSegments[1]; // Pode ser 'animes', 'filmes', etc.
      const expireParam = parseInt(pathSegments[2], 10); // Obtém o expireParam dos segmentos da URL

      if (isNaN(expireParam)) {
        return new Response('Bad Request: expireParam is required and must be a number.', { status: 400 });
      }

      // Aqui você pode chamar o Firestore para verificar as credenciais e a data de expiração
      const response = await checkCredentials(listType, expireParam);

      // Se a autenticação falhar, retornamos a mensagem correspondente
      if (!response.isAuthenticated) {
        return new Response(response.message, { status: response.status });
      }

      // Se a autenticação for bem-sucedida e a sessão for válida, redireciona para a URL da lista M3U
      const m3uUrl = getM3UUrl(listType); // Obtém a URL da lista M3U correspondente
      return fetch(m3uUrl);
    }

    return env.ASSETS.fetch(request);
  }
}

// Função para obter a URL da lista M3U com base no tipo
function getM3UUrl(listType) {
  switch (listType) {
    case 'animes':
      return 'https://vectorplayer.com/default.m3u'; // URL para a lista de animes
    case 'filmes':
      return 'https://raw.githubusercontent.com/JairPPereira/tvweb/refs/heads/main/jpiptv/lista2.m3u'; // URL para a lista de filmes
    // Adicione mais casos conforme necessário
    default:
      return 'https://vectorplayer.com/default.m3u'; // URL padrão
  }
}

// Função de verificação de credenciais e expiração
async function checkCredentials(listType, expireParam) {
  const firestoreProjectId = 'hwfilm23';
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firestoreProjectId}/databases/(default)/documents/users/${listType}`;

  const response = await fetch(firestoreUrl);
  const data = await response.json();

  // Verifica se o documento foi encontrado
  if (!data || !data.fields) {
    return { isAuthenticated: false, status: 401, message: 'Credenciais inválidas.' };
  }

  const expiryDateISO = data.fields.expiryDate.timestampValue;

  if (!expiryDateISO) {
    return { isAuthenticated: false, status: 401, message: 'Credenciais inválidas.' };
  }

  // Converter o `expiryDate` do Firestore para milissegundos
  const expiryDate = new Date(expiryDateISO).getTime();

  // Verifica se `expireParam` é igual à data de expiração e se não expirou
  const isSessionValid = expireParam === expiryDate && expiryDate > new Date().getTime();

  if (!isSessionValid) {
    return { isAuthenticated: false, status: 403, message: `Sua sessão expirou. Por favor, renove o acesso: ${expiryDate}` };
  }

  return { isAuthenticated: true }; // Autenticação bem-sucedida
}