"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tv, Film, ListOrdered, Settings, LogOut, RefreshCw } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  if (pathname === '/login' || pathname === '/tv') return null;

  const navItems = [
    { name: 'Dashboard', href: '/', icon: Tv },
    { name: 'Video Library', href: '/videos', icon: Film },
    { name: 'Kelola Playlist', href: '/playlist', icon: ListOrdered },
    { name: 'Player TV Box', href: '/players', icon: Settings },
  ];

  return (
    <header className="bg-djp-navy text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-djp-yellow flex items-center justify-center font-bold text-djp-navy text-xl shadow">
              KP
            </div>
            <div>
              <span className="font-bold text-lg tracking-wide block">KP2KP SIGNAGE</span>
              <span className="text-xs text-yellow-300 block -mt-1">DJP Digital Signage System</span>
            </div>
          </div>

          <nav className="flex space-x-1 sm:space-x-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-900 text-white border-b-2 border-djp-yellow'
                      : 'text-gray-200 hover:bg-blue-950 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center space-x-3">
            <Link
              href="/login"
              className="text-gray-300 hover:text-white p-2 rounded-md hover:bg-blue-950 transition"
              title="Keluar"
            >
              <LogOut className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
