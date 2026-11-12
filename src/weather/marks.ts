import type { WeatherKind } from './forecast';

/**
 * 16×16 pixel marks. `.` is empty. The desktop icon is the partly-cloudy mark.
 * y sun, Y highlight, r ray, w cloud, o outline, b rain, n snow, l bolt, f/F fog.
 */
const FRAMES: Record<WeatherKind, readonly string[]> = {
  clear: [
    '................',
    '.......rr.......',
    '..r....rr....r..',
    '.......rr.......',
    '....rrrrrrrr....',
    '...ryyyyyyyyr...',
    '..ryyyyyyyyyyr..',
    'rrryyyyYyyyyyrrr',
    'rrryyyyyyyyyyrrr',
    '..ryyyyyyyyyyr..',
    '...ryyyyyyyyr...',
    '....rrrrrrrr....',
    '.......rr.......',
    '..r....rr....r..',
    '.......rr.......',
    '................',
  ],
  partly: [
    '................',
    '.r..rr..........',
    '....rr...r......',
    '..ryyyyyyr......',
    '.rryyyyyyyrr..o.',
    '..ryyyyyyr..owwo',
    '...rrrr..oowwww.',
    '........owwwwww.',
    '......oowwwwwww.',
    '.....owwwwwwwww.',
    '.....owwwwwwwwo.',
    '......ooooooo...',
    '................',
    '................',
    '................',
    '................',
  ],
  cloudy: [
    '................',
    '................',
    '................',
    '......oooo......',
    '....oowwwwoo....',
    '...owwwwwwwwo...',
    '..owwwwwwwwwwo..',
    '..owwwwwwwwwwo..',
    '..owwwwwwwwwwo..',
    '...owwwwwwwwo...',
    '....oooooooo....',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  fog: [
    '................',
    '................',
    '................',
    '..ffffffffffff..',
    '..FFFFFFFFFFFF..',
    '................',
    '.ffffffffffffff.',
    '.FFFFFFFFFFFFFF.',
    '................',
    '..ffffffffffff..',
    '..FFFFFFFFFFFF..',
    '................',
    '.ffffffffffffff.',
    '.FFFFFFFFFFFFFF.',
    '................',
    '................',
  ],
  rain: [
    '................',
    '.....oooo.......',
    '...oowwwwoo.....',
    '..owwwwwwwwo....',
    '.owwwwwwwwwwwo..',
    '.owwwwwwwwwwwo..',
    '..ooooooooooo...',
    '....b....b....b.',
    '...bb...bb...bb.',
    '....b....b....b.',
    '...b....b....b..',
    '..bb...bb...bb..',
    '................',
    '................',
    '................',
    '................',
  ],
  snow: [
    '................',
    '.....oooo.......',
    '...oowwwwoo.....',
    '..owwwwwwwwo....',
    '.owwwwwwwwwwwo..',
    '.owwwwwwwwwwwo..',
    '..ooooooooooo...',
    '....n....n....n.',
    '...nnn..nnn..nn.',
    '....n....n....n.',
    '...n....n....n..',
    '..nnn..nnn..nn..',
    '................',
    '................',
    '................',
    '................',
  ],
  storm: [
    '................',
    '.....oooo.......',
    '...oowwwwoo.....',
    '..owwwwwwwwo....',
    '.owwwwwwwwwwwo..',
    '.owwwwwwwwwwwo..',
    '..ooooooooooo...',
    '.......ll.......',
    '......lll.......',
    '.....llll.......',
    '......ll........',
    '.....ll.........',
    '....ll..........',
    '................',
    '................',
    '................',
  ],
};

const FILLS: Record<string, string> = {
  y: '#F8CC00',
  Y: '#FFEC78',
  r: '#D68400',
  w: '#FFFFFF',
  o: '#404040',
  b: '#1848C8',
  n: '#FFFFFF',
  l: '#F8D000',
  f: '#5A5A5A',
  F: '#AAAAAA',
};

export type MarkPixel = { x: number; y: number; fill: string };

export function markPixels(kind: WeatherKind): MarkPixel[] {
  const rows = FRAMES[kind];
  const pixels: MarkPixel[] = [];
  rows.forEach((row, y) => {
    if (row.length !== 16) throw new Error('Weather mark must be 16 pixels wide');
    [...row].forEach((cell, x) => {
      const fill = FILLS[cell];
      if (fill) pixels.push({ x, y, fill });
    });
  });
  if (rows.length !== 16) throw new Error('Weather mark must be 16 pixels tall');
  return pixels;
}
