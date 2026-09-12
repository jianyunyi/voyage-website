import { Composition } from 'remotion';
import { RouteTerrain } from './RouteTerrain';

export const RemotionRoot = () => (
  <Composition
    id="RouteTerrain"
    component={RouteTerrain}
    durationInFrames={300}
    fps={30}
    width={1920}
    height={1080}
  />
);
