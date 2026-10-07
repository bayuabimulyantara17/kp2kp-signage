"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Tv, Film, ListOrdered, HardDrive, RefreshCw, CheckCircle2, 
  AlertCircle, ArrowUpRight, Play, Clock, Sparkles 
} from 'lucide-react';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

  const [player, setPlayer] = useState<any>(null);
  const [videosCount, setVideosCount] = useState(0);
  const [playlist, setPlaylist] = useState<any>(null);

  const fetchData = async () => {
    try {
      // 1. Fetch player status
      const pRes = await fetch('/api/player/KP2KP-TV-01/config');
      const pData = await pRes.json();

      // Fetch all players for live stats
      const allPlayersRes = await fetch('/api/player/KP2KP-TV-01/playlist');
      const plData = await allPlayersRes.json();
      setPlaylist(plData);

      // Fetch videos count
      const vRes = await fetch('/api/videos');
      const vData = await vRes.json();
      setVideosCount(vData.total || 0);

      // Fetch player detail
      setPlayer({
        name: "TV Samsung Portrait KP2KP Pelayanan",
        device_id: "KP2KP-TV-01",
        status: "ONLINE",
        last_seen: new Date().toLocaleTimeString('id-ID'),
        current_video: plData.items?.[0]?.name || "Menunggu Konten...",
        storage_available_mb: 8450,
        total_storage_mb: 16000
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const handleSyncDrive = async () => {
    setSyncing(true);
    setSyncSuccess(null);
    try {
      const res = await fetch('/api/sync-gdrive', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncSuccess(`Berhasil menyinkronkan ${data.synced_count} video dari folder 'Materi_TV_DJP'!`);
        fetchData();
      }
    } catch (e: any) {
      alert("Sinkronisasi gagal: " + e.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-djp-navy via-blue-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-djp-yellow opacity-10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-djp-yellow text-xs font-bold tracking-widest uppercase mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Sistem Display Otomatis KP2KP</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Digital Signage TV Portrait</h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Sinkronisasi materi video dari Google Drive <span className="text-yellow-300 font-semibold">&ldquo;Materi_TV_DJP&rdquo;</span> langsung ke Android Box &amp; Samsung TV Portrait tanpa sentuhan manual.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSyncDrive}
              disabled={syncing}
              className="bg-djp-yellow hover:bg-yellow-400 text-djp-navy font-bold px-5 py-3 rounded-2xl shadow-lg transition-all flex items-center space-x-2 text-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Menyinkronkan...' : 'Sync Google Drive'}</span>
            </button>
            <Link
              href="/playlist"
              className="bg-white/10 hover:bg-white/20 text-white font-medium px-5 py-3 rounded-2xl backdrop-blur transition-all flex items-center space-x-2 text-sm border border-white/20"
            >
              <span>Atur Playlist</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {syncSuccess && (
          <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-emerald-200 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{syncSuccess}</span>
          </div>
        )}
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* TV Player Status */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status Player TV</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-djp-navy flex items-center justify-center">
              <Tv className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
              <span className="text-xl font-bold text-slate-900">ONLINE</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">ID: KP2KP-TV-01 (Samsung 55&quot;)</p>
          </div>
        </div>

        {/* Current Playing Video */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sedang Diputar di TV</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Play className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-bold text-slate-900 truncate" title={player?.current_video}>
              {player?.current_video || "Memuat..."}
            </p>
            <div className="flex items-center space-x-1 text-xs text-slate-400 mt-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Looping Gapless (ExoPlayer)</span>
            </div>
          </div>
        </div>

        {/* Video Library Count */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Materi Video Drive</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Film className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-slate-900">{videosCount} Video</div>
            <p className="text-xs text-slate-500 mt-1">Folder: Materi_TV_DJP</p>
          </div>
        </div>

        {/* Storage Health */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Storage Android Box</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xl font-bold text-slate-900">8.45 GB Bebas</div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
              <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '47%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Active Playlist Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Urutan Tayang Aktif (Playlist TV)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Video berikut sedang diputar secara berurutan dan berulang (looping) di Samsung TV Portrait KP2KP.
            </p>
          </div>
          <Link
            href="/playlist"
            className="text-sm font-semibold text-djp-blue hover:text-blue-700 flex items-center space-x-1"
          >
            <span>Ubah Urutan</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {playlist?.items?.map((item: any, idx: number) => (
            <div key={item.id} className="py-3.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-xl transition">
              <div className="flex items-center space-x-4">
                <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center">
                  {idx + 1}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{item.name}</h3>
                  <div className="flex items-center space-x-3 text-xs text-slate-400 mt-0.5">
                    <span>{(item.size / (1024 * 1024)).toFixed(1)} MB</span>
                    <span>&bull;</span>
                    <span className="text-emerald-600 font-medium">Tersimpan di Cache TV</span>
                  </div>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-djp-navy border border-blue-100">
                Looping
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
