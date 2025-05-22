export default {
  async fetch(request, env, ctx) {
    const userAgent = request.headers.get('User-Agent') || '';
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');

    const urlAlt = 'https://cdn.pixabay.com/video/2019/08/01/25694-352026464_large.mp4';

    // Bloqueia User-Agents de navegadores comuns
   // if (userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari')) {
     // return new Response(null, { status: 403 });
    //}

    const users = await getUsers();

    // --- ACESSO A UM VÍDEO ESPECÍFICO ---
    if (pathParts[1] && pathParts[2] && pathParts[3]) {
      const rota = pathParts[1];
      const username = pathParts[2];
      const movieId = pathParts[3];

      const user = users[username];
      /*if (!user || !user.mapValue.fields.exp_date?.timestampValue) {
        return Response.redirect(urlAlt, 302);
      }*/

      const expireDate = new Date(user.mapValue.fields.exp_date.timestampValue).getTime();
      if (expireDate < Date.now()) {
        return Response.redirect(urlAlt, 302);
      }

      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/hwfilm23/databases/(default)/documents/reitvbr/vods`;
      const response = await fetch(firestoreUrl);
      const data = await response.json();

      let videoUrl = null;

      for (const category in data.fields) {
        if (category === "expiryDate") continue;

        const movies = data.fields[category].mapValue.fields;
        if (movies[movieId]) {
          videoUrl = movies[movieId].mapValue.fields.url?.stringValue;
          break;
        }
      }

      if (videoUrl) {
        return Response.redirect(videoUrl, 302);
      } else {
        return Response.redirect(urlAlt, 302);
      }
    }

    // --- GERAR LISTA M3U ---
    if (pathParts[1] && pathParts[2]) {
      const username = pathParts[1];
      const password = pathParts[2];

      const user = users[username];
      if (!user || password !== user.mapValue.fields.password?.stringValue) {
        return new Response('Invalid username or password', { status: 401 });
      }

      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/hwfilm23/databases/(default)/documents/reitvbr/vods`;
      const response = await fetch(firestoreUrl);
      const data = await response.json();

      let m3uList = '#EXTM3U\n';

      for (const category in data.fields) {
        if (category === "expiryDate") continue;

        const rota = category.includes("movie") ? "movie" : "series";
        const movies = data.fields[category].mapValue.fields;

        for (const movieId in movies) {
          const movie = movies[movieId].mapValue.fields;
          const title = movie.title?.stringValue || movieId;
          const logo = movie.image?.stringValue || '';
          const group = movie.group?.stringValue || category;

          m3uList += `#EXTINF:-1 tvg-id="" tvg-name="${title}" tvg-logo="${logo}" group-title="${group}", ${title}\n`;
          m3uList += `${url.origin}/${rota}/${username}/${password}/${movieId}\n`;
        }
      }

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

// Verifica se uma URL está online
async function isUrlOnline(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (err) {
    return false;
  }
}

// Obter usuários do Firestore
async function getUsers() {
  const userDB = `https://firestore.googleapis.com/v1/projects/hwfilm23/databases/(default)/documents/reitvbr/users`;
  const response = await fetch(userDB);
  const data = await response.json();
  return data.fields || {};
}
