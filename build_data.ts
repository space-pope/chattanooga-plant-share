import * as fs from 'fs/promises';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const SHEET_ID = "1fnay67_hc7hU1BRAhbcfnQW5TQGReXGWpn0vIa_dkMY";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

const PLANTS_JSON_PATH = "data/plants.json";
const DATA_DIR = "data";

async function main() {
    console.log(`Downloading CSV from ${CSV_URL}...`);
    const response = await fetch(CSV_URL);
    if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    }
    const csvData = await response.text();

    console.log("Parsing CSV...");
    const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true
    });

    const targetSlugs = new Set<string>();
    for (const row of records) {
        const url = row['URL'] || row['Url'] || row['url'];
        if (url && url.trim()) {
            const trimmedUrl = url.trim();
            try {
                const parsedUrl = new URL(trimmedUrl);
                const pathname = parsedUrl.pathname.replace(/\/$/, '');
                if (pathname) {
                    const slug = pathname.split('/').pop();
                    if (slug) {
                        targetSlugs.add(slug);
                    }
                }
            } catch (e) {
                // Invalid URL, skip
            }
        }
    }

    console.log(`Found ${targetSlugs.size} unique Permapeople URLs in the spreadsheet.`);

    console.log(`Loading ${PLANTS_JSON_PATH}...`);
    const plantsDataRaw = await fs.readFile(PLANTS_JSON_PATH, 'utf-8');
    const plants = JSON.parse(plantsDataRaw);

    const plantMap = new Map<string, any>();
    for (const p of plants) {
        if (p.slug) {
            plantMap.set(p.slug, p);
        }
    }
    console.log(`Loaded ${plantMap.size} plants from ${PLANTS_JSON_PATH}.`);

    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (e) {
        // Ignore if exists
    }

    let count = 0;
    for (const slug of targetSlugs) {
        if (plantMap.has(slug)) {
            const plantData = plantMap.get(slug);
            
            // Sort keys in data
            if (plantData.data) {
                const sortedData: any = {};
                Object.keys(plantData.data).sort().forEach(key => {
                    sortedData[key] = plantData.data[key];
                });
                plantData.data = sortedData;
            }

            const outPath = path.join(DATA_DIR, `${slug}.json`);
            await fs.writeFile(outPath, JSON.stringify(plantData, null, 2), 'utf-8');
            count++;
        } else {
            console.log(`Warning: Slug '${slug}' not found in ${PLANTS_JSON_PATH}.`);
        }
    }

    console.log(`Successfully generated ${count} JSON files in the '${DATA_DIR}' directory.`);
}

main().catch(console.error);
