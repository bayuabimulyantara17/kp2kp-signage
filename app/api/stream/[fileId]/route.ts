export const runtime = 'edge';

// Convert PEM private key string to CryptoKey for Web Crypto API
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

// Generate Google OAuth2 access token from service account credentials
async function getAccessToken(): Promise<string> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!email || !rawKey) {
    throw new Error('Missing Google service account credentials in environment variables');
  }

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
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    encoder.encode(signingInput)
  );

  const jwt = signingInput + '.' + toBase64Url(signature);

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + jwt,
  });

  const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
  if (!tokenData.access_token) {
    throw new Error('Failed to get access token: ' + JSON.stringify(tokenData));
  }
  return tokenData.access_token;
}

export async function GET(req: Request, { params }: { params: { fileId: string } }) {
  const { fileId } = params;

  if (!fileId) {
    return new Response('Missing fileId', { status: 400 });
  }

  try {
    const accessToken = await getAccessToken();

    // Forward range header for seek support
    const rangeHeader = new Headers(req.headers).get('range');
    const driveHeaders: Record<string, string> = {
      Authorization: 'Bearer ' + accessToken,
    };
    if (rangeHeader) {
      driveHeaders['Range'] = rangeHeader;
    }

    const driveRes = await fetch(
      'https://www.googleapis.com/drive/v3/files/' + fileId + '?alt=media',
      { headers: driveHeaders }
    );

    if (!driveRes.ok && driveRes.status !== 206) {
      return new Response('Failed to fetch from Google Drive: ' + driveRes.status, {
        status: driveRes.status,
      });
    }

    // Build response headers
    const resHeaders = new Headers();
    resHeaders.set('Content-Type', driveRes.headers.get('Content-Type') || 'video/mp4');
    resHeaders.set('Accept-Ranges', 'bytes');
    resHeaders.set('Cache-Control', 'public, max-age=3600');
    resHeaders.set('Access-Control-Allow-Origin', '*');

    const contentLength = driveRes.headers.get('Content-Length');
    if (contentLength) resHeaders.set('Content-Length', contentLength);

    const contentRange = driveRes.headers.get('Content-Range');
    if (contentRange) resHeaders.set('Content-Range', contentRange);

    return new Response(driveRes.body, {
      status: driveRes.status,
      headers: resHeaders,
    });
  } catch (err: any) {
    console.error('Stream error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
