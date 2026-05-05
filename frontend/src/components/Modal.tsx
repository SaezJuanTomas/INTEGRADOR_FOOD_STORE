interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ isOpen, title, onClose, children }: ModalProps): JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-orange-950/20 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-orange-100 bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between border-b border-orange-100 pb-2">
          <h2 className="text-lg font-semibold text-orange-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-orange-100 px-2 py-1 text-sm text-orange-900 hover:bg-orange-200"
          >
            X
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
