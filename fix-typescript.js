// Quick Fix Script - Remove TypeScript Syntax
// Run this in your TrustScore-Scanner directory

const fs = require('fs');
const path = require('path');

const filesToFix = [
  'frontend/components/AIAnalysis.jsx',
  'frontend/components/CompetitorView.jsx',
  'frontend/components/DashboardHeader.jsx',
  'frontend/components/FixRecommendations.jsx',
  'frontend/components/MonitoringCard.jsx',
  'frontend/components/ScoreBreakdown.jsx',
  'frontend/components/ScoreHero.jsx',
];

filesToFix.forEach(file => {
  const filepath = path.join(process.cwd(), file);
  
  if (fs.existsSync(filepath)) {
    let content = fs.readFileSync(filepath, 'utf8');
    
    // Remove interface declarations
    content = content.replace(/interface\s+\w+\s*{[^}]*}/gs, '');
    
    // Remove type annotations in function parameters
    content = content.replace(/\(\s*{\s*([^}]+)}\s*:\s*\w+\s*\)/g, '({ $1 })');
    
    // Remove type annotations in variable declarations
    content = content.replace(/const\s+(\w+)\s*:\s*\w+(\[\])?\s*=/g, 'const $1 =');
    
    // Remove 'as Type[]' casts
    content = content.replace(/\s+as\s+\w+\[\]/g, '');
    
    // Remove remaining : Type syntax
    content = content.replace(/:\s*\w+(\[\])?\s*([,\)])/g, '$2');
    
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`✅ Fixed: ${file}`);
  } else {
    console.log(`⚠️  Not found: ${file}`);
  }
});

console.log('\n✅ All files fixed! Run npm run dev again.');
