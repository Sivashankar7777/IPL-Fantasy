export type CountryType = "INDIAN" | "FOREIGN";

export interface AuctionPlayer {
  id: string;
  name: string;
  role: string;
  country: string;
  countryType: CountryType;
  basePrice: number;
  baseTeam?: string;
  soldPrice?: number;
  rating?: number;
  status?: string;
}

export interface TeamState {
  teamId: string;
  ownerUserId: string;
  code: string;
  displayName: string;
  name?: string;
  shortName?: string;
  budget: number;
  totalPlayers: number;
  overseasPlayers: number;
  players: AuctionPlayer[];
}

export interface AuctionState {
  roomCode: string;
  phase: "LOBBY" | "RANDOMIZING" | "RETENTION" | "ACTIVE" | "PAUSED" | "COMPLETED" | "LIVE_AUCTION";
  users: {
    userId: string;
    username: string;
    assignedTeamId: string | null;
    retentionLocked: boolean;
    isAdmin: boolean;
  }[];
  teams: TeamState[];
  activeBid: {
    player: AuctionPlayer;
    amount: number;
    highestBidderUserId: string | null;
    bidIncrement: number;
  } | null;
  timeRemaining: number;
  availablePlayers?: AuctionPlayer[];
  marqueePlayer?: AuctionPlayer;
}
