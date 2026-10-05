import type { Contract } from "@/lib/contracts";
import { getThresholds } from "@/lib/baseball";

/*
 * OFFSHORE VALUATION MODEL
 * ------------------------
 * Every assumption lives in MODEL below, so you can change it in one place.
 *
 * What this is: a simple, transparent estimate, not an official WAR.
 * It uses only the stats in your database (OPS, ERA, playing time, position),
 * so it ignores defense, baserunning, park effects and injuries.
 */

export const MODEL = {
  /** What one win is worth on the open market, in dollars (this season). Update yearly. */
  dollarsPerWar: 9_000_000,
  /** How fast the price of a win grows each year. */
  dollarInflation: 0.04,

  /** Runs needed to produce one win. */
  runsPerWin: 10,
  /** Batting runs per plate appearance for each point of OPS above league average. */
  runsPerOpsPerPA: 0.32,
  /** A replacement-level hitter is about 20 runs worse than average per 600 PA. */
  replacementRunsPerPA: 20 / 600,
  /** Replacement-level pitchers allow this many more runs per 9 innings than average. */
  replacementRunsPer9: { starter: 0.9, reliever: 0.5 },

  /** Talent of an average regular, in WAR per full season (the "pull toward average"). */
  priorWar: { hitter: 2.0, starter: 2.0, reliever: 0.8, twoWay: 3.0 },
  /** How many PA / IP it takes for a season to be about half "real talent". */
  reliabilityPA: 250,
  reliabilityIP: 60,

  /** Valuation horizon: until this age, capped at this many seasons. */
  retireAge: 38,
  horizonCap: 8,

  /** One-season WAR is only known to about +/- this much. */
  warUncertainty: 1.0,

  /** How much each method counts in the blended range. */
  weights: { dcf: 0.35, comps: 0.2, precedent: 0.2, forecast: 0.15, past: 0.1 },

  /** Salaries under this are league-minimum / pre-arbitration, not market prices. */
  marketSalaryFloor: 1_500_000,
  /** How many comparable players to find. */
  compCount: 12,

  scenarios: {
    bear: { talentMult: 0.85, agingMult: 1.4, discount: 0.1 },
    base: { talentMult: 1.0, agingMult: 1.0, discount: 0.085 },
    bull: { talentMult: 1.15, agingMult: 0.6, discount: 0.07 },
  },

  /** Positional adjustment in runs per 162 games (harder positions get credit). */
  positionRuns: {
    C: 12.5,
    SS: 7.5,
    "2B": 2.5,
    "3B": 2.5,
    CF: 2.5,
    LF: -7.5,
    RF: -7.5,
    "1B": -12.5,
    DH: -17.5,
    OF: -2.5,
    IF: 0,
    TWP: -17.5,
  } as Record<string, number>,
} as const;

/* ───────────────────────── Types ───────────────────────── */

export type Kind = "hitter" | "pitcher" | "two-way";
export type ScenarioKey = "bear" | "base" | "bull";

export type StatLine = {
  games: number | null;
  at_bats: number | null;
  walks: number | null;
  strikeouts: number | null;
  home_runs: number | null;
  batting_avg: number | null;
  obp: number | null;
  slg: number | null;
  ops: number | null;
  innings_pitched?: number | null;
  strikeouts_pitched?: number | null;
  walks_allowed?: number | null;
  era?: number | null;
  whip?: number | null;
};

export type LeagueContext = { lgOps: number; lgEra: number };

export type WarEstimate = {
  war: number;
  kind: Kind;
  pa: number;
  ip: number;
  starter: boolean;
};

/* ───────────────────────── Helpers ───────────────────────── */

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function plateAppearances(s: StatLine) {
  return (s.at_bats ?? 0) + (s.walks ?? 0);
}

export function playerKind(position: string | null | undefined, s: StatLine): Kind {
  const pos = (position ?? "").toUpperCase();
  const ip = s.innings_pitched ?? 0;
  const ab = s.at_bats ?? 0;

  if (pos === "TWP" || (ip >= 20 && ab >= 100)) return "two-way";
  if (pos === "P" || pos === "SP" || pos === "RP" || (ip >= 20 && ab < 20)) {
    return "pitcher";
  }
  return "hitter";
}

