import { Injectable } from '@nestjs/common';
import { Room } from './room.entity';

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

  // Add participant to room
  addParticipant(roomId: string, socketId: string, username: string): boolean {
    try {
      const room = this.rooms.get(roomId);
      if (room) {
        room.participants.set(socketId, { socketId, username });
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
        
        // Если комната пуста - удаляем её
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
