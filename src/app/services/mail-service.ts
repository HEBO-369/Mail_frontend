import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// [BACKEND DATA STRUCTURES]
// Ensure Backend DTOs match these interfaces exactly.

export interface Contact {
  id: number;
  name: string;
  emails: string[]; // Backend must handle List<String>
}

export interface Attachment {
  id?: number;
  fileName: string;
  contentType: string; // e.g., 'application/pdf'
  data?: string;       // Not needed for upload, but needed for download (Base64)
}

export interface Mail {
  id: number;  // Changed from mailId to match backend response
  sender: string;
  receiver: string;
  body: string;
  subject: string;
  timestamp: string; // ISO 8601 Format (e.g., "2023-12-25T10:30:00")
  priority: number;  // 1=High, 3=Normal, 4=Low
  folderName: string;
  isRead: boolean;
  attachments?: Attachment[];
}

export interface ComposeEmailDTO {
  sender?: string;
  receivers: string[];
  subject: string;
  body: string;
  priority: number;
}

export interface MailFilterDTO {
  userId?: number;
  sender?: string[];      // Backend expects List<String>
  receiver?: string[];    // Backend expects List<String>
  subject?: string;
  body?: string;
  exactDate?: string;     // ISO format: "2023-12-25T10:30:00" - Spring parses to LocalDateTime
  afterDate?: string;     // ISO format: "2023-12-25T10:30:00"
  beforeDate?: string;    // ISO format: "2023-12-25T10:30:00"
  isRead?: boolean;
  priority?: number;
}

@Injectable({
  providedIn: 'root'
})
export class MailService {
  private http = inject(HttpClient);
  private apiURL = 'https://mailbackend-production-b0cd.up.railway.app/api/mail';

  /* [BACKEND REQ] GET Inbox
     Request: GET /api/mail/inbox/{userEmail}
     Response: JSON Array of Mail objects */
  getInboxMails(userEmail: string): Observable<Mail[]> {
    return this.http.get<Mail[]>(`${this.apiURL}/inbox/${userEmail}`);
  }

  /* [BACKEND REQ] GET Sent
     Request: GET /api/mail/sent/{userEmail}
     Response: JSON Array of Mail objects */
  getSentMails(userEmail: string): Observable<Mail[]> {
    return this.http.get<Mail[]>(`${this.apiURL}/sent/${userEmail}`);
  }

  /* [BACKEND REQ] GET Drafts
     Request: GET /api/mail/drafts/{userEmail}
     Response: JSON Array of Mail objects */
  getDraftMails(userEmail: string): Observable<Mail[]> {
    return this.http.get<Mail[]>(`${this.apiURL}/drafts/${userEmail}`);
  }

  /* [BACKEND REQ] GET Custom Folder
     Request: GET /api/mail/folder/{userEmail}/{folderName}
     Response: JSON Array of Mail objects */
  getMailsByFolder(userEmail: string, folderName: string): Observable<Mail[]> {
    return this.http.get<Mail[]>(`${this.apiURL}/folder/${userEmail}/${folderName}`);
  }

  /* [BACKEND REQ] GET Single Mail
     Request: GET /api/mail/{mailId}
     Response: Single JSON Mail object */
  getMailById(mailId: number): Observable<Mail> {
    return this.http.get<Mail>(`${this.apiURL}/${mailId}`);
  }

  /* [BACKEND REQ] Send Simple Mail (Text Only)
     Request: POST /api/mail/send
     Body: ComposeEmailDTO (JSON) */
  sendMail(composeEmailDTO: ComposeEmailDTO): Observable<any> {
    return this.http.post(`${this.apiURL}/send`, composeEmailDTO);
  }

  /* [BACKEND REQ] Save Draft
     Request: POST /api/mail/draft
     Body: ComposeEmailDTO (JSON) */
  draftEmail(composeEmailDTO: ComposeEmailDTO): Observable<any> {
    return this.http.post(`${this.apiURL}/draft`, composeEmailDTO);
  }

  /* [BACKEND REQ] Update Existing Draft
     Request: PUT /api/mail/draft/{draftId}
     Body: ComposeEmailDTO (JSON) */
  updateDraft(draftId: number, composeEmailDTO: ComposeEmailDTO): Observable<any> {
    return this.http.put(`${this.apiURL}/draft/${draftId}`, composeEmailDTO);
  }

  /* [BACKEND REQ] Mark Read
     Request: PUT /api/mail/{mailId}/read
     Body: Empty */
  markAsRead(mailId: number): Observable<any> {
    const url = `${this.apiURL}/${mailId}/read`;
    console.log('MailService.markAsRead called with mailId:', mailId);
    console.log('Request URL:', url);
    return this.http.put(url, {});
  }

  /* [BACKEND REQ] Mark Unread
     Request: PUT /api/mail/{mailId}/unread
     Body: Empty */
  markAsUnread(mailId: number): Observable<any> {
    return this.http.put(`${this.apiURL}/${mailId}/unread`, {});
  }

