const users = {
  "daniel": {
    "password": "teste123",
    "expiryDate": "2024-10-30T16:15:00.293Z"
  },
  "outro_usuario": {
    "password": "senha456",
    "expiryDate": "2024-12-31T16:15:00.293Z"
  }
};

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/acess') {
      const username = url.searchParams.get('username');
      const password = url.searchParams.get('password');

      if (!username || !password) {
        return new Response('Bad Request', { status: 400 });
      }

      const isAuthenticated = checkCredentials(username, password);

      if (!isAuthenticated) {
        return new Response('Unauthorized', { status: 401 });
      }

      // Substitua a URL abaixo pela URL real da lista M3U
      return fetch('https://cloud.anikodi.xyz/data/live/testan.m3u8');
    }

    return new Response('Not Found', { status: 404 });
  }
}

function checkCredentials(username, password) {
  const user = users[username];

  if (!user) {
    return false; // Usuário não encontrado
  }

  // Verificar se a senha está correta
  const isPasswordCorrect = user.password === password;

  // Verificar se a data de expiração é válida
  const expiryDate = new Date(user.expiryDate);
  const isExpired = expiryDate < new Date();

  return isPasswordCorrect && !isExpired;
}
