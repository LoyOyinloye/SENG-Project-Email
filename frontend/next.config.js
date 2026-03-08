/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    async rewrites() {
        const backendUrl = process.env.BACKEND_API_URL || 'http://app:80';
        return [
            {
                source: '/api/proxy/:path*',
                destination: `${backendUrl}/api/:path*`,
            },
            {
                source: '/api/attachments/:path*',
                destination: `${backendUrl}/api/attachments/:path*`,
            },
        ];
    },
};

module.exports = nextConfig;
