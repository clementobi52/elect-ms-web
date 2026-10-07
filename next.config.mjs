/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || 'https://d-elect-db.onrender.com/api',
    NEXT_PUBLIC_SOCKET_URL:
      process.env.NEXT_PUBLIC_SOCKET_URL || 'https://d-elect-db.onrender.com',
    NEXT_PUBLIC_PLATFORM_DOMAIN:
      process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'elect-ms.com',
    NEXT_PUBLIC_DEFAULT_TENANT:
      process.env.NEXT_PUBLIC_DEFAULT_TENANT || 'default',
  },
}

export default nextConfig
