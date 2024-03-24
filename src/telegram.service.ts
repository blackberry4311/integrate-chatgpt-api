import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import TelegramBot from 'node-telegram-bot-api';

@Injectable()
export class TelegramService {
  private bot: TelegramBot;

  constructor(private readonly configService: ConfigService) {
    // Initialize the Telegram Bot API with your bot token
    this.bot = new TelegramBot(
      this.configService.get<string>('TELEGRAM_BOT_TOKEN'),
      { polling: true },
    );
  }

  sendMessage(chatId: number, message: string): void {
    // Send a message to the specified chat ID
    this.bot.sendMessage(chatId, message);
  }

  listenForMessages(callback: (message: TelegramBot.Message) => void): void {
    // Listen for incoming messages
    this.bot.on('message', callback);
  }

  replyToMessage(chatId: number, messageId: number, replyText: string): void {
    // Reply to a specific message using its chat ID and message ID
    this.bot.sendMessage(chatId, replyText, { reply_to_message_id: messageId });
  }
}
