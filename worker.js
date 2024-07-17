addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const path = url.pathname.replace('/api/v1/', '')

  // Construa o URL da imagem no GitHub
  const imageUrl = `https://raw.githubusercontent.com/yukathekid/anikodi/main/api/v1/${path}.png`

  // Fetch e retorna a imagem do GitHub
  const response = await fetch(imageUrl)
  const headers = new Headers(response.headers)
  headers.set('Content-Type', 'image/png')

  return new Response(response.body, {
    status: response.status,
    headers: headers
  })
}
