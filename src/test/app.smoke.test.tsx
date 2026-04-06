import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '@/App';

describe('App smoke', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('renders the Biblioteca Pimentas VII landing page', async () => {
    render(<App />);

    expect(await screen.findByRole('button', { name: /Entrar na plataforma/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Criar conta/i })).toBeInTheDocument();
  });

  it('redirects protected routes back to the landing page when unauthenticated', async () => {
    window.history.pushState({}, '', '/admin');

    render(<App />);

    expect(await screen.findByRole('button', { name: /Entrar na plataforma/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Criar conta/i })).toBeInTheDocument();
  });
});
