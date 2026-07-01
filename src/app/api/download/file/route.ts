import { NextRequest } from 'next/server';
import { queueService } from '@/services/queue';
import fs from 'fs';
import { Readable } from 'stream';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const filename = searchParams.get('filename') || 'video';
    const format = searchParams.get('format') || 'mp4';

    if (!id) {
      return new Response(JSON.stringify({ error: 'Gerekli parametre id bulunamadı.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const job = queueService.getJob(id);
    if (job) {
      queueService.markAsDownloaded(id);
    }
    const finalPath = job?.realDownloadUrl;

    if (!finalPath || !fs.existsSync(finalPath)) {
      return new Response(
        JSON.stringify({ error: 'Medya dosyası bulunamadı veya süresi geçmiş.' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const cleanFilename = filename.replace(/[^a-zA-Z0-9\s-_]/g, '').trim() || 'video';

    const fileExtension = format === 'mp3' ? 'mp3' : 'mp4';
    const finalFilename = `${cleanFilename}.${fileExtension}`;

    console.log(`Piping file download from disk: ${finalPath} as ${finalFilename}`);

    const stats = await fs.promises.stat(finalPath);
    const fileSize = stats.size;
    const contentType = format === 'mp3' ? 'audio/mpeg' : 'video/mp4';

    const range = req.headers.get('range');

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(finalPath, { start, end });
      const webStream = Readable.toWeb(fileStream);

      return new Response(webStream as unknown as ReadableStream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize.toString(),
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${encodeURIComponent(finalFilename)}"`,
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    } else {
      const fileStream = fs.createReadStream(finalPath);
      const webStream = Readable.toWeb(fileStream);

      return new Response(webStream as unknown as ReadableStream, {
        status: 200,
        headers: {
          'Accept-Ranges': 'bytes',
          'Content-Length': fileSize.toString(),
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${encodeURIComponent(finalFilename)}"`,
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }
  } catch (err) {
    const errorObj = err as Error;
    console.error('File serving route error:', errorObj);
    return new Response(
      JSON.stringify({ error: `Dosya sunulurken hata oluştu: ${errorObj.message}` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
