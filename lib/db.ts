import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

export interface VideoRecord {
  id: string;
  name: string;
  google_drive_file_id: string;
  mime_type: string;
  size: number;
  status: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PlaylistRecord {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PlaylistItemRecord {
  id: string;
  playlist_id: string;
  video_id: string;
  sort_order: number;
  created_at: string;
  video?: VideoRecord;
}

export interface PlayerRecord {
  id: string;
  name: string;
  device_id: string;
  playlist_id: string | null;
  status: string;
  last_seen: string | null;
  current_video: string | null;
  app_version: string;
  storage_available_mb: number;
  total_storage_mb: number;
  created_at: string;
  updated_at: string;
}

interface LocalStoreData {
  videos: VideoRecord[];
  playlists: PlaylistRecord[];
  playlist_items: PlaylistItemRecord[];
  players: PlayerRecord[];
}

const storeFilePath = process.env.VERCEL
  ? path.join('/tmp', 'store.json')
  : path.join(process.cwd(), 'data', 'store.json');

declare global {
  var _signageStore: LocalStoreData | undefined;
}

function loadStore(): LocalStoreData {
  if (globalThis._signageStore && globalThis._signageStore.videos.length > 0) {
    return globalThis._signageStore;
  }

  try {
    if (fs.existsSync(storeFilePath)) {
      const raw = fs.readFileSync(storeFilePath, 'utf8');
      const parsed = JSON.parse(raw);
      globalThis._signageStore = parsed;
      return parsed;
    }
  } catch (err) {
    console.error("Error loading store.json:", err);
  }

  // Default initial store
  const initial: LocalStoreData = {
    videos: [],
    playlists: [
      {
        id: "p-001",
        name: "KP2KP Pelayanan Utama (Portrait 1080x1920)",
        status: "ACTIVE",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    playlist_items: [],
    players: [
      {
        id: "player-001",
        name: "TV Samsung Portrait KP2KP Pelayanan",
        device_id: "KP2KP-TV-01",
        playlist_id: "p-001",
        status: "ONLINE",
        last_seen: new Date().toISOString(),
        current_video: null,
        app_version: "1.0.0",
        storage_available_mb: 8450,
        total_storage_mb: 16000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
  };

  saveStore(initial);
  return initial;
}

function saveStore(data: LocalStoreData) {
  globalThis._signageStore = data;
  try {
    const dir = path.dirname(storeFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(storeFilePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn("Could not persist to disk, keeping in memory:", err);
  }
}

let pool: Pool | null = null;
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('[PASSWORD]')) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  } catch (err) {
    console.warn("Could not connect to PostgreSQL pool, falling back to local store:", err);
  }
}

export const db = {
  // VIDEOS
  async getVideos(): Promise<VideoRecord[]> {
    if (pool) {
      try {
        const res = await pool.query('SELECT * FROM videos ORDER BY sort_order ASC, created_at DESC');
        return res.rows;
      } catch (e) {
        console.error("DB error fetching videos, using fallback:", e);
      }
    }
    const store = loadStore();
    return store.videos.sort((a, b) => a.sort_order - b.sort_order);
  },

  async upsertVideo(video: Partial<VideoRecord> & { google_drive_file_id: string; name: string }): Promise<VideoRecord> {
    if (pool) {
      try {
        const query = `
          INSERT INTO videos (name, google_drive_file_id, mime_type, size, status, sort_order, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
          ON CONFLICT (google_drive_file_id) DO UPDATE SET
            name = EXCLUDED.name,
            mime_type = EXCLUDED.mime_type,
            size = EXCLUDED.size,
            updated_at = NOW()
          RETURNING *;
        `;
        const res = await pool.query(query, [
          video.name,
          video.google_drive_file_id,
          video.mime_type || 'video/mp4',
          video.size || 0,
          video.status || 'ACTIVE',
          video.sort_order || 0
        ]);
        return res.rows[0];
      } catch (e) {
        console.error("DB error upserting video, using fallback:", e);
      }
    }

    const store = loadStore();
    const idx = store.videos.findIndex(v => v.google_drive_file_id === video.google_drive_file_id);
    let record: VideoRecord;

    if (idx >= 0) {
      record = {
        ...store.videos[idx],
        ...video,
        updated_at: new Date().toISOString()
      };
      store.videos[idx] = record;
    } else {
      record = {
        id: `v-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: video.name,
        google_drive_file_id: video.google_drive_file_id,
        mime_type: video.mime_type || 'video/mp4',
        size: video.size || 0,
        status: video.status || 'ACTIVE',
        sort_order: video.sort_order || store.videos.length + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      store.videos.push(record);
    }

    saveStore(store);
    return record;
  },

  // PLAYLISTS
  async getPlaylists(): Promise<PlaylistRecord[]> {
    if (pool) {
      try {
        const res = await pool.query('SELECT * FROM playlists ORDER BY created_at ASC');
        return res.rows;
      } catch (e) {
        console.error("DB error fetching playlists:", e);
      }
    }
    const store = loadStore();
    return store.playlists;
  },

  async getPlaylistItems(playlistId: string): Promise<PlaylistItemRecord[]> {
    if (pool) {
      try {
        const query = `
          SELECT pi.*, 
                 json_build_object(
                   'id', v.id,
                   'name', v.name,
                   'google_drive_file_id', v.google_drive_file_id,
                   'mime_type', v.mime_type,
                   'size', v.size,
                   'status', v.status
                 ) as video
          FROM playlist_items pi
          JOIN videos v ON pi.video_id = v.id
          WHERE pi.playlist_id = $1 AND v.status = 'ACTIVE'
          ORDER BY pi.sort_order ASC;
        `;
        const res = await pool.query(query, [playlistId]);
        return res.rows;
      } catch (e) {
        console.error("DB error fetching playlist items:", e);
      }
    }

    const store = loadStore();
    return store.playlist_items
      .filter(pi => pi.playlist_id === playlistId)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(pi => {
        const vid = store.videos.find(v => v.id === pi.video_id);
        return { ...pi, video: vid };
      });
  },

  async updatePlaylistOrder(playlistId: string, videoIds: string[]): Promise<void> {
    if (pool) {
      try {
        await pool.query('BEGIN');
        await pool.query('DELETE FROM playlist_items WHERE playlist_id = $1', [playlistId]);
        for (let i = 0; i < videoIds.length; i++) {
          await pool.query(
            'INSERT INTO playlist_items (playlist_id, video_id, sort_order) VALUES ($1, $2, $3)',
            [playlistId, videoIds[i], i + 1]
          );
        }
        await pool.query('COMMIT');
        return;
      } catch (e) {
        await pool.query('ROLLBACK');
        console.error("DB error updating playlist order:", e);
      }
    }

    const store = loadStore();
    store.playlist_items = store.playlist_items.filter(pi => pi.playlist_id !== playlistId);
    videoIds.forEach((vid, idx) => {
      store.playlist_items.push({
        id: `pi-${Date.now()}-${idx}`,
        playlist_id: playlistId,
        video_id: vid,
        sort_order: idx + 1,
        created_at: new Date().toISOString()
      });
    });

    const plIdx = store.playlists.findIndex(p => p.id === playlistId);
    if (plIdx >= 0) {
      store.playlists[plIdx].updated_at = new Date().toISOString();
    }

    saveStore(store);
  },

  // PLAYERS
  async getPlayerByDeviceId(deviceId: string): Promise<PlayerRecord | null> {
    if (pool) {
      try {
        const res = await pool.query('SELECT * FROM players WHERE device_id = $1', [deviceId]);
        if (res.rows.length > 0) return res.rows[0];
      } catch (e) {
        console.error("DB error fetching player:", e);
      }
    }
    const store = loadStore();
    return store.players.find(p => p.device_id === deviceId) || null;
  },

  async getAllPlayers(): Promise<PlayerRecord[]> {
    if (pool) {
      try {
        const res = await pool.query('SELECT * FROM players ORDER BY name ASC');
        return res.rows;
      } catch (e) {
        console.error("DB error fetching all players:", e);
      }
    }
    const store = loadStore();
    return store.players;
  },

  async updateHeartbeat(data: {
    device_id: string;
    status: string;
    current_video?: string;
    app_version?: string;
    storage_available_mb?: number;
    total_storage_mb?: number;
  }): Promise<void> {
    const now = new Date().toISOString();
    if (pool) {
      try {
        const query = `
          INSERT INTO players (name, device_id, status, last_seen, current_video, app_version, storage_available_mb, total_storage_mb, updated_at)
          VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, NOW())
          ON CONFLICT (device_id) DO UPDATE SET
            status = EXCLUDED.status,
            last_seen = NOW(),
            current_video = EXCLUDED.current_video,
            app_version = EXCLUDED.app_version,
            storage_available_mb = EXCLUDED.storage_available_mb,
            total_storage_mb = EXCLUDED.total_storage_mb,
            updated_at = NOW();
        `;
        await pool.query(query, [
          `TV Box ${data.device_id}`,
          data.device_id,
          data.status,
          data.current_video || null,
          data.app_version || '1.0.0',
          data.storage_available_mb || 0,
          data.total_storage_mb || 0
        ]);
        return;
      } catch (e) {
        console.error("DB error updating heartbeat:", e);
      }
    }

    const store = loadStore();
    const p = store.players.find(x => x.device_id === data.device_id);
    if (p) {
      p.status = data.status;
      p.last_seen = now;
      if (data.current_video) p.current_video = data.current_video;
      if (data.app_version) p.app_version = data.app_version;
      if (data.storage_available_mb !== undefined) p.storage_available_mb = data.storage_available_mb;
      if (data.total_storage_mb !== undefined) p.total_storage_mb = data.total_storage_mb;
      p.updated_at = now;
    } else {
      store.players.push({
        id: `player-${Date.now()}`,
        name: `TV Box ${data.device_id}`,
        device_id: data.device_id,
        playlist_id: "p-001",
        status: data.status,
        last_seen: now,
        current_video: data.current_video || null,
        app_version: data.app_version || "1.0.0",
        storage_available_mb: data.storage_available_mb || 0,
        total_storage_mb: data.total_storage_mb || 0,
        created_at: now,
        updated_at: now
      });
    }

    saveStore(store);
  }
};
