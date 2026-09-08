/**
 * Segmentacion del guion en parrafos y frases.
 *
 * Es la base de las estadisticas (requisito 12) y del analisis de
 * interpretacion (requisito 5): cada frase recibe indices de inicio y fin
 * dentro del texto limpio, de modo que se pueden cruzar con los marcadores.
 */

import { countWords, deburr } from './text.js';

/** Abreviaturas frecuentes que NO terminan una frase. */
const ABBREVIATIONS = new Set([
  'sr', 'sra', 'srta', 'dr', 'dra', 'lic', 'ing', 'arq', 'prof', 'mtro',
  'ud', 'uds', 'av', 'avda', 'cra', 'clle', 'no', 'nro', 'num', 'pag', 'pags',
  'art', 'cap', 'fig', 'vol', 'ed', 'etc', 'aprox', 'vs', 'ej', 'p', 'a', 'd',
  'ee', 'uu', 'ss', 'min', 'seg', 'km', 'kg', 'mr', 'mrs', 'ms', 'st', 'inc',
]);

const TERMINATORS = new Set(['.', '!', '?']);
const CLOSERS = new Set(['"', "'", ')', ']', '}', '»', '”', '’']);

function isAbbreviation(text, dotIndex) {
  let start = dotIndex - 1;
  while (start >= 0 && /[\p{L}]/u.test(text[start])) start -= 1;
  const token = deburr(text.slice(start + 1, dotIndex)).toLowerCase();
  if (!token) return false;
  if (token.length === 1) return true; // Iniciales: "J. R. R. Tolkien".
  return ABBREVIATIONS.has(token);
}

function isDecimalPoint(text, dotIndex) {
  return /\d/.test(text[dotIndex - 1] || '') && /\d/.test(text[dotIndex + 1] || '');
}

/**
 * Divide el texto en frases conservando la puntuacion original.
 * @returns {Array<{index:number,start:number,end:number,text:string,terminator:string}>}
 */
export function splitSentences(text = '') {
  const source = String(text);
  const sentences = [];
  let start = 0;

  const push = (end, terminator) => {
    const raw = source.slice(start, end);
    if (raw.trim()) {
      const leading = raw.length - raw.trimStart().length;
      const trimmed = raw.trim();
      sentences.push({
        index: sentences.length,
        start: start + leading,
        end: start + leading + trimmed.length,
        text: trimmed,
        terminator,
      });
    }
    start = end;
  };

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];

    if (char === '\n') {
      push(i, '\n');
      start = i + 1;
      continue;
    }

    if (!TERMINATORS.has(char)) continue;
    if (char === '.' && (isDecimalPoint(source, i) || isAbbreviation(source, i))) continue;

    // Absorbe puntuacion final repetida y comillas o parentesis de cierre.
    let end = i + 1;
    while (end < source.length && (TERMINATORS.has(source[end]) || CLOSERS.has(source[end]))) end += 1;
    // Solo cortamos si despues viene un espacio, un salto o el final del texto.
    const next = source[end];
    if (next !== undefined && !/\s/.test(next)) continue;

    push(end, char);
    start = end;
  }

  push(source.length, '');
  return sentences.map((sentence, index) => ({ ...sentence, index }));
}

/**
 * Divide el texto en parrafos (separados por linea en blanco) y asocia sus frases.
 * @returns {{paragraphs: Array<object>, sentences: Array<object>}}
 */
export function segment(text = '') {
  const source = String(text);
  const sentences = splitSentences(source).map((sentence) => ({
    ...sentence,
    words: countWords(sentence.text),
  }));

  // Marca las frases seguidas de un salto de linea simple. El separador se
  // pierde al trocear (la frase acaba en el punto, no en el salto), y el
  // optimizador lo necesita para reconstruir el guion tal y como se escribio.
  for (let i = 0; i < sentences.length; i += 1) {
    const nextStart = sentences[i + 1]?.start ?? source.length;
    const between = source.slice(sentences[i].end, nextStart);
    sentences[i].lineBreakAfter = between.includes('\n');
  }

  const paragraphs = [];
  const blockRe = /[^\n]+(?:\n(?!\n)[^\n]+)*/g;
  let match = blockRe.exec(source);
  while (match !== null) {
    const start = match.index;
    const end = start + match[0].length;
    const inside = sentences.filter((s) => s.start >= start && s.start < end);
    paragraphs.push({
      index: paragraphs.length,
      start,
      end,
      text: match[0].trim(),
      words: countWords(match[0]),
      sentenceIndexes: inside.map((s) => s.index),
    });
    match = blockRe.exec(source);
  }

  for (const paragraph of paragraphs) {
    for (const index of paragraph.sentenceIndexes) {
      sentences[index].paragraphIndex = paragraph.index;
      sentences[index].isParagraphStart = index === paragraph.sentenceIndexes[0];
      sentences[index].isParagraphEnd =
        index === paragraph.sentenceIndexes[paragraph.sentenceIndexes.length - 1];
    }
  }

  return { paragraphs, sentences };
}
