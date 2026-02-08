/** @type {import('next').NextConfig} */
const nextConfig = {
  // 빌드 시 TypeScript 에러가 있어도 무시하고 진행
  typescript: {
    ignoreBuildErrors: true,
  },
  // 빌드 시 ESLint(문법 검사) 에러가 있어도 무시하고 진행
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
