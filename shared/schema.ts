import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  isGuest: boolean("is_guest").default(false),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const gameRooms = pgTable("game_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  gameType: text("game_type").notNull(),
  maxPlayers: integer("max_players").notNull().default(2),
  hostId: varchar("host_id").notNull().references(() => users.id),
  gameMode: text("game_mode").notNull(), // 'online' | 'local' | 'bots'
  settings: jsonb("settings").default({}),
  isPrivate: boolean("is_private").default(false),
  allowSpectators: boolean("allow_spectators").default(true),
  enableChat: boolean("enable_chat").default(true),
  status: text("status").notNull().default("waiting"), // 'waiting' | 'playing' | 'finished'
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const gameParticipants = pgTable("game_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull().references(() => gameRooms.id),
  userId: varchar("user_id").references(() => users.id),
  playerType: text("player_type").notNull(), // 'human' | 'bot'
  botDifficulty: text("bot_difficulty"), // 'easy' | 'medium' | 'hard'
  isReady: boolean("is_ready").default(false),
  isSpectator: boolean("is_spectator").default(false),
  joinedAt: timestamp("joined_at").default(sql`now()`),
});

export const gameStates = pgTable("game_states", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull().references(() => gameRooms.id),
  gameData: jsonb("game_data").notNull(),
  currentTurn: varchar("current_turn"),
  turnNumber: integer("turn_number").default(1),
  startedAt: timestamp("started_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull().references(() => gameRooms.id),
  userId: varchar("user_id").references(() => users.id),
  message: text("message").notNull(),
  messageType: text("message_type").default("user"), // 'user' | 'system'
  sentAt: timestamp("sent_at").default(sql`now()`),
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  isGuest: true,
});

export const insertGameRoomSchema = createInsertSchema(gameRooms).pick({
  name: true,
  gameType: true,
  maxPlayers: true,
  gameMode: true,
  settings: true,
  isPrivate: true,
  allowSpectators: true,
  enableChat: true,
});

export const insertGameParticipantSchema = createInsertSchema(gameParticipants).pick({
  roomId: true,
  userId: true,
  playerType: true,
  botDifficulty: true,
  isSpectator: true,
});

export const insertGameStateSchema = createInsertSchema(gameStates).pick({
  roomId: true,
  gameData: true,
  currentTurn: true,
  turnNumber: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  roomId: true,
  userId: true,
  message: true,
  messageType: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type GameRoom = typeof gameRooms.$inferSelect;
export type InsertGameRoom = z.infer<typeof insertGameRoomSchema>;

export type GameParticipant = typeof gameParticipants.$inferSelect;
export type InsertGameParticipant = z.infer<typeof insertGameParticipantSchema>;

export type GameState = typeof gameStates.$inferSelect;
export type InsertGameState = z.infer<typeof insertGameStateSchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// Game Types
export type GameType = 'chess' | 'hearts' | 'checkers' | 'crazy8s' | 'spades' | 'gofish';
export type GameMode = 'online' | 'local' | 'bots';
export type PlayerType = 'human' | 'bot';
export type BotDifficulty = 'easy' | 'medium' | 'hard';
export type RoomStatus = 'waiting' | 'playing' | 'finished';
