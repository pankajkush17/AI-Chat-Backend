import { BaseApiRoutes } from "../common/base.routes.js";
import { chatController } from "./chat.controller.js";
import { chatValidator } from "./chat.validator.js";

export default class ChatRoutes extends BaseApiRoutes {
  constructor() {
    super("/chat");
  }

  protected initializeRoutes(): void {
    this.router.get(
      `${this.basePath}/models`,
      chatController.getModels.bind(chatController),
    );
    this.router.post(
      `${this.basePath}/message`,
      chatValidator.middleware("sendMessage"),
      chatController.sendMessage.bind(chatController),
    );
    this.router.get(
      `${this.basePath}/:sessionId/messages`,
      chatValidator.middleware("getMessages", "params"),
      chatController.getMessages.bind(chatController),
    );
  }
}
