export interface Participant {
  socketId: string;
  username: string;
  isCameraEnabled: boolean;
  isMicEnabled: boolean;
  isScreenSharing: boolean;
}

// Room entity
export class Room {
  id: string;
  name: string;
  chatEnabled: boolean;
  participants: Map<string, Participant>;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
    this.chatEnabled = true;
    this.participants = new Map();
  }
}
