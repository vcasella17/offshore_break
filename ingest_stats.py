import os
import psycopg2
import requests
from datetime import date

conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()

cur.execute('SELECT id FROM "Teams"')
team_ids = [row[0] for row in cur.fetchall()]

season = date.today().year
total_updated = 0

def to_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None

def to_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None

for team_id in team_ids:
    url = (
        f"https://statsapi.mlb.com/api/v1/teams/{team_id}/roster"
        f"?rosterType=active&hydrate=person(stats(type=season,group=[hitting,pitching],season={season}))"
    )
    response = requests.get(url)
    if response.status_code != 200:
        print(f"Skipping team {team_id} — status {response.status_code}")
        continue

    roster = response.json().get("roster", [])

    for entry in roster:
        person = entry["person"]
        player_id = person["id"]
        stat_groups = person.get("stats", [])

        hitting = None
        pitching = None
        for group_entry in stat_groups:
            group_name = group_entry.get("group", {}).get("displayName")
            splits = group_entry.get("splits", [])
            if not splits:
                continue
            stat = splits[0].get("stat", {})
            if group_name == "hitting":
                hitting = stat
            elif group_name == "pitching":
                pitching = stat

        if not hitting and not pitching:
            continue

        games = to_int((hitting or pitching or {}).get("gamesPlayed"))
        at_bats = to_int(hitting.get("atBats")) if hitting else None
        hits = to_int(hitting.get("hits")) if hitting else None
        home_runs = to_int(hitting.get("homeRuns")) if hitting else None
        rbi = to_int(hitting.get("rbi")) if hitting else None
        walks = to_int(hitting.get("baseOnBalls")) if hitting else None
        strikeouts = to_int(hitting.get("strikeOuts")) if hitting else None
        batting_avg = to_float(hitting.get("avg")) if hitting else None
        ops = to_float(hitting.get("ops")) if hitting else None

        innings_pitched = to_float(pitching.get("inningsPitched")) if pitching else None
        wins = to_int(pitching.get("wins")) if pitching else None
        losses = to_int(pitching.get("losses")) if pitching else None
        earned_runs = to_int(pitching.get("earnedRuns")) if pitching else None
        hits_allowed = to_int(pitching.get("hits")) if pitching else None
        walks_allowed = to_int(pitching.get("baseOnBalls")) if pitching else None
        strikeouts_pitched = to_int(pitching.get("strikeOuts")) if pitching else None
        era = to_float(pitching.get("era")) if pitching else None
        whip = to_float(pitching.get("whip")) if pitching else None

        cur.execute(
            'SELECT id FROM "PlayerStats" WHERE player_id = %s AND season = %s',
            (player_id, season)
        )
        existing = cur.fetchone()

        values = (
            team_id, games, at_bats, hits, home_runs, rbi, walks, strikeouts,
            batting_avg, ops, innings_pitched, wins, losses, earned_runs,
            hits_allowed, walks_allowed, strikeouts_pitched, era, whip
        )

        if existing:
            cur.execute(
                '''UPDATE "PlayerStats" SET
                     team_id=%s, games=%s, at_bats=%s, hits=%s, home_runs=%s, rbi=%s,
                     walks=%s, strikeouts=%s, batting_avg=%s, ops=%s, innings_pitched=%s,
                     wins=%s, losses=%s, earned_runs=%s, hits_allowed=%s, walks_allowed=%s,
                     strikeouts_pitched=%s, era=%s, whip=%s
                   WHERE id = %s''',
                values + (existing[0],)
            )
        else:
            cur.execute(
                '''INSERT INTO "PlayerStats"
                     (player_id, season, team_id, games, at_bats, hits, home_runs, rbi,
                      walks, strikeouts, batting_avg, ops, innings_pitched, wins, losses,
                      earned_runs, hits_allowed, walks_allowed, strikeouts_pitched, era, whip)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)''',
                (player_id, season) + values
            )

        total_updated += 1

conn.commit()
cur.close()
conn.close()
print(f"Done — updated stats for {total_updated} players across {len(team_ids)} teams.")