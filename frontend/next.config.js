/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    async rewrites() {
        return [
            {
                source: '/api/proxy/:path*',
                destination: 'http://app:80/api/:path*',
            },
        ];
    },
};

module.exports = nextConfig;
