/** @type {import('next').NextConfig} */
const nextConfig = {
  // MediaPipe requires these headers for SharedArrayBuffer support
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ]
  },
  // Turbopack config for Next.js 16+ (dev mode)
  turbopack: {},
  // Webpack config for build mode
  webpack: (config, { isServer }) => {
    // MediaPipe is browser-only, so we need to handle it differently for SSR
    if (isServer) {
      // For server-side, use stub modules for MediaPipe to prevent build errors
      const path = require('path')
      const stubPath = path.resolve(__dirname, 'lib/mediapipe-stub.js')
      config.resolve.alias = {
        ...config.resolve.alias,
        '@mediapipe/pose': stubPath,
        '@mediapipe/camera_utils': stubPath,
        '@mediapipe/drawing_utils': stubPath,
      }
    }
    return config
  },
}

module.exports = nextConfig
