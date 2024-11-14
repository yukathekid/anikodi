export default {
  async fetch(request, env, ctx) {
    const userAgent = request.headers.get('User-Agent') || '';
   
  return await getUsers(request);
 
 // Bloqueia User-Agents de navegadores comuns
   if (userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari')) {
      return new Response(null, { status: 403 });
    }

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

      // Verifica se o timestamp atual é válido em relação à data de expiração
      const expireDate = new Date(data.fields.expiryDate?.timestampValue).getTime();
      if (expireDate < Date.now()) {
        return Response.redirect(urlAlt, 302);
      }

      const pass = btoa(String(expireDate)).replace(/=+$/, '');

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
    
    
    if (pathParts[1] === 'reitv-vods' && pathParts[2] === getData(pass)) {      
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

          m3uList += `#EXTINF:-1 tvg-id="" tvg-name="${title}" tvg-logo="${logo}" group-title="${group}", ${title}\n`;
          m3uList += `${url.origin}/${rota}/${pathParts[1]}/${token}/${movieId}\n`;
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

async function getUsers(request) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    
    // Verifica se há um "username" na URL
    if (pathParts[1]) {
        const username = pathParts[1]; // Pega o "username" da URL
        const db = `https://firestore.googleapis.com/v1/projects/hwfilm23/databases/(default)/documents/reitvbr/users/${username}`;

        // Faz a requisição para o Firestore
        const res = await fetch(db, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Verifica se a requisição falhou
        if (!res.ok) {
            return new Response(null, { status: res.status });
        }
        
        // Converte a resposta para JSON
        const dataDB = await res.json();

        // Pega a data de expiração do usuário
        const expire = new Date(dataDB.fields.exp_date?.timestampValue).getTime();
        
        // Codifica a data de expiração em base64 para gerar a senha
        const pass = btoa(String(expire)).replace(/=+$/, ''); 

        // Cria o objeto de resposta com as informações do usuário
        const usersData = {
            username: username,
            password: pass,  // Senha gerada a partir do timestamp
            timestamp_now: Date.now(),  // Timestamp atual
            exp_timestamp: expire  // Timestamp de expiração
        };

        // Retorna o JSON com as informações do usuário
        return new Response(JSON.stringify(usersData, null, 2), {
            headers: { 'Content-Type': 'application/json' }
        });
    } else {
        // Caso o username não seja encontrado na URL
        return new Response('Username not found in URL', { status: 400 });
    }
}