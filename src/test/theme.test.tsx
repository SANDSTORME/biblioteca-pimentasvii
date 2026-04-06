import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '@/App';

describe('Theme toggle', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.className = 'dark';
    window.history.pushState({}, '', '/');
  });

  it('toggles between dark and light theme and persists the choice', async () => {
    render(<App />);

    const toggle = await screen.findByRole('button', { name: /Ativar tema claro/i });
    expect(document.documentElement).toHaveClass('dark');

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(document.documentElement).toHaveClass('light');
    });

    expect(window.localStorage.getItem('biblioteca-pimentasvii:theme')).toBe('light');
    expect(screen.getByRole('button', { name: /Ativar tema escuro/i })).toBeInTheDocument();
  });
});
