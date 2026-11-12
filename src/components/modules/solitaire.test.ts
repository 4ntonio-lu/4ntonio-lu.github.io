import { describe, expect, it } from 'vitest';
import {
  type Card,
  type Game,
  createGame,
  deal,
  draw,
  emptyGame,
  freshDeck,
  isWon,
  move,
} from './solitaire';

const card = (suit: Card['suit'], rank: Card['rank'], faceUp = true): Card => ({
  id: `${suit}-${rank}`,
  suit,
  rank,
  faceUp,
});

describe('solitaire', () => {
  it('deals a Klondike layout and leaves the rest in the stock', () => {
    const game = deal(freshDeck());

    expect(game.tableau.map((column) => column.length)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    for (const column of game.tableau) {
      expect(column.slice(0, -1).every((entry) => !entry.faceUp)).toBe(true);
      expect(column[column.length - 1].faceUp).toBe(true);
    }
    expect(game.stock).toHaveLength(24);
    expect(game.waste).toHaveLength(0);
    expect(game.stock.every((entry) => !entry.faceUp)).toBe(true);
  });

  it('deals three cards onto the waste, then turns the waste back over', () => {
    const game: Game = {
      ...emptyGame(),
      stock: [1, 2, 3, 4].map((rank) => card('clubs', rank as Card['rank'], false)),
    };

    const dealt = draw(game);
    expect(dealt.stock.map((entry) => entry.rank)).toEqual([1]);
    expect(dealt.waste.map((entry) => entry.rank)).toEqual([4, 3, 2]);
    expect(dealt.waste.every((entry) => entry.faceUp)).toBe(true);

    const emptied = draw(dealt);
    expect(emptied.stock).toHaveLength(0);
    expect(emptied.waste.map((entry) => entry.rank)).toEqual([4, 3, 2, 1]);

    const recycled = draw(emptied);
    expect(recycled.waste).toHaveLength(0);
    expect(recycled.stock.map((entry) => entry.rank)).toEqual([1, 2, 3, 4]);
    expect(recycled.stock.every((entry) => !entry.faceUp)).toBe(true);

    expect(draw(recycled).waste.map((entry) => entry.rank)).toEqual([4, 3, 2]);
  });

  it('builds foundations up in suit and the tableau down in alternating colors', () => {
    const game: Game = {
      ...emptyGame(),
      waste: [card('hearts', 1)],
      tableau: [
        [card('spades', 2)],
        [card('spades', 13)],
        [card('hearts', 12, false), card('clubs', 5)],
        [card('diamonds', 6)],
        [],
        [],
        [],
      ],
    };

    const foundation = move(game, { kind: 'waste' }, 0, { kind: 'foundation', index: 0 });
    expect(foundation?.foundations[0].map((entry) => entry.rank)).toEqual([1]);
    expect(foundation?.waste).toHaveLength(0);

    const wrongSuit = move(
      {
        ...game,
        waste: [card('spades', 2)],
        foundations: [[card('hearts', 1)], [], [], []],
      },
      { kind: 'waste' },
      0,
      { kind: 'foundation', index: 0 },
    );
    expect(wrongSuit).toBeNull();

    const ontoBlack = move(game, { kind: 'waste' }, 0, { kind: 'tableau', index: 0 });
    expect(ontoBlack?.tableau[0].map((entry) => entry.id)).toEqual(['spades-2', 'hearts-1']);

    const sameColor = move(
      {
        ...game,
        waste: [card('diamonds', 1)],
        tableau: [[card('hearts', 2)], ...game.tableau.slice(1)] as Game['tableau'],
      },
      { kind: 'waste' },
      0,
      { kind: 'tableau', index: 0 },
    );
    expect(sameColor).toBeNull();

    const king = move(game, { kind: 'tableau', index: 1 }, 0, { kind: 'tableau', index: 4 });
    expect(king?.tableau[4]).toHaveLength(1);
    expect(king?.tableau[1]).toHaveLength(0);

    const notAKing = move(game, { kind: 'waste' }, 0, { kind: 'tableau', index: 5 });
    expect(notAKing).toBeNull();

    const flipped = move(game, { kind: 'tableau', index: 2 }, 1, { kind: 'tableau', index: 3 });
    expect(flipped?.tableau[2][0]).toMatchObject({ id: 'hearts-12', faceUp: true });
  });

  it('moves a face-up sequence together and refuses a face-down card', () => {
    const game: Game = {
      ...emptyGame(),
      tableau: [
        [card('hearts', 13), card('diamonds', 12), card('spades', 11)],
        [card('clubs', 13)],
        [],
        [],
        [],
        [],
        [],
      ],
    };

    const sequence = move(game, { kind: 'tableau', index: 0 }, 1, { kind: 'tableau', index: 1 });
    expect(sequence?.tableau[0].map((entry) => entry.rank)).toEqual([13]);
    expect(sequence?.tableau[1].map((entry) => entry.rank)).toEqual([13, 12, 11]);

    const buried = move(
      { ...game, tableau: [[card('hearts', 13, false)], [], [], [], [], [], []] },
      { kind: 'tableau', index: 0 },
      0,
      { kind: 'tableau', index: 1 },
    );
    expect(buried).toBeNull();
  });

  it('recognizes a finished game and can deal a full deck', () => {
    const won = emptyGame();
    for (const suit of ['clubs', 'diamonds', 'hearts', 'spades'] as const) {
      won.foundations[['clubs', 'diamonds', 'hearts', 'spades'].indexOf(suit)] = Array.from(
        { length: 13 },
        (_, index) => card(suit, (index + 1) as Card['rank']),
      );
    }
    expect(isWon(won)).toBe(true);
    expect(isWon(createGame(() => 0.5))).toBe(false);
  });
});
