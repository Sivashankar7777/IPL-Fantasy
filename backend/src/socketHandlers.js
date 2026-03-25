import { getAuctionManager } from "./auctionManager.js";
import { samplePlayers } from "./data/samplePlayers.js";

export function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    socket.on("join_room", async (payload, callback) => {
      try {
        const { roomCode, userId, username, isAdmin = false } = payload;
        const manager = getAuctionManager(roomCode);
        manager.attachListeners({
          timerTick: (tick) => io.to(roomCode).emit("timer_tick", tick),
          playerSold: (sale) => {
            io.to(roomCode).emit("player_sold", sale);
            io.to(roomCode).emit("room_state", manager.getPublicState());
          },
          newPlayer: (lot) => {
            io.to(roomCode).emit("new_player", lot);
            io.to(roomCode).emit("room_state", manager.getPublicState());
          },
          stateChange: (roomState) => io.to(roomCode).emit("room_state", roomState),
        });
        socket.join(roomCode);
        const state = manager.addUser({ roomCode, userId, username, socketId: socket.id, isAdmin });
        manager.updateSocket(userId, socket.id);
        io.to(roomCode).emit("room_state", state);
        callback?.({ ok: true, state });
      } catch (error) {
        callback?.({ ok: false, error: error.message });
      }
    });

    socket.on("trigger_randomizer", async (payload, callback) => {
      try {
        const manager = getAuctionManager(payload.roomCode);
        const result = await manager.runAtomically(() => Promise.resolve(manager.triggerRandomizer(payload.userId)));
        io.to(payload.roomCode).emit("start_randomizer_animation", {
          seed: result.randomizerSeed,
          durationMs: 4000,
        });

        setTimeout(() => {
          manager.enterRetentionPhase();
          io.to(payload.roomCode).emit("teams_assigned", result);
          io.to(payload.roomCode).emit("room_state", manager.getPublicState());
        }, 4000);

        callback?.({ ok: true, result });
      } catch (error) {
        callback?.({ ok: false, error: error.message });
      }
    });

    socket.on("retention_locked", async (payload, callback) => {
      try {
        const manager = getAuctionManager(payload.roomCode);
        const result = await manager.runAtomically(() => Promise.resolve(manager.lockRetention(payload.userId, payload.selectedPlayers)));
        io.to(payload.roomCode).emit("retention_updated", result);
        io.to(payload.roomCode).emit("room_state", manager.getPublicState());

        if (manager.allRetentionsLocked()) {
          manager.setAuctionPool(samplePlayers);
          const adminUserId = manager.state.users.find((user) => user.isAdmin)?.userId;
          const nextLot = manager.startAuction(adminUserId);
          io.to(payload.roomCode).emit("new_player", nextLot);
        }

        callback?.({ ok: true, result });
      } catch (error) {
        callback?.({ ok: false, error: error.message });
      }
    });

    socket.on("place_bid", async (payload, callback) => {
      try {
        const manager = getAuctionManager(payload.roomCode);
        const result = await manager.runAtomically(() => Promise.resolve(manager.placeBid(payload.userId)));
        io.to(payload.roomCode).emit("bid_updated", result);
        callback?.({ ok: true, result });
      } catch (error) {
        callback?.({ ok: false, error: error.message });
      }
    });

    socket.on("request_next_player", async (payload, callback) => {
      try {
        const manager = getAuctionManager(payload.roomCode);
        const nextLot = await manager.runAtomically(() => Promise.resolve(manager.advanceToNextPlayer()));
        io.to(payload.roomCode).emit("new_player", nextLot);
        callback?.({ ok: true, nextLot });
      } catch (error) {
        callback?.({ ok: false, error: error.message });
      }
    });

    socket.on("admin_next_player", async (payload, callback) => {
      try {
        const manager = getAuctionManager(payload.roomCode);
        const nextLot = await manager.runAtomically(() => Promise.resolve(manager.advanceToNextPlayer()));
        io.to(payload.roomCode).emit("new_player", nextLot);
        callback?.({ ok: true, nextLot });
      } catch (error) {
        callback?.({ ok: false, error: error.message });
      }
    });

    socket.on("admin_select_player", async (payload, callback) => {
      try {
        const manager = getAuctionManager(payload.roomCode);
        const nextLot = await manager.runAtomically(() => Promise.resolve(manager.selectPlayer(payload.userId, payload.playerId)));
        io.to(payload.roomCode).emit("new_player", nextLot);
        callback?.({ ok: true, nextLot });
      } catch (error) {
        callback?.({ ok: false, error: error.message });
      }
    });

    socket.on("admin_pause", async (payload, callback) => {
      try {
        const manager = getAuctionManager(payload.roomCode);
        const updated = await manager.runAtomically(() => Promise.resolve(manager.pauseAuction(payload.userId)));
        io.to(payload.roomCode).emit("room_state", updated);
        callback?.({ ok: true, updated });
      } catch (error) {
        callback?.({ ok: false, error: error.message });
      }
    });

    socket.on("admin_resume", async (payload, callback) => {
      try {
        const manager = getAuctionManager(payload.roomCode);
        const updated = await manager.runAtomically(() => Promise.resolve(manager.resumeAuction(payload.userId)));
        io.to(payload.roomCode).emit("room_state", updated);
        callback?.({ ok: true, updated });
      } catch (error) {
        callback?.({ ok: false, error: error.message });
      }
    });

    socket.on("admin_stop", async (payload, callback) => {
      try {
        const manager = getAuctionManager(payload.roomCode);
        const updated = await manager.runAtomically(() => Promise.resolve(manager.stopAuction(payload.userId)));
        io.to(payload.roomCode).emit("room_state", updated);
        callback?.({ ok: true, updated });
      } catch (error) {
        callback?.({ ok: false, error: error.message });
      }
    });

    socket.on("disconnecting", () => {
      for (const roomCode of socket.rooms) {
        if (roomCode !== socket.id) {
          socket.to(roomCode).emit("user_disconnected", { socketId: socket.id });
        }
      }
    });
  });
}
