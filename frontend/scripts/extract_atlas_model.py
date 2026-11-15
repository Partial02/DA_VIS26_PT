"""Extract the Genre Atlas v4 recommendation model into a static JSON file.

The Genre Atlas prototype (genre_atlas_v4.html) embeds its precomputed model in a
single `const DATA={...};` line. This script converts that model to catalog IDs so
the INNER//VERSE frontend can run the same recommendation algorithm.

Usage (from frontend/):
    python3 scripts/extract_atlas_model.py path/to/genre_atlas_v4.html

The script validates every subgenre membership and track against
public/data/music-catalog.json before writing public/data/atlas-model.json.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / 'public' / 'data' / 'music-catalog.json'
OUTPUT = ROOT / 'public' / 'data' / 'atlas-model.json'


def load_v4_data(html_path: Path) -> dict:
    for line in html_path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if line.startswith('const DATA='):
            return json.loads(line[len('const DATA='):].rstrip(';'))
    raise SystemExit(f'const DATA line not found in {html_path}')


def build(html_path: Path) -> dict:
    data = load_v4_data(html_path)
    catalog = json.loads(CATALOG.read_text(encoding='utf-8'))
    genre_id = {g['name']: g['id'] for g in catalog['genres']}
    subgenre_id = {(s['genreId'], s['name']): s for s in catalog['subgenres']}
    tracks = {t['id']: t for t in catalog['tracks']}

    v4_genres = [genre_id[g['k']] for g in data['G']]
    track_ids = [str(t[4]).zfill(7) for t in data['TR']]
    assert len(track_ids) == len(tracks) == len(set(track_ids)), 'track count mismatch'
    for tid, row in zip(track_ids, data['TR']):
        track = tracks[tid]
        # v4 truncates long titles and artist names; the catalog keeps the full strings.
        assert track['title'].startswith(row[0]) and track['artist'].startswith(row[1]), tid
        assert int(track['duration']) == row[2], tid

    subgenres = []
    for sub in data['SUBS']:
        gid = v4_genres[sub['p']]
        target = subgenre_id[(gid, sub['n'])]
        members = sorted(track_ids[i] for i in sub['t'])
        assert members == sorted(target['trackIds']), sub['n']
        assert sub['c'] == len(members), sub['n']
        subgenres.append({'id': target['id'], 'weights': sub['w'], 'rates': sub['q'], 'artists': sub['a']})
    assert len(subgenres) == len(catalog['subgenres'])

    return {
        'meta': {
            'source': 'genre_atlas_v4.html',
            'catalogSha256': catalog['meta']['sourceSha256'],
            'note': 'Session weights: 2 core, 1 support, 0 none. Track masks use bit i for sessions[i]. '
                    'Arrays keep the Genre Atlas v4 order because the track tie-break hash uses those indices.',
        },
        'sessions': [{'key': key, 'name': name} for key, name in data['SESS']],
        'baseRates': data['P'],
        'families': [{'name': f['n'], 'genreIds': [v4_genres[g] for g in f['g']], 'sessions': f['s']} for f in data['FAM']],
        'genres': [{'id': v4_genres[i], 'name': g['n'], 'weights': g['w']} for i, g in enumerate(data['G'])],
        'subgenres': subgenres,
        'tracks': [[tid, row[3]] for tid, row in zip(track_ids, data['TR'])],
    }


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    model = build(Path(sys.argv[1]))
    OUTPUT.write_text(json.dumps(model, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(f'wrote {OUTPUT.relative_to(ROOT)}: {len(model["subgenres"])} subgenres, {len(model["tracks"])} tracks')


if __name__ == '__main__':
    main()
