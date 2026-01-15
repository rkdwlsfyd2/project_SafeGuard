import { query } from '../server/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seed() {
    try {
        const sqlPath = path.join(__dirname, '../test_data.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Note: db.js export might be tricky if it uses process.env without loading dotenv
        // Ideally we should import dotenv here.

        console.log('Inserting test data...');
        // Split by semicolon might be needed if query() doesn't support multiple statements well,
        // but pg usually supports it if passed as one string? Use pool.query.
        // Let's try executing as one block.
        await query(sql);
        console.log('Test data inserted successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
}

seed();
