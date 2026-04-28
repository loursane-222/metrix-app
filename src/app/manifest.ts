import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Metrix Tezgah',
    short_name: 'Metrix',
    description: 'Mermer ve porselen tezgah atölyeleri için yönetim sistemi',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#030712',
    theme_color: '#030712',
    icons: [
      {
        src: '/icons/metrix-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/metrix-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
