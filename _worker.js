export default {
  async fetch(request) {
    const firestoreUrl = 'https://firestore.googleapis.com/v1/projects/hwfilm23/databases/(default)/documents/users/daniel';

    const response = await fetch(firestoreUrl);

    if (!response.ok) {
      return new Response('Firestore not accessible', { status: 500 });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), { status: 200 });
  }
}
