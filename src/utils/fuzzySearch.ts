/**
 * Advanced Phonetic & Fuzzy Search Utilities for NeoTune
 */

/**
 * Simplified Soundex algorithm for phonetic encoding of English-like words
 */
export function soundex(word: string): string {
  if (!word) return '';
  const s = word.toUpperCase().replace(/[^A-Z]/g, '');
  if (s.length === 0) return '';

  const firstLetter = s[0];
  const mappings: { [key: string]: string } = {
    B: '1', F: '1', P: '1', V: '1',
    C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
    D: '3', T: '3',
    L: '4',
    M: '5', N: '5',
    R: '6'
  };

  let code = firstLetter;
  let prevCode = mappings[firstLetter] || '';

  for (let i = 1; i < s.length; i++) {
    const char = s[i];
    if ('AEIOUYHW'.includes(char)) continue;
    const currentCode = mappings[char];
    if (currentCode && currentCode !== prevCode) {
      code += currentCode;
      prevCode = currentCode;
    }
  }

  return (code + '0000').slice(0, 4);
}

/**
 * Simplified Metaphone algorithm for phonetic key mapping
 */
export function metaphone(word: string): string {
  let text = word.toUpperCase().replace(/[^A-Z]/g, '');
  if (!text) return '';

  let code = '';
  let i = 0;

  // Rule 1: Drop duplicate letters except C
  let cleanText = '';
  for (let j = 0; j < text.length; j++) {
    if (j === 0 || text[j] !== text[j - 1] || text[j] === 'C') {
      cleanText += text[j];
    }
  }
  text = cleanText;

  // Handle prefix exceptions
  if (text.startsWith('KN') || text.startsWith('GN') || text.startsWith('PN') || text.startsWith('WR')) {
    text = text.substring(1);
  } else if (text.startsWith('X')) {
    text = 'S' + text.substring(1);
  } else if (text.startsWith('WH')) {
    text = 'W' + text.substring(2);
  }

  while (i < text.length && code.length < 6) {
    const char = text[i];
    const next = text[i + 1] || '';
    const prev = text[i - 1] || '';

    if ('AEIOU'.includes(char)) {
      if (i === 0) code += char; // Keep initial vowels
    } else if ('B'.includes(char)) {
      if (!(prev === 'M' && i === text.length - 1)) code += 'B';
    } else if ('C'.includes(char)) {
      if (next === 'H') {
        code += 'X'; // CH -> X (sh sound)
        i++;
      } else if ('IEY'.includes(next)) {
        code += 'S'; // Soft C
      } else {
        code += 'K'; // Hard C
      }
    } else if ('D'.includes(char)) {
      if (next === 'G' && 'IEY'.includes(text[i + 2] || '')) {
        code += 'J';
        i += 2;
      } else {
        code += 'T';
      }
    } else if ('FJGKLMNPRSTV'.includes(char)) {
      if (char === 'G') {
        if (next === 'H') {
          // Silent or F
          i++;
        } else if ('IEY'.includes(next)) {
          code += 'J';
        } else {
          code += 'K';
        }
      } else if (char === 'P' && next === 'H') {
        code += 'F';
        i++;
      } else if (char === 'S' && next === 'H') {
        code += 'X';
        i++;
      } else if (char === 'T' && next === 'H') {
        code += '0'; // representing "th"
        i++;
      } else {
        code += char;
      }
    } else if (char === 'H') {
      if (i === 0 || 'AEIOU'.includes(next)) {
        code += 'H';
      }
    } else if (char === 'W' || char === 'Y') {
      if ('AEIOU'.includes(next)) {
        code += char;
      }
    } else if (char === 'X') {
      code += 'KS';
    } else if (char === 'Z') {
      code += 'S';
    }
    i++;
  }

  return code;
}

/**
 * Fuzzy Search Scoring Algorithm
 * Returns a score from 0.0 (no match) to 1.0 (perfect match)
 */
export function fuzzyMatchScore(source: string, query: string): number {
  if (!source || !query) return 0;
  
  const src = source.toLowerCase().trim();
  const q = query.toLowerCase().trim();

  if (src === q) return 1.0;
  if (src.includes(q)) {
    // Score based on position and coverage
    const coverage = q.length / src.length;
    const isStart = src.indexOf(q) === 0;
    return 0.7 + (coverage * 0.2) + (isStart ? 0.1 : 0);
  }

  // Check subsequence matching (character-by-character in order)
  let qIdx = 0;
  let srcIdx = 0;
  let matches = 0;
  let consecutiveMatches = 0;
  let lastMatchIdx = -1;

  while (qIdx < q.length && srcIdx < src.length) {
    if (q[qIdx] === src[srcIdx]) {
      matches++;
      if (lastMatchIdx !== -1 && srcIdx === lastMatchIdx + 1) {
        consecutiveMatches++;
      }
      lastMatchIdx = srcIdx;
      qIdx++;
    }
    srcIdx++;
  }

  if (matches === q.length) {
    // Subsequence matches fully
    const score = 0.5 + (consecutiveMatches / q.length) * 0.2;
    return Math.min(0.69, score);
  }

  // Phonetic matching fallback
  const sourceWords = src.split(/\s+/);
  const queryWords = q.split(/\s+/);
  
  let phoneticHits = 0;
  for (const qw of queryWords) {
    if (qw.length < 2) continue;
    const qMeta = metaphone(qw);
    const qSoundex = soundex(qw);
    
    for (const sw of sourceWords) {
      if (sw.length < 2) continue;
      if (metaphone(sw) === qMeta || soundex(sw) === qSoundex) {
        phoneticHits++;
        break;
      }
    }
  }

  if (phoneticHits > 0) {
    return 0.4 + (phoneticHits / queryWords.length) * 0.15;
  }

  return 0;
}

/**
 * Sorts and filters items based on fuzzy & phonetic matching scores
 */
export function searchAndRank<T>(
  items: T[],
  query: string,
  getSearchFields: (item: T) => string[]
): { item: T; score: number }[] {
  if (!query) {
    return items.map(item => ({ item, score: 1.0 }));
  }

  const scored = items.map(item => {
    const fields = getSearchFields(item);
    let maxScore = 0;
    
    for (const field of fields) {
      if (!field) continue;
      const score = fuzzyMatchScore(field, query);
      if (score > maxScore) {
        maxScore = score;
      }
    }
    
    return { item, score: maxScore };
  });

  return scored
    .filter(x => x.score > 0.15) // Noise threshold filter
    .sort((a, b) => b.score - a.score);
}
