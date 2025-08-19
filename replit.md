# Overview

This is a multi-player gaming platform that supports various board and card games including Chess, Checkers, Hearts, Spades, Crazy 8s, and Go Fish. The application provides real-time multiplayer functionality with support for human players, AI bots, and spectators. Users can create game rooms, join existing games, and interact through an integrated chat system.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite for build tooling
- **Routing**: Wouter for client-side routing with pages for login, main hub, game lobby, and active game rooms
- **State Management**: TanStack Query for server state management and caching
- **UI Components**: Radix UI primitives with shadcn/ui component library for consistent design
- **Styling**: Tailwind CSS with custom CSS variables for theming and dark mode support
- **Real-time Communication**: WebSocket client for live game updates, chat, and player interactions

## Backend Architecture
- **Runtime**: Node.js with Express.js server framework
- **Database ORM**: Drizzle ORM with PostgreSQL dialect for type-safe database operations
- **Real-time Features**: WebSocket server implementation for multiplayer game state synchronization
- **Game Logic**: Dedicated game engine service that handles game initialization, move validation, and state updates
- **AI System**: Bot service with configurable difficulty levels (easy, medium, hard) for each supported game type
- **Storage Layer**: Abstracted storage interface with in-memory implementation for development

## Database Schema
- **Users**: Player accounts with guest user support
- **Game Rooms**: Room metadata including game type, settings, host, and privacy options
- **Game Participants**: Player/bot assignments to rooms with ready states and spectator flags
- **Game States**: Current game data, turn information, and move history stored as JSONB
- **Chat Messages**: Room-based messaging system with user attribution and timestamps

## Authentication & Session Management
- Simple username-based authentication with guest user support
- Session storage using localStorage for client-side user persistence
- No complex authentication system - focuses on casual gaming experience

## Game Engine Design
- **Modular Game Support**: Extensible architecture supporting multiple game types through a unified interface
- **Turn Management**: Server-side turn validation and state progression
- **Move Validation**: Game-specific rule enforcement and legal move checking
- **State Synchronization**: Real-time game state broadcasting to all participants and spectators

## Real-time Communication
- **WebSocket Integration**: Bidirectional communication for game moves, chat, and room events
- **Event Types**: Structured message system for game starts, moves, updates, chat, and player state changes
- **Connection Management**: Automatic reconnection logic with exponential backoff
- **Room-based Broadcasting**: Messages routed to appropriate game room participants

# External Dependencies

## Database
- **Neon Database**: Serverless PostgreSQL database using `@neondatabase/serverless` driver
- **Connection**: Environment variable `DATABASE_URL` required for database connectivity

## UI Component Libraries
- **Radix UI**: Comprehensive set of unstyled, accessible UI primitives for form controls, navigation, and interactive elements
- **Lucide React**: Icon library providing consistent iconography throughout the application

## Development Tools
- **Vite**: Fast build tool with HMR for development and optimized production builds
- **TypeScript**: Type safety across frontend, backend, and shared schema definitions
- **ESBuild**: Backend bundling for production deployment

## Utility Libraries
- **TanStack Query**: Server state management with caching, background updates, and optimistic updates
- **React Hook Form**: Form state management with validation support
- **Zod**: Runtime type validation and schema generation from Drizzle schemas
- **Wouter**: Lightweight client-side routing solution
- **Date-fns**: Date manipulation and formatting utilities

## WebSocket Infrastructure
- **ws**: WebSocket library for Node.js server implementation
- **Native WebSocket API**: Browser-based WebSocket client for real-time communication

## Session Management
- **connect-pg-simple**: PostgreSQL session store for Express sessions (configured but may not be actively used)