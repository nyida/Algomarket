import { getDataSourceStatuses, aggregateMacro, aggregateGoldRush } from '@/lib/api/aggregator';
import { whaleError, whaleJson } from '@/lib/whale/api';

export async function GET() {
  try {
    const sources = getDataSourceStatuses();
    const [macro, goldrush] = await Promise.all([aggregateMacro(), aggregateGoldRush()]);
    return whaleJson({
      sources,
      macro_available: macro.series.length > 0,
      goldrush_available: goldrush.markets.length > 0,
      cached_at: Date.now(),
    });
  } catch (e) {
    return whaleError(e);
  }
}
