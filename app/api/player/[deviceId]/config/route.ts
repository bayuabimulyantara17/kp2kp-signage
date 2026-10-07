import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { deviceId: string } }
) {
  const { deviceId } = params;

  try {
    let player = await db.getPlayerByDeviceId(deviceId);
    if (!player) {
      // Auto-register new player device on first contact
      player = {
        id: `player-${Date.now()}`,
        name: `TV Box ${deviceId}`,
        device_id: deviceId,
        playlist_id: "p-001",
        status: "ONLINE",
        last_seen: new Date().toISOString(),
        current_video: null,
        app_version: "1.0.0",
        storage_available_mb: 0,
        total_storage_mb: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await db.updateHeartbeat({
        device_id: deviceId,
        status: "ONLINE"
      });
    }

    return NextResponse.json({
      success: true,
      device_id: player.device_id,
      name: player.name,
      playlist_id: player.playlist_id,
      sync_interval_seconds: 60,
      heartbeat_interval_seconds: 30,
      server_time: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
