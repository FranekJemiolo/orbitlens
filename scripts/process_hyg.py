#!/usr/bin/env python3
"""
OrbitLens HYG Star Catalog Processing Pipeline
Extracts stars visible to the naked eye (mag <= 6.0), converts coordinates to radians (J2000),
and exports:
  1. public/data/hyg_minified.csv (Raw source data)
  2. public/data/stars.bin (Flat binary buffer with 16-byte stride: int32 id, float32 ra, float32 dec, float32 mag)
  3. public/data/stars.json (Schema 1: VisibleStarArray [[id, ra, dec, mag], ...])
  4. public/data/stars.meta.json (Binary schema metadata)
  5. public/data/constellations.json (Major constellation line segment pairings)
"""

import os
import io
import gzip
import json
import struct
import math
import urllib.request
import pandas as pd
import numpy as np

UPSTREAM_URL = "https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v40.csv.gz"
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "data")
LOCAL_MINIFIED_CSV = os.path.join(OUTPUT_DIR, "hyg_minified.csv")
LOCAL_BIN = os.path.join(OUTPUT_DIR, "stars.bin")
LOCAL_JSON = os.path.join(OUTPUT_DIR, "stars.json")
LOCAL_META = os.path.join(OUTPUT_DIR, "stars.meta.json")
LOCAL_CONSTELLATIONS = os.path.join(OUTPUT_DIR, "constellations.json")

# Major constellation stick figures by HIP / HYG proper names or approximate RA/Dec pairs
MAJOR_CONSTELLATIONS = [
    {
        "name": "Orion",
        "lines": [
            # Betelgeuse (approx RA 5.92h, Dec 7.4°) to Bellatrix (RA 5.42h, Dec 6.35°)
            [[1.550, 0.129], [1.419, 0.111]],
            # Bellatrix to Mintaka (Belt 1)
            [[1.419, 0.111], [1.396, -0.003]],
            # Mintaka to Alnilam (Belt 2)
            [[1.396, -0.003], [1.414, -0.021]],
            # Alnilam to Alnitak (Belt 3)
            [[1.414, -0.021], [1.442, -0.034]],
            # Betelgeuse to Alnitak
            [[1.550, 0.129], [1.442, -0.034]],
            # Mintaka to Rigel (RA 5.24h, Dec -8.2°)
            [[1.396, -0.003], [1.372, -0.143]],
            # Alnitak to Saiph (RA 5.79h, Dec -9.67°)
            [[1.442, -0.034], [1.516, -0.169]],
            # Rigel to Saiph
            [[1.372, -0.143], [1.516, -0.169]]
        ]
    },
    {
        "name": "Ursa Major (Big Dipper)",
        "lines": [
            # Dubhe to Merak
            [[2.895, 1.078], [2.884, 0.984]],
            # Merak to Phecda
            [[2.884, 0.984], [3.114, 0.936]],
            # Phecda to Megrez
            [[3.114, 0.936], [3.208, 0.995]],
            # Megrez to Dubhe
            [[3.208, 0.995], [2.895, 1.078]],
            # Megrez to Alioth
            [[3.208, 0.995], [3.377, 0.977]],
            # Alioth to Mizar
            [[3.377, 0.977], [3.513, 0.958]],
            # Mizar to Alkaid
            [[3.513, 0.958], [3.611, 0.861]]
        ]
    },
    {
        "name": "Cassiopeia",
        "lines": [
            # Caph to Schedar
            [[0.040, 1.032], [0.177, 0.984]],
            # Schedar to Gamma Cas (Navi)
            [[0.177, 0.984], [0.247, 1.059]],
            # Gamma Cas to Ruchbah
            [[0.247, 1.059], [0.366, 1.050]],
            # Ruchbah to Segin
            [[0.366, 1.050], [0.463, 1.111]]
        ]
    },
    {
        "name": "Crux (Southern Cross)",
        "lines": [
            # Acrux to Gacrux
            [[3.255, -1.100], [3.279, -0.995]],
            # Mimosa to Imai
            [[3.350, -1.041], [3.188, -1.025]]
        ]
    }
]

def load_raw_hyg():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    if os.path.exists(LOCAL_MINIFIED_CSV):
        print(f"Loading local cached data: {LOCAL_MINIFIED_CSV}")
        return pd.read_csv(LOCAL_MINIFIED_CSV)

    print(f"Downloading HYG catalog from {UPSTREAM_URL} ...")
    req = urllib.request.Request(UPSTREAM_URL, headers={"User-Agent": "OrbitLens-Pipeline/1.0"})
    with urllib.request.urlopen(req) as resp:
        data = resp.read()

    with gzip.GzipFile(fileobj=io.BytesIO(data)) as gz:
        df = pd.read_csv(gz, usecols=["id", "proper", "ra", "dec", "mag", "con", "spect"])

    # Filter out Sol (id == 0) and faint stars (mag > 6.0)
    visible = df[(df["mag"] <= 6.0) & (df["id"] > 0)].copy()
    visible.sort_values(by="mag", inplace=True)
    visible.to_csv(LOCAL_MINIFIED_CSV, index=False)
    print(f"Saved minified source CSV to {LOCAL_MINIFIED_CSV} ({len(visible)} stars)")
    return visible

