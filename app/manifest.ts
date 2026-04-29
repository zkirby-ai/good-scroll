import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Good Scroll',
    short_name: 'Good Scroll',
    description: 'A private feed worth opening.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b0a08',
    theme_color: '#0b0a08',
    orientation: 'portrait',
    icons: [
      { src: '/icon?size=192', sizes: '192x192', type: 'image/png' },
      { src: '/icon?size=512', sizes: '512x512', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' }
    ]
  };
}
