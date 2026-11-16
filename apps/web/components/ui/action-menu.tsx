'use client';

import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { MoreHorizontal, type LucideIcon } from 'lucide-react';

type ActionMenuItem = {
  label: string;
  icon?: LucideIcon;
  href?: string;
  onSelect?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  separatorBefore?: boolean;
};

export function ActionMenu({
  label,
  items,
  className = 'row-action',
  triggerContent,
}: {
  label: string;
  items: ActionMenuItem[];
  className?: string;
  triggerContent?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const positionMenu = () => {
    const bounds = triggerRef.current?.getBoundingClientRect();
    if (!bounds) return;

    const menuHeight = menuRef.current?.offsetHeight ?? Math.min(items.length * 42 + 16, 280);
    const menuWidth = menuRef.current?.offsetWidth ?? 228;
    const top = bounds.bottom + menuHeight + 8 > window.innerHeight
      ? Math.max(8, bounds.top - menuHeight - 6)
      : bounds.bottom + 6;
    const left = Math.min(Math.max(8, bounds.right - menuWidth), window.innerWidth - menuWidth - 8);
    setPosition({ top, left });
  };

  const closeMenu = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const toggleMenu = () => {
    if (open) {
      closeMenu();
      return;
    }
    positionMenu();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) closeMenu();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu(true);
        return;
      }

      const menuItems = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? []);
      if (!menuItems.length) return;
      const activeIndex = menuItems.indexOf(document.activeElement as HTMLElement);
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        const nextIndex = event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? menuItems.length - 1
            : (activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + menuItems.length) % menuItems.length;
        menuItems[nextIndex]?.focus();
      }
    };
    const handleScroll = () => closeMenu();
    const frame = requestAnimationFrame(() => {
      positionMenu();
      menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus();
    });

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleScroll);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleScroll);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);

  const selectItem = (item: ActionMenuItem) => {
    closeMenu();
    item.onSelect?.();
  };

  return <>
    <button
      ref={triggerRef}
      type="button"
      className={className}
      aria-label={label}
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={toggleMenu}
    >
      {triggerContent ?? <MoreHorizontal size={17} aria-hidden="true" />}
    </button>
    {open && typeof document !== 'undefined' && createPortal(
      <div ref={menuRef} className="action-menu-popover" role="menu" style={{ top: position.top, left: position.left }} aria-label={label}>
        {items.map((item) => {
          const Icon = item.icon;
          const classNames = `action-menu-item${item.destructive ? ' action-menu-item-destructive' : ''}`;
          const content = <>{Icon && <Icon size={16} aria-hidden="true"/>}<span>{item.label}</span></>;
          const key = `${item.label}-${item.href ?? ''}`;

          return <Fragment key={key}>
            {item.separatorBefore && <div className="action-menu-separator" role="separator"/>}
            {item.href && !item.disabled
              ? <Link className={classNames} href={item.href} role="menuitem" onClick={() => closeMenu()}>{content}</Link>
              : <button
                  type="button"
                  className={classNames}
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => selectItem(item)}
                >{content}</button>}
          </Fragment>;
        })}
      </div>,
      document.body,
    )}
  </>;
}
