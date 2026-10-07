"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';

export default function SamsungTVPlayerPage() {
  const [playlist, setPlaylist] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Menghubungi server signage...");
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<any>(null);
  const lastTimeRef = useRef<number>(0);

  // Auto-hide controls & cursor after 2.5 seconds of inactivity
  const handleUserActivity = () => {
    setShowControls(true);
    clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 2500);
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);
    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
    };
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
      if (next >= playlist.length) {
        console.log(`[Looping] Playlist selesai (${playlist.length} video). Mengulang dari video ke-1.`);
        return 0;
      }
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
    lastTimeRef.current = 0;

    videoEl.loop = false;
    videoEl.src = currentItem.download_url;
    videoEl.muted = isMuted;
    videoEl.volume = 1.0;
    videoEl.load();

    const p = videoEl.play();
    if (p !== undefined) {
      p.then(() => {
        setIsLoading(false);
      }).catch((err) => {
        console.warn("Autoplay audio blocked by browser, falling back to muted:", err);
        // Fallback jika browser memaksa muted
        videoEl.muted = true;
        setIsMuted(true);
        videoEl.play()
          .then(() => setIsLoading(false))
          .catch((e) => {
            console.error("Play error:", e);
            setIsLoading(false);
            setTimeout(advanceToNext, 2000);
          });
      });
    }
  }, [currentIndex, playlist, hasInteracted, isMuted, advanceToNext]);

  // Handler onEnded langsung dari tag video
  const handleVideoEnded = () => {
    advanceToNext();
  };

  // Handler timeupdate untuk deteksi replay/akhir video
  const handleTimeUpdate = () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const cur = videoEl.currentTime;
    const dur = videoEl.duration;

    if (dur > 0 && isFinite(dur)) {
      if (cur >= dur - 0.3) {
        advanceToNext();
        return;
      }
    }

    if (lastTimeRef.current > 4 && cur < 1) {
      advanceToNext();
      return;
    }

    lastTimeRef.current = cur;
  };

  const handleVideoError = () => {
    setTimeout(advanceToNext, 1500);
  };

  // User gesture tap pertama kali: Mengaktifkan suara + Fullscreen resmi
  const handleStartPlay = () => {
    setHasInteracted(true);
    setIsMuted(false);

    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.muted = false;
      videoEl.volume = 1.0;
    }

    // Request full screen
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const videoEl = videoRef.current;
    if (videoEl) {
      const nextMuted = !videoEl.muted;
      videoEl.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const currentVideo = playlist[currentIndex];

  // === OVERLAY: Tap to Play (Layar Awal Interaksi Suara & Fullscreen) ===
  if (!hasInteracted) {
    return (
      <div
        className="fixed inset-0 z-[9999] w-screen h-screen bg-black flex flex-col items-center justify-center select-none cursor-pointer"
        onClick={handleStartPlay}
      >
        <div className="w-24 h-24 bg-yellow-400 text-blue-900 font-black text-4xl rounded-3xl mx-auto flex items-center justify-center shadow-2xl mb-8">
          KP
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-wide mb-2 text-center px-4">
          KP2KP DIGITAL SIGNAGE
        </h1>
        <p className="text-yellow-400 text-sm font-semibold tracking-widest uppercase mb-12">
          Samsung TV Display Player
        </p>

        {playlist.length > 0 ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center shadow-xl animate-pulse">
              <svg className="w-10 h-10 text-blue-900 ml-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
            <p className="text-white text-xl font-bold mt-2">Tap Layar untuk Memulai Video + Audio</p>
            <p className="text-slate-400 text-sm">{playlist.length} video siap berputar fullscreen otomatis</p>
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
          Device: KP2KP-TV-01 • Fullscreen Continuous Signage
        </div>
      </div>
    );
  }

  // === MAIN PURE FULLSCREEN TV SIGNAGE PLAYER ===
  return (
    <div
      className={`fixed inset-0 z-[9999] w-screen h-screen bg-black overflow-hidden flex items-center justify-center ${showControls ? 'cursor-default' : 'cursor-none'}`}
      onClick={handleUserActivity}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay
        playsInline
        onEnded={handleVideoEnded}
        onTimeUpdate={handleTimeUpdate}
        onError={handleVideoError}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
      />

      {/* Loading spinner overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
          <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Floating Audio Indicator in Corner (Tap to toggle mute/unmute anytime) */}
      <div className={`absolute top-4 right-4 z-50 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button
          onClick={toggleSound}
          className="bg-black/60 hover:bg-black/80 text-white p-3 rounded-full backdrop-blur transition flex items-center justify-center"
          title={isMuted ? "Aktifkan Suara" : "Bisukan"}
        >
          {isMuted ? (
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )}
        </button>
      </div>

      {/* Floating Navigation Controls (Hanya muncul jika mouse digerakkan / layar disentuh, lalu hilang otomatis) */}
      <div className={`absolute bottom-4 left-4 right-4 flex items-center justify-between transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button
          onClick={(e) => { e.stopPropagation(); advanceToPrev(); }}
          className="bg-black/70 hover:bg-black/90 text-white px-4 py-2 rounded-xl text-xs font-semibold backdrop-blur"
        >
          ⏮ Sebelumnya
        </button>

        <div className="text-xs text-white/90 font-mono bg-black/70 px-4 py-2 rounded-xl backdrop-blur">
          {currentIndex + 1} / {playlist.length} {currentVideo ? `• ${currentVideo.name}` : ''}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); advanceToNext(); }}
          className="bg-black/70 hover:bg-black/90 text-white px-4 py-2 rounded-xl text-xs font-semibold backdrop-blur"
        >
          Berikutnya ⏭
        </button>
      </div>
    </div>
  );
}
