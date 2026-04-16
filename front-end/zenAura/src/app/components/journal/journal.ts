import { Component, OnInit, Inject, PLATFORM_ID, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-journal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [DatePipe],
  templateUrl: './journal.html',
  styleUrl: './journal.css'
})
export class Journal implements OnInit {
  private http = inject(HttpClient);
  private datePipe = inject(DatePipe);
  private cdr = inject(ChangeDetectorRef);

  currentViewDate: Date = new Date();
  todayDateStr: string = '';
  currentViewDateStr: string = '';
  displayDate: string = '';
  isToday: boolean = true;
  isFuture: boolean = false;
  
  journalContent: string = '';
  isEditable: boolean = true;
  isLoading: boolean = false;
  isSaving: boolean = false;
  saveMessage: string = '';

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.currentViewDate = new Date();
    this.todayDateStr = this.formatDate(this.currentViewDate);
    this.loadJournalForDate(this.currentViewDate);
  }

  formatDate(date: Date): string {
    return this.datePipe.transform(date, 'yyyy-MM-dd') || '';
  }

  previousDay() {
    const prevDate = new Date(this.currentViewDate);
    prevDate.setDate(prevDate.getDate() - 1);
    this.loadJournalForDate(prevDate);
  }

  nextDay() {
    const nextD = new Date(this.currentViewDate);
    nextD.setDate(nextD.getDate() + 1);
    
    const nextDateStr = this.formatDate(nextD);
    if (nextDateStr > this.todayDateStr) {
        return;
    }
    
    this.loadJournalForDate(nextD);
  }

  async loadJournalForDate(date: Date) {
    this.currentViewDate = date;
    this.currentViewDateStr = this.formatDate(this.currentViewDate);
    this.displayDate = this.datePipe.transform(this.currentViewDate, 'EEEE, MMMM d, yyyy') || '';
    this.isToday = this.currentViewDateStr === this.todayDateStr;
    this.isFuture = this.currentViewDateStr > this.todayDateStr;
    this.isEditable = this.isToday; 
    this.journalContent = '';
    this.saveMessage = '';
    
    this.isLoading = true;
    this.cdr.detectChanges();
    
    try {
      const headers = this.getHeaders();
      const response: any = await lastValueFrom(
        this.http.get(`http://localhost:3000/api/journal/${this.currentViewDateStr}`, { headers })
      );
      if (response && response.journal) {
        this.journalContent = response.journal.content || '';
      }
    } catch (error) {
      console.error('Error loading journal:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async saveJournal() {
    if (!this.isEditable || !this.journalContent.trim()) {
        return;
    }

    this.isSaving = true;
    this.saveMessage = 'Saving...';
    this.cdr.detectChanges();

    try {
      const headers = this.getHeaders();
      const payload = {
          date: this.currentViewDateStr,
          content: this.journalContent
      };
      
      await lastValueFrom(
        this.http.post('http://localhost:3000/api/journal', payload, { headers })
      );
      
      this.saveMessage = 'Saved safely.';
      this.cdr.detectChanges();
      
      setTimeout(() => {
          this.saveMessage = '';
          this.cdr.detectChanges();
      }, 3000);
    } catch (error) {
      console.error('Error saving journal:', error);
      this.saveMessage = 'Error saving.';
      this.cdr.detectChanges();
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  private getHeaders(): HttpHeaders {
    let token = '';
    if (isPlatformBrowser(this.platformId)) {
        token = localStorage.getItem('token') || '';
    }
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }
}
