export default {
  async fetch(request, env, ctx) {
   const url = new URL(request.url);
   const pathParts = url.pathname.split('/');
   
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
