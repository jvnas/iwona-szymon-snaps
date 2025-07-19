/// <reference types="@cloudflare/workers-types" />

interface Env {
  MY_BUCKET: R2Bucket;
  MY_DATABASE: D1Database;
  PUBLIC_R2_URL: string;
  ASSETS: Fetcher;
}

interface Photo {
  id: string;
  url: string;
  created_at: number;
  type: 'image' | 'video';
}

const apiRouter = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const log = (...args: any[]) => console.log('[API]', ...args);

    const addCorsHeaders = (response: Response): Response => {
      const headers = new Headers(response.headers);
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Content-Type');
      return new Response(response.body, { ...response, headers });
    };

    if (request.method === 'OPTIONS') {
      return addCorsHeaders(new Response(null, { status: 204 }));
    }

    if (request.method === 'GET' && url.pathname === '/api/photos') {
      try {
        const { results } = await env.MY_DATABASE.prepare('SELECT * FROM photos ORDER BY created_at DESC').all<Photo>();
        return addCorsHeaders(new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } }));
      } catch (e) {
        log('DB Error:', e);
        return addCorsHeaders(new Response(JSON.stringify({ error: 'Database error' }), { status: 500 }));
      }
    }

    if (request.method === 'POST' && url.pathname === '/api/photos') {
      try {
        if (!request.headers.get('content-type')?.includes('multipart/form-data')) {
          return addCorsHeaders(new Response(JSON.stringify({ error: 'Invalid content type' }), { status: 400 }));
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
          return addCorsHeaders(new Response(JSON.stringify({ error: 'No file provided' }), { status: 400 }));
        }

        const fileId = crypto.randomUUID();
        const objectKey = `${fileId}.${file.name.split('.').pop() || 'bin'}`;
        const publicUrl = `${env.PUBLIC_R2_URL.replace(/\/$/, '')}/${objectKey}`;

        await env.MY_BUCKET.put(objectKey, await file.arrayBuffer(), {
          httpMetadata: { contentType: file.type },
        });

        const timestamp = Date.now();
        const fileType = file.type.startsWith('video/') ? 'video' : 'image';

        await env.MY_DATABASE.prepare(
          'INSERT INTO photos (id, url, created_at, type) VALUES (?, ?, ?, ?)'
        ).bind(fileId, publicUrl, timestamp, fileType).run();

        const responseData = { id: fileId, url: publicUrl, created_at: timestamp, type: fileType };
        return addCorsHeaders(new Response(JSON.stringify(responseData), { status: 201 }));

      } catch (e) {
        log('Upload Error:', e);
        return addCorsHeaders(new Response(JSON.stringify({ error: 'Upload failed' }), { status: 500 }));
      }
    }

    if (request.method === 'DELETE' && url.pathname.startsWith('/api/photos/')) {
      try {
        const photoId = url.pathname.split('/').pop();
        if (!photoId) {
          return addCorsHeaders(new Response(JSON.stringify({ error: 'Photo ID missing' }), { status: 400 }));
        }

        // Get photo details from D1 to find the R2 object key
        const { results } = await env.MY_DATABASE.prepare('SELECT url FROM photos WHERE id = ?').bind(photoId).all<{ url: string }>();
        if (!results || results.length === 0) {
          return addCorsHeaders(new Response(JSON.stringify({ error: 'Photo not found' }), { status: 404 }));
        }

        const photoUrl = results[0].url;
        const objectKey = photoUrl.substring(photoUrl.lastIndexOf('/') + 1);

        // Delete from R2
        await env.MY_BUCKET.delete(objectKey);

        // Delete from D1
        await env.MY_DATABASE.prepare('DELETE FROM photos WHERE id = ?').bind(photoId).run();

        return addCorsHeaders(new Response(JSON.stringify({ message: 'Photo deleted successfully' }), { status: 200 }));

      } catch (e) {
        log('Delete Error:', e);
        return addCorsHeaders(new Response(JSON.stringify({ error: 'Delete failed' }), { status: 500 }));
      }
    }

    return addCorsHeaders(new Response(JSON.stringify({ error: 'API route not found' }), { status: 404 }));
  }
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      return apiRouter.fetch(request, env, ctx);
    }
    return env.ASSETS.fetch(request);
  }
};
