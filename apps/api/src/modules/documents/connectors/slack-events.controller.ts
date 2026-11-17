import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { SlackEventPayload } from '@knowledge/shared';
import { SlackBotService } from './slack-bot.service';

@Controller('api/connectors/slack')
export class SlackEventsController {
  constructor(private readonly slackBotService: SlackBotService) {}

  @Post('events')
  @HttpCode(HttpStatus.OK)
  async handleSlackEvents(
    @Body() payload: SlackEventPayload,
    @Headers('x-slack-signature') signature?: string,
    @Headers('x-slack-request-timestamp') timestamp?: string,
  ) {
    const rawBody = JSON.stringify(payload);
    return this.slackBotService.handleSlackEvent(payload, rawBody, signature, timestamp);
  }
}
