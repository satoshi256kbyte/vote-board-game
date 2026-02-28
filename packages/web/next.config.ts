import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@vote-board-game/shared'],
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
