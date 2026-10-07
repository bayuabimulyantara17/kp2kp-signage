"use client";

import React, { useState, useEffect } from 'react';
import { Tv, HardDrive, Clock, CheckCircle2, AlertCircle, RefreshCw, Cpu } from 'lucide-react';

export default function PlayersPage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlayers = async () => {
    try {
      // In production calls db.getAllPlayers via API or simulated response
      const res = await fetch('/api/player/KP2KP-TV-01/config');
      const data = await res.json();

      setPlayers([
        {
          id: "player-001",
          name: "TV Samsung 55\" Portrait — KP2KP Pelayanan",
          device_id: data.device_id || "KP2KP-TV-01",
          status: "ONLINE",
          last_seen: new Date().toLocaleTimeString('id-ID'),
          current_video: "01_Profil_Layanan_KP2KP_Portrait.mp4",
          app_version: "1.0.0",
          storage_available_mb: 8450,
          total_storage_mb: 16000
        }
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Monitoring &amp; Manajemen Player TV Box</h1>
        <p className="text-xs text-slate-500 mt-1">
          Status koneksi, kesehatan penyimpanan lokal, dan diagnostik perangkat pemutar Android Box.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {players.map((player) => (
          <div
            key={player.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-djp-navy text-djp-yellow flex items-center justify-center font-bold text-lg">
                  <Tv className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{player.name}</h2>
                  <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                    <span>Device ID: <strong className="font-mono text-slate-700">{player.device_id}</strong></span>
                    <span>&bull;</span>
                    <span>Versi APK: <strong className="text-slate-700">{player.app_version}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 self-start sm:self-auto">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold text-emerald-700 uppercase bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                  {player.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 mb-1">
                  <Clock className="w-4 h-4 text-djp-blue" />
                  <span>Heartbeat Terakhir</span>
                </div>
                <p className="text-sm font-bold text-slate-900">{player.last_seen} WIB</p>
                <p className="text-xs text-slate-400 mt-0.5">Interval ping: 30 detik</p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 mb-1">
                  <Cpu className="w-4 h-4 text-emerald-600" />
                  <span>Sedang Diputar</span>
                </div>
                <p className="text-sm font-bold text-slate-900 truncate" title={player.current_video}>
                  {player.current_video}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Media3 Hardware Accelerated</p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 mb-1">
                  <HardDrive className="w-4 h-4 text-purple-600" />
                  <span>Sisa Storage Internal</span>
                </div>
                <p className="text-sm font-bold text-slate-900">
                  {(player.storage_available_mb / 1024).toFixed(2)} GB bebas
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  dari {(player.total_storage_mb / 1024).toFixed(1)} GB total
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
