/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        // Allow images from MinIO and external sources
        remotePatterns: [
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '9000',
                pathname: '/nutri-uploads/**',
            },
            {
                protocol: 'https',
                hostname: '**.googleusercontent.com',
            },
        ],
        // Use unoptimized for local static images to avoid processing issues
        unoptimized: true,
    },
}

module.exports = nextConfig
