export type SceneTone = 'home' | 'guides' | 'planner' | 'compare' | 'profile';

export interface SceneDefinition {
  videoSrc: string;
  posterSrc: string;
  tone: SceneTone;
}

const posterSrc = '/motion/route-terrain-poster.png';

const scenes: Record<SceneTone, SceneDefinition> = {
  home: { videoSrc: '/motion/home-field-notes.mp4', posterSrc: '/motion/home-field-notes-poster.png', tone: 'home' },
  guides: { videoSrc: '/motion/guides-contours.mp4', posterSrc, tone: 'guides' },
  planner: { videoSrc: '/motion/route-terrain.mp4', posterSrc, tone: 'planner' },
  compare: { videoSrc: '/motion/compare-contours.mp4', posterSrc, tone: 'compare' },
  profile: { videoSrc: '/motion/profile-archive.mp4', posterSrc, tone: 'profile' },
};

export function getSceneForPath(pathname: string): SceneDefinition {
  if (pathname.startsWith('/planner')) return scenes.planner;
  if (pathname.startsWith('/guides') || pathname.startsWith('/food')) return scenes.guides;
  if (pathname.startsWith('/compare') || pathname.startsWith('/hotel')) return scenes.compare;
  if (pathname.startsWith('/profile') || pathname.startsWith('/auth')) return scenes.profile;
  return scenes.home;
}
