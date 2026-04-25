/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Surface type errors in dev but don't block Vercel deploys
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ensure template files are included in the serverless bundle
  outputFileTracingIncludes: {
    '/api/**': ['./templates/**/*'],
  },
}

module.exports = nextConfig
