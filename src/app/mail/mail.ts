import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { AuthenticationService } from '../services/authentication-service';
import { Router } from '@angular/router';
import { MailService, Mail as MailEntity, ComposeEmailDTO, Contact, MailFilterDTO } from '../services/mail-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, forkJoin } from 'rxjs';

@Component({
  selector: 'app-mail',
  imports: [CommonModule, FormsModule],
  templateUrl: './mail.html',
  styleUrls: ['./mail.css', './profile.css', './navbar.css', './sidebar.css', './main-section.css',
    './filterbar.css', './selectbar.css', "./compose.css", "./mailview.css", "./contact.css", "./filterDropDown.css"
  ],
})
export class Mail implements OnInit {
  authenticationService = inject(AuthenticationService);
  mailService = inject(MailService);
  router = inject(Router);

  //dummydata
  currentUser = this.authenticationService.user;

  getRange(n: number) {
    return Array.from({ length: n }, (_, i) => i);
  }

  // Mail data
  mails = signal<MailEntity[]>([]);
  currentFolder = signal<string>('inbox');
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Priority Mode
  isPriorityMode = signal<boolean>(false);

  //profile part
  isProfileDropdownOpen: boolean = false;

  ngOnInit() {
    this.loadInbox();
    this.loadUserFolders();
  }

  toggleProfileDropdown() {
    this.isProfileDropdownOpen = !this.isProfileDropdownOpen;
  }

  addAccount() {
    this.router.navigateByUrl('/login');
  }

  signOut() {
    this.authenticationService.signOut();
  }

  //pagination
  itemsPerPage = 6
  page = signal(0);
  pageFrom = signal(1)
  numOfItems = this.mails().length
  pageTo = signal(this.itemsPerPage)

  generatePage() {
    return Array.from({ length: Math.min(this.itemsPerPage, this.mails().length) },
      (_, i) => i + this.page() * this.itemsPerPage);
  }

  pageDisplay = signal(`${this.pageFrom()}-${this.pageTo()} of ${this.mails().length}`)

  pagingLeft() {
    const n = this.mails().length;
    const pages = Math.ceil(n / this.itemsPerPage);

    if (this.page() != 0) {
      this.page.update(value => value - 1)

      if (this.page() == pages - 2)
        this.pageTo.set(this.pageFrom() - 1)
      else
        this.pageTo.update(value => value - this.itemsPerPage)

      this.pageFrom.update(value => value - this.itemsPerPage)
    }
  }

  pagingRight() {
    const n = this.mails().length;
    const pages = Math.ceil(n / this.itemsPerPage);
    if (this.page() < pages) {
      if (this.page() < pages - 1) {
        this.page.update(value => value + 1)
        this.pageFrom.update(value => value + this.itemsPerPage)
      }
      if (this.page() == pages - 1)
        this.pageTo.update(value => n)
      else
        this.pageTo.update(value => value + this.itemsPerPage)

    }
  }
  //Selection Logic
  selectedIds = signal<Set<number>>(new Set());

  // Use a method that explicitly reads the signal to ensure reactivity
  isSelected(mailId: number): boolean {
    const ids = this.selectedIds();
    return ids.has(mailId);
  }

  //Toggle selection for a single mail
  toggleSelection(event: Event, mailId: number) {
    event.stopPropagation();
    event.preventDefault();
    console.log('Toggle called for mailId:', mailId);
    console.log('Current selected IDs before:', Array.from(this.selectedIds()));

    // Create a completely new Set to ensure Angular detects the change
    const currentIds = this.selectedIds();
    const newIds = new Set<number>();

    // Copy existing IDs
    currentIds.forEach(id => newIds.add(id));

    // Toggle the target ID
    if (newIds.has(mailId)) {
      newIds.delete(mailId);
    } else {
      newIds.add(mailId);
    }

    console.log('New selected IDs after:', Array.from(newIds));
    this.selectedIds.set(newIds);
  }

  //Select/Deselect All (Current Page Only)
  toggleSelectAll() {
    const visibleIndices = this.generatePage();
    const allSelected = visibleIndices.every(i =>
      this.selectedIds().has(this.mails()[i].id)
    );

    this.selectedIds.update(ids => {
      const newIds = new Set(ids);
      visibleIndices.forEach(i => {
        const mailId = this.mails()[i].id;
        if (allSelected) {
          newIds.delete(mailId);
        } else {
          newIds.add(mailId);
        }
      });
      return newIds;
    });
  }
  isAllVisibleSelected(): boolean {
    const visibleIndices = this.generatePage();
    if (visibleIndices.length === 0) return false;
    return visibleIndices.every(i => this.selectedIds().has(this.mails()[i].id));
  }

