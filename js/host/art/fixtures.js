// Interior fixtures: hand-drawn furniture and props shared by the three interior styles,
// each painted through a style palette. Every drawer takes the floor line (feet) as y.
import { pm } from './px.js';
import { rect, hline, vline, fillTile, scale, mix } from './kit.js';
import { sprite, hash, text } from '../gfx.js';

const rep = (row, n) => Array(n).fill(row).join('\n');

/* --------------------------------------------------------------- maps --- */
export const M = {
  // the inside of the front door: frame, a glazed transom, planks, a latch, a mat
  door: pm('rdoor', `
KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
KKGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGKK
KKGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGKK
KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
KKKDDdDDdDDdDDdDDdDDdDDdDDdDDdDKKK
KKKDDdDDdDDdDDdDDdDDdDDdDDdDDdDKKK
KKKDDdDDdDDdDDdDDdDDdDDdDDdDDdDKKK
KKKDDdDDdDDdDDdDDdDDdDDdDDdDDdDKKK
KKKDDdDDdKKKKKKKKKKKKKKKKKdDDdDKKK
KKKDDdDDdKGgGGGGGKGGGGGGGKdDDdDKKK
KKKDDdDDdKGGGGGGGKGGGGGGGKdDDdDKKK
KKKDDdDDdKGGGGGGGKGGGGGGGKdDDdDKKK
KKKDDdDDdKKKKKKKKKKKKKKKKKdDDdDKKK
KKKDDdDDdDDdDDdDDdDDdDDdDDdDDdDKKK
KKKDDdDDdDDdDDdDDdDDdDDdDDdDDdDKKK
KKKDDdDDdDDdDDdDDdDDdDDdDDdDDdDKKK
KKKDDdDDdDDdDDdDDdDDdDDdDDdDDdDKKK
KKKDDdDDdDDdDDdDDdDDdDDdDDdDDdDKKK
KKKDDdDDdDDdDDdDDdDDdDDdDDdDDdDKKK
KKKDDdDDdDDdDDdDDdDDdDDdDDdDDdDKKK
KKKDDdDDdDDdDDdDDdDDdDDdDDdDDdDKKK
KKKDDdDDdDDdDDdDDdDDdDDdDDdyydDKKK
KKKDDdDDdDDdDDdDDdDDdDDdDDdDDdDKKK
KKKDDdDDdDDdDDdDDdDDdDDdDDdDDdDKKK
KKKDDdDDdDDdDDdDDdDDdDDdDDdDDdDKKK
KKKDDdDDdDDdDDdDDdDDdDDdDDdDDdDKKK
KKKDDdDDdDDdDDdDDdDDdDDdDDdDDdDKKK
KKKDDdDDdDDdDDdDDdDDdDDdDDdDDdDKKK
KKKDDdDDdDDdDDdDDdDDdDDdDDdDDdDKKK
KKKDDdDDdDDdDDdDDdDDdDDdDDdDDdDKKK
KKKDDdDDdDDdDDdDDdDDdDDdDDdDDdDKKK
KKKDDdDDdDDdDDdDDdDDdDDdDDdDDdDKKK
KKKDDdDDdDDdDDdDDdDDdDDdDDdDDdDKKK
KKKDDdDDdDDdDDdDDdDDdDDdDDdDDdDKKK
KKKDDdDDdDDdDDdDDdDDdDDdDDdDDdDKKK
KKKDDdDDdDDdDDdDDdDDdDDdDDdDDdDKKK
KKKDDdDDdDDdDDdDDdDDdDDdDDdDDdDKKK
KKKDDdDDdDDdDDdDDdDDdDDdDDdDDdDKKK
KKKDDdDDdDDdDDdDDdDDdDDdDDdDDdDKKK
KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK`),
  chair: pm('chair', `
OOOOOO..........
OllOOO..........
O..OOO..........
O..OOO..........
O..OOO..........
O..OOO..........
O..OOO..........
O..OOO..........
O..OOO..........
O..OOO..........
OOOOOOOOOOOOOOO.
OllllllllllllOO.
O..OO.......OOO.
O..OO.......OOO.
O..OO.......OOO.
O..OO.......OOO.
O..OO.......OOO.
O..OO.......OOO.
O..OO.......OOO.
o..oo.......ooo.`),
  rocker: pm('rocker', `
...OOOOOO...................
...OllOOO...................
...O..OOO...................
...O..OOO...................
...O..OOO...................
...O..OOO...................
...O..OOO...................
...O..OOO...................
...O..OOO...................
...O..OOO...................
...O..OOO...................
...O..OOO...................
...O..OOO...................
...O..OOO...................
...OOOOOOOOOOOOOOOOOOOO.....
...OlllllllllllllllllOO.....
...O..OO............OOO.....
...O..OO............OOO.....
...O..OO............OOO.....
...O..OO............OOO.....
...O..OO............OOO.....
..OOOOOOOOOOOOOOOOOOOOOOO...
.OO....................OOO..
O........................OOO`),
  armchair: pm('armchair', `
CCCCCCCCC.......................
CcccccccC.......................
CcccccccC.......................
CcccccccC.......................
CcccccccC.......................
CcccccccC.......................
CcccccccC.......................
CcccccccC.......................
CcccccccC.......................
CcccccccCCCCCCCCCCCCCCCCCCCCCCC.
CcccccccCccccccccccccccccccccCC.
CcccccccCcccccccccccccccccccccC.
CcccccccCcccccccccccccccccccccC.
CcccccccCCCCCCCCCCCCCCCCCCCCCCC.
CcccccccCLLLLLLLLLLLLLLLLLLLLLC.
CcccccccCLLLLLLLLLLLLLLLLLLLLLC.
CcccccccCLLLLLLLLLLLLLLLLLLLLLC.
CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC.
CCcccccccccccccccccccccccccccCC.
CCcccccccccccccccccccccccccccCC.
CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC.
.OOO......................OOO...
.OOO......................OOO...
.ooo......................ooo...`),
  sofa: pm('sofa', `
CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC
CCccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccCC
CCccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccCC
CCccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccCC
CCCCCCCCccccccccccccccccccccccccccccccccccccccccccccccccccccccccCCCCCCCC
CccccccCccccccccccccccccccccccccccccccccccccccccccccccccccccccccCccccccC
CCCCCCCCccccccccccccccccccccccccccccccccccccccccccccccccccccccccCCCCCCCC
CCCCCCCCccccccccccccccccccccccccccccccccccccccccccccccccccccccccCCCCCCCC
CCCCCCCCccccccccccccccccccccccccccccccccccccccccccccccccccccccccCCCCCCCC
CCCCCCCCccccccccccccccccccccccccccccccccccccccccccccccccccccccccCCCCCCCC
CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC
CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC
CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC
CCCCCCCCLLLLLLLLLLLLLLLLLLLLLLLLLLLCCLLLLLLLLLLLLLLLLLLLLLLLLLLLCCCCCCCC
CCCCCCCCLLLLLLLLLLLLLLLLLLLLLLLLLLLCCLLLLLLLLLLLLLLLLLLLLLLLLLLLCCCCCCCC
CCCCCCCCLLLLLLLLLLLLLLLLLLLLLLLLLLLCCLLLLLLLLLLLLLLLLLLLLLLLLLLLCCCCCCCC
CCCCCCCCLLLLLLLLLLLLLLLLLLLLLLLLLLLCCLLLLLLLLLLLLLLLLLLLLLLLLLLLCCCCCCCC
CCCCCCCCLLLLLLLLLLLLLLLLLLLLLLLLLLLCCLLLLLLLLLLLLLLLLLLLLLLLLLLLCCCCCCCC
CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC
CCCCCCCCCCccccccccccccccccccccccccccccccccccccccccccccccccccccCCCCCCCCCC
CCCCCCCCCCccccccccccccccccccccccccccccccccccccccccccccccccccccCCCCCCCCCC
CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC
..OOOO............................................................OOOO..
..OOOO............................................................OOOO..
..OOOO............................................................OOOO..
..oooo............................................................oooo..`),
  bed: pm('bed', `
OllO....................................................................
OOOO....................................................................
OllO....................................................................
OllO....................................................................
OllO....................................................................
OllO....................................................................
OllO.PWWWWWWWWWWWWP.....................................................
OllO.PPPPPPPPPPPPPP.....................................................
OllO.PPPPPPPPPPPPPP.....................................................
OllOQPPPPPPPPPPPPPPqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqq....
OllOqppppppppppppppQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQ....
OllOqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQ....
OOOOQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqOllO
OOOOWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWOOOO
OOOOqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQOOOO
OOOOqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQOOOO
OOOOllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllOOOO
OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO
OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO
OOOOooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooOOOO
OOOOooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooOOOO
OOOOooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooOOOO
OOOOooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooOOOO
OOOOooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooOOOO
OOOOooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooOOOO
OOOOooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooOOOO
OOOO................................................................OOOO
OOOO................................................................OOOO
OOOO................................................................OOOO
oooo................................................................oooo`),
  dresser: pm('dresser', `
OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO
OllllllllllllllllllllllllllllllllllllllllllllllllllllllllllO
oooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo
OOooooooooooooooooooooooooooooooooooooooooooooooooooooooooOO
OOoooWWWWWWoooWWWWWWoooWWWWWWoooWWWWWWoooWWWWWWoooWWWWWWooOO
OOoooWBBBBWoooWBBBBWoooWBBBBWoooWBBBBWoooWBBBBWoooWBBBBWooOO
OOoooWBWWBWoooWBWWBWoooWBWWBWoooWBWWBWoooWBWWBWoooWBWWBWooOO
OOoooWBWWBWoooWBWWBWoooWBWWBWoooWBWWBWoooWBWWBWoooWBWWBWooOO
OOoooWBBBBWoooWBBBBWoooWBBBBWoooWBBBBWoooWBBBBWoooWBBBBWooOO
OOoooWWWWWWoooWWWWWWoooWWWWWWoooWWWWWWoooWWWWWWoooWWWWWWooOO
OOllllllllllllllllllllllllllllllllllllllllllllllllllllllllOO
OOooooooooooooooooooooooooooooooooooooooooooooooooooooooooOO
OOooooooooooooooooooooooooooooooooooooooooooooooooooooooooOO
OOooooooooooooooooooooooooooooooooooooooooooooooooooooooooOO
OOooooooooooooooooooooooooooooooooooooooooooooooooooooooooOO
OOooooooWWWWWWoooooooWWWWWWoooooooWWWWWWoooooooWWWWWWoooooOO
OOooooooWBBBBWWooooooWBBBBWWooooooWBBBBWWooooooWBBBBWWooooOO
OOooooooWWWWWWWooooooWWWWWWWooooooWWWWWWWooooooWWWWWWWooooOO
OOooooooWWWWWWWooooooWWWWWWWooooooWWWWWWWooooooWWWWWWWooooOO
OOooooooWWWWWWoooooooWWWWWWoooooooWWWWWWoooooooWWWWWWoooooOO
OOllllllllllllllllllllllllllllllllllllllllllllllllllllllllOO
llllllllllllllllllllllllllllllllllllllllllllllllllllllllllll
OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO
OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO
OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO
OOoooooooooooooooooooooooooooOOoooooooooooooooooooooooooooOO
OOoOOOOOOOOOOOOOOOOOOOOOOOOOoOOoOOOOOOOOOOOOoOOOOOOOOOOOOoOO
OOoOOOOOOOOOOOyyyOOOOOOOOOOOoOOoOOOOOOOOOOOOoOOOOOOOOOOOOoOO
OOoOOOOOOOOOOOOOOOOOOOOOOOOOoOOoOOOOOOOOOOOOoOOOOOOOOOOOOoOO
OOoooooooooooooooooooooooooooOOoOOOOOOOOOOOOoOOOOOOOOOOOOoOO
OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOoOOOOOOOOOOOOoOOOOOOOOOOOOoOO
OOoooooooooooooooooooooooooooOOoOOOOOOOOOOOOoOOOOOOOOOOOOoOO
OOoOOOOOOOOOOOOOOOOOOOOOOOOOoOOoOOOOOOOOOOOOoOOOOOOOOOOOOoOO
OOoOOOOOOOOOOOyyyOOOOOOOOOOOoOOoOOOOOOOOOOOOoyOOOOOOOOOOOoOO
OOoOOOOOOOOOOOOOOOOOOOOOOOOOoOOoOOOOOOOOOOOOoyOOOOOOOOOOOoOO
OOoooooooooooooooooooooooooooOOoOOOOOOOOOOOOoOOOOOOOOOOOOoOO
OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOoOOOOOOOOOOOOoOOOOOOOOOOOOoOO
OOoooooooooooooooooooooooooooOOoOOOOOOOOOOOOoOOOOOOOOOOOOoOO
OOoOOOOOOOOOOOOOOOOOOOOOOOOOoOOoOOOOOOOOOOOOoOOOOOOOOOOOOoOO
OOoOOOOOOOOOOOyyyOOOOOOOOOOOoOOoOOOOOOOOOOOOoOOOOOOOOOOOOoOO
OOoOOOOOOOOOOOOOOOOOOOOOOOOOoOOoOOOOOOOOOOOOoOOOOOOOOOOOOoOO
OOoooooooooooooooooooooooooooOOoooooooooooooooooooooooooooOO
OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO
oooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo`),
  potbelly: pm('potbelly', `
..........IIII..........
..........IIII..........
..........IIII..........
..........IIII..........
..........IIII..........
..........IIII..........
..........IIII..........
........IIIIIIII........
......IIIIIIIIIIII......
....IIIIIIIIIIIIIIII....
...IIIIIIIIIIIIIIIIII...
..IIiIIIIIIIIIIIIIIIII..
..IIiIIIIIIIIIIIIIIIII..
..IIiIIIIIIIIIIIIIIIII..
..IIiIIIIIIIIIIIIIIIII..
..IIiIIIIIIIIIIIIIIIII..
..IIiIIIIIIIIIIIIIIIII..
..IIiIIIIIIIIIIIIIIIII..
..IIiIIIIIIIIIIIIIIIII..
..IIiIIKKKKKKKKKKKIIII..
..IIiIIKFFFFFFFFFKIIII..
..IIiIIKFFFFFFFFFKIIII..
..IIiIIKFFFFFFFFFKIIII..
..IIiIIKFFFFFFFFFKIIII..
..IIiIIKFFFFFFFFFKIIII..
..IIiIIKKKKKKKKKKKIIII..
..IIiIIIIIIIIIIIIIIIII..
..IIiIIIIIIIIIIIIIIIII..
..IIiIIIIIIIIIIIIIIIII..
..IIiIIIIIIIIIIIIIIIII..
...IIIIIIIIIIIIIIIIII...
....IIIIIIIIIIIIIIII....
......IIIIIIIIIIII......
.....III........III.....
.....III........III.....
.....III........III.....
....IIII........IIII....`),
  range: pm('range', `
............................II............
............................II............
............................II............
............................II............
............................II............
IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII
IiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiI
IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII
IIiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiII
IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII
II..KKKKKKKKKKK.........KKKKKKKKKKKKK...II
II..KFFFFFFFFFK.........KiiiiiiiiiiiK...II
II..KFFFFFFFFFK.........KiiiiiiiiiiiK...II
II..KFFFFFFFFFK.........KiiiyyiiiiiiK...II
II..KFFFFFFFFFK.........KiiiiiiiiiiiK...II
II..KFFFFFFFFFK.........KiiiiiiiiiiiK...II
II..KFFFFFFFFFK.........KiiiiiiiiiiiK...II
II..KKKKKKKKKKK.........KiiiiiiiiiiiK...II
II......................KKKKKKKKKKKKK...II
IIiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiII
IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII
II..iiiiiiiiiiiiiii....iiiiiiiiiiiiiii..II
II..i.............i....i.............i..II
II..i.............i....i.............i..II
II..iiiiiiiiiiiiiii....iiiiiiiiiiiiiii..II
IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII
.II....................................II.
.II....................................II.
.II....................................II.
.III..................................III.`),
  kettle: pm('kettle', `
......ii.......
....iiiiii.....
...i......i....
..IIIIIIIIIIII.
.IIIIIIIIIIIIII
.IIIIIIIIIIIIIi
.IIIIIIIIIIIII.
..IIIIIIIIIII..
...IIIIIIIII...`),
  clock: pm('rclock', `
......OOOOOOO......
....OOOOOOOOOOO....
...OOWWWWWWWWWOO...
..OOWWWWWkWWWWWOO..
..OWWWWWWWWWWWWWO..
..OWWkWWWWWWWkWWO..
..OWWWWWWWWWWWWWO..
..OWWWWWWWWWWWWWO..
..OOWWWWWkWWWWWOO..
...OOWWWWWWWWWOO...
....OOOOOOOOOOO....
.....OOOOOOOOO.....
.....O.......O.....
.....O...y...O.....
.....O...y...O.....
.....O...y...O.....
.....O..yyy..O.....
.....O..yyy..O.....
.....OOOOOOOOO.....`),
  hanglamp: pm('hanglamp', `
..........I..........
..........I..........
..........I..........
..........I..........
..........I..........
.........III.........
........SSSSS........
.......SSSSSSS.......
......SSSSSSSSS......
.....SSSSSSSSSSS.....
....SSSSSSSSSSSSS....
...SSSSSSSSSSSSSSS...
..sssssssssssssssss..
......GGGGGGGGG......`),
  tablelamp: pm('tablelamp', `
...SSSSSSSS...
..SSSSSSSSSS..
..SsSSSSSSsS..
.SSSSSSSSSSSS.
.SSSSSSSSSSSS.
SSSSSSSSSSSSSS
ssssssssssssss
......OO......
......OO......
......OO......
......OO......
....OOOOOO....
....oooooo....`),
  candle: pm('candle', `
..Y..
.WWW.
.WWW.
.WWW.
.WWW.
.WWW.
IIIII`),
  jar: pm('jar', `
.lllll.
JJJJJJJ
JjJJJJJ
JjJJJJJ
JjJJJJJ
JjJJJJJ
JJJJJJJ`),
  bottle: pm('bottle', `
..l..
..B..
.BBB.
.BbB.
.BbB.
.BbB.
.BBB.`),
  plant: pm('plant', `
......GG......
....GGGgGG....
...GGgGGGGG...
..GGGGGGgGGG..
...GGGGGGGG...
......GG......
......GG......
....RRRRRR....
...RrRRRRRR...
...RrRRRRRR...
...RrRRRRRR...
....rrrrrr....`),
  radio: pm('radio', `
.......I............
......I.............
OOOOOOOOOOOOOOOOOOOO
OllllllllllllllllllO
OWWWWWWWWWWWWOyyyyyO
OWkkkkkkkkkkWOyYyyyO
OWWWWWWWWWWWWOyyyyyO
OOoooooooooooOOOOOOO
OoOoOoOoOoOoOOOIIOOO
OoOoOoOoOoOoOOOOOOOO
OOOOOOOOOOOOOOOOOOOO`),
  sewing: pm('sewing', `
....IIIIIIIIIIIIIII.......
....IIIiiiiiiiiiiII.......
....II.........III........
....II.........IIII.......
....II.........IIII.......
....II.........III........
....II........WW..........
IIIIIIIIIIIIIIIIIIIIIIIIII
IiiiiiiiiiiiiiiiiiiiiiiiiI
IIIIIIIIIIIIIIIIIIIIIIIIII`),
  toyboat: pm('toyboat', `
......W......
......WW.....
......WWW....
......WWWW...
......W......
RRRRRRRRRRRRR
.RRRRRRRRRRR.
..rrrrrrrrr..`),
  blocks: pm('blocks', `
....BBBBB....
....BbBBB....
....BBBBB....
RRRRRRYYYYYY.
RrRRRRYyYYYY.
RRRRRRYYYYYY.`),
  catbasket: pm('catbasket', `
.OOOOOOOOOOOOOOOOOOOO.
OoOoOoOoOoOoOoOoOoOoOO
OOoOoOoOoOoOoOoOoOoOoO
.OOOOOOOOOOOOOOOOOOOO.`),
  boots: pm('rboots', `
.BB.....BB....
.BB.....BB....
.BB.....BB....
.BB.....BB....
.BB.....BB....
.BB.....BB....
.BB.....BB....
.BBBB...BBBB..
.BBBB...BBBB..
.bbbb...bbbb..`),
  bucket: pm('rbucket', `
...ii...
..i..i..
.i....i.
IIIIIIII
IiIIIIII
IiIIIIII
IiIIIIII
IiIIIIII
IIIIIIII
.iiiiii.`),
  scales: pm('scales', `
..........yyyy..........
........yy....yy........
.......y........y.......
......y..........y......
yyyyyyy..........yyyyyyy
y.....y..........y.....y
yYYYYYy..........yYYYYYy
......y..........y......
......y..........y......
......yyyyyyyyyyyy......
..........yyyy..........
..........yyyy..........
........yyyyyyyy........
........YYYYYYYY........`),
  register: pm('register', `
..iiiiiiiiiiiiii..
.IIIIIIIIIIIIIIII.
.IWWWWWWWWWWWWWWI.
.IWkkkkkkkkkkkkWI.
.IWWWWWWWWWWWWWWI.
.IIIIIIIIIIIIIIII.
.IyIyIyIyIyIyIyII.
.IIIIIIIIIIIIIIII.
.IyIyIyIyIyIyIyII.
.IIIIIIIIIIIIIIII.
.IyIyIyIyIyIyIyII.
.IIIIIIIIIIIIIIII.
iiiiiiiiiiiiiiiiii`),
  icecrate: pm('icecrate', `
NNNNNNNNNNNNNNNNNNNNNN
NnNNNNNNNNNNNNNNNNNnNN
OOOOOOOOOOOOOOOOOOOOOO
OlOOOOOOOOOOOOOOOOOOoO
OlOOOOOOOOOOOOOOOOOOoO
OlOOOOOOOOOOOOOOOOOOoO
OllllllllllllllllllloO
OlOOOOOOOOOOOOOOOOOOoO
OlOOOOOOOOOOOOOOOOOOoO
OlOOOOOOOOOOOOOOOOOOoO
oooooooooooooooooooooo`),
  driedfish: pm('driedfish', `
...I...
..III..
..FFF..
.FFFFF.
.FfFFF.
.FfFFF.
.FFFFF.
..FFF..
..FFF..
.FF.FF.`),
  netwall: pm('netwall', `
R...R...R...R...R...R...R...R...R...R...
.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R
..R...R...R...R...R...R...R...R...R...R.
.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R
R...R...R...R...R...R...R...R...R...R...
.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R
..R...R...R...R...R...R...R...R...R...R.
.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R
R...R...R...R...R...R...R...R...R...R...
.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R
..R...R...R...R...R...R...R...R...R...R.
.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R.R
R...R...R...R...R...R...R...R...R...R...
.YYY......YYY.......YYY.......YYY.......`),
  lifering: pm('lifering', `
.....WWWWWW.....
...WWRRRRRRWW...
..WRRWWWWWWRRW..
.WRWW......WWRW.
.WRW........WRW.
WWWW........WWWW
WRW..........WRW
WRW..........WRW
WWWW........WWWW
.WRW........WRW.
.WRWW......WWRW.
..WRRWWWWWWRRW..
...WWRRRRRRWW...
.....WWWWWW.....`),
  oars: pm('oars', `
.O....O.
.O....O.
.O....O.
.O....O.
.O....O.
.O....O.
.O....O.
.O....O.
.O....O.
.O....O.
.O....O.
.O....O.
.O....O.
.O....O.
.O....O.
.O....O.
OOO..OOO
OOO..OOO
OOO..OOO
OOO..OOO
OOO..OOO
.O....O.`),
  trestle: pm('trestle', `
OOOOOOOOOOOOOOOOOOOOOOOOOOOO
OllllllllllllllllllllllllllO
..OO....................OO..
..OO....................OO..
..OO....................OO..
..OO....................OO..
..OOOOOOOOOOOOOOOOOOOOOOOO..
..OO....................OO..
..OO....................OO..
..OO....................OO..
..OO....................OO..
..OO....................OO..
..OO....................OO..
.oooo..................oooo.`),
  antlers: pm('antlers', `
O.....O.......O.....O
OO...OO.......OO...OO
.OO.OO.........OO.OO.
..OOO...........OOO..
...OO...........OO...
...OOO.........OOO...
....OOO.......OOO....
.....OOOOOOOOOOO.....
........WWWWW........
........WWWWW........`),
  sheepskin: pm('sheepskin', `
....WWWWWWWWWWWWWWWWWWWW....
..WWWWwWWWWWWWWWWWwWWWWWWW..
.WWWWWWWWWWwWWWWWWWWWWWWWWW.
WWWwWWWWWWWWWWWWWwWWWWWWwWWW
.WWWWWWWWwWWWWWWWWWWWWWWWWW.
..WWWWWWWWWWWWWwWWWWWWWWWW..
....WWWWWWWWWWWWWWWWWWWW....`),
  skisIn: pm('skisin', `
.OO.OO.
.OO.OO.
.OO.OO.
.OO.OO.
.OO.OO.
.OO.OO.
.OO.OO.
.OO.OO.
.OO.OO.
.OO.OO.
.OO.OO.
.OO.OO.
.OO.OO.
.OO.OO.
.OO.OO.
.OO.OO.
OO...OO`),
  pans: pm('pans', `
.CCCCC...CCCCC..
CCCCCCC.CCCCCCC.
CCcCCCC.CCcCCCC.
CCCCCCC.CCCCCCC.
.CCCCC...CCCCC..
...II......II...`),
  teapot: pm('teapot', `
.....ii.......
....iiii......
..IIIIIIII....
.IIIIIIIIIIi..
iIIIIIIIIIIIi.
iIIIIIIIIIIIi.
.IIIIIIIIII...
..IIIIIIII....`),
  plates: pm('plates', `
.WWWWW...WWWWW...WWWWW..
WWBBBWW.WWBBBWW.WWBBBWW.
WWBBBWW.WWBBBWW.WWBBBWW.
.WWWWW...WWWWW...WWWWW..`),
  ropecoil: pm('rropecoil', `
...RRRRRRRR...
.RRrRRRRRRrRR.
RrRRRRRRRRRRrR
RRrRRRRRRRRrRR
.RRrrRRRRrrRR.
...RRRRRRRR...`),
  chart: pm('chart', `
PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP
PppppppppppppppppppppppppppppppppppppppP
Pp.......bbbb........................ppP
Pp....bbbbbbbbbb....b..............b.ppP
Pp..bbbbbbbbbbbbbb.bbb...........bbb.ppP
Pp.bbbbbbbbbbbbbbbbbbbbb.........bb..ppP
Pp..bbbbbbbbbbbbbbbbbb..............ppP.
Pp....bbbbbbbbbbbbb.........k.......ppP.
Pp.......bbbbbb............kkk......ppP.
Pp..........................k.......ppP.
PppppppppppppppppppppppppppppppppppppppP
PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP`),
  bottleship: pm('bottleship', `
....GGGGGGGGGGGGGGGGGGGG..
..GGGGGGGGGGGGGGGGGGGGGGGG
.GGGGGGGGWWGGGGGGGGGGGGGGG
.GGGGGGGWWWWGGGGGGGGGGGGGG
.GGGGGGWWWWWWGGGGGGGGGGGGG
.GGGGGGGGOOGGGGGGGGGGGGGGG
.GGGGGOOOOOOOOGGGGGGGGGGGG
..GGGGGGGGGGGGGGGGGGGGGGGG
....GGGGGGGGGGGGGGGGGGGG..
.....OOOOOOOOOOOOOOOOOO...`),
  pendant: pm('pendant', `
....I....
....I....
....I....
...III...
..IGGGI..
..IGGGI..
..IGGGI..
..IIIII..`),
  bunk: pm('bunk', `
OlOO............................................................................OlOO....
OlOO............................................................................OlOO....
OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO....
OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO....
OlOO............................................................................OlOOOOOO
OlOO............................................................................OlOOOO..
OlOO............................................................................OlOOOO..
OlOO............................................................................OlOOOO..
OlOO............................................................................OlOOOOOO
OlOO............................................................................OlOOOOOO
OlOO............................................................................OlOOOO..
OlOO............................................................................OlOOOO..
OlOO............................................................................OlOOOO..
OlOO............................................................................OlOOOO..
OlOO............................................................................OlOOOO..
OlOO............................................................................OlOOOO..
OlOOOPWWWWWWWWWWWWPllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllOOlOOOO..
OlOOOPPPPPPPPPPPPPPOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOlOOOOOO
OlOOQPPPPPPPPPPPPPPqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQOlOOOOOO
OlOOqPPPPPPPPPPPPPPQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqOlOOOO..
OlOOQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQOlOOOO..
OlOOqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqOlOOOO..
OlOOQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQqqqqQQQQOlOOOO..
OlOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOlOOOO..
OlOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOlOOOO..
OlOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOlOOOO..
OlOOooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooOlOOOOOO
OlOO............................................................................OlOOOOOO
OlOO............................................................................OlOOOO..
OlOO............................................................................OlOOOO..
OlOO............................................................................OlOOOO..
OlOO............................................................................OlOOOO..
OlOO............................................................................OlOOOO..
OlOO............................................................................OlOOOO..
OlOO............................................................................OlOOOO..
OlOO............................................................................OlOOOOOO
OlOO............................................................................OlOOOOOO
OlOO............................................................................OlOOOO..
OlOO............................................................................OlOOOO..
OlOO............................................................................OlOOOO..
OlOO............................................................................OlOOOO..
OlOO............................................................................OlOOOO..
OlOO............................................................................OlOOOO..
OlOO............................................................................OlOOOO..
OlOO............................................................................OlOOOOOO
OlOO............................................................................OlOOOOOO
OlOOOPWWWWWWWWWWWWPllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllOOlOOOO..
OlOOOPPPPPPPPPPPPPPOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOlOOOO..
OlOOQPPPPPPPPPPPPPPpPPPPppppPPPPppppPPPPppppPPPPppppPPPPppppPPPPppppPPPPppppPPPPOlOOOO..
OlOOqPPPPPPPPPPPPPPPppppPPPPppppPPPPppppPPPPppppPPPPppppPPPPppppPPPPppppPPPPppppOlOOOO..
OlOOQQQQqqqqQQQQqqqpPPPPppppPPPPppppPPPPppppPPPPppppPPPPppppPPPPppppPPPPppppPPPPOlOOOO..
OlOOqqqqQQQQqqqqQQQPppppPPPPppppPPPPppppPPPPppppPPPPppppPPPPppppPPPPppppPPPPppppOlOOOO..
OlOOQQQQqqqqQQQQqqqpPPPPppppPPPPppppPPPPppppPPPPppppPPPPppppPPPPppppPPPPppppPPPPOlOOOO..
OlOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOlOOOOOO
OlOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOlOOOOOO
OlOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOlOOOO..
OlOOooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooOlOOOO..
OlOO............................................................................OlOOOO..
OlOO............................................................................OlOOOO..
OlOO............................................................................OlOOOO..
OlOO............................................................................OlOOOO..
oooo............................................................................ooooOO..`),
};

