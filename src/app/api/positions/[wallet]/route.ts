import { getPositions } from '@/lib/whale/queries';
import { whaleError, whaleJson } from '@/lib/whale/api';

export async function GET(_req: Request, { params }: { params: { wallet: string } }) {
  try {
    return whaleJson(getPositions(params.wallet));
  } catch (e) {
    return whaleError(e);
  }
}
