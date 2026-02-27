const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve('.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');

let url = '';
let key = '';

envFile.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function run() {
    console.log("Fetching citas...");
    const { data, error } = await supabase.from('citas').select('*');
    if (error) console.error("Error:", error);
    else {
        console.log(`Found ${data?.length} records`);
        if (data && data.length > 0) {
            console.log(data.map(d => ({ id: d.id, fecha: d.fecha, folio: d.folio, created_at: d.created_at })));
        }
    }
}
run();