/* ------------------------------------------------------------ drawing --- */
export const at = (g, map, pal, x, y) => g.drawImage(sprite(map, pal), x, y);
/** Bottom-left anchored: the map's last row sits on the floor line y. */
export const onFloor = (g, map, pal, x, y) => g.drawImage(sprite(map, pal), x, y - map.length);

/** Flat shelf with brackets. */
export function shelf(g, x, y, w, col) { rect(g, x, y, w, 3, col); hline(g, x, y, w, mix(col, '#ffffff', 0.3)); rect(g, x + 2, y + 3, 2, 3, scale(col, 0.7)); rect(g, x + w - 4, y + 3, 2, 3, scale(col, 0.7)); }
/** A row of books, spines in mixed colours. */
export function books(g, x, y, n, seed) {
  let px = x;
  for (let i = 0; i < n; i++) { const h = 8 + (hash(seed, i) * 6 | 0), col = ['#8a3a3a', '#3a5a8a', '#5a7a3a', '#b8903a', '#6a4a7a', '#3a6a6a', '#a06a4a'][(hash(seed, i, 1) * 7) | 0]; rect(g, px, y - h, 3, h, col); rect(g, px + 1, y - h + 2, 1, 1, mix(col, '#ffffff', 0.5)); rect(g, px + 1, y - 3, 1, 1, mix(col, '#ffffff', 0.5)); px += 3 + (hash(seed, i, 2) < 0.2 ? 2 : 0); }
  return px;
}
/** A framed picture with a little painted scene. */
export function picture(g, x, y, w, h, kind, frame = '#8a6a44') {
  rect(g, x - 2, y - 2, w + 4, h + 4, frame); rect(g, x - 1, y - 1, w + 2, h + 2, scale(frame, 0.6));
  if (kind === 'lake') { rect(g, x, y, w, h * 0.5, '#7a9ab8'); rect(g, x, y + h * 0.5, w, h * 0.5, '#3e6f90'); rect(g, x + 2, y + h * 0.35, w - 4, 2, '#4d5e55'); rect(g, x + w * 0.6, y + h * 0.6, 4, 2, '#5c4030'); rect(g, x + w * 0.2, y + 2, 3, 3, '#fff2b0'); }
  else if (kind === 'portrait') { rect(g, x, y, w, h, '#c9b9a0'); rect(g, x + w / 2 - 2, y + 3, 4, 4, '#e6c3a0'); rect(g, x + w / 2 - 3, y + 2, 6, 2, '#3a2a1c'); rect(g, x + w / 2 - 4, y + 7, 8, h - 8, '#4a5a6a'); }
  else if (kind === 'boat') { rect(g, x, y, w, h, '#b9cbd6'); rect(g, x, y + h - 6, w, 6, '#4a6a8a'); rect(g, x + 2, y + h - 7, w - 4, 3, '#5c4030'); rect(g, x + w / 2, y + 2, 1, h - 8, '#3a2a1c'); rect(g, x + w / 2 + 1, y + 3, 5, 4, '#e8e2d2'); }
  else if (kind === 'crayon') { rect(g, x, y, w, h, '#f0ead8'); rect(g, x + 2, y + 2, 4, 4, '#f2c14e'); rect(g, x + 4, y + h - 5, 6, 3, '#ff8c66'); rect(g, x + 10, y + h - 4, 2, 1, '#ff8c66'); rect(g, x + w - 6, y + 4, 3, 3, '#7fe0c3'); rect(g, x + 2, y + h - 2, w - 4, 1, '#5e8a4a'); }
  else if (kind === 'map') { rect(g, x, y, w, h, '#d8c8a0'); rect(g, x + 3, y + 3, w * 0.4, h * 0.5, '#a8b890'); rect(g, x + w * 0.55, y + 5, w * 0.35, h * 0.6, '#a8b890'); rect(g, x + 2, y + h - 4, w - 4, 1, '#8a7a5a'); rect(g, x + w * 0.5, y + h * 0.4, 2, 2, '#c84a3a'); }
  else if (kind === 'ship') { rect(g, x, y, w, h, '#3a4a5a'); rect(g, x, y + h - 5, w, 5, '#2c3f50'); rect(g, x + 4, y + h - 8, w - 8, 3, '#1a1712'); rect(g, x + w / 2 - 1, y + 2, 1, h - 10, '#e8e2d2'); rect(g, x + w / 2, y + 3, 6, 5, '#e8e2d2'); rect(g, x + w / 2 - 7, y + 4, 6, 4, '#d8d0bc'); }
}
/** A plain table: top, apron, two legs. */
export function table(g, x, y, w, col, h = 14) {
  rect(g, x, y - h, w, 3, col); hline(g, x, y - h, w, mix(col, '#ffffff', 0.3)); rect(g, x + 1, y - h + 3, w - 2, 2, scale(col, 0.8));
  rect(g, x + 2, y - h + 5, 3, h - 5, scale(col, 0.85)); rect(g, x + w - 5, y - h + 5, 3, h - 5, scale(col, 0.85));
}
/** A waist-high counter with a top; the keeper stands behind it. */
export function counter(g, x, y, w, top, front, panels = true) {
  rect(g, x, y - 14, w, 14, front); hline(g, y - 4 > 0 ? x : x, y - 4, w, scale(front, 0.7));
  if (panels) for (let xx = x + 2; xx < x + w - 10; xx += 24) { rect(g, xx, y - 12, 20, 9, scale(front, 0.85)); rect(g, xx + 1, y - 11, 18, 7, front); hline(g, xx + 1, y - 11, 18, mix(front, '#ffffff', 0.15)); }
  rect(g, x - 3, y - 17, w + 6, 3, top); hline(g, x - 3, y - 17, w + 6, mix(top, '#ffffff', 0.35)); hline(g, x - 3, y - 15, w + 6, scale(top, 0.7));
}
/** A rug: banded pattern in two colours with a fringe, or a plain sheepskin for the north. */
export function rug(g, x, y, w, h, a, b, style) {
  if (style === 'north') { for (let i = 0; i < w; i += 26) at(g, M.sheepskin, { W: '#ece6da', w: '#d0c8b8' }, x + i, y); return; }
  rect(g, x, y, w, h, a);
  for (let yy = y + 2; yy < y + h - 2; yy += 3) hline(g, x + 3, yy, w - 6, b);
  if (style === 'harbour') { for (let xx = x + 4; xx < x + w - 4; xx += 8) rect(g, xx, y + 2, 4, h - 4, mix(a, b, 0.5)); }
  else { rect(g, x + 4, y + 4, w - 8, h - 8, a); for (let xx = x + 6; xx < x + w - 8; xx += 6) for (let yy = y + 6; yy < y + h - 6; yy += 4) rect(g, xx + ((yy - y) / 4 % 2 ? 2 : 0), yy, 2, 1, b); }
  hline(g, x, y, w, scale(a, 0.7)); hline(g, x, y + h - 1, w, scale(a, 0.7)); vline(g, x, y, h, scale(a, 0.7)); vline(g, x + w - 1, y, h, scale(a, 0.7));
  for (let xx = x; xx < x + w; xx += 2) { vline(g, xx, y - 2, 2, '#d8d0bc'); vline(g, xx, y + h, 2, '#d8d0bc'); }
}
export { rect, hline, vline, fillTile, scale, mix, hash, text };
