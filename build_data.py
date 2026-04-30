import csv
import json
import os
import urllib.request
from urllib.parse import urlparse

# Google Sheets CSV Export URL
SHEET_ID = "1fnay67_hc7hU1BRAhbcfnQW5TQGReXGWpn0vIa_dkMY"
CSV_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv"

# Paths
PLANTS_JSON_PATH = "data/plants.json"
DATA_DIR = "data"

def main():
    print(f"Downloading CSV from {CSV_URL}...")
    req = urllib.request.Request(CSV_URL)
    with urllib.request.urlopen(req) as response:
        csv_data = response.read().decode('utf-8')

    print("Parsing CSV...")
    reader = csv.DictReader(csv_data.splitlines())

    # Extract unique slugs from CSV
    target_slugs = set()
    for row in reader:
        # Search for any column that contains the URL. In main.js it checks 'URL', 'Url', 'url'
        url = row.get('URL') or row.get('Url') or row.get('url')
        if url and url.strip():
            url = url.strip()
            # Extract the last path element as the slug
            parsed = urlparse(url)
            path = parsed.path.rstrip('/')
            if path:
                slug = path.split('/')[-1]
                if slug:
                    target_slugs.add(slug)

    print(f"Found {len(target_slugs)} unique Permapeople URLs in the spreadsheet.")

    print(f"Loading {PLANTS_JSON_PATH}...")
    with open(PLANTS_JSON_PATH, 'r', encoding='utf-8') as f:
        plants = json.load(f)

    # Create a mapping of slug to plant data
    plant_map = {p['slug']: p for p in plants if 'slug' in p}
    print(f"Loaded {len(plant_map)} plants from {PLANTS_JSON_PATH}.")

    # Create output directory
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)

    # Write out JSON files for the targeted slugs
    count = 0
    for slug in target_slugs:
        if slug in plant_map:
            plant_data = plant_map[slug]
            plant_data["data"] = {k: v for k, v in sorted(plant_data["data"].items(), key=lambda x: x[0])}
            out_path = os.path.join(DATA_DIR, f"{slug}.json")
            with open(out_path, 'w', encoding='utf-8') as f:
                json.dump(plant_data, f, indent=2)
            count += 1
        else:
            print(f"Warning: Slug '{slug}' not found in {PLANTS_JSON_PATH}.")

    print(f"Successfully generated {count} JSON files in the '{DATA_DIR}' directory.")

if __name__ == "__main__":
    main()
