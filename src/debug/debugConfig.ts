// Debug URL lists to seed images and videos. Update these arrays to change sources.
export const DEBUG_IMAGE_URLS: string[] = [
  'https://images.unsplash.com/photo-1759979743853-d2dfa0619a23?q=80&w=1587&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://plus.unsplash.com/premium_photo-1765480315613-2df47be29ad1?q=80&w=3265&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1764191064428-eec63f47db96?q=80&w=1587&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
];

const REMOTE_VIDEO_BASE = 'https://aby-board-odcr5.ondigitalocean.app';
const LOCAL_VIDEO_BASE = 'http://localhost:5173';

function getVideoBase(): string {
  try {
    if (typeof window !== 'undefined') {
      const h = window.location.hostname;
      const isLocal = h === 'localhost' || h === '127.0.0.1' || h === '::1';
      return isLocal ? LOCAL_VIDEO_BASE : REMOTE_VIDEO_BASE;
    }
  } catch {}
  return REMOTE_VIDEO_BASE;
}

const VIDEO_BASE = getVideoBase();

export const DEBUG_VIDEO_URLS: string[] = [
  `${VIDEO_BASE}/video/v-01.mp4`,
  `${VIDEO_BASE}/video/v-02.mp4`,
  `${VIDEO_BASE}/video/v-03.mp4`,
  `${VIDEO_BASE}/video/v-04.mp4`,
  `${VIDEO_BASE}/video/v-05.mp4`,
  `${VIDEO_BASE}/video/v-06.mp4`,
];
