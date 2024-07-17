addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  let imageUrl = url.pathname

  // Transforma https://anikodi.pages.dev/api/v1/image_id em
  // https://raw.githubusercontent.com/seu-usuario/seu-repositorio/main/pasta-imagem/imagem-id
  imageUrl = `https://raw.githubusercontent.com/yukathekid/anikodi/main/${imageUrl.replace('/api/v1/', '')}`

  // Fetch e retorna a imagem
  const imageResponse = await fetch(imageUrl)
  const headers = new Headers(imageResponse.headers)
  headers.set('Content-Type', imageResponse.headers.get('Content-Type'))

  return new Response(imageResponse.body, {
    status: imageResponse.status,
    headers: headers
  })
}
