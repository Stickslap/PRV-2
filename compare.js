import fs from 'fs';
import path from 'path';

function compareDirs(dir1, dir2) {
  const files1 = fs.readdirSync(dir1, { withFileTypes: true });
  const files2 = fs.existsSync(dir2) ? fs.readdirSync(dir2, { withFileTypes: true }) : [];

  const map1 = new Map(files1.map(f => [f.name, f]));
  const map2 = new Map(files2.map(f => [f.name, f]));

  for (const [name, f1] of map1) {
    if (name === 'node_modules' || name === '.git') continue;
    const p1 = path.join(dir1, name);
    const p2 = path.join(dir2, name);
    if (!map2.has(name)) {
      console.log(`+ ${p1}`);
    } else {
      const f2 = map2.get(name);
      if (f1.isDirectory() && f2.isDirectory()) {
        compareDirs(p1, p2);
      } else if (f1.isFile() && f2.isFile()) {
        const c1 = fs.readFileSync(p1, 'utf8');
        const c2 = fs.readFileSync(p2, 'utf8');
        if (c1 !== c2) {
          console.log(`M ${p1}`);
        }
      }
    }
  }
}

compareDirs('_temp_repo/src', 'src');
const s1 = fs.readFileSync('_temp_repo/server.ts', 'utf8');
const s2 = fs.readFileSync('server.ts', 'utf8');
if (s1 !== s2) console.log('M _temp_repo/server.ts');