  //Bulk Actions
  deleteSelectedMails() {
    if (this.selectedIds().size === 0) return;
    
    const currentFolder = this.currentFolder();
    const isInTrash = currentFolder === 'trash';
    const count = this.selectedIds().size;
    
    const confirmMessage = isInTrash
      ? `Permanently delete ${count} email(s)? This cannot be undone!`
      : `Move ${count} email(s) to trash?`;
    
    if (confirm(confirmMessage)) {
      // Choose delete method based on current folder
      const deleteMethod = isInTrash
        ? (id: number) => this.mailService.permanentDeleteMail(id)
        : (id: number) => this.mailService.deleteMail(id);
      
      // Create delete requests for all selected emails
      const deleteRequests = Array.from(this.selectedIds()).map(id => 
        deleteMethod(id)
      );
      
      // Execute all delete requests in parallel
      forkJoin(deleteRequests).subscribe({
        next: () => {
          // Frontend Update
          this.mails.update(currentMails =>
            currentMails.filter(m => !this.selectedIds().has(m.id))
          );
          this.selectedIds.set(new Set());
          this.refresh();
        },
        error: (error) => {
          console.error('Error deleting emails:', error);
          alert('Failed to delete emails. Please try again.');
          this.refresh();
        }
      });
    }
  }

  //Signal to store custom folders
  userFolders = signal<string[]>([]);

  //Load folders (Simulated)
  loadUserFolders() {
    const email = this.currentUser()?.email;
    if (!email) return;

    // Load folders from backend
    this.mailService.getUserFolders(email).subscribe({
      next: (folders) => this.userFolders.set(folders || []),
      error: (err) => {
        console.error('Error loading folders:', err);
        this.userFolders.set([]);
      }
    });
  }

  //Create new folder
  addUserFolder() {
    const name = prompt("Enter folder name:");

    if (name && name.trim()) {
      const email = this.currentUser()?.email;

      if(email) {
        this.mailService.createFolder(email, name).subscribe({
          next: () => {
            this.loadUserFolders();
            alert(`Folder "${name}" created!`);
          },
          error: (err) => {
            console.error('Error creating folder:', err);
            alert('Failed to create folder.');
          }
        });
      }
    }
  }

  //Delete folder
  deleteUserFolder(event: Event, folderName: string) {
    event.stopPropagation();

    if (confirm(`Delete "${folderName}" and all its emails?`)) {
      const email = this.currentUser()?.email;

      if(email) {
        this.mailService.deleteFolder(email, folderName).subscribe({
          next: () => {
            this.loadUserFolders();
            if(this.currentFolder() === folderName) {
              this.loadInbox();
            }
            alert(`Folder "${folderName}" deleted!`);
          },
          error: (err) => {
            console.error('Error deleting folder:', err);
            alert('Failed to delete folder.');
          }
        });
      }
    }
  }

  // Delete single mail from mail view
  deleteSingleMail(mailId: number | undefined) {
    if (!mailId) return;
    
    const currentFolder = this.currentFolder();
    const isInTrash = currentFolder === 'trash';
    
    const confirmMessage = isInTrash 
      ? 'Permanently delete this email? This cannot be undone!'
      : 'Move this email to trash?';
    
    if (confirm(confirmMessage)) {
      const deleteObservable = isInTrash
        ? this.mailService.permanentDeleteMail(mailId)
        : this.mailService.deleteMail(mailId);
      
      deleteObservable.subscribe({
        next: () => {
          this.mails.update(currentMails => currentMails.filter(m => m.id !== mailId));
          this.clearselectedMail();
          this.refresh();
        },
        error: (error) => {
          console.error('Error deleting mail:', error);
          alert('Failed to delete email. Please try again.');
        }
      });
    }
  }

  //Rename Folder
  renameUserFolder(event: Event, oldName: string) {
    event.stopPropagation();

    const newName = prompt("Enter new folder name:", oldName)
    if (newName && newName.trim() && newName !== oldName) {
      const email = this.currentUser()?.email;

      if (email) {
        this.mailService.renameFolder(email, oldName, newName).subscribe({
          next: () => {
            this.loadUserFolders();
            if(this.currentFolder() === oldName) {
              this.loadFolder(newName);
            }
            alert(`Folder renamed to "${newName}"!`);
          },
          error: (err) => {
            console.error('Error renaming folder:', err);
            alert('Failed to rename folder.');
          }
        });
      }
    }
  }

  targetFolders = computed(() => {
    const system = ['inbox', 'sent', 'drafts', 'spam', 'trash'];
    return [...system, ...this.userFolders()];
  });

  moveSelectedMails(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const folderName = selectElement.value;

    selectElement.value = '';

    if (!folderName || this.selectedIds().size === 0) return;

    const selectedMailIds = Array.from(this.selectedIds());
    const currentFolder = this.currentFolder();
    const isMovingFromTrash = currentFolder === 'trash';

    if (confirm(`Move ${selectedMailIds.length} email(s) to "${folderName}"?`)) {
      // Step 1: Call backend API to copy each selected email to the destination folder
      const moveRequests = selectedMailIds.map(mailId =>
        this.mailService.moveMailToFolder(mailId, folderName)
      );

      // Execute all move (copy) requests in parallel
      forkJoin(moveRequests).subscribe({
        next: () => {
          // Step 2: After successful copy, delete from source folder
          // If moving from trash, use permanent delete; otherwise use soft delete
          const deleteRequests = selectedMailIds.map(mailId =>
            isMovingFromTrash 
              ? this.mailService.permanentDeleteMail(mailId)
              : this.mailService.deleteMail(mailId)
          );

          // Execute all delete requests in parallel
          forkJoin(deleteRequests).subscribe({
            next: () => {
              alert(`Successfully moved ${selectedMailIds.length} email(s) to "${folderName}"`);
              
              // Remove moved emails from current view
              this.mails.update(currentMails =>
                currentMails.filter(m => !selectedMailIds.includes(m.id))
              );
              
              this.selectedIds.set(new Set());
              
              // Refresh to ensure sync with backend
              this.refresh();
            },
            error: (error) => {
              console.error('Error deleting emails from source:', error);
              alert(`Emails copied to "${folderName}" but failed to remove from current folder. Please refresh.`);
              this.refresh();
            }
          });
        },
        error: (error) => {
          console.error('Error moving emails:', error);
          alert(`Failed to move emails to "${folderName}". Please try again.`);
        }
      });
    }
  }

  // Toggle Priority Mode
  togglePriorityMode() {
    this.isPriorityMode.update(value => !value);
    this.loadPrioritySorting();
  }

