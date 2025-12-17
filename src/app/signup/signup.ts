import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthenticationService, UserFormDTO } from '../services/authentication-service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './signup.html',
  styleUrls: ['./signup.css'],
})
export class Signup {
  firstName: string = '';
  lastName: string = '';
  email: string = '';
  password: string = '';

  private authenticationService = inject(AuthenticationService);

  submit(){
    const request: UserFormDTO = {
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      password: this.password
    }

    this.authenticationService.signUp(request)

  }
}
