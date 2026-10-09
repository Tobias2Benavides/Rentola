/** @type {import('next').NextConfig} */
const nextConfig = {
  // Legal pages read content/legal/**/*.md with fs at request time (see
  // lib/legal.ts) -- Next's static file tracing can't see that dynamic
  // read, so the folder has to be included explicitly or it's missing
  // from the Vercel deployment bundle.
  experimental: {
    outputFileTracingIncludes: {
      '/*': ['./content/**/*'],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig
