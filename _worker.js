export default {
  async fetch(request, env, ctx) {
    const userAgent = request.headers.get('User-Agent') || '';

 // Bloqueia User-Agents de navegadores comuns
   if (userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari')) {
      return new Response(null, { status: 403 });
    }

    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    if (pathParts[1] && pathParts[2] && pathParts[3] && pathParts[4]) {
      const rots = pathParts[2];
      const tokenS = pathParts[3];
      const name = pathParts[4];

      const urlAlt = 'https://api-f.streamable.com/api/v1/videos/qnyv36/mp4';

      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/hwfilm23/databases/(default)/documents/reitvbr/vods`;


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
      const users = await getUsers();
      // Verifica se o timestamp atual é válido em relação à data de expiração
      const expireDate = new Date(users[pathParts[2]].mapValue.fields.exp_date?.timestampValue).getTime();
      if (expireDate < Date.now()) {
        return Response.redirect(urlAlt, 302);
      }

      //const pass = btoa(String(expireDate)).replace(/=+$/, '');

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
    if (pathParts[1] && pathParts[2]) {  
      const username = pathParts[1];  // O nome do usuário
      const password = pathParts[2];  // A senha do usuário

      // Obtém a lista de usuários do Firestore
      const users = await getUsers();

      // Verifica se o usuário existe e a senha está correta
      if (username != users[username] && password != users[username].mapValue.fields.password.stringValue) {
        return new Response('Invalid username or password', { status: 403 });
      } 
      
         
      const firestoreUrl = 'https://firestore.googleapis.com/v1/projects/hwfilm23/databases/(default)/documents/reitvbr/vods';
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
        const rota = category.includes("movie") ? "movie" : "series"; 
        //const rotas = category.includes("SÉRIES") ? "series" : rota;

        const movies = data.fields[category].mapValue.fields;

        for (const movieId in movies) {
          const movie = movies[movieId].mapValue.fields;
          const title = movie.title.stringValue;
          const logo = movie.image.stringValue;
          const group = movie.group.stringValue;
          // Cria o token Base64 usando title e movieId
          const combinedString = `${title}|${movieId}`;
          const token = btoa(combinedString);
          const uId = Math.floor(new Date(data.fields.expiryDate.timestampValue) / (1000 * 3600 * 24));
          m3uList += `#EXTINF:-1 tvg-id="" tvg-name="${title}" tvg-logo="${logo}" group-title="${group}", ${title}\n`;
          m3uList += `${url.origin}/${rota}/${pathParts[1]}/${pathParts[2]}/${movieId}\n`;
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