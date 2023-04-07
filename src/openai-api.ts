import { OpenAIApi, Configuration} from 'openai';
import { Message } from './types';

export class OpenAiApiWrapper {
  private openai: OpenAIApi;

  constructor(apiKey: string, organization: string) {
    const configuration = new Configuration({
      apiKey,
      organization,
    });
    this.openai = new OpenAIApi(configuration);
  }

  public async createChatCompletion(
    model: string,
    messages: Message[],
    temperature: number
  ): Promise<string> {
    try {
      const chatCompletionMessages = messages.map((message) => ({
        role: message.role,
        content: message.content,
      }));

      const response = await this.openai.createChatCompletion({
        model,
        messages: chatCompletionMessages,
        temperature,
      });
      return response.data.choices[0]?.message?.content ?? '';
    } catch (error) {
      throw new Error('Error creating chat completion: ' + error.message);
    }
  }

}
export { OpenAIApi };
