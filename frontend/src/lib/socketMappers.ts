import type { AuctionState, TeamState } from "@/lib/types";

function normalizeTeam(team: any): TeamState {
  const players = Array.isArray(team?.players)
    ? team.players
    : Array.isArray(team?.currentSquadPlayers)
      ? team.currentSquadPlayers
      : [];

  return {
    ...team,
    name: team?.name ?? team?.displayName ?? team?.shortName ?? team?.code ?? "Team",
    displayName: team?.displayName ?? team?.name ?? team?.shortName ?? team?.code ?? "Team",
    shortName: team?.shortName ?? team?.code ?? team?.name ?? "TEAM",
    budget:
      team?.budget ??
      team?.budgetRemaining ??
      0,
    totalPlayers:
      team?.totalPlayers ??
      team?.playerCount ??
      players.length,
    overseasPlayers:
      team?.overseasPlayers ??
      team?.overseasCount ??
      players.filter((player: any) => player?.countryType === "FOREIGN").length,
    players,
  };
}

export function mapRoomState(payload: any): AuctionState {
  return {
    ...payload,
    teams: Array.isArray(payload?.teams) ? payload.teams.map(normalizeTeam) : [],
    timeRemaining: payload?.timeLeft ?? payload?.timeRemaining ?? 15,
    activeBid: payload?.currentPlayer
      ? {
          player: payload.currentPlayer,
          amount: payload.currentBid ?? 0,
          highestBidderUserId: payload.highestBidderId ?? null,
          bidIncrement: 10,
        }
      : payload?.activeBid
        ? {
            ...payload.activeBid,
            highestBidderUserId:
              payload.activeBid.highestBidderUserId ??
              payload.activeBid.highestBidderId ??
              null,
          }
        : null,
  };
}

export function mapTeams(teams: any[] | undefined) {
  return Array.isArray(teams) ? teams.map(normalizeTeam) : [];
}
