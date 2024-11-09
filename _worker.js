const users = {
  "reitv": { password: "teste123", name: "Reitv" },
  "username2": { password: "password2", name: "User Two" }
};

const BASE_SERVER_URL = "https://anikodi.xyz"; // URL do servidor com a lista M3U

async function handleRequest(request) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");

  // Verifica se a requisição é para a playlist M3U
  if (pathParts.length === 3 && pathParts[2] === "list.m3u8") {
    const username = pathParts[1];

    // Verifica se o usuário existe
    if (users[username]) {
      // Conteúdo da lista M3U personalizada para o usuário
      const m3uContent = `
#EXTM3U
#EXTINF:-1, Canal 1
http://hubby.bz/movie/Pdsrv-vods/kb6zityGEg/52486.mp4
#EXTINF:-1, Canal 2
http://hubby.bz/movie/Pdsrv-vods/kb6zityGEg/52486.mp4
#EXTINF:-1, Canal 3
http://hubby.bz/movie/Pdsrv-vods/kb6zityGEg/52486.mp4
`;
      return new Response(m3uContent, {
        headers: { "Content-Type": "application/vnd.apple.mpegurl" }
      });
    } else {
      return new Response("Usuário não encontrado", { status: 404 });
    }
  }

  // Endpoint de autenticação
  if (request.method === "POST" && url.pathname === "/login") {
    const { username, password } = await request.json();

    // Verifica as credenciais do usuário
    if (users[username] && users[username].password === password) {
      return new Response(JSON.stringify({
        user_info: {
          username: username,
          name: users[username].name,
          status: "Active"
        },
        server_info: {
          url: BASE_SERVER_URL,
          port: "80",
          https_port: "443",
          server_protocol: "http",
          rtmp_port: "1935"
        },
        playlist: `${BASE_SERVER_URL}/${username}/list.m3u8`,
        epg_url: `${BASE_SERVER_URL}/epg.xml`, // URL do EPG, se disponível
      }), { status: 200 });
    } else {
      return new Response(JSON.stringify({ error: "Usuário ou senha incorretos" }), { status: 403 });
    }
  }

  return new Response("Não encontrado", { status: 404 });
}

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});