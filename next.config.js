/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // limite padrão do Next é 1mb — pequeno demais pro upload de logo em PNG
    serverActions: { bodySizeLimit: "4mb" },
  },
};

module.exports = nextConfig;
