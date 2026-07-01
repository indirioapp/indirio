import { NextRequest } from 'next/server';
import { queueService } from '@/services/queue';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return new Response(JSON.stringify({ error: 'jobId parametresi gereklidir.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const job = queueService.getJob(jobId);
    if (!job) {
      return new Response(JSON.stringify({ error: 'İndirme görevi bulunamadı.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const encoder = new TextEncoder();
    let isClosed = false;

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(job)}\n\n`));

        const unsubscribe = queueService.subscribe(jobId, (updatedJob) => {
          if (isClosed) return;

          try {
            const data = `data: ${JSON.stringify(updatedJob)}\n\n`;
            controller.enqueue(encoder.encode(data));

            if (updatedJob.status === 'completed' || updatedJob.status === 'failed') {
              isClosed = true;
              unsubscribe();
              controller.close();
            }
          } catch (e) {
            console.error('SSE Controller enqueue error:', e);
            isClosed = true;
            unsubscribe();
            try {
              controller.close();
            } catch {}
          }
        });

        req.signal.addEventListener('abort', () => {
          if (!isClosed) {
            isClosed = true;
            unsubscribe();
            try {
              controller.close();
            } catch {}
          }
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    console.error('SSE Streaming Route error:', err);
    return new Response(
      JSON.stringify({ error: 'SSE Stream bağlantısı kurulurken bir hata oluştu.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
