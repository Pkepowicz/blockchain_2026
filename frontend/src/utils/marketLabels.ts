const KNOWN_FEEDS: Record<string, { pair: string; shortName: string }> = {
  '0x1b44f3514812d835eb1bdb0acb33d3fa3351ee43': { pair: 'BTC/USD', shortName: 'BTC' },
  '0x694aa1769357215de4fac081bf1f309adc325306': { pair: 'ETH/USD', shortName: 'ETH' },
};

export function getFeedInfo(aggregatorAddress: string) {
  const known = KNOWN_FEEDS[aggregatorAddress.toLowerCase()];
  if (known) return known;
  return { pair: 'Price feed', shortName: 'Price' };
}

export function getMarketTitle(aggregatorAddress: string): string {
  const { pair } = getFeedInfo(aggregatorAddress);
  return `${pair} price`;
}

export function getMarketQuestion(aggregatorAddress: string, strikeFormatted: string): string {
  const { pair } = getFeedInfo(aggregatorAddress);
  return `Will ${pair} be above $${strikeFormatted} when the market resolves?`;
}

export function getOutcomeLabel(isYes: boolean): string {
  return isYes ? 'Above strike' : 'Below strike';
}

export function getResolvedLabel(yesWins: boolean): string {
  return yesWins ? 'Above strike won' : 'Below strike won';
}

export function getPoolLabels() {
  return {
    above: 'Above strike pool',
    below: 'Below strike pool',
  };
}
