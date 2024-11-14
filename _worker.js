export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');

    // Verifica se é a rota de autenticação
    if (pathParts[1] === "player_api.php") {
      const searchParams = url.searchParams;
      const username = searchParams.get('username');
      const password = searchParams.get('password');
      const action = searchParams.get('action');
      const vod_id = searchParams.get('vod_id');

      // Verifica se username e password estão presentes
      if (!username || !password) {
        return new Response('Username and password are required', { status: 400 });
      }

      // URL do banco de dados Firestore
      const userDB = `https://firestore.googleapis.com/v1/projects/hwfilm23/databases/(default)/documents/reitvbr/users`;

      // Obtém os dados do Firestore
      const res = await fetch(userDB, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        return new Response('Error fetching user data', { status: res.status });
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
        return new Response("Invalid password", { status: 403 });
      }

      // Se o parâmetro 'action' for 'get_vod_info', retorna as informações do vídeo
      if (action === "get_vod_info" && vod_id) {
        // Obtém informações do vídeo (pode ser de um banco de dados ou lista)
        const videoInfo = await getVideoInfo(vod_id);
        return new Response(JSON.stringify(videoInfo), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Retorna as informações do usuário
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

      return new Response(JSON.stringify(responseData), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response("Not Found", { status: 404 });
  }
};

// Função para obter informações do vídeo (simulada aqui)
async function getVideoInfo(vod_id) {
  // Aqui você deve acessar o banco de dados ou um arquivo de vídeos e retornar as informações do vídeo
  // Exemplo de retorno de vídeo
  return {
    title: "Deadpool & Wolverine 4K",
    duration: "02:08:00",
    stream_url: `https://cdn.example.com/video/${vod_id}.mp4`
  };
}