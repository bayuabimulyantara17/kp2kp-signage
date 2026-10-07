import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: { deviceId: string } }
) {
  const { deviceId } = params;

  try {
    const body = await req.json();
    const { status, current_video, app_version, storage_available_mb, total_storage_mb } = body;

    await db.updateHeartbeat({
      device_id: deviceId,
      status: status || 'ONLINE',
      current_video,
      app_version,
      storage_available_mb,
      total_storage_mb
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      command: "NONE" // Can be "RELOAD_PLAYLIST" if admin triggers instant refresh
    });
  } catch (error: any) {
    console.error("Error processing heartbeat:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
