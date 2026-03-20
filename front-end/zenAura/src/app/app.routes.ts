import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Home } from './components/home/home';
import { Quora } from './components/quora/quora';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'home', component: Home },
  { path: 'quora', component: Quora },
  { path: '', redirectTo: '/login', pathMatch: 'full' }
];
