export type MarketCategory =
  | 'Politics'
  | 'Crypto'
  | 'Sports'
  | 'Geopolitics'
  | 'Macroeconomics'
  | 'Science'
  | 'Entertainment'
  | 'Other';

const RULES: { category: MarketCategory; patterns: RegExp[] }[] = [
  {
    category: 'Crypto',
    patterns: [
      /\b(bitcoin|btc|ethereum|eth|crypto|solana|defi|token|blockchain|binance|coinbase)\b/i,
    ],
  },
  {
    category: 'Politics',
    patterns: [
      /\b(election|president|presidential|congress|senate|governor|primary|democrat|republican|parliament|by-election|vote|gop)\b/i,
      /\b(trump|biden|vance|harris|modi|starmer)\b/i,
    ],
  },
  {
    category: 'Geopolitics',
    patterns: [
      /\b(iran|china|taiwan|russia|ukraine|israel|gaza|nato|war|invade|strike|regime|hormuz|ceasefire|missile)\b/i,
    ],
  },
  {
    category: 'Macroeconomics',
    patterns: [
      /\b(fed|fomc|interest rate|inflation|gdp|recession|unemployment|cpi|treasury|rate cut|rate hike)\b/i,
    ],
  },
  {
    category: 'Sports',
    patterns: [
      /\b(nfl|nba|mlb|nhl|fifa|world cup|super bowl|champions league|premier league)\b/i,
      /\bvs\.?\b/i,
      /\b(spread:|o\/u|over\/under)\b/i,
      /\b(astros|tigers|lakers|yankees|argentina|algeria)\b/i,
    ],
  },
  {
    category: 'Science',
    patterns: [
      /\b(ai|openai|gpt|spacex|nasa|fusion|vaccine|fda approve)\b/i,
    ],
  },
  {
    category: 'Entertainment',
    patterns: [
      /\b(oscar|grammy|emmy|box office|album|movie|netflix|tiktok)\b/i,
    ],
  },
];

export function inferMarketCategory(title: string): MarketCategory {
  const t = title.toLowerCase();
  for (const { category, patterns } of RULES) {
    if (patterns.some((p) => p.test(t))) return category;
  }
  return 'Other';
}

export const MARKET_CATEGORIES: MarketCategory[] = [
  'Politics',
  'Crypto',
  'Sports',
  'Geopolitics',
  'Macroeconomics',
  'Science',
  'Entertainment',
  'Other',
];
