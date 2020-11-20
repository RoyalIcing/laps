addEventListener("scheduled", event => {
  event.waitUntil(handleScheduled(event))
})

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

/**
 * Run psi
 * @param {ScheduledEvent} request
 */
async function handleScheduled(event) {
  const rootURL = new URL("https://x2qwtp8clc.execute-api.us-west-2.amazonaws.com")
  const url = new URL("/staging/", rootURL);
  const response = await fetch(url);
  const data = await response.json();
  
  const date = new Date(event.scheduledTime);
  
  const id = `icing.space ${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()} ${event.scheduledTime}`;
  await PSI.put(id, JSON.stringify(data));
}


/**
 * Respond with results
 * @param {Request} request
 */
async function handleRequest(request) {
  const { keys } = await PSI.list();
  
  const jsonEncoded = JSON.stringify({ version: '0.1', keys });
  return new Response(jsonEncoded, {
    headers: { 'content-type': 'application/json' },
  });
}
