import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { googleDriveService } from '@/lib/gdrive';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let videos = await db.getVideos();

    // Auto-fetch from Google Drive if empty (first-time deployment on Vercel)
    if (videos.length === 0) {
      try {
        const driveFiles = await googleDriveService.listVideosInFolder();
        for (let i = 0; i < driveFiles.length; i++) {
          const file = driveFiles[i];
          await db.upsertVideo({
            name: file.name,
            google_drive_file_id: file.id,
            mime_type: file.mimeType,
            size: file.size,
            status: 'ACTIVE',
            sort_order: i + 1
          });
        }
        videos = await db.getVideos();
        if (videos.length > 0) {
          await db.updatePlaylistOrder('p-001', videos.map(v => v.id));
        }
      } catch (gErr) {
        console.warn("Auto-sync from Google Drive failed:", gErr);
      }
    }

    return NextResponse.json({
      success: true,
      total: videos.length,
      videos
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
