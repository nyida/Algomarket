/** @deprecated Use arbMath.ts */
export {
  calculateNetROI as calculateNetArbitrage,
  type NetROIResult as ArbFeeBreakdown,
  KALSHI_TAKER_FEE,
  POLY_TAKER_FEE,
  GAS_CENTS as POLY_GAS_USD,
  formatNetROI,
  netROITooltip as formatFeeTooltip,
} from './arbMath';
