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
  const currentIndexRef = useRef(currentIndex);
  const playlistRef = useRef(playlist);
  const isTransitioningRef = useRef(false);
  const lastTimeRef = useRef<number>(0);
  const autoNextTimeoutRef = useRef<any>(null);

  // Sync ref with state
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

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
      const curVideo = playlistRef.current[currentIndexRef.current]?.name || "Loading";
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
  }, [playlist.length, fetchPlaylist]);

  // Next video function (Looping hanya terjadi setelah video TERAKHIR selesai)
  const playNextVideo = useCallback(() => {
    if (isTransitioningRef.current) return;
    const total = playlistRef.current.length;
    if (total === 0) return;

    isTransitioningRef.current = true;
    clearTimeout(autoNextTimeoutRef.current);
    lastTimeRef.current = 0;

    const currentIdx = currentIndexRef.current;
    let nextIdx = currentIdx + 1;

    // Jika sudah di video terakhir, baru loop kembali ke video pertama (index 0)
    if (nextIdx >= total) {
      console.log(`[Signage Loop] Playlist selesai (${total} video). Mengulang kembali ke video ke-1...`);
      nextIdx = 0;
    } else {
      console.log(`[Auto-Advance] Melanjutkan ke video [${nextIdx + 1}/${total}]`);
    }

    setCurrentIndex(nextIdx);

    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 1000);
  }, []);

  // Previous video function
  const playPrevVideo = useCallback(() => {
    if (isTransitioningRef.current) return;
    const total = playlistRef.current.length;
    if (total === 0) return;

    isTransitioningRef.current = true;
    clearTimeout(autoNextTimeoutRef.current);
    lastTimeRef.current = 0;

    const prevIdx = (currentIndexRef.current - 1 + total) % total;
    setCurrentIndex(prevIdx);

    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 1000);
  }, []);

  // Switch video src & handle playback
  useEffect(() => {
    if (!hasInteracted || playlist.length === 0) return;
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const currentItem = playlist[currentIndex];
    if (!currentItem) return;

    setIsLoading(true);
    setErrorMsg("");
    lastTimeRef.current = 0;
    clearTimeout(autoNextTimeoutRef.current);

    videoEl.removeAttribute('loop');
    videoEl.loop = false;
    videoEl.src = currentItem.download_url;
    videoEl.load();

    const p = videoEl.play();
    if (p !== undefined) {
      p.then(() => {
        setIsLoading(false);
      }).catch((err) => {
        console.warn("Autoplay with sound prevented, forcing muted autoplay:", err);
        videoEl.muted = true;
        videoEl.play()
          .then(() => setIsLoading(false))
          .catch((e) => {
            console.error("Playback error:", e);
            setIsLoading(false);
            setTimeout(playNextVideo, 2000);
          });
      });
    }
  }, [currentIndex, playlist, hasInteracted, playNextVideo]);

  // Fail-Safe Watchers (Duration Timer + Replay Trap + Ended Event)
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    // 1. Saat metadata terbaca, pasang timer durasi pasti
    const onLoadedMetadata = () => {
      const dur = videoEl.duration;
      if (dur > 0 && isFinite(dur)) {
        console.log(`[Video Metadata] Durasi terdeteksi: ${dur.toFixed(1)} detik`);
        clearTimeout(autoNextTimeoutRef.current);
        // Timer cadangan: jika browser lupa trigger ended, timer ini yang ganti videonya!
        autoNextTimeoutRef.current = setTimeout(() => {
          console.log("[Timer Fallback] Durasi video habis. Force next video!");
          playNextVideo();
        }, Math.ceil((dur + 0.8) * 1000));
      }
    };

    // 2. Event ended resmi dari browser
    const onEnded = () => {
      console.log("[Event Ended] Video selesai. Next video!");
      playNextVideo();
    };

    // 3. Timeupdate watcher untuk menangkap Replay/Looping tidak sengaja
    const onTimeUpdate = () => {
      const cur = videoEl.currentTime;
      const dur = videoEl.duration;

      // Update text waktu di layar
      if (dur > 0 && isFinite(dur)) {
        setPlaybackTime(`${Math.floor(cur)}s / ${Math.floor(dur)}s`);
      } else {
        setPlaybackTime(`${Math.floor(cur)}s`);
      }

      // Jebakan Loop: Jika sebelumnya sudah jalan > 3 detik dan tiba-tiba lompat kembali ke < 1.5 detik
      // Berarti browser mengulang video secara sepihak!
      if (lastTimeRef.current > 3 && cur < 1.5) {
        console.log("[Replay Trap] Terdeteksi browser mengulang video sendiri! Paksa lanjut ke video berikutnya.");
        playNextVideo();
        return;
      }

      // Deteksi ujung durasi
      if (dur > 0 && isFinite(dur) && cur >= dur - 0.4) {
        console.log("[Near End] Video mendekati akhir. Next video!");
        playNextVideo();
        return;
      }

      lastTimeRef.current = cur;
    };

    videoEl.addEventListener('loadedmetadata', onLoadedMetadata);
    videoEl.addEventListener('ended', onEnded);
    videoEl.addEventListener('timeupdate', onTimeUpdate);

    return () => {
      clearTimeout(autoNextTimeoutRef.current);
      videoEl.removeEventListener('loadedmetadata', onLoadedMetadata);
      videoEl.removeEventListener('ended', onEnded);
      videoEl.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [playNextVideo]);

  const handleInteract = () => {
    setHasInteracted(true);
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const handleVideoError = (e: any) => {
    console.error("Video error terdeteksi:", e);
    setErrorMsg("Video bermasalah, melewati otomatis...");
    setTimeout(() => {
      setErrorMsg("");
      playNextVideo();
    }, 2000);
  };

  const currentVideo = playlist[currentIndex];

  // === OVERLAY: Tap to Play (Hanya 1x saat TV dinyalakan pertama kali) ===
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
            <p className="text-slate-400 text-sm">{playlist.length} video akan berputar berurutan 1 hingga selesai lalu loop</p>
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
          Device: KP2KP-TV-01 • Sequential Auto-Loop: Active
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
          onClick={playPrevVideo}
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
          onClick={playNextVideo}
          className="bg-black/60 hover:bg-black/80 text-white px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur"
        >
          Berikutnya ⏭
        </button>
      </div>
    </div>
  );
}
