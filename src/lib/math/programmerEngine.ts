export type NumberBase = 'BIN' | 'OCT' | 'DEC' | 'HEX';
export type BitWidth = 8 | 16 | 32 | 64;

export function parseInBase(valueStr: string, base: NumberBase, width: BitWidth = 64): bigint {
  const clean = valueStr.trim().replace(/[\s_]/g, '');
  if (!clean || clean === '-') return 0n;

  const isNeg = clean.startsWith('-');
  const absStr = isNeg ? clean.slice(1) : clean;

  let parsed: bigint;
  if (base === 'BIN') {
    if (!/^[01]+$/.test(absStr)) throw new Error('Invalid binary digit');
    parsed = BigInt('0b' + absStr);
  } else if (base === 'OCT') {
    if (!/^[0-7]+$/.test(absStr)) throw new Error('Invalid octal digit');
    parsed = BigInt('0o' + absStr);
  } else if (base === 'HEX') {
    if (!/^[0-9a-fA-F]+$/.test(absStr)) throw new Error('Invalid hexadecimal digit');
    parsed = BigInt('0x' + absStr);
  } else {
    if (!/^[0-9]+$/.test(absStr)) throw new Error('Invalid decimal digit');
    parsed = BigInt(absStr);
  }

  const val = isNeg ? -parsed : parsed;
  return BigInt.asIntN(width, val);
}

export function formatAllBases(value: bigint, width: BitWidth = 64) {
  const signed = BigInt.asIntN(width, value);
  const unsigned = BigInt.asUintN(width, value);

  const binRaw = unsigned.toString(2).padStart(width, '0');
  const binGrouped = binRaw.replace(/(.{4})/g, '$1 ').trim();

  return {
    DEC: signed.toString(10),
    HEX: unsigned.toString(16).toUpperCase(),
    OCT: unsigned.toString(8),
    BIN: unsigned.toString(2),
    BIN_PADDED: binGrouped,
    bits: binRaw.split('').map((b) => b === '1'),
  };
}

export type BitwiseOp = 'AND' | 'OR' | 'XOR' | 'LSH' | 'RSH' | 'ADD' | 'SUB' | 'MUL' | 'DIV' | 'MOD';

export function performBitwiseOperation(
  a: bigint,
  b: bigint,
  op: BitwiseOp,
  width: BitWidth = 64
): bigint {
  let res: bigint;
  switch (op) {
    case 'AND':
      res = a & b;
      break;
    case 'OR':
      res = a | b;
      break;
    case 'XOR':
      res = a ^ b;
      break;
    case 'LSH':
      res = a << (b & BigInt(width - 1));
      break;
    case 'RSH':
      res = a >> (b & BigInt(width - 1));
      break;
    case 'ADD':
      res = a + b;
      break;
    case 'SUB':
      res = a - b;
      break;
    case 'MUL':
      res = a * b;
      break;
    case 'DIV':
      if (b === 0n) throw new Error('Division by zero');
      res = a / b;
      break;
    case 'MOD':
      if (b === 0n) throw new Error('Modulo by zero');
      res = a % b;
      break;
  }
  return BigInt.asIntN(width, res);
}

export function bitwiseNot(a: bigint, width: BitWidth = 64): bigint {
  return BigInt.asIntN(width, ~a);
}
