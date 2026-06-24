/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
};

module.exports = nextConfig;
