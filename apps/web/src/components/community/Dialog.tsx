import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function CommunityDialog({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null); const titleId = useId(); const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const element = ref.current; const previous = document.activeElement;
    element?.showModal();
    const cancel = (event: Event) => { event.preventDefault(); close.current(); };
    element?.addEventListener('cancel', cancel);
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { element?.removeEventListener('cancel', cancel); element?.close(); document.body.style.overflow = overflow; if (previous instanceof HTMLElement) previous.focus(); };
  }, []);
  return <dialog ref={ref} aria-labelledby={titleId} className={`community-dialog ${wide ? 'community-dialog-wide' : ''}`} onClick={(event) => { if (event.target === ref.current) { const rect = ref.current.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}><div className="community-dialog-content"><header><h2 id={titleId}>{title}</h2><button type="button" className="community-icon" onClick={onClose} aria-label="Close dialog"><X size={20} /></button></header>{children}</div></dialog>;
}
