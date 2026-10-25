export const json = (data: unknown, status = 200, extraHeaders?: Record<string, string>) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extraHeaders },
  });

export const notFound = () => json({ error: 'not_found' }, 404);