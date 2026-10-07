import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { googleDriveService } from '@/lib/gdrive';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { deviceId: string } }
) {
  const { deviceId } = params;

  try {
    const player = await db.getPlayerByDeviceId(deviceId);
    const playlistId = player?.playlist_id || 'p-001';

    let items = await db.getPlaylistItems(playlistId);

    // Auto-sync from Google Drive if empty (first time on Vercel)
    if (items.length === 0) {
      try {
        const driveFiles = await googleDriveService.listVideosInFolder();
        const synced = [];
        for (let i = 0; i < driveFiles.length; i++) {
          const file = driveFiles[i];
          const v = await db.upsertVideo({
            name: file.name,
            google_drive_file_id: file.id,
            mime_type: file.mimeType,
            size: file.size,
            status: 'ACTIVE',
            sort_order: i + 1
          });
          synced.push(v);
        }
        if (synced.length > 0) {
          await db.updatePlaylistOrder(playlistId, synced.map(v => v.id));
          items = await db.getPlaylistItems(playlistId);
        }
      } catch (gErr) {
        console.warn("Auto-sync from Google Drive failed:", gErr);
      }
    }

    const playlists = await db.getPlaylists();
    const currentPlaylist = playlists.find(p => p.id === playlistId);

    const formattedItems = items
      .filter(item => item.video && item.video.status === 'ACTIVE')
      .map(item => {
        const v = item.video!;
        const driveUrl = 'https://drive.google.com/uc?export=download&id=' + v.google_drive_file_id + '&confirm=t';
        return {
          id: v.id,
          name: v.name,
          google_drive_file_id: v.google_drive_file_id,
          mime_type: v.mime_type,
          size: v.size,
          sort_order: item.sort_order,
          download_url: driveUrl
        };
      });

    const version = currentPlaylist
      ? new Date(currentPlaylist.updated_at).getTime()
      : Date.now();

    return NextResponse.json({
      success: true,
      device_id: deviceId,
      playlist_id: playlistId,
      playlist_name: currentPlaylist?.name || "Default Playlist",
      version: version,
      items: formattedItems
    });
  } catch (error: any) {
    console.error("Error serving player playlist:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
