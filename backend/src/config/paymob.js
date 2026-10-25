import env from './env.js';

export const paymobConfig = {
  baseUrl: env.PAYMOB_BASE_URL.replace(/\/$/, ''),
  apiKey: env.PAYMOB_API_KEY,
  hmacSecret: env.PAYMOB_HMAC_SECRET,
  cardIntegrationId: env.PAYMOB_CARD_INTEGRATION_ID,
  walletIntegrationId: env.PAYMOB_WALLET_INTEGRATION_ID,
  iframeId: env.PAYMOB_IFRAME_ID,
  returnUrl: env.PAYMENT_RETURN_URL,
  allowMockPayments: false,
  get isConfigured() {
    return Boolean(
      this.apiKey &&
      this.hmacSecret &&
      this.iframeId &&
      (this.cardIntegrationId || this.walletIntegrationId)
    );
  },
  isConfiguredForMethod(method = 'card') {
    const integrationId = method === 'wallet' ? this.walletIntegrationId : this.cardIntegrationId;
    return Boolean(this.apiKey && this.hmacSecret && this.iframeId && integrationId);
  },
};

export default paymobConfig;
