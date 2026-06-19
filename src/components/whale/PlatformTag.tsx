import { platformLabel, platformShort, tradeKindLabel } from '@/lib/whale/utils';

export function PlatformTag({
  platform,
  tradeKind,
  className = '',
}: {
  platform: string;
  tradeKind?: string;
  className?: string;
}) {
  return (
    <span className={`platform-tag ${className}`.trim()} data-platform={platform}>
      {platformLabel(platform)}
      {tradeKind && tradeKind !== 'wallet_trade' && (
        <span className="platform-tag-sub"> · {tradeKindLabel(tradeKind)}</span>
      )}
    </span>
  );
}

export function TradeKindTag({ tradeKind }: { tradeKind: string }) {
  return (
    <span className="platform-tag trade-kind-tag" data-kind={tradeKind}>
      {tradeKindLabel(tradeKind)}
    </span>
  );
}

/** Compact table row: venue pill + contract title on one horizontal line. */
export function ContractCell({
  title,
  platform,
}: {
  title: string;
  platform: string;
}) {
  return (
    <div className="contract-cell">
      <span className="venue-pill" title={platformLabel(platform)}>
        {platformShort(platform)}
      </span>
      <span className="market-title">{title}</span>
    </div>
  );
}

/** Card / panel layout: venue pill inline with title. */
export function ContractLabel({
  title,
  platform,
}: {
  title: string;
  platform?: string;
  tradeKind?: string;
}) {
  if (!platform) {
    return <div className="market-title">{title}</div>;
  }
  return <ContractCell title={title} platform={platform} />;
}