def process():
    df = load_raw_hyg()
    
    # RA is in hours (0..24) -> convert to radians (0..2pi)
    # Dec is in degrees (-90..+90) -> convert to radians (-pi/2..+pi/2)
    ra_rad = df["ra"].values * (math.pi / 12.0)
    dec_rad = np.deg2rad(df["dec"].values)
    mags = df["mag"].values.astype(np.float32)
    ids = df["id"].values.astype(np.int32)
    
    count = len(df)
    print(f"Processing {count} visible stars...")

    # 1. Export flat binary buffer (16-byte stride: int32, float32, float32, float32)
    with open(LOCAL_BIN, "wb") as f_bin:
        for i in range(count):
            packed = struct.pack("<ifff", ids[i], float(ra_rad[i]), float(dec_rad[i]), float(mags[i]))
            f_bin.write(packed)

    expected_size = count * 16
    actual_size = os.path.getsize(LOCAL_BIN)
    assert actual_size == expected_size, f"Size mismatch: {actual_size} != {expected_size}"
    print(f"Saved binary catalog to {LOCAL_BIN} ({actual_size} bytes, {count} stars, 16-byte stride)")

    # 2. Export Schema 1: VisibleStarArray [[id, ra, dec, mag], ...]
    star_array = [
        [int(ids[i]), round(float(ra_rad[i]), 6), round(float(dec_rad[i]), 6), round(float(mags[i]), 2)]
        for i in range(count)
    ]
    with open(LOCAL_JSON, "w", encoding="utf-8") as f_json:
        json.dump(star_array, f_json, separators=(",", ":"))
    print(f"Saved JSON catalog to {LOCAL_JSON}")

    # 3. Export stars.meta.json
    metadata = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "VisibleStarCatalogMeta",
        "description": "Optimized naked-eye star catalog compiled from HYG Database v4.0",
        "count": count,
        "strideBytes": 16,
        "epoch": "J2000",
        "limitingMagnitude": 6.0,
        "upstreamSource": UPSTREAM_URL,
        "upstreamEtag": "\"8215c7dc45943b7700fe1988b8aa7e750e461e86d60f31b0561bb1b50fdc23a4\"",
        "fields": [
            {"name": "id", "type": "int32", "offset": 0, "bytes": 4, "description": "HYG Catalog Star Identifier"},
            {"name": "ra", "type": "float32", "offset": 4, "bytes": 4, "unit": "radians", "range": [0, 6.283185]},
            {"name": "dec", "type": "float32", "offset": 8, "bytes": 4, "unit": "radians", "range": [-1.570796, 1.570796]},
            {"name": "mag", "type": "float32", "offset": 12, "bytes": 4, "unit": "magnitude", "range": [-1.46, 6.0]}
        ]
    }
    with open(LOCAL_META, "w", encoding="utf-8") as f_meta:
        json.dump(metadata, f_meta, indent=2)
    print(f"Saved metadata schema to {LOCAL_META}")

    # 4. Export Constellations
    with open(LOCAL_CONSTELLATIONS, "w", encoding="utf-8") as f_const:
        json.dump(MAJOR_CONSTELLATIONS, f_const, indent=2)
    print(f"Saved constellation stick figures to {LOCAL_CONSTELLATIONS}")

    # 5. Export Named Bright Benchmark Stars for interactive AR inspection
    con_names = {
        "And": "Andromeda", "Aqr": "Aquarius", "Aql": "Aquila", "Ari": "Aries", "Aur": "Auriga",
        "Boo": "Boötes", "Cnc": "Cancer", "CMa": "Canis Major", "CMi": "Canis Minor",
        "Cap": "Capricornus", "Car": "Carina", "Cas": "Cassiopeia", "Cen": "Centaurus",
        "Cep": "Cepheus", "Cet": "Cetus", "Cru": "Crux", "Cyg": "Cygnus", "Eri": "Eridanus",
        "Gem": "Gemini", "Her": "Hercules", "Hya": "Hydra", "Leo": "Leo", "Lyr": "Lyra",
        "Oph": "Ophiuchus", "Ori": "Orion", "Peg": "Pegasus", "Per": "Perseus", "Psc": "Pisces",
        "PsA": "Piscis Austrinus", "Sco": "Scorpius", "Sgr": "Sagittarius", "Tau": "Taurus",
        "UMa": "Ursa Major", "UMi": "Ursa Minor", "Vel": "Vela", "Vir": "Virgo"
    }

    named_df = df[df["proper"].notna() & (df["mag"] <= 3.2)].copy()
    named_stars = []
    for _, row in named_df.iterrows():
        raw_con = str(row["con"]) if pd.notna(row["con"]) else ""
        con_full = con_names.get(raw_con, raw_con)
        named_stars.append({
            "id": int(row["id"]),
            "name": str(row["proper"]).strip(),
            "raRad": round(float(row["ra"]) * (math.pi / 12.0), 6),
            "decRad": round(float(np.deg2rad(row["dec"])), 6),
            "mag": round(float(row["mag"]), 2),
            "constellation": con_full,
            "spectralType": str(row["spect"]).strip() if pd.notna(row["spect"]) else "Unknown"
        })

    local_named = os.path.join(OUTPUT_DIR, "named_stars.json")
    with open(local_named, "w", encoding="utf-8") as f_named:
        json.dump(named_stars, f_named, indent=2)
    print(f"Saved {len(named_stars)} named stars to {local_named}")

if __name__ == "__main__":
    process()
