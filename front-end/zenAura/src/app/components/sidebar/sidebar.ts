import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar {
  navItems = [
    { name: 'Home', icon: '🏠', route: '/home' },
    { name: 'Quora', icon: '❓', route: '/quora' },
    { name: 'Chat', icon: '💬', route: '/chat' },
    { name: 'Profile', icon: '👤', route: '/profile' },
    { name: 'Journal', icon: '📝', route: '/journal' },
    { name: 'AI Chat', icon: '✨', route: '/chatbot' }
  ];
}
