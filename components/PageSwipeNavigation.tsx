'use client';

import { useRef, type ReactNode, type TouchEvent } from 'react';
import { useRouter } from 'next/navigation';

type Props = { previous?: string; next?: string; children: ReactNode };

export default function PageSwipeNavigation({ previous, next, children }: Props) {
  const router = useRouter();
  const start = useRef<{ x: number; y: number; time: number } | null>(null);
  const suppressClickUntil = useRef(0);

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    start.current = null;
    if (event.touches.length !== 1 || document.querySelector('dialog[open]')) return;
    const target = event.target;
    if (target instanceof Element && target.closest(
      'button, input, select, textarea, [contenteditable="true"], [data-swipe-ignore], [aria-roledescription="carousel"], [data-subtab-swipe]'
    )) return;
    const point = event.touches[0];
    if (point.clientX < 24 || point.clientX > window.innerWidth - 24) return;
    start.current = { x: point.clientX, y: point.clientY, time: Date.now() };
  }

  function onTouchMove(event: TouchEvent<HTMLDivElement>) {
    const initial = start.current;
    if (!initial) return;
    if (event.touches.length !== 1) { start.current = null; return; }
    const dx = event.touches[0].clientX - initial.x;
    const dy = event.touches[0].clientY - initial.y;
    if (Math.abs(dy) > 12 && Math.abs(dy) >= Math.abs(dx)) start.current = null;
  }

  function onTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const initial = start.current;
    start.current = null;
    if (!initial || event.changedTouches.length !== 1 || event.touches.length !== 0) return;
    const dx = event.changedTouches[0].clientX - initial.x;
    const dy = event.changedTouches[0].clientY - initial.y;
    if (Math.abs(dx) < 64 || Math.abs(dx) <= Math.abs(dy) * 1.5 || Date.now() - initial.time > 800) return;
    const destination = dx < 0 ? next : previous;
    if (!destination) return;
    suppressClickUntil.current = Date.now() + 600;
    router.push(destination);
  }

  return <div className="w-full" style={{ touchAction: 'pan-y pinch-zoom' }}
    onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
    onTouchCancel={() => { start.current = null; }}
    onClickCapture={event => {
      if (Date.now() < suppressClickUntil.current) { event.preventDefault(); event.stopPropagation(); }
    }}>
    {children}
  </div>;
}
