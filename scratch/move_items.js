const fs = require('fs');
const path = require('path');

const files = [
  'd:/Codes/intractive Quiz/src/app/student/builder/page.tsx',
  'd:/Codes/intractive Quiz/src/app/world/[id]/page.tsx',
  'd:/Codes/intractive Quiz/src/app/student/examples/page.tsx'
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  const startMarker = 'if (isMatch("street_light", "street light", "💡")) {';
  const endMarker = '  if (isMatch("flower", "flower", "🌸")) {';
  
  const startIndex = content.indexOf(startMarker);
  if (startIndex === -1) {
    console.log('Start marker not found in ' + filePath);
    return;
  }
  
  // Find the end of the flower block
  const endIndexStart = content.indexOf(endMarker);
  const endBlock = '      </ModelWrapper>\n    );\n  }';
  const endIndex = content.indexOf(endBlock, endIndexStart) + endBlock.length;
  
  const blockToMove = content.substring(startIndex, endIndex);
  
  // Remove the block from its current location
  content = content.slice(0, startIndex) + content.slice(endIndex);
  
  // Find insertion point (after isMatch definition)
  const insertMarker = 'const isMatch = (...args: string[]) => args.some(a => itemId === a || name.toLowerCase().includes(a.toLowerCase()) || emoji === a);';
  const insertIndex = content.indexOf(insertMarker) + insertMarker.length;
  
  // Insert the block
  content = content.slice(0, insertIndex) + '\n\n  ' + blockToMove + '\n' + content.slice(insertIndex);
  
  fs.writeFileSync(filePath, content);
  console.log('Successfully updated ' + filePath);
}

files.forEach(processFile);
