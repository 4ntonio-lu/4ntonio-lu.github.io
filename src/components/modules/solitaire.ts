export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export type Card = {
  id: string;
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
};

export type Pile =
  { kind: 'waste' } | { kind: 'foundation'; index: number } | { kind: 'tableau'; index: number };

export type Game = {
  stock: Card[];
  waste: Card[];
  foundations: [Card[], Card[], Card[], Card[]];
  tableau: [Card[], Card[], Card[], Card[], Card[], Card[], Card[]];
};

const SUITS: readonly Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];
const RANK_GLYPH = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
const RANK_NAME = [
  '',
  'Ace',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'Jack',
  'Queen',
  'King',
] as const;
const SUIT_GLYPH: Record<Suit, string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
};

export const isRed = (suit: Suit) => suit === 'diamonds' || suit === 'hearts';

export const rankGlyph = (rank: Rank) => RANK_GLYPH[rank];
export const suitGlyph = (suit: Suit) => SUIT_GLYPH[suit];
export const cardName = (card: Card) => `${RANK_NAME[card.rank]} of ${card.suit}`;

export function pileId(pile: Pile): string {
  if (pile.kind === 'waste') return 'waste';
  return `${pile.kind}-${pile.index}`;
}

export function pileFromId(id: string): Pile | null {
  if (id === 'waste') return { kind: 'waste' };
  const match = /^(foundation|tableau)-([0-6])$/.exec(id);
  if (!match) return null;
  const index = Number(match[2]);
  if (match[1] === 'foundation' && index > 3) return null;
  if (match[1] === 'foundation') return { kind: 'foundation', index };
  return { kind: 'tableau', index };
}

const clone = (card: Card, faceUp = card.faceUp): Card => ({ ...card, faceUp });

export function freshDeck(): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank += 1) {
      cards.push({ id: `${suit}-${rank}`, suit, rank: rank as Rank, faceUp: false });
    }
  }
  return cards;
}

export function shuffle(cards: Card[], random: () => number = Math.random): Card[] {
  const next = cards.map((card) => clone(card));
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [next[index], next[swap]] = [next[swap], next[index]];
  }
  return next;
}

/** The end of a pile is its top. Dealing pops from the end of the deck. */
export function deal(deck: Card[]): Game {
  const cards = deck.map((card) => clone(card, false));
  const tableau = Array.from({ length: 7 }, () => [] as Card[]) as Game['tableau'];
  for (let column = 0; column < 7; column += 1) {
    for (let row = 0; row <= column; row += 1) {
      const card = cards.pop();
      if (!card) throw new Error('The deck ran out while dealing.');
      tableau[column].push(clone(card, row === column));
    }
  }
  return {
    stock: cards,
    waste: [],
    foundations: [[], [], [], []],
    tableau,
  };
}

export function createGame(random: () => number = Math.random): Game {
  return deal(shuffle(freshDeck(), random));
}

function emptyFoundations(): Game['foundations'] {
  return [[], [], [], []];
}

/** Draw three, or turn the waste back into the stock when the stock is empty. */
export function draw(game: Game): Game {
  if (game.stock.length === 0) {
    if (game.waste.length === 0) return game;
    return {
      ...game,
      stock: [...game.waste].reverse().map((card) => clone(card, false)),
      waste: [],
    };
  }
  const stock = game.stock.map((card) => clone(card));
  const taken = stock.splice(-Math.min(3, stock.length));
  const drawn = taken.reverse().map((card) => clone(card, true));
  return {
    ...game,
    stock,
    waste: [...game.waste.map((card) => clone(card)), ...drawn],
  };
}

function sourceCards(game: Game, from: Pile, index: number): Card[] | null {
  if (from.kind === 'waste') {
    if (index !== game.waste.length - 1) return null;
    return [game.waste[index]];
  }
  if (from.kind === 'foundation') {
    const pile = game.foundations[from.index];
    if (!pile || index !== pile.length - 1) return null;
    return [pile[index]];
  }
  const pile = game.tableau[from.index];
  if (!pile || index < 0 || index >= pile.length) return null;
  return pile.slice(index);
}

function isMovableSequence(cards: Card[]): boolean {
  if (cards.length === 0 || cards.some((card) => !card.faceUp)) return false;
  for (let index = 1; index < cards.length; index += 1) {
    const previous = cards[index - 1];
    const card = cards[index];
    if (isRed(previous.suit) === isRed(card.suit)) return false;
    if (card.rank !== previous.rank - 1) return false;
  }
  return true;
}

function canPlace(game: Game, cards: Card[], to: Pile): boolean {
  const first = cards[0];
  if (to.kind === 'foundation') {
    if (cards.length !== 1) return false;
    const pile = game.foundations[to.index];
    if (pile.length === 0) return first.rank === 1;
    const top = pile[pile.length - 1];
    return first.suit === top.suit && first.rank === top.rank + 1;
  }
  if (to.kind === 'tableau') {
    const pile = game.tableau[to.index];
    if (pile.length === 0) return first.rank === 13;
    const top = pile[pile.length - 1];
    return isRed(first.suit) !== isRed(top.suit) && first.rank === top.rank - 1;
  }
  return false;
}

function withoutCards(game: Game, from: Pile, index: number): Game {
  if (from.kind === 'waste') {
    return { ...game, waste: game.waste.slice(0, index).map((card) => clone(card)) };
  }
  if (from.kind === 'foundation') {
    const foundations = game.foundations.map((pile) =>
      pile.map((card) => clone(card)),
    ) as Game['foundations'];
    foundations[from.index] = foundations[from.index].slice(0, index);
    return { ...game, foundations };
  }
  const tableau = game.tableau.map((pile) => pile.map((card) => clone(card))) as Game['tableau'];
  tableau[from.index] = tableau[from.index].slice(0, index);
  const uncovered = tableau[from.index][tableau[from.index].length - 1];
  if (uncovered && !uncovered.faceUp) uncovered.faceUp = true;
  return { ...game, tableau };
}

function withCards(game: Game, to: Pile, cards: Card[]): Game {
  const placed = cards.map((card) => clone(card, true));
  if (to.kind === 'foundation') {
    const foundations = game.foundations.map((pile) =>
      pile.map((card) => clone(card)),
    ) as Game['foundations'];
    foundations[to.index] = [...foundations[to.index], ...placed];
    return { ...game, foundations };
  }
  if (to.kind !== 'tableau') return game;
  const tableau = game.tableau.map((pile) => pile.map((card) => clone(card))) as Game['tableau'];
  tableau[to.index] = [...tableau[to.index], ...placed];
  return { ...game, tableau };
}

export function movableCards(game: Game, from: Pile, index: number): Card[] | null {
  const cards = sourceCards(game, from, index);
  if (!cards || !isMovableSequence(cards)) return null;
  return cards;
}

export function move(game: Game, from: Pile, index: number, to: Pile): Game | null {
  if (
    from.kind === to.kind &&
    (from.kind === 'waste' || to.kind === 'waste' || from.index === to.index)
  ) {
    return null;
  }
  const cards = sourceCards(game, from, index);
  if (!cards || !isMovableSequence(cards) || !canPlace(game, cards, to)) return null;
  return withCards(withoutCards(game, from, index), to, cards);
}

export function isWon(game: Game): boolean {
  return game.foundations.every((pile) => pile.length === 13);
}

export function emptyGame(): Game {
  return {
    stock: [],
    waste: [],
    foundations: emptyFoundations(),
    tableau: [[], [], [], [], [], [], []],
  };
}
