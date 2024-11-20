import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomService } from '../room/room.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WebRTCGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly HEARTBEAT_INTERVAL = 20000;
  private readonly HEARTBEAT_TIMEOUT = 60000;
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();

  @WebSocketServer() server: Server;
  
  constructor(private roomService: RoomService) {}

  // Handle connection
  handleConnection(client: Socket) {
    console.log("\x1b[32m", `Client connected: ${client.id}`);
    this.setupHeartbeat(client);
  }

  private setupHeartbeat(client: Socket) {
    // Отправляем ping каждые 30 секунд
    const interval = setInterval(() => {
      client.emit('ping');
      
      // Если клиент не ответил за 60 секунд - отключаем его
      const timeout = setTimeout(() => {
        console.log(`Client ${client.id} not responding - disconnecting`);
        this.handleLeaveRoom(client);
        client.disconnect(true);
      }, this.HEARTBEAT_TIMEOUT);

      // Ожидаем pong от клиента
      client.once('pong', () => {
        clearTimeout(timeout);
      });
    }, this.HEARTBEAT_INTERVAL);

    this.heartbeatIntervals.set(client.id, interval);
  }

  // Handle disconnection
  handleDisconnect(client: Socket) {
    const interval = this.heartbeatIntervals.get(client.id);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(client.id);
    }
    console.log("\x1b[31m", `Client disconnected: ${client.id}`);
    this.handleLeaveRoom(client);
  }

  @SubscribeMessage('create-room')
  handleCreateRoom(client: Socket, payload: { roomName: string, username: string }) {
    const room = this.roomService.createRoom(payload.roomName);
    this.roomService.addParticipant(room.id, client.id, payload.username);
    
    // Join socket.io room
    client.join(room.id);
    
    return { room };
  }

  @SubscribeMessage('stream-state-changed')
  handleStreamStateChanged(client: Socket, payload: any) {
    this.roomService.updateParticipant(payload.roomId, client.id, payload);
    this.server.to(payload.roomId).emit('stream-state-changed', { ...payload, socketId: client.id });
  }

  @SubscribeMessage('join-room')
  async handleJoinRoom(client: Socket, payload: { roomId: string, username: string }) {
    const room = this.roomService.getRoom(payload.roomId);
    
    if (!room) {
      return { error: 'Room not found' };
    }

    // Join socket.io room
    await client.join(room.id);

    // Add participant to room
    this.roomService.addParticipant(room.id, client.id, payload.username);
    
    // Notify other participants
    client.to(room.id).emit('user-joined', {
      socketId: client.id,
      username: payload.username,
      isCameraEnabled: true,
      isMicEnabled: true,
      isScreenSharing: false,
    });

    // Request offers from all participants
    client.to(room.id).emit('request-offer', {
      socketId: client.id
    });

    this.server.to(client.id).emit('set-participants', {
      participants: this.roomService.getRoomParticipants(room.id)
    });

    // Return current room
    return {
      room,
    };
  }

  // TODO MAYBE SEND PEER TO PEER MESSAGES
  @SubscribeMessage('send-message')
  handleChatMessage(_client: Socket, payload: { roomId: string, [key: string]: any }) {
    const messageWithId = {
      ...payload,
      id: Math.random().toString(36).substring(7)
    };
    this.server.to(payload.roomId).emit('chat-message', messageWithId);
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(client: Socket) {
    // Find rooms where client is participant
    // Note: In production, you might want to store room membership differently
    this.server.sockets.adapter.rooms.forEach((_, roomId) => {
      if (this.roomService.removeParticipant(roomId, client.id)) {
        client.to(roomId).emit('user-left', {
          socketId: client.id
        });
        client.leave(roomId);
      }
    });
  }

  // Handle WebRTC offer
  @SubscribeMessage('offer')
  handleOffer(client: Socket, payload: { target: string, offer: RTCSessionDescriptionInit }) {
    // console.log('Forwarding offer to:', payload.target);
    this.server.to(payload.target).emit('offer', {
      offer: payload.offer,
      from: client.id
    });
  }

  // Handle WebRTC answer
  @SubscribeMessage('answer')
  handleAnswer(client: Socket, payload: { target: string, answer: RTCSessionDescriptionInit }) {
    // console.log('Forwarding answer to:', payload.target);
    this.server.to(payload.target).emit('answer', {
      answer: payload.answer,
      from: client.id
    });
  }

  // Handle ICE candidates
  @SubscribeMessage('ice-candidate')
  handleIceCandidate(client: Socket, payload: { target: string, candidate: RTCIceCandidateInit }) {
    console.log('Forwarding ICE candidate to:', payload.target);
    this.server.to(payload.target).emit('ice-candidate', {
      candidate: payload.candidate,
      from: client.id
    });
  }
}
