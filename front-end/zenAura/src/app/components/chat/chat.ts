import {
  Component, OnInit, OnDestroy, Inject, PLATFORM_ID,
  ViewChild, ElementRef, NgZone, ChangeDetectorRef
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';
import { Subscription } from 'rxjs';

const PAGE_SIZE = 30;

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat implements OnInit, OnDestroy {
  @ViewChild('scrollMe') private scrollContainer!: ElementRef<HTMLDivElement>;

  // Sidebar
  users: any[] = [];
  filteredUsers: any[] = [];
  searchQuery = '';
  isLoadingUsers = false;
  skeletonArray = [1, 2, 3, 4, 5, 6];

  // Active conversation
  selectedUser: any = null;
  currentUser: any = null;
  messages: any[] = [];
  isLoadingHistory = false;
  isLoadingOlderMessages = false;
  hasMoreMessages = false;
  isSending = false;

  // Input
  newMessage = '';

  private messageSubscription: Subscription | null = null;
  // Cache: userId -> { messages: any[], hasMore: boolean, oldestId: number | null }
  private conversationCache = new Map<number, { messages: any[]; hasMore: boolean; oldestId: number | null }>();

  constructor(
    private chatService: ChatService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.currentUser = this.chatService.getCurrentUser();
    if (this.currentUser) {
      this.chatService.join(this.currentUser.id);
    }

    // Load users immediately on init – this is the fix for "users don't show on first open"
    this.loadUsers();

    // Subscribe to real-time messages
    this.messageSubscription = this.chatService.getMessages().subscribe((msg) => {
      this.ngZone.run(() => this.handleIncomingMessage(msg));
    });
  }

  // ─── User List ────────────────────────────────────────────────────────────

  loadUsers(): void {
    this.isLoadingUsers = true;
    this.chatService.getUsers().subscribe({
      next: (res) => {
        this.users = res.users || [];
        this.filterUsers();
        this.isLoadingUsers = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading users', err);
        this.isLoadingUsers = false;
        this.cdr.detectChanges();
      }
    });
  }

  filterUsers(): void {
    const q = this.searchQuery.toLowerCase();
    this.filteredUsers = this.users.filter(u =>
      u.username.toLowerCase().includes(q)
    );
  }

  // ─── Conversation ─────────────────────────────────────────────────────────

  selectUser(user: any): void {
    if (this.selectedUser?.id === user.id) return;

    this.selectedUser = user;
    user.unread_count = 0;
    this.markAsRead(user.id);

    const cached = this.conversationCache.get(user.id);
    if (cached) {
      this.messages = cached.messages;
      this.hasMoreMessages = cached.hasMore;
      setTimeout(() => this.scrollToBottom(), 0);
    } else {
      this.loadHistory(user.id);
    }
  }

  loadHistory(receiverId: number): void {
    this.isLoadingHistory = true;
    this.messages = [];
    this.hasMoreMessages = false;

    this.chatService.getChatHistory(receiverId, undefined, PAGE_SIZE).subscribe({
      next: (res) => {
        const history = this.mapMessages(res.history || []);
        this.messages = history;
        this.hasMoreMessages = history.length === PAGE_SIZE;
        this.isLoadingHistory = false;

        const oldestId = history.length > 0 ? history[0].id : null;
        this.conversationCache.set(receiverId, {
          messages: history,
          hasMore: this.hasMoreMessages,
          oldestId
        });

        this.cdr.detectChanges();
        setTimeout(() => this.scrollToBottom(), 50);
      },
      error: (err) => {
        console.error('Error loading history', err);
        this.isLoadingHistory = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadOlderMessages(): void {
    if (!this.selectedUser || this.isLoadingOlderMessages || !this.hasMoreMessages) return;

    const cached = this.conversationCache.get(this.selectedUser.id);
    const oldestId = cached?.oldestId ?? null;
    if (!oldestId) return;

    this.isLoadingOlderMessages = true;

    // Save scroll position before prepending
    const container = this.scrollContainer?.nativeElement;
    const scrollHeightBefore = container?.scrollHeight ?? 0;

    this.chatService.getChatHistory(this.selectedUser.id, oldestId, PAGE_SIZE).subscribe({
      next: (res) => {
        const older = this.mapMessages(res.history || []);
        this.messages = [...older, ...this.messages];
        this.hasMoreMessages = older.length === PAGE_SIZE;
        this.isLoadingOlderMessages = false;

        const newOldestId = older.length > 0 ? older[0].id : oldestId;
        this.conversationCache.set(this.selectedUser.id, {
          messages: this.messages,
          hasMore: this.hasMoreMessages,
          oldestId: newOldestId
        });

        // Restore scroll position so the view doesn't jump
        this.cdr.detectChanges();
        setTimeout(() => {
          if (container) {
            container.scrollTop = container.scrollHeight - scrollHeightBefore;
          }
        }, 0);
      },
      error: (err) => {
        console.error('Error loading older messages', err);
        this.isLoadingOlderMessages = false;
        this.cdr.detectChanges();
      }
    });
  }

  onScroll(event: Event): void {
    const el = event.target as HTMLElement;
    // If within 50px of the top, load older messages
    if (el.scrollTop < 50 && this.hasMoreMessages && !this.isLoadingOlderMessages) {
      this.loadOlderMessages();
    }
  }

  // ─── Sending ──────────────────────────────────────────────────────────────

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.selectedUser || !this.currentUser || this.isSending) return;

    const text = this.newMessage.trim();
    this.newMessage = '';

    // Optimistic message (no id yet – server will confirm via socket)
    const optimistic = {
      tempId: Date.now(),
      senderId: this.currentUser.id,
      receiverId: this.selectedUser.id,
      message: text,
      timestamp: new Date().toISOString(),
      is_read: false,
      pending: true
    };

    this.messages = [...this.messages, optimistic];
    this.updateSidebarLastMessage(this.selectedUser.id, text);
    setTimeout(() => this.scrollToBottom(), 0);

    // Actually send via socket
    this.chatService.sendMessage({
      senderId: this.currentUser.id,
      senderName: this.currentUser.username,
      receiverId: this.selectedUser.id,
      message: text,
      tempId: optimistic.tempId
    });
  }

  // ─── Real-time handler ────────────────────────────────────────────────────

  private handleIncomingMessage(msg: any): void {
    const isCurrentConversation = this.selectedUser &&
      (msg.senderId === this.selectedUser.id || msg.receiverId === this.selectedUser.id);

    if (isCurrentConversation) {
      if (msg.tempId) {
        // Replace optimistic message with confirmed one
        const idx = this.messages.findIndex((m: any) => m.tempId === msg.tempId);
        if (idx !== -1) {
          this.messages = [
            ...this.messages.slice(0, idx),
            { ...msg, pending: false },
            ...this.messages.slice(idx + 1)
          ];
        } else {
          this.messages = [...this.messages, msg];
        }
      } else {
        this.messages = [...this.messages, msg];
      }

      if (msg.senderId === this.selectedUser.id) {
        this.markAsRead(msg.senderId);
      }

      this.updateCache(this.selectedUser.id, this.messages);
      setTimeout(() => this.scrollToBottom(), 0);
    }

    this.updateSidebarLastMessage(
      msg.senderId === this.currentUser?.id ? msg.receiverId : msg.senderId,
      msg.message,
      msg.senderId !== this.currentUser?.id && msg.senderId !== this.selectedUser?.id
    );
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private mapMessages(rawList: any[]): any[] {
    return rawList.map((m: any) => ({
      id: m.id,
      senderId: m.sender_id,
      receiverId: m.receiver_id,
      message: m.message,
      timestamp: m.timestamp,
      is_read: m.is_read,
      sender_name: m.sender_name
    }));
  }

  private updateCache(userId: number, messages: any[]): void {
    const existing = this.conversationCache.get(userId);
    this.conversationCache.set(userId, {
      messages,
      hasMore: existing?.hasMore ?? false,
      oldestId: existing?.oldestId ?? null
    });
  }

  private updateSidebarLastMessage(userId: number, lastMsg: string, incrementUnread = false): void {
    const idx = this.users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      const user = { ...this.users[idx], last_message: lastMsg };
      if (incrementUnread) {
        user.unread_count = (parseInt(user.unread_count) || 0) + 1;
      }
      this.users = [user, ...this.users.filter((_, i) => i !== idx)];
      this.filterUsers();
    } else {
      // Unknown user sent a message – reload sidebar
      this.loadUsers();
    }
  }

  markAsRead(senderId: number): void {
    this.chatService.markAsRead(senderId).subscribe({
      error: (err) => console.error('Error marking as read', err)
    });
  }

  private scrollToBottom(): void {
    try {
      if (this.scrollContainer?.nativeElement) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch { /* noop */ }
  }

  getInitials(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  getUserColor(name: string): string {
    const colors = [
      '#FF5252', '#FF4081', '#E040FB', '#7C4DFF',
      '#536DFE', '#448AFF', '#40C4FF', '#18FFFF',
      '#64FFDA', '#69F0AE', '#B2FF59', '#FFD740',
      '#FFAB40', '#FF6E40'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  ngOnDestroy(): void {
    this.messageSubscription?.unsubscribe();
  }
}
