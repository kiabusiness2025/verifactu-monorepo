/**
 * Public surface for the outbound webhooks subsystem.
 *
 *   enqueueWebhookDelivery — call from business flows (invoice issued, etc.)
 *   dispatchPendingDeliveries — called by /api/cron/webhooks-dispatch
 *   signPayload / verifySignature — HMAC primitives (also used in tests)
 */
export { signPayload, verifySignature } from './signer';
export {
  enqueueWebhookDelivery,
  generateEventId,
  buildEventPayload,
  type EnqueueInput,
  type EnqueueResult,
} from './enqueue';
export {
  dispatchPendingDeliveries,
  backoffSeconds,
  MAX_ATTEMPTS,
  FETCH_TIMEOUT_MS,
  type DispatchOptions,
  type DispatchSummary,
} from './dispatch';
