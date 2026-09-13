import { Composition } from 'remotion';
import { HOME_FIELD_NOTES_DURATION, HOME_FIELD_NOTES_FPS, HomeFieldNotes } from './HomeFieldNotes';
import { RouteTerrain } from './RouteTerrain';

const compositionProps = {
  component: RouteTerrain,
  durationInFrames: 300,
  fps: 30,
  width: 1920,
  height: 1080,
};

export const RemotionRoot = () => (
  <>
    <Composition id="RouteTerrain" {...compositionProps} defaultProps={{ tone: 'planner' }} />
    <Composition id="HomeCurrent" {...compositionProps} defaultProps={{ tone: 'home' }} />
    <Composition id="GuidesContours" {...compositionProps} defaultProps={{ tone: 'guides' }} />
    <Composition id="CompareContours" {...compositionProps} defaultProps={{ tone: 'compare' }} />
    <Composition id="ProfileArchive" {...compositionProps} defaultProps={{ tone: 'profile' }} />
    <Composition
      id="HomeFieldNotes"
      component={HomeFieldNotes}
      durationInFrames={HOME_FIELD_NOTES_DURATION}
      fps={HOME_FIELD_NOTES_FPS}
      width={1920}
      height={1080}
    />
  </>
);
