export type ProfileTrader = {
  wallet: string;
  display_name: string;
  alltime_profit: number;
  rank: number;
};

export type ProfilePosition = {
  market_title: string;
  outcome: string;
  shares: number;
  avg_price: number;
  current_price: number;
  usd_value: number;
  platform: string;
  unrealized_pnl: number;
};

export type ProfileStats = {
  display_name: string;
  alltime_profit: number;
  rank: number;
  position_count: number;
  total_position_value: number;
  total_unrealized_pnl: number;
  total_realized_pnl: number;
  trade_count: number;
  total_volume: number;
  win_rate: number;
  biggest_win: number;
  first_trade: number | null;
  last_trade: number | null;
  outcome_split: { outcome: string; total_usd: number; count: number }[];
  positions: ProfilePosition[];
};

export type ProfileTrade = {
  market_title: string;
  outcome: string;
  side: string;
  size: number;
  price: number;
  timestamp: number;
  realized_profit: number;
  platform: string;
  trade_kind: string;
};

export type ProfileActivity = {
  event_type: string;
  market_title: string;
  outcome: string;
  size: number;
  price: number;
  timestamp: number;
};

export type ChartPoint = { date: string; cumulative_pnl: number };
