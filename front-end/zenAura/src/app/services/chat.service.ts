import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private socket: Socket | null = null;
  private messageSubject = new Subject<any>();
  private apiUrl = 'http://localhost:3000/api/chat';

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.socket = io('http://localhost:3000');
      this.setupSocketListeners();
    }
  }

  private setupSocketListeners() {
    if (this.socket) {
      this.socket.on('receive_message', (data) => {
        this.messageSubject.next(data);
      });
    }
  }

  join(userId: number) {
    if (this.socket) {
      this.socket.emit('join', userId);
    }
  }

  sendMessage(messageData: any) {
    if (this.socket) {
      this.socket.emit('send_message', messageData);
    }
  }

  getMessages(): Observable<any> {
    return this.messageSubject.asObservable();
  }

  getUsers(): Observable<any> {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      return this.http.get(`${this.apiUrl}/users`, { headers });
    }
    return new Observable();
  }

  getChatHistory(receiverId: number, beforeId?: number, limit = 30): Observable<any> {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      let url = `${this.apiUrl}/history/${receiverId}?limit=${limit}`;
      if (beforeId != null) url += `&before_id=${beforeId}`;
      return this.http.get(url, { headers });
    }
    return new Observable();
  }

  markAsRead(senderId: number): Observable<any> {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      return this.http.put(`${this.apiUrl}/read/${senderId}`, {}, { headers });
    }
    return new Observable();
  }

  getCurrentUser() {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const decoded: any = jwtDecode(token);
          return decoded;
        } catch (e) {
          console.error('Error decoding token', e);
          return null;
        }
      }
    }
    return null;
  }
}
