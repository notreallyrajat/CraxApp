const fs = require('fs');

const dbText = fs.readFileSync('/home/coding/.gemini/antigravity/brain/cbfe0bc3-8ee2-4aa3-aded-0f3dec266957/.system_generated/steps/150/output.txt', 'utf-8');
const match = dbText.match(/<untrusted-data-[^>]+>([\s\S]+?)<\/untrusted-data/);
const dbEmails = new Set(JSON.parse(match[1].trim()).map(r => r.email));

const csvText = fs.readFileSync('/home/coding/Desktop/CSVMERGER/merged_batch_3.csv', 'utf-8');
const csvEmails = csvText.split('\n').slice(1).filter(line => line.trim()).map(line => line.split(',')[1].trim().toLowerCase());

for (const email of csvEmails) {
    if (!dbEmails.has(email)) {
        console.log("Failed email:", email);
    }
}
