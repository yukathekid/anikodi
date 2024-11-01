export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);

    if (pathSegments[0] === 'm3u8') {
      // Extrai os parâmetros do caminho da URL (ex: /m3u8/wind-breaker/S1)
      const anime = pathSegments[1];
      const season = pathSegments[2];

      if (!anime || !season) {
        return new Response('Parâmetros de URL inválidos', { status: 400 });
      }

      // JSON de exemplo, que idealmente seria buscado de um serviço como Firestore
      const animeData = {
        "wind-breaker": {
          "S1": {
            "01": {
              "group": "Wind Breaker",
              "name": "Episódio 01",
              "url": "https://betterserver.ga/playlist/W/GguO99RYyj/bNYBGTUgm4/03FsdulfkY/B3p87zuqPP/B3p87zuqPP.m3u8"
            },
            "02": {
              "group": "Wind Breaker",
              "name": "Episódio 02",
              "url": "https://betterserver.ga/playlist/W/I6mTLjBdOE/bRieK1TZ7d/3oropbVnoq/PcEJTqRc3G/PcEJTqRc3G.m3u8"
            }
          }
        }
      };

      const seasonData = animeData[anime]?.[season];
      if (!seasonData) {
        return new Response('Anime ou temporada não encontrados', { status: 404 });
      }

      // Verifica as credenciais e obtém a data de expiração
      const authResponse = await checkCredentials(anime);
      if (!authResponse.isAuthenticated) {
        return new Response(authResponse.message, { status: authResponse.status });
      }

      // Monta o conteúdo do M3U8 com links de episódio com expiração
      let m3u8Content = "#EXTM3U\n";
      for (const episode in seasonData) {
        const episodeData = seasonData[episode];

        // Gera uma URL com o parâmetro de expiração
        const episodeUrl = `${episodeData.url}?exp=${authResponse.expire}`;

        m3u8Content += `#EXTINF:-1 group-title="${episodeData.group}", ${episodeData.name}\n`;
        m3u8Content += `${episodeUrl}\n`;
      }

      return new Response(m3u8Content, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl'
        }
      });
    }

    return new Response('Not found', { status: 404 });
  }
};

// Função para verificar credenciais e retornar a data de expiração
async function checkCredentials(anime) {
  const firestoreProjectId = 'hwfilm23';
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firestoreProjectId}/databases/(default)/documents/users/${anime}`;

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
  const currentTime = Date.now();
  const isSessionValid = expiryDate > currentTime;

  if (!isSessionValid) {
    return { isAuthenticated: false, status: 403, message: `Sua sessão expirou`, expire: expiryDate };
  }

  return { isAuthenticated: true, expire: expiryDate }; // Autenticação bem-sucedida com expiração
}