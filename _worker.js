export default {
  async fetch(request, env, ctx) {
    const userAgent = request.headers.get('User-Agent') || '';
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    const urlAlt = 'https://cdn.pixabay.com/video/2019/08/01/25694-352026464_large.mp4';
    const contExp = 'https://firebasestorage.googleapis.com/v0/b/hwfilm23.appspot.com/o/Hotwheels%20Filmes%2Fse%C3%A7%C3%A3o%20expirou.mp4?alt=media&token=c6ffc0b5-05b3-40a0-b7a5-2ed742c7fbf0';

    const isHome = pathParts.length === 0;

    // Bloqueia user-agents comuns para vídeos e playlists
    const isPlaylist = pathParts.length === 3 && pathParts[2] === 'playlist.m3u8';
    const isVideo = pathParts.length === 5;

    if (!isHome && !isPlaylist && !isVideo) {
      if (userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari')) {
        return new Response(null, { status: 403 });
      }
    }

    const users = await getUsers();

    // --- RETORNAR INFO DO USUÁRIO ---
    if (pathParts.length === 2) {
      const username = pathParts[0];
      const password = pathParts[1];

      const user = users[username];
      if (!user || password !== user.mapValue.fields.password?.stringValue) {
        return new Response('Usuário ou senha inválidos', { status: 401 });
      }

      const expireDate = new Date(user.mapValue.fields.exp_date.timestampValue).getTime();
      const now = Date.now();
      const remainingSeconds = Math.floor((expireDate - now) / 1000);

      return new Response(JSON.stringify({
        username,
        expireDate: new Date(expireDate).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        remainingSeconds,
        remainingTime: formatTime(remainingSeconds),
        status: remainingSeconds > 0 ? 'ativo' : 'expirado'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // --- GERAR LISTA M3U ---
    if (isPlaylist) {
      const username = pathParts[0];
      const password = pathParts[1];

      const user = users[username];
      if (!user || password !== user.mapValue.fields.password?.stringValue) {
        return new Response('Usuário ou senha inválidos', { status: 401 });
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

    // --- ACESSO A UM VÍDEO ESPECÍFICO ---
    if (isVideo) {
      const [rota, username, password, categoria, indexRaw] = pathParts;
      const indexId = parseInt(indexRaw);

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

    // Página principal liberada
    return env.ASSETS.fetch(request);
  }
};

// Função para formatar segundos para "X dias, Y horas..."
function formatTime(seconds) {
  if (seconds <= 0) return 'expirado';

  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  let parts = [];
  if (d) parts.push(`${d} dia${d > 1 ? 's' : ''}`);
  if (h) parts.push(`${h} hora${h > 1 ? 's' : ''}`);
  if (m) parts.push(`${m} minuto${m > 1 ? 's' : ''}`);
  if (s) parts.push(`${s} segundo${s > 1 ? 's' : ''}`);

  return parts.join(', ');
}

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
