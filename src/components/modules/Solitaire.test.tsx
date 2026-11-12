import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type JSX } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DesktopProvider } from '../../desktop/DesktopProvider';
import Solitaire, { SolitaireTable } from './Solitaire';
import { type Card, type Game, emptyGame } from './solitaire';

const card = (suit: Card['suit'], rank: Card['rank'], faceUp = true): Card => ({
  id: `${suit}-${rank}`,
  suit,
  rank,
  faceUp,
});

function Harness({ initial }: { initial: Game }): JSX.Element {
  const [game, setGame] = useState(initial);
  return <SolitaireTable game={game} onGame={setGame} />;
}

describe('Solitaire', () => {
  it('deals three cards when the stock is clicked', async () => {
    render(
      <Harness
        initial={{
          ...emptyGame(),
          stock: [card('clubs', 1, false), card('hearts', 2, false), card('spades', 3, false)],
        }}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Deal' }));

    expect(screen.getByRole('button', { name: 'Ace of clubs' })).toBeInTheDocument();
    expect(document.querySelectorAll('.solitaire-waste .playing-card')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Recycle the stock' })).toBeInTheDocument();
  });

  it('drags a card onto a foundation', () => {
    render(<Harness initial={{ ...emptyGame(), waste: [card('hearts', 1)] }} />);
    const ace = screen.getByRole('button', { name: 'Ace of hearts' });
    const foundation = document.querySelector('[data-pile="foundation-0"]');
    if (!foundation) throw new Error('Missing foundation');
    document.elementsFromPoint = () => [foundation];

    act(() => {
      ace.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 20, clientY: 20 }),
      );
    });
    act(() => {
      ace.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true, button: 0, clientX: 20, clientY: 20 }),
      );
    });

    expect(
      screen.getByRole('button', { name: 'Ace of hearts' }).closest('[data-pile]'),
    ).toHaveAttribute('data-pile', 'foundation-0');
  });

  it('says when the game is won and opens in a window', () => {
    const won = emptyGame();
    (['clubs', 'diamonds', 'hearts', 'spades'] as const).forEach((suit, suitIndex) => {
      won.foundations[suitIndex] = Array.from({ length: 13 }, (_, index) =>
        card(suit, (index + 1) as Card['rank']),
      );
    });

    const { unmount } = render(<Harness initial={won} />);
    expect(screen.getByText('You win')).toBeInTheDocument();
    unmount();

    render(
      <MemoryRouter>
        <DesktopProvider initialOpen="solitaire">
          <Solitaire />
        </DesktopProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole('dialog', { name: 'Solitaire' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New Game' })).toBeInTheDocument();
  });
});
