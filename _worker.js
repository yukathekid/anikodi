export default {
  async fetch(request, env, ctx) {
    const userAgent = request.headers.get('User-Agent') || '';
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    const urlAlt = 'https://cdn.pixabay.com/video/2019/08/01/25694-352026464_large.mp4';
    const contExp = 'https://firebasestorage.googleapis.com/v0/b/hwfilm23.appspot.com/o/Hotwheels%20Filmes%2Fse%C3%A7%C3%A3o%20expirou.mp4?alt=media&token=c6ffc0b5-05b3-40a0-b7a5-2ed742c7fbf0';

    const users = await getUsers();

    // Raiz /
    if (pathParts.length === 0) {
      return env.ASSETS.fetch(request);
    }

    // /usuario/senha → JSON com infos do usuário
    if (pathParts.length === 2) {
      const username = pathParts[0];
      const password = pathParts[1];

      const user = users[username];
      if (!user || password !== user.mapValue.fields.password?.stringValue) {
        return new Response('Invalid username or password', { status: 401 });
      }

      const expireTimestamp = new Date(user.mapValue.fields.exp_date.timestampValue).getTime();
      const now = Date.now();
      const remainingMs = expireTimestamp - now;
      const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
      const expireDate = new Date(expireTimestamp).toLocaleString();

      const result = {
        username,
        expireDate,
        remainingSeconds,
      };

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // /usuario/senha/playlist.m3u8 → playlist M3U
    if (pathParts.length === 3 && pathParts[2] === 'playlist.m3u8') {
      const username = pathParts[0];
      const password = pathParts[1];

      const user = users[username];
      if (!user || password !== user.mapValue.fields.password?.stringValue) {
        return new Response('Invalid username or password', { status: 401 });
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
            const title = movie.title?.stringValue || `Video ${index + 1}`;
            const logo = movie.image?.stringValue || '';
            const group = movie.group?.stringValue || categoria;

            m3uList += `#EXTINF:-1 tvg-id="" tvg-name="${title}" tvg-logo="${logo}" group-title="${group}", ${title}\n`;
            m3uList += `${url.origin}/${rota}/${username}/${password}/${categoria}/${index}\n`;
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

    // Acesso a vídeos: bloquear navegadores (User-Agent)
    if (pathParts.length >= 5) {
      const forbiddenAgents = ['Mozilla', 'Chrome', 'Safari'];
      const isBrowser = forbiddenAgents.some(agent => userAgent.includes(agent));
      if (isBrowser) {
        return new Response(null, { status: 403 });
      }

      const rota = pathParts[0];
      const username = pathParts[1];
      const password = pathParts[2];
      const categoria = pathParts[3];
      const indexId = parseInt(pathParts[4]);

      const user = users[username];
      if (!user || password !== user.mapValue.fields.password?.stringValue) {
        return Response.redirect(urlAlt, 302);
      }

      const expireDate = new Date(user.mapValue.fields.exp_date.timestampValue).getTime();
      if (expireDate < Date.now()) {
        return Response.redirect(contExp, 302);
      }

      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/hwfilm23/databases/(default)/documents/reitvbr/anim3u8`;
      const response = await fetch(firestoreUrl);
      const data = await response.json();

      let videoUrl = null;
      if (data.fields[rota]?.mapValue?.fields?.[categoria]?.arrayValue?.values) {
        const videoList = data.fields[rota].mapValue.fields[categoria].arrayValue.values;
        if (!isNaN(indexId) && indexId >= 0 && indexId < videoList.length) {
          const movie = videoList[indexId].mapValue.fields;
          const possibleUrl = movie.url?.stringValue?.trim();
          if (possibleUrl) videoUrl = possibleUrl;
        }
      }

      if (videoUrl && await isUrlOnline(videoUrl)) {
        return Response.redirect(videoUrl, 302);
      } else {
        return Response.redirect(urlAlt, 302);
      }
    }

    // Outras rotas
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
