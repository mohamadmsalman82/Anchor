import { BackgroundController } from './controller';

const controller = new BackgroundController();

controller.initialize().catch((error) => {
  console.error('[BackgroundController] Failed to initialize', error);
});

