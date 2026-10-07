import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { deviceId: string } }
) {
  const { deviceId } = params;
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  const baseUrl = `${proto}://${host}`;

  try {
    const player = await db.getPlayerByDeviceId(deviceId);
    const playlistId = player?.playlist_id || 'p-001';

    const items = await db.getPlaylistItems(playlistId);
    const playlists = await db.getPlaylists();
    const currentPlaylist = playlists.find(p => p.id === playlistId);

    const formattedItems = items
      .filter(item => item.video && item.video.status === 'ACTIVE')
      .map(item => {
        const v = item.video!;
        return {
          id: v.id,
          name: v.name,
          google_drive_file_id: v.google_drive_file_id,
          mime_type: v.mime_type,
          size: v.size,
          sort_order: item.sort_order,
          download_url: `${baseUrl}/api/videos/${v.id}/stream`
        };
      });

    // Version generated from last updated timestamp
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
