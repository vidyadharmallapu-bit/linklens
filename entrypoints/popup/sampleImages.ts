import type { GalleryImage } from './types';

function artwork(sky: string, horizon: string, foreground: string, detail: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="440" viewBox="0 0 640 440"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${sky}"/><stop offset="1" stop-color="${horizon}"/></linearGradient></defs><rect width="640" height="440" fill="url(#sky)"/><circle cx="458" cy="145" r="48" fill="${detail}" opacity=".78"/><path d="M0 278 142 154l109 124 102-92 190 190H0Z" fill="${foreground}" opacity=".66"/><path d="M0 330 174 226l124 92 126-107 216 163v66H0Z" fill="${detail}" opacity=".58"/><path d="M0 350c90-48 162-42 250-4s171 40 242 2 103-45 148-37v129H0Z" fill="${horizon}"/><path d="M0 394c104-27 174-20 259 2 102 26 179 16 255-6 46-13 82-17 126-7v57H0Z" fill="${foreground}"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export const SAMPLE_IMAGES: GalleryImage[] = [
  {
    id: 'example-coast',
    name: 'coastal-morning.jpg',
    size: 2_400_000,
    createdAt: new Date('2025-03-16T09:30:00').getTime(),
    url: artwork('#f4d5b8', '#e89979', '#567b79', '#fff1cf'),
    source: 'example',
    width: 640,
    height: 440,
    mimeType: 'image/jpeg',
  },
  {
    id: 'example-dunes',
    name: 'desert-light.webp',
    size: 1_800_000,
    createdAt: new Date('2025-03-13T14:15:00').getTime(),
    url: artwork('#e5bfa2', '#bf8069', '#674f53', '#f7d99b'),
    source: 'example',
    width: 640,
    height: 440,
    mimeType: 'image/webp',
  },
  {
    id: 'example-evening',
    name: 'last-light.png',
    size: 3_100_000,
    createdAt: new Date('2025-03-10T18:45:00').getTime(),
    url: artwork('#a6b8bf', '#667c8b', '#405a68', '#f0d2a3'),
    source: 'example',
    width: 640,
    height: 440,
    mimeType: 'image/png',
  },
];
