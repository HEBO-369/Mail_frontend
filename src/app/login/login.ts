import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthenticationService, UserFormDTO } from '../services/authentication-service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login {
  firstName: string = '';
  lastName: string = '';
  email: string = '';
  password: string = '';

  private authenticationService = inject(AuthenticationService);

  submit(){
    const request = {
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      password: this.password
    }

    this.authenticationService.logIn(request)

  }
}
