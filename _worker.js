function generateKey(length = 32) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

const SECRET_KEY = generateKey();

function generateExpiringToken(movieId, expirationTimeInMs) {
    const expiresAt = Date.now() + expirationTimeInMs;
    const tokenData = `${movieId}-${expiresAt}-${SECRET_KEY}`;
    return btoa(tokenData);  // Codifica o token em Base64
}

function isTokenValid(token) {
    const decoded = atob(token).split('-');
    const movieId = decoded[0];
    const expiresAt = parseInt(decoded[1], 10);
    const secret = decoded[2];

    // Verifica se o token não expirou e se a chave secreta é a mesma
    return Date.now() < expiresAt && secret === SECRET_KEY;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Verifica se é uma requisição para a lista M3U
    if (url.pathname === '/m3u/animes') {
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
      let m3uList = '#EXTM3U\n';
      const fields = data.fields;
      const expirationTimeInMs = 1 * 60 * 60 * 1000; // 1 hora

      for (const category in fields) {
        const movies = fields[category].mapValue.fields;
        for (const movieId in movies) {
          const movie = movies[movieId].mapValue.fields;
          const title = movie.title.stringValue;
          const logo = movie.image.stringValue;

          const token = generateExpiringToken(movieId, expirationTimeInMs);
          const videoUrl = `https://anikodi.xyz/video/${movieId}?token=${token}`;

          m3uList += `#EXTINF:-1 tvg-logo="${logo}" group-title="${category}", ${title}\n`;
          m3uList += `${videoUrl}\n`;
        }
      }

      return new Response(m3uList, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Content-Disposition': 'attachment; filename="playlist.m3u"'
        }
      });
    }

    // Verifica se é uma requisição para o vídeo
    if (url.pathname.startsWith('/video/')) {
      const movieId = url.pathname.split('/')[2];
      const token = url.searchParams.get('token');

      if (!token || !isTokenValid(token)) {
        return new Response('Token inválido ou expirado', { status: 403 });
      }

      // Aqui você poderia retornar o vídeo ou redirecionar para a URL do vídeo
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/hwfilm23/databases/(default)/documents/users/filmes/${movieId}`;
      const response = await fetch(firestoreUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return new Response('Error fetching video from Firestore', { status: response.status });
      }

      const movieData = await response.json();
      const videoUrl = movieData.fields.url.stringValue;

      return Response.redirect(videoUrl, 302);
    }

    return env.ASSETS.fetch(request);
  }
};