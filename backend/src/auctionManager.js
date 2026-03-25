import crypto from "node:crypto";
import { AUCTION_CONFIG, TEAM_DEFINITIONS } from "./constants.js";

const managers = new Map();

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getBidIncrement(amount) {
  if (amount < 100) return 5;
  if (amount < 200) return 10;
  if (amount < 500) return 20;
  return 25;
}

function buildSquadSummary(team) {
  return {
    teamId: team.teamId,
    ownerUserId: team.ownerUserId,
    code: team.code,
    displayName: team.displayName,
    budgetRemaining: team.budgetRemaining,
    playerCount: team.players.length,
    overseasCount: team.players.filter((player) => player.countryType === "FOREIGN").length,
    players: team.players,
  };
}

class AuctionManager {
  constructor(roomCode) {
    this.roomCode = roomCode;
    this.timer = null;
    this.actionQueue = Promise.resolve();
    this.state = {
      roomCode,
      phase: "LOBBY",
      randomizerSeed: crypto.randomUUID(),
      users: [],
      teams: new Map(),
      unassignedTeamPool: shuffle(TEAM_DEFINITIONS),
      auctionQueue: [],
      activeBid: null,
      timeRemaining: AUCTION_CONFIG.bidWindowSeconds,
    };
    this.listeners = {
      timerTick: null,
      playerSold: null,
      newPlayer: null,
      stateChange: null,
    };
  }

  runAtomically(task) {
    this.actionQueue = this.actionQueue.then(task, task);
    return this.actionQueue;
  }

  addUser(user) {
    if (this.state.users.some((entry) => entry.userId === user.userId)) {
      return this.getPublicState();
    }

    if (this.state.users.length >= AUCTION_CONFIG.roomSize) {
      throw new Error("Room is full.");
    }

    this.state.users.push({
      userId: user.userId,
      username: user.username,
      socketId: user.socketId,
      isAdmin: Boolean(user.isAdmin),
      assignedTeamId: null,
      retentionLocked: false,
    });

    return this.getPublicState();
  }

  updateSocket(userId, socketId) {
    const user = this.state.users.find((entry) => entry.userId === userId);
    if (user) user.socketId = socketId;
  }

  assertAdmin(userId) {
    const user = this.state.users.find((entry) => entry.userId === userId);
    if (!user?.isAdmin) {
      throw new Error("Only the admin can perform this action.");
    }
  }

  triggerRandomizer(userId) {
    this.assertAdmin(userId);

    if (this.state.users.length !== AUCTION_CONFIG.roomSize) {
      throw new Error("Exactly 8 users are required before assigning teams.");
    }

    this.state.phase = "RANDOMIZING";
    const shuffledTeams = shuffle(TEAM_DEFINITIONS);
    this.state.randomizerSeed = crypto.randomUUID();

    this.state.users.forEach((user, index) => {
      const team = {
        teamId: crypto.randomUUID(),
        ...shuffledTeams[index],
        ownerUserId: user.userId,
        budgetRemaining: AUCTION_CONFIG.startingBudget,
        players: [],
        retention: {
          indian: null,
          foreign: null,
        },
      };

      this.state.teams.set(user.userId, team);
      user.assignedTeamId = team.teamId;
    });

    return {
      phase: this.state.phase,
      randomizerSeed: this.state.randomizerSeed,
      assignments: this.state.users.map((user) => ({
        userId: user.userId,
        username: user.username,
        team: buildSquadSummary(this.state.teams.get(user.userId)),
      })),
    };
  }

  enterRetentionPhase() {
    this.state.phase = "RETENTION";
    return this.getPublicState();
  }

  lockRetention(userId, selectedPlayers) {
    if (this.state.phase !== "RETENTION") {
      throw new Error("Retention is not active.");
    }

    const team = this.state.teams.get(userId);
    const user = this.state.users.find((entry) => entry.userId === userId);
    if (!team || !user) {
      throw new Error("Team assignment not found.");
    }

    if (user.retentionLocked) {
      throw new Error("Retention has already been locked.");
    }

    const indian = selectedPlayers.find((player) => player.countryType === "INDIAN");
    const foreign = selectedPlayers.find((player) => player.countryType === "FOREIGN");

    if (!indian || !foreign || selectedPlayers.length !== 2) {
      throw new Error("You must retain exactly 1 Indian and 1 foreign player.");
    }

    const distinct = new Set(selectedPlayers.map((player) => player.id));
    if (distinct.size !== 2) {
      throw new Error("Retention selections must be unique.");
    }

    team.retention.indian = indian;
    team.retention.foreign = foreign;
    team.players.push(
      { ...indian, retainedByUserId: userId, soldPrice: AUCTION_CONFIG.basePrice, status: "RETAINED" },
      { ...foreign, retainedByUserId: userId, soldPrice: AUCTION_CONFIG.basePrice, status: "RETAINED" }
    );
    team.budgetRemaining -= AUCTION_CONFIG.retentionCost;
    user.retentionLocked = true;

    return {
      userId,
      retentionLocked: true,
      team: buildSquadSummary(team),
    };
  }

  allRetentionsLocked() {
    return this.state.users.length === AUCTION_CONFIG.roomSize && this.state.users.every((user) => user.retentionLocked);
  }

  setAuctionPool(players) {
    this.state.auctionQueue = players.filter((player) => !player.isRetained);
  }

  attachListeners(listeners) {
    this.listeners = {
      ...this.listeners,
      ...listeners,
    };
  }

  startAuction(userId) {
    this.assertAdmin(userId);
    if (!this.allRetentionsLocked()) {
      throw new Error("All teams must lock retention before the auction starts.");
    }
    if (this.state.auctionQueue.length === 0) {
      throw new Error("Auction pool is empty.");
    }

    this.state.phase = "ACTIVE";
    const nextLot = this.advanceToNextPlayer();
    this.listeners.stateChange?.(this.getPublicState());
    return nextLot;
  }

  advanceToNextPlayer() {
    this.clearTimer();

    if (this.state.auctionQueue.length === 0) {
      this.state.phase = "COMPLETED";
      this.state.activeBid = null;
      return { phase: "COMPLETED" };
    }

    const player = this.state.auctionQueue.shift();
    this.state.activeBid = {
      player,
      amount: player.basePrice ?? AUCTION_CONFIG.basePrice,
      highestBidderUserId: null,
      bidIncrement: getBidIncrement(player.basePrice ?? AUCTION_CONFIG.basePrice),
    };
    this.state.timeRemaining = AUCTION_CONFIG.bidWindowSeconds;
    this.state.phase = "ACTIVE";
    this.startTimer();

    return {
      phase: this.state.phase,
      player: this.state.activeBid.player,
      currentBid: this.state.activeBid.amount,
      highestBidderUserId: this.state.activeBid.highestBidderUserId,
      bidIncrement: this.state.activeBid.bidIncrement,
      timeRemaining: this.state.timeRemaining,
      teams: this.getTeamsState(),
      availablePlayers: [...this.state.auctionQueue],
    };
  }

  startTimer() {
    this.clearTimer();
    this.timer = setInterval(() => {
      this.state.timeRemaining -= 1;
      this.listeners.timerTick?.({
        roomCode: this.roomCode,
        playerId: this.state.activeBid?.player.id ?? null,
        timeRemaining: this.state.timeRemaining,
      });

      if (this.state.timeRemaining <= 0) {
        const sale = this.finishCurrentPlayer();
        this.listeners.playerSold?.(sale);
        // Hold here for Admin action (pause state). Admin must advance to next lot manually.
      }
    }, 1000);
  }

  clearTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  placeBid(userId) {
    if (this.state.phase !== "ACTIVE" || !this.state.activeBid) {
      throw new Error("No active auction lot.");
    }

    const team = this.state.teams.get(userId);
    if (!team) {
      throw new Error("Assigned team not found.");
    }

    const nextBid = this.state.activeBid.amount + this.state.activeBid.bidIncrement;
    const isOverseas = this.state.activeBid.player.countryType === "FOREIGN";

    if (team.players.length >= AUCTION_CONFIG.squadLimit) {
      throw new Error("Squad limit reached.");
    }

    if (isOverseas && team.players.filter((player) => player.countryType === "FOREIGN").length >= AUCTION_CONFIG.overseasLimit) {
      throw new Error("Overseas player limit reached.");
    }

    if (team.budgetRemaining < nextBid) {
      throw new Error("Insufficient budget for this bid.");
    }

    if (this.state.activeBid.highestBidderUserId === userId) {
      throw new Error("You already hold the highest bid.");
    }

    this.state.activeBid.amount = nextBid;
    this.state.activeBid.highestBidderUserId = userId;
    this.state.activeBid.bidIncrement = getBidIncrement(nextBid);
    this.state.timeRemaining = AUCTION_CONFIG.bidWindowSeconds;

    return {
      player: this.state.activeBid.player,
      currentBid: this.state.activeBid.amount,
      highestBidderUserId: this.state.activeBid.highestBidderUserId,
      bidIncrement: this.state.activeBid.bidIncrement,
      timeRemaining: this.state.timeRemaining,
      teams: this.getTeamsState(),
    };
  }

  finishCurrentPlayer() {
    const activeBid = this.state.activeBid;
    if (!activeBid) return null;

    this.clearTimer();

    let payload;
    if (activeBid.highestBidderUserId) {
      const winningTeam = this.state.teams.get(activeBid.highestBidderUserId);
      const soldPlayer = {
        ...activeBid.player,
        soldPrice: activeBid.amount,
        status: "SOLD",
      };
      winningTeam.players.push(soldPlayer);
      winningTeam.budgetRemaining -= activeBid.amount;

      payload = {
        status: "SOLD",
        soldToUserId: activeBid.highestBidderUserId,
        soldPrice: activeBid.amount,
        player: soldPlayer,
        team: buildSquadSummary(winningTeam),
      };
    } else {
      payload = {
        status: "UNSOLD",
        player: {
          ...activeBid.player,
          status: "UNSOLD",
        },
      };
    }

    this.state.activeBid = null;
    this.state.phase = "PAUSED";
    return payload;
  }

  pauseAuction(adminUserId) {
    this.assertAdmin(adminUserId);
    if (this.state.phase !== "ACTIVE") {
      throw new Error("Auction is not currently running.");
    }
    this.clearTimer();
    this.state.phase = "PAUSED";
    return this.getPublicState();
  }

  resumeAuction(adminUserId) {
    this.assertAdmin(adminUserId);
    if (this.state.phase !== "PAUSED") {
      throw new Error("Auction is not paused.");
    }
    if (!this.state.activeBid) {
      throw new Error("No active lot to resume.");
    }
    this.state.phase = "ACTIVE";
    this.startTimer();
    return this.getPublicState();
  }

  stopAuction(adminUserId) {
    this.assertAdmin(adminUserId);
    this.clearTimer();
    this.state.activeBid = null;
    this.state.phase = "COMPLETED";
    this.state.auctionQueue = [];
    return this.getPublicState();
  }

  selectPlayer(adminUserId, playerId) {
    this.assertAdmin(adminUserId);
    if (this.state.activeBid) {
      throw new Error("Finish the current lot before selecting a new player.");
    }

    const idx = this.state.auctionQueue.findIndex((player) => player.id === playerId);
    if (idx === -1) {
      throw new Error("Player not found in the auction queue.");
    }

    const player = this.state.auctionQueue.splice(idx, 1)[0];
    this.state.activeBid = {
      player,
      amount: player.basePrice ?? AUCTION_CONFIG.basePrice,
      highestBidderUserId: null,
      bidIncrement: getBidIncrement(player.basePrice ?? AUCTION_CONFIG.basePrice),
    };
    this.state.timeRemaining = AUCTION_CONFIG.bidWindowSeconds;
    this.state.phase = "ACTIVE";
    this.startTimer();

    return {
      phase: this.state.phase,
      player: this.state.activeBid.player,
      currentBid: this.state.activeBid.amount,
      highestBidderUserId: this.state.activeBid.highestBidderUserId,
      bidIncrement: this.state.activeBid.bidIncrement,
      timeRemaining: this.state.timeRemaining,
      teams: this.getTeamsState(),
      availablePlayers: [...this.state.auctionQueue],
    };
  }

  forceReplacement({ adminUserId, teamUserId, injuredPlayerId, replacementPlayer }) {
    this.assertAdmin(adminUserId);

    const team = this.state.teams.get(teamUserId);
    if (!team) {
      throw new Error("Team not found.");
    }

    const injured = team.players.find((player) => player.id === injuredPlayerId);
    if (!injured) {
      throw new Error("Injured player not found in the franchise squad.");
    }

    if (injured.matchesPlayed !== 0) {
      throw new Error("Replacement allowed only when injured player's matchesPlayed is 0.");
    }

    if (replacementPlayer.countryType === "FOREIGN" && team.players.filter((player) => player.countryType === "FOREIGN").length > AUCTION_CONFIG.overseasLimit) {
      throw new Error("Replacement would violate overseas squad limit.");
    }

    injured.status = "REPLACED";
    team.players.push({
      ...replacementPlayer,
      soldPrice: replacementPlayer.basePrice ?? AUCTION_CONFIG.basePrice,
      status: "SOLD",
      replacementForPlayerId: injuredPlayerId,
    });

    return {
      team: buildSquadSummary(team),
      injuredPlayerId,
      replacementPlayer,
    };
  }

  getTeamsState() {
    return this.state.users
      .map((user) => this.state.teams.get(user.userId))
      .filter(Boolean)
      .map((team) => buildSquadSummary(team));
  }

  getPublicState() {
    return {
      roomCode: this.state.roomCode,
      phase: this.state.phase,
      users: this.state.users,
      teams: this.getTeamsState(),
      activeBid: this.state.activeBid,
      timeRemaining: this.state.timeRemaining,
      availablePlayers: [...this.state.auctionQueue],
    };
  }
}

export function getAuctionManager(roomCode) {
  if (!managers.has(roomCode)) {
    managers.set(roomCode, new AuctionManager(roomCode));
  }

  return managers.get(roomCode);
}

export function removeAuctionManager(roomCode) {
  const manager = managers.get(roomCode);
  manager?.clearTimer();
  managers.delete(roomCode);
}