  loadPrioritySorting() {
    const email = this.currentUser()?.email;
    if (email == undefined) {
      return;
    }

    // Validation: Don't send request if mails list is empty
    const currentMails = this.mails();
    if (!currentMails || currentMails.length === 0) {
      console.log('No mails to sort. Skipping priority sorting request.');
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.mailService.loadSortedMails(email, "priority", this.isPriorityMode()).subscribe({
      next: (mails) => {
        this.mails.set(mails || []);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading priority sorted mails:', error);
        this.errorMessage.set('Failed to load priority sorted emails');
        this.mails.set([]);
        this.isLoading.set(false);
      }
    });
  }

  // Load inbox mails
  loadInbox() {
    const userEmail = this.currentUser()?.email;
    if (!userEmail) return;

    this.currentFolder.set('inbox');
    this.isLoading.set(true);
    this.errorMessage.set(null);

    // [BACKEND INTERACTION: GET INBOX]
    // Request: GET /api/mail/inbox/{email}
    this.mailService.getInboxMails(userEmail).subscribe({
      next: (mails) => {
        console.log('=== LOADED MAILS ===');
        const safeMails = mails || [];
        console.log('Mail IDs:', safeMails.map(m => m.id));
        console.log('Full mails:', safeMails);
        this.mails.set(safeMails);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading inbox:', error);
        this.errorMessage.set('Failed to load inbox');
        this.mails.set([]);
        this.isLoading.set(false);
      }
    });
  }

  // Load sent mails
  loadSent() {
    const userEmail = this.currentUser()?.email;
    if (!userEmail) return;

    this.currentFolder.set('sent');
    this.isLoading.set(true);

    this.mailService.getSentMails(userEmail).subscribe({
      next: (mails) => {
        this.mails.set(mails || []);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading sent mails:', error);
        this.errorMessage.set('Failed to load sent emails');
        this.mails.set([]);
        this.isLoading.set(false);
      }
    });
  }

  // Load draft mails
  loadDrafts() {
    const userEmail = this.currentUser()?.email;
    if (!userEmail) return;

    this.currentFolder.set('drafts');
    this.isLoading.set(true);

    // [BACKEND INTERACTION: GET DRAFTS]
    // Request: GET /api/mail/drafts/{email}
    this.mailService.getDraftMails(userEmail).subscribe({
      next: (mails) => {
        this.mails.set(mails || []);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading drafts:', error);
        this.errorMessage.set('Failed to load drafts');
        this.mails.set([]);
        this.isLoading.set(false);
      }
    });
  }

  // Load trash mails
  loadTrash() {
    const userEmail = this.currentUser()?.email;
    if (!userEmail) return;

    this.currentFolder.set('trash');
    this.isLoading.set(true);

    // [BACKEND INTERACTION: GET TRASH]
    // Request: GET /api/mail/folder/{email}/trash
    this.mailService.getMailsByFolder(userEmail, 'trash').subscribe({
      next: (mails) => {
        this.mails.set(mails || []);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading trash:', error);
        this.errorMessage.set('Failed to load trash');
        this.mails.set([]);
        this.isLoading.set(false);
      }
    });
  }

  // Load spam mails
  loadSpam() {
    const userEmail = this.currentUser()?.email;
    if (!userEmail) return;

    this.currentFolder.set('spam');
    this.isLoading.set(true);

    // [BACKEND INTERACTION: GET SPAM]
    // Request: GET /api/mail/folder/{email}/spam
    this.mailService.getMailsByFolder(userEmail, 'spam').subscribe({
      next: (mails) => {
        this.mails.set(mails || []);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading spam:', error);
        this.errorMessage.set('Failed to load spam');
        this.mails.set([]);
        this.isLoading.set(false);
      }
    });
  }

  // Load mails by folder name
  loadFolder(folderName: string) {
    const userEmail = this.currentUser()?.email;
    if (!userEmail) return;

    this.currentFolder.set(folderName);
    this.isLoading.set(true);

    // [BACKEND INTERACTION: GET CUSTOM FOLDER]
    // Request: GET /api/mail/folder/{email}/{folderName}
    this.mailService.getMailsByFolder(userEmail, folderName).subscribe({
      next: (mails) => {
        this.mails.set(mails || []);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error(`Error loading ${folderName}:`, error);
        this.errorMessage.set(`Failed to load ${folderName}`);
        this.mails.set([]);
        this.isLoading.set(false);
      }
    });
  }

  // Refresh current folder
  refresh() {
    const folder = this.currentFolder();
    if (folder === 'inbox') this.loadInbox();
    else if (folder === 'sent') this.loadSent();
    else if (folder === 'drafts') this.loadDrafts();
    else if (folder === 'trash') this.loadTrash();
    else if (folder === 'spam') this.loadSpam();
    else this.loadFolder(folder);
  }

  // Attachment handling
  selectedAttachments = signal<File[]>([]);

  // Handle file selection from input
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const filesArray = Array.from(input.files);
      this.selectedAttachments.update(current => [...current, ...filesArray]);
      input.value = '';
    }
  }

  removeAttachment(index: number) {
    this.selectedAttachments.update(current => current.filter((_, i) => i !== index));
  }

  // ==================== COMPOSE AUTOCOMPLETE ====================
  // Active suggestion index for keyboard navigation
  activeSuggestionIndex = signal<number>(-1);

  // Signal to track receiver input for reactive autocomplete
  receiverInputValue = signal<string>('');

  filteredContactSuggestions = computed(() => {
    const receiverInput = this.receiverInputValue().trim().toLowerCase();
    if (!receiverInput || receiverInput.length < 2) return [];
    if (this.contacts().length === 0) return [];

    const suggestions: Array<{ name: string, email: string }> = [];
    this.contacts().forEach(contact => {
      contact.emails.forEach(email => {
        if (email.toLowerCase().includes(receiverInput) ||
          contact.name.toLowerCase().includes(receiverInput)) {
          suggestions.push({ name: contact.name, email });
        }
      });
    });
    return suggestions.slice(0, 5);
  });

  // Update receiver input signal when user types
  onReceiverInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.receiverInputValue.set(input.value);
    this.composedMail.receivers[0] = input.value;
  }

  printSuggestions() {
    console.log(this.filteredContactSuggestions);
  }

  selectContactEmail(email: string) {
    this.composedMail.receivers[0] = email;
    this.receiverInputValue.set(email); // Update signal to close dropdown
    // reset state and close dropdown by clearing index
    // and clear input for next entry
    // (if you didn't clear the input the dropdown will presist)
    this.activeSuggestionIndex.set(-1);
    this.receiverInputValue.set(''); // Clear input for next entry
  }

  // Handle keydown in the receivers input for navigating suggestions
  onReceiverKeyDown(event: KeyboardEvent) {
    const suggestions = this.filteredContactSuggestions();
    if (!suggestions || suggestions.length === 0) {
      this.activeSuggestionIndex.set(-1);
      return;
    }

    const current = this.activeSuggestionIndex();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = current < suggestions.length - 1 ? current + 1 : 0;
      this.activeSuggestionIndex.set(next);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = current > 0 ? current - 1 : suggestions.length - 1;
      this.activeSuggestionIndex.set(prev);
    } else if (event.key === 'Enter') {
      if (current >= 0 && current < suggestions.length) {
        event.preventDefault();
        this.selectContactEmail(suggestions[current].email);
      }
    } else if (event.key === 'Escape') {
      this.activeSuggestionIndex.set(-1);
    }
  }

  //compose email
  isComposing = false;
  compseToggle() {
    this.isComposing = !this.isComposing;
    // Always load contacts when opening compose (for autocomplete)
    if (this.isComposing) {
      this.loadContacts();
    }
  }

  isPrioritySelected = signal<boolean>(false)

  setPriortyMenu() {
    this.isPrioritySelected.set(!this.isPrioritySelected())
  }

  selectedPriority = signal<number>(1)

  displayPriority() {
    switch (this.selectedPriority()) {
      case 1: return "⚪"
      case 2: return "🟢"
      case 3: return "🔵"
      case 4: return "🟠"
      case 5: return "🔴"
      default: return "⚪"
    }
  }

  composedMail: ComposeEmailDTO = {
    sender: this.currentUser()?.email,
    receivers: [''],
    subject: '',
    body: '',
    priority: this.selectedPriority()
  }

  // Track editing draft ID (null = new draft, number = editing existing)
  editingDraftId = signal<number | null>(null);
  isEditingDraft = computed(() => this.editingDraftId() !== null);


  choosePriority(level: number) {
    this.selectedPriority.set(level);
    this.composedMail.priority = level;
    this.isPrioritySelected.set(false);
  }

  // Close suggestions when clicking outside the suggestions list/input
  onComposeAreaClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    // If click is not on suggestion list items, reset index
    if (!target.closest('.suggestions-list') && !target.closest('#compose-to-input')) {
      this.activeSuggestionIndex.set(-1);
    }
  }

  sendComposedMail() {
    // Parse receivers - split by comma and clean up
    const receiverInput = this.composedMail.receivers[0] || '';
    const receiverEmails = receiverInput
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0);

    if (receiverEmails.length === 0) {
      alert('Please enter at least one recipient email');
      return;
    }

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Validate all emails
    const invalidEmails = receiverEmails.filter(email => !emailRegex.test(email));

    if (invalidEmails.length > 0) {
      alert(`Invalid email address(es):\n${invalidEmails.join('\n')}\n\nPlease correct and try again.`);
      return;
    }

    // Update receivers array with validated emails
    this.composedMail.receivers = receiverEmails;

    const formData = new FormData();
    // Ensure sender is set
    if (!this.composedMail.sender) {
      this.composedMail.sender = this.currentUser()?.email;
    }

    const emailData = {
      sender: this.composedMail.sender,
      receivers: this.composedMail.receivers,
      subject: this.composedMail.subject,
      body: this.composedMail.body,
      priority: this.composedMail.priority
    };
    const emailBlob = new Blob([JSON.stringify(emailData)], { type: 'application/json' });
    formData.append('email', emailBlob);

    this.selectedAttachments().forEach((file) => {
      formData.append('attachments', file, file.name);
    });

    console.log('Sending to:', this.composedMail.receivers);
    console.log('Subject:', this.composedMail.subject);
    console.log('Priority:', this.composedMail.priority);

    if (this.composedMail.receivers.length > 0) {
      const currentDraftId = this.editingDraftId(); // Store before reset

      this.mailService.sendMailWithAttachments(formData).subscribe({
        next: res => {
          console.log(res.message);
          
          // If we were editing a draft, delete it after sending
          if (currentDraftId) {
            this.mailService.permanentDeleteMail(currentDraftId).subscribe({
              next: () => console.log('Draft deleted after sending'),
              error: (e) => console.error('Error deleting draft:', e)
            });
          }

          setTimeout(() => {
            alert(`Email sent successfully to ${this.composedMail.receivers.length} recipient(s)!`);
            this.refresh();
            this.resetComposeForm();
          }, 500);
          this.refresh();
        },
        error: e => {
          if (e.error && e.error.error) {
            console.log(`Error: ${e.error.error}`);
            alert(`Failed to send email: ${e.error.error}`);
          }
          else {
            console.log('Unknown error', e);
            alert('Failed to send email. Please try again.');
          }
        }
      });
    }

    // [BACKEND INTERACTION: SEND MAIL WITH ATTACHMENTS]
    // 1. Backend Task: Receive Multipart request, parse JSON, save files, send email.
    // 2. Request: POST /api/mail/send-with-attachments
    // 3. Body: Multipart/Form-Data
    //    Part 1 'email': JSON Blob { sender: "...", receivers: ["..."], subject: "...", body: "...", priority: 1 }
    //    Part 2 'attachments': Array of File objects (Binary)

    // FRONTEND SIMULATION
    console.log('=== Simulating Email Send ===');
    console.log('Body:', this.composedMail);
    console.log('Attachments:', this.selectedAttachments().length);
  }

  resetComposeForm() {
    this.composedMail.receivers = [];
    this.composedMail.subject = '';
    this.composedMail.body = '';
    this.composedMail.priority = 1;
    this.selectedAttachments.set([]);
    this.isComposing = false;
    this.editingDraftId.set(null); // Clear draft ID
  }

  /**
   * Save email as draft when closing compose window
   * Called when user clicks X button before sending
   */
  saveDraftAndClose() {
    const hasValidReceiver = this.composedMail.receivers.some(r => r.trim() !== '');
    const hasContent = this.composedMail.subject.trim() !== '' ||
      this.composedMail.body.trim() !== '' ||
      hasValidReceiver;

    if (!hasContent) {
      this.isComposing = false;
      this.editingDraftId.set(null);
      return;
    }

    const currentDraftId = this.editingDraftId();

    // Ensure sender is set
    if (!this.composedMail.sender) {
      this.composedMail.sender = this.currentUser()?.email;
    }

    if (currentDraftId) {
      // UPDATE existing draft
      this.mailService.updateDraft(currentDraftId, this.composedMail).subscribe({
        next: () => {
          alert('Draft updated');
          this.resetComposeForm();
          this.refresh();
        },
        error: (e) => {
          console.error('Error updating draft:', e);
          const confirmClose = confirm('Failed to update draft. Close anyway?');
          if (confirmClose) {
            this.resetComposeForm();
          }
        }
      });
    } else {
      // CREATE new draft
      this.mailService.draftEmail(this.composedMail).subscribe({
        next: (res) => {
          alert('Draft saved');
          this.resetComposeForm();
          this.refresh();
        },
        error: (e) => {
          console.error('Error saving draft:', e);
          const confirmClose = confirm('Failed to save draft. Close anyway?');
          if (confirmClose) {
            this.resetComposeForm();
          }
        }
      });
    }
  }

  //mail preview
  selectedMail = signal<MailEntity | null>(null);

  setselectedMail(mail: MailEntity | null) {
    this.selectedMail.set(mail);
    // Automatically mark as read when opening an email
    if (mail && !mail.isRead) {
      this.markAsRead(mail.id);

    }
  }

  clearselectedMail() {
    this.selectedMail.set(null)
  }

  /**
   * Download attachment by opening it in a new tab
   * @param attachment - The attachment to download
   */
  downloadAttachment(attachment: any) {
    // Use the stored filename if available, otherwise fall back to ID
    if (attachment.fileName || attachment.id) {
      // Construct download URL using the backend endpoint
      const downloadUrl = `http://localhost:8080/api/mail/attachments/id/${attachment.id}`;

      // Open in new tab - backend will handle inline display or download based on content type
      window.open(downloadUrl, '_blank');
    } else {
      alert('Attachment information not available');
    }
  }

  // Mark email as read
  markAsRead(mailId: number) {
    console.log('Attempting to mark email as read:', mailId);

    this.mailService.markAsRead(mailId).subscribe({
      next: (response) => {
        console.log('Mark as read SUCCESS:', response);
        // Update the mail in the list
        this.mails.update(currentMails =>
          currentMails.map(m => m.id === mailId ? { ...m, isRead: true } : m)
        );
        // Update selected mail if it's the one being marked
        if (this.selectedMail()?.id === mailId) {
          this.selectedMail.update(mail => mail ? { ...mail, isRead: true } : null);
        }
      },
      error: (error) => {
        console.error('ERROR marking email as read:', mailId, error);
        console.error('Error details:', JSON.stringify(error));
      }
    });
  }

  // Toggle read/unread status
  toggleReadStatus(event: Event, mail: MailEntity) {
    event.stopPropagation(); // Prevent opening the email
    const newStatus = !mail.isRead;

    if (newStatus) {
      // Mark as read
      this.mailService.markAsRead(mail.id).subscribe({
        next: () => {
          this.mails.update(currentMails =>
            currentMails.map(m => m.id === mail.id ? { ...m, isRead: true } : m)
          );
        },
        error: (error) => {
          console.error('Error marking as read:', error);
        }
      });
    } else {
      // Mark as unread
      this.mailService.markAsUnread(mail.id).subscribe({
        next: () => {
          this.mails.update(currentMails =>
            currentMails.map(m => m.id === mail.id ? { ...m, isRead: false } : m)
          );
        },
        error: (error) => {
          console.error('Error marking as unread:', error);
        }
      });
    }
  }

  //Search & Filter Logic
  searchQuery = signal<string>('');
  searchMethod = signal<string>('subject');
  isFilterMenuOpen = signal<boolean>(false);


  // Advanced filter properties
  searchFrom = signal<string>('');
  searchTo = signal<string>('');
  searchSubject = signal<string>('');
  searchWords = signal<string>('');
  dateRange = signal<string>('');
  exactDate = signal<string>('');
  searchFolder = signal<string>('all');
  hasAttachment = signal<boolean>(false);

  // General search that search all fields for the query
  generalSearch() {
    const query = this.searchQuery().trim().toLowerCase();
    const userId = this.currentUser()?.id;
    if (userId) {
      let mailFilterDto: MailFilterDTO = {
        userId: this.currentUser()?.id,
        sender: [query],
        receiver: [query],
        subject: query,
        body: query,
      }
      this.mailService.searchMails(this.searchFolder(), mailFilterDto).subscribe({
        next: (mails) => {
          const mappedMails = mails.map((m: any) => ({
            id: m.id || m.mailId,
            sender: m.sender,
            receiver: m.receiver,
            body: m.body,
            subject: m.subject,
            timestamp: m.timestamp,
            priority: m.priority,
            folderName: m.folderName,
            isRead: m.isRead ?? m.read,
            attachments: m.attachments
          }));
          this.mails.set(mappedMails);
          this.isLoading.set(false);
          this.currentFolder.set('search');
        },
        error: (error) => {
          console.error('Error filtering mails:', error);
          this.isLoading.set(false);
        }
      })
    }
    else {
      this.isLoading.set(false);
    }

  }
  isRead = signal<boolean | null>(null);

  onSearch() {
    // Parse input fields
    const from = this.searchFrom().split(',').map(e => e.trim()).filter(e => e.length > 0);
    const to = this.searchTo().split(',').map(e => e.trim()).filter(e => e.length > 0);
    const subject = this.searchSubject();
    const words = this.searchWords();
    const dateRange = this.dateRange();
    const exactDate = this.exactDate();
    const hasAttachments = this.hasAttachment();
    const isRead = this.isRead();
    const folder = this.searchFolder();

    this.isLoading.set(true);

    // Date calculation - only process if user specified date filters
    let beforeDate: string | undefined = undefined;
    let afterDate: string | undefined = undefined;
    let exactDateValue: string | undefined = undefined;

    if (exactDate) {
      // User specified an exact date
      exactDateValue = new Date(exactDate).toISOString().slice(0, 19);
    } else if (dateRange) {
      // User specified a date range
      let dateBefore = new Date();
      let dateAfter = new Date();
      let adder = 0;

      if (dateRange === "1 day") adder = 1;
      else if (dateRange === "3 days") adder = 3;
      else if (dateRange === "1 week") adder = 7;
      else if (dateRange === "2 weeks") adder = 14;
      else if (dateRange === "1 month") adder = 1;
      else if (dateRange === "2 months") adder = 2;
      else if (dateRange === "6 months") adder = 6;
      else if (dateRange === "1 year") adder = 1;

      if (dateRange.includes("month")) {
        dateBefore.setMonth(dateBefore.getMonth() - adder);
      } else if (dateRange.includes("year")) {
        dateBefore.setFullYear(dateBefore.getFullYear() - adder);
      } else if (adder > 0) {
        dateBefore.setDate(dateBefore.getDate() - adder);
      }

      // Only set dates if a valid range was specified
      if (adder > 0) {
        beforeDate = dateBefore.toISOString().slice(0, 19);
        afterDate = dateAfter.toISOString().slice(0, 19);
      }
    }

    const filter: MailFilterDTO = {
      userId: this.currentUser()?.id,
      sender: from.length > 0 ? from : undefined,
      receiver: to.length > 0 ? to : undefined,
      subject: subject || undefined,
      body: words || undefined,
      exactDate: exactDateValue,
      afterDate: afterDate,
      beforeDate: beforeDate,
      isRead: isRead !== null ? isRead : undefined,
    };

    // --- Console Logs for Testing ---
    console.log('--- Filter Object Test ---');
    console.log('Filter:', filter);

    // Call the backend filter API
    const userId = this.currentUser()?.id;
    if (userId) {
      this.mailService.filterMailsAnd(userId, filter).subscribe({
        next: (mails) => {
          // Map backend response to frontend Mail interface
          const mappedMails = mails.map((m: any) => ({
            id: m.id || m.mailId,
            sender: m.sender,
            receiver: m.receiver,
            body: m.body,
            subject: m.subject,
            timestamp: m.timestamp,
            priority: m.priority,
            folderName: m.folderName,
            isRead: m.isRead ?? m.read,
            attachments: m.attachments
          }));
          this.mails.set(mappedMails);
          this.isLoading.set(false);
          this.currentFolder.set('search');
        },
        error: (error) => {
          console.error('Error filtering mails:', error);
          this.isLoading.set(false);
        }
      });
    } else {
      this.isLoading.set(false);
    }
  }

  toggleFilterMenu() {
    this.isFilterMenuOpen.update(v => !v);
  }

  // ==================== CONTACTS MANAGEMENT ====================

  contacts = signal<Contact[]>([]);
  isContactsModalOpen = signal<boolean>(false);
  editingContact = signal<Contact | null>(null);
  contactSearchQuery = signal<string>('');
  ascendingSorting = signal<boolean>(false);

  contactFormName = signal<string>('');
  contactFormEmails = signal<string>('');

  // Load contacts
  loadContacts() {
    const userEmail = this.currentUser()?.email;

    // [BACKEND INTERACTION: GET CONTACTS]
    // Request: GET /api/contacts?userEmail=...
    // Response: List of Contact objects

    if (userEmail) {
      this.mailService.getContacts(userEmail, this.ascendingSorting()).subscribe({
        next: contacts => {
          this.contacts.set(contacts);
          console.log("CONTACTS ARE RETRIEVED!!");
          console.log(contacts)
        },
        error: err => console.log("ERROR!!: " + err)
      });
    }
  }

  sortContacts() {
    this.ascendingSorting.set(!this.ascendingSorting())

    this.loadContacts()
  }

  openContactsModal() {
    this.isContactsModalOpen.set(true);
    this.loadContacts();
  }

  closeContactsModal() {
    this.isContactsModalOpen.set(false);
    this.resetContactForm();
  }

  filteredContacts = computed(() => {
    const query = this.contactSearchQuery().toLowerCase().trim();
    if (!query) return this.contacts();
    return this.contacts().filter(contact =>
      contact.name.toLowerCase().includes(query) ||
      contact.emails.some(email => email.toLowerCase().includes(query))
    );
  });

  startEditContact(contact: Contact) {
    this.editingContact.set(contact);
    this.contactFormName.set(contact.name);
    this.contactFormEmails.set(contact.emails.join(', '));
  }

  cancelEditContact() {
    this.editingContact.set(null);
    this.resetContactForm();
  }

  resetContactForm() {
    this.contactFormName.set('');
    this.contactFormEmails.set('');
    this.editingContact.set(null);
  }

  saveContact() {
    const userEmail = this.currentUser()?.email;

    const name = this.contactFormName().trim();
    const emailsInput = this.contactFormEmails().trim();
    if (!name || !emailsInput || !userEmail) return;

    const emails = emailsInput.split(',').map(e => e.trim()).filter(e => e.length > 0);
    const editing = this.editingContact();

    if (editing) {
      // [BACKEND INTERACTION: EDIT CONTACT]
      // Request: PUT /api/contacts/{id}
      // Body: { id: 1, name: "...", emails: ["..."] }
      const updatedContact: Contact = { id: editing.id, name, emails };
      console.log(updatedContact);
      this.mailService.editContact(updatedContact).subscribe({
        next: (c) => console.log("CONTACT IS UPDATED:" + c),
        error: err => console.log("ERROR!!:" + err)
      })

      // Frontend Simulation
      this.contacts.update(c => c.map(x => x.id === editing.id ? updatedContact : x));
      this.resetContactForm();

    } else {
      // [BACKEND INTERACTION: ADD CONTACT]
      // Request: POST /api/contacts?userEmail=...
      // Body: { name: "...", emails: ["..."] }
      const newContact: Contact = { id: Date.now(), name, emails };
      this.mailService.addContact(newContact, userEmail).subscribe({
        next: (c) => console.log("CONTACT IS CREATED:" + c),
        error: err => console.log("ERROR!!:" + err)
      })

      // Frontend Simulation
      this.contacts.update(c => [...c, newContact]);
      this.resetContactForm();
    }
  }

  deleteContactById(contactId: number) {
    console.log(contactId);

    this.mailService.deleteContact(contactId).subscribe({
      next: () => console.log("SUCCESSFULLY DELETED!!"),
      error: (err) => console.log("DID NOT DELETE:" + err)
    })
    // Frontend Simulation
    this.contacts.update(c => c.filter(x => x.id !== contactId));
  }

  /**
   * Open a draft email in compose window for editing
   * @param mail - The draft email to edit
   */
  openDraftInCompose(mail: MailEntity) {
    // Track that we're editing this draft
    this.editingDraftId.set(mail.id!);

    // Populate compose form with draft data
    this.composedMail.receivers = [mail.receiver || ''];
    this.composedMail.subject = mail.subject || '';
    this.composedMail.body = mail.body || '';
    this.composedMail.priority = mail.priority || 1;

    // Handle attachments if any (empty for now)
    this.selectedAttachments.set([]);

    // Open compose window
    this.isComposing = true;
  }

  // Save as Draft
  saveDraft() {
    // Ensure sender is set
    if (!this.composedMail.sender) {
      this.composedMail.sender = this.currentUser()?.email;
    }

    const hasValidReceiver = this.composedMail.receivers.some(r => r.trim() !== '');
    const hasContent = this.composedMail.subject.trim() !== '' ||
      this.composedMail.body.trim() !== '' ||
      hasValidReceiver;

    if (!hasContent) {
      alert('Please add some content before saving draft');
      return;
    }

    const currentDraftId = this.editingDraftId();

    if (currentDraftId) {
      // UPDATE existing draft
      this.mailService.updateDraft(currentDraftId, this.composedMail).subscribe({
        next: () => {
          alert('Draft updated successfully!');
          this.refresh();
        },
        error: (e) => {
          console.error('Error updating draft:', e);
          alert('Failed to update draft');
        }
      });
    } else {
      // CREATE new draft
      this.mailService.draftEmail(this.composedMail).subscribe({
        next: (res) => {
          console.log('Draft saved:', res);
          alert('Draft saved successfully!');
          // Track the new draft ID
          if (res.draftId) {
            this.editingDraftId.set(res.draftId);
          }
          this.refresh();
        },
        error: (e) => {
          console.error('Error saving draft:', e);
          alert('Failed to save draft');
        }
      });
    }
  }

  // Cancel compose without saving
  cancelCompose() {
    const hasContent = this.composedMail.subject.trim() !== '' ||
      this.composedMail.body.trim() !== '' ||
      this.composedMail.receivers.some(r => r.trim() !== '');

    if (hasContent) {
      const confirmDiscard = confirm('Discard this message without saving?');
      if (!confirmDiscard) {
        return;
      }
    }

    // Just close and reset, don't save
    this.resetComposeForm();
  }

  trash(mail: MailEntity | null) {
    if (mail == null) {
      return
    }
    console.log("mail is:" + mail.body)
    console.log("mail is:" + mail.id)
    console.log("mail is:" + mail.subject)

    this.mailService.deleteMail(mail.id).subscribe({
      next: () => {
        console.log("Deleted Successfully!");
        this.setselectedMail(null);
      },
      error: (err: any) => console.log("Error!!: ", err)
    })
  }

  isComposeToOpen = signal<boolean>(false);

  sortMenu = signal<boolean>(false)

  sortCriteria = signal<string>('')

  sortOrder = signal<boolean>(false)

  showSortMenu() {
    if (this.currentFolder() == 'inbox') {
      this.sortMenu.set(!this.sortMenu())
    }
  }

  toggleSortOrder() {
    this.sortOrder.set(!this.sortOrder())
    this.loadSortedMails()
  }

  setSortCriteria(criteria: string) {
    this.sortCriteria.set(criteria);
    this.loadSortedMails()
  }

  loadSortedMails() {
    const email = this.currentUser()?.email;
    if (email == undefined) {
      return
    }
    this.mailService.loadSortedMails(email, this.sortCriteria(), this.sortOrder()).subscribe({
      next: (mails) => {
        this.mails.set(mails);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading inbox:', error);
        this.errorMessage.set('Failed to load inbox');
        this.isLoading.set(false);
      }
    });
  }
}
