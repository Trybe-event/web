import { setupWorker } from "msw/browser";

import { apiMockHandlers } from "./handlers";

export const apiMockWorker = setupWorker(...apiMockHandlers);