/** League averages, weighted by playing time. */
export function leagueContext(stats: StatLine[]): LeagueContext {
  let opsSum = 0;
  let paSum = 0;
  let eraSum = 0;
  let ipSum = 0;

  for (const s of stats) {
    const pa = plateAppearances(s);
    if (pa >= 50 && s.ops != null) {
      opsSum += s.ops * pa;
      paSum += pa;
    }

    const ip = s.innings_pitched ?? 0;
    if (ip >= 20 && s.era != null) {
      eraSum += s.era * ip;
      ipSum += ip;
    }
  }

  return {
    lgOps: paSum > 0 ? opsSum / paSum : 0.72,
    lgEra: ipSum > 0 ? eraSum / ipSum : 4.1,
  };
}

function positionRunsFor(position: string | null | undefined, games: number) {
  const key = (position ?? "").toUpperCase();
  const perSeason = MODEL.positionRuns[key] ?? 0;
  return (perSeason * Math.min(games, 162)) / 162;
}

/* ───────────────────────── Estimated WAR ───────────────────────── */

export function estimateWar(
  s: StatLine,
  position: string | null | undefined,
  ctx: LeagueContext
): WarEstimate {
  const kind = playerKind(position, s);
  const pa = plateAppearances(s);
  const ip = s.innings_pitched ?? 0;
  const games = s.games ?? 0;

  let hitWar = 0;
  if (pa > 0 && s.ops != null && kind !== "pitcher") {
    const raa = MODEL.runsPerOpsPerPA * (s.ops - ctx.lgOps) * pa;
    const repl = MODEL.replacementRunsPerPA * pa;
    const pos = positionRunsFor(position, games);
    hitWar = (raa + repl + pos) / MODEL.runsPerWin;
  }

  const starter = ip > 0 && ip / Math.max(games, 1) >= 3;
  let pitchWar = 0;
  if (ip > 0 && s.era != null && kind !== "hitter") {
    const raa = ((ctx.lgEra - s.era) * ip) / 9;
    const repl =
      ((starter ? MODEL.replacementRunsPer9.starter : MODEL.replacementRunsPer9.reliever) * ip) / 9;
    pitchWar = (raa + repl) / MODEL.runsPerWin;
  }

  return { war: hitWar + pitchWar, kind, pa, ip, starter };
}

/* ───────────────────────── Aging ───────────────────────── */

/** Expected change in true-talent WAR going into a season at this age. */
function agingDelta(age: number, kind: Kind) {
  let delta: number;

  if (age <= 24) delta = 0.4;
  else if (age <= 26) delta = 0.2;
  else if (age <= 28) delta = 0;
  else if (age === 29) delta = -0.2;
  else if (age === 30) delta = -0.3;
  else if (age === 31) delta = -0.4;
  else if (age <= 33) delta = -0.5;
  else delta = -0.65;

  return kind === "pitcher" && delta < 0 ? delta * 1.15 : delta;
}

/* ───────────────────────── Current value ───────────────────────── */

export type Range = { low: number; mid: number; high: number };

/** This season's production, in dollars, with a +/- uncertainty band. */
export function currentValueRange(war: number): Range {
  const price = MODEL.dollarsPerWar;
  return {
    low: Math.max(0, (war - MODEL.warUncertainty) * price),
    mid: Math.max(0, war * price),
    high: Math.max(0, (war + MODEL.warUncertainty) * price),
  };
}

/* ───────────────────────── DCF ───────────────────────── */

export type DcfRow = {
  year: number;
  age: number;
  war: number;
  price: number;
  value: number;
  pv: number;
};

export type DcfResult = {
  rows: DcfRow[];
  totalPv: number;
  /** the same value expressed as a level payment per season */
  perSeason: number;
  annuityFactor: number;
  discount: number;
};

