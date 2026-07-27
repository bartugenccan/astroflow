export interface ChatReply {
  reply: string;
  takeaway?: string;
  why?: string;
}

export interface ChatMessageDto {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  takeaway?: string;
  why?: string;
  createdAt: string;
}
