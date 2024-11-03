export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Verifica se a URL acessada é uma URL camuflada
    if (url.pathname.startsWith('/video/')) {
      const name = url.pathname.split('/video/')[1]; // Extrai o nome do filme
      const expireParam = parseInt(url.pathname.split('/video/')[2], 10);
      
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

      // Procura a URL do vídeo baseado no nome fornecido
      const fields = data.fields;
      let videoUrl = null;
      let groupTitle = '';
      const expireDate = fields.expiryDate.timestampValue;
      const exp = new Date(expireDate).getTime();
   
      for (const category in fields) {
        const movies = fields[category].mapValue.fields;
        for (const movieId in movies) {
          const movie = movies[movieId].mapValue.fields;
          if (movieId === name && exp === expireParam && exp > new Date().getTime()) { // Compara com o nome passado na URL
            videoUrl = movie.url.stringValue;
            groupTitle = category; // Armazena o group-title
            break;
          }
        }
        if (videoUrl) break; // Sai do loop se encontrar a URL
      }

      // Se a URL do vídeo for encontrada, redireciona
      if (videoUrl) {
        return Response.redirect(videoUrl, 302);
      } else {
        return new Response('Video not found', { status: 404 });
      }
    }

    // Verifica se a URL acessada é /m3u/animes
    if (url.pathname === '/m3u/filmes') {
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
      const expireDate = fields.expiryDate.timestampValue;
      const exp = new Date(expireDate).getTime();
   
      for (const category in fields) {
        const movies = fields[category].mapValue.fields;
        for (const movieId in movies) {
          const movie = movies[movieId].mapValue.fields;
          const title = movie.title.stringValue;
          const logo = movie.image.stringValue; // URL da imagem

          // Adiciona a URL camuflada na lista M3U
          m3uList += `#EXTINF:-1 tvg-logo="${logo}" group-title="${category}", ${title}\n`;
          m3uList += `${url.origin}/video/${movieId}/${exp}\n`; // URL camuflada
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
