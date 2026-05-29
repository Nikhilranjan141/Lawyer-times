import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";

function getResponsiveColumnCount(width) {
  if (width < 640) return 1;
  if (width < 1024) return 2;
  return 3;
}

function splitIntoColumns(items, columnCount) {
  const safeCount = Math.max(1, columnCount);
  const columns = Array.from({ length: safeCount }, () => []);
  const totalItems = items.length;
  const baseSize = Math.floor(totalItems / safeCount);
  const remainder = totalItems % safeCount;

  let cursor = 0;

  for (let columnIndex = 0; columnIndex < safeCount; columnIndex += 1) {
    const size = baseSize + (columnIndex < remainder ? 1 : 0);
    columns[columnIndex] = items.slice(cursor, cursor + size);
    cursor += size;
  }

  return columns;
}

function useResponsiveColumnCount() {
  const [columnCount, setColumnCount] = useState(() => {
    if (typeof window === "undefined") return 3;
    return getResponsiveColumnCount(window.innerWidth);
  });

  useEffect(() => {
    function updateColumnCount() {
      setColumnCount(getResponsiveColumnCount(window.innerWidth));
    }

    updateColumnCount();
    window.addEventListener("resize", updateColumnCount);

    return () => window.removeEventListener("resize", updateColumnCount);
  }, []);

  return columnCount;
}

function MegaMenuNavItem({ label, items, itemHrefBuilder, featuredItems = [], onNavigate }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const rootRef = useRef(null);
  const closeTimerRef = useRef(null);
  const menuId = useRef(`mega-menu-${label.toLowerCase().replace(/\s+/g, "-")}`);
  const columnCount = useResponsiveColumnCount();

  const menuItems = useMemo(
    () => [
      ...featuredItems.map((item) => ({ ...item, href: item.href })),
      ...items.map((item) => ({ ...item, href: itemHrefBuilder(item) })),
    ],
    [featuredItems, itemHrefBuilder, items]
  );

  const columns = useMemo(() => splitIntoColumns(menuItems, columnCount), [menuItems, columnCount]);

  function cancelCloseTimer() {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function openMenu() {
    cancelCloseTimer();
    setOpen(true);
  }

  function closeMenu() {
    cancelCloseTimer();
    setOpen(false);
  }

  function scheduleClose() {
    cancelCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, 220);
  }

  useEffect(() => {
    return () => cancelCloseTimer();
  }, []);

  useEffect(() => {
    function updateMenuPosition() {
      if (!open || !rootRef.current || typeof window === "undefined") return;

      const viewportWidth = window.innerWidth;
      const triggerRect = rootRef.current.getBoundingClientRect();
      const safeWidth = viewportWidth < 768 ? Math.min(viewportWidth - 24, 440) : Math.min(1140, viewportWidth - 32);
      const idealLeft = triggerRect.left + triggerRect.width / 2 - safeWidth / 2;
      const clampedLeft = Math.max(16, Math.min(idealLeft, viewportWidth - safeWidth - 16));
      const leftInParent = clampedLeft - triggerRect.left;

      if (viewportWidth < 768) {
        setMenuStyle({ left: "12px", right: "12px", width: "auto", transform: "translateY(12px)" });
        return;
      }

      setMenuStyle({
        left: `${leftInParent}px`,
        width: `${safeWidth}px`,
        transform: "translateY(12px)",
      });
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);

    return () => window.removeEventListener("resize", updateMenuPosition);
  }, [open, columnCount]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        closeMenu();
      }
    }

    function handlePointerDown(event) {
      if (!open) return;
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        closeMenu();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  function closeIfFocusLeaves(event) {
    const nextTarget = event.relatedTarget;

    if (!rootRef.current) return;
    if (nextTarget && rootRef.current.contains(nextTarget)) return;

    closeMenu();
  }

  return (
    <li
      ref={rootRef}
      className="nav-mega-item"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
      onBlur={closeIfFocusLeaves}
    >
      <button
        type="button"
        className="nav-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId.current}
        onClick={() => setOpen((value) => {
          if (value) {
            closeMenu();
            return false;
          }

          openMenu();
          return true;
        })}
        onFocus={openMenu}
      >
        <span>{label}</span>
        <ChevronDown size={14} className="nav-trigger-icon" aria-hidden="true" />
      </button>

      <div
        id={menuId.current}
        className={`mega-menu-panel ${open ? "is-open" : ""}`}
        role="menu"
        aria-hidden={!open}
        style={menuStyle}
        onMouseEnter={openMenu}
        onMouseLeave={scheduleClose}
      >
        <div className="mega-menu-header">
          <p className="mega-menu-eyebrow">Indian Judiciary</p>
        </div>

        <div
          className="mega-menu-columns"
          style={{ "--menu-columns": columnCount }}
        >
          {columns.map((column, columnIndex) => (
            <ul key={`column-${columnIndex}`} className="mega-menu-column" aria-label={`${label} column ${columnIndex + 1}`}>
              {column.map((item) => (
                <li key={item.slug}>
                  <Link
                    to={item.href}
                    className={`mega-menu-link ${item.isFeatured ? "mega-menu-link--featured" : ""}`}
                    onClick={() => {
                      setOpen(false);
                      if (onNavigate) onNavigate();
                    }}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </li>
  );
}

export default MegaMenuNavItem;
