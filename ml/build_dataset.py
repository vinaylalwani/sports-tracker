# ml/build_dataset.py

from nba_api.stats.endpoints import playergamelog
from datetime import datetime
import pandas as pd
import os
import json

SEASONS = {
    "2022-23": (datetime(2022, 10, 1), datetime(2023, 6, 30)),
    "2023-24": (datetime(2023, 10, 1), datetime(2024, 6, 30)),
    "2024-25": (datetime(2024, 10, 1), datetime(2025, 6, 30)),
}

TARGET_PLAYERS = [
    {"name": "Austin Reaves", "id": 1630559, "position": "SG", "age": 27},
    {"name": "Luka Doncic", "id": 1629029, "position": "PG", "age": 26},
    {"name": "LeBron James", "id": 2544, "position": "SF", "age": 41},
    {"name": "Rui Hachimura", "id": 1629060, "position": "PF", "age": 28},
    {"name": "DeAndre Ayton", "id": 1629028, "position": "C", "age": 27},
]

# Hardcoded / simulated injury data
SIMULATED_INJURIES = {
    "LeBron James": [
        {"season": "2025-26", "date": "2025-10-20", "status": "Out", "body_part": "Sciatica"},
        {"season": "2026-02-05", "status": "Out", "body_part": "Left Knee Soreness"},
        {"season": "2026-02-10", "status": "Out", "body_part": "Foot Injury"},
        {"season": "2024-25", "date": "2025-03-08", "status": "Out", "body_part": "Groin Strain"},
        {"season": "2024-25", "date": "2025-06-01", "status": "Out", "body_part": "Knee Ligament Injury"},
    ],
    "Luka Doncic": [
        {"season": "2025-26", "date": "2026-02-01", "status": "Out", "body_part": "Left Hamstring Strain"},
        {"season": "2023-24", "date": "2024-01-15", "status": "Out", "body_part": "Right Ankle Soreness"},
        {"season": "2022-23", "date": "2023-05-01", "status": "Questionable", "body_part": "Minor ankle/thigh soreness"},
    ],
    "Austin Reaves": [
        {"season": "2025-26", "date": "2025-12-25", "status": "Out", "body_part": "Left Calf Strain"},
        {"season": "2025-26", "date": "2025-11-15", "status": "Out", "body_part": "Groin Injury"},
        {"season": "2025-26", "date": "2025-12-05", "status": "Out", "body_part": "Minor Calf Injury"},
    ],
    "Rui Hachimura": [
        {"season": "2025-26", "date": "2026-01-05", "status": "Out", "body_part": "Left Calf Strain"},
        {"season": "2025-26", "date": "2025-12-28", "status": "Out", "body_part": "Right Groin Soreness"},
        {"season": "2025-26", "date": "2025-11-15", "status": "Out", "body_part": "Calf Injury"},
    ],
    "DeAndre Ayton": [
        {"season": "2025-26", "date": "2025-11-24", "status": "Out", "body_part": "Right Knee Contusion"},
        {"season": "2025-26", "date": "2025-12-17", "status": "Out", "body_part": "Elbow Injury"},
        {"season": "2025-26", "date": "2026-01-16", "status": "Out", "body_part": "Knee Injury"},
        {"season": "2025-26", "date": "2026-01-21", "status": "Out", "body_part": "Eye Injury"},
        {"season": "2026-02-07", "date": "2026-02-12", "status": "Out", "body_part": "Right Knee Soreness"},
    ],
}

def fetch_injuries_for_player(player_name):
    return SIMULATED_INJURIES.get(player_name, [])

def build_dataset():
    all_rows = []
    player_history = []

    for player in TARGET_PLAYERS:
        name = player["name"]
        player_id = player["id"]
        position = player["position"]
        age = player["age"]

        injury_history = fetch_injuries_for_player(name)

        history = {
            "name": name,
            "minutesPerGame": {},
            "foulsDrawnPerGame": 0,
            "foulsCommittedPerGame": 0,
            "contactRate": 0,
            "injuries": injury_history,
            "age": age,
            "position": position,
        }

        for i, season in enumerate(SEASONS.keys()):
            gamelog = playergamelog.PlayerGameLog(player_id=player_id, season=season)
            df = gamelog.get_data_frames()[0]

            if df.empty:
                print(f"⚠️ No games found for {name} in {season}")
                continue

            df["PLAYER"] = name
            df["SEASON"] = season
            df["AGE"] = age

            # Sort by game date
            df["GAME_DATE"] = pd.to_datetime(df["GAME_DATE"])
            df = df.sort_values("GAME_DATE").reset_index(drop=True)

            # Injuries for this season
            season_injuries = [inj for inj in injury_history if inj["season"] == season]
            injury_dates = [pd.to_datetime(inj["date"]) for inj in season_injuries if "date" in inj]

            # Compute INJURY_COUNT cumulatively per game
            df["INJURY_COUNT"] = df["GAME_DATE"].apply(lambda d: sum(d > inj_date for inj_date in injury_dates))

            # Compute INJURY_NEXT per game
            df["INJURY_NEXT"] = df["GAME_DATE"].apply(lambda d: 1 if any(inj_date > d for inj_date in injury_dates) else 0)

            # Rolling 10-game minutes
            df["MIN_ROLLING_10"] = df["MIN"].rolling(10).mean()

            # Contact proxy
            df["CONTACT_RATE"] = df["PF"] + df["FTA"]

            # Update player history
            history["minutesPerGame"][f"year{i+1}"] = df["MIN"].mean()
            history["foulsCommittedPerGame"] += df["PF"].mean()
            history["foulsDrawnPerGame"] += df["FTA"].mean()

            all_rows.append(df)

        # Average fouls and contact rate across seasons
        seasons_count = len(SEASONS)
        if seasons_count > 0:
            history["foulsCommittedPerGame"] /= seasons_count
            history["foulsDrawnPerGame"] /= seasons_count
        history["contactRate"] = history["foulsCommittedPerGame"] + history["foulsDrawnPerGame"]

        player_history.append(history)

    # Save CSV for ML
    if all_rows:
        final_df = pd.concat(all_rows).dropna()
        os.makedirs("data", exist_ok=True)
        final_df.to_csv("data/training_data.csv", index=False)
        print("✅ Training CSV generated successfully!")
    else:
        print("❌ No game logs found for any player!")

    # Save JSON for frontend
    os.makedirs("../lib", exist_ok=True)
    with open("../lib/playerHistoryData.json", "w") as f:
        json.dump(player_history, f, indent=2)
    print("✅ Player history JSON generated successfully!")

if __name__ == "__main__":
    build_dataset()