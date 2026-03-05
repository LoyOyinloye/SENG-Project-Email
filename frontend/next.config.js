/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    async rewrites() {
        return [
            {
                source: '/api/proxy/:path*',
                destination: 'http://app:80/api/:path*',
            },
            {
                source: '/api/attachments/:path*',
                destination: 'http://app:80/api/attachments/:path*',
            },
        ];
    },
};

module.exports = nextConfig;
