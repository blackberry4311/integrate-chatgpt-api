import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import * as TelegramBot from 'node-telegram-bot-api';
import { TelegramService } from './telegram.service';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private readonly openai: any;
  private readonly assistantId: string;

  //need to store these thread IDs to db to retrieve later on
  private readonly threadIDs: Map<number, any>;

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
    this.threadIDs = new Map();
  }

  _getOrCreateThread = async (localId: number) => {
    let existed = this.threadIDs.get(localId);
    if (!existed) {
      existed = await this.openai.beta.threads.create();
      this.threadIDs.set(localId, existed);
    }
    return existed;
  };

  _appendMesToThread = async (threadId: string, message: string) => {
    await this.openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: message,
    });
  };

  _createRun = async (threadId: string) => {
    return this.openai.beta.threads.runs.create(threadId, {
      assistant_id: this.assistantId,
    });
  };

  async chatCompletions(message: string): Promise<{ message: string }> {
    const chat = await this.openai.chat.completions.create({
      messages: [{ role: 'user', content: message }],
      model: 'gpt-3.5-turbo',
    });
    const { choices } = chat;
    return { message: choices[0].message.content };
  }

  async assistantSupport(message: TelegramBot.Message): Promise<void> {
    const {
      from: { id },
      chat: { id: replyId },
      text,
    } = message;
    const currentThread = await this._getOrCreateThread(id);
    await this._appendMesToThread(currentThread.id, text);
    const myRun = await this._createRun(currentThread.id);
    const retrieveRun = async () => {
      let keepRetrievingRun;

      while (myRun.status === 'queued' || myRun.status === 'in_progress') {
        keepRetrievingRun = await this.openai.beta.threads.runs.retrieve(
          currentThread.id,
          myRun.id,
        );
        this.logger.debug(`Run status: ${keepRetrievingRun.status}`);

        if (keepRetrievingRun.status === 'completed') {
          // Step 6: Retrieve the Messages added by the Assistant to the Thread
          const allMessages = await this.openai.beta.threads.messages.list(
            currentThread.id,
          );

          this.logger.debug(
            'Assistant: ',
            allMessages.data[0].content[0].text.value,
          );
          this.telegramService.sendMessage(
            replyId,
            allMessages.data[0].content[0].text.value,
          );

          break;
        } else if (
          keepRetrievingRun.status === 'queued' ||
          keepRetrievingRun.status === 'in_progress'
        ) {
          // pass
        } else {
          this.logger.log(`Run status: ${keepRetrievingRun.status}`);
          this.telegramService.sendMessage(
            replyId,
            'Thành thật xin lỗi, tôi không thể đưa ra thông tin trợ giúp trong lúc này',
          );
          break;
        }
      }
    };
    retrieveRun();
  }

  async handleIncomingMessage(message: TelegramBot.Message) {
    // Handle incoming message here
    this.logger.debug(message.text);
    await this.assistantSupport(message);
    // this.telegramService.sendMessage(message.chat.id, reply.message);
  }
}
