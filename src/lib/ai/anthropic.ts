import Anthropic from '@anthropic-ai/sdk'

// Cliente de la Claude API (server-only). La key vive en ANTHROPIC_API_KEY y nunca
// se expone al cliente. Devuelve null si no está configurada, para degradar con elegancia.
export function getAnthropic(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null
  return new Anthropic({ apiKey })
}

export function hasAnthropicKey(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}