export function runDcf(
  input: { estimate: WarEstimate; age: number; season: number },
  scenario: ScenarioKey
): DcfResult {
  const { estimate, age } = input;
  const sc = MODEL.scenarios[scenario];

  // 1) Start from this season's rate, pulled toward an average regular
  let talent: number;
  let fraction: number;

  if (estimate.kind === "two-way") {
    talent = 0.7 * estimate.war + 0.3 * MODEL.priorWar.twoWay;
    fraction = 1;
  } else if (estimate.kind === "pitcher") {
    const full = estimate.starter ? 180 : 65;
    const prior = estimate.starter ? MODEL.priorWar.starter : MODEL.priorWar.reliever;
    const rate = estimate.ip > 0 ? (estimate.war / estimate.ip) * full : prior;
    const w = estimate.ip / (estimate.ip + MODEL.reliabilityIP);
    talent = w * rate + (1 - w) * prior;
    fraction = clamp(estimate.ip, estimate.starter ? 100 : 40, estimate.starter ? 200 : 80) / full;
  } else {
    const rate = estimate.pa > 0 ? (estimate.war / estimate.pa) * 600 : MODEL.priorWar.hitter;
    const w = estimate.pa / (estimate.pa + MODEL.reliabilityPA);
    talent = w * rate + (1 - w) * MODEL.priorWar.hitter;
    fraction = clamp(estimate.pa, 350, 650) / 600;
  }

  talent *= sc.talentMult;

  // 2) Roll forward season by season
  const years = clamp(MODEL.retireAge - age + 1, 1, MODEL.horizonCap);
  const rows: DcfRow[] = [];
  let annuityFactor = 0;

  for (let t = 1; t <= years; t++) {
    const ageT = age + t - 1;
    talent += agingDelta(ageT, estimate.kind) * sc.agingMult;

    const war = talent * fraction;
    const price = MODEL.dollarsPerWar * Math.pow(1 + MODEL.dollarInflation, t);
    const value = Math.max(0, war) * price; // a team can always replace a bad season
    const discountFactor = 1 / Math.pow(1 + sc.discount, t);

    annuityFactor += discountFactor;
    rows.push({
      year: input.season + t,
      age: ageT,
      war,
      price,
      value,
      pv: value * discountFactor,
    });
  }

  const totalPv = rows.reduce((sum, row) => sum + row.pv, 0);

  return {
    rows,
    totalPv,
    perSeason: annuityFactor > 0 ? totalPv / annuityFactor : 0,
    annuityFactor,
    discount: sc.discount,
  };
}

/** Present value of a contract's payments, discounted at the base rate. */
export function contractPv(aav: number, years: number, discount: number) {
  let pv = 0;
  for (let t = 1; t <= years; t++) pv += aav / Math.pow(1 + discount, t);
  return pv;
}

/* ───────────────────────── Comparable players ───────────────────────── */

export type PoolItem<T> = {
  id: number;
  kind: Kind;
  features: number[];
  war: number;
  payload: T;
};

export type Comp<T> = PoolItem<T> & {
  distance: number;
  similarity: number;
  value: number;
};

/** The numbers used to decide who is "similar". */
export function featureVector(kind: Kind, s: StatLine): number[] | null {
  if (kind === "pitcher") {
    const ip = s.innings_pitched ?? 0;
    if (ip <= 0 || s.era == null || s.whip == null) return null;

    return [
      s.era,
      s.whip,
      ((s.strikeouts_pitched ?? 0) / ip) * 9,
      ((s.walks_allowed ?? 0) / ip) * 9,
      ip / 50,
    ];
  }

  const pa = plateAppearances(s);
  const ab = s.at_bats ?? 0;
  if (pa <= 0 || ab <= 0 || s.ops == null || s.batting_avg == null) return null;

  return [
    s.ops,
    s.batting_avg,
    ((s.home_runs ?? 0) / pa) * 600,
    ((s.walks ?? 0) / pa) * 100,
    ((s.strikeouts ?? 0) / ab) * 100,
    pa / 100,
  ];
}

