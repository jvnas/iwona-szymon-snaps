interface Env {
  MY_BUCKET: R2Bucket;
  MY_DATABASE: D1Database;
}

interface Photo {
  id: string;
  url: string;
  created_at: number;
  type: 'image' | 'video';
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const url = new URL(request.url);

  // Ustawienie nagłówków CORS dla obsługi zapytań z różnych źródeł
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Obsługa zapytań OPTIONS (preflight)
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  // Handle GET request for photos
  if (request.method === 'GET') {
    try {
      // Sprawdzenie, czy tabela photos istnieje
      try {
        const { results } = await env.MY_DATABASE.prepare('SELECT * FROM photos ORDER BY created_at DESC').all<Photo>();
        return new Response(JSON.stringify(results), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        // Jeśli tabela nie istnieje, utworzenie jej
        await env.MY_DATABASE.exec(`
          CREATE TABLE IF NOT EXISTS photos (
            id TEXT PRIMARY KEY,
            url TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            type TEXT NOT NULL
          );
        `);
        
        return new Response(JSON.stringify([]), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (error) {
      console.error('Error fetching photos:', error);
      return new Response(JSON.stringify({ error: 'Error fetching photos' }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // Handle POST request for photo upload
  if (request.method === 'POST') {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return new Response(JSON.stringify({ error: 'No file uploaded' }), { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Sprawdzenie rozmiaru pliku (limit 100MB)
      const MAX_SIZE = 100 * 1024 * 1024; // 100MB
      if (file.size > MAX_SIZE) {
        return new Response(JSON.stringify({ 
          error: 'File too large. Maximum size is 100MB.' 
        }), { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const fileId = crypto.randomUUID();
      const fileExtension = file.name.split('.').pop() || '';
      const objectKey = `${fileId}.${fileExtension}`;
      const contentType = file.type;
      const timestamp = Date.now();

      // Upload to R2
      await env.MY_BUCKET.put(objectKey, file.stream(), {
        httpMetadata: { 
          contentType,
          cacheControl: 'public, max-age=31536000', // Cache for 1 year
        },
      });

      // Tworzenie publicznego URL dla pliku
      // Uwaga: Upewnij się, że bucket R2 jest skonfigurowany jako publiczny
      // lub użyj Custom Domain z Cloudflare
      const publicUrl = `https://pub-7e2fa433665848febdcd4a46ecf533c1.r2.dev/${objectKey}`;

      // Sprawdzenie, czy tabela photos istnieje
      try {
        // Save metadata to D1
        await env.MY_DATABASE.prepare(
          'INSERT INTO photos (id, url, created_at, type) VALUES (?, ?, ?, ?)'
        ).bind(fileId, publicUrl, timestamp, contentType.startsWith('video/') ? 'video' : 'image').run();
      } catch (error) {
        // Jeśli tabela nie istnieje, utworzenie jej
        await env.MY_DATABASE.exec(`
          CREATE TABLE IF NOT EXISTS photos (
            id TEXT PRIMARY KEY,
            url TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            type TEXT NOT NULL
          );
        `);
        
        // Ponowna próba zapisu
        await env.MY_DATABASE.prepare(
          'INSERT INTO photos (id, url, created_at, type) VALUES (?, ?, ?, ?)'
        ).bind(fileId, publicUrl, timestamp, contentType.startsWith('video/') ? 'video' : 'image').run();
      }

      return new Response(JSON.stringify({ 
        id: fileId, 
        url: publicUrl,
        created_at: timestamp,
        type: contentType.startsWith('video/') ? 'video' : 'image'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      return new Response(JSON.stringify({ error: 'Error uploading photo' }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};
