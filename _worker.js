export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');

    // Verifica se é a rota "player_api.php"
    if (pathParts[1] === "player_api.php") {
      const searchParams = url.searchParams;
      const username = searchParams.get('username');
      const password = searchParams.get('password');
      const action = searchParams.get('action');
      const vodId = searchParams.get('vod_id');
      const seriesId = searchParams.get('series_id');

      if (!username || !password) {
        return new Response('Username and password are required', { status: 400 });
      }

      // URL do Firestore para autenticar o usuário
      const userDB = `https://firestore.googleapis.com/v1/projects/hwfilm23/databases/(default)/documents/reitvbr/users`;

      const res = await fetch(userDB, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        return new Response(null, { status: res.status });
      }

      const data = await res.json();
      const users = data.fields;

      // Verifica se o usuário existe
      if (!users[username]) {
        return new Response("User not found", { status: 404 });
      }

      const userInfo = users[username].mapValue.fields;
      const expireDate = new Date(userInfo.exp_date?.timestampValue).getTime();
      const status = expireDate < Date.now() ? 'Expired' : 'Active';

      // Valida a senha
      const passwordValid = btoa(String(expireDate)).replace(/=+$/, '') === password;
      if (!passwordValid) {
        return new Response(`Invalid password`, { status: 403 });
      }

      // Proxy para obter informações do VOD
      if (action === 'get_vod_info' && vodId) {
        const apiUrl = `http://cdn22.cc/player_api.php?username=6705646555&password=60670&action=get_vod_info&vod_id=${vodId}`;
        const vodResponse = await fetch(apiUrl);
        const vodData = await vodResponse.json();
        return new Response(JSON.stringify(vodData), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Proxy para obter informações da série
      if (action === 'get_series_info' && seriesId) {
        const apiUrl = `http://cdn22.cc/player_api.php?username=6705646555&password=60670&action=get_series_info&series_id=${seriesId}`;
        const seriesResponse = await fetch(apiUrl);
        const seriesData = await seriesResponse.json();
        return new Response(JSON.stringify(seriesData), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Resposta com informações do usuário autenticado
      const responseData = {
        user_info: {
          username: username,
          password: password,
          message: userInfo.message ? userInfo.message.stringValue : null,
          auth: 1,
          status: status,
          exp_date: userInfo.exp_date ? Math.floor(new Date(userInfo.exp_date.timestampValue).getTime() / 1000) : null,
          is_trial: userInfo.is_trial ? userInfo.is_trial.stringValue : "0",
          active_cons: userInfo.active_cons ? userInfo.active_cons.stringValue : "0",
          created_at: userInfo.created_at ? Math.floor(new Date(userInfo.created_at.timestampValue).getTime() / 1000) : null,
          max_connections: userInfo.max_connections ? userInfo.max_connections.stringValue : "1",
          allowed_output_formats: userInfo.allowed_output_formats ? userInfo.allowed_output_formats.arrayValue.values.map(v => v.stringValue) : ["m3u8", "ts"]
        }
      };

      return new Response(JSON.stringify(responseData), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Rotas para servir vídeos de filmes e séries
    const isMovieRoute = pathParts[1] === "movie";
    const isSeriesRoute = pathParts[1] === "series";

    if (isMovieRoute || isSeriesRoute) {
      const username = pathParts[2];
      const password = pathParts[3];
      const videoId = pathParts[4]?.split(".")[0]; // ID do vídeo sem a extensão

      if (!username || !password || !videoId) {
        return new Response('Username, password, and video ID are required', { status: 400 });
      }

      // URL do Firestore para autenticar o usuário
      const userDB = `https://firestore.googleapis.com/v1/projects/hwfilm23/databases/(default)/documents/reitvbr/users`;

      const res = await fetch(userDB, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        return new Response(null, { status: res.status });
      }

      const data = await res.json();
      const users = data.fields;

      // Verifica se o usuário existe
      if (!users[username]) {
        return new Response("User not found", { status: 404 });
      }

      const userInfo = users[username].mapValue.fields;
      const expireDate = new Date(userInfo.exp_date?.timestampValue).getTime();
      const status = expireDate < Date.now() ? 'Expired' : 'Active';

      // Valida a senha
      const passwordValid = btoa(String(expireDate)).replace(/=+$/, '') === password;
      if (!passwordValid) {
        return new Response(`Invalid password`, { status: 403 });
      }

      // Monta a URL do vídeo na CDN, mas sem redirecionar
      const videoUrl = `http://cdn22.cc:80/${isMovieRoute ? "movie" : "series"}/6705646555/60670/${videoId}.mp4`;
      const videoResponse = await fetch(videoUrl);

      if (!videoResponse.ok) {
        return new Response("Video not found", { status: 404 });
      }

      return new Response(videoResponse.body, {
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Disposition': `inline; filename="${videoId}.mp4"`
        }
      });
    }

    return new Response("Not found", { status: 404 });
  }
};