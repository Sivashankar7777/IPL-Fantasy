"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { AuctionState } from "@/lib/types";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [state, setState] = useState<AuctionState | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(15);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));
    socket.on("room_state", (payload: any) => {
      const mappedState: AuctionState = {
        ...payload,
        timeRemaining: payload.timeLeft ?? payload.timeRemaining ?? 15,
        activeBid: payload.currentPlayer
          ? {
              player: payload.currentPlayer,
              amount: payload.currentBid ?? 0,
              highestBidderUserId: payload.highestBidderId ?? null,
              bidIncrement: 10,
            }
          : payload.activeBid ?? null,
      };
      setState(mappedState);
      setTimeRemaining(mappedState.timeRemaining);
    });
    socket.on("start_randomizer_animation", () => {
      setState((current) => (current ? { ...current, phase: "RANDOMIZING" } : current));
    });
    socket.on("teams_assigned", (payload) => {
      setState((current) =>
        current
          ? {
              ...current,
              phase: "RETENTION",
              teams: payload.assignments.map((entry: { team: unknown }) => entry.team),
              users: current.users.map((user) => {
                const assignment = payload.assignments.find((entry: { userId: string; team: { teamId: string } }) => entry.userId === user.userId);
                return assignment ? { ...user, assignedTeamId: assignment.team.teamId } : user;
              }),
            }
          : current
      );
    });
    socket.on("retention_updated", (payload) => {
      setState((current) =>
        current
          ? {
              ...current,
              users: current.users.map((user) =>
                user.userId === payload.userId ? { ...user, retentionLocked: payload.retentionLocked } : user
              ),
              teams: current.teams.map((team) => (team.teamId === payload.team.teamId ? payload.team : team)),
            }
          : current
      );
    });
    socket.on("bid_updated", (payload) => {
      setState((current) =>
        current
          ? {
              ...current,
              activeBid: {
                player: payload.player,
                amount: payload.currentBid,
                highestBidderUserId: payload.highestBidderUserId,
                bidIncrement: payload.bidIncrement,
              },
              teams: payload.teams,
              timeRemaining: payload.timeRemaining,
            }
          : current
      );
    });
    socket.on("timer_tick", (payload: { timeRemaining: number }) => {
      setTimeRemaining(payload.timeRemaining);
      setState((current) => (current ? { ...current, timeRemaining: payload.timeRemaining } : current));
    });
    socket.on("new_player", (payload) => {
      setState((current) =>
        current
          ? {
              ...current,
              phase: payload.phase ?? current.phase,
              activeBid: payload.player
                ? {
                    player: payload.player,
                    amount: payload.currentBid,
                    highestBidderUserId: payload.highestBidderUserId,
                    bidIncrement: payload.bidIncrement,
                  }
                : null,
              teams: payload.teams ?? current.teams,
              timeRemaining: payload.timeRemaining ?? 15,
            }
          : current
      );
      if (payload.timeRemaining) setTimeRemaining(payload.timeRemaining);
    });
    socket.on("player_sold", (payload) => {
      setState((current) =>
        current
          ? {
              ...current,
              activeBid: null,
              teams: current.teams.map((team) =>
                team.teamId === payload.team?.teamId ? payload.team : team
              ),
            }
          : current
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const emitWithAck = <T,>(event: string, payload: unknown) =>
    new Promise<T>((resolve, reject) => {
      socketRef.current?.emit(event, payload, (response: { ok: boolean; error?: string } & T) => {
        if (response?.ok) resolve(response);
        else reject(new Error(response?.error ?? "Socket action failed."));
      });
    });

  return {
    socket: socketRef.current,
    isConnected,
    state,
    timeRemaining,
    setState,
    emitWithAck,
  };
}
