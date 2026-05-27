/**
 * AI client dispatcher.
 *
 * Selects a provider implementation by AI_PROVIDER env var (default
 * 'anthropic') and re-exports its interface. Providers translate their
 * SDK-specific errors into AiClientError so route handlers can switch
 * on stable error codes.
 *
 * @typedef {{ path: string, content: string }} GeneratedFile
 * @typedef {{ files: GeneratedFile[], assistantMessage: string }} SiteResult
 * @typedef {{ role: 'user'|'assistant', text: string }} ChatTurn
 *
 * @typedef Provider
 * @property {(args: { prompt: string }) => Promise<SiteResult>} generateSite
 * @property {(args: { instruction: string, currentFiles: GeneratedFile[], conversation: ChatTurn[] }) => Promise<SiteResult>} editSite
 * @property {() => string} getModel
 */

const providers = require('./aiProviders');
const { AiClientError } = require('./aiClientError');

const PROVIDER_NAME = process.env.AI_PROVIDER || 'anthropic';
const provider = providers[PROVIDER_NAME];
if (!provider) {
  throw new Error(
    `Unknown AI_PROVIDER '${PROVIDER_NAME}'. Available: ${Object.keys(providers).join(', ')}`
  );
}

module.exports = {
  generateSite: provider.generateSite,
  editSite: provider.editSite,
  getModel: provider.getModel,
  AiClientError,
};
