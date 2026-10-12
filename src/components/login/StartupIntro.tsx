import { useCallback, useState } from 'react';
import { LoginIntro, shouldPlayIntro, startupIntro } from './LoginIntro';

/**
 * Ouverture du projet avec une session déjà active : l'introduction du logo est jouée au-dessus de
 * l'application, puis s'efface. Sans session, c'est la page de connexion qui la joue (comme PREMIDIS ERP).
 */
export function StartupIntro({ hasSession }: { hasSession: boolean }) {
  const [show, setShow] = useState(() => {
    const play = hasSession && shouldPlayIntro();
    startupIntro.playing = play;
    return play;
  });
  const noop = useCallback(() => {}, []);
  const done = useCallback(() => {
    startupIntro.playing = false;
    setShow(false);
  }, []);
  return show ? <LoginIntro onReveal={noop} onDone={done} /> : null;
}
