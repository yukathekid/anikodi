export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Verifica se a URL acessada é /m3u/animes
    if (url.pathname === '/m3u/animes') {
      // Configuração do endpoint do Firestore
      const firestoreUrl = 'https://firestore.googleapis.com/v1/projects/hwfilm23/databases/(default)/documents/users/filmes';
      const response = await fetch(firestoreUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return new Response('Error fetching data from Firestore', { status: response.status });
      }

      const data = await response.json();

      // Cria a lista M3U
      let m3uList = '#EXTM3U\n';

      // Extrai as informações dos filmes
      const fields = data.fields;
      for (const category in fields) {
        const movies = fields[category].mapValue.fields;
        for (const movieId in movies) {
          const movie = movies[movieId].mapValue.fields;
          const title = movie.title.stringValue;
          const videoUrl = movie.url.stringValue;
          const logo = movie.image.stringValue; // URL da imagem

          // Adiciona as informações à lista M3U
          m3uList += `#EXTINF:-1 tvg-logo="${logo}" group-title="${category}", ${title}\n`;
          m3uList += `${videoUrl}\n`;
        }
      }

      // Retorna a lista M3U
      return new Response(m3uList, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Content-Disposition': 'attachment; filename="playlist.m3u"'
        }
      });
    }

    return env.ASSETS.fetch(request);
  }
};