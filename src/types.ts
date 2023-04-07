import { ChatCompletionRequestMessageRoleEnum } from 'openai';

export interface User {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface Message {
  from?: User;
  text?: string;
  role: ChatCompletionRequestMessageRoleEnum;
  content: string;
  // Add other properties you may need, like 'chat', 'forward_from', etc.
}

export interface Context {
  from?: User;
  message?: Message;
  // Add other properties you may need, like 'callback_query', 'inline_query', etc.
}
