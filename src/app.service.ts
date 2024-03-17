import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import * as TelegramBot from 'node-telegram-bot-api';
import { TelegramService } from './telegram.service';

@Injectable()
export class AppService {
  private readonly openai: any;
  private readonly assistantId: string;
  constructor(
    private readonly configService: ConfigService,
    private readonly telegramService: TelegramService,
  ) {
    this.openai = new OpenAI({
      apiKey: configService.get<string>('OPENAI_API_KEY'),
    });
    this.telegramService.listenForMessages(
      this.handleIncomingMessage.bind(this),
    );
    this.assistantId = this.configService.get<string>('ASSISTANT_ID');
  }

  private _processOpenAIRes(res: any) {
    return '';
  }

  async chatCompletions(message: string): Promise<{ message: string }> {
    const chat = await this.openai.chat.completions.create({
      messages: [{ role: 'user', content: message }],
      model: 'gpt-3.5-turbo',
    });
    const { choices } = chat;
    return { message: choices[0].message.content };
  }

  // async assistantSupport(message: string): Promise<{ message: string }> {
  //   const params = {
  //     engine: this.assistantId, // Specify the engine (assistant) you want to use
  //     prompt: message,
  //   };
  //   const res = await this.openai.beta.threads.cre
  //   return { message: res.data.choices[0].text.trim() };
  // }

  async handleIncomingMessage(message: TelegramBot.Message) {
    // Handle incoming message here
    console.log(message.text);
    const reply = await this.chatCompletions(message.text);
    this.telegramService.sendMessage(message.chat.id, reply.message);
  }
}
