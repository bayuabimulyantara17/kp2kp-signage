"use client";

import React, { useState, useEffect, useRef } from 'react';

export default function SamsungTVPlayerPage() {
  const [playlist, setPlaylist] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Menghubungi server signage...");
  const [isPlaying, setIsPlaying] = useState(false);
  const [hideCursor, setHideCursor] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const cursorTimeoutRef = useRef<any>(null);

  // Auto-hide mouse cursor on TV after 3 seconds
  useEffect(() => {
    const handleMouseMove = () => {
      setHideCursor(false);
      clearTimeout(cursorTimeoutRef.current);
      cursorTimeoutRef.current = setTimeout(() => {
        setHideCursor(true);
      }, 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Fetch playlist from server with immediate fallback
  const fetchPlaylist = async () => {
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
      setStatusMessage("Sedang menyambungkan ke server... (Mencoba otomatis)");
    }
  };

  useEffect(() => {
    fetchPlaylist();

    // Fast retry every 4s if empty, or every 60s once loaded
    const pollInterval = setInterval(() => {
      fetchPlaylist();
    }, playlist.length === 0 ? 4000 : 60000);

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
  }, [playlist.length, currentIndex]);

  // Video transition handler
  const handleVideoEnded = () => {
    if (playlist.length === 0) return;
    const nextIndex = (currentIndex + 1) % playlist.length;
    console.log(`Video selesai. Melanjutkan ke video [${nextIndex + 1}/${playlist.length}]`);
    setCurrentIndex(nextIndex);
  };

  // Skip corrupt or unplayable video
  const handleVideoError = (e: any) => {
    console.error("Video error on TV:", e);
    if (playlist.length > 1) {
      setTimeout(() => {
        handleVideoEnded();
      }, 1500);
    }
  };

  // Play video whenever currentIndex changes
  useEffect(() => {
    if (videoRef.current && playlist.length > 0) {
      videoRef.current.load();
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn("Autoplay with sound prevented, enabling muted autoplay:", err);
            if (videoRef.current) {
              videoRef.current.muted = true;
              videoRef.current.play().catch(() => {});
            }
          });
      }
    }
  }, [currentIndex, playlist]);

  const currentVideo = playlist[currentIndex];

  return (
    <div
      className={`fixed inset-0 w-screen h-screen bg-black overflow-hidden flex items-center justify-center select-none ${
        hideCursor ? 'cursor-none' : 'cursor-default'
      }`}
      onClick={() => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      }}
    >
      {currentVideo ? (
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
        />
      ) : (
        <div className="text-center p-8 max-w-lg">
          <div className="w-20 h-20 bg-djp-navy text-djp-yellow font-black text-3xl rounded-3xl mx-auto flex items-center justify-center shadow-2xl mb-6">
            KP
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-wide">KP2KP DIGITAL SIGNAGE</h1>
          <p className="text-djp-yellow text-sm font-semibold tracking-wider uppercase mt-1">
            Samsung TV Portrait Player
          </p>
          <div className="my-6">
            <div className="inline-block w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-300 text-sm">
            {statusMessage}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              fetchPlaylist();
            }}
            className="mt-6 px-5 py-2.5 bg-djp-yellow text-djp-navy font-bold rounded-xl text-xs hover:bg-yellow-400 transition"
          >
            Muat Ulang Sekarang
          </button>
          <div className="mt-8 pt-6 border-t border-slate-800">
            <span className="text-xs text-slate-500 font-mono">
              Device: KP2KP-TV-01 &bull; Auto-Sync: Active
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
