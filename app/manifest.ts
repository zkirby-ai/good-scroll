import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Good Scroll',
    short_name: 'Good Scroll',
    description: 'A private feed for high-signal scrolling.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b1020',
    theme_color: '#0b1020',
    orientation: 'portrait'
  };
}
