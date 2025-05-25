export default {
  async fetch(request, env, ctx) {
    const userAgent = request.headers.get('User-Agent') || '';
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');

    const urlAlt = 'https://cdn.pixabay.com/video/2019/08/01/25694-352026464_large.mp4';
    const contExp = 'https://firebasestorage.googleapis.com/v0/b/hwfilm23.appspot.com/o/Hotwheels%20Filmes%2Fse%C3%A7%C3%A3o%20expirou.mp4?alt=media&token=c6ffc0b5-05b3-40a0-b7a5-2ed742c7fbf0';

    const users = await getUsers();

    // ✅ ROTA DE INFO: /usuario/senha
    if (pathParts.length === 3) {
      const username = pathParts[1];
      const password = pathParts[2];

      const user = users[username];
      if (!user || password !== user.mapValue.fields.password?.stringValue) {
        return new Response(JSON.stringify({ error: 'Invalid username or password' }), { status: 401 });
      }

      const expireDate = new Date(user.mapValue.fields.exp_date.timestampValue);
      const remainingSeconds = Math.floor((expireDate - Date.now()) / 1000);
      const status = remainingSeconds > 0 ? 'ativo' : 'expirado';

      const expiraEmTexto = formatarTempo(remainingSeconds);

      return new Response(JSON.stringify({
        username,
        expireDate: expireDate.toISOString(),
        remainingSeconds,
        expiraEmTexto,
        status
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ✅ ROTA M3U8: /usuario/senha/playlist.m3u8
    if (pathParts.length === 4 && pathParts[3] === 'playlist.m3u8') {
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

      const firestoreUrl = env.DBPLAY;
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
            m3uList += `${url.origin}/${rota}/${username}/${password}/${categoria}/${index + 1}\n`;
          });
        }
      }

      return new Response(m3uList, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Content-Disposition': 'attachment; filename="playlist.m3u8"'
        }
      });
    }

    // ✅ ACESSO A VÍDEO (com User-Agent bloqueado)
    if (pathParts.length >= 6) {
      const userAgent = request.headers.get('User-Agent') || '';
      if (userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari')) {
        return new Response(null, { status: 403 });
      }

      const rota = pathParts[1];
      const username = pathParts[2];
      const password = pathParts[3];
      const categoria = pathParts[4];
      const indexId = parseInt(pathParts[5]);

      const user = users[username];
      if (!user || password !== user.mapValue.fields.password?.stringValue) {
        return Response.redirect(urlAlt, 302);
      }

      const expireDate = new Date(user.mapValue.fields.exp_date.timestampValue);
      if (expireDate < Date.now()) {
        return Response.redirect(contExp, 302);
      }

      const firestoreUrl = env.DBPLAY;
      const response = await fetch(firestoreUrl);
      const data = await response.json();

      let videoUrl = null;

      if (data.fields[rota]?.mapValue?.fields?.[categoria]?.arrayValue?.values) {
        const videoList = data.fields[rota].mapValue.fields[categoria].arrayValue.values;
        if (!isNaN(indexId) && indexId >= 0 && indexId < videoList.length) {
          const movie = videoList[indexId].mapValue.fields;
          videoUrl = movie.url?.stringValue?.trim() || null;
        }
      }

      if (videoUrl && await isUrlOnline(videoUrl)) {
        return Response.redirect(videoUrl, 302);
      } else {
        return Response.redirect(urlAlt, 302);
      }
    }

    // ROTA DEFAULT (homepage ou estático)
    return env.ASSETS.fetch(request);
  }
};

// 🔧 UTILITÁRIOS

function formatarTempo(segundos) {
  if (segundos <= 0) return 'expirado';

  const dias = Math.floor(segundos / 86400);
  const horas = Math.floor((segundos % 86400) / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);

  let partes = [];
  if (dias) partes.push(`${dias} dia${dias > 1 ? 's' : ''}`);
  if (horas) partes.push(`${horas} hora${horas > 1 ? 's' : ''}`);
  if (minutos) partes.push(`${minutos} minuto${minutos > 1 ? 's' : ''}`);

  return `expira em ${partes.join(', ')}`;
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
  const userDB = env.DBUSER;
  const response = await fetch(userDB);
  const data = await response.json();
  return data.fields || {};
}
