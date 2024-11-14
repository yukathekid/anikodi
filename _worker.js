export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    
    // Verifica se é a rota API
    if (pathParts[1] === "api") {
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

      const userData = [];
      const data = await res.json();
      const user = data.fields;

      // Obtém o parâmetro de usuário da URL
      const searchParams = url.searchParams;
      const requestedUser = searchParams.get('user');

      if (requestedUser) {
        // Filtra os dados para retornar apenas o usuário solicitado
        if (user[requestedUser]) {
          const expireDate = new Date(user[requestedUser].mapValue.fields.exp_date?.timestampValue).getTime();
          const password = btoa(String(expireDate)).replace(/=+$/, '');
          const active = expireDate < Date.now() ? 'Expired' : 'Active';

          userData.push({
            username: requestedUser,
            password: password,
            status: active,
            exp_timestamp: expireDate,
            timestamp_now: Date.now()
          });
        } else {
          return new Response("User not found", { status: 404 });
        }
      } else {
        // Caso não tenha o parâmetro de usuário, retorna todos os usuários
        for (const users in user) {
          const expireDate = new Date(user[users].mapValue.fields.exp_date?.timestampValue).getTime();
          const password = btoa(String(expireDate)).replace(/=+$/, '');
          const active = expireDate < Date.now() ? 'Expired' : 'Active';
          
          userData.push({
            username: users,
            password: password,
            status: active,
            exp_timestamp: expireDate,
            timestamp_now: Date.now()
          });
        }
      }
      
      // Retorna os dados em formato JSON
      return new Response(JSON.stringify(userData, null, 2), {
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