/** Static export: the marketing site is plain files on Vercel's CDN. */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
