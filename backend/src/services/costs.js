// Claude API list prices in USD per million tokens (claude-api skill pricing table, cached 2026-06-24).
// Cache reads bill at ~0.1x input, 5-minute cache writes at 1.25x input, Message Batches at 50% off.
const PRICES = {
  'claude-sonnet-5': { input: 2, output: 10 },
  'claude-haiku-4-5': { input: 1, output: 5 },
};

function costUsd(model, usage, { batch = false } = {}) {
  const price = PRICES[model];
  if (!price || !usage) return 0;
  const factor = batch ? 0.5 : 1;
  const dollars =
    (usage.input_tokens || 0) * price.input +
    (usage.cache_read_input_tokens || 0) * price.input * 0.1 +
    (usage.cache_creation_input_tokens || 0) * price.input * 1.25 +
    (usage.output_tokens || 0) * price.output;
  return (dollars / 1e6) * factor;
}

module.exports = { PRICES, costUsd };
