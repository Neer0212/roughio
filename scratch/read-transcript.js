const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('C:\\\\Users\\\\neer1\\\\.gemini\\\\antigravity\\\\brain\\\\6caa9cba-4ea2-4430-87cf-8b65cd29666c\\\\.system_generated\\\\logs\\\\transcript_full.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    try {
      const obj = JSON.parse(line);
      if (obj.source === 'USER_EXPLICIT' && obj.content) {
        if (obj.content.includes('Phase 9')) {
          console.log('--- Phase 9 ---');
          const parts = obj.content.split('Phase 9');
          console.log('Phase 9' + parts[1].substring(0, 500));
        }
        if (obj.content.includes('Phase 7')) {
          console.log('--- Phase 7 ---');
          const parts = obj.content.split('Phase 7');
          console.log('Phase 7' + parts[1].substring(0, 500));
        }
      }
    } catch(e) {}
  }
}
processLineByLine();
