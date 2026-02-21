# ml/build_dataset.py

from nba_api.stats.endpoints import playergamelog
import pandas as pd
import os
import json

SEASONS = ["2022-23", "2023-24", "2024-25"]

# Use official NBA player IDs to avoid name-matching issues
TARGET_PLAYERS = [
    {"name": "Austin Reaves", "id": 1630559, "position": "SG", "age": 26},
    {"name": "Luka Doncic", "id": 1629029, "position": "PG", "age": 26},
    {"name": "LeBron James", "id": 2544, "position": "SF", "age": 40},
    {"name": "Rui Hachimura", "id": 1629060, "position": "PF", "age": 27},
    {"name": "DeAndre Ayton", "id": 1629028, "position": "C", "age": 27},
]

def build_dataset():
    all_rows = []
    player_history = []

    for player in TARGET_PLAYERS:
        name = player["name"]
        player_id = player["id"]
        position = player["position"]
        age = player["age"]

        history = {
            "name": name,
            "minutesPerGame": {},
            "usageRate": {"year1": 16.1, "year2": 20.3, "year3": 23.6},  # placeholder
            "foulsDrawnPerGame": 0,
            "foulsCommittedPerGame": 0,
            "contactRate": 0,
            "injuries": [],
            "age": age,
            "position": position,
        }

        for i, season in enumerate(SEASONS):
            gamelog = playergamelog.PlayerGameLog(player_id=player_id, season=season)
            df = gamelog.get_data_frames()[0]

            if df.empty:
                print(f"⚠️ No games found for {name} in {season}")
                continue

            df["PLAYER"] = name
            df["SEASON"] = season
            df["AGE"] = age
            df["INJURY_COUNT"] = 0

            # Rolling 10-game minutes for ML CSV
            df["MIN_ROLLING_10"] = df["MIN"].rolling(10).mean()
            history["rollingMin"] = df["MIN_ROLLING_10"].dropna().tolist()

            # Contact proxy
            df["CONTACT_RATE"] = df["PF"] + df["FTA"]

            # Injury proxy: gap > 10 days
            df["GAME_DATE"] = pd.to_datetime(df["GAME_DATE"])
            df = df.sort_values("GAME_DATE")
            df["DAYS_BETWEEN"] = df["GAME_DATE"].diff().dt.days
            df["INJURY_NEXT"] = (df["DAYS_BETWEEN"] > 10).astype(int)
            df["INJURY_COUNT"] = df["INJURY_NEXT"].rolling(20).sum().fillna(0)

            # USG% placeholder
            avg_usg = df["MIN"].mean() / 48 / 5 * 100 

            # Update player_history for JSON
            history["minutesPerGame"][f"year{i+1}"] = df["MIN"].mean()
            history["usageRate"][f"year{i+1}"] = round(avg_usg, 1)
            history["foulsCommittedPerGame"] += df["PF"].mean()
            history["foulsDrawnPerGame"] += df["FTA"].mean()

            for gap in df["DAYS_BETWEEN"].dropna():
                if gap > 10:
                    history["injuries"].append({
                        "year": int(season.split("-")[0]),
                        "category": "minor",
                        "gamesMissed": int(gap),
                        "recoveryDays": int(gap)
                    })

            all_rows.append(df)

        # Average fouls across seasons
        seasons_count = len(SEASONS)
        if seasons_count > 0:
            history["foulsCommittedPerGame"] /= seasons_count
            history["foulsDrawnPerGame"] /= seasons_count
        history["contactRate"] = history["foulsCommittedPerGame"] + history["foulsDrawnPerGame"]

        player_history.append(history)

    # Save CSV for ML model
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