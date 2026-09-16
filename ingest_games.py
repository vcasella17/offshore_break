import os
import psycopg2
import requests
from datetime import timedelta
from zoneinfo import ZoneInfo
from datetime import datetime

conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()

# Use Eastern time, since that's the timezone MLB's schedule "day" is based around
eastern_now = datetime.now(ZoneInfo("America/New_York"))
target_date = (eastern_now - timedelta(days=1)).date().isoformat()

url = f"https://statsapi.mlb.com/api/v1/schedule?sportId=1&date={target_date}&gameType=R"
response = requests.get(url)
data = response.json()

print(f"Requesting: {url}")
print(f"Status code: {response.status_code}")
print(f"Number of dates returned: {len(data.get('dates', []))}")

games_inserted = 0

for date_entry in data.get("dates", []):
    for game in date_entry.get("games", []):
        if game["status"]["abstractGameState"] != "Final":
            continue

        game_id = str(game["gamePk"])
        game_date = date_entry["date"]
        home_team_id = str(game["teams"]["home"]["team"]["id"])
        away_team_id = str(game["teams"]["away"]["team"]["id"])
        home_score = game["teams"]["home"].get("score")
        away_score = game["teams"]["away"].get("score")

        cur.execute(
            '''INSERT INTO "Games" (id, game_date, home_team_id, away_team_id, home_score, away_score)
               VALUES (%s, %s, %s, %s, %s, %s)
               ON CONFLICT (id) DO UPDATE SET
                 home_score = EXCLUDED.home_score,
                 away_score = EXCLUDED.away_score''',
            (game_id, game_date, home_team_id, away_team_id, home_score, away_score)
        )
        games_inserted += 1

conn.commit()
cur.close()
conn.close()
print(f"Done — processed {games_inserted} games for {target_date}.")