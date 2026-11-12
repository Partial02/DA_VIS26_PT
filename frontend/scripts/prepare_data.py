"""Build the browser catalog. --check validates it without scientific dependencies."""

import argparse
import csv
import hashlib
import json
import math
from pathlib import Path
import random
import re

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "mtg_jamendo_genre_instrument.csv"
OUTPUT = ROOT / "frontend/public/data/music-catalog.json"
COLORS = ["#a999dc", "#bfc8e3", "#809cdb", "#b49dc5", "#91bdbd",
          "#8495ca", "#b89ac8", "#7eacd2", "#b49ad6", "#d5ae83",
          "#a99cc6", "#799bd6", "#82b8c6", "#79b3bd", "#b7aecf"]


def slug(value):
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def tags(value):
    return sorted(set(part.strip() for part in value.split("|") if part.strip()))


def validate(catalog, rows):
    tracks, genres, subgenres = catalog["tracks"], catalog["genres"], catalog["subgenres"]
    assert len(tracks) == len(rows) == 4961
    assert len(genres) == 15 and len(subgenres) == 146
    by_id = {track["id"]: track for track in tracks}
    assert len(by_id) == len(tracks)
    assert set(by_id) == {row["TRACK_ID"] for row in rows}
    genre_ids = {group["id"] for group in genres}
    subgenre_ids = {group["id"] for group in subgenres}
    for track in tracks:
        assert isinstance(track["id"], str) and track["id"].isdigit()
        assert track["genreId"] in genre_ids
        assert set(track["subgenreIds"]) <= subgenre_ids
        assert track["instruments"] and all(math.isfinite(x) for x in track["position"])
    for group in genres + subgenres:
        assert group["trackIds"] and len(group["trackIds"]) == len(set(group["trackIds"]))
        assert set(group["trackIds"]) <= by_id.keys()
        for track_id in group["trackIds"]:
            track = by_id[track_id]
            if "genreId" in group:
                assert group["genreId"] == track["genreId"]
                assert group["id"] in track["subgenreIds"]
            else:
                assert group["id"] == track["genreId"]
    assert catalog["meta"]["sourceSha256"] == hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    assert catalog["meta"]["profileCount"] == 339
    print(f"Verified {len(tracks):,} tracks / {len(genres)} genres / {len(subgenres)} subgenres.")


def build(rows):
    import numpy as np
    from sklearn.manifold import TSNE

    genre_names = sorted({row["genre"] for row in rows})
    sub_names = sorted({s for row in rows for s in tags(row["subgenre"])})
    profiles = sorted({(row["genre"], tuple(tags(row["subgenre"]))) for row in rows})
    feature = np.zeros((len(profiles), len(genre_names) + len(sub_names)), dtype=np.float64)
    for index, (genre, subs) in enumerate(profiles):
        feature[index, genre_names.index(genre)] = 2.0
        for sub in subs:
            feature[index, len(genre_names) + sub_names.index(sub)] = 1.0
    xy = TSNE(n_components=2, metric="cosine", perplexity=30, random_state=42,
              init="random", learning_rate="auto", max_iter=1000, n_jobs=1).fit_transform(feature)
    xy -= (xy.min(axis=0) + xy.max(axis=0)) / 2
    xy *= 24 / np.ptp(xy, axis=0).max()  # Uniform scaling preserves the embedding's proportions.
    profile_xy = {profile: xy[index] for index, profile in enumerate(profiles)}
    colors = dict(zip(genre_names, COLORS))
    tracks = []
    for row in sorted(rows, key=lambda item: item["TRACK_ID"]):
        genre, subs = row["genre"], tags(row["subgenre"])
        point = profile_xy[(genre, tuple(subs))]
        rng = random.Random(int(row["TRACK_ID"]))
        angle, radius = rng.uniform(0, math.tau), math.sqrt(rng.random()) * 0.32
        tracks.append({
            "id": row["TRACK_ID"], "title": row["songname"], "artist": row["ARTIST_NAME"],
            "duration": float(row["DURATION"]), "path": row["PATH"],
            "genreId": slug(genre), "subgenreIds": [f"{slug(genre)}--{slug(s)}" for s in subs],
            "instruments": tags(row["instruments"]),
            "position": [round(float(point[0]) + math.cos(angle) * radius, 5),
                         round(float(point[1]) + math.sin(angle) * radius, 5)],
        })
    genres, subgenres = [], []

    def center(selected):
        return [round(sum(t["position"][i] for t in selected) / len(selected), 5) for i in (0, 1)]

    for name in genre_names:
        genre_id = slug(name)
        selected = [t for t in tracks if t["genreId"] == genre_id]
        names = sorted({s for row in rows if row["genre"] == name for s in tags(row["subgenre"])})
        group_ids = []
        for sub in names:
            sub_id = f"{genre_id}--{slug(sub)}"
            group_ids.append(sub_id)
            members = [t for t in selected if sub_id in t["subgenreIds"]]
            subgenres.append({"id": sub_id, "name": sub, "genreId": genre_id,
                              "trackIds": [t["id"] for t in members], "position": center(members)})
        genres.append({"id": genre_id, "name": name, "color": colors[name],
                       "trackIds": [t["id"] for t in selected], "subgenreIds": group_ids,
                       "instruments": sorted({i for t in selected for i in t["instruments"]}),
                       "position": center(selected)})
    return {
        "meta": {"source": SOURCE.name, "sourceSha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
                 "profileCount": len(profiles), "seed": 42,
                 "embedding": "2D t-SNE · genre (2) + subgenre (1) tags · cosine · perplexity 30",
                 "placement": "339 tag-profile coordinates; deterministic per-track disk offsets (radius 0.32).",
                 "audio": False},
        "genres": genres, "subgenres": subgenres, "tracks": tracks,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    with SOURCE.open(newline="", encoding="utf-8-sig") as source:
        source_rows = list(csv.DictReader(source))
    if args.check:
        validate(json.loads(OUTPUT.read_text()), source_rows)
    else:
        data = build(source_rows)
        validate(data, source_rows)
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n")
        print(f"Saved {OUTPUT.relative_to(ROOT)} ({OUTPUT.stat().st_size:,} bytes).")
