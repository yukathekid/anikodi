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
          const logo = movie.image.stringValue; // URL da imagem
          const groupTitle = category; // Pega o nome da categoria como group-title
          const videoUrl = `https://anikodi.xyz/video/${movieId}`; // URL camuflada

          // Adiciona as informações à lista M3U
          m3uList += `#EXTINF:-1 tvg-logo="${logo}" group-title="${groupTitle}", ${title}\n`;
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

    // Trata as requisições para vídeos camuflados
    if (url.pathname.startsWith('/video/')) {
      const videoId = url.pathname.split('/video/')[1]; // Pega o ID do vídeo da URL camuflada
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/hwfilm23/databases/(default)/documents/users/filmes/${category}/${videoId}`;
      const response = await fetch(firestoreUrl);

      if (!response.ok) {
        return new Response('Video not found', { status: 404 });
      }

      const videoData = await response.json();
      const videoUrl = videoData.fields[category].mapValue.fields[videoId].mapValue.fields.url.stringValue;

      // Redireciona para a URL real do vídeo
      return Response.redirect(videoUrl, 302);
    }

    return env.ASSETS.fetch(request);
  }
};