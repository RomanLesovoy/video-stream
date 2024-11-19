// Room entity
export class Room {
  id: string;
  name: string;
  chatEnabled: boolean;
  participants: Map<string, {
    socketId: string;
    username: string;
  }>;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
    this.chatEnabled = true;
    this.participants = new Map();
  }
}
