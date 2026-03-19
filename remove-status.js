const fs = require('fs');
let code = fs.readFileSync('inngest/functions/daily-digest.ts', 'utf8');

// Remove the import
code = code.replace(/,\s*setDigestRunStatus\s*/g, '');

// Remove all try-catch blocks with setDigestRunStatus
code = code.replace(/try\s*\{\s*await setDigestRunStatus\([\s\S]*?\}\s*catch\s*\([^\)]*\)\s*\{\s*console\.warn\("setDigestRunStatus failed, ignoring:",\s*[a-zA-Z]+\);\s*\}/g, '');

fs.writeFileSync('inngest/functions/daily-digest.ts', code);
