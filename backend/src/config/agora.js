import env from './env.js';

export const agoraConfig = Object.freeze({
  appId: env.AGORA_APP_ID,
  appCertificate: env.AGORA_APP_CERTIFICATE,
  customerId: env.AGORA_CUSTOMER_ID,
  customerSecret: env.AGORA_CUSTOMER_SECRET,
  tokenTtlSeconds: env.AGORA_TOKEN_TTL_SECONDS,
  restBaseUrl: 'https://api.agora.io/dev/v1',
  isConfigured: Boolean(env.AGORA_APP_ID && env.AGORA_APP_CERTIFICATE),
  isRestConfigured: Boolean(env.AGORA_CUSTOMER_ID && env.AGORA_CUSTOMER_SECRET),
});

export default agoraConfig;
