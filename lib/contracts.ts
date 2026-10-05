/*
 * OPTIONAL: contracts, used for the "market price" comparison on the
 * valuation page. If a player isn't listed, the page just skips it.
 *
 *   aav    = average annual value in dollars (e.g. 35_000_000)
 *   years  = seasons remaining on the deal
 *   note   = optional source/context, shown under the number
 *
 * Only enter numbers you have verified from a source you trust
 * (team announcements, Spotrac, Cot's Baseball Contracts).
 *
 * Example (delete the // to use it; the numbers here are made up):
 *
 *   545361: { aav: 30_000_000, years: 3, note: "Source: your source here" },
 */

export type Contract = {
  aav: number;
  years: number;
  note?: string;
};

export const CONTRACTS: Record<number, Contract> = {};