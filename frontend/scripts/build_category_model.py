"""Build the genre × session category model used by the recommender.

Inputs (repository root, standard library only):
    mtg_genre_category.csv       every track with its `category` list (genre_session|...)
    mtg_category_definition.csv  231 genre × session categories with rates and lifts
    genre_color.csv              the representative color of each of the 15 genres

Outputs:
    frontend/public/data/category-model.json  sessions, genres, categories, subgenre profiles, track masks
    frontend/public/data/music-catalog.json   genre colors replaced with genre_color.csv (coordinates untouched)

Usage (from frontend/):
    python3 scripts/build_category_model.py          # write
    python3 scripts/build_category_model.py --check  # verify the shipped files
"""

from __future__ import annotations

import csv
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TRACKS = ROOT / 'mtg_genre_category.csv'
DEFINITIONS = ROOT / 'mtg_category_definition.csv'
COLORS = ROOT / 'genre_color.csv'
CATALOG = ROOT / 'frontend/public/data/music-catalog.json'
OUTPUT = ROOT / 'frontend/public/data/category-model.json'

# Column order of the session table: rhythm → low end → harmony → melody → color → voice.
SESSIONS = [
    ('drums', '드럼'), ('beats', '비트'), ('percussion', '퍼커션'), ('bass', '베이스'),
    ('electric_guitar', '일렉 기타'), ('acoustic_guitar', '어쿠스틱 기타'), ('piano', '피아노'), ('keys', '건반'),
    ('synth', '신스'), ('strings', '현악'), ('brass', '금관'), ('woodwind', '목관'),
    ('mallets', '말렛'), ('folk_reed', '리드'), ('ethnic', '민속 악기'), ('vocal', '보컬'),
]
SESSION_INDEX = {key: index for index, (key, _) in enumerate(SESSIONS)}


def digest(path: Path) -> str:
    """SHA-256 with line endings normalized, so a CRLF checkout verifies too."""
    return hashlib.sha256(path.read_bytes().replace(bytes([13, 10]), bytes([10]))).hexdigest()


def read(path: Path) -> list[dict[str, str]]:
    with path.open(encoding='utf-8', newline='') as handle:
        return list(csv.DictReader(handle))


def build() -> tuple[dict, dict]:
    catalog = json.loads(CATALOG.read_text(encoding='utf-8'))
    genre_id = {g['name']: g['id'] for g in catalog['genres']}
    colors = {row['genre']: row['color'].lower() for row in read(COLORS)}
    assert set(colors) == set(genre_id), 'genre_color.csv must name the 15 catalog genres'
    for genre in catalog['genres']:
        genre['color'] = colors[genre['name']]

    definitions = read(DEFINITIONS)
    assert len(definitions) == 231
    category_of: dict[str, tuple[str, int]] = {}
    genres = {g['id']: {'id': g['id'], 'name': g['name'], 'color': g['color'], 'rates': [0.0] * 16, 'lifts': [0.0] * 16}
              for g in catalog['genres']}
    categories = []
    for row in definitions:
        gid, session = genre_id[row['genre']], SESSION_INDEX[row['family']]
        category_of[row['category']] = (gid, session)
        genres[gid]['rates'][session] = float(row['family_rate'])
        genres[gid]['lifts'][session] = float(row['lift'])
        categories.append({'key': row['category'], 'genreId': gid, 'session': session, 'tracks': int(row['n_tracks']),
                           'rate': float(row['family_rate']), 'lift': float(row['lift']),
                           'instruments': row['instruments_in_genre'].split('|')})

    rows = read(TRACKS)
    by_id = {row['TRACK_ID'].zfill(7): row for row in rows}  # Excel dropped the leading zeros.
    assert set(by_id) == {t['id'] for t in catalog['tracks']}, 'track IDs differ from the catalog'
    masks: dict[str, int] = {}
    for track in catalog['tracks']:
        row = by_id[track['id']]
        mask = 0
        for key in filter(None, row['category'].split('|')):
            gid, session = category_of[key]
            assert gid == track['genreId'], f'{track["id"]}: {key} outside its genre'
            mask |= 1 << session
        assert mask, f'{track["id"]} has no category'
        masks[track['id']] = mask

    subgenres = []
    for sub in catalog['subgenres']:
        members = sub['trackIds']
        rates = [round(sum(masks[t] >> s & 1 for t in members) / len(members), 4) for s in range(16)]
        subgenres.append({'id': sub['id'], 'rates': rates, 'artists': len({by_id[t]['ARTIST_ID'] for t in members})})

    model = {
        'meta': {
            'source': TRACKS.name,
            'sourceSha256': digest(TRACKS),
            'definitionSha256': digest(DEFINITIONS),
            'note': 'Track masks use bit i for sessions[i]. Genre rates are family_rate from the definition CSV; '
                    'subgenre rates are the share of member tracks that use each session.',
        },
        'sessions': [{'key': key, 'name': name} for key, name in SESSIONS],
        'genres': [genres[g['id']] for g in catalog['genres']],
        'categories': categories,
        'subgenres': subgenres,
        'tracks': [[t['id'], masks[t['id']]] for t in catalog['tracks']],
    }
    return model, catalog


def dump(value: dict) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n'


def main() -> None:
    model, catalog = build()
    if '--check' in sys.argv:
        assert OUTPUT.read_text(encoding='utf-8') == dump(model), 'category-model.json is stale'
        shipped = json.loads(CATALOG.read_text(encoding='utf-8'))
        assert [g['color'] for g in shipped['genres']] == [g['color'] for g in catalog['genres']], 'catalog colors are stale'
        print('category model OK')
        return
    OUTPUT.write_text(dump(model), encoding='utf-8')
    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(f'wrote {OUTPUT.name}: {len(model["categories"])} categories, {len(model["subgenres"])} subgenres, {len(model["tracks"])} tracks')


if __name__ == '__main__':
    main()
