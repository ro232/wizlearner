/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    // The name sheet moved to a Romanian address.
    return [{ source: '/custom-name', destination: '/nume', permanent: true }];
  },
};

export default nextConfig;
