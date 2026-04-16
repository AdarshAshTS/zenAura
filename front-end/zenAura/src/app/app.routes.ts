import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Home } from './components/home/home';
import { Quora } from './components/quora/quora';
import { Chat } from './components/chat/chat';
import { Journal } from './components/journal/journal';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'home', component: Home },
  { path: 'quora', component: Quora },
  { path: 'chat', component: Chat },
  { path: 'journal', component: Journal },
  { path: '', redirectTo: '/login', pathMatch: 'full' }
];
