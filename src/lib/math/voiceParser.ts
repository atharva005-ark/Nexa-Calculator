const WORD_NUMBERS: Record<string, string> = {
  zero: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  ten: '10',
  eleven: '11',
  twelve: '12',
  thirteen: '13',
  fourteen: '14',
  fifteen: '15',
  sixteen: '16',
  seventeen: '17',
  eighteen: '18',
  nineteen: '19',
  twenty: '20',
  thirty: '30',
  forty: '40',
  fifty: '50',
  sixty: '60',
  seventy: '70',
  eighty: '80',
  ninety: '90',
  hundred: '100',
  thousand: '1000',
  pi: 'pi',
};

/**
 * Converts spoken English mathematical phrases into canonical expression syntax.
 * Examples:
 * - "What is 25 multiplied by 40?" -> "25 * 40"
 * - "Square root of 144" -> "sqrt(144)"
 * - "15 percent of 200" -> "(15/100) * 200"
 * - "2 raised to the power of 5" -> "2 ^ 5"
 */
export function parseSpokenMath(transcript: string): string {
  let s = transcript.toLowerCase().trim();
  if (!s) return '';

  // Remove conversational lead-ins and punctuation
  s = s
    .replace(/^(what is|what's|calculate|compute|evaluate|find|solve|tell me|equals)\s+/i, '')
    .replace(/[?!.,]+$/g, '')
    .replace(/\bdegrees?\b/g, '')
    .trim();

  // Replace word numbers when standalone
  s = s.replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|pi)\b/g, (m) => WORD_NUMBERS[m] ?? m);

  // Percentage phrases: "15 percent of 200" or "15% of 200"
  s = s.replace(/(\d+(?:\.\d+)?)\s*(?:percent|%)\s+of\s+/g, '($1/100) * ');
  s = s.replace(/(\d+(?:\.\d+)?)\s*percent/g, '($1/100)');

  // Functions
  s = s
    .replace(/\b(?:the\s+)?square root of\s+([0-9.()pi]+|\w+)/g, 'sqrt($1)')
    .replace(/\b(?:the\s+)?cube root of\s+([0-9.()pi]+|\w+)/g, 'cbrt($1)')
    .replace(/\bsine of\s+([0-9.()pi-]+)/g, 'sin($1)')
    .replace(/\bcos(?:ine)? of\s+([0-9.()pi-]+)/g, 'cos($1)')
    .replace(/\btan(?:gent)? of\s+([0-9.()pi-]+)/g, 'tan($1)')
    .replace(/\bnatural log of\s+([0-9.()pi]+)/g, 'ln($1)')
    .replace(/\blogarithm of\s+([0-9.()pi]+)/g, 'log($1)')
    .replace(/\blog of\s+([0-9.()pi]+)/g, 'log($1)')
    .replace(/\babsolute value of\s+([0-9.()pi-]+)/g, 'abs($1)')
    .replace(/(\d+)\s+factorial\b/g, '$1!');

  // Powers
  s = s
    .replace(/\s+(?:raised\s+)?to the power of\s+/g, ' ^ ')
    .replace(/\s+to the power\s+/g, ' ^ ')
    .replace(/\s+squared\b/g, '^2')
    .replace(/\s+cubed\b/g, '^3');

  // Basic arithmetic operators
  s = s
    .replace(/\s+multiplied by\s+/g, ' * ')
    .replace(/\s+times\s+/g, ' * ')
    .replace(/\s+x\s+/g, ' * ')
    .replace(/\s+divided by\s+/g, ' / ')
    .replace(/\s+over\s+/g, ' / ')
    .replace(/\s+plus\s+/g, ' + ')
    .replace(/\s+add\s+/g, ' + ')
    .replace(/\s+minus\s+/g, ' - ')
    .replace(/\s+subtract\s+/g, ' - ')
    .replace(/\s+modulo\s+/g, ' % ')
    .replace(/\s+mod\s+/g, ' % ');

  return s.replace(/\s+/g, ' ').trim();
}
