export default {
  async fetch(request, env, ctx) {
    const userAgent = request.headers.get('User-Agent') || '';

    // Bloqueia User-Agents de navegadores comuns
    if (userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari')) {
      return new Response(null, { status: 403 });
    }

    const url = new URL(request.url);

    // Verifica se a URL acessada é uma URL camuflada
    if (url.pathname.startsWith('/ReiTv/')) {
      const pathParts = url.pathname.split('/');
      const rots = pathParts[2];
      const tokenS = pathParts[3];
      const name = pathParts[4];

      const urlAlt = 'https://api-f.streamable.com/api/v1/videos/qnyv36/mp4';

      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/hwfilm23/databases/(default)/documents/reitvbr/filmes`;

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
      const expireDate = new Date(data.fields.expiryDate?.timestampValue).getTime();
      if (expireDate < Date.now()) {
        return Response.redirect(urlAlt, 302);
      }

      // Procura a URL do vídeo pelo ID fornecido
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
        return Response.redirect(urlAlt, 302);
      }
    }

    // Verifica se a URL acessada é /playlist/filmes
    if (url.pathname === '/playlist/filmes') {
      const firestoreUrl = 'https://firestore.googleapis.com/v1/projects/hwfilm23/databases/(default)/documents/reitvbr/filmes';
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

      for (const category in data.fields) {
        if (category === "expiryDate") continue;
        const rota = category.includes("FILMES") ? "movie" : "live"; 
        const rotas = category.includes("SÉRIES") ? "series" : rota;
  
        const movies = data.fields[category].mapValue.fields;
        
        for (const movieId in movies) {
          const movie = movies[movieId].mapValue.fields;
          const title = movie.title.stringValue;
          const logo = movie.image.stringValue;
          const isRots = category.includes(title) ? "movie" : rotas;

          // Cria o token Base64 usando title e movieId
          const combinedString = `${title}|${movieId}`;
          const token = btoa(combinedString);
        
          m3uList += `#EXTINF:-1 tvg-id="" tvg-name="${title}" tvg-logo="${logo}" group-title="${category}", ${title}\n`;
          m3uList += `${url.origin}/ReiTv/${isRots}/${token}/${movieId}\n`;
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