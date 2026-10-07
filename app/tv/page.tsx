"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';

export default function SamsungTVPlayerPage() {
  const [playlist, setPlaylist] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Menghubungi server signage...");
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hideCursor, setHideCursor] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [playbackTime, setPlaybackTime] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const cursorTimeoutRef = useRef<any>(null);
  const lastTimeRef = useRef<number>(0);

  // Auto-hide mouse cursor on TV after 3 seconds
  useEffect(() => {
    const handleMouseMove = () => {
      setHideCursor(false);
      clearTimeout(cursorTimeoutRef.current);
      cursorTimeoutRef.current = setTimeout(() => setHideCursor(true), 3000);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Fetch playlist from server
  const fetchPlaylist = useCallback(async () => {
    try {
      const res = await fetch('/api/player/KP2KP-TV-01/playlist');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && data.items && data.items.length > 0) {
        setPlaylist(data.items);
        setStatusMessage("");
      } else {
        setStatusMessage("Menunggu materi video diatur pada playlist...");
      }
    } catch (e: any) {
      console.warn("Gagal memuat playlist:", e);
      setStatusMessage("Sedang menyambungkan ke server...");
    }
  }, []);

  useEffect(() => {
    fetchPlaylist();
    const pollInterval = setInterval(fetchPlaylist, playlist.length === 0 ? 4000 : 60000);

    // Heartbeat every 30s
    const hbInterval = setInterval(() => {
      const curVideo = playlist[currentIndex]?.name || "Loading";
      fetch('/api/player/KP2KP-TV-01/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: "ONLINE",
          current_video: curVideo,
          app_version: "Samsung-TV-Web-1.0",
          storage_available_mb: 4000,
          total_storage_mb: 8000
        })
      }).catch(() => {});
    }, 30000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(hbInterval);
    };
  }, [playlist.length, currentIndex, fetchPlaylist]);

  // Next video function (Looping HANYA setelah video terakhir selesai)
  const advanceToNext = useCallback(() => {
    lastTimeRef.current = 0;
    setCurrentIndex((prevIdx) => {
      if (playlist.length === 0) return 0;
      const next = prevIdx + 1;
      // Jika sudah melewati video terakhir, baru loop kembali ke video pertama (0)
      if (next >= playlist.length) {
        console.log(`[Looping] Selesai ${playlist.length} video. Mengulang dari video ke-1.`);
        return 0;
      }
      console.log(`[Next] Lanjut ke video ${next + 1} / ${playlist.length}`);
      return next;
    });
  }, [playlist.length]);

  // Previous video function
  const advanceToPrev = useCallback(() => {
    lastTimeRef.current = 0;
    setCurrentIndex((prevIdx) => {
      if (playlist.length === 0) return 0;
      return (prevIdx - 1 + playlist.length) % playlist.length;
    });
  }, [playlist.length]);

  // Ganti video ketika currentIndex berubah
  useEffect(() => {
    if (!hasInteracted || playlist.length === 0) return;
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const currentItem = playlist[currentIndex];
    if (!currentItem) return;

    setIsLoading(true);
    setErrorMsg("");
    lastTimeRef.current = 0;

    videoEl.loop = false;
    videoEl.src = currentItem.download_url;
    videoEl.load();

    const p = videoEl.play();
    if (p !== undefined) {
      p.then(() => {
        setIsLoading(false);
      }).catch((err) => {
        console.warn("Autoplay audio blocked, switching to muted:", err);
        videoEl.muted = true;
        videoEl.play()
          .then(() => setIsLoading(false))
          .catch((e) => {
            console.error("Play error:", e);
            setIsLoading(false);
            // Skip jika video rusak
            setTimeout(advanceToNext, 2000);
          });
      });
    }
  }, [currentIndex, playlist, hasInteracted, advanceToNext]);

  // Handler onEnded langsung dari tag video
  const handleVideoEnded = () => {
    console.log("[Trigger] Video onEnded dipanggil!");
    advanceToNext();
  };

  // Handler timeupdate untuk deteksi replay/akhir video
  const handleTimeUpdate = () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const cur = videoEl.currentTime;
    const dur = videoEl.duration;

    if (dur > 0 && isFinite(dur)) {
      setPlaybackTime(`${Math.floor(cur)}s / ${Math.floor(dur)}s`);

      // 1. Jika durasi sudah mencapai akhir (sisa < 0.3s)
      if (cur >= dur - 0.3) {
        console.log("[Trigger] Waktu mencapai akhir durasi!");
        advanceToNext();
        return;
      }
    } else {
      setPlaybackTime(`${Math.floor(cur)}s`);
    }

    // 2. Jika browser me-restart video (sebelumnya sudah jalan > 4s, tiba-tiba lompat ke < 1s)
    if (lastTimeRef.current > 4 && cur < 1) {
      console.log("[Trigger] Browser me-replay sendiri! Paksa lanjut ke video berikutnya.");
      advanceToNext();
      return;
    }

    lastTimeRef.current = cur;
  };

  const handleVideoError = (e: any) => {
    console.error("Video error:", e);
    setErrorMsg("Video bermasalah, melewati otomatis...");
    setTimeout(() => {
      setErrorMsg("");
      advanceToNext();
    }, 2000);
  };

  const handleInteract = () => {
    setHasInteracted(true);
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const currentVideo = playlist[currentIndex];

  // === OVERLAY: Tap to Play (Layar Awal) ===
  if (!hasInteracted) {
    return (
      <div
        className="fixed inset-0 w-screen h-screen bg-black flex flex-col items-center justify-center select-none cursor-pointer"
        onClick={handleInteract}
      >
        <div className="w-24 h-24 bg-yellow-400 text-blue-900 font-black text-4xl rounded-3xl mx-auto flex items-center justify-center shadow-2xl mb-8">
          KP
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-wide mb-2">
          KP2KP DIGITAL SIGNAGE
        </h1>
        <p className="text-yellow-400 text-sm font-semibold tracking-widest uppercase mb-12">
          Samsung TV Portrait Player
        </p>

        {playlist.length > 0 ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center shadow-xl animate-pulse">
              <svg className="w-10 h-10 text-blue-900 ml-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
            <p className="text-white text-xl font-semibold mt-2">Tap untuk Mulai Otomatis</p>
            <p className="text-slate-400 text-sm">{playlist.length} video akan berputar berurutan lalu loop</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-slate-300 text-sm">{statusMessage}</p>
            <button
              onClick={(e) => { e.stopPropagation(); fetchPlaylist(); }}
              className="mt-4 px-5 py-2 bg-yellow-400 text-blue-900 font-bold rounded-xl text-sm"
            >
              Muat Ulang
            </button>
          </div>
        )}

        <div className="absolute bottom-6 text-xs text-slate-600 font-mono">
          Device: KP2KP-TV-01 • Sequential Auto-Advance
        </div>
      </div>
    );
  }

  // === MAIN CONTINUOUS AUTO-PLAYER ===
  return (
    <div
      className={`fixed inset-0 w-screen h-screen bg-black overflow-hidden flex items-center justify-center ${hideCursor ? 'cursor-none' : 'cursor-default'}`}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay
        playsInline
        muted
        onEnded={handleVideoEnded}
        onTimeUpdate={handleTimeUpdate}
        onError={handleVideoError}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
      />

      {/* Loading spinner overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
          <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error notification overlay */}
      {errorMsg && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-black/80 px-6 py-3 rounded-xl border border-red-500/50 pointer-events-none">
          <p className="text-white text-sm">{errorMsg}</p>
        </div>
      )}

      {/* Info Urutan & Waktu Video */}
      <div className={`absolute bottom-4 left-4 right-4 flex items-center justify-between transition-opacity duration-300 ${hideCursor ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <button
          onClick={advanceToPrev}
          className="bg-black/60 hover:bg-black/80 text-white px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur"
        >
          ⏮ Sebelumnya
        </button>

        <div className="text-xs text-white/90 font-mono bg-black/60 px-3 py-1.5 rounded-lg backdrop-blur flex items-center gap-2">
          <span className="text-yellow-400 font-bold">{currentIndex + 1} / {playlist.length}</span>
          <span>{currentVideo ? `• ${currentVideo.name}` : ''}</span>
          {playbackTime && <span className="text-slate-400">({playbackTime})</span>}
        </div>

        <button
          onClick={advanceToNext}
          className="bg-black/60 hover:bg-black/80 text-white px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur"
        >
          Berikutnya ⏭
        </button>
      </div>
    </div>
  );
}
