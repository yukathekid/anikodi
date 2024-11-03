export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Verifica se a URL acessada é uma URL camuflada
    if (url.pathname.startsWith('/video/')) {
      const pathParts = url.pathname.split('/');
      const name = pathParts[2];
      const expireParam = parseInt(pathParts[3], 10);
      const urlAlt = 'https://api-f.streamable.com/api/v1/videos/rtorus/mp4';

      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/hwfilm23/databases/(default)/documents/users/filmes`;

      // Obtém os dados do Firestore
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

      // Verifica se o timestamp atual é válido em relação à data de expiração
      const expireDate = new Date(data.fields.expiryDate.timestampValue).getTime();
      if (expireParam !== expireDate || expireDate < Date.now()) {
        return new Response('Expired or invalid link', { status: 403 });
      }

      // Procura a URL do vídeo pelo nome fornecido
      let videoUrl = null;
      let groupTitle = '';

      for (const category in data.fields) {
        if (category === "expiryDate") continue; // Ignora o campo expiryDate

        const movies = data.fields[category].mapValue.fields;
        if (movies[name]) {
          videoUrl = movies[name].mapValue.fields.url.stringValue;
          groupTitle = category;
          break;
        }
      }

      // Se a URL do vídeo for encontrada, redireciona
      if (videoUrl) {
        return Response.redirect(videoUrl, 302);
      } else {
        return Response.redirect(urlAlt);
      }
    }

    // Verifica se a URL acessada é /m3u/filmes
    if (url.pathname === '/playlist/filmes') {
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
      const expireDate = new Date(data.fields.expiryDate.timestampValue).getTime();

      for (const category in data.fields) {
        if (category === "expiryDate") continue;

        const movies = data.fields[category].mapValue.fields;
        for (const movieId in movies) {
          const movie = movies[movieId].mapValue.fields;
          const title = movie.title.stringValue;
          const logo = movie.image.stringValue;

          // Adiciona a URL camuflada na lista M3U
          m3uList += `#EXTINF:-1 tvg-logo="${logo}" group-title="${category}", ${title}\n`;
          m3uList += `${url.origin}/video/${movieId}/${expireDate}\n`;
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