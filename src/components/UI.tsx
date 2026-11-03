import {
  X,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  Film,
  ChevronRight,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
export function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand ${small ? "small" : ""}`}>
      <svg className="brand-icon" viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="18" fill="currentColor" opacity=".1" />
        <path
          d="M49.5 21.75a19 19 0 1 0 0 20.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path d="m30.5 23 15 9-15 9z" fill="currentColor" />
      </svg>
      <span>
        Cine<span className="brand-light">Cove</span>
        <small>YOUR PRIVATE CINEMA</small>
      </span>
    </span>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const prev = document.activeElement as HTMLElement;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button,input:not([type="hidden"]),select,textarea,[tabindex="0"]',
        ) || [],
      );
    (
      ref.current?.querySelector<HTMLElement>(
        'input:not([type="hidden"]),select',
      ) || focusable()[0]
    )?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
      }
      if (e.key === "Tab") {
        const els = focusable();
        const first = els[0],
          last = els.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = priorOverflow;
      prev?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <h2>{title}</h2>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
export function LoadingIndicator({ text = "Loading…" }: { text?: string }) {
  return (
    <span className="loading">
      <LoaderCircle className="spin" size={18} />
      {text}
    </span>
  );
}
export function ToastNotifications({
  items,
  remove,
}: {
  items: { id: number; text: string; error?: boolean }[];
  remove: (id: number) => void;
}) {
  return (
    <div className="toasts" aria-live="polite">
      {items.map((t) => (
        <div className={`toast ${t.error ? "error" : ""}`} key={t.id}>
          {t.error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{t.text}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => remove(t.id)}
          >
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
export function ErrorDialog({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <Modal title="Something needs your attention" onClose={onClose}>
      <div className="dialog-body">
        <AlertCircle className="accent" size={30} />
        <p>{message}</p>
        <button className="button primary" onClick={onClose}>
          Got it
        </button>
      </div>
    </Modal>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Film size={30} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function SectionHeading({
  eyebrow,
  title,
  action,
  onClick,
}: {
  eyebrow?: string;
  title: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {action && (
        <button className="text-button" onClick={onClick}>
          {action}
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
