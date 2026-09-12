import { getSceneForPath } from '../lib/experience/sceneCatalog';

interface ImmersiveBackdropProps {
  pathname: string;
}

export function ImmersiveBackdrop({ pathname }: ImmersiveBackdropProps) {
  const scene = getSceneForPath(pathname);

  return (
    <div aria-hidden="true" className={`voyage-backdrop voyage-backdrop--${scene.tone}`}>
      <img src={scene.posterSrc} alt="" className="voyage-backdrop__poster" />
      <video
        className="voyage-backdrop__video"
        muted
        loop
        playsInline
        autoPlay
        preload="metadata"
        poster={scene.posterSrc}
      >
        <source src={scene.videoSrc} type="video/mp4" />
      </video>
    </div>
  );
}
