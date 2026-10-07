import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const playlistId = req.nextUrl.searchParams.get('id') || 'p-001';

  try {
    const playlists = await db.getPlaylists();
    const playlist = playlists.find(p => p.id === playlistId) || playlists[0];
    const items = await db.getPlaylistItems(playlist?.id || playlistId);

    return NextResponse.json({
      success: true,
      playlist,
      items
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { playlist_id, video_ids } = body;

    if (!playlist_id || !Array.isArray(video_ids)) {
      return NextResponse.json(
        { success: false, error: "Invalid payload: playlist_id and video_ids array required" },
        { status: 400 }
      );
    }

    await db.updatePlaylistOrder(playlist_id, video_ids);

    return NextResponse.json({
      success: true,
      message: "Playlist order updated successfully",
      updated_at: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
