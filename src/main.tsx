import React from 'react';
import { createRoot } from 'react-dom/client';
import AppBootstrap from './AppBootstrap';
import './index.css';

// Ponto de entrada do frontend. Toda a aplicacao e montada no elemento #root.
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppBootstrap />
  </React.StrictMode>,
);
