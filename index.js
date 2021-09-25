var fs = require('fs');
var s = fs.readFileSync('kanjidic2.xml', 'utf8');
var vs = s.split('<character>').filter(s => s.includes('ja_on') && s.includes('<literal>'));
var onToKanji = new Map();

for (const s of vs) {
  const match = s.match(/<literal>(.+)<\/literal>/);
  if (!match) {
    continue;
  }
  const literal = match[1];
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

var levelToKanjis = JSON.parse(fs.readFileSync('kanken.json', 'utf8'));
var kanjis = new Set(Object.values(levelToKanjis).join('').split(''))
var kanjiToLevel = new Map();
for (const l of Object.keys(levelToKanjis)) {
  const kanjis = levelToKanjis[l];
  const level = +l;
  for (const k of kanjis) {
    if (kanjiToLevel.has(k)) {
      throw new Error('what ' + k);
    }
    kanjiToLevel.set(k, level);
  }
}

var p = Array
            .from(onToKanji,
                  ([on, ks]) => {
                    ks = Array.from(ks).filter(s => kanjis.has(s));
                    const groups = Array.from(groupBy(s => kanjiToLevel.get(s), ks));
                    groups.sort((a, b) => a[0] < b[0] ? 1 : -1);
                    return [on, groups, ks];
                  })
            .filter(([_, _2, ks]) => ks.length > 0);
p.sort((a, b) => a[2].length < b[2].length ? 1 : a[2].length === b[2].length ? 0 : -1);

var sections = p.map(([on, gs, ks]) => {
  const header = `# ${on} (${ks.length})`;
  const subsections = gs.map(([grade, ks]) => {
    let header = `## Kanken ${grade}`;
    if (grade >= 5) {
      header += `=${10 - grade + 1}年`;
    } else if (grade === 0) {
      header += `=人名用`
    }
    header += ` (${ks.length})`;
    return header + '\n' + ks.join('');
  });
  return `${header}\n${subsections.join('\n')}`
})

fs.writeFileSync('README.md', sections.join('\n\n'));