export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/acess') {
      const username = url.searchParams.get('username');
      const password = url.searchParams.get('password');
      const expireParam = parseInt(url.searchParams.get('expire'), 10);

      if (!username || !password || !expireParam && isNaN(expireParam)) {
        return new Response('Bad Request', { status: 400 });
      }
      
      const response = await checkCredentials(username, password);

      // Se a autenticação falhar, retornamos a mensagem correspondente
      if (!response.isAuthenticated) {
        return new Response(response.message, { status: response.status });
      }
      
      // Verifica se o parâmetro `expire` da URL é menor ou igual ao `expireTimestamp` do Firestore
      // Verifica se o expireParam é igual ao expiryDate e se não está no passado
const isSessionExpired = expireParam === response.expiryDate && expireParam < new Date().getTime();

if (!isSessionExpired) {
  return new Response('Sua sessão expirou. Por favor, renove o acesso.', { status: 403 });
}

      // Verifica o User-Agent após a autenticação bem-sucedida
      /*const userAgent = request.headers.get('User-Agent');
      const isKodi = userAgent && /Kodi\/\d+\.\d+/i.test(userAgent);
      const isSpecificUserAgent = userAgent === 'Mozilla/5.0 (Linux; Android 13; M2103K19G Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.6478.134 Mobile Safari/537.36';

      // Se o User-Agent não for do Kodi ou do User-Agent específico, negar acesso
      if (!isKodi && !isSpecificUserAgent) {
        return new Response('Access to this resource is restricted.', {
          status: 403,
          headers: {
            'Content-Type': 'text/plain'
          }
        });
      }*/

      // Se a autenticação for bem-sucedida e o User-Agent for válido, redireciona para a URL da lista M3U
      return fetch('https://vectorplayer.com/default.m3u');
    }

    return env.ASSETS.fetch(request);
  }
}

async function checkCredentials(username, password) {
  const firestoreProjectId = 'hwfilm23';
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firestoreProjectId}/databases/(default)/documents/users/${username}`;

  const response = await fetch(firestoreUrl);
  const data = await response.json();

  // Verifica se o documento foi encontrado
  if (!data || !data.fields) {
    return { isAuthenticated: false, status: 401, message: 'Credenciais inválidas.' };
  }

  const storedUsername = data.fields.username.stringValue;
  const storedPassword = data.fields.password.stringValue;
  const expiryDateTimestamp = data.fields.expiryDate?.timestampValue;

  if (!storedUsername || !storedPassword || !expiryDateTimestamp) {
    return { isAuthenticated: false, status: 401, message: 'Credenciais inválidas.' };
  }

  // Verificar se a senha está correta
  const isPasswordCorrect = storedUsername === username && storedPassword === password;

  // Converter o timestamp do Firestore para um objeto Date
  const expiryDate = new Date(expiryDateTimestamp).getTime();
  
  // Verificar se a data de expiração é válida
  const isExpired = expiryDate < new Date().getTime();

  // Se a senha estiver correta, mas a sessão estiver expirada
  if (isPasswordCorrect && isExpired) {
    return { isAuthenticated: false, status: 401, message: 'Sua sessão expirou. Por favor, renove o acesso.' };
  }

  // Se a senha estiver correta e não estiver expirada
  if (isPasswordCorrect) {
    return { isAuthenticated: true }; // Autenticação bem-sucedida
  }

  // Se a senha estiver incorreta
  return { isAuthenticated: false, status: 401, message: 'Credenciais inválidas.' };
      }
