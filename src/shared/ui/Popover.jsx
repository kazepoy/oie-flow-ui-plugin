// SPDX-License-Identifier: MPL-2.0
// A panel shown under the button that opened it: help, settings, menus.
// Closes on Escape or a click outside, and gives the focus back to its button.
import { useEffect, useLayoutEffect, useRef, useState } from "../../host/react.js";
import { Button } from "./Button.jsx";
import { placeUnder } from "./place.js";

/**
 * @param {{ anchor: HTMLElement, onClose: () => void, label: string, role?: string, children: any }} props
 */
export function Popover({ anchor, onClose, label, role = "dialog", children }) {
  const panel = useRef(null);
  const [position, setPosition] = useState({ left: -9999, top: -9999 });

  useLayoutEffect(() => {
    const box = panel.current.getBoundingClientRect();
    setPosition(placeUnder(anchor.getBoundingClientRect(), box, { width: window.innerWidth, height: window.innerHeight }));
    panel.current.querySelector("button, select, input, [tabindex]")?.focus();
  }, [anchor]);

  useEffect(() => {
    const outside = event => {
      if (!panel.current?.contains(event.target) && !anchor.contains(event.target)) onClose();
    };
    const escape = event => {
      if (event.key === "Escape") { onClose(); anchor.focus(); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [anchor, onClose]);

  return (
    <div ref={panel} className="ofu-popover" role={role} aria-label={label} style={position}>
      {children}
    </div>
  );
}

/**
 * A toolbar button that opens a popover. `children` is a function so the content
 * is only built while open; it receives `close`.
 */
export function PopoverButton({ icon, label, text, popoverRole, children }) {
  const [anchor, setAnchor] = useState(null);
  const close = () => setAnchor(null);
  return (
    <>
      <Button icon={icon} label={label} aria-haspopup={popoverRole ?? "dialog"} aria-expanded={!!anchor}
        onClick={event => setAnchor(anchor ? null : event.currentTarget)}>
        {text}
      </Button>
      {anchor && (
        <Popover anchor={anchor} onClose={close} label={label} role={popoverRole}>
          {children(close)}
        </Popover>
      )}
    </>
  );
}
