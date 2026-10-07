"use client";

import React, { useState, useEffect } from 'react';
import { Film, RefreshCw, CheckCircle2, Search, ExternalLink, HardDrive } from 'lucide-react';

export default function VideosPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchVideos = async () => {
    try {
      const res = await fetch('/api/videos');
      const data = await res.json();
      setVideos(data.videos || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch('/api/sync-gdrive', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setMessage(`Berhasil memindai ${data.synced_count} video dari Google Drive!`);
        fetchVideos();
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setSyncing(false);
    }
  };

  const filteredVideos = videos.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Perpustakaan Video Materi DJP</h1>
          <p className="text-xs text-slate-500 mt-1">
            Daftar seluruh berkas MP4 yang disinkronkan dari folder Google Drive <strong className="text-slate-800">&ldquo;Materi_TV_DJP&rdquo;</strong>.
          </p>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="bg-djp-navy hover:bg-slate-800 text-white font-semibold px-4 py-2.5 rounded-xl shadow transition flex items-center space-x-2 text-sm disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Menyinkronkan...' : 'Sync Google Drive'}</span>
        </button>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Cari judul materi video..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-djp-navy"
        />
      </div>

      {/* Videos Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Nama File Video</th>
                <th className="py-3.5 px-4">Ukuran</th>
                <th className="py-3.5 px-4">Google Drive File ID</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVideos.map((video) => (
                <tr key={video.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-4 font-medium text-slate-900 flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-djp-navy flex items-center justify-center flex-shrink-0">
                      <Film className="w-4 h-4" />
                    </div>
                    <span className="truncate max-w-md">{video.name}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-xs">
                    {(video.size / (1024 * 1024)).toFixed(1)} MB
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-mono text-xs">
                    {video.google_drive_file_id}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                      AKTIF
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <a
                      href={`/api/videos/${video.id}/stream`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-djp-blue hover:text-blue-800 inline-flex items-center space-x-1"
                    >
                      <span>Preview</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
