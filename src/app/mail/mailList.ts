import {Injectable} from '@angular/core';


@Injectable({
    providedIn: 'root'
})
export class MailList{
// dummy data (28 mails)
mailList = [
  {
    from: '0 - shewy',
    subject: 'Welcome to MansyMail',
    content: 'Hi Ahmed, welcome! Let us know if you need any help.',
    date: new Date(2024, 10, 25),
    hasAttachments: false,
    isRead: false
  },
  {
    from: '1 - hr@company.com',
    subject: 'Interview Schedule',
    content: 'Your technical interview is scheduled for next Monday at 10 AM.',
    date: new Date(2024, 10, 24),
    hasAttachments: true,
    isRead: true
  },
  {
    from: '2 - github',
    subject: 'Security alert',
    content: 'We detected a new sign-in to your GitHub account.',
    date: new Date(2024, 10, 23),
    hasAttachments: false,
    isRead: true
  },
  {
    from: '3 - medium',
    subject: 'Top JavaScript articles this week',
    content: 'Here are the top trending JavaScript articles for you.',
    date: new Date(2024, 10, 22),
    hasAttachments: false,
    isRead: false
  },
  {
    from: '4 - university@alexu.edu.eg',
    subject: 'Exam Schedule Released',
    content: 'The final exam schedule has been released. Please check the portal.',
    date: new Date(2024, 10, 21),
    hasAttachments: true,
    isRead: false
  },
  {
    from: '5 - noreply@google.com',
    subject: 'New login detected',
    content: 'A new login was detected on your Google account.',
    date: new Date(2024, 10, 20),
    hasAttachments: false,
    isRead: true
  },
  {
    from: '6 - linkedin',
    subject: 'You appeared in 7 searches',
    content: 'Your profile appeared in 7 searches this week.',
    date: new Date(2024, 10, 19),
    hasAttachments: false,
    isRead: true
  },
  {
    from: '7 - amazon',
    subject: 'Your order has shipped',
    content: 'Your order #88421 has been shipped.',
    date: new Date(2024, 10, 18),
    hasAttachments: true,
    isRead: false
  },
  {
    from: '8 - twitter',
    subject: 'New follower',
    content: 'You have a new follower on Twitter.',
    date: new Date(2024, 10, 17),
    hasAttachments: false,
    isRead: true
  },
  {
    from: '9 - facebook',
    subject: 'Security reminder',
    content: 'Turn on two-factor authentication for extra security.',
    date: new Date(2024, 10, 16),
    hasAttachments: false,
    isRead: false
  },
  {
    from: '10 - coursera',
    subject: 'New course recommendation',
    content: 'A new Angular course was recommended for you.',
    date: new Date(2024, 10, 15),
    hasAttachments: false,
    isRead: true
  },
  {
    from: '11 - netflix',
    subject: 'New shows added',
    content: 'Check out the latest shows added this week.',
    date: new Date(2024, 10, 14),
    hasAttachments: false,
    isRead: false
  },
  {
    from: '12 - paypal',
    subject: 'Receipt for your payment',
    content: 'You sent $50.00 to John Doe.',
    date: new Date(2024, 10, 13),
    hasAttachments: true,
    isRead: true
  },
  {
    from: '13 - stackoverflow',
    subject: 'Answer accepted',
    content: 'Your answer was accepted on Stack Overflow.',
    date: new Date(2024, 10, 12),
    hasAttachments: false,
    isRead: true
  },
  {
    from: '14 - discord',
    subject: 'New message',
    content: 'You received a new message in Angular Devs.',
    date: new Date(2024, 10, 11),
    hasAttachments: false,
    isRead: false
  },
  {
    from: '15 - spotify',
    subject: 'Weekly playlist',
    content: 'Your Discover Weekly is ready.',
    date: new Date(2024, 10, 10),
    hasAttachments: false,
    isRead: true
  },
  {
    from: '16 - microsoft',
    subject: 'Password changed',
    content: 'Your password was changed successfully.',
    date: new Date(2024, 10, 9),
    hasAttachments: false,
    isRead: true
  },
  {
    from: '17 - udemy',
    subject: 'Course completion certificate',
    content: 'Congrats on completing your course!',
    date: new Date(2024, 10, 8),
    hasAttachments: true,
    isRead: false
  },
  {
    from: '18 - reddit',
    subject: 'Top posts in r/webdev',
    content: 'Here are today’s top posts.',
    date: new Date(2024, 10, 7),
    hasAttachments: false,
    isRead: true
  },
  {
    from: '19 - apple',
    subject: 'Your receipt',
    content: 'Thanks for your purchase.',
    date: new Date(2024, 10, 6),
    hasAttachments: true,
    isRead: true
  },
  {
    from: '20 - bing',
    subject: 'Weekly search summary',
    content: 'Here’s what you searched this week.',
    date: new Date(2024, 10, 5),
    hasAttachments: false,
    isRead: false
  },
  {
    from: '21 - slack',
    subject: 'Workspace notification',
    content: 'You were mentioned in #general.',
    date: new Date(2024, 10, 4),
    hasAttachments: false,
    isRead: true
  },
  {
    from: '22 - zoom',
    subject: 'Meeting recording available',
    content: 'Your meeting recording is now available.',
    date: new Date(2024, 10, 3),
    hasAttachments: true,
    isRead: false
  },
  {
    from: '23 - jira',
    subject: 'Issue updated',
    content: 'TASK-421 has been updated.',
    date: new Date(2024, 10, 2),
    hasAttachments: false,
    isRead: true
  },
  {
    from: '24 - dropbox',
    subject: 'File shared with you',
    content: 'Ahmed shared a file with you.',
    date: new Date(2024, 10, 1),
    hasAttachments: true,
    isRead: false
  },
  {
    from: '25 - spotify',
    subject: 'New album release',
    content: 'Your favorite artist dropped a new album.',
    date: new Date(2024, 9, 30),
    hasAttachments: false,
    isRead: true
  },
  {
    from: '26 - google classroom',
    subject: 'New assignment',
    content: 'A new assignment was posted.',
    date: new Date(2024, 9, 29),
    hasAttachments: false,
    isRead: false
  },
  {
    from: '27 - weather',
    subject: 'Weekly forecast',
    content: 'Here’s this week’s weather forecast.',
    date: new Date(2024, 9, 28),
    hasAttachments: false,
    isRead: true
  }
];

}