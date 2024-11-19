import { Module } from '@nestjs/common';
import { WebRTCGateway } from './webrtc.gateway';
import { RoomModule } from 'src/room/room.module';

@Module({
  imports: [RoomModule],
  providers: [WebRTCGateway],
  exports: [WebRTCGateway]
})
export class WebRTCModule {}
