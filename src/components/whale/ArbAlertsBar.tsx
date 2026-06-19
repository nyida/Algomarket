'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import type { ArbitrageSpread } from '@/services/types';
import {
  canNotify,
  getAlertThreshold,
  getAlertsEnabled,
  pushAlertHistory,
  requestNotificationPermission,
  sendArbNotification,
  sendTestNotification,
  setAlertThreshold,
  setAlertsEnabled,
  shouldAlert,
} from '@/services/alertService';

const POLL_MS = 30_000;

export function ArbAlertsBar({
  pairs,
}: {
  pairs: ArbitrageSpread[];
}) {
  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState(5);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const seenRef = useRef<Set<string>>(new Set());
  const seededRef = useRef(false);

  useEffect(() => {
    setEnabled(getAlertsEnabled());
    setThreshold(getAlertThreshold());
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (enabled && pairs.length > 0 && !seededRef.current) {
      seenRef.current = new Set(pairs.map((p) => p.id));
      seededRef.current = true;
    }
  }, [enabled, pairs]);

  const toggleAlerts = useCallback(async () => {
    if (!enabled) {
      const perm = await requestNotificationPermission();
      setPermission(perm);
      if (perm !== 'granted') return;
    }
    const next = !enabled;
    setEnabled(next);
    setAlertsEnabled(next);
    if (next) {
      seenRef.current = new Set(pairs.map((p) => p.id));
      seededRef.current = true;
    } else {
      seededRef.current = false;
    }
  }, [enabled, pairs]);

  const onThresholdChange = (v: number) => {
    setThreshold(v);
    setAlertThreshold(v);
  };

  useEffect(() => {
    if (!enabled || !canNotify()) return;

    for (const spread of pairs) {
      if (!shouldAlert(spread, threshold)) continue;
      if (seenRef.current.has(spread.id)) continue;
      sendArbNotification(spread);
      pushAlertHistory(spread);
      seenRef.current.add(spread.id);
    }

    const id = setInterval(() => {
      for (const spread of pairs) {
        if (!shouldAlert(spread, threshold)) continue;
        if (seenRef.current.has(spread.id)) continue;
        sendArbNotification(spread);
        pushAlertHistory(spread);
        seenRef.current.add(spread.id);
      }
    }, POLL_MS);

    return () => clearInterval(id);
  }, [enabled, pairs, threshold]);

  return (
    <div className="arb-alerts-bar surface flex flex-wrap items-center gap-3 px-3 py-2 mb-4">
      <button
        type="button"
        className={`btn btn-ghost text-xs flex items-center gap-1.5 ${enabled ? 'text-[var(--mint)]' : ''}`}
        onClick={toggleAlerts}
        title={enabled ? 'Disable arb alerts' : 'Enable desktop alerts'}
      >
        {enabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5 opacity-50" />}
        Alerts {enabled ? 'ON' : 'OFF'}
      </button>

      <label className="flex items-center gap-2 text-xs">
        <span className="opacity-50">Min profit</span>
        <input
          type="number"
          className="paper-input w-16 !py-1 !px-2 text-xs"
          min={1}
          max={100}
          step={1}
          value={threshold}
          onChange={(e) => onThresholdChange(Number(e.target.value))}
          disabled={!enabled}
        />
        <span className="opacity-50">¢</span>
      </label>

      <button
        type="button"
        className="btn btn-ghost text-xs ml-auto"
        onClick={async () => {
          const perm = await requestNotificationPermission();
          setPermission(perm);
          if (perm === 'granted') sendTestNotification();
        }}
      >
        Test notification
      </button>

      {permission === 'denied' && (
        <span className="text-[10px] opacity-50">Enable notifications in browser settings</span>
      )}
    </div>
  );
}
