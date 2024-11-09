export default {
  async fetch(request, env, ctx) {
    const userAgent = request.headers.get('User-Agent') || '';

    // Bloqueia User-Agents de navegadores comuns
    if (userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari')) {
      return new Response(null, { status: 403 });
    }

    const url = new URL(request.url);

    // Verifica se o caminho começa com "/reiTv/"
    if (url.pathname.startsWith('/reiTv/')) {
      const pathParts = url.pathname.split('/');
      const category = pathParts[2]; // filmes, series ou live
      const token = pathParts[3]; // Token base64 com título e movieId
      const itemId = pathParts[4]; // Identificador único do vídeo

      const urlAlt = 'https://api-f.streamable.com/api/v1/videos/qnyv36/mp4';
      let firestoreUrl;

      // Define a URL no Firestore com base na categoria
      switch (category) {
        case 'filmes':
          firestoreUrl = 'https://firestore.googleapis.com/v1/projects/hwfilm23/databases/(default)/documents/reitvbr/filmes';
          break;
        case 'series':
          firestoreUrl = 'https://firestore.googleapis.com/v1/projects/hwfilm23/databases/(default)/documents/reitvbr/series';
          break;
        case 'live':
          firestoreUrl = 'https://firestore.googleapis.com/v1/projects/hwfilm23/databases/(default)/documents/reitvbr/live';
          break;
        default:
          return new Response('Categoria não encontrada', { status: 404 });
      }

      // Caso seja uma requisição para a lista (não tem o parâmetro `itemId`)
      if (!itemId) {
        // Faz as requisições para as categorias
        const responseFilmes = await fetch(firestoreUrl);
        const responseSeries = await fetch(firestoreUrl.replace('filmes', 'series'));
        const responseLive = await fetch(firestoreUrl.replace('filmes', 'live'));

        if (!responseFilmes.ok || !responseSeries.ok || !responseLive.ok) {
          return new Response('Erro ao buscar dados das categorias', { status: 500 });
        }

        const filmesData = await responseFilmes.json();
        const seriesData = await responseSeries.json();
        const liveData = await responseLive.json();

        let m3uList = '#EXTM3U\n';

        // Função para processar cada categoria e adicionar à lista M3U
        const adicionarCategoria = (data, rota) => {
          for (const itemId in data.fields) {
            if (itemId === "expiryDate") continue;

            const item = data.fields[itemId].mapValue.fields;
            const title = item.title.stringValue;
            const logo = item.image.stringValue;

            // Cria o token base64 combinando title e itemId
            const combinedString = `${title}|${itemId}`;
            const token = btoa(combinedString);

            const endpoint = rota === 'filmes' ? 'movie' : rota;

            m3uList += `#EXTINF:-1 tvg-id="" tvg-name="${title}" tvg-logo="${logo}" group-title="${itemId}", ${title}\n`;
            m3uList += `${url.origin}/reiTv/${endpoint}/${token}/${itemId}\n`;
          }
        };

        // Adiciona cada categoria ao M3U
        adicionarCategoria(filmesData, 'filmes');
        adicionarCategoria(seriesData, 'series');
        adicionarCategoria(liveData, 'live');

        // Retorna a lista M3U
        return new Response(m3uList, {
          headers: {
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Content-Disposition': 'attachment; filename="playlist.m3u"'
          }
        });
      }

      // Caso seja uma requisição para um vídeo específico
      const response = await fetch(firestoreUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        return new Response('Erro ao buscar dados do Firestore', { status: response.status });
      }

      const data = await response.json();
      const expireDate = new Date(data.fields.expiryDate?.timestampValue).getTime();
      if (expireDate < Date.now()) {
        return Response.redirect(urlAlt, 302);
      }

      // Busca o vídeo pelo ID fornecido (itemId) na categoria correta
      let videoUrl = null;
      if (data.fields[itemId]) {
        videoUrl = data.fields[itemId].mapValue.fields.url.stringValue;
      }

      // Redireciona para o vídeo ou para a URL alternativa
      if (videoUrl) {
        return Response.redirect(videoUrl, 302);
      } else {
        return Response.redirect(urlAlt, 302);
      }
    }

    // Caso o caminho não corresponda a "/reiTv/"
    return env.ASSETS.fetch(request);
  }
};