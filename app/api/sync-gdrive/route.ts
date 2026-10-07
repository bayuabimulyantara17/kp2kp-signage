import { NextRequest, NextResponse } from 'next/server';
import { googleDriveService } from '@/lib/gdrive';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const driveFiles = await googleDriveService.listVideosInFolder();
    const syncedVideos = [];

    for (let i = 0; i < driveFiles.length; i++) {
      const file = driveFiles[i];
      const video = await db.upsertVideo({
        name: file.name,
        google_drive_file_id: file.id,
        mime_type: file.mimeType,
        size: file.size,
        status: 'ACTIVE',
        sort_order: i + 1
      });
      syncedVideos.push(video);
    }

    // Auto-populate active playlist p-001 with synced video IDs
    if (syncedVideos.length > 0) {
      await db.updatePlaylistOrder('p-001', syncedVideos.map(v => v.id));
    }

    return NextResponse.json({
      success: true,
      synced_count: syncedVideos.length,
      synced_videos: syncedVideos,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Sync Google Drive failed:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
