/**
 * /api/waitlist — captura email da landing.
 *
 * POST { email: string } → 200 { ok: true }
 *
 * Backend: forward para Resend (audience) ou KV namespace simples se Resend
 * não configurado. Se RESEND_API_KEY + RESEND_AUDIENCE_ID setados, usa Resend.
 */
export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const email = (body?.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'invalid_email' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Resend audience (preferred)
  if (env.RESEND_API_KEY && env.RESEND_AUDIENCE_ID) {
    try {
      const res = await fetch(
        `https://api.resend.com/audiences/${env.RESEND_AUDIENCE_ID}/contacts`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${env.RESEND_API_KEY}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ email }),
        },
      );
      if (!res.ok) {
        const txt = await res.text();
        console.error('resend audience error', res.status, txt);
      }
    } catch (e) {
      console.error('resend fetch error', e);
    }
  }

  // KV fallback (also store as backup in case Resend fails)
  if (env.WAITLIST_KV) {
    try {
      await env.WAITLIST_KV.put(`email:${email}`, new Date().toISOString());
    } catch (e) {
      console.error('kv put error', e);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
