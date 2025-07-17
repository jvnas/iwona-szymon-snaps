interface Env {
  MY_BUCKET: R2Bucket;
  MY_DATABASE: D1Database;
}

interface Photo {
  id: string;
  url: string;
  timestamp: number;
  type: 'image' | 'video';
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const url = new URL(request.url);

  // Handle GET request for photos
  if (request.method === 'GET') {
    try {
      const { results } = await env.MY_DATABASE.prepare('SELECT * FROM photos ORDER BY timestamp DESC').all<Photo>();
      return new Response(JSON.stringify(results), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error fetching photos:', error);
      return new Response('Error fetching photos', { status: 500 });
    }
  }

  // Handle POST request for photo upload
  if (request.method === 'POST') {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return new Response('No file uploaded', { status: 400 });
      }

      const fileId = crypto.randomUUID();
      const fileExtension = file.name.split('.').pop();
      const objectKey = `${fileId}.${fileExtension}`;
      const contentType = file.type;

      // Upload to R2
      await env.MY_BUCKET.put(objectKey, file.stream(), {
        httpMetadata: { contentType },
      });

      // Get public URL (assuming public access or custom domain setup for R2)
      // For public access, you might need to configure R2 bucket policy.
      // For custom domain, replace with your custom domain URL.
      const publicUrl = `https://pub-7e2fa433665848febdcd4a46ecf533c1.r2.dev/${objectKey}`;

      // Save metadata to D1
      await env.MY_DATABASE.prepare(
        'INSERT INTO photos (id, url, timestamp, type) VALUES (?, ?, ?, ?)'
      ).bind(fileId, publicUrl, Date.now(), contentType.startsWith('video/') ? 'video' : 'image').run();

      return new Response(JSON.stringify({ id: fileId, url: publicUrl }), {
        headers: { 'Content-Type': 'application/json' },
        status: 201,
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      return new Response('Error uploading photo', { status: 500 });
    }
  }

  return new Response('Method Not Allowed', { status: 405 });
};
