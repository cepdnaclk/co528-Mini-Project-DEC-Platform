export interface User {
  _id: string;
  userId?: string;
  name: string;
  email: string;
  role: 'student' | 'alumni' | 'admin';
  bio?: string;
  skills?: string[];
  avatarUrl?: string;
  followers?: string[];
  following?: string[];
}

export interface Comment {
  _id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface Post {
  _id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  mediaUrls?: string[];
  likes: string[];
  comments: Comment[];
  createdAt: string;
  updatedAt?: string;
}

export interface Application {
  _id: string;
  applicantId: string;
  applicantName?: string;
  coverLetter?: string;
  cvUrl?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface Job {
  _id: string;
  title: string;
  company: string;
  description: string;
  type: 'Full-time' | 'Part-time' | 'Internship' | 'Contract';
  postedBy: string;
  postedByName?: string;
  applications?: Application[];
  createdAt: string;
}

export interface Event {
  _id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  organizer: string;
  organizerName?: string;
  attendees: string[];
  createdAt: string;
}

export interface Notification {
  _id: string;
  userId: string;
  type: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface InboxItem {
  otherUserId: string;
  otherUserName: string;
  otherUserAvatarUrl?: string;
  lastMessage: string;
  unreadCount: number;
  updatedAt: string;
}

export interface Message {
  _id: string;
  senderId: string;
  recipientId: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export interface ResearchProject {
  _id: string;
  title: string;
  description: string;
  domain: string;
  status: 'open' | 'in_progress' | 'completed';
  creatorId: string;
  creatorName: string;
  collaboratorIds: string[];
  tags: string[];
  createdAt: string;
}
