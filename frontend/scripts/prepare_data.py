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
RADIUS = 12
FEATURE_WEIGHTS = (0.15, 0.30, 0.55)  # genre, subgenre, instruments; cosine contributions


def slug(value):
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def tags(value):
    return sorted(set(part.strip() for part in value.split("|") if part.strip()))


def profile(row):
    return (row["genre"], tuple(tags(row["subgenre"])), tuple(tags(row["instruments"])))


def profile_features(profiles):
    import numpy as np

    vocabularies = [sorted({p[0] for p in profiles}),
                    sorted({s for p in profiles for s in p[1]}),
                    sorted({i for p in profiles for i in p[2]})]
    blocks = []
    for block, (vocabulary, weight) in enumerate(zip(vocabularies, FEATURE_WEIGHTS)):
        indices = {name: index for index, name in enumerate(vocabulary)}
        values = np.zeros((len(profiles), len(vocabulary)))
        for index, item in enumerate(profiles):
            names = [item[0]] if block == 0 else item[block]
            for name in names:
                values[index, indices[name]] = math.sqrt(weight / len(names))
        blocks.append(values)
    return np.concatenate(blocks, axis=1)


def spherical_layout(points):
    import numpy as np
    from scipy.stats import qmc

    # Balance the three axes, then spread radial ranks through a solid ball.
    # This is a display constraint: it deliberately changes embedding distances.
    centered = points - points.mean(axis=0)
    eigenvalues, axes = np.linalg.eigh(np.cov(centered, rowvar=False))
    whitening = np.einsum('ik,jk,k->ij', axes, axes, 1 / np.sqrt(np.maximum(eigenvalues, 1e-8)))
    balanced = np.einsum('ij,jk->ik', centered, whitening)
    lengths = np.linalg.norm(balanced, axis=1)
    order = np.argsort(lengths, kind="stable")
    radii = np.empty(len(points))
    radii[order] = RADIUS * ((np.arange(len(points)) + .5) / len(points)) ** (1 / 3)
    placed = balanced / np.maximum(lengths[:, None], 1e-8) * radii[:, None]
    # Relax empty wedges with deterministic sliced transport toward a filled ball.
    # Each pass adjusts only one ordered projection, rather than randomizing stars.
    sample = qmc.Halton(3, scramble=True, seed=42).random(len(points))
    height = sample[:, 1] * 2 - 1
    angle = sample[:, 2] * math.tau
    ring = np.sqrt(1 - height ** 2)
    target = np.column_stack((ring * np.cos(angle), height, ring * np.sin(angle)))
    target *= RADIUS * sample[:, :1] ** (1 / 3)
    directions = np.random.default_rng(42).normal(size=(192, 3))
    for direction in directions:
        direction /= np.linalg.norm(direction)
        projection = np.einsum('ij,j->i', placed, direction)
        order = np.argsort(projection, kind="stable")
        shift = np.sort(np.einsum('ij,j->i', target, direction)) - projection[order]
        placed[order] += shift[:, None] * direction * .6
    lengths = np.linalg.norm(placed, axis=1)
    radii[np.argsort(lengths, kind="stable")] = RADIUS * ((np.arange(len(points)) + .5) / len(points)) ** (1 / 3)
    return placed / np.maximum(lengths[:, None], 1e-8) * radii[:, None]


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
        assert track["instruments"] and len(track["position"]) == 3
        assert all(math.isfinite(x) for x in track["position"])
        assert math.dist(track["position"], [0, 0, 0]) <= RADIUS + 1e-4
    for group in genres + subgenres:
        assert group["trackIds"] and len(group["trackIds"]) == len(set(group["trackIds"]))
        assert set(group["trackIds"]) <= by_id.keys()
        assert len(group["position"]) == 3
        for axis in range(3):
            mean = sum(by_id[id]["position"][axis] for id in group["trackIds"]) / len(group["trackIds"])
            assert abs(group["position"][axis] - mean) < 1e-4
        for track_id in group["trackIds"]:
            track = by_id[track_id]
            if "genreId" in group:
                assert group["genreId"] == track["genreId"]
                assert group["id"] in track["subgenreIds"]
            else:
                assert group["id"] == track["genreId"]
    assert catalog["meta"]["sourceSha256"] == hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    assert catalog["meta"]["profileCount"] == len({profile(row) for row in rows})
    assert catalog["meta"]["layoutRadius"] == RADIUS
    used = set()
    assert 0 < len(catalog["links"]) <= 40
    for left, right in catalog["links"]:
        assert left in by_id and right in by_id and left != right
        assert left not in used and right not in used
        used.update((left, right))
        assert set(by_id[left]["instruments"]) & set(by_id[right]["instruments"])
    print(f"Verified {len(tracks):,} tracks / {len(genres)} genres / {len(subgenres)} subgenres.")


def build(rows):
    import numpy as np
    from sklearn.decomposition import PCA
    from sklearn.manifold import TSNE

    genre_names = sorted({row["genre"] for row in rows})
    profiles = sorted({profile(row) for row in rows})
    feature = profile_features(profiles)
    print(f"Embedding {len(profiles):,} genre / subgenre / instrument profiles…", flush=True)
    initial = PCA(n_components=3, svd_solver="full").fit_transform(feature).astype(np.float32)
    initial *= 1e-4 / initial[:, 0].std()
    xyz = TSNE(n_components=3, metric="cosine", perplexity=40, random_state=42,
               init=initial, learning_rate="auto", max_iter=1000, n_jobs=1).fit_transform(feature)
    profile_index = {item: index for index, item in enumerate(profiles)}
    ordered = sorted(rows, key=lambda row: row["TRACK_ID"])
    # Separate identical profiles before the radial transform; IDs fix the jitter.
    points = []
    for row in ordered:
        rng = random.Random(int(row["TRACK_ID"]))
        points.append(xyz[profile_index[profile(row)]] + np.array([rng.uniform(-.35, .35) for _ in range(3)]))
    positions = spherical_layout(np.array(points))
    colors = dict(zip(genre_names, COLORS))
    tracks = []
    for row, point in zip(ordered, positions):
        genre, subs = row["genre"], tags(row["subgenre"])
        tracks.append({
            "id": row["TRACK_ID"], "title": row["songname"], "artist": row["ARTIST_NAME"],
            "duration": float(row["DURATION"]), "path": row["PATH"],
            "genreId": slug(genre), "subgenreIds": [f"{slug(genre)}--{slug(s)}" for s in subs],
            "instruments": tags(row["instruments"]),
            "position": [round(float(value), 5) for value in point],
        })
    genres, subgenres = [], []

    def center(selected):
        return [round(sum(t["position"][i] for t in selected) / len(selected), 5) for i in range(3)]

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
    # A small constellation of nearby, tag-similar pairs; no invented stars.
    from sklearn.neighbors import NearestNeighbors
    neighbors = NearestNeighbors(n_neighbors=10).fit(positions).kneighbors(return_distance=False)
    candidates = []
    for left, adjacent in enumerate(neighbors):
        for right in adjacent:
            if right <= left or not .6 < np.linalg.norm(positions[left] - positions[right]) < 2.8:
                continue
            similarity = float(feature[profile_index[profile(ordered[left])]] @ feature[profile_index[profile(ordered[right])]])
            if similarity > .65 and set(tracks[left]["instruments"]) & set(tracks[right]["instruments"]):
                candidates.append((-similarity, left, int(right)))
    links, used, midpoints = [], set(), []
    for _, left, right in sorted(candidates):
        if left in used or right in used:
            continue
        midpoint = (positions[left] + positions[right]) / 2
        if any(np.linalg.norm(midpoint - previous) < 1.8 for previous in midpoints):
            continue
        links.append([tracks[left]["id"], tracks[right]["id"]])
        midpoints.append(midpoint)
        used.update((left, right))
        if len(links) == 40:
            break
    return {
        "meta": {"source": SOURCE.name, "sourceSha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
                 "profileCount": len(profiles), "seed": 42,
                 "embedding": "3D t-SNE · normalized genre / subgenre / instruments (15 / 30 / 55%) · cosine · perplexity 40",
                 "placement": "Balanced axes, density relaxation and radial ranks in a solid sphere; deterministic per-track jitter.",
                 "layoutRadius": RADIUS,
                 "audio": False},
        "genres": genres, "subgenres": subgenres, "tracks": tracks, "links": links,
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
