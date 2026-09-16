import os
import psycopg2
import requests

# Connect to Supabase using an environment variable (never hardcode the real string here)
conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()

# Pull current MLB teams from the public MLB Stats API
response = requests.get("https://statsapi.mlb.com/api/v1/teams?sportId=1")
teams = response.json()["teams"]

for team in teams:
    cur.execute(
        'INSERT INTO "Teams" (id, name, abbreviation) VALUES (%s, %s, %s) ON CONFLICT (id) DO NOTHING',
        (str(team["id"]), team["name"], team["abbreviation"])
    )

conn.commit()
cur.close()
conn.close()
print(f"Done — inserted {len(teams)} teams.")