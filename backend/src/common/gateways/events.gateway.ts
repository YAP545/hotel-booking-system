import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(EventsGateway.name);

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitEvent(event: string, payload: any) {
    if (this.server) {
      this.server.emit(event, payload);
    }
  }

  broadcastBookingCreated(reservation: any) {
    this.emitEvent('booking.created', reservation);
  }

  broadcastBookingUpdated(reservation: any) {
    this.emitEvent('booking.updated', reservation);
  }

  broadcastRoomStatusChanged(data: { roomId: string; roomNumber: string; status: string }) {
    this.emitEvent('room.status_changed', data);
  }

  broadcastCheckInCompleted(data: any) {
    this.emitEvent('checkin.completed', data);
  }

  broadcastCheckOutCompleted(data: any) {
    this.emitEvent('checkout.completed', data);
  }

  broadcastPaymentRecorded(data: any) {
    this.emitEvent('payment.recorded', data);
  }
}
