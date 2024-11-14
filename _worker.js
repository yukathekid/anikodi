
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
      const user = data.fields;

      if (!user[username]) {
        return new Response("User not found", { status: 404 });
      }

      const userInfo = user[username].mapValue.fields;
      const expireDate = new Date(userInfo.exp_date?.timestampValue).getTime();
      const status = expireDate < Date.now() ? 'Expired' : 'Active';

      const passwordValid = btoa(String(expireDate)).replace(/=+$/, '') === password;
      if (!passwordValid) {
        return new Response(`Invalid password`, { status: 403 });
      }

      if (action === 'get_vod_info' && vodId) {
        // Requisita as informações do vídeo diretamente da API da cdn22.cc sem redirecionar
        const infoUrl = `http://cdn22.cc/player_api.php?username=6705646555&password=60670&get_vods=546&action=get_vod_info&vod_id=${vodId}`;
        const videoInfoRes = await fetch(infoUrl);
        const videoInfo = await videoInfoRes.json();

        return new Response(JSON.stringify(videoInfo), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (action === 'get_series_info' && seriesId) {
        // Requisita as informações da série diretamente da API da cdn22.cc sem redirecionar
        const infoUrl = `http://cdn22.cc/player_api.php?username=6705646555&password=60670&get_vods=546&action=get_series_info&series_id=${seriesId}`;
        const seriesInfoRes = await fetch(infoUrl);
        const seriesInfo = await seriesInfoRes.json();

        return new Response(JSON.stringify(seriesInfo), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

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
          allowed_output_formats: userInfo.allowed_output_formats ? userInfo.allowed_output_formats.arrayValue.values.map(v => v.stringValue) : ["m3u8", "ts", "rtmp"]
        },
        server_info: {
          xui: true,
          version: "1.5.5",
          revision: 2,
          url: "anikodi.xyz",
          port: "80",
          https_port: "443",
          server_protocol: "http",
          rtmp_port: "8880",
          timestamp_now: Math.floor(Date.now() / 1000),
          time_now: new Date().toISOString().slice(0, 19).replace('T', ' '),
          timezone: "UTC"
        }
      };

      return new Response(JSON.stringify(responseData, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Rotas para filmes e séries (com redirecionamento)
    const isMovieRoute = pathParts[1] === "movie";
    const isSeriesRoute = pathParts[1] === "series";

    if (isMovieRoute || isSeriesRoute) {
      const username = pathParts[2];
      const password = pathParts[3];
      const videoId = pathParts[4]?.split(".")[0];

      if (!username || !password || !videoId) {
        return new Response('Username, password, and video ID are required', { status: 400 });
      }

      const userDB = `https://firestore.googleapis.com/v1/projects/hwfilm23/databases/(default)/documents/reitvbr/users`;

      const res = await fetch(userDB, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        return new Response(null, { status: res.status });
      }

      const data = await res.json();
      const user = data.fields;

      if (!user[username]) {
        return new Response("User not found", { status: 404 });
      }

      const userInfo = user[username].mapValue.fields;
      const expireDate = new Date(userInfo.exp_date?.timestampValue).getTime();
      const status = expireDate < Date.now() ? 'Expired' : 'Active';

      const passwordValid = btoa(String(expireDate)).replace(/=+$/, '') === password;
      if (!passwordValid) {
        return new Response(`Invalid password`, { status: 403 });
      }

      const redirectUrl = `http://cdn22.cc:80/${isMovieRoute ? "movie" : "series"}/6705646555/60670/${videoId}.mp4`;
      return Response.redirect(redirectUrl, 302);
    }

    const userAgent = request.headers.get('User-Agent') || '';
    if (userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari')) {
      return new Response(null, { status: 403 });
    }

    return new Response("Not found", { status: 404 });
  }
};