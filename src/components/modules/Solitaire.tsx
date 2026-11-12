import { useState, type JSX, type PointerEvent as ReactPointerEvent } from 'react';
import WindowBox from '../elements/WindowBox';
import { useDesktop } from '../../desktop/useDesktop';
import {
  type Card,
  type Game,
  type Pile,
  cardName,
  createGame,
  draw,
  isRed,
  isWon,
  movableCards,
  move,
  pileFromId,
  pileId,
  rankGlyph,
  suitGlyph,
} from './solitaire';

const CARD_HEIGHT = 94;
const FAN = 18;
const FACE_DOWN_STEP = 12;

type Drag = {
  from: Pile;
  index: number;
  cards: Card[];
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
};

const cardTop = (cards: Card[], index: number, compact: boolean) => {
  const fan = compact ? 14 : FAN;
  const hidden = compact ? 8 : FACE_DOWN_STEP;
  let top = 0;
  for (let cursor = 0; cursor < index; cursor += 1) top += cards[cursor].faceUp ? fan : hidden;
  return top;
};

function CardFace({ card }: { card: Card }): JSX.Element {
  return (
    <>
      <span className="card-corner">
        {rankGlyph(card.rank)}
        <span>{suitGlyph(card.suit)}</span>
      </span>
      <span className="card-center" aria-hidden="true">
        {suitGlyph(card.suit)}
      </span>
    </>
  );
}

function SolitaireTable({
  game,
  onGame,
  compact = false,
}: {
  game: Game;
  onGame: (game: Game) => void;
  compact?: boolean;
}): JSX.Element {
  const [drag, setDrag] = useState<Drag | null>(null);
  const cardHeight = compact ? 62 : CARD_HEIGHT;
  const wasteStep = compact ? 12 : 18;

  const beginDrag = (event: ReactPointerEvent<HTMLButtonElement>, from: Pile, index: number) => {
    if (event.button !== 0) return;
    const cards = movableCards(game, from, index);
    if (!cards) return;
    const rect = event.currentTarget.getBoundingClientRect();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // This environment cannot capture the pointer. The button still receives the release.
    }
    setDrag({
      from,
      index,
      cards,
      x: event.clientX,
      y: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    });
  };

  const finishDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    const hits = document.elementsFromPoint?.(event.clientX, event.clientY) ?? [];
    const target = hits
      .map((node) => (node instanceof Element ? node.closest('[data-pile]') : null))
      .find((node) => node instanceof HTMLElement);
    const pile = target?.dataset.pile ? pileFromId(target.dataset.pile) : null;
    if (pile) {
      const next = move(game, drag.from, drag.index, pile);
      if (next) onGame(next);
    }
    setDrag(null);
  };

  const trackDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    setDrag({ ...drag, x: event.clientX, y: event.clientY });
  };

  const cancelDrag = () => setDrag(null);

  const dragHandlers = (from: Pile, index: number) => ({
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => beginDrag(event, from, index),
    onPointerMove: trackDrag,
    onPointerUp: finishDrag,
    onPointerCancel: cancelDrag,
  });

  const wasteShown = game.waste.slice(-3);

  return (
    <div className="solitaire">
      <div className="solitaire-menu">
        <button
          type="button"
          className="button-shadow"
          onClick={() => {
            setDrag(null);
            onGame(createGame());
          }}
        >
          New Game
        </button>
        {isWon(game) ? <p className="solitaire-win">You win</p> : null}
      </div>
      <div className="solitaire-felt">
        <div className="solitaire-top">
          <div className="solitaire-stock">
            <button
              type="button"
              className="pile-slot"
              aria-label={game.stock.length > 0 ? 'Deal' : 'Recycle the stock'}
              disabled={game.stock.length === 0 && game.waste.length === 0}
              onClick={() => onGame(draw(game))}
            >
              {game.stock.length > 0 ? <span className="card-back" /> : null}
            </button>
            <div className="solitaire-waste" data-pile="waste" aria-label="Waste">
              {wasteShown.map((card, shownIndex) => {
                const index = game.waste.length - wasteShown.length + shownIndex;
                const topCard = shownIndex === wasteShown.length - 1;
                return topCard ? (
                  <button
                    key={card.id}
                    type="button"
                    className={isRed(card.suit) ? 'playing-card is-red' : 'playing-card'}
                    style={{ left: shownIndex * wasteStep }}
                    aria-label={cardName(card)}
                    {...dragHandlers({ kind: 'waste' }, index)}
                  >
                    <CardFace card={card} />
                  </button>
                ) : (
                  <div
                    key={card.id}
                    className={isRed(card.suit) ? 'playing-card is-red' : 'playing-card'}
                    style={{ left: shownIndex * wasteStep }}
                  >
                    <CardFace card={card} />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="solitaire-foundations">
            {game.foundations.map((pile, index) => {
              const top = pile[pile.length - 1];
              return (
                <div
                  key={index}
                  className="pile-slot"
                  data-pile={pileId({ kind: 'foundation', index })}
                >
                  {top ? (
                    <button
                      type="button"
                      className={isRed(top.suit) ? 'playing-card is-red' : 'playing-card'}
                      aria-label={cardName(top)}
                      {...dragHandlers({ kind: 'foundation', index }, pile.length - 1)}
                    >
                      <CardFace card={top} />
                    </button>
                  ) : (
                    <span className="pile-empty">A</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="solitaire-columns">
          {game.tableau.map((column, index) => (
            <div
              key={index}
              className="tableau-column"
              data-pile={pileId({ kind: 'tableau', index })}
              style={{
                height: column.length
                  ? cardTop(column, column.length - 1, compact) + cardHeight
                  : cardHeight,
              }}
            >
              {column.length === 0 ? <span className="pile-empty">K</span> : null}
              {column.map((card, cardIndex) =>
                card.faceUp ? (
                  <button
                    key={card.id}
                    type="button"
                    className={isRed(card.suit) ? 'playing-card is-red' : 'playing-card'}
                    style={{ top: cardTop(column, cardIndex, compact) }}
                    aria-label={cardName(card)}
                    {...dragHandlers({ kind: 'tableau', index }, cardIndex)}
                  >
                    <CardFace card={card} />
                  </button>
                ) : (
                  <div
                    key={card.id}
                    className="card-back"
                    style={{ top: cardTop(column, cardIndex, compact) }}
                  />
                ),
              )}
            </div>
          ))}
        </div>
        {drag ? (
          <div
            className="solitaire-ghost"
            style={{ left: drag.x - drag.offsetX, top: drag.y - drag.offsetY }}
          >
            {drag.cards.map((card, index) => (
              <div
                key={card.id}
                className={isRed(card.suit) ? 'playing-card is-red' : 'playing-card'}
                style={{ top: index * (compact ? 14 : FAN) }}
              >
                <CardFace card={card} />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Solitaire(): JSX.Element {
  const { compact } = useDesktop();
  const [game, setGame] = useState(createGame);

  return (
    <WindowBox
      name="Solitaire"
      width={0.62}
      content={<SolitaireTable game={game} onGame={setGame} compact={compact} />}
    />
  );
}

export default Solitaire;
export { SolitaireTable };
