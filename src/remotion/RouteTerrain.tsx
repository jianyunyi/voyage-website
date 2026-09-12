import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import type { SceneTone } from '../lib/experience/sceneCatalog';

const toneColors: Record<SceneTone, { background: string; grid: string; contour: string; route: string; routeHighlight: string; scanline: string }> = {
  home: { background: '#193c42', grid: '#2d5960', contour: '#6c9e91', route: '#d7d889', routeHighlight: '#f4f3ca', scanline: '#b3ddc9' },
  guides: { background: '#33422c', grid: '#526243', contour: '#94a86e', route: '#e4c574', routeHighlight: '#fff0b4', scanline: '#d9d39b' },
  planner: { background: '#102f2d', grid: '#1c4740', contour: '#4c8170', route: '#d4ee8a', routeHighlight: '#f4fbde', scanline: '#9ccdb3' },
  compare: { background: '#303847', grid: '#4c5969', contour: '#8395a8', route: '#e79b69', routeHighlight: '#ffe1a8', scanline: '#b7d6e8' },
  profile: { background: '#413139', grid: '#624856', contour: '#9a7181', route: '#d9ad6c', routeHighlight: '#ffe6bc', scanline: '#d9bdcf' },
};

const contours = [
  'M-160 210 C 160 110 360 310 620 220 S 1120 80 1370 190 S 1700 360 2080 170',
  'M-160 330 C 150 230 390 440 680 335 S 1070 170 1370 330 S 1780 510 2080 300',
  'M-160 470 C 140 350 430 585 700 460 S 1080 310 1360 480 S 1770 650 2080 440',
  'M-160 620 C 130 480 420 750 730 610 S 1110 480 1390 640 S 1780 820 2080 600',
  'M-160 790 C 150 640 440 900 750 770 S 1090 630 1380 800 S 1790 980 2080 750',
  'M-160 940 C 170 780 450 1040 770 920 S 1120 770 1410 940 S 1790 1120 2080 900',
];

const routePath = 'M-80 868 C 170 724 355 545 595 612 C 825 676 866 830 1057 654 C 1250 476 1316 326 1510 366 C 1710 406 1800 202 2020 132';

export const RouteTerrain = ({ tone = 'planner' }: { tone?: SceneTone }) => {
  const frame = useCurrentFrame();
  const colors = toneColors[tone];
  const routeProgress = interpolate(frame, [12, 205], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scanlineX = interpolate(frame, [0, 299], [-260, 2180]);
  const contourOffset = interpolate(frame, [0, 299], [0, -36]);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      <svg viewBox="0 0 1920 1080" width="1920" height="1080" aria-hidden="true">
        <rect width="1920" height="1080" fill={colors.background} />
        <path d="M0 0H1920M0 270H1920M0 540H1920M0 810H1920M480 0V1080M960 0V1080M1440 0V1080" stroke={colors.grid} strokeWidth="2" />
        <g transform={`translate(0 ${contourOffset})`} fill="none" stroke={colors.contour} strokeWidth="4">
          {contours.map((path) => <path key={path} d={path} />)}
        </g>
        <g fill="none" stroke={colors.grid} strokeWidth="2">
          <path d="M-120 150 C 250 30 470 250 730 120 S 1250 20 1530 160 S 1810 280 2060 70" />
          <path d="M-120 1010 C 200 850 410 1110 730 980 S 1210 850 1510 1010 S 1810 1150 2060 960" />
        </g>
        <path d={routePath} fill="none" stroke={colors.grid} strokeWidth="28" strokeLinecap="round" />
        <path
          d={routePath}
          fill="none"
          stroke={colors.route}
          strokeWidth="12"
          strokeLinecap="round"
          pathLength="1"
          strokeDasharray="1"
          strokeDashoffset={1 - routeProgress}
        />
        <path
          d={routePath}
          fill="none"
          stroke={colors.routeHighlight}
          strokeWidth="3"
          strokeLinecap="round"
          pathLength="1"
          strokeDasharray="1"
          strokeDashoffset={1 - routeProgress}
        />
        <path d={`M ${scanlineX} 0 V 1080`} stroke={colors.scanline} strokeWidth="3" opacity="0.42" />
        <g fill={colors.route} stroke={colors.background} strokeWidth="8">
          <rect x="-1" y="840" width="38" height="38" transform="rotate(45 18 859)" />
          <rect x="1818" y="104" width="38" height="38" transform="rotate(45 1837 123)" />
        </g>
      </svg>
    </AbsoluteFill>
  );
};
