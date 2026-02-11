/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    // chromadb를 외부 패키지로 처리하여 빌드 오류 방지
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('chromadb');
    }
    return config;
  },
}

module.exports = nextConfig
