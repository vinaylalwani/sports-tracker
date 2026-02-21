// lib/playerHistoryData.ts
import data from "./playerHistoryData.json";

/* ================================
   Injury & Player Interfaces
================================ */
export interface InjuryRecord {
  year: number;
  category: "minor" | "moderate" | "major" | "chronic";
  gamesMissed: number;
  recoveryDays: number;
}

export interface PlayerHistory {
  name: string;
  age: number;
  position: string;
  minutesPerGame: {
    year1: number;
    year2: number;
    year3: number;
  };
  usageRate: {        // New field
    year1: number;
    year2: number;
    year3: number;
  };
  foulsDrawnPerGame: number;
  foulsCommittedPerGame: number;
  contactRate: number;
  injuries: InjuryRecord[];

  // Add rolling 10-game minutes
  rollingMin: number[];
}

/* ================================
   Player History Data
================================ */
export const playerHistoryData: PlayerHistory[] = data as PlayerHistory[];