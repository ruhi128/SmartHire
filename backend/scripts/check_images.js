const fs = require('fs');
const path = require('path');

const baseDir = 'C:/Users/viraj/.gemini/antigravity/scratch/placement-resources';
const dirs = fs.readdirSync(baseDir).filter(f => !f.startsWith('.') && fs.statSync(path.join(baseDir, f)).isDirectory());

for (const dir of dirs) {
  const readme = path.join(baseDir, dir, 'README.md');
  if (fs.existsSync(readme)) {
    const text = fs.readFileSync(readme, 'utf8');
    const matches = text.match(/<img[^>]+src=["']([^"']+)["']|!\[[^\]]*\]\(([^)]+)\)/g);
    if (matches) {
      console.log(dir + ':', matches);
    }
  }
}
