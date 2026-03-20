import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { jwtDecode } from 'jwt-decode';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

interface Question {
  id: number;
  question: string;
  user_id: number;
  user_name: string;
  timestamp: string;
  answer_count: number;
  showAnswers?: boolean;
  answers?: Answer[];
  loadingAnswers?: boolean;
  newAnswerText?: string;
  submittingAnswer?: boolean;
}

interface Answer {
  id: number;
  answer: string;
  user_id: number;
  user_name: string;
  timestamp: string;
  question_id: number;
}

@Component({
  selector: 'app-quora',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quora.html',
  styleUrl: './quora.css'
})
export class Quora implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('sentinel') sentinelRef!: ElementRef;

  private readonly API = 'http://localhost:3000/api/quora';
  private readonly PAGE_SIZE = 50;

  questions: Question[] = [];
  isLoading = false;
  hasMore = true;
  offset = 0;

  // Search
  searchQuery = '';
  isSearchMode = false;
  private searchSubject = new Subject<string>();

  // Ask Question modal
  showAskModal = false;
  newQuestionText = '';
  submittingQuestion = false;

  // Current user
  userName = '';
  userId: number = 0;

  private observer!: IntersectionObserver;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.loadUserInfo();
    this.loadQuestions();

    // Debounced search
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(query => {
      this.triggerSearch(query);
    });
  }

  ngAfterViewInit(): void {
    this.setupIntersectionObserver();
  }

  ngOnDestroy(): void {
    if (this.observer) this.observer.disconnect();
    this.searchSubject.complete();
  }

  private loadUserInfo(): void {
    if (typeof window !== 'undefined' && localStorage) {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const decoded: any = jwtDecode(token);
          this.userName = decoded.username || decoded.userName || 'User';
          this.userId = decoded.id;
        } catch { }
      }
    }
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private setupIntersectionObserver(): void {
    if (typeof window === 'undefined' || !this.sentinelRef) return;
    
    // Disconnect existing observer if any
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !this.isLoading && this.hasMore) {
          this.loadMore();
        }
      },
      { rootMargin: '200px' }
    );
    this.observer.observe(this.sentinelRef.nativeElement);
  }

  loadQuestions(): void {
    if (this.isLoading) return;
    this.isLoading = true;
    this.http.get<any>(`${this.API}/questions?limit=${this.PAGE_SIZE}&offset=${this.offset}`)
      .subscribe({
        next: (res) => {
          this.questions = [...this.questions, ...res.questions];
          this.hasMore = res.hasMore;
          this.offset += res.questions.length;
          this.isLoading = false;
          this.cdr.detectChanges();
          // Try to setup observer now that data is loaded and sentinel might exist
          setTimeout(() => this.setupIntersectionObserver(), 0);
        },
        error: () => { 
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  loadMore(): void {
    if (this.isSearchMode) {
      this.loadMoreSearch();
    } else {
      this.loadQuestions();
    }
  }

  // ── Search ──────────────────────────────────────────────────────────────────
  onSearchInput(): void {
    this.searchSubject.next(this.searchQuery);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.isSearchMode = false;
    this.questions = [];
    this.offset = 0;
    this.hasMore = true;
    this.loadQuestions();
  }

  private triggerSearch(query: string): void {
    if (!query.trim()) {
      this.clearSearch();
      return;
    }
    this.isSearchMode = true;
    this.questions = [];
    this.offset = 0;
    this.hasMore = true;
    this.fetchSearchResults(query.trim(), 0);
  }

  private fetchSearchResults(query: string, offset: number): void {
    if (this.isLoading) return;
    this.isLoading = true;
    this.http.get<any>(`${this.API}/questions/search?q=${encodeURIComponent(query)}&limit=${this.PAGE_SIZE}&offset=${offset}`)
      .subscribe({
        next: (res) => {
          this.questions = [...this.questions, ...res.questions];
          this.hasMore = res.hasMore;
          this.offset = offset + res.questions.length;
          this.isLoading = false;
          this.cdr.detectChanges();
          setTimeout(() => this.setupIntersectionObserver(), 0);
        },
        error: () => { 
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  private loadMoreSearch(): void {
    this.fetchSearchResults(this.searchQuery.trim(), this.offset);
  }

  // ── Ask Question ─────────────────────────────────────────────────────────────
  openAskModal(): void {
    this.showAskModal = true;
    this.newQuestionText = '';
  }

  closeAskModal(): void {
    this.showAskModal = false;
    this.newQuestionText = '';
  }

  submitQuestion(): void {
    const text = this.newQuestionText ? this.newQuestionText.trim() : '';
    if (!text || this.submittingQuestion) return;
    
    this.submittingQuestion = true;
    let headers: HttpHeaders;
    
    try {
      headers = this.getAuthHeaders();
    } catch (e) {
      console.error('Error getting headers:', e);
      this.submittingQuestion = false;
      this.cdr.detectChanges();
      return;
    }

    this.http.post<any>(
      `${this.API}/questions`,
      { question: text },
      { headers }
    ).subscribe({
      next: (res) => {
        try {
          if (res && res.question) {
            this.questions.unshift({ ...res.question, showAnswers: false, answers: [], answer_count: 0 });
            this.offset++;
          }
          this.submittingQuestion = false;
          this.closeAskModal();
          this.cdr.detectChanges();
        } catch (e) {
          console.error('Error processing response:', e);
          this.submittingQuestion = false;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Error submitting question:', err);
        this.submittingQuestion = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Answers ──────────────────────────────────────────────────────────────────
  toggleAnswers(question: Question): void {
    question.showAnswers = !question.showAnswers;
    if (question.showAnswers && (!question.answers || question.answers.length === 0)) {
      this.loadAnswers(question);
    }
  }

  loadAnswers(question: Question): void {
    question.loadingAnswers = true;
    this.http.get<any>(`${this.API}/questions/${question.id}/answers`)
      .subscribe({
        next: (res) => {
          question.answers = res.answers;
          question.answer_count = res.answers.length;
          question.loadingAnswers = false;
          this.cdr.detectChanges();
        },
        error: () => { 
          question.loadingAnswers = false;
          this.cdr.detectChanges();
        }
      });
  }

  submitAnswer(question: Question): void {
    const text = question.newAnswerText ? question.newAnswerText.trim() : '';
    if (!text || question.submittingAnswer) return;
    
    question.submittingAnswer = true;
    let headers: HttpHeaders;
    
    try {
      headers = this.getAuthHeaders();
    } catch (e) {
      console.error('Error getting headers:', e);
      question.submittingAnswer = false;
      this.cdr.detectChanges();
      return;
    }

    this.http.post<any>(
      `${this.API}/questions/${question.id}/answers`,
      { answer: text },
      { headers }
    ).subscribe({
      next: (res) => {
        try {
          if (res && res.answer) {
            question.answers = [...(question.answers || []), res.answer];
            question.answer_count = (question.answer_count || 0) + 1;
            question.newAnswerText = '';
          }
          question.submittingAnswer = false;
          this.cdr.detectChanges();
        } catch (e) {
          console.error('Error processing response:', e);
          question.submittingAnswer = false;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Error submitting answer:', err);
        question.submittingAnswer = false;
        this.cdr.detectChanges();
      }
    });
  }

  timeAgo(timestamp: string): string {
    const diff = (Date.now() - new Date(timestamp).getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(timestamp).toLocaleDateString();
  }
}
