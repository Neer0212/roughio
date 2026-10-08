import fs from 'fs';
import path from 'path';

function walk(dir, callback) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory()) {
            walk(filepath, callback);
        } else {
            callback(filepath);
        }
    }
}

walk('./src/app', (filepath) => {
    if (!filepath.endsWith('.ts') && !filepath.endsWith('.tsx')) return;
    
    // skip client-side things that might be using the client version of createClient
    // which is not async
    const isClientComp = filepath.includes('game-client.tsx') || filepath.includes('battle\\page.tsx');
    if (isClientComp) return;

    let content = fs.readFileSync(filepath, 'utf8');
    
    // Only replace if it uses server client
    if (content.includes('@/lib/supabase/server') && content.includes('createClient()')) {
        content = content.replace(/(?<!await\s)createClient\(\)/g, 'await createClient()');
        fs.writeFileSync(filepath, content);
        console.log(`Updated ${filepath}`);
    }
    
    // Also fix the Next.js 15 params Promise issue for dynamic routes
    if (filepath.includes('[id]\\route.ts') || filepath.includes('[id]/route.ts')) {
        content = content.replace(/params: \{ id: string \}/g, 'params: Promise<{ id: string }>');
        content = content.replace(/const id = params\.id/g, 'const { id } = await params');
        content = content.replace(/const \{ id \} = params/g, 'const { id } = await params');
        fs.writeFileSync(filepath, content);
    }
});
