import { 
  type User, 
  type InsertUser,
  type GameRoom,
  type InsertGameRoom,
  type GameParticipant,
  type InsertGameParticipant,
  type GameState,
  type InsertGameState,
  type ChatMessage,
  type InsertChatMessage,
  type GameType,
  type GameMode,
  type RoomStatus
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Game room methods
  getGameRoom(id: string): Promise<GameRoom | undefined>;
  createGameRoom(room: InsertGameRoom & { hostId: string }): Promise<GameRoom>;
  updateGameRoom(id: string, updates: Partial<GameRoom>): Promise<GameRoom | undefined>;
  getActiveRooms(): Promise<GameRoom[]>;
  getRoomsByGameType(gameType: GameType): Promise<GameRoom[]>;

  // Game participant methods
  getParticipantsByRoom(roomId: string): Promise<GameParticipant[]>;
  addParticipant(participant: InsertGameParticipant): Promise<GameParticipant>;
  updateParticipant(id: string, updates: Partial<GameParticipant>): Promise<GameParticipant | undefined>;
  removeParticipant(id: string): Promise<void>;

  // Game state methods
  getGameState(roomId: string): Promise<GameState | undefined>;
  createGameState(state: InsertGameState): Promise<GameState>;
  updateGameState(roomId: string, updates: Partial<GameState>): Promise<GameState | undefined>;

  // Chat methods
  getChatMessages(roomId: string): Promise<ChatMessage[]>;
  addChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private gameRooms: Map<string, GameRoom>;
  private gameParticipants: Map<string, GameParticipant>;
  private gameStates: Map<string, GameState>;
  private chatMessages: Map<string, ChatMessage>;

  constructor() {
    this.users = new Map();
    this.gameRooms = new Map();
    this.gameParticipants = new Map();
    this.gameStates = new Map();
    this.chatMessages = new Map();
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      isGuest: insertUser.isGuest || false,
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  // Game room methods
  async getGameRoom(id: string): Promise<GameRoom | undefined> {
    return this.gameRooms.get(id);
  }

  async createGameRoom(room: InsertGameRoom & { hostId: string }): Promise<GameRoom> {
    const id = randomUUID();
    const gameRoom: GameRoom = {
      ...room,
      id,
      status: "waiting" as RoomStatus,
      maxPlayers: room.maxPlayers || 4,
      settings: room.settings || {},
      isPrivate: room.isPrivate || false,
      allowSpectators: room.allowSpectators || true,
      enableChat: room.enableChat || true,
      createdAt: new Date()
    };
    this.gameRooms.set(id, gameRoom);
    return gameRoom;
  }

  async updateGameRoom(id: string, updates: Partial<GameRoom>): Promise<GameRoom | undefined> {
    const room = this.gameRooms.get(id);
    if (!room) return undefined;
    
    const updatedRoom = { ...room, ...updates };
    this.gameRooms.set(id, updatedRoom);
    return updatedRoom;
  }

  async getActiveRooms(): Promise<GameRoom[]> {
    return Array.from(this.gameRooms.values())
      .filter(room => room.status === "waiting" || room.status === "playing");
  }

  async getRoomsByGameType(gameType: GameType): Promise<GameRoom[]> {
    return Array.from(this.gameRooms.values())
      .filter(room => room.gameType === gameType && room.status === "waiting");
  }

  // Game participant methods
  async getParticipantsByRoom(roomId: string): Promise<GameParticipant[]> {
    return Array.from(this.gameParticipants.values())
      .filter(participant => participant.roomId === roomId);
  }

  async addParticipant(participant: InsertGameParticipant): Promise<GameParticipant> {
    const id = randomUUID();
    const gameParticipant: GameParticipant = {
      ...participant,
      id,
      userId: participant.userId || null,
      botDifficulty: participant.botDifficulty || null,
      isReady: false,
      isSpectator: participant.isSpectator || false,
      joinedAt: new Date()
    };
    this.gameParticipants.set(id, gameParticipant);
    return gameParticipant;
  }

  async updateParticipant(id: string, updates: Partial<GameParticipant>): Promise<GameParticipant | undefined> {
    const participant = this.gameParticipants.get(id);
    if (!participant) return undefined;

    const updatedParticipant = { ...participant, ...updates };
    this.gameParticipants.set(id, updatedParticipant);
    return updatedParticipant;
  }

  async removeParticipant(id: string): Promise<void> {
    this.gameParticipants.delete(id);
  }

  // Game state methods
  async getGameState(roomId: string): Promise<GameState | undefined> {
    return Array.from(this.gameStates.values())
      .find(state => state.roomId === roomId);
  }

  async createGameState(state: InsertGameState): Promise<GameState> {
    const id = randomUUID();
    const gameState: GameState = {
      ...state,
      id,
      currentTurn: state.currentTurn || null,
      turnNumber: 1,
      startedAt: new Date(),
      updatedAt: new Date()
    };
    this.gameStates.set(id, gameState);
    return gameState;
  }

  async updateGameState(roomId: string, updates: Partial<GameState>): Promise<GameState | undefined> {
    const existingState = await this.getGameState(roomId);
    if (!existingState) return undefined;

    const updatedState = { 
      ...existingState, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.gameStates.set(existingState.id, updatedState);
    return updatedState;
  }

  // Chat methods
  async getChatMessages(roomId: string): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values())
      .filter(message => message.roomId === roomId)
      .sort((a, b) => a.sentAt!.getTime() - b.sentAt!.getTime());
  }

  async addChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const id = randomUUID();
    const chatMessage: ChatMessage = {
      ...message,
      id,
      userId: message.userId || null,
      messageType: message.messageType || "user",
      sentAt: new Date()
    };
    this.chatMessages.set(id, chatMessage);
    return chatMessage;
  }
}

export const storage = new MemStorage();
