export async function tgApi(token, method, payload = {}) {
  if (!token) throw new Error('BOT_TOKEN не заполнен');
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!data?.ok) {
    const description = data?.description || `HTTP ${response.status}`;
    throw new Error(`${method}: ${description}`);
  }
  return data.result;
}
