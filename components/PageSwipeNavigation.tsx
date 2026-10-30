'use client';

import { useRef, type ReactNode, type TouchEvent } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  previous?: string;
  next?: string;
  children: ReactNode;
};

export default function PageSwipeNavigation({
  previous,
  next,
  children,
}: Props) {
  const router = useRouter();
  const start = useRef<{ x: number; y: number; time: number } | null>(null);

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    start.current = null;

    if (event.touches.length !== 1 || document.querySelector('dialog[open]')) return;

    const target = event.target;

    if (
      target instanceof Element &&
      target.closest(
        'button, input, select, textarea, [contenteditable="true"], [data-swipe-ignore]'
      )
    ) return;

    const touch = event.touches[0];

    if (touch.clientX < 24 || touch.clientX > window.innerWidth - 24) return;

    start.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  }

  function onTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const initial = start.current;
    start.current = null;

    if (!initial || event.changedTouches.length !== 1) return;

    const touch = event.changedTouches[0];
    const dx = touch.clientX - initial.x;
    const dy = touch.clientY - initial.y;

    if (
      Math.abs(dx) < 64 ||
      Math.abs(dx) <= Math.abs(dy) * 1.5 ||
      Date.now() - initial.time > 800
    ) return;

    if (dx > 0 && next) {
        router.push(next);
      } else if (dx < 0 && previous) {
        router.push(previous);
      }
  }

  return (
    <div
      className="w-full"
      style={{ touchAction: 'pan-y pinch-zoom' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => { start.current = null; }}
    >
      {children}
    </div>
  );
}