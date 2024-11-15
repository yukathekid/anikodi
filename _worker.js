export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');

    // Verifica se a URL segue o formato correto: /{username}/{password}
    if (pathParts.length >= 3) {
      const username = pathParts[1];  // O nome do usuário
      const password = pathParts[2];  // A senha do usuário

      // Obtém a lista de usuários do Firestore
      const users = await getUsers();

      // Verifica se o usuário existe e a senha está correta
      if (!users[username] || users[username].password.stringValue !== password) {
        return new Response('Invalid username or password', { status: 403 });
      }

      // Obtém a lista de VODs do Firestore
      const vods = await getVods();

      // Verifica se a URL contém um {movieId} para acessar o vídeo
      if (pathParts.length === 5) {
        const rota = pathParts[1]; // "movie" ou "series"
        const movieId = pathParts[4]; // O ID do filme

        let videoUrl = null;

        // Busca o vídeo pelo ID
        for (const category in vods) {
          const movies = vods[category].mapValue.fields;
          if (movies[movieId]) {
            videoUrl = movies[movieId].mapValue.fields.url.stringValue;
            break;
          }
        }

        if (videoUrl) {
          // Redireciona para a URL camuflada do vídeo
          return Response.redirect(videoUrl, 302);
        } else {
          return new Response(altUrl, { status: 302 });
        }
      } else {
        // Caso contrário, gera a lista M3U
        let m3uList = '#EXTM3U\n';

        for (const category in vods) {
          const rota = category.includes("movie") ? "movie" : "series";  // Determina a categoria
          const movies = vods[category].mapValue.fields;

          for (const movieId in movies) {
            const movie = movies[movieId].mapValue.fields;
            const title = movie.title.stringValue;
            const logo = movie.image.stringValue || '';
            const group = movie.group.stringValue || 'General';

            // Criação da linha M3U
            m3uList += `#EXTINF:-1 tvg-id="" tvg-name="${title}" tvg-logo="${logo}" group-title="${group}", ${title}\n`;
            m3uList += `${url.origin}/${rota}/${username}/${password}/${movieId}\n`;  // URL camuflada
          }
        }

        return new Response(m3uList, {
          headers: {
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Content-Disposition': 'attachment; filename="playlist.m3u"',
          },
        });
      }
    }

    return new Response('Invalid request', { status: 400 });
  },
};

// Função para obter lista de usuários
async function getUsers() {
  const userDB = `https://firestore.googleapis.com/v1/projects/hwfilm23/databases/(default)/documents/reitvbr/users`;
  const response = await fetch(userDB, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }

  const data = await response.json();
  return data.fields || {};
}

// Função para obter lista de VODs
async function getVods() {
  const vodDB = `https://firestore.googleapis.com/v1/projects/hwfilm23/databases/(default)/documents/reitvbr/vods`;
  const response = await fetch(vodDB, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch VODs');
  }

  const data = await response.json();
  return data.fields || {};
}