/** Server-only provider routing. Never return this configuration to a client. */
const OPENROUTER_MODELS: Record<string, string> = {
  "gpt-4.1-mini": "openai/gpt-4.1-mini",
  "gpt-5-mini": "openai/gpt-5-mini",
  "gpt-4o-mini": "openai/gpt-4o-mini",
  "gpt-4o": "openai/gpt-4o",
  "gemini-2.5-flash": "google/gemini-2.5-flash",
};
type ProviderEnvironment = Record<string, string | undefined>;
export function organizationAIFeatures(env: ProviderEnvironment) {
  return {
    gatefit: !!(env.OPENROUTER_API_KEY?.trim() || env.ORGANIZATION_GATEFIT_KEY),
    aiProvider: env.OPENROUTER_API_KEY?.trim() ? "openrouter" : "gatefit",
  };
}
export function organizationAIRoute(
  section: string,
  model: string,
  env: ProviderEnvironment,
) {
  const gatefit = section === "chat";
  const allowed = gatefit
    ? ["gpt-4.1-mini", "gpt-5-mini"]
    : ["gpt-4o-mini", "gpt-4o", "gemini-2.5-flash"];
  if (!allowed.includes(model)) throw new Error("MODEL_NOT_ALLOWED");
  const key = env.OPENROUTER_API_KEY?.trim();
  if (key)
    return {
      provider: "openrouter",
      url: "https://openrouter.ai/api/v1/chat/completions",
      model: OPENROUTER_MODELS[model],
      headers: {
        Authorization: "Bearer " + key,
        "HTTP-Referer": "https://playbeat.digital",
        "X-Title": "Playbeat One",
      } as Record<string, string>,
    };
  if (gatefit && !env.ORGANIZATION_GATEFIT_KEY)
    throw new Error("PROVIDER_NOT_CONFIGURED");
  return {
    provider: gatefit ? "gatefit" : "gateway",
    url: gatefit
      ? "https://gatefit.playbeat.digital/v1/chat/completions"
      : "https://gateway.playbeat.live/api/v1/chat/completions",
    model,
    headers: gatefit
      ? { Authorization: "Bearer " + env.ORGANIZATION_GATEFIT_KEY }
      : ({} as Record<string, string>),
  };
}
