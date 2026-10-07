"use client";

import React, { useState, useEffect } from 'react';
import { ListOrdered, ArrowUp, ArrowDown, Trash2, Plus, Save, CheckCircle2, Film } from 'lucide-react';

export default function PlaylistPage() {
  const [items, setItems] = useState<any[]>([]);
  const [allVideos, setAllVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchPlaylist = async () => {
    try {
      const plRes = await fetch('/api/playlist?id=p-001');
      const plData = await plRes.json();
      setItems(plData.items || []);

      const vRes = await fetch('/api/videos');
      const vData = await vRes.json();
      setAllVideos(vData.videos || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylist();
  }, []);

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const addVideo = (video: any) => {
    if (items.some(item => (item.video?.id === video.id || item.video_id === video.id))) {
      alert("Video ini sudah ada di dalam playlist!");
      return;
    }
    const newItem = {
      id: `pi-${Date.now()}`,
      playlist_id: 'p-001',
      video_id: video.id,
      sort_order: items.length + 1,
      video: video
    };
    setItems([...items, newItem]);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const videoIds = items.map(item => item.video?.id || item.video_id);
      const res = await fetch('/api/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playlist_id: 'p-001',
          video_ids: videoIds
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessage("Urutan playlist berhasil disimpan! TV Box akan memperbarui otomatis pada sinkronisasi berikutnya.");
      }
    } catch (e: any) {
      alert("Gagal menyimpan: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pengaturan Urutan Tayang (Playlist)</h1>
          <p className="text-xs text-slate-500 mt-1">
            Urutan ini menentukan alur looping tayangan display di TV Samsung Portrait KP2KP.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || items.length === 0}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow transition flex items-center space-x-2 text-sm disabled:opacity-50 self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Menyimpan...' : 'Simpan Playlist'}</span>
        </button>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Playlist Column */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center space-x-2">
            <ListOrdered className="w-4 h-4 text-djp-navy" />
            <span>Playlist Aktif TV ({items.length} Video)</span>
          </h2>

          <div className="space-y-2">
            {items.map((item, idx) => (
              <div
                key={item.id || idx}
                className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 hover:border-blue-200 transition"
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <span className="w-7 h-7 rounded-lg bg-djp-navy text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div className="truncate">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {item.video?.name || "Video Item"}
                    </p>
                    <p className="text-xs text-slate-400">
                      Ukuran: {((item.video?.size || 0) / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1 flex-shrink-0">
                  <button
                    onClick={() => moveItem(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-20 transition"
                    title="Pindah ke atas"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveItem(idx, 'down')}
                    disabled={idx === items.length - 1}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-20 transition"
                    title="Pindah ke bawah"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeItem(idx)}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition ml-2"
                    title="Hapus dari playlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {items.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                Playlist kosong. Pilih video dari daftar di sebelah kanan untuk menambahkan.
              </div>
            )}
          </div>
        </div>

        {/* Add from Video Library Column */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center space-x-2">
            <Film className="w-4 h-4 text-djp-navy" />
            <span>Tambah Video Materi</span>
          </h2>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {allVideos.map((video) => {
              const isAdded = items.some(item => (item.video?.id === video.id || item.video_id === video.id));
              return (
                <div
                  key={video.id}
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                    isAdded ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200 hover:border-djp-navy'
                  }`}
                >
                  <div className="truncate mr-2">
                    <p className="font-semibold text-slate-900 truncate">{video.name}</p>
                    <p className="text-slate-400">{(video.size / (1024 * 1024)).toFixed(1)} MB</p>
                  </div>
                  <button
                    onClick={() => addVideo(video)}
                    disabled={isAdded}
                    className="p-1.5 rounded-lg bg-blue-50 text-djp-navy hover:bg-djp-navy hover:text-white transition disabled:opacity-30 flex-shrink-0"
                    title="Tambah ke Playlist"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