export function findComps<T>(
  target: { id: number; kind: Kind; features: number[] },
  pool: PoolItem<T>[],
  count = 8
): Comp<T>[] {
  const peers = pool.filter(
    (item) =>
      item.id !== target.id &&
      (target.kind === "pitcher") === (item.kind === "pitcher")
  );

  if (peers.length === 0) return [];

  const dims = target.features.length;
  const means = Array.from({ length: dims }, (_, i) =>
    peers.reduce((sum, p) => sum + p.features[i], 0) / peers.length
  );
  const sds = Array.from({ length: dims }, (_, i) => {
    const variance =
      peers.reduce((sum, p) => sum + Math.pow(p.features[i] - means[i], 2), 0) /
      peers.length;
    return Math.sqrt(variance) || 1;
  });

  return peers
    .map((item) => {
      let sumSq = 0;
      for (let i = 0; i < dims; i++) {
        const diff = (item.features[i] - target.features[i]) / sds[i];
        sumSq += diff * diff;
      }
      const distance = Math.sqrt(sumSq);
      const avgZ = distance / Math.sqrt(dims);

      return {
        ...item,
        distance,
        similarity: Math.round(100 / (1 + avgZ)),
        value: Math.max(0, item.war) * MODEL.dollarsPerWar,
      };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count);
}

export function percentile(values: number[], p: number) {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

/* ───────────────────────── Blending & formatting ───────────────────────── */

export function blendRanges(
  parts: { weight: number; range: Range | null }[]
): Range {
  const live = parts.filter((p): p is { weight: number; range: Range } => p.range !== null);
  const total = live.reduce((sum, p) => sum + p.weight, 0) || 1;

  const mix = (pick: (r: Range) => number) =>
    live.reduce((sum, p) => sum + (p.weight / total) * pick(p.range), 0);

  return {
    low: mix((r) => r.low),
    mid: mix((r) => r.mid),
    high: mix((r) => r.high),
  };
}

export function ageForSeason(birthDate: string, season: number) {
  const [year, month] = birthDate.split("-").map(Number);
  // baseball age = age on June 30
  return season - year - (month > 6 ? 1 : 0);
}

export function formatMoney(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

export function formatWar(value: number) {
  return value.toFixed(1);
}


/* ═══════════════════════════════════════════════════════════════════
 * THE APPRAISAL BUILDER
 * Takes raw data, returns everything a page needs to draw the report.
 * ═══════════════════════════════════════════════════════════════════ */

export type PlayerLite = {
  id: number;
  name: string;
  team_id: string | null;
  position: string | null;
};

export type TeamLite = { id: string; name: string; abbreviation: string };

export type WarRow = {
  player_id: number;
  season: number;
  war: number | null;
  salary: number | null;
};

export type SeasonStat = StatLine & { player_id: number; season: number };

export type Tone = "navy" | "teal" | "coral" | "gold" | "indigo";

export type FieldRow = {
  key: string;
  label: string;
  sub: string;
  range: Range;
  tone: Tone;
  highlight?: boolean;
};

export type HistoryRow = {
  season: number;
  war: number;
  salary: number | null;
  value: number;
};

export type CompPayload = {
  player: PlayerLite;
  team: TeamLite | null;
  salary: number | null;
};

export type Verdict = "bargain" | "fair" | "overpaid";

export type Appraisal = {
  season: number;
  estimate: WarEstimate;
  warSource: "baseball-reference" | "estimated";
  age: number;
  ageKnown: boolean;
  current: Range;
  comps: Comp<CompPayload>[];
  compsRange: Range | null;
  precedentRange: Range | null;
  precedentCount: number;
  pastRange: Range | null;
  forecastRange: Range;
  dcf: Record<ScenarioKey, DcfResult>;
  dcfRange: Range;
  blended: Range;
  rows: FieldRow[];
  history: HistoryRow[];
  salary: number | null;
  marketLine: number | null;
  marketSource: "contract" | "salary" | null;
  verdict: Verdict | null;
  surplus: number | null;
  earlyCareer: boolean;
  contract: Contract | null;
  contractPvValue: number | null;
  contractDcf: number | null;
};

function range3(values: number[]): Range | null {
  if (values.length < 3) return null;
  return {
    low: percentile(values, 0.25),
    mid: percentile(values, 0.5),
    high: percentile(values, 0.75),
  };
}

export function buildAppraisal(input: {
  season: number;
  player: PlayerLite;
  players: PlayerLite[];
  stats: SeasonStat[];
  warRows: WarRow[];
  teams: TeamLite[];
  birthDate: string | null;
  contract?: Contract | null;
}): Appraisal | null {
  const { season, player, players, stats, warRows, teams, birthDate } = input;
  const contract = input.contract ?? null;

  const stat = stats.find((s) => s.player_id === player.id);
  if (!stat) return null;

  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const playerMap = new Map(players.map((p) => [p.id, p]));

  const warMap = new Map<number, Map<number, WarRow>>();
  for (const row of warRows) {
    let seasons = warMap.get(row.player_id);
    if (!seasons) {
      seasons = new Map();
      warMap.set(row.player_id, seasons);
    }
    seasons.set(row.season, row);
  }

  const warThisSeason = (id: number) => warMap.get(id)?.get(season) ?? null;
  const realAvailable =
    warRows.filter((r) => r.season === season && r.war !== null).length >= 100;

  /* 1) This player's WAR: real if we have it, otherwise estimated */
  const league = leagueContext(stats);
  const baseEstimate = estimateWar(stat, player.position, league);
  const realRow = warThisSeason(player.id);
  const warSource = realRow?.war != null ? "baseball-reference" : "estimated";
  const estimate: WarEstimate = {
    ...baseEstimate,
    war: realRow?.war ?? baseEstimate.war,
  };

  /* 2) Age at the start of next season */
  const age = birthDate ? ageForSeason(birthDate, season + 1) : 28;

  /* 3) Comparable players */
  const { minAb } = getThresholds(stats);
  const pool: PoolItem<CompPayload>[] = [];

  for (const row of stats) {
    const rowPlayer = playerMap.get(row.player_id);
    if (!rowPlayer) continue;

    const kind = playerKind(rowPlayer.position, row);
    const volumeOk =
      kind === "pitcher"
        ? (row.innings_pitched ?? 0) >= 20
        : (row.at_bats ?? 0) >= minAb * 0.5;
    if (!volumeOk) continue;

    const features = featureVector(kind, row);
    if (!features) continue;

    const real = warThisSeason(row.player_id);
    if (realAvailable && real?.war == null) continue;

    pool.push({
      id: row.player_id,
      kind,
      features,
      war: real?.war ?? estimateWar(row, rowPlayer.position, league).war,
      payload: {
        player: rowPlayer,
        team: rowPlayer.team_id ? teamMap.get(rowPlayer.team_id) ?? null : null,
        salary: real?.salary ?? null,
      },
    });
  }

  const targetFeatures = featureVector(estimate.kind, stat);
  const comps = targetFeatures
    ? findComps(
        { id: player.id, kind: estimate.kind, features: targetFeatures },
        pool,
        MODEL.compCount
      )
    : [];

  const compsRange = range3(comps.map((c) => c.value));

  const marketSalaries = comps
    .map((c) => c.payload.salary)
    .filter((s): s is number => s != null && s >= MODEL.marketSalaryFloor);
  const precedentRange = range3(marketSalaries);

  /* 4) Past performance: last three seasons of real WAR */
  const history: HistoryRow[] = [...(warMap.get(player.id)?.values() ?? [])]
    .filter((r) => r.war !== null && r.season <= season)
    .sort((a, b) => b.season - a.season)
    .map((r) => ({
      season: r.season,
      war: r.war as number,
      salary: r.salary,
      value: Math.max(0, r.war as number) * MODEL.dollarsPerWar,
    }));

  const recent = history.slice(0, 3);
  const pastRange: Range | null =
    recent.length >= 2
      ? {
          low: Math.min(...recent.map((r) => r.value)),
          mid: recent.reduce((s, r) => s + r.value, 0) / recent.length,
          high: Math.max(...recent.map((r) => r.value)),
        }
      : null;

  /* 5) DCF and next-season forecast */
  const dcfInput = { estimate, age, season };
  const dcf = {
    bear: runDcf(dcfInput, "bear"),
    base: runDcf(dcfInput, "base"),
    bull: runDcf(dcfInput, "bull"),
  };

  const dcfRange: Range = {
    low: dcf.bear.perSeason,
    mid: dcf.base.perSeason,
    high: dcf.bull.perSeason,
  };

  const forecastRange: Range = {
    low: dcf.bear.rows[0]?.value ?? 0,
    mid: dcf.base.rows[0]?.value ?? 0,
    high: dcf.bull.rows[0]?.value ?? 0,
  };

  const current = currentValueRange(estimate.war);

  /* 6) Blend */
  const blended = blendRanges([
    { weight: MODEL.weights.dcf, range: dcfRange },
    { weight: MODEL.weights.comps, range: compsRange },
    { weight: MODEL.weights.precedent, range: precedentRange },
    { weight: MODEL.weights.forecast, range: forecastRange },
    { weight: MODEL.weights.past, range: pastRange },
  ]);

  const rows: FieldRow[] = [];

  if (pastRange) {
    rows.push({
      key: "past",
      label: "Past performance",
      sub: `Last ${recent.length} seasons, value of production`,
      range: pastRange,
      tone: "navy",
    });
  }

  rows.push({
    key: "forecast",
    label: "Next-season forecast",
    sub: "Bear / base / bull projection",
    range: forecastRange,
    tone: "indigo",
  });

  if (compsRange) {
    rows.push({
      key: "comps",
      label: "Comparable players",
      sub: "What similar players produce",
      range: compsRange,
      tone: "teal",
    });
  }

  if (precedentRange) {
    rows.push({
      key: "precedent",
      label: "Precedent contracts",
      sub: `What ${marketSalaries.length} similar players are paid`,
      range: precedentRange,
      tone: "gold",
    });
  }

  rows.push({
    key: "dcf",
    label: "DCF valuation",
    sub: "Intrinsic value per season",
    range: dcfRange,
    tone: "coral",
  });

  rows.push({
    key: "fair",
    label: "Fair value",
    sub: "Weighted blend of the methods",
    range: blended,
    tone: "navy",
    highlight: true,
  });

  /* 7) What he is paid, and the verdict */
  const salary = realRow?.salary ?? null;
  const marketLine = contract?.aav ?? salary;
  const marketSource: Appraisal["marketSource"] = contract
    ? "contract"
    : salary !== null
      ? "salary"
      : null;

  let verdict: Verdict | null = null;
  let surplus: number | null = null;

  if (marketLine !== null && marketLine > 0) {
    const ratio = blended.mid / marketLine;
    verdict = ratio >= 1.25 ? "bargain" : ratio >= 0.8 ? "fair" : "overpaid";
    surplus = blended.mid - marketLine;
  }

  const earlyCareer = marketLine !== null && marketLine < MODEL.marketSalaryFloor;

  return {
    season,
    estimate,
    warSource,
    age,
    ageKnown: birthDate !== null,
    current,
    comps,
    compsRange,
    precedentRange,
    precedentCount: marketSalaries.length,
    pastRange,
    forecastRange,
    dcf,
    dcfRange,
    blended,
    rows,
    history,
    salary,
    marketLine,
    marketSource,
    verdict,
    surplus,
    earlyCareer,
    contract,
    contractPvValue: contract
      ? contractPv(contract.aav, contract.years, MODEL.scenarios.base.discount)
      : null,
    contractDcf: contract
      ? dcf.base.rows.slice(0, contract.years).reduce((sum, r) => sum + r.pv, 0)
      : null,
  };
}