import React from 'react';
import { cn } from '@/lib/utils';

interface SplashScreenProps {
  visible: boolean;
  exiting: boolean;
}

// Tela de abertura curta para apresentar a marca antes da aplicação aparecer.
const SplashScreen: React.FC<SplashScreenProps> = ({ visible, exiting }) => {
  return (
    <div
      aria-hidden={!visible}
      className={cn(
        'splash-screen',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
        exiting ? 'splash-screen-exit' : '',
      )}
    >
      <div className="splash-aurora splash-aurora-left" />
      <div className="splash-aurora splash-aurora-right" />

      <div className="splash-card">
        <div className="splash-logo-frame">
          <img
            src="/brand/logo-biblioteca-pimentas-vii-v4.svg"
            alt="Logo da Biblioteca Pimentas VII"
            className="splash-logo"
          />
        </div>

        <div className="splash-copy">
          <p className="splash-kicker">Biblioteca escolar</p>
          <h1 className="splash-title">Biblioteca Pimentas VII</h1>
          <p className="splash-subtitle">Leitura, organização e identidade digital para a escola.</p>
        </div>

        <div className="splash-loader" aria-hidden="true">
          <span className="splash-loader-bar" />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
