import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
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
    @Req() req?: RawBodyRequest<Request>,
  ) {
    const rawBody = req?.rawBody
      ? req.rawBody.toString('utf8')
      : JSON.stringify(payload);
    return this.slackBotService.handleSlackEvent(payload, rawBody, signature, timestamp);
  }
}
