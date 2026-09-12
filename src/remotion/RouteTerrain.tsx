import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

const contours = [
  'M-160 210 C 160 110 360 310 620 220 S 1120 80 1370 190 S 1700 360 2080 170',
  'M-160 330 C 150 230 390 440 680 335 S 1070 170 1370 330 S 1780 510 2080 300',
  'M-160 470 C 140 350 430 585 700 460 S 1080 310 1360 480 S 1770 650 2080 440',
  'M-160 620 C 130 480 420 750 730 610 S 1110 480 1390 640 S 1780 820 2080 600',
  'M-160 790 C 150 640 440 900 750 770 S 1090 630 1380 800 S 1790 980 2080 750',
  'M-160 940 C 170 780 450 1040 770 920 S 1120 770 1410 940 S 1790 1120 2080 900',
];

const routePath = 'M-80 868 C 170 724 355 545 595 612 C 825 676 866 830 1057 654 C 1250 476 1316 326 1510 366 C 1710 406 1800 202 2020 132';

export const RouteTerrain = () => {
  const frame = useCurrentFrame();
  const routeProgress = interpolate(frame, [12, 205], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scanlineX = interpolate(frame, [0, 299], [-260, 2180]);
  const contourOffset = interpolate(frame, [0, 299], [0, -36]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#102f2d' }}>
      <svg viewBox="0 0 1920 1080" width="1920" height="1080" aria-hidden="true">
        <rect width="1920" height="1080" fill="#102f2d" />
        <path d="M0 0H1920M0 270H1920M0 540H1920M0 810H1920M480 0V1080M960 0V1080M1440 0V1080" stroke="#1c4740" strokeWidth="2" />
        <g transform={`translate(0 ${contourOffset})`} fill="none" stroke="#4c8170" strokeWidth="4">
          {contours.map((path) => <path key={path} d={path} />)}
        </g>
        <g fill="none" stroke="#2c6257" strokeWidth="2">
          <path d="M-120 150 C 250 30 470 250 730 120 S 1250 20 1530 160 S 1810 280 2060 70" />
          <path d="M-120 1010 C 200 850 410 1110 730 980 S 1210 850 1510 1010 S 1810 1150 2060 960" />
        </g>
        <path d={routePath} fill="none" stroke="#173b36" strokeWidth="28" strokeLinecap="round" />
        <path
          d={routePath}
          fill="none"
          stroke="#d4ee8a"
          strokeWidth="12"
          strokeLinecap="round"
          pathLength="1"
          strokeDasharray="1"
          strokeDashoffset={1 - routeProgress}
        />
        <path
          d={routePath}
          fill="none"
          stroke="#f4fbde"
          strokeWidth="3"
          strokeLinecap="round"
          pathLength="1"
          strokeDasharray="1"
          strokeDashoffset={1 - routeProgress}
        />
        <path d={`M ${scanlineX} 0 V 1080`} stroke="#9ccdb3" strokeWidth="3" opacity="0.42" />
        <g fill="#d4ee8a" stroke="#102f2d" strokeWidth="8">
          <rect x="-1" y="840" width="38" height="38" transform="rotate(45 18 859)" />
          <rect x="1818" y="104" width="38" height="38" transform="rotate(45 1837 123)" />
        </g>
      </svg>
    </AbsoluteFill>
  );
};
