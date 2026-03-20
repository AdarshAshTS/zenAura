import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  isLoginMode: boolean = true;
  isLoading: boolean = false;
  errorMessage: string = '';

  // Form Models
  loginData = { email: '', password: '' };
  signupData = { username: '', email: '', password: '' };

  apiUrl = 'http://localhost:3000/api/auth';

  constructor(private http: HttpClient, private router: Router) {}

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.errorMessage = '';
  }

  onSubmit() {
    this.errorMessage = '';
    this.isLoading = true;

    if (this.isLoginMode) {
      if (!this.loginData.email || !this.loginData.password) {
        this.errorMessage = 'Please fill out all fields.';
        this.isLoading = false;
        return;
      }

      this.http.post<any>(`${this.apiUrl}/login`, this.loginData).subscribe({
        next: (res) => {
          this.isLoading = false;
          console.log('Login successful', res);
          localStorage.setItem('token', res.token);
          this.router.navigate(['/home']); 
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.error?.message || 'Login failed. Please try again.';
          console.error(err);
        }
      });
    } else {
      if (!this.signupData.username || !this.signupData.email || !this.signupData.password) {
        this.errorMessage = 'Please fill out all fields.';
        this.isLoading = false;
        return;
      }

      this.http.post<any>(`${this.apiUrl}/register`, this.signupData).subscribe({
        next: (res) => {
          this.isLoading = false;
          console.log('Registration successful', res);
          localStorage.setItem('token', res.token);
          this.router.navigate(['/home']); // Redirecting
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.error?.message || 'Registration failed. Please try again.';
          console.error(err);
        }
      });
    }
  }
}
