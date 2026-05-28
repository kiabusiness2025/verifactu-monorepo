/**
 * @verifactu/sdk — Official TypeScript SDK for the Isaak Platform API.
 *
 * Docs: https://verifactu.business/developers
 */

export { IsaakClient, SDK_VERSION } from './client.js';
export type { IsaakClientConfig, RequestOptions } from './client.js';

export {
  IsaakError,
  AuthenticationError,
  PermissionError,
  NotFoundError,
  ConflictError,
  ConfirmationRequiredError,
  ValidationError,
  RateLimitError,
  ServerError,
  NetworkError,
  TimeoutError,
} from './errors.js';

export {
  verifyWebhookSignature,
  timingSafeEqualHex,
} from './webhooks.js';
export type {
  VerifyWebhookOptions,
  WebhookVerifyResult,
  WebhookVerifyFailureReason,
} from './webhooks.js';

export {
  withRetry,
  computeBackoff,
  isErrorRetriable,
} from './retry.js';
export type { RetryOptions, RetryContext } from './retry.js';

export { CompaniesResource } from './resources/companies.js';
export { InvoicesResource } from './resources/invoices.js';
export { KeysResource } from './resources/keys.js';

export type {
  ApiResponse,
  PaginatedResponse,
  ApiErrorBody,
  Company,
  Invoice,
  InvoiceCustomer,
  InvoiceLine,
  InvoiceStatus,
  CreateInvoiceInput,
  ListInvoicesParams,
  IssueInvoiceInput,
  ApiKey,
  ApiKeyScope,
  CreateApiKeyInput,
  CreatedApiKey,
  WebhookEvent,
} from './types.js';
