export default {
  async fetch(request, env, ctx) {
    const userAgent = request.headers.get('User-Agent') || '';
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean); // remove strings vazias

    const urlAlt = 'https://cdn.pixabay.com/video/2019/08/01/25694-352026464_large.mp4';
    const contExp = 'https://firebasestorage.googleapis.com/v0/b/hwfilm23.appspot.com/o/Hotwheels%20Filmes%2Fse%C3%A7%C3%A3o%20expirou.mp4?alt=media&token=c6ffc0b5-05b3-40a0-b7a5-2ed742c7fbf0';

    // Liberar acesso à raiz
    if (pathParts.length === 0) {
      return env.ASSETS.fetch(request);
    }

    // Bloqueia User-Agents de navegadores comuns para links de vídeo
    // Só bloqueia se for acesso a vídeos, ou seja, paths maiores ou iguais a 6
    if (pathParts.length >= 6) {
      if (userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari')) {
        return new Response(null, { status: 403 });
      }
    }

    const users = await getUsers();

    // --- RETORNA INFORMAÇÕES DO USUÁRIO COM EXPIRAÇÃO ---
    if (pathParts.length === 2) {
      const [username, password] = pathParts;

      const user = users[username];
      if (!user || password !== user.mapValue.fields.password?.stringValue) {
        return new Response('Invalid username or password', { status: 401 });
      }

      const expireTimestamp = new Date(user.mapValue.fields.exp_date.timestampValue).getTime();
      const expireDateObj = new Date(expireTimestamp);
      const now = Date.now();
      const timeRemainingMs = expireTimestamp - now;
      const timeRemainingSeconds = Math.max(0, Math.floor(timeRemainingMs / 1000));

      const data = {
        username,
        expiresAt: expireTimestamp,
        expiresAtDate: expireDateObj.toISOString(),
        timeRemainingSeconds,
      };

      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // --- ACESSO A UM VÍDEO ESPECÍFICO ---
    if (pathParts.length >= 6) {
      const rota = pathParts[0];         // 'series'
      const username = pathParts[1];
      const password = pathParts[2];
      const categoria = pathParts[3];    // 'firefirce3'
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

    // --- GERAR LISTA M3U ---
    if (pathParts.length === 2) {
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
            const title = movie.title?.stringValue || `Video ${index}`;
            const logo = movie.image?.stringValue || '';
            const group = movie.group?.stringValue || categoria;

            m3uList += `#EXTINF:-1 tvg-id="" tvg-name="${title}" tvg-logo="${logo}" group-title="${group}", ${title}\n`;
            m3uList += `${url.origin}/${rota}/${username}/${password}/${categoria}/${index + 1}\n`;
          });
        }
      }

      return new Response(m3uList, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Content-Disposition': 'attachment; filename="playlist.m3u"',
        },
      });
    }

    // Se não entrar em nenhum caso, libera o acesso (ex: raiz, assets, etc)
    return env.ASSETS.fetch(request);
  },
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
