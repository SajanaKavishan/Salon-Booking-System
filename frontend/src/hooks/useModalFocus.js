import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const getFocusableElements = (container) => (
  Array.from(container?.querySelectorAll(FOCUSABLE_SELECTOR) || [])
    .filter((element) => (
      !element.hasAttribute('disabled')
      && element.getAttribute('aria-hidden') !== 'true'
      && element.getClientRects().length > 0
    ))
);

export function useModalFocus({ isOpen, onClose, canClose = true }) {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const canCloseRef = useRef(canClose);

  useEffect(() => {
    onCloseRef.current = onClose;
    canCloseRef.current = canClose;
  }, [canClose, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const dialog = dialogRef.current;
    const bodyWasLocked = document.body.classList.contains('overflow-hidden');
    previousFocusRef.current = document.activeElement;
    document.body.classList.add('overflow-hidden');

    const focusFrame = window.requestAnimationFrame(() => {
      const firstFocusableElement = getFocusableElements(dialog)[0];
      (firstFocusableElement || dialog)?.focus({ preventScroll: true });
    });

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (canCloseRef.current) onCloseRef.current?.();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements(dialog);
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog?.focus({ preventScroll: true });
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (!dialog?.contains(activeElement) || !focusableElements.includes(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? lastElement : firstElement).focus();
      } else if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      if (!bodyWasLocked) document.body.classList.remove('overflow-hidden');

      const previousFocus = previousFocusRef.current;
      if (previousFocus?.focus && document.contains(previousFocus)) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [isOpen]);

  return dialogRef;
}
