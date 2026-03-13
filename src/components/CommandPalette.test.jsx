import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import CommandPalette from './CommandPalette.jsx';

const mockedNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return { ...actual, useNavigate: () => mockedNavigate };
});

function renderPalette() {
  return render(
    <MemoryRouter>
      <CommandPalette />
    </MemoryRouter>,
  );
}

function openPalette() {
  fireEvent.keyDown(document, { key: 'k', metaKey: true });
}

describe('CommandPalette', () => {
  it('is hidden by default', () => {
    renderPalette();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens on Cmd+K', () => {
    renderPalette();
    openPalette();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search actions...')).toBeInTheDocument();
  });

  it('opens on Ctrl+K', () => {
    renderPalette();
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    renderPalette();
    openPalette();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('toggles open/close on repeated Cmd+K', () => {
    renderPalette();
    openPalette();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    openPalette();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('filters actions by query', () => {
    renderPalette();
    openPalette();

    const input = screen.getByPlaceholderText('Search actions...');
    fireEvent.change(input, { target: { value: 'key' } });

    // "API Keys" and "Create API key" should match (both contain "key")
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('API Keys')).toBeInTheDocument();
    expect(within(dialog).getByText('Create API key')).toBeInTheDocument();
    // "Overview" should not be visible
    expect(within(dialog).queryByText('Overview')).not.toBeInTheDocument();
  });

  it('shows "No results" for unmatched query', () => {
    renderPalette();
    openPalette();

    fireEvent.change(screen.getByPlaceholderText('Search actions...'), {
      target: { value: 'zzzzzzz' },
    });

    expect(screen.getByText('No results')).toBeInTheDocument();
  });

  it('navigates on Enter', () => {
    renderPalette();
    openPalette();

    // First item is "Overview" with path "/"
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' });
    expect(mockedNavigate).toHaveBeenCalledWith('/');
  });

  it('navigates with ArrowDown + Enter', () => {
    renderPalette();
    openPalette();

    const dialog = screen.getByRole('dialog');
    // Move to second item (Security, path "/security")
    fireEvent.keyDown(dialog, { key: 'ArrowDown' });
    fireEvent.keyDown(dialog, { key: 'Enter' });
    expect(mockedNavigate).toHaveBeenCalledWith('/security');
  });

  it('ArrowUp from first item wraps to last', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => {});
    renderPalette();
    openPalette();

    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'ArrowUp' });
    fireEvent.keyDown(dialog, { key: 'Enter' });

    // Last action is "View system status" (external link)
    expect(openSpy).toHaveBeenCalledWith('https://status.skytale.sh', '_blank');
    openSpy.mockRestore();
  });

  it('has accessible search label', () => {
    renderPalette();
    openPalette();

    const input = screen.getByLabelText('Search actions');
    expect(input).toBeInTheDocument();
  });

  it('has aria-modal and dialog role', () => {
    renderPalette();
    openPalette();

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Command palette');
  });
});
