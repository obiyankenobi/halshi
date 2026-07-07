/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'standalone' is only needed for the Docker image (set there via NEXT_OUTPUT);
  // pm2/bare-node deploys use the regular build + `next start`.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
}

module.exports = nextConfig