  /* [BACKEND REQ] Delete Mail (Soft Delete - Move to Trash)
     Request: DELETE /api/mail/{mailId} */
  deleteMail(mailId: number): Observable<any> {
    return this.http.delete(`${this.apiURL}/${mailId}`);
  }

  /* [BACKEND REQ] Permanent Delete Mail (Hard Delete from Database)
     Request: DELETE /api/mail/{mailId}/permanent */
  permanentDeleteMail(mailId: number): Observable<any> {
    return this.http.delete(`${this.apiURL}/${mailId}/permanent`);
  }

  /* [BACKEND REQ] Move Mail to Folder
     Request: POST /api/folder/copy?mailId={id}&folderName={name} */
  moveMailToFolder(mailId: number, folderName: string): Observable<any> {
    return this.http.post(`https://mailbackend-production-b0cd.up.railway.app/api/folder/copy`, {}, {
      params: { mailId: mailId.toString(), folderName }
    });
  }

  /* [BACKEND REQ] User Folders CRUD */
  getUserFolders(userEmail: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiURL}/folders/${userEmail}`);
  }

  createFolder(userEmail: string, folderName: string): Observable<any> {
    return this.http.post(`${this.apiURL}/folders/${userEmail}`, {}, {
      params: { folderName }
    });
  }

  deleteFolder(userEmail: string, folderName: string): Observable<any> {
    return this.http.delete(`${this.apiURL}/folders/${userEmail}`, {
      params: { folderName }
    });
  }

  renameFolder(userEmail: string, oldName: string, newName: string): Observable<any> {
    return this.http.post(`https://mailbackend-production-b0cd.up.railway.app/api/folders/copy`, {}, {
      params: { oldName, newName }
    });
  }

  // searchMails(folder: string, mailFilterDto: MailFilterDTO): Observable<Mail[]> {
  //   return this.http.post<Mail[]>(`${this.apiURL}/search`, {
  //     ...mailFilterDto,
  //     folder: folder
  //   });
  // }

  /* [BACKEND REQ] Filter Mails with AND logic
     Request: POST /api/filter/{userId}/and
     Body: MailFilterDTO (JSON)
     Response: JSON Array of Mail objects */
  filterMailsAnd(userId: number, filter: MailFilterDTO): Observable<Mail[]> {
    return this.http.post<Mail[]>(`https://mailbackend-production-b0cd.up.railway.app/api/filter/${userId}/and`, filter);
  }

  /* [BACKEND REQ] Filter Mails with OR logic
     Request: POST /api/filter/{userId}/or
     Body: MailFilterDTO (JSON)
     Response: JSON Array of Mail objects */
  filterMailsOr(userId: number, filter: MailFilterDTO): Observable<Mail[]> {
    return this.http.post<Mail[]>(`https://mailbackend-production-b0cd.up.railway.app/api/filter/${userId}/or`, filter);
  }

  /* [BACKEND REQ] Search Mails (basic search using OR logic)
     Request: POST /api/filter/{userId}/or
     Body: MailFilterDTO (JSON)
     Response: JSON Array of Mail objects */
  searchMails(folder: string, filter: MailFilterDTO): Observable<Mail[]> {
    // Use OR logic for basic search to match any field
    const userId = filter.userId;
    if (!userId) {
      throw new Error('User ID is required for search');
    }
    return this.http.post<Mail[]>(`https://mailbackend-production-b0cd.up.railway.app/api/filter/${userId}/or`, filter);
  }

  sendMailWithAttachments(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiURL}/send-with-attachments`, formData);
  }


  getContacts(userEmail: string, sortingType: boolean): Observable<Contact[]> {
    return this.http.get<Contact[]>(`${this.apiURL}/contacts`, {
      params: {
        email: userEmail,
        sort: sortingType.toString()
      }
    });
  }

  addContact(contact: Contact, userEmail: string): Observable<any> {
    return this.http.post(`${this.apiURL}/contacts`, contact, {
      params: { userEmail }
    });
  }

  editContact(contact: Contact): Observable<any> {
    return this.http.put(`${this.apiURL}/contacts`, contact);
  }

  deleteContact(contactId: number): Observable<any> {
    return this.http.delete(`${this.apiURL}/contacts/${contactId}`);
  }

  loadSortedMails(email: string, criteria: string, order:boolean): Observable<any> {
    return this.http.get(`${this.apiURL}/sortMail/${email}/${criteria}/${order}`);
  }
  copyEmailToFolder(mailId: number, folderName: string): Observable<any> {
    return this.http.post(`https://mailbackend-production-b0cd.up.railway.app/api/folder/copy`, null, {
      params: { mailId: mailId.toString(), folderName }
    });
  }
}
  /* [BACKEND REQ] Copy Email to Folder
     Request: POST /api/folder/copy?mailId={mailId}&folderName={folderName}
     Response: Success message */





