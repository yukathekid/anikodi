export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');

    // Verifica se é a rota player_api.php
    if (pathParts[1] === "player_api.php") {
      // Obtém os parâmetros da URL
      const searchParams = url.searchParams;
      const username = searchParams.get('username');
      const password = searchParams.get('password');
      const action = searchParams.get('action');
      const vod_id = searchParams.get('vod_id');

      /*if (!username || !password || !action || !vod_id) {
        return new Response('Missing parameters', { status: 400 });
      }*/

      // URL do banco de dados Firestore para autenticar o usuário
      const userDB = `https://firestore.googleapis.com/v1/projects/hwfilm23/databases/(default)/documents/reitvbr/users`;

      // Obtém os dados do Firestore
      const res = await fetch(userDB, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        return new Response('Error fetching user data from Firestore', { status: res.status });
      }

      const data = await res.json();
      const user = data.fields;

      // Verifica se o usuário existe
      if (!user[username]) {
        return new Response("User not found", { status: 404 });
      }

      // Obtém os dados do usuário
      const userInfo = user[username].mapValue.fields;
      const expireDate = new Date(userInfo.exp_date?.timestampValue).getTime();
      const status = expireDate < Date.now() ? 'Expired' : 'Active';

      // Verifica se a senha corresponde
      const passwordValid = btoa(String(expireDate)).replace(/=+$/, '') === password;
      if (!passwordValid) {
        return new Response(`Invalid password: ${passwordValid}`, { status: 403 });
      }

      // Verifica se a ação é 'get_vod_info'
      if (action === 'get_vod_info') {
        // Gera informações do vídeo com base no vod_id
        const videoData = await getVideoInfo(vod_id);
        if (!videoData) {
          return new Response("Video not found", { status: 404 });
        }

        // Estrutura do JSON com as informações do vídeo
        const responseData = {
          video_info: {
            title: videoData.title,
            duration: videoData.duration,
            stream_url: videoData.stream_url,
          },
        };

        return new Response(JSON.stringify(responseData), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Se a ação não for 'get_vod_info'
      return new Response("Invalid action", { status: 400 });
    }

    // Bloqueia User-Agents de navegadores comuns
    const userAgent = request.headers.get('User-Agent') || '';
    if (userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari')) {
      return new Response(null, { status: 403 });
    }

    return new Response('Not Found', { status: 404 });
  }
};

// Função para buscar as informações do vídeo com base no vod_id
async function getVideoInfo(vod_id) {
  // Exemplificando com um banco de dados estático ou API (substitua com seu banco real)
  const videoDatabase = {
    "249417": {
      title: "Deadpool & Wolverine 4K",
      duration: "02:08:00",
      stream_url: "http://cdn22.cc:80/movie/6705646555/60670/249417.mp4"
    },
    "249418": {
      title: "Filme Ação - Aventura Sem Fim",
      duration: "02:08:00",
      stream_url: "http://cdn22.cc:80/movie/6705646555/60670/249418.mp4"
    }
    // Adicione mais vídeos conforme necessário
  };

  // Retorna os dados do vídeo com base no vod_id
  return videoDatabase[vod_id] || null;
}