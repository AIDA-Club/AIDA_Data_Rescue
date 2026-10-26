import type { NextConfig } from 'next';
const config: NextConfig = { allowedDevOrigins:['aida.rescue','127.0.0.1'], outputFileTracingExcludes:{'/*':['.local/**/*','data/private/**/*','output/**/*']}, serverExternalPackages: ['@vercel/sandbox'], async headers() { return [{ source: '/(.*)', headers: [{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'same-origin'},{key:'X-Frame-Options',value:'DENY'}] }]; } };
export default config;
