/// <reference types="@cloudflare/workers-types" />

declare const MY_BUCKET: R2Bucket;
declare const MY_DATABASE: D1Database;

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

export const onRequest: ExportedHandlerFetchHandler<Env> = async (context) => {
  const { request } = context;
  const url = new URL(request.url);
  const env = {
    MY_BUCKET,
    MY_DATABASE
  };

  // Ustawienie nagłówków CORS dla obsługi zapytań z różnych źródeł
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400', // Cache preflight request for 24 hours
  };

  // Obsługa zapytań OPTIONS (preflight)
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  // Add CORS headers to all responses
  const addCorsHeaders = (response: Response) => {
    const newHeaders = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      newHeaders.set(key, value);
    });
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  };

  // Handle GET request for photos
  if (request.method === 'GET') {
    try {
      // Sprawdzenie, czy tabela photos istnieje
      try {
        const { results } = await env.MY_DATABASE.prepare('SELECT * FROM photos ORDER BY created_at DESC').all<Photo>();
        return addCorsHeaders(new Response(JSON.stringify(results), {
          headers: { 'Content-Type': 'application/json' },
        }));
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
        
        // Zwróć pustą tablicę, ponieważ nie ma jeszcze żadnych zdjęć
        return addCorsHeaders(new Response(JSON.stringify([]), {
          headers: { 'Content-Type': 'application/json' },
        }));
      }
    } catch (error) {
      console.error('Error fetching photos:', error);
      return addCorsHeaders(new Response(JSON.stringify({ 
        error: 'Error fetching photos',
        details: error instanceof Error ? error.message : String(error)
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }));
    }
  }

  // Handle POST request for uploading photos
  if (request.method === 'POST') {
    try {
      // Check if the request has a content type of multipart/form-data
      const contentType = request.headers.get('content-type') || '';
      if (!contentType.includes('multipart/form-data')) {
        return addCorsHeaders(new Response(JSON.stringify({ error: 'Content-Type must be multipart/form-data' }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }));
      }

      const formData = await request.formData();
      const file = formData.get('file') as unknown as File;
      
      if (!file) {
        return addCorsHeaders(new Response(JSON.stringify({ error: 'No file provided' }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }));
      }

      console.log(`Received file: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);

      // Generate a unique filename
      const fileExt = file.name.split('.').pop() || '';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      
      // Convert file to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Upload to R2
      const publicUrl = `https://pub-7e2fa433665848febdcd4a46ecf533c1.r2.dev/${fileName}`;

      // Najpierw spróbujmy utworzyć tabelę, jeśli nie istnieje
      try {
        await env.MY_DATABASE.exec(`
          CREATE TABLE IF NOT EXISTS photos (
            id TEXT PRIMARY KEY,
            url TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            type TEXT NOT NULL
          );
        `);
        
        console.log('Photos table created or already exists');
      } catch (error) {
        console.error('Error creating photos table:', error);
        return addCorsHeaders(new Response(JSON.stringify({ error: 'Database error' }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }));
      }

      // Save metadata to D1
      const fileId = crypto.randomUUID();
      const timestamp = Date.now();
      const fileType = file.type.startsWith('video/') ? 'video' : 'image';
      
      try {
        const { success } = await env.MY_DATABASE.prepare(
          'INSERT INTO photos (id, url, created_at, type) VALUES (?, ?, ?, ?)'
        ).bind(
          fileId,
          publicUrl,
          timestamp,
          fileType
        ).run();

        if (!success) {
          throw new Error('Failed to save to database');
        }
        
        console.log(`Photo metadata saved to database: ${publicUrl}`);
        
        return addCorsHeaders(new Response(JSON.stringify({
          id: fileId,
          url: publicUrl,
          created_at: timestamp,
          type: fileType
        }), { 
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }));
        
      } catch (dbError) {
        console.error('Database error:', dbError);
        return addCorsHeaders(new Response(JSON.stringify({ 
          error: 'Failed to save file metadata to database',
          details: dbError instanceof Error ? dbError.message : String(dbError)
        }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }));
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      return addCorsHeaders(new Response(JSON.stringify({ 
        error: 'Error uploading photo',
        details: error instanceof Error ? error.message : String(error)
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }));
    }
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};
