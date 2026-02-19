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
  // /what-if 접속 시 What-If가 있는 analytics 페이지 내용 표시 (404 방지)
  async rewrites() {
    return [
      { source: '/what-if', destination: '/analytics' },
      { source: '/what-if/', destination: '/analytics' },
    ];
  },
};

export default nextConfig;
