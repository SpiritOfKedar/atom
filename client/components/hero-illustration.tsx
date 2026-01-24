'use client';

import React from 'react';

export function HeroIllustration() {
    return (
        <div className="relative w-48 h-32 mx-auto mb-8">
            <svg
                viewBox="0 0 200 120"
                className="w-full h-full"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Binoculars shape */}
                <ellipse
                    cx="70"
                    cy="60"
                    rx="45"
                    ry="35"
                    fill="url(#gradient1)"
                    className="drop-shadow-lg"
                />
                <ellipse
                    cx="130"
                    cy="60"
                    rx="45"
                    ry="35"
                    fill="url(#gradient2)"
                    className="drop-shadow-lg"
                />

                {/* Center bridge */}
                <rect x="85" y="45" width="30" height="30" rx="5" fill="#4a6670" />

                {/* Inner circles - lenses */}
                <ellipse cx="70" cy="60" rx="35" ry="25" fill="#1a3a40" />
                <ellipse cx="130" cy="60" rx="35" ry="25" fill="#1a3a40" />

                {/* Stars/sparkles inside lenses */}
                {[
                    { cx: 55, cy: 50, r: 2, delay: 0 },
                    { cx: 75, cy: 45, r: 1.5, delay: 0.3 },
                    { cx: 65, cy: 70, r: 1.5, delay: 0.6 },
                    { cx: 85, cy: 55, r: 1, delay: 0.9 },
                    { cx: 50, cy: 65, r: 1, delay: 1.2 },
                    { cx: 80, cy: 68, r: 1.5, delay: 0.4 },

                    { cx: 115, cy: 50, r: 2, delay: 0.2 },
                    { cx: 135, cy: 45, r: 1.5, delay: 0.5 },
                    { cx: 125, cy: 70, r: 1.5, delay: 0.8 },
                    { cx: 145, cy: 55, r: 1, delay: 1.1 },
                    { cx: 110, cy: 65, r: 1, delay: 1.4 },
                    { cx: 140, cy: 68, r: 1.5, delay: 0.7 },
                ].map((star, i) => (
                    <circle
                        key={i}
                        cx={star.cx}
                        cy={star.cy}
                        r={star.r}
                        fill="#ffd700"
                        className="animate-pulse"
                        style={{
                            animationDelay: `${star.delay}s`,
                            animationDuration: '2s',
                        }}
                    />
                ))}

                {/* Constellation lines */}
                <g stroke="#3d8b8b" strokeWidth="0.5" opacity="0.6">
                    <line x1="55" y1="50" x2="75" y2="45" />
                    <line x1="75" y1="45" x2="65" y2="70" />
                    <line x1="65" y1="70" x2="50" y2="65" />
                    <line x1="80" y1="68" x2="65" y2="70" />

                    <line x1="115" y1="50" x2="135" y2="45" />
                    <line x1="135" y1="45" x2="125" y2="70" />
                    <line x1="125" y1="70" x2="110" y2="65" />
                    <line x1="140" y1="68" x2="125" y2="70" />
                </g>

                {/* Floating sparkles outside */}
                {[
                    { cx: 20, cy: 20, r: 2 },
                    { cx: 180, cy: 25, r: 1.5 },
                    { cx: 15, cy: 90, r: 1.5 },
                    { cx: 185, cy: 85, r: 2 },
                    { cx: 100, cy: 10, r: 1.5 },
                ].map((sparkle, i) => (
                    <circle
                        key={`sparkle-${i}`}
                        cx={sparkle.cx}
                        cy={sparkle.cy}
                        r={sparkle.r}
                        fill="#ffd700"
                        className="animate-pulse"
                        style={{
                            animationDelay: `${i * 0.4}s`,
                            animationDuration: '3s',
                        }}
                    />
                ))}

                <defs>
                    <linearGradient id="gradient1" x1="25" y1="25" x2="115" y2="95" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#5a8a8a" />
                        <stop offset="1" stopColor="#3d6b6b" />
                    </linearGradient>
                    <linearGradient id="gradient2" x1="85" y1="25" x2="175" y2="95" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#5a8a8a" />
                        <stop offset="1" stopColor="#3d6b6b" />
                    </linearGradient>
                </defs>
            </svg>
        </div>
    );
}
