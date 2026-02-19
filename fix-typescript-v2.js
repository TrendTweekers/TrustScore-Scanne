// fix-typescript-v2.js
const fs = require('fs');
const path = require('path');

const file = 'frontend/components/FixRecommendations.jsx';
const filepath = path.join(process.cwd(), file);

let content = fs.readFileSync(filepath, 'utf8');

// Fix the incomplete ternary operator
content = content.replace(
  /setExpandedFix\(expandedFix === i \? null \)/g,
  'setExpandedFix(expandedFix === i ? null : i)'
);

fs.writeFileSync(filepath, content, 'utf8');
console.log('✅ Fixed FixRecommendations.jsx');