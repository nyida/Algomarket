import { getAllTraders } from '@/lib/whale/queries';
import { whaleError, whaleJson } from '@/lib/whale/api';

export async function GET() {
  try {
    return whaleJson(getAllTraders());
  } catch (e) {
    return whaleError(e);
  }
}
