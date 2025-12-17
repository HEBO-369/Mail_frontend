import {inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

export interface UserFormDTO{
    firstName: string;
    lastName: string;
    email: string;
    password: string;
}

export interface UserResponseDTO{
    id: number;
    name: string;
    email: string;
}

@Injectable({
    providedIn: 'root'
})
export class AuthenticationService{

    private router = inject(Router)
    private http = inject(HttpClient);
    private apiURL = 'https://mailbackend-production-b0cd.up.railway.app'

    user = signal<UserResponseDTO | null>(null);

    constructor(){
        const savedUser = localStorage.getItem('user');
        if(savedUser)
            this.user.set(JSON.parse(savedUser));
    }

    logIn(userForm: UserFormDTO){
        this.http.post(`${this.apiURL}/api/users/login`, userForm).subscribe({
            next: (response: any) => {
                localStorage.setItem('user', JSON.stringify(response))
                this.user.set(response);
                this.router.navigateByUrl('/mail');
            },
            error: (e) => {
                if (e.error && e.error.error) {
                    console.log(`Error: ${e.error.error}`);
                } else {
                    console.log('Unknown error', e);
                }
            }

        })
    }

    signUp(userForm: UserFormDTO){
        this.http.post(`${this.apiURL}/api/users/register`, userForm).subscribe({
            next: (response: any) => {
                this.user.set(response);
                this.router.navigateByUrl('/mail');
            },
            error: (e) => {
                if (e.error && e.error.error) {
                    console.log(`Error: ${e.error.error}`);
                } else {
                    console.log('Unknown error', e);
                }
            }
        })
    }

    signOut(){
        localStorage.removeItem('user');
        this.user.set(null);
        this.router.navigateByUrl('/login');
    }
}