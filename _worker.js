export default {
  async fetch(request, env, ctx) {
    const userAgent = request.headers.get('User-Agent') || '';
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');

    const urlAlt = 'https://cdn.pixabay.com/video/2019/08/01/25694-352026464_large.mp4';
    const contExp = 'https://firebasestorage.googleapis.com/v0/b/hwfilm23.appspot.com/o/Hotwheels%20Filmes%2Fse%C3%A7%C3%A3o%20expirou.mp4?alt=media&token=c6ffc0b5-05b3-40a0-b7a5-2ed742c7fbf0';

    const users = await getUsers();

    // --- ROTA INFORMAÇÕES USUÁRIO: /usuario/senha (liberar para todos User-Agent)
    if (pathParts.length === 3) {
      const username = pathParts[1];
      const password = pathParts[2];

      const user = users[username];
      if (!user || password !== user.mapValue.fields.password?.stringValue) {
        return new Response('Invalid username or password', { status: 401 });
      }

      const expireDate = new Date(user.mapValue.fields.exp_date.timestampValue);
      const remainingSeconds = Math.floor((expireDate.getTime() - Date.now()) / 1000);

      const remainingHuman = formatRemainingTime(remainingSeconds);

      return new Response(JSON.stringify({
        username,
        expireDate: expireDate.toISOString(),
        remainingSeconds,
        remainingHuman
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // --- ROTA PLAYLIST: /usuario/senha/playlist.m3u8 (liberar só para userAgent do app)
    if (pathParts.length === 4 && pathParts[3] === 'playlist.m3u8') {
      const allowedAgent = 'anikodi-agent'; // coloque o user-agent do seu app aqui

      if (!userAgent.includes(allowedAgent)) {
        return new Response('Acesso não autorizado (User-Agent inválido)', { status: 403 });
      }

      const username = pathParts[1];
      const password = pathParts[2];

      const user = users[username];
      if (!user || password !== user.mapValue.fields.password?.stringValue) {
        return new Response('Invalid username or password', { status: 401 });
      }

      const expireDate = new Date(user.mapValue.fields.exp_date.timestampValue);
      if (expireDate < Date.now()) {
        return Response.redirect(contExp, 302);
      }

      // Busca lista no Firestore
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
          'Content-Disposition': 'attachment; filename="playlist.m3u"'
        }
      });
    }

    // --- ROTA VÍDEO: /rota/usuario/senha/categoria/index (bloquear navegadores comuns)
    if (pathParts.length >= 6) {
      if (userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari')) {
        return new Response(null, { status: 403 });
      }

      const rota = pathParts[1];         // 'series'
      const username = pathParts[2];
      const password = pathParts[3];
      const categoria = pathParts[4];
      const indexId = parseInt(pathParts[5]);

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

    // --- PARA QUALQUER OUTRO PEDIDO --- 
    return env.ASSETS.fetch(request);
  }
};

function formatRemainingTime(seconds) {
  if (seconds <= 0) return 'expirado';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  let result = '';
  if (days > 0) result += `${days} dia${days > 1 ? 's' : ''} `;
  if (hours > 0) result += `${hours} hora${hours > 1 ? 's' : ''} `;
  if (minutes > 0) result += `${minutes} minuto${minutes > 1 ? 's' : ''} `;
  if (secs > 0) result += `${secs} segundo${secs > 1 ? 's' : ''} `;

  return result.trim();
}

async function isUrlOnline(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (err) {
    return false;
  }
}

async function getUsers() {
  const userDB = `https://firestore.googleapis.com/v1/projects/hwfilm23/databases/(default)/documents/reitvbr/users`;
  const response = await fetch(userDB);
  const data = await response.json();
  return data.fields || {};
}
