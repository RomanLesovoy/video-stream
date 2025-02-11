import { Injectable } from '@nestjs/common';
import { Room, Participant } from './room.entity';

export const defaultUserActivity = {
  isCameraEnabled: true,
  isMicEnabled: true,
  isScreenSharing: false
}

@Injectable()
export class RoomService {
  private rooms: Map<string, Room> = new Map();

  private showError(e: any) {
    console.error(e);
    console.log('--------------------------------');
  }

  // Create new room
  createRoom(name: string): Room {
    try {
      const roomId = Math.random().toString(36).substring(8);
      const room = new Room(roomId, name);
      this.rooms.set(roomId, room);
      return room;
    } catch (e) {
      this.showError(e);
      return null;
    }
  }

  // Get room by ID
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  updateParticipant(roomId: string, socketId: string, participant: Participant): boolean {
    const oldParticipant = this.rooms.get(roomId)?.participants.get(socketId);
    const room = this.rooms.get(roomId);
    if (room) {
      room.participants.set(socketId, { ...oldParticipant, ...participant });
      return true;
    }
    return false;
  }

  // Add participant to room
  addParticipant(roomId: string, socketId: string, username: string): boolean {
    try {
      const room = this.rooms.get(roomId);
      if (room) {
        room.participants.set(socketId, { socketId, username, ...defaultUserActivity });
        return true;
      }
      return false;
    } catch (e) {
      this.showError(e);
      return false;
    }
  }

  // Remove participant from room
  removeParticipant(roomId: string, socketId: string): boolean {
    try {
      const room = this.rooms.get(roomId);
      if (room) {
        const removed = room.participants.delete(socketId);
        
        // If Room is empty - delete it
        if (room.participants.size === 0) {
          this.rooms.delete(roomId);
          console.log(`Room ${roomId} deleted - no participants left`);
        }
        
        return removed;
      }
      return false;
    } catch (e) {
      this.showError(e);
      return false;
    }
  }

  // Get all participants in room
  getRoomParticipants(roomId: string): Array<{ socketId: string; username: string }> {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.participants.values()) : [];
  }
}
