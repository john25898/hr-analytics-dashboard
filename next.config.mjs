/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    // Turbopack's dev file-system cache grew past 1 GB here and was
    // re-hashed on every start — the main cause of the CPU spike.
    turbopackFileSystemCacheForDev: false,
    // Default is (logical CPUs - 1) = 11 on this machine. Cap it so dev
    // builds don't saturate the whole CPU.
    cpus: 2,
  },
};

export default nextConfig;
