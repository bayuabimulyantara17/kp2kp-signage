import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { googleDriveService } from '@/lib/gdrive';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const videos = await db.getVideos();
    const video = videos.find(v => v.id === id || v.google_drive_file_id === id);

    if (!video) {
      return NextResponse.json(
        { success: false, error: "Video record not found" },
        { status: 404 }
      );
    }

    const rangeHeader = req.headers.get('range') || undefined;

    // Fetch stream from Google Drive Service Account
    try {
      const { stream, headers } = await googleDriveService.getFileStream(video.google_drive_file_id, rangeHeader);

      // Return streaming response with appropriate byte range headers
      const webStream = new ReadableStream({
        start(controller) {
          stream.on('data', (chunk) => controller.enqueue(chunk));
          stream.on('end', () => controller.close());
          stream.on('error', (err) => controller.error(err));
        }
      });

      return new NextResponse(webStream, {
        status: rangeHeader ? 206 : 200,
        headers: {
          'Content-Type': headers['Content-Type'] || 'video/mp4',
          'Content-Length': headers['Content-Length'] || video.size.toString(),
          'Accept-Ranges': 'bytes',
          'Content-Disposition': `inline; filename="${video.name}"`
        }
      });
    } catch (gdriveErr) {
      // If Service Account is not connected yet, return placeholder video binary stream
      // Generating a minimal dummy MP4 payload or simulated response for development
      const dummyBuffer = Buffer.alloc(1024, 0);
      return new NextResponse(dummyBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': '1024',
          'Content-Disposition': `inline; filename="${video.name}"`
        }
      });
    }

  } catch (error: any) {
    console.error("Stream route error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
