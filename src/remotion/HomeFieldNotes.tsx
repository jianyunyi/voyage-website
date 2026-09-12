import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

export const HOME_FIELD_NOTES_FPS = 30;
export const HOME_FIELD_NOTES_DURATION = 360;

const routePath = 'M 1110 792 C 1272 664 1340 834 1488 666 S 1698 462 1844 290';

const phaseOpacity = (frame: number, start: number, end: number) =>
  interpolate(frame, [start - 16, start, end - 16, end], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

export const HomeFieldNotes = () => {
  const frame = useCurrentFrame();
  const mastheadOpacity = phaseOpacity(frame, 0, 106);
  const editorialOpacity = phaseOpacity(frame, 90, 256);
  const routeOpacity = phaseOpacity(frame, 240, HOME_FIELD_NOTES_DURATION);
  const editorialLift = interpolate(frame, [90, 150, 240], [36, 0, -16], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const routeProgress = interpolate(frame, [252, 344], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const markerPulse = interpolate(frame, [258, 294, 330, 359], [0.5, 1, 0.5, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const coordinateShift = interpolate(frame, [0, 90], [0, -42], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#12383a', color: '#f2ebd1', fontFamily: 'Georgia, serif' }}>
      <svg viewBox="0 0 1920 1080" width="1920" height="1080" aria-hidden="true">
        <rect width="1920" height="1080" fill="#12383a" />
        <path d="M0 870 C 430 760 746 944 1088 816 S 1618 616 1920 710 V1080 H0 Z" fill="#1b4d48" />
        <path d="M0 982 C 396 876 742 1024 1122 916 S 1616 780 1920 832 V1080 H0 Z" fill="#0d2d31" />
        <g fill="none" stroke="#538071" strokeWidth="2" opacity="0.72">
          <path d="M790 134 C 1068 52 1232 238 1462 138 S 1766 70 1984 168" />
          <path d="M846 238 C 1090 150 1264 344 1518 236 S 1786 164 1986 264" />
          <path d="M892 352 C 1110 264 1302 462 1548 350 S 1804 286 1998 372" />
          <path d="M924 482 C 1144 386 1326 582 1580 470 S 1818 400 2010 498" />
          <path d="M978 616 C 1174 522 1360 714 1608 600 S 1836 532 2020 624" />
        </g>

        <g opacity={mastheadOpacity} transform={`translate(0 ${coordinateShift})`}>
          <rect x="1062" y="106" width="652" height="300" fill="#174145" stroke="#d8a653" strokeWidth="2" />
          <path d="M1094 146 H1682 M1094 364 H1682" stroke="#6d9988" strokeWidth="1" />
          <text x="1094" y="190" fill="#d8a653" fontFamily="Arial, sans-serif" fontSize="22" letterSpacing="5">FIELD NOTES / 01</text>
          <text x="1094" y="266" fill="#f2ebd1" fontSize="60" letterSpacing="2">WAYFINDING</text>
          <text x="1098" y="314" fill="#bcd1b5" fontFamily="Arial, sans-serif" fontSize="18" letterSpacing="3">24.4798 N   /   118.0894 E</text>
          <g fill="#d8a653">
            <circle cx="1652" cy="294" r="7" />
            <rect x="1636" y="328" width="32" height="5" />
          </g>
          <text x="1094" y="448" fill="#d2d7bd" fontFamily="Arial, sans-serif" fontSize="16" letterSpacing="3">COASTAL ENTRY / MORNING BEARING</text>
        </g>

        <g opacity={editorialOpacity} transform={`translate(0 ${editorialLift})`}>
          <rect x="1008" y="120" width="696" height="706" fill="#e9dfbf" />
          <rect x="1032" y="146" width="648" height="524" fill="#2e675f" />
          <path d="M1032 522 C 1176 412 1292 500 1408 412 S 1596 298 1680 374 V670 H1032 Z" fill="#1c4d4b" />
          <path d="M1032 592 C 1170 494 1286 598 1412 506 S 1578 414 1680 476 V670 H1032 Z" fill="#16403f" />
          <path d="M1200 606 C 1300 520 1388 610 1492 494 S 1602 408 1658 430" fill="none" stroke="#d8a653" strokeWidth="7" />
          <rect x="1074" y="718" width="156" height="5" fill="#d8a653" />
          <text x="1074" y="758" fill="#173a3c" fontSize="38" letterSpacing="1">A measured arrival</text>
          <text x="1074" y="794" fill="#416564" fontFamily="Arial, sans-serif" fontSize="16" letterSpacing="3">SLOW MAPS / LOCAL SIGNALS</text>
          <g fill="none" stroke="#d8a653" strokeWidth="2">
            <path d="M1704 216 H1794 M1749 171 V261" />
            <circle cx="1749" cy="216" r="26" />
            <path d="M1732 756 H1790 M1732 780 H1772" />
          </g>
          <text x="1720" y="300" fill="#d8a653" fontFamily="Arial, sans-serif" fontSize="15" letterSpacing="2">32 KM</text>
          <text x="1720" y="804" fill="#d8a653" fontFamily="Arial, sans-serif" fontSize="15" letterSpacing="2">09:42</text>
        </g>

        <g opacity={routeOpacity}>
          <rect x="1032" y="186" width="704" height="656" fill="#103437" stroke="#d8a653" strokeWidth="2" />
          <text x="1080" y="254" fill="#d8a653" fontFamily="Arial, sans-serif" fontSize="18" letterSpacing="4">NEXT QUIET CUE</text>
          <text x="1080" y="310" fill="#f2ebd1" fontSize="44" letterSpacing="1">Follow the shaded line</text>
          <g fill="none" stroke="#4c8170" strokeWidth="2">
            <path d="M1078 386 H1686 M1078 532 H1686 M1078 678 H1686" />
            <path d="M1190 350 V760 M1394 350 V760 M1598 350 V760" />
          </g>
          <path d={routePath} fill="none" stroke="#315e58" strokeWidth="22" strokeLinecap="round" />
          <path
            d={routePath}
            fill="none"
            stroke="#d8a653"
            strokeWidth="8"
            strokeLinecap="round"
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset={1 - routeProgress}
          />
          <g transform="translate(1110 792)" fill="#d8a653" opacity={markerPulse}>
            <rect x="-12" y="-12" width="24" height="24" transform="rotate(45)" />
          </g>
          <g transform="translate(1844 290)" fill="#f2ebd1" opacity={markerPulse}>
            <circle r="12" />
          </g>
          <text x="1080" y="792" fill="#bcd1b5" fontFamily="Arial, sans-serif" fontSize="17" letterSpacing="3">MARKER 03 / 18 MINUTES ON FOOT</text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};
