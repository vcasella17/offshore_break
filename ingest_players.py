import os
import psycopg2
import requests

conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()

# Get all team IDs already in our database
cur.execute('SELECT id FROM "Teams"')
team_ids = [row[0] for row in cur.fetchall()]

total_players = 0

for team_id in team_ids:
    url = f"https://statsapi.mlb.com/api/v1/teams/{team_id}/roster?rosterType=active"
    response = requests.get(url)

    if response.status_code != 200:
        print(f"Skipping team {team_id} — status {response.status_code}")
        continue

    roster = response.json().get("roster", [])

    for entry in roster:
        player_id = entry["person"]["id"]
        player_name = entry["person"]["fullName"]
        position = entry["position"]["abbreviation"]

        cur.execute(
            '''INSERT INTO "Player" (id, name, team_id, position)
               VALUES (%s, %s, %s, %s)
               ON CONFLICT (id) DO UPDATE SET
                 team_id = EXCLUDED.team_id,
                 position = EXCLUDED.position''',
            (player_id, player_name, team_id, position)
        )
        total_players += 1

conn.commit()
cur.close()
conn.close()
print(f"Done — inserted/updated {total_players} players across {len(team_ids)} teams.")