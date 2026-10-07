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

  const videoRef = useRef<HTMLVideoElement>(null);
  const cursorTimeoutRef = useRef<any>(null);

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

  // Play video when index or interaction changes
  const playVideo = useCallback(() => {
    if (!videoRef.current || playlist.length === 0) return;
    setIsLoading(true);
    setErrorMsg("");
    videoRef.current.load();
    videoRef.current.play()
      .then(() => setIsLoading(false))
      .catch(() => {
        // If autoplay blocked, set muted and retry
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play()
            .then(() => setIsLoading(false))
            .catch((err) => {
              console.error("Play failed:", err);
              setIsLoading(false);
              setErrorMsg("Tap layar untuk memutar video");
            });
        }
      });
  }, [playlist]);

  useEffect(() => {
    if (hasInteracted && playlist.length > 0) {
      playVideo();
    }
  }, [currentIndex, playlist, hasInteracted, playVideo]);

  const handleInteract = () => {
    setHasInteracted(true);
    // Request fullscreen on tap
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const handleVideoEnded = () => {
    if (playlist.length === 0) return;
    const nextIndex = (currentIndex + 1) % playlist.length;
    console.log(`Video selesai. Lanjut ke [${nextIndex + 1}/${playlist.length}]`);
    setCurrentIndex(nextIndex);
  };

  const handleVideoError = (e: any) => {
    console.error("Video error:", e);
    setErrorMsg("Video gagal dimuat, melanjutkan ke berikutnya...");
    if (playlist.length > 1) {
      setTimeout(() => {
        setErrorMsg("");
        setCurrentIndex(prev => (prev + 1) % playlist.length);
      }, 2000);
    }
  };

  const handleVideoCanPlay = () => {
    setIsLoading(false);
    setErrorMsg("");
  };

  const currentVideo = playlist[currentIndex];

  // === OVERLAY: Tap to Play ===
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
            <p className="text-white text-xl font-semibold mt-2">Tap untuk Mulai Memutar</p>
            <p className="text-slate-400 text-sm">{playlist.length} video siap diputar</p>
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
          Device: KP2KP-TV-01 • Auto-Sync: Active
        </div>
      </div>
    );
  }

  // === MAIN PLAYER ===
  return (
    <div
      className={`fixed inset-0 w-screen h-screen bg-black overflow-hidden flex items-center justify-center ${hideCursor ? 'cursor-none' : 'cursor-default'}`}
      onClick={handleInteract}
    >
      {currentVideo ? (
        <>
          <video
            ref={videoRef}
            key={currentVideo.id}
            className="w-full h-full object-cover"
            src={currentVideo.download_url}
            autoPlay
            playsInline
            muted
            onEnded={handleVideoEnded}
            onError={handleVideoError}
            onCanPlay={handleVideoCanPlay}
            onWaiting={() => setIsLoading(true)}
            onPlaying={() => setIsLoading(false)}
          />

          {/* Loading spinner overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Error message overlay */}
          {errorMsg && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/70 px-6 py-3 rounded-xl">
              <p className="text-white text-sm">{errorMsg}</p>
            </div>
          )}

          {/* Video info overlay (bottom) */}
          <div className="absolute bottom-4 right-4 text-xs text-white/30 font-mono">
            {currentIndex + 1}/{playlist.length}
          </div>
        </>
      ) : (
        <div className="text-center p-8 max-w-lg">
          <div className="w-20 h-20 bg-blue-900 text-yellow-400 font-black text-3xl rounded-3xl mx-auto flex items-center justify-center shadow-2xl mb-6">
            KP
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-wide">KP2KP DIGITAL SIGNAGE</h1>
          <div className="my-6">
            <div className="inline-block w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-slate-300 text-sm">{statusMessage}</p>
          <button
            onClick={(e) => { e.stopPropagation(); fetchPlaylist(); }}
            className="mt-6 px-5 py-2.5 bg-yellow-400 text-blue-900 font-bold rounded-xl text-xs"
          >
            Muat Ulang Sekarang
          </button>
        </div>
      )}
    </div>
  );
}
