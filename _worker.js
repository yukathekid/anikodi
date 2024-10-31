export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);

    // Verifica o formato do caminho da URL
    if (pathSegments[0] === 'm3u' && pathSegments[1] && pathSegments[2]) {
      const listType = pathSegments[1];
      const expireParam = parseInt(pathSegments[2], 10);

      if (isNaN(expireParam)) {
        return new Response('Bad Request: expireParam is required and must be a number.', { status: 400 });
      }

      // Verifica as credenciais e a expiração no Firestore
      const response = await checkCredentials(listType, expireParam);

      if (response.expire < new Date().getTime()) {
        // Retorna uma URL inválida quando a sessão expira
        const invalidM3UUrl = getInvalidM3UUrl();
        return fetch(invalidM3UUrl); // Tenta acessar uma URL inválida
      }

      // Redireciona para a URL M3U correspondente
      const m3uUrl = getM3UUrl(listType);
      return fetch(m3uUrl);
    }

    return env.ASSETS.fetch(request);
  }
}

// Função para obter a URL M3U com base no tipo
function getM3UUrl(listType) {
  switch (listType) {
    case 'animes':
      return 'https://vectorplayer.com/default.m3u'; // URL para a lista de animes
    case 'filmes':
      return 'https://raw.githubusercontent.com/JairPPereira/tvweb/refs/heads/main/jpiptv/lista2.m3u'; // URL para a lista de filmes
    default:
      return 'https://vectorplayer.com/default.m3u'; // URL padrão
  }
}

// Função para obter uma URL M3U inválida
function getInvalidM3UUrl() {
  return 'https://example.com/invalid.m3u'; // URL que não funciona
}

// Função para verificar credenciais e expiração
async function checkCredentials(listType, expireParam) {
  const firestoreProjectId = 'hwfilm23';
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firestoreProjectId}/databases/(default)/documents/users/${listType}`;

  const response = await fetch(firestoreUrl);
  const data = await response.json();

  if (!data || !data.fields) {
    return { isAuthenticated: false, status: 401, message: 'Credenciais inválidas.' };
  }

  const expiryDateISO = data.fields.expiryDate.timestampValue;

  if (!expiryDateISO) {
    return { isAuthenticated: false, status: 401, message: 'Credenciais inválidas.' };
  }

  // Converte a data de expiração do Firestore para milissegundos
  const expiryDate = new Date(expiryDateISO).getTime();

  // Verifica se `expireParam` é igual ou menor que a data de expiração e se não expirou
  const currentTime = new Date().getTime();
  const isSessionValid = expireParam === expiryDate && currentTime < expiryDate;

  if (!isSessionValid) {
    return { isAuthenticated: false, status: 403, message: 'Sua sessão expirou.' };
  }

  return { isAuthenticated: true }; // Autenticação bem-sucedida
}