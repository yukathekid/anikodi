export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    
    // Verifica se é a rota API
    if (pathParts[1] === "player_api.php") {
      // Obtém os parâmetros da URL
      const searchParams = url.searchParams;
      const username = searchParams.get('username');
      const password = searchParams.get('password');
      
      if (!username || !password) {
        return new Response('Username and password are required', { status: 400 });
      }
      
      // URL do banco de dados Firestore
      const userDB = `https://firestore.googleapis.com/v1/projects/hwfilm23/databases/(default)/documents/reitvbr/users`;

      // Obtém os dados do Firestore
      const res = await fetch(userDB, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        return new Response(null, { status: res.status });
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

      // Estrutura do JSON para resposta
      const responseData = {
        user_info: {
          username: username,
          password: password,
          message: userInfo.message ? userInfo.message.stringValue : null,
          auth: 1, // O valor para autenticação pode ser definido conforme necessário
          status: status,
          exp_date: userInfo.exp_date ? Math.floor(new Date(userInfo.exp_date.timestampValue).getTime() / 1000): null,
          is_trial: userInfo.is_trial ? userInfo.is_trial.stringValue : "0",
          active_cons: userInfo.active_cons ? userInfo.active_cons.stringValue : "0",
          created_at: userInfo.created_at ? new Date(userInfo.created_at.timestampValue).getTime() : null,
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
          timestamp_now: Date.now() / 1000, // Timestamp atual em segundos
          time_now: new Date().toISOString().slice(0, 19).replace('T', ' '), // Data atual formatada
          timezone: "UTC"
        }
      };
      
      // Retorna os dados em formato JSON
      return new Response(JSON.stringify(responseData, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Bloqueia User-Agents de navegadores comuns
    const userAgent = request.headers.get('User-Agent') || '';
    if (userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari')) {
      return new Response(null, { status: 403 });
    }
  }
};