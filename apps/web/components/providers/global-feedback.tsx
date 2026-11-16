'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, CircleAlert, Info, X } from 'lucide-react';

type AlertKind = 'success' | 'error' | 'info';
type AlertMessage = { id: number; message: string; kind: AlertKind; duration: number };
type ConfirmOptions = { title: string; message: string; confirmLabel?: string; cancelLabel?: string; destructive?: boolean };
type FeedbackContextValue = {
  showAlert: (message: string, kind?: AlertKind, duration?: number) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function useGlobalFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('useGlobalFeedback must be used within GlobalFeedbackProvider.');
  return context;
}

export function GlobalFeedbackProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<AlertMessage[]>([]);
  const [pausedAlerts, setPausedAlerts] = useState<Set<number>>(() => new Set());
  const [remainingTimes, setRemainingTimes] = useState<Record<number, number>>({});
  const [confirmation, setConfirmation] = useState<{ options: ConfirmOptions; resolve: (result: boolean) => void } | null>(null);
  const confirmationRef = useRef<typeof confirmation>(null);
  const alertTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const alertDeadlines = useRef(new Map<number, number>());
  const nextAlertId = useRef(0);

  useEffect(() => {
    confirmationRef.current = confirmation;
  }, [confirmation]);

  const dismissAlert = useCallback((id: number) => {
    const timer = alertTimers.current.get(id);
    if (timer) clearTimeout(timer);
    alertTimers.current.delete(id);
    alertDeadlines.current.delete(id);
    setPausedAlerts((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    setRemainingTimes((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setAlerts((current) => current.filter((item) => item.id !== id));
  }, []);

  const showAlert = useCallback((message: string, kind: AlertKind = 'info', duration = 5000) => {
    const id = ++nextAlertId.current;
    const safeDuration = Number.isFinite(duration) ? Math.max(0, duration) : 5000;
    setAlerts((current) => [...current, { id, message, kind, duration: safeDuration }]);
    if (safeDuration > 0) {
      alertDeadlines.current.set(id, Date.now() + safeDuration);
      alertTimers.current.set(id, setTimeout(() => dismissAlert(id), safeDuration));
    }
  }, [dismissAlert]);

  useEffect(() => {
    if (alerts.length <= 5) return;
    const removed = alerts.slice(0, alerts.length - 5);
    removed.forEach(({ id }) => {
      const timer = alertTimers.current.get(id);
      if (timer) clearTimeout(timer);
      alertTimers.current.delete(id);
      alertDeadlines.current.delete(id);
    });
    setPausedAlerts((current) => new Set([...current].filter((id) => !removed.some((alert) => alert.id === id))));
    setRemainingTimes((current) => Object.fromEntries(Object.entries(current).filter(([id]) => !removed.some((alert) => alert.id === Number(id)))));
    setAlerts((current) => current.slice(-5));
  }, [alerts]);

  useEffect(() => () => {
    alertTimers.current.forEach((timer) => clearTimeout(timer));
    alertTimers.current.clear();
    alertDeadlines.current.clear();
    confirmationRef.current?.resolve(false);
  }, []);

  const pauseAlert = (id: number) => {
    const timer = alertTimers.current.get(id);
    const deadline = alertDeadlines.current.get(id);
    if (!timer || deadline === undefined) return;
    clearTimeout(timer);
    alertTimers.current.delete(id);
    alertDeadlines.current.delete(id);
    setRemainingTimes((current) => ({ ...current, [id]: Math.max(0, deadline - Date.now()) }));
    setPausedAlerts((current) => new Set(current).add(id));
  };

  const resumeAlert = (alert: AlertMessage) => {
    if (alert.duration <= 0 || alertTimers.current.has(alert.id)) return;
    const duration = remainingTimes[alert.id] ?? alert.duration;
    setPausedAlerts((current) => {
      const next = new Set(current);
      next.delete(alert.id);
      return next;
    });
    alertDeadlines.current.set(alert.id, Date.now() + duration);
    alertTimers.current.set(alert.id, setTimeout(() => dismissAlert(alert.id), duration));
  };

  const confirm = useCallback((options: ConfirmOptions) => {
    if (confirmationRef.current) return Promise.reject(new Error('A confirmation dialog is already open.'));
    return new Promise<boolean>((resolve) => {
      const pending = { options, resolve };
      confirmationRef.current = pending;
      setConfirmation(pending);
    });
  }, []);

  const value = useMemo(() => ({ showAlert, confirm }), [showAlert, confirm]);
  const closeConfirmation = (result: boolean) => {
    const current = confirmationRef.current;
    confirmationRef.current = null;
    current?.resolve(result);
    setConfirmation(null);
  };

  return <FeedbackContext.Provider value={value}>
    {children}
    {alerts.length > 0 && <div className="global-toast-region" aria-label="Notifications">
      {alerts.map((alert) => <div
        className={`global-alert global-alert-${alert.kind}`}
        role={alert.kind === 'error' ? 'alert' : 'status'}
        key={alert.id}
        onMouseEnter={() => pauseAlert(alert.id)}
        onMouseLeave={() => resumeAlert(alert)}
      >
        <span className="global-alert-icon" aria-hidden="true">{alert.kind === 'success' ? <Check size={20}/> : alert.kind === 'error' ? <CircleAlert size={20}/> : <Info size={20}/>}</span>
        <span className="global-alert-message">{alert.message}</span>
        <button className="global-alert-dismiss" type="button" aria-label="Dismiss notification" onClick={() => dismissAlert(alert.id)}><X size={18}/></button>
        {alert.duration > 0 && <span
          className="global-alert-progress"
          style={{ animationDuration: `${alert.duration}ms`, animationPlayState: pausedAlerts.has(alert.id) ? 'paused' : 'running' }}
          aria-hidden="true"
        />}
      </div>)}
    </div>}
    {confirmation && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeConfirmation(false); }} onKeyDown={(event) => { if (event.key === 'Escape') closeConfirmation(false); }}>
      <section className="global-confirm" role="alertdialog" aria-modal="true" aria-labelledby="global-confirm-title" aria-describedby="global-confirm-message">
        <h2 id="global-confirm-title">{confirmation.options.title}</h2>
        <p id="global-confirm-message">{confirmation.options.message}</p>
        <div className="modal-actions">
          <button className="button button-quiet" onClick={() => closeConfirmation(false)}>{confirmation.options.cancelLabel ?? 'Cancel'}</button>
          <button className={`button ${confirmation.options.destructive ? 'button-danger' : 'button-primary'}`} autoFocus onClick={() => closeConfirmation(true)}>{confirmation.options.confirmLabel ?? 'Confirm'}</button>
        </div>
      </section>
    </div>}
  </FeedbackContext.Provider>;
}
