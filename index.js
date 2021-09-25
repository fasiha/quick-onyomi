var fs = require('fs');
var s = fs.readFileSync('kanjidic2.xml', 'utf8');
var vs = s.split('<character>').filter(s => s.includes('ja_on') && s.includes('<literal>'));
var onToKanji = new Map();
var kanjiToGrade = new Map();

for (const s of vs) {
  let match = s.match(/<literal>(.+)<\/literal>/);
  if (!match) {
    continue;
  }
  const literal = match[1];
  match = s.match(/<grade>(.+)<\/grade>/);
  if (match) {
    const grade = +(match[1]);
    kanjiToGrade.set(literal, grade);
  } else {
    kanjiToGrade.set(literal, 13);
  }
  const ons = Array.from(s.matchAll(/<reading r_type="ja_on">(.+)<\/reading>/g), o => o[1]);
  for (const on of ons) {
    if (onToKanji.has(on)) {
      onToKanji.get(on).add(literal)
    } else {
      onToKanji.set(on, new Set([literal]))
    }
  }
}

function groupBy(f, v) {
  const ret = new Map();
  for (const x of v) {
    const y = f(x);
    if (ret.has(y)) {
      ret.get(y).push(x);
    } else {
      ret.set(y, [x]);
    }
  }
  return ret;
}

var p = Array.from(onToKanji, ([k, v]) => [k, Array.from(v)]);
p.sort((a, b) => a[1].length < b[1].length ? 1 : a[1].length === b[1].length ? 0 : -1);

var sections = p.map(([on, ks]) => {
  const header = `# ${on} (${ks.length})`;
  const gradeToKanjis = Array.from(groupBy(k => kanjiToGrade.get(k), ks));
  gradeToKanjis.sort((a, b) => a[0] < b[0] ? -1 : 1);
  const sections = gradeToKanjis.map(
      ([grade, kanjis]) => `## Grade ${grade === 13 ? 'X' : grade} (${kanjis.length})\n${kanjis.join('')}`);
  return `${header}\n${sections.join('\n')}`
});

fs.writeFileSync('README.md', sections.join('\n\n'));