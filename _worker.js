export default {
  async fetch(request, env, ctx) {
    const userAgent = request.headers.get('User-Agent') || '';
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean); // Remove strings vazias
    
    const urlAlt = 'https://cdn.pixabay.com/video/2019/08/01/25694-352026464_large.mp4';
    const contExp = 'https://firebasestorage.googleapis.com/v0/b/hwfilm23.appspot.com/o/Hotwheels%20Filmes%2Fse%C3%A7%C3%A3o%20expirou.mp4?alt=media&token=c6ffc0b5-05b3-40a0-b7a5-2ed742c7fbf0';

    // Libera página inicial (sem pathParts)
    if (pathParts.length === 0) {
      return env.ASSETS.fetch(request);
    }

    const users = await getUsers();

    // Rota info do usuário: /usuario/senha
    if (pathParts.length === 2) {
      const [username, password] = pathParts;

      const user = users[username];
      if (!user || password !== user.mapValue.fields.password?.stringValue) {
        return new Response('Invalid username or password', { status: 401 });
      }

      const expireDate = new Date(user.mapValue.fields.exp_date.timestampValue);
      const now = Date.now();
      const remainingSeconds = Math.max(0, Math.floor((expireDate.getTime() - now) / 1000));

      return new Response(JSON.stringify({
        username,
        expireDate: expireDate.toISOString(),
        remainingSeconds
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Bloqueia user-agent de navegador para outras rotas (playlist e vídeos)
    if (userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari')) {
      return new Response(null, { status: 403 });
    }

    // Rota playlist: /usuario/senha/playlist.m3u8
    if (pathParts.length === 3 && pathParts[2] === 'playlist.m3u8') {
      const [username, password] = pathParts;

      const user = users[username];
      if (!user || password !== user.mapValue.fields.password?.stringValue) {
        return new Response('Invalid username or password', { status: 401 });
      }

      const expireDate = new Date(user.mapValue.fields.exp_date.timestampValue).getTime();
      if (expireDate < Date.now()) {
        return new Response('Subscription expired', { status: 403 });
      }

      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/hwfilm23/databases/(default)/documents/reitvbr/anim3u8`;
      const response = await fetch(firestoreUrl);
      const data = await response.json();

      let m3uList = '#EXTM3U\n';

      for (const rota in data.fields) {
        const categorias = data.fields[rota]?.mapValue?.fields || {};
        for (const categoria in categorias) {
          const videoList = categorias[categoria]?.arrayValue?.values || [];

          videoList.forEach((item, index) => {
            const movie = item.mapValue.fields;
            const title = movie.title?.stringValue || `Video ${index}`;
            const logo = movie.image?.stringValue || '';
            const group = movie.group?.stringValue || categoria;

            // Link do vídeo: /rota/usuario/senha/categoria/index+1
            m3uList += `#EXTINF:-1 tvg-id="" tvg-name="${title}" tvg-logo="${logo}" group-title="${group}", ${title}\n`;
            m3uList += `${url.origin}/${rota}/${username}/${password}/${categoria}/${index + 1}\n`;
          });
        }
      }

      return new Response(m3uList, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Content-Disposition': 'attachment; filename="playlist.m3u"'
        }
      });
    }

    // Rota de vídeo: /rota/usuario/senha/categoria/index
    if (pathParts.length === 5) {
      const [rota, username, password, categoria, indexStr] = pathParts;

      const user = users[username];
      if (!user || password !== user.mapValue.fields.password?.stringValue) {
        return Response.redirect(urlAlt, 302);
      }

      const expireDate = new Date(user.mapValue.fields.exp_date.timestampValue).getTime();
      if (expireDate < Date.now()) {
        return Response.redirect(contExp, 302);
      }

      const indexId = parseInt(indexStr);
      if (isNaN(indexId)) {
        return Response.redirect(urlAlt, 302);
      }

      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/hwfilm23/databases/(default)/documents/reitvbr/anim3u8`;
      const response = await fetch(firestoreUrl);
      const data = await response.json();

      let videoUrl = null;

      if (data.fields[rota]?.mapValue?.fields?.[categoria]?.arrayValue?.values) {
        const videoList = data.fields[rota].mapValue.fields[categoria].arrayValue.values;

        if (indexId >= 1 && indexId <= videoList.length) {
          const movie = videoList[indexId - 1].mapValue.fields;
          const possibleUrl = movie.url?.stringValue?.trim();

          if (possibleUrl) {
            videoUrl = possibleUrl;
          }
        }
      }

      if (videoUrl && await isUrlOnline(videoUrl)) {
        return Response.redirect(videoUrl, 302);
      } else {
        return Response.redirect(urlAlt, 302);
      }
    }

    // Qualquer outra rota, tenta servir dos assets
    return env.ASSETS.fetch(request);
  }
};

async function isUrlOnline(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

async function getUsers() {
  const userDB = `https://firestore.googleapis.com/v1/projects/hwfilm23/databases/(default)/documents/reitvbr/users`;
  const response = await fetch(userDB);
  const data = await response.json();
  return data.fields || {};
}
