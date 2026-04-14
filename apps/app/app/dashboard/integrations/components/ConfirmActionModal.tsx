'use client';

import { Modal } from '@verifactu/ui';

type ConfirmActionModalProps = {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  isWorking?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
};

export function ConfirmActionModal({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancelar',
  tone = 'danger',
  isWorking = false,
  onConfirm,
  onClose,
}: ConfirmActionModalProps) {
  const confirmClassName =
    tone === 'danger'
      ? 'rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60'
      : 'rounded-full bg-[#0b6cfb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#095edb] disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isWorking) onClose();
      }}
      className="max-w-lg"
      title={title}
      showCloseButton={!isWorking}
    >
      <div className="space-y-5 px-6 py-6">
        <p className="text-sm leading-7 text-slate-600">{description}</p>
        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isWorking}
            onClick={onClose}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={confirmClassName}
            disabled={isWorking}
            onClick={() => void onConfirm()}
          >
            {isWorking ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
