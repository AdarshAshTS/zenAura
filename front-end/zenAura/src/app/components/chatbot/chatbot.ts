import { Component, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

interface Message {
  sender: 'user' | 'model';
  text: string;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.css'
})
export class ChatbotComponent implements OnInit, AfterViewChecked {
  messages: Message[] = [];
  userInput: string = '';
  isLoading: boolean = false;
  isBrowser: boolean;

  @ViewChild('chatScrollContainer') chatScrollContainer!: ElementRef;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    this.messages = [
      { sender: 'model', text: 'Hello! I am your AI assistant. How can I help you today?' }
    ];
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      if (this.chatScrollContainer) {
        this.chatScrollContainer.nativeElement.scrollTop = this.chatScrollContainer.nativeElement.scrollHeight;
      }
    } catch(err) { }
  }

  async sendMessage() {
    if (!this.userInput.trim() || this.isLoading) return;

    const userText = this.userInput.trim();
    this.messages.push({ sender: 'user', text: userText });
    this.userInput = '';
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      let token = '';
      if (this.isBrowser) {
        token = localStorage.getItem('token') || '';
      }
      
      const payload = {
        message: userText,
        previousMessages: this.messages.slice(1, -1) // Excluding the greeting and current message
      };

      const response: any = await lastValueFrom(
        this.http.post('http://localhost:3000/api/chatbot/message', payload, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      );

      this.messages.push({ sender: 'model', text: response.reply });
    } catch (error: any) {
      console.error('Chat error:', error);
      let errorMsg = 'Sorry, there was an error communicating with the AI.';
      if (error.error && error.error.error === 'GEMINI_API_KEY is not configured in backend .env') {
         errorMsg = 'Error: GEMINI_API_KEY is missing in backend .env.';
      }
      this.messages.push({ sender: 'model', text: errorMsg });
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
      this.scrollToBottom();
    }
  }

  adjustTextarea(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }
}
