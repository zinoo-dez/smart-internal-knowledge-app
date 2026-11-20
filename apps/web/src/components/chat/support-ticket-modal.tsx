'use client';

import React, { useEffect, useRef } from 'react';
import { LifeBuoy, X } from 'lucide-react';
import { useLanguage } from '@/context/language-context';

interface SupportTicketModalProps {
  open: boolean;
  ticketTitle: string;
  ticketDescription: string;
  submittedMessage: string | null;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function SupportTicketModal({
  open,
  ticketTitle,
  ticketDescription,
  submittedMessage,
  onTitleChange,
  onDescriptionChange,
  onSubmit,
  onClose,
}: SupportTicketModalProps) {
  const { t } = useLanguage();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Mandatory light-dismiss pointer fallback for browsers lacking <dialog closedby="any">
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || typeof HTMLDialogElement === 'undefined') return;
    if ('closedBy' in HTMLDialogElement.prototype) return;

    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };

    let pressedOutside = false;
    const onDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e)) {
        dialog.close();
      }
      pressedOutside = false;
    };

    dialog.addEventListener('pointerdown', onDown);
    dialog.addEventListener('pointerup', onUp);
    return () => {
      dialog.removeEventListener('pointerdown', onDown);
      dialog.removeEventListener('pointerup', onUp);
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as Record<string, string>)}
      aria-labelledby="ticket-dialog-heading"
      onClose={() => {
        if (dialogRef.current) dialogRef.current.returnValue = '';
        onClose();
      }}
      className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-[calc(100%-2rem)] p-6 max-h-[90dvh] overflow-y-auto"
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
        <h2
          id="ticket-dialog-heading"
          className="flex items-center gap-2 font-semibold text-slate-900"
        >
          <LifeBuoy className="w-5 h-5 text-blue-600" aria-hidden="true" />
          <span>{t.createTicketTitle}</span>
        </h2>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close support ticket modal"
          className="text-slate-400 hover:text-slate-600 p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {submittedMessage ? (
        <div
          role="status"
          aria-live="polite"
          className="p-4 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium"
        >
          {submittedMessage}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="ticket-subject-input"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              {t.ticketSubject}
            </label>
            <input
              id="ticket-subject-input"
              type="text"
              required
              autoFocus
              value={ticketTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="ticket-details-input"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              {t.ticketDescription}
            </label>
            <textarea
              id="ticket-details-input"
              rows={3}
              value={ticketDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Provide extra context for our IT/HR support desk..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
            >
              {t.submit}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
