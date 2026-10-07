export const runtime = 'edge';

async function pemToKey(pem: string): Promise<CryptoKey> {
  const pemClean = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const binaryStr = atob(pemClean);
  const buffer = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    buffer[i] = binaryStr.charCodeAt(i);
  }
  return crypto.subtle.importKey(
    'pkcs8',
    buffer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function objToBase64Url(obj: object): string {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function getAccessToken(): Promise<string> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !rawKey) throw new Error('Missing credentials');

  const privateKey = rawKey.replace(/\\n/g, '\n');
  const now = Math.floor(Date.now() / 1000);

  const header = objToBase64Url({ alg: 'RS256', typ: 'JWT' });
  const claims = objToBase64Url({
    iss: email,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  });

  const signingInput = header + '.' + claims;
  const key = await pemToKey(privateKey);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signingInput));
  const jwt = signingInput + '.' + toBase64Url(sig);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + jwt,
  });

  const data = await res.json() as { access_token?: string; error?: string };
  if (!data.access_token) throw new Error('Token error: ' + JSON.stringify(data));
  return data.access_token;
}

export async function GET(req: Request, { params }: { params: { fileId: string } }) {
  const { fileId } = params;
  if (!fileId) return new Response('Missing fileId', { status: 400 });

  try {
    const accessToken = await getAccessToken();

    // Fetch from Google Drive — no range forwarding, full file stream
    const driveRes = await fetch(
      'https://www.googleapis.com/drive/v3/files/' + fileId + '?alt=media',
      {
        headers: { Authorization: 'Bearer ' + accessToken },
      }
    );

    if (!driveRes.ok) {
      const errText = await driveRes.text();
      return new Response(JSON.stringify({
        error: 'Google Drive error',
        status: driveRes.status,
        detail: errText.slice(0, 300)
      }), {
        status: driveRes.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const contentType = driveRes.headers.get('Content-Type') || 'video/mp4';
    const contentLength = driveRes.headers.get('Content-Length');

    const resHeaders = new Headers();
    resHeaders.set('Content-Type', contentType);
    resHeaders.set('Cache-Control', 'public, max-age=604800');
    resHeaders.set('Access-Control-Allow-Origin', '*');
    if (contentLength) resHeaders.set('Content-Length', contentLength);

    // Use TransformStream to pipe Google Drive stream to browser
    const { readable, writable } = new TransformStream();
    driveRes.body!.pipeTo(writable).catch(() => {});

    return new Response(readable, {
      status: 200,
      headers: resHeaders,
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
