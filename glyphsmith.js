(() => {
'use strict';
/* ============================================================================
   Glyphsmith: Unicode transformation & obfuscation workbench
   100% client-side. No data leaves the browser.
   ============================================================================ */

/* ---------------------------------- helpers ------------------------------ */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (t, c, html) => { const e = document.createElement(t); if (c) e.className = c; if (html != null) e.innerHTML = html; return e; };
const cps    = s => [...s].length;                       // code points
const utf8   = s => new TextEncoder().encode(s);
const bytes  = s => utf8(s).length;
const rnd    = a => a[(Math.random() * a.length) | 0];
const chance = p => Math.random() < p;
const escHTML = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const hex  = cp => cp.toString(16).toUpperCase();
const Ufmt = cp => 'U+' + hex(cp).padStart(4, '0');
const rev  = s => [...s].reverse().join('');
const mapCP = (s, f) => [...s].map(f).join('');

/* ------------------------------- data tables ----------------------------- */
/* Homoglyphs: Latin char -> confusables from other scripts */
const HOMO = {
  A:['А','Α'], B:['В','Β'], C:['С','Ϲ'], E:['Е','Ε'], F:['Ϝ'], H:['Н','Η'],
  I:['І','Ι','Ⅰ','Ӏ'], J:['Ј'], K:['Κ','К'], L:['Ⅼ'], M:['М','Μ'], N:['Ν'],
  O:['Ο','О','Օ'], P:['Р','Ρ'], Q:['Ԛ'], S:['Ѕ','Տ'], T:['Τ','Т'], U:['Ս'],
  V:['Ѵ'], W:['Ԝ'], X:['Х','Χ'], Y:['Υ','Ү'], Z:['Ζ'],
  a:['а','ɑ'], c:['с','ϲ'], d:['ԁ'], e:['е'], f:['ϝ'], g:['ɡ'], h:['һ'],
  i:['і','ɩ'], j:['ј'], k:['κ'], l:['ⅼ','ӏ'], m:['ⅿ'], n:['ո'], o:['ο','о'],
  p:['р'], q:['ԛ'], r:['ɾ'], s:['ѕ'], t:['τ'], u:['υ','ս'], v:['ν','ѵ'],
  w:['ѡ','ԝ'], x:['х','χ'], y:['у','ү'], z:['ᴢ'],
  '0':['Ο','Օ'], '1':['І','Ӏ'], '3':['З'], '6':['б']
};

/* Zalgo mark piles */
const UP   = ['̍','̎','̄','̅','̿','̑','̆','̐','͒','͑','̇','̈','̊','͂','̃','̂','̌','͐'];
const MID  = ['̕','̛','̴','̵','̶','͏','͜','͝','͞','͟','͠','͡','̷','̸'];
const DOWN = ['̖','̗','̘','̙','̜','̝','̞','̟','̠','̤','̥','̦','̩','̪','̫','̬','̭','̮','̯','̰','̱','̲','̳','̹','̺','̻','̼','ͅ','͇','͈','͉','͍','͎','͓','͔','͕','͖','͙','͚'];

/* Invisible characters */
const ZWCH = { zwsp:'​', zwnj:'‌', zwj:'‍', wj:'⁠', bom:'﻿', mvs:'᠎', cgj:'͏' };

/* Unusual whitespace */
const SPC_CHARS = [' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ','　'];
const SP_OPTS = [
  [' ','NO-BREAK SPACE · U+00A0'], [' ','OGHAM SPACE MARK · U+1680'],
  [' ','EN QUAD · U+2000'], [' ','EM QUAD · U+2001'], [' ','EN SPACE · U+2002'],
  [' ','EM SPACE · U+2003'], [' ','THREE-PER-EM · U+2004'], [' ','FOUR-PER-EM · U+2005'],
  [' ','SIXTH-PER-EM · U+2006'], [' ','FIGURE SPACE · U+2007'], [' ','PUNCTUATION SPACE · U+2008'],
  [' ','THIN SPACE · U+2009'], [' ','HAIR SPACE · U+200A'], [' ','NARROW NBSP · U+202F'],
  [' ','MEDIUM MATH SPACE · U+205F'], ['　','IDEOGRAPHIC SPACE · U+3000'], [' ','LINE SEPARATOR · U+2028']
];

/* Punctuation separators */
const PUNCT_OPTS = [
  ['·','·  middle dot'], ['-','-  hyphen'], ['_','_  low line'], ['˙','˙  dot above'],
  ['ꞏ','ꞏ  sinological dot'], ['․','․  one dot leader'], ['꞉','꞉  modifier colon'],
  ['•','•  bullet'], ['⸱','⸱  word separator'], ['ˍ','ˍ  modifier low line']
];

/* Case-folding edge-case swaps */
const CASEMAP = { 'k':'K','K':'K','s':'ſ','S':'ſ','Å':'Å','å':'Å','Ω':'Ω','ω':'Ω','ß':'ẞ','µ':'μ' };

/* CP1252 interpretation of a byte (for mojibake demos) */
const CP1252 = {
  0x80:'€',0x81:'',0x82:'‚',0x83:'ƒ',0x84:'„',0x85:'…',0x86:'†',0x87:'‡',
  0x88:'ˆ',0x89:'‰',0x8A:'Š',0x8B:'‹',0x8C:'Œ',0x8D:'',0x8E:'Ž',0x8F:'',
  0x90:'',0x91:'‘',0x92:'’',0x93:'“',0x94:'”',0x95:'•',0x96:'–',0x97:'—',
  0x98:'˜',0x99:'™',0x9A:'š',0x9B:'›',0x9C:'œ',0x9D:'',0x9E:'ž',0x9F:'Ÿ'
};
const cp1252ch = b => (b >= 0x80 && b <= 0x9F && CP1252[b] !== undefined) ? CP1252[b] : String.fromCharCode(b);

/* Names for interesting code points */
const NAMES = {
  0x00A0:'NO-BREAK SPACE', 0x00AD:'SOFT HYPHEN', 0x00B5:'MICRO SIGN', 0x00DF:'LATIN SMALL LETTER SHARP S',
  0x0130:'LATIN CAPITAL LETTER I WITH DOT ABOVE', 0x0131:'LATIN SMALL LETTER DOTLESS I',
  0x017F:'LATIN SMALL LETTER LONG S', 0x034F:'COMBINING GRAPHEME JOINER', 0x061C:'ARABIC LETTER MARK',
  0x1680:'OGHAM SPACE MARK', 0x180E:'MONGOLIAN VOWEL SEPARATOR', 0x1E9E:'LATIN CAPITAL LETTER SHARP S',
  0x2000:'EN QUAD',0x2001:'EM QUAD',0x2002:'EN SPACE',0x2003:'EM SPACE',0x2004:'THREE-PER-EM SPACE',
  0x2005:'FOUR-PER-EM SPACE',0x2006:'SIXTH-PER-EM SPACE',0x2007:'FIGURE SPACE',0x2008:'PUNCTUATION SPACE',
  0x2009:'THIN SPACE',0x200A:'HAIR SPACE',0x200B:'ZERO WIDTH SPACE',0x200C:'ZERO WIDTH NON-JOINER',
  0x200D:'ZERO WIDTH JOINER',0x200E:'LEFT-TO-RIGHT MARK',0x200F:'RIGHT-TO-LEFT MARK',
  0x2028:'LINE SEPARATOR',0x2029:'PARAGRAPH SEPARATOR',0x202A:'LEFT-TO-RIGHT EMBEDDING',
  0x202B:'RIGHT-TO-LEFT EMBEDDING',0x202C:'POP DIRECTIONAL FORMATTING',0x202D:'LEFT-TO-RIGHT OVERRIDE',
  0x202E:'RIGHT-TO-LEFT OVERRIDE',0x202F:'NARROW NO-BREAK SPACE',0x205F:'MEDIUM MATHEMATICAL SPACE',
  0x2060:'WORD JOINER',0x2066:'LEFT-TO-RIGHT ISOLATE',0x2067:'RIGHT-TO-LEFT ISOLATE',
  0x2068:'FIRST STRONG ISOLATE',0x2069:'POP DIRECTIONAL ISOLATE',0x20E3:'COMBINING ENCLOSING KEYCAP',
  0x2126:'OHM SIGN',0x212A:'KELVIN SIGN',0x212B:'ANGSTROM SIGN',0x3000:'IDEOGRAPHIC SPACE',
  0xFB00:'LATIN SMALL LIGATURE FF',0xFB01:'LATIN SMALL LIGATURE FI',0xFB02:'LATIN SMALL LIGATURE FL',
  0xFB03:'LATIN SMALL LIGATURE FFI',0xFB04:'LATIN SMALL LIGATURE FFL',0xFB05:'LATIN SMALL LIGATURE LONG S T',
  0xFB06:'LATIN SMALL LIGATURE ST',0xFEFF:'ZERO WIDTH NO-BREAK SPACE (BYTE ORDER MARK)'
};

/* Unicode blocks (for names / script detection) */
const BLOCKS = [
  [0x0000,0x007F,'Basic Latin'],[0x0080,0x00FF,'Latin-1 Supplement'],[0x0100,0x017F,'Latin Extended-A'],
  [0x0180,0x024F,'Latin Extended-B'],[0x0250,0x02AF,'IPA Extensions'],[0x02B0,0x02FF,'Spacing Modifier Letters'],
  [0x0300,0x036F,'Combining Diacritical Marks'],[0x0370,0x03FF,'Greek and Coptic'],[0x0400,0x04FF,'Cyrillic'],
  [0x0500,0x052F,'Cyrillic Supplement'],[0x0530,0x058F,'Armenian'],[0x0590,0x05FF,'Hebrew'],
  [0x1C80,0x1C8F,'Cyrillic Extended-C'],[0x1D00,0x1D7F,'Phonetic Extensions'],[0x1E00,0x1EFF,'Latin Extended Additional'],
  [0x2000,0x206F,'General Punctuation'],[0x2070,0x209F,'Superscripts and Subscripts'],[0x20A0,0x20BF,'Currency Symbols'],
  [0x20D0,0x20FF,'Combining Marks for Symbols'],[0x2100,0x214F,'Letterlike Symbols'],[0x2150,0x218F,'Number Forms'],
  [0x2190,0x21FF,'Arrows'],[0x2460,0x24FF,'Enclosed Alphanumerics'],[0x2C60,0x2C7F,'Latin Extended-C'],
  [0x3000,0x303F,'CJK Symbols and Punctuation'],[0xA640,0xA69F,'Cyrillic Extended-B'],[0xA720,0xA7FF,'Latin Extended-D'],
  [0xFB00,0xFB4F,'Alphabetic Presentation Forms'],[0xFE00,0xFE0F,'Variation Selectors'],
  [0xFE50,0xFE6F,'Small Form Variants'],[0xFF00,0xFFEF,'Halfwidth and Fullwidth Forms'],
  [0x1F100,0x1F1FF,'Enclosed Alphanumeric Supplement'],[0xE0000,0xE007F,'Tags'],[0xE0100,0xE01EF,'Variation Selectors Supplement']
];

/* Characters treated as invisible (reveal mode + inspector pills) */
const HIDE_SET = new Set([0x00AD,0x034F,0x061C,0x180E,0x200B,0x200C,0x200D,0x200E,0x200F,
  0x202A,0x202B,0x202C,0x202D,0x202E,0x2060,0x2061,0x2062,0x2063,0x2064,0x2066,0x2067,0x2068,0x2069,0xFEFF]);
const HIDELBL = { 0x00AD:'SHY',0x034F:'CGJ',0x061C:'ALM',0x180E:'MVS',0x200B:'ZWSP',0x200C:'ZWNJ',0x200D:'ZWJ',
  0x200E:'LRM',0x200F:'RLM',0x202A:'LRE',0x202B:'RLE',0x202C:'PDF',0x202D:'LRO',0x202E:'RLO',0x2060:'WJ',
  0x2066:'LRI',0x2067:'RLI',0x2068:'FSI',0x2069:'PDI',0xFEFF:'BOM' };
/* Unusual spaces (shown as teal pills in reveal mode) */
const UNSP = new Set([0x00A0,0x1680,0x2000,0x2001,0x2002,0x2003,0x2004,0x2005,0x2006,0x2007,
  0x2008,0x2009,0x200A,0x2028,0x2029,0x202F,0x205F,0x3000]);
const SPLBL = { 0x00A0:'NBSP',0x1680:'OGHAM',0x2000:'EN Q',0x2001:'EM Q',0x2002:'EN',0x2003:'EM',
  0x2004:'3/EM',0x2005:'4/EM',0x2006:'6/EM',0x2007:'FIG',0x2008:'PUNC',0x2009:'THIN',0x200A:'HAIR',
  0x2028:'LS',0x2029:'PS',0x202F:'NNBSP',0x205F:'MMSP',0x3000:'IDEO' };

const isHidden = cp => HIDE_SET.has(cp) || (cp >= 0xFE00 && cp <= 0xFE0F) ||
  (cp >= 0xE0100 && cp <= 0xE01EF) || (cp >= 0xE0000 && cp <= 0xE007F);
function hideLabel(cp) {
  if (HIDELBL[cp]) return HIDELBL[cp];
  if (cp >= 0xFE00 && cp <= 0xFE0F) return 'VS' + (cp - 0xFE00 + 1);
  if (cp >= 0xE0100 && cp <= 0xE01EF) return 'VS' + (cp - 0xE0100 + 17);
  if (cp >= 0xE0000 && cp <= 0xE007F) return 'TAG';
  return 'INV';
}
function blockName(cp) {
  for (const [a, b, n] of BLOCKS) if (cp >= a && cp <= b) return n;
  return 'Unassigned / other';
}
function nameOf(cp) {
  if (NAMES[cp]) return NAMES[cp];
  if (cp >= 0xFE00 && cp <= 0xFE0F) return 'VARIATION SELECTOR-' + (cp - 0xFE00 + 1);
  if (cp >= 0xE0100 && cp <= 0xE01EF) return 'VARIATION SELECTOR-' + (cp - 0xE0100 + 17);
  if (cp >= 0xE0020 && cp <= 0xE007F) {
    const b = cp - 0xE0000;
    if (b === 0x20) return 'TAG SPACE';
    if (b === 0x7F) return 'CANCEL TAG';
    return 'TAG CHARACTER (base ' + JSON.stringify(String.fromCharCode(b)) + ')';
  }
  if (cp >= 0x0300 && cp <= 0x036F) return 'COMBINING DIACRITICAL MARK';
  if (cp >= 0x20D0 && cp <= 0x20FF) return 'COMBINING MARK FOR SYMBOLS';
  return blockName(cp);
}
function scriptOf(cp) {
  const b = blockName(cp);
  if (/^Basic Latin|^Latin-1|^Latin Extended/.test(b)) return 'Latin';
  if (b === 'Greek and Coptic') return 'Greek';
  if (/^Cyrillic/.test(b)) return 'Cyrillic';
  if (b === 'Number Forms') return 'Number Forms';
  if (/^IPA|^Phonetic/.test(b)) return 'Phonetic';
  return b;
}
function scriptList(s) {
  const set = new Set();
  for (const c of [...s]) if (c.codePointAt(0) > 127) set.add(scriptOf(c.codePointAt(0)));
  return set.size ? [...set].sort().join(' · ') : 'Latin only, nothing substitutable';
}

/* ------------------------- compatibility encoders ------------------------ */
const encCircle = t => mapCP(t, c => {
  const cp = c.codePointAt(0);
  if (cp >= 97 && cp <= 122) return String.fromCodePoint(0x24D0 + cp - 97);
  if (cp >= 65 && cp <= 90)  return String.fromCodePoint(0x24B6 + cp - 65);
  if (cp >= 49 && cp <= 57)  return String.fromCodePoint(0x2460 + cp - 49);
  if (c === '0') return '⓪';
  return c;
});
const encParen = t => mapCP(t, c => {
  const cp = c.codePointAt(0);
  if (cp >= 97 && cp <= 122) return String.fromCodePoint(0x249C + cp - 97);
  if (cp >= 49 && cp <= 57)  return String.fromCodePoint(0x2474 + cp - 49);
  return c;
});
const encNegCirc = t => mapCP(t, c => {
  const cp = c.codePointAt(0);
  if (cp >= 65 && cp <= 90)  return String.fromCodePoint(0x1F150 + cp - 65);
  if (cp >= 97 && cp <= 122) return String.fromCodePoint(0x1F150 + cp - 97);
  return c;
});
const encSq = t => mapCP(t, c => {
  const cp = c.codePointAt(0);
  if (cp >= 65 && cp <= 90)  return String.fromCodePoint(0x1F130 + cp - 65);
  if (cp >= 97 && cp <= 122) return String.fromCodePoint(0x1F130 + cp - 97);
  return c;
});
const ROMAN = { I:'Ⅰ',V:'Ⅴ',X:'Ⅹ',L:'Ⅼ',C:'Ⅽ',D:'Ⅾ',M:'Ⅿ', i:'ⅰ',v:'ⅴ',x:'ⅹ',l:'ⅼ',c:'ⅽ',d:'ⅾ',m:'ⅿ' };
const encRoman = t => mapCP(t, c => ROMAN[c] || c);

/* Stylized letter tables: small caps, super/subscript, flipped */
const MINI_SC = { a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ꞯ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ' };
const MINI_UP = { a:'ᵃ',b:'ᵇ',c:'ᶜ',d:'ᵈ',e:'ᵉ',f:'ᶠ',g:'ᵍ',h:'ʰ',i:'ⁱ',j:'ʲ',k:'ᵏ',l:'ˡ',m:'ᵐ',n:'ⁿ',o:'ᵒ',p:'ᵖ',r:'ʳ',s:'ˢ',t:'ᵗ',u:'ᵘ',v:'ᵛ',w:'ʷ',x:'ˣ',y:'ʸ',z:'ᶻ', '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹' };
const MINI_DOWN = { a:'ₐ',e:'ₑ',h:'ₕ',i:'ᵢ',j:'ⱼ',k:'ₖ',l:'ₗ',m:'ₘ',n:'ₙ',o:'ₒ',p:'ₚ',r:'ᵣ',s:'ₛ',t:'ₜ',u:'ᵤ',v:'ᵥ',x:'ₓ', '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉' };
const FLIP = {
  a:'ɐ',b:'q',c:'ɔ',d:'p',e:'ǝ',f:'ɟ',g:'ƃ',h:'ɥ',i:'ᴉ',j:'ɾ',k:'ʞ',l:'ן',m:'ɯ',n:'u',o:'o',p:'d',q:'b',r:'ɹ',s:'s',t:'ʇ',u:'n',v:'ʌ',w:'ʍ',x:'x',y:'ʎ',z:'z',
  A:'∀',C:'Ɔ',E:'Ǝ',F:'Ⅎ',G:'⅁',K:'ʞ',M:'W',N:'N',O:'O',P:'Ԁ',R:'ᴚ',T:'⊥',U:'∩',V:'Λ',W:'M',X:'X',Y:'⅄',Z:'Z',
  '0':'0','1':'Ɩ','2':'ᄅ','3':'Ɛ','4':'ㄣ','5':'ϛ','6':'9','7':'ㄥ','8':'8','9':'6',
  '.':'˙',',':"'","'":',','?':'¿','!':'¡','(':')',')':'(','[':']',']':'[','{':'}','}':'{','<':'>','>':'<','_':'‾','&':'⅋','"':'„'
};

/* Stroked / hooked Latin look-alikes that survive NFKC */
const HOOK = {
  a:['ɑ'],b:['ɓ'],c:['ƈ'],d:['đ'],e:['ɇ'],f:['ƒ'],g:['ǥ','ɡ'],h:['ħ'],i:['ı'],j:['ɉ'],
  l:['ł','ɫ'],m:['ɱ'],n:['ɲ','ŋ'],o:['ø'],p:['þ','ƥ'],r:['ɍ','ɽ'],s:['ʂ'],t:['ŧ','ƫ'],
  u:['ʉ'],v:['ʋ'],w:['ⱳ'],y:['ƴ'],z:['ƶ','ʐ']
};

/* Mathematical alphanumeric styles (letterlike exception characters included) */
const MATH_STYLES = [
  ['Bold',          { AZ:0x1D400, az:0x1D41A, d0:0x1D7CE }],
  ['Italic',        { AZ:0x1D434, az:0x1D44E, ex:{ h:0x210E } }],
  ['Bold italic',   { AZ:0x1D468, az:0x1D482 }],
  ['Script',        { AZ:0x1D49C, az:0x1D4B6, ex:{ B:0x212C,E:0x2130,F:0x2131,H:0x210B,I:0x2110,L:0x2112,M:0x2133,R:0x211B,e:0x212F,g:0x210A,o:0x2134 } }],
  ['Fraktur',       { AZ:0x1D504, az:0x1D51E, ex:{ C:0x212D,H:0x210C,I:0x2111,R:0x211C,Z:0x2128 } }],
  ['Double-struck', { AZ:0x1D538, az:0x1D552, d0:0x1D7D8, ex:{ C:0x2102,H:0x210D,N:0x2115,P:0x2119,Q:0x211A,R:0x211D,Z:0x2124 } }],
  ['Monospace',     { AZ:0x1D670, az:0x1D68A, d0:0x1D7F6 }],
  ['Sans bold',     { AZ:0x1D5D4, az:0x1D5EE, d0:0x1D7EC }]
];
const mathEnc = st => t => mapCP(t, c => {
  if (st.ex && st.ex[c]) return String.fromCodePoint(st.ex[c]);
  const cp = c.codePointAt(0);
  if (cp >= 65 && cp <= 90 && st.AZ) return String.fromCodePoint(st.AZ + cp - 65);
  if (cp >= 97 && cp <= 122 && st.az) return String.fromCodePoint(st.az + cp - 97);
  if (cp >= 48 && cp <= 57 && st.d0) return String.fromCodePoint(st.d0 + cp - 48);
  return c;
});

/* Grade-1 braille */
const BRL_DOTS = { a:'1',b:'12',c:'14',d:'145',e:'15',f:'124',g:'1245',h:'125',i:'24',j:'245',
  k:'13',l:'123',m:'134',n:'1345',o:'135',p:'1234',q:'12345',r:'1235',s:'234',t:'2345',
  u:'136',v:'1236',w:'2456',x:'1346',y:'13456',z:'1356' };
const brlCell = ch => { const d = BRL_DOTS[ch]; if (!d) return null;
  let v = 0; for (const x of d) v |= 1 << (+x - 1); return String.fromCodePoint(0x2800 + v); };
const encBraille = (t, marks) => mapCP(t, c => {
  if (c === ' ') return ' ';
  if ((c >= '1' && c <= '9') || c === '0') return '⠼' + brlCell(String.fromCharCode(97 + '1234567890'.indexOf(c)));
  const cell = brlCell(c.toLowerCase());
  if (!cell) return c;
  return (/[A-Z]/.test(c) && marks ? '⠠' : '') + cell;
});

/* Tag characters: ASCII mirrored into the invisible U+E0000 block */
const encTags = t => mapCP(t, c => {
  const cp = c.codePointAt(0);
  return (cp >= 0x20 && cp <= 0x7E) ? String.fromCodePoint(0xE0000 + cp) : '';
});

/* Simplified UTS #39 skeleton for the defense card */
const SKEL_INV = (() => {
  const m = {};
  for (const base in HOMO) for (const c of HOMO[base]) m[c] = base;
  m['ſ'] = 's'; m['ß'] = 'ss'; m['ẞ'] = 'ss';
  return m;
})();
const skeleton = t => mapCP(t.normalize('NFKC').toLowerCase(), c => SKEL_INV[c] || c);

/* ================================ CARDS ================================== */
const CARDS = [
{ id:'homo', num:'01', title:'Homoglyph substitution', tag:'confusables',
  desc:`Swaps Latin letters for look-alikes from other scripts: Cyrillic <code>А</code>, Greek <code>Α</code>, Armenian <code>Օ</code>, Cherokee-like number forms. It reads the same to a human, but every code point differs, so exact string matching fails.`,
  run(t) {
    const s = mapCP(t, c => HOMO[c] ? HOMO[c][0] : c);
    return [{ label:'Deterministic: first confusable everywhere', text:s, note:'Scripts in output: ' + scriptList(s) }];
  }
},
{ id:'mixed', num:'02', title:'Mixed-script blender', tag:'confusables', random:true,
  controls:[{ k:'range', id:'p', label:'swap density %', min:10, max:100, step:5, def:65 }],
  desc:`Same confusable table, applied at random per character with the density you choose: a Cyrillic <code>е</code> here, a Greek <code>ο</code> there. A single visible “word” ends up spanning several scripts, which defeats per-script rules and single-alphabet regexes. Press ↻ to re-roll.`,
  run(t, o) {
    const p = (+o.p) / 100;
    const src = [...t]; let swapped = 0;
    const arr = src.map(c => { if (HOMO[c] && chance(p)) { swapped++; return rnd(HOMO[c]); } return c; });
    if (swapped === 0) {
      const idx = src.map((c, i) => HOMO[c] ? i : -1).filter(i => i >= 0);
      if (idx.length) { const k = rnd(idx); arr[k] = rnd(HOMO[src[k]]); }
    }
    const s = arr.join('');
    return [{ label:`Random mix: ~${o.p}% of substitutable letters swapped`, text:s, note:'Scripts in output: ' + scriptList(s) }];
  }
},
{ id:'zw', num:'03', title:'Zero-width injection', tag:'invisible', random:true,
  controls:[{ k:'select', id:'ch', label:'character', options:[
      ['​','ZWSP · U+200B'], ['‌','ZWNJ · U+200C'], ['‍','ZWJ · U+200D'],
      ['⁠','WORD JOINER · U+2060'], ['﻿','BOM / ZWNBSP · U+FEFF'], ['᠎','MONGOLIAN VOWEL SEP · U+180E'],
      ['͏','CGJ · U+034F'], ['ㅤ','HANGUL FILLER · U+3164'], ['⠀','BRAILLE BLANK · U+2800'], ['mix','mix of all']]},
    { k:'range', id:'n', label:'chars per gap', min:1, max:5, def:1 }],
  desc:`Inserts invisible formatting characters between letters. Displayed text is unchanged, but code-point-wise the word is full of holes: <code>String.length</code> grows while the screen shows the same thing. Toggle “reveal hidden characters” to see them.`,
  run(t, o) {
    const n = +o.n;
    const pick = () => o.ch === 'mix' ? rnd(Object.values(ZWCH)) : o.ch;
    const gap = () => Array.from({ length: n }, pick).join('');
    const inject = w => { const cs = [...w]; let r = ''; cs.forEach((c, i) => { r += c; if (i < cs.length - 1) r += gap(); }); return r; };
    return [
      { label:'Injected between every character', text:inject(t) },
      { label:'Inside words only, spaces intact', text:t.split(' ').map(inject).join(' ') }
    ];
  }
},
{ id:'comb', num:'04', title:'Combining marks', tag:'combining', random:true,
  controls:[{ k:'select', id:'m', label:'mode', options:[
      ['zalgo','zalgo stack'], ['accent','light diacritics'], ['strike','strikethrough overlay'],
      ['slash','slash overlay'], ['under','low line overlay']]},
    { k:'range', id:'lv', label:'zalgo level', min:1, max:3, def:2 }],
  desc:`Appends combining marks that attach to the preceding base letter: one visible glyph, many code points. Filters see a long code-point train; readers see a word wearing a hat (or twenty).`,
  run(t, o) {
    const m = o.m, lv = +o.lv; let text = '', label = '';
    if (m === 'zalgo') {
      text = mapCP(t, c => {
        if (c === ' ') return c;
        let r = c;
        const nu = lv + (chance(.4) ? 1 : 0);
        for (let i = 0; i < nu; i++) r += rnd(UP);
        if (lv >= 2) { r += rnd(MID); if (chance(.5)) r += rnd(MID); }
        if (lv >= 3) { r += rnd(DOWN); if (chance(.6)) r += rnd(DOWN); }
        return r;
      });
      label = 'Zalgo stack, level ' + lv;
    } else if (m === 'accent') {
      const AC = ['́','̀','̈','̂','̃','̇'];
      text = mapCP(t, c => /[aeiouyAEIOUY]/.test(c) ? c + rnd(AC) : c);
      label = 'Combining accents on vowels (e + ◌́ = é)';
    } else if (m === 'strike') { text = mapCP(t, c => c === ' ' ? c : c + '̶'); label = 'Long stroke overlay · U+0336'; }
    else if (m === 'slash')     { text = mapCP(t, c => c === ' ' ? c : c + '̸'); label = 'Long solidus overlay · U+0338'; }
    else                        { text = mapCP(t, c => c === ' ' ? c : c + '̲'); label = 'Low line overlay · U+0332'; }
    const kc = mapCP(t, c => /[a-z0-9]/i.test(c) ? c + '⃣' : c);
    return [{ label, text }, { label:'Bonus: combining enclosing keycap U+20E3', text:kc }];
  }
},
{ id:'norm', num:'05', title:'Normalization twins', tag:'normalization',
  desc:`“é” can be one code point (<code>U+00E9</code>) or two (<code>U+0065 U+0301</code>). NFC / NFD / NFKC forms render identically but compare unequal until normalized, a textbook filter gap when only one side of the pipeline normalizes. Try the “diacritics” sample text.`,
  run(t) {
    const nfc = t.normalize('NFC'), nfd = t.normalize('NFD'), nfkc = t.normalize('NFKC');
    const info = `input === NFC: ${t === nfc}    ·    NFC === NFD: ${nfc === nfd}    ·    NFKC === input: ${nfkc === t}`;
    return [
      { label:'NFC: composed', text:nfc },
      { label:'NFD: decomposed (é → e + ◌́)', text:nfd },
      { label:'NFKC: compatibility composed', text:nfkc },
      { label:'Sanity check', text:info, info:true }
    ];
  }
},
{ id:'space', num:'06', title:'Whitespace alchemy', tag:'whitespace', random:true,
  controls:[{ k:'select', id:'sp', label:'space character', options:SP_OPTS, def:' ' }],
  desc:`Unicode defines ~25 different space characters. Many tokenizers (<code>split(" ")</code>, some <code>\\s</code> implementations) only treat a few of them as whitespace: <code>U+1680</code>, <code>U+2000–U+200A</code>, <code>U+3000</code> render as ordinary gaps but often slip through word splitting.`,
  run(t, o) {
    const sp = o.sp;
    const salad = t.split('').map(c => c === ' ' ? rnd(SPC_CHARS) : c).join('');
    return [
      { label:'Every plain space → chosen character', text:t.split(' ').join(sp) },
      { label:'Kerned: space char between all letters', text:[...t].join(sp) },
      { label:'Space salad: random unusual space per gap', text:salad }
    ];
  }
},
{ id:'punct', num:'07', title:'Punctuation inserter', tag:'punctuation',
  controls:[{ k:'select', id:'s', label:'separator', options:PUNCT_OPTS },
            { k:'check', id:'sp', label:'also separate words', def:false }],
  desc:`Breaks the stored token apart with separators while keeping it readable: <code>h-e-l-l-o</code>, <code>h·e·l·l·o</code>… Word filters looking for contiguous letters see fragments.`,
  run(t, o) {
    const sep = o.s;
    const words = t.split(' ').map(w => [...w].join(sep));
    return [{ label:'Separator between every letter', text:words.join(o.sp ? ' ' + sep + ' ' : ' ') }];
  }
},
{ id:'case', num:'08', title:'Case-folding edge cases', tag:'casing',
  desc:`Unicode case mappings defy intuition: <code>ſ</code> (long s) case-folds to “s”, the KELVIN SIGN <code>K</code> to “k”, <code>Å</code> (Ångström) to “å”. Naive filters miss them; proper case folding (Python <code>.casefold()</code>, regex <code>/s/iu</code>) catches them.`,
  run(t) {
    const A = mapCP(t, c => CASEMAP[c] || c);
    const B = mapCP(t, c => c === 'i' ? 'İ' : c === 'I' ? 'ı' : c);
    return [
      { label:'Fold-equivalents: ſ, Kelvin K, Ångström, Ohm Ω, ẞ', text:A,
        note:'ſ survives JS toLowerCase unchanged · Unicode-aware matching maps it to s' },
      { label:'Turkish dot trap: i → İ, I → ı', text:B,
        note:'Locale-sensitive: "İ".toLowerCase() === "i̇" (2 code points) · "ı".toUpperCase() === "I"' }
    ];
  }
},
{ id:'fw', num:'09', title:'Fullwidth conversion', tag:'width',
  desc:`Shifts ASCII into the Halfwidth/Fullwidth Forms block (Ａ→<code>U+FF21</code>…). Looks stylized but legible, and completely escapes ASCII-only matchers, until <code>NFKC</code> folds every character straight back.`,
  run(t) {
    const fwch = c => {
      const cp = c.codePointAt(0);
      if (c === ' ') return '　';
      return (cp >= 0x21 && cp <= 0x7E) ? String.fromCodePoint(cp + 0xFEE0) : c;
    };
    const A = mapCP(t, fwch);
    const B = mapCP(t, c => /[0-9A-Za-z]/.test(c) ? fwch(c) : c);
    const back = [...A].slice(0, 40).join('').normalize('NFKC') + (cps(A) > 40 ? '…' : '');
    return [
      { label:'Strict: incl. space → IDEOGRAPHIC SPACE U+3000', text:A },
      { label:'Letters & digits only', text:B, note:'NFKC reverts the fullwidth form →  ' + back }
    ];
  }
},
{ id:'compat', num:'10', title:'Compatibility characters', tag:'compat',
  desc:`Characters carrying a compatibility decomposition: ligatures, circled / parenthesized / squared / negative-circled letters, Roman numerals. Every one of these <code>NFKC</code>-normalizes back to plain ASCII. See the proof row.`,
  run(t) {
    return [
      { label:'Typographic ligatures: ﬀ ﬁ ﬂ ﬃ ﬄ ﬆ', text:t.replace(/ffi/g,'ﬃ').replace(/ffl/g,'ﬄ').replace(/ff/g,'ﬀ').replace(/fi/g,'ﬁ').replace(/fl/g,'ﬂ').replace(/st/g,'ﬆ') },
      { label:'Circled: ⓗⓔⓛⓛⓞ', text:encCircle(t) },
      { label:'Parenthesized: ⒣⒠⒧⒧⒪', text:encParen(t) },
      { label:'Negative circled: 🅗🅔🅛🅛🅞', text:encNegCirc(t), astral:true },
      { label:'Negative squared: 🄷🄴🄻🄻🄾', text:encSq(t), astral:true },
      { label:'Roman numerals: Ⅰ Ⅴ Ⅹ Ⅼ Ⅽ Ⅾ Ⅿ', text:encRoman(t) },
      { label:'Proof: NFKC of the circled form', text:encCircle(t).normalize('NFKC'), info:true }
    ];
  }
},
{ id:'bidi', num:'11', title:'Bidirectional controls', tag:'bidi',
  desc:`Directional formatting characters reorder what renders vs. what is stored. The infamous <code>U+202E</code> RIGHT-TO-LEFT OVERRIDE has been abused for years to disguise file names (“txt…exe” spoofing). Here it shows how eyes and machines can read different strings from identical bytes.`,
  run(t) {
    return [
      { label:'Display-reversed: logical order unchanged', text:'‮' + t + '‬' },
      { label:'Stealth: renders identical, stored reversed', text:'‮' + rev(t) + '‬',
        note:'Copy this and inspect it: the code points read backwards while the screen shows your text' },
      { label:'LRM (U+200E) between every character', text:[...t].join('‎') },
      { label:'RTL isolates around each word', text:t.split(' ').map(w => '⁧' + w + '⁩').join(' ') }
    ];
  }
},
{ id:'vs', num:'12', title:'Variation selectors', tag:'invisible', random:true,
  desc:`Variation selectors (<code>U+FE00–FE0F</code>, plus <code>U+E0100–E01EF</code> for 256 total) tweak glyph presentation. On plain letters they are usually invisible, and 256 distinct values can invisibly encode an entire byte per character (the “variation-selector steganography” trick). <code>VS-16</code> forces emoji presentation.`,
  run(t) {
    const vsAll = mapCP(t, c => c + '︀');
    const vsMix = mapCP(t, c => {
      if (c === ' ') return c;
      /* minecraft mode: stay in the BMP (U+FE00–FE0F) so nothing renders as □ */
      return c + (!STATE.mc && chance(.5)
        ? String.fromCodePoint(0xE0100 + ((Math.random() * 240) | 0))
        : String.fromCodePoint(0xFE00 + ((Math.random() * 16) | 0)));
    });
    const emo = mapCP(t, c => /[0-9#*]/.test(c) ? c + '️⃣' : c + '️');
    return [
      { label:'VS-1 (U+FE00) after every character', text:vsAll },
      { label:'Random VS 1–256 sprinkled in', text:vsMix },
      { label:'Emoji presentation: VS-16 everywhere + keycaps on digits', text:emo }
    ];
  }
},
{ id:'enc', num:'13', title:'Encoding / decoding discrepancies', tag:'bytes',
  desc:`The same bytes decode differently depending on the charset each layer assumes. UTF-8 misread as Windows-1252 yields classic mojibake (<code>é → Ã©</code>); double-encoding amplifies it. Modern decoders reject overlong sequences; legacy parsers did not, which enabled historical path/filter bypasses.`,
  run(t) {
    const bs = [...utf8(t)];
    const hexs = bs.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
    const moj  = bs.map(cp1252ch).join('');
    const moj2 = [...utf8(moj)].map(cp1252ch).join('');
    const ent  = mapCP(t, c => { const cp = c.codePointAt(0); return cp > 126 ? '&#' + cp + ';' : c; });
    const esc  = mapCP(t, c => { const cp = c.codePointAt(0);
      return cp > 0xFFFF ? '\\u{' + hex(cp).toLowerCase() + '}' : '\\u' + hex(cp).toLowerCase().padStart(4, '0'); });
    const u16  = t.split('').map(ch => ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' ');
    return [
      { label:'UTF-8 bytes (hex)', text:hexs },
      { label:'Mojibake: these bytes re-read as Windows-1252', text:moj },
      { label:'Double encoding: mojibake of the mojibake', text:moj2 },
      { label:'Percent-encoding (encodeURIComponent)', text:encodeURIComponent(t) },
      { label:'HTML numeric entities (non-ASCII)', text:ent },
      { label:'Unicode escapes (JS / Python style)', text:esc },
      { label:'UTF-16 code units: astral chars split in two', text:u16 },
      { label:'Overlong UTF-8 (reference only)', info:true,
        text:'“/” (0x2F) overlong → C0 AF   ·   NUL → C0 80; rejected by RFC-3629-compliant decoders, but accepted by some legacy IIS / Tomcat setups, enabling path-traversal and filter bypasses. Shown as hex; no live decoder here will produce it.' }
    ];
  }
},
{ id:'rep', num:'14', title:'Repeated-character tricks', tag:'repeat',
  desc:`Doubling letters is trivial for humans to read but breaks exact matching, and gluing each duplicate pair with a zero-width character produces a stored pattern that matches neither the doubled nor the plain form.`,
  run(t) {
    return [
      { label:'Doubled: hheelllloo', text:mapCP(t, c => c === ' ' ? ' ' : c + c) },
      { label:'Doubled, pairs glued with ZWSP', text:mapCP(t, c => c === ' ' ? ' ' : c + '​' + c) },
      { label:'Tripled', text:mapCP(t, c => c === ' ' ? ' ' : c + c + c) }
    ];
  }
},
{ id:'tok', num:'15', title:'Tokenization shenanigans', tag:'tokenize',
  desc:`Filters tokenize text into “words”; Unicode lets you glue words together or split one apart invisibly. Where the tokenizer and the human disagree about word boundaries, checks fall through; e.g. <code>\\s</code> handling of NBSP differs across engines, and soft hyphens vanish mid-word.`,
  run(t) {
    const words = t.split(' ');
    return [
      { label:'Words glued with WORD JOINER U+2060 (zero-width)', text:words.join('⁠') },
      { label:'Spaces → NO-BREAK SPACE U+00A0 (looks identical)', text:words.join(' ') },
      { label:'SOFT HYPHEN U+00AD between every letter', text:words.map(w => [...w].join('­')).join(' ') },
      { label:'CGJ U+034F between every letter', text:words.map(w => [...w].join('͏')).join(' ') },
      { label:'Words separated by LINE SEPARATOR U+2028', text:words.join(' ') }
    ];
  }
},
{ id:'chaos', num:'16', title:'Chaos mixer', tag:'combo', random:true,
  controls:[{ k:'range', id:'i', label:'intensity', min:1, max:10, def:5 }],
  desc:`One knob, everything at once: homoglyphs, zero-width injection, variation selectors, combining marks, repetition, punctuation and weird spaces, applied stochastically per character. Crank the intensity and re-roll ↻ until it is unhinged but still readable.`,
  run(t, o) {
    const i = +o.i, p = .045 + i * .02, used = new Set();
    const s = mapCP(t, c => {
      if (c === ' ') { if (chance(.07 * i)) { used.add('spaces'); return rnd(SPC_CHARS); } return c; }
      let r = c;
      if (HOMO[c] && chance(p * 1.6)) { r = rnd(HOMO[c]); used.add('homoglyphs'); }
      if (chance(p * 1.2)) { r += rnd(Object.values(ZWCH)).repeat(1 + ((Math.random() * Math.min(3, i)) | 0)); used.add('zero-width'); }
      if (chance(p * .6))  { r += String.fromCodePoint(0xFE00 + ((Math.random() * 16) | 0)); used.add('variation selectors'); }
      if (chance(p * .35)) { r += rnd(UP); used.add('combining marks'); }
      if (chance(p * .22) && /[a-z]/i.test(c)) { r += c; used.add('repetition'); }
      if (chance(p * .18)) { r += rnd(['·','-','_','˙']); used.add('punctuation'); }
      return r;
    });
    return [{ label:'Everything-mixer output', text:s,
      note:'Techniques used: ' + (used.size ? [...used].join(' · ') : 'none; press ↻ again') }];
  }
},
{ id:'math', num:'17', title:'Mathematical alphabets', tag:'stylized',
  desc:`The math blocks carry several complete alphabets (<code>U+1D400–U+1D7FF</code>): bold, italic, script, fraktur, double-struck, monospace. They render as ordinary letters, but every glyph is a single code point from a block normal text never contains, and <code>NFKC</code> refuses to fold them back. All rows sit above U+FFFF, so minecraft mode hides them; toggle it off to see.`,
  run(t) {
    return MATH_STYLES.map(([label, st]) => ({ label, text:mathEnc(st)(t), astral:true }));
  }
},
{ id:'mini', num:'18', title:'Small caps, super & subscript', tag:'stylized',
  desc:`Phonetic and letterlike blocks supply miniature versions of ordinary letters: true small capitals (<code>ꜱᴍᴀʟʟ ᴄᴀᴘꜱ</code>), superscripts (<code>ᵗⁱⁿʸ</code>) and the sparse set of subscript letters. Legible to readers, invisible to plain ASCII matching, and all of it stays inside the BMP, so minecraft mode keeps everything.`,
  run(t) {
    return [
      { label:'Small caps: capitals and lowercase both map down', text:mapCP(t, c => MINI_SC[c.toLowerCase()] || c),
        note:'q uses ꞯ (U+A7AF); x has no small capital form and stays plain' },
      { label:'Superscript', text:mapCP(t, c => MINI_UP[c.toLowerCase()] || c),
        note:'q has no superscript form and stays as-is' },
      { label:'Subscript', text:mapCP(t, c => MINI_DOWN[c.toLowerCase()] || c),
        note:'b, c, d, f, g and several others have no subscript form' }
    ];
  }
},
{ id:'flip', num:'19', title:'Flipped & reversed text', tag:'stylized',
  desc:`Two mirror tricks in one card: plain string reversal, and the classic “upside down” style that maps each character to a turned look-alike from IPA, Greek and Letterlike blocks and then reverses the order. Tilt your head (or mirror the screen) and the original is right there, while the stored code points have nothing in common with it.`,
  run(t) {
    const up = rev(mapCP(t, c => FLIP[c] || c));
    return [
      { label:'Reversed: same characters, inverse order', text:rev(t) },
      { label:'Upside down: turned letters plus reversal', text:up,
        note:'Characters with no turned form (B, D, H, J and friends) stay as they are' }
    ];
  }
},
{ id:'tag', num:'20', title:'Tag smuggling', tag:'invisible',
  desc:`The Tags block (<code>U+E0000–E007F</code>) mirrors ASCII one to one but renders as nothing at all, so a full message can ride along inside ordinary-looking text. Tag smuggling has been used to slip instructions past moderation and LLM prompt filters. Toggle reveal mode, or press ⌕, to watch hidden characters decode character by character.`,
  run(t) {
    return [
      { label:'Visible text with a hidden twin attached', text:t + encTags(t), astral:true,
        note:'Every ASCII character of your text is repeated invisibly after it' },
      { label:'Fully hidden: renders as empty', text:encTags(t), astral:true,
        note:'Reveal mode shows each tag as a TAG pill' }
    ];
  }
},
{ id:'brl', num:'21', title:'Braille cipher', tag:'encodings',
  desc:`Grade-1 braille is a straight one-to-one mapping onto the braille block (<code>U+2800–U+28FF</code>). It is a real alphabet rather than a party trick: filters that only know Latin letters see punctuation-like cells, while a braille display reads the message perfectly.`,
  run(t) {
    return [
      { label:'Grade 1, with capital ⠠ and number ⠼ signs', text:encBraille(t, true) },
      { label:'Case folded: no capital signs', text:encBraille(t, false) }
    ];
  }
},
{ id:'hook', num:'22', title:'Stroked & hooked letters', tag:'confusables', random:true,
  desc:`Latin Extended and IPA supply dressed-up versions of ordinary letters: <code>đ ł ø ħ ŧ</code>. Unlike diacritic builds they are single code points with no <code>NFKC</code> decomposition, so normalization alone will not fold them back, and readers barely notice. Press ↻ for a random pick wherever several exist.`,
  run(t) {
    return [
      { label:'Deterministic: first look-alike everywhere', text:mapCP(t, c => HOOK[c] ? HOOK[c][0] : c) },
      { label:'Random pick per letter', text:mapCP(t, c => HOOK[c] ? rnd(HOOK[c]) : c) }
    ];
  }
},
{ id:'skel', num:'23', title:'Skeleton check (defense)', tag:'defense',
  desc:`The defensive flip side of the lab: normalize to <code>NFKC</code>, case-fold, then map common confusables back to their Latin skeletons. If your filter collapses every obfuscation card here to the same skeleton as the original input, it is doing its job.`,
  run(t) {
    const sk = skeleton(t);
    const sk2 = skeleton(mapCP(t, c => HOMO[c] ? HOMO[c][0] : c));
    return [
      { label:'Skeleton of the input', text:sk },
      { label:'Skeleton of the fully homoglyph-swapped version', text:sk2,
        note: sk === sk2 ? 'Identical: normalization plus folding reverses the swap'
                         : 'Differs: the swap survives NFKC plus case folding' }
    ];
  }
}
];

const PRESETS = [
  ['hello world', 'hello minecraft world 123'],
  ['ligature bait', 'The fiendish waffle knight strikes softly'],
  ['diacritics', 'Café, naïve façade, coördinate 42'],
  ['emoji + digits', 'I ❤ 2 build #m1n3cr4ft']
];

/* =============================== UI engine =============================== */
const STATE = { reveal: false, mc: true };
const hasAstral = s => [...s].some(c => c.codePointAt(0) > 0xFFFF);
const hasIllegalMC = s => /[\u00a7\u0000-\u001f\u007f]/.test(s);
const inputVal = () => $('#in').value;

function buildControls(card) {
  const box = el('div', 'controls');
  card.controls.forEach(c => {
    const w = el('label', 'ctl');
    const cap = el('span', null, c.label + (c.k === 'range' ? ' <b class="rval">' + c.def + '</b>' : ''));
    let input;
    if (c.k === 'select') {
      input = el('select');
      c.options.forEach(([v, l]) => { const op = el('option'); op.value = v; op.textContent = l; input.append(op); });
      if (c.def !== undefined) input.value = c.def;
      input.addEventListener('change', () => draw(card));
    } else if (c.k === 'range') {
      input = el('input'); input.type = 'range';
      input.min = c.min; input.max = c.max; input.step = c.step || 1; input.value = c.def;
      input.addEventListener('input', () => { cap.querySelector('.rval').textContent = input.value; draw(card); });
    } else { /* checkbox */
      w.classList.add('check');
      input = el('input'); input.type = 'checkbox'; input.checked = !!c.def;
      input.addEventListener('change', () => draw(card));
    }
    input.dataset.opt = c.id;
    w.append(cap, input);
    box.append(w);
  });
  return box;
}
function collect(card) {
  const o = {};
  $$('[data-opt]', card._el).forEach(i => { o[i.dataset.opt] = i.type === 'checkbox' ? i.checked : i.value; });
  return o;
}
function revealHTML(text) {
  let html = '';
  for (const ch of [...text]) {
    const cp = ch.codePointAt(0);
    if (isHidden(cp))      html += `<span class="h">${hideLabel(cp)}</span>`;
    else if (UNSP.has(cp)) html += `<span class="sp">${SPLBL[cp] || 'SP'}</span>`;
    else                   html += escHTML(ch);
  }
  return html;
}
function hexRow(text) {
  const box = el('div', 'hexes');
  const arr = [...text];
  arr.slice(0, 26).forEach(ch => box.append(el('span', 'hx', Ufmt(ch.codePointAt(0)))));
  if (arr.length > 26) box.append(el('span', 'hx', '…+' + (arr.length - 26)));
  return box;
}
function outRow(card, out, inC) {
  const row = el('div', 'out' + (out.info ? ' info' : ''));
  const head = el('div', 'out-head');
  head.append(el('span', 'out-label', out.label));
  const stats = el('span', 'out-stats');
  const c = cps(out.text), b = bytes(out.text);
  stats.innerHTML = `${c} cp · ${b} B` + (c > inC ? ` <span class="d">+${c - inC}</span>` : '');
  const cb = el('button', 'icon-btn', '⧉'); cb.title = 'Copy raw text';
  cb.addEventListener('click', () => copyText(out.text));
  const ib = el('button', 'icon-btn', '⌕'); ib.title = 'Inspect code points';
  ib.addEventListener('click', () => inspect(card.title + ' · ' + out.label, out.text));
  head.append(stats, cb, ib);
  if (STATE.mc && !out.info) {
    head.append(el('span', 'mcchip ' + (c <= 256 ? 'mc-ok' : 'mc-bad'),
      c <= 256 ? `⛏ fits ${c}/256` : `⛏ ${c}/256 · over the vanilla limit`));
    if (hasAstral(out.text)) head.append(el('span', 'mcchip mc-warn', '⚠ astral → □ in vanilla font'));
    if (hasIllegalMC(out.text)) head.append(el('span', 'mcchip mc-bad', '✗ §/control char · vanilla kicks'));
  }
  row.append(head);
  const pre = el('pre', 'ot');
  if (STATE.reveal) pre.innerHTML = revealHTML(out.text);
  else pre.textContent = out.text;
  row.append(pre);
  if (out.note) { const n = el('div', 'onote'); n.textContent = out.note; row.append(n); }
  if (!out.info) row.append(hexRow(out.text));
  return row;
}
function draw(card) {
  const inC = cps(inputVal());
  let outs = card.run(inputVal(), card._get());
  let hiddenCount = 0;
  if (STATE.mc) outs = outs.filter(o => { if (!o.info && o.astral) { hiddenCount++; return false; } return true; });
  const rows = outs.map(o => outRow(card, o, inC));
  if (hiddenCount) rows.push(outRow(card, { label:'Minecraft compatibility', info:true,
    text:`${hiddenCount} variant(s) hidden: they sit above U+FFFF (astral plane) and render as □ in the vanilla Minecraft font. Toggle ⛏ minecraft mode off to see them anyway.` }, inC));
  card._outs.replaceChildren(...rows);
}
function updateStats() {
  const t = inputVal();
  $('#inStats').innerHTML =
    `<span><b>${cps(t)}</b> code points</span><span><b>${t.length}</b> UTF-16 units</span>` +
    `<span><b>${bytes(t)}</b> UTF-8 bytes</span><span>scripts: <b>${scriptList(t)}</b></span>`;
}
function drawAll() { updateStats(); CARDS.forEach(draw); }

function inspect(src, text) {
  $('#inspSrc').textContent = src;
  const body = $('#inspBody');
  body.innerHTML = '';
  const arr = [...text]; const cap = 300;
  const scroll = el('div', 'insp-scroll');
  const tb = el('table', 'insp');
  tb.innerHTML = '<thead><tr><th>#</th><th>char</th><th>code point</th><th>name</th><th>utf-8 bytes</th></tr></thead>';
  const tb2 = el('tbody');
  arr.slice(0, cap).forEach((ch, i) => {
    const cp = ch.codePointAt(0);
    const tr = el('tr');
    const td0 = el('td', null, String(i + 1));
    const tdg = el('td', 'g');
    if (isHidden(cp))        tdg.append(el('span', 'h', hideLabel(cp)));
    else if (UNSP.has(cp))   tdg.append(el('span', 'sp', SPLBL[cp] || 'SP'));
    else if (ch === ' ')     tdg.append(el('span', 'sp', 'SPACE'));
    else { const g = el('span', 'glyph'); g.textContent = ch; tdg.append(g); }
    const tdc = el('td', null, Ufmt(cp));
    const tdn = el('td', null, nameOf(cp));
    const tdb = el('td', null, [...utf8(ch)].map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' '));
    tr.append(td0, tdg, tdc, tdn, tdb);
    tb2.append(tr);
  });
  tb.append(tb2); scroll.append(tb); body.append(scroll);
  if (arr.length > cap) body.append(el('p', 'insp-empty', `…and ${arr.length - cap} more code points (truncated at ${cap}).`));
  $('#inspector').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* copy + toast */
let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 1700);
}
function fallbackCopy(t) {
  const ta = document.createElement('textarea');
  ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.append(ta); ta.select();
  try { document.execCommand('copy'); toast('Copied to clipboard'); }
  catch (e) { toast('Copy failed. Select the text manually.'); }
  ta.remove();
}
function copyText(t) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(t).then(() => toast('Copied to clipboard'), () => fallbackCopy(t));
  } else fallbackCopy(t);
}

/* init */
function init() {
  const grid = $('#cards');
  CARDS.forEach(card => {
    const box = el('article', 'card');
    const head = el('div', 'card-head');
    head.append(el('h3', null, `<span class="num">${card.num}</span>${card.title}`));
    const right = el('div'); right.style.display = 'flex'; right.style.gap = '8px'; right.style.alignItems = 'center';
    right.append(el('span', 'tag', card.tag));
    if (card.random) {
      const rg = el('button', 'icon-btn', '↻');
      rg.title = 'Regenerate (randomized)';
      rg.addEventListener('click', () => draw(card));
      right.append(rg);
    }
    head.append(right);
    box.append(head, el('p', 'desc', card.desc));
    card._el = box;
    if (card.controls) box.append(buildControls(card));
    card._get = () => collect(card);
    card._outs = el('div', 'outputs');
    box.append(card._outs);
    grid.append(box);
  });

  const pw = $('#presets');
  PRESETS.forEach(([label, v]) => {
    const b = el('button', 'chipbtn', label);
    b.addEventListener('click', () => { $('#in').value = v; drawAll(); });
    pw.append(b);
  });

  $('#in').addEventListener('input', drawAll);
  $('#reveal').addEventListener('change', e => { STATE.reveal = e.target.checked; drawAll(); });
  $('#mcmode').addEventListener('change', e => { STATE.mc = e.target.checked; drawAll(); });
  $('#clear').addEventListener('click', () => { $('#in').value = ''; $('#in').focus(); drawAll(); });

  drawAll();
}
init();
})();
