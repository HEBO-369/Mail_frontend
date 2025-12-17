import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Signup } from './signup/signup';
import { Mail } from './mail/mail';

export const routes: Routes = [
    {path: "", redirectTo: "login", pathMatch: "full"},
    {path: "login", component: Login, title: "Log In"},
    {path: "signup", component: Signup, title: "Sign Up"},
    {path: "mail", component: Mail, title: "Mail"}
];
