// SPDX-License-Identifier: MPL-2.0
// Zoom and move for the diagram, smooth with a trackpad, a mouse and the keyboard.
// The view lives outside React: a gesture only changes one CSS transform, applied
// once per animation frame, and never re-renders the diagram. The view is kept
// for the session, per channel and layout (sessionKey).
import { useEffect, useLayoutEffect, useRef } from "../../host/react.js";
import { readSession, writeSession } from "../../host/session.js";
import { fitView, panBy, startView, transformOf, zoomAround } from "./viewport.js";
import { wheelAction } from "./gestures.js";
import { keyAction } from "./keyboard.js";

const ANIMATION_MS = 250;

const isView = value => value && [value.s, value.x, value.y].every(Number.isFinite);

/** Elements that keep their own pointer behaviour: dragging starts elsewhere. */
const isControl = target => !!target.closest?.("button, a, input, select, textarea");

/**
 * @param {{ scene: { width: number, height: number, anchor: any }, sessionKey: string }} options
 */
export function useViewport({ scene, sessionKey }) {
  const viewportRef = useRef(null);
  const stageRef = useRef(null);
  const zoomRef = useRef(null);
  const view = useRef({ s: 1, x: 0, y: 0 });
  const frame = useRef(0);
  const saveTimer = useRef(0);
  // Latest values for the listeners, which are installed once.
  const latest = useRef({ scene, sessionKey });
  latest.current = { scene, sessionKey };

  function render() {
    frame.current = 0;
    if (stageRef.current) stageRef.current.style.transform = transformOf(view.current);
    if (zoomRef.current) zoomRef.current.textContent = `${Math.round(view.current.s * 100)}%`;
  }

  function show(next, { animate = false } = {}) {
    view.current = next;
    const stage = stageRef.current;
    if (animate && stage) {
      stage.classList.add("ofu-flow__stage--animated");
      setTimeout(() => stage.classList.remove("ofu-flow__stage--animated"), ANIMATION_MS);
    }
    if (!frame.current) frame.current = requestAnimationFrame(render);
    clearTimeout(saveTimer.current);
    const key = latest.current.sessionKey;
    saveTimer.current = setTimeout(() => writeSession(key, view.current), 200);
  }

  const viewportSize = () => ({ width: viewportRef.current.clientWidth, height: viewportRef.current.clientHeight });
  const center = () => [viewportRef.current.clientWidth / 2, viewportRef.current.clientHeight / 2];

  const controls = {
    zoomIn: () => show(zoomAround(view.current, 1.25, ...center()), { animate: true }),
    zoomOut: () => show(zoomAround(view.current, 0.8, ...center()), { animate: true }),
    fit: () => show(fitView(latest.current.scene, viewportSize()), { animate: true }),
    start: () => show(startView(latest.current.scene, viewportSize(), latest.current.scene.anchor), { animate: true })
  };

  // A new channel or layout: back where the user was during this session, or at
  // the start of the flow.
  useLayoutEffect(() => {
    const saved = readSession(sessionKey, null);
    view.current = isView(saved) ? saved : startView(scene, viewportSize(), scene.anchor);
    render();
  }, [sessionKey]);

  useEffect(() => {
    const viewport = viewportRef.current;
    let drag = null;
    let space = false;
    let pinchStart = 1;

    const pointerAt = event => {
      const rect = viewport.getBoundingClientRect();
      return [event.clientX - rect.left, event.clientY - rect.top];
    };
    const onWheel = event => {
      event.preventDefault();
      const action = wheelAction(event);
      if (action.kind === "zoom") show(zoomAround(view.current, action.factor, ...pointerAt(event)));
      else show(panBy(view.current, action.dx, action.dy));
    };
    const onPointerDown = event => {
      const middle = event.button === 1;
      if (!middle && event.button !== 0) return;
      if (!middle && !space && isControl(event.target)) return;
      event.preventDefault();
      viewport.focus({ preventScroll: true });  // keys work after a click on the diagram
      drag = { x: event.clientX, y: event.clientY };
      viewport.setPointerCapture(event.pointerId);
      viewport.classList.add("ofu-flow__viewport--dragging");
    };
    const onPointerMove = event => {
      if (!drag) return;
      show(panBy(view.current, drag.x - event.clientX, drag.y - event.clientY));
      drag = { x: event.clientX, y: event.clientY };
    };
    const onPointerUp = () => {
      drag = null;
      viewport.classList.remove("ofu-flow__viewport--dragging");
    };
    const onKeyDown = event => {
      if (event.key === " " && !isControl(event.target)) {
        space = true;
        viewport.classList.add("ofu-flow__viewport--grab");
        event.preventDefault();
        return;
      }
      const action = keyAction(event);
      if (!action || isControl(event.target) && action.kind === "pan") return;
      event.preventDefault();
      if (action.kind === "pan") show(panBy(view.current, action.dx, action.dy), { animate: true });
      else if (action.kind === "zoom") controls[action.factor > 1 ? "zoomIn" : "zoomOut"]();
      else controls[action.kind]();
    };
    const onKeyUp = event => {
      if (event.key !== " ") return;
      space = false;
      viewport.classList.remove("ofu-flow__viewport--grab");
    };
    // Safari reports a trackpad pinch with gesture events instead of ctrl + wheel.
    const onGestureStart = event => { event.preventDefault(); pinchStart = view.current.s; };
    const onGestureChange = event => {
      event.preventDefault();
      show(zoomAround(view.current, (pinchStart * event.scale) / view.current.s, ...pointerAt(event)));
    };

    const listeners = [
      ["wheel", onWheel, { passive: false }], ["pointerdown", onPointerDown], ["pointermove", onPointerMove],
      ["pointerup", onPointerUp], ["pointercancel", onPointerUp], ["keydown", onKeyDown], ["keyup", onKeyUp],
      ["gesturestart", onGestureStart], ["gesturechange", onGestureChange]
    ];
    listeners.forEach(([type, listener, options]) => viewport.addEventListener(type, listener, options));
    return () => {
      listeners.forEach(([type, listener]) => viewport.removeEventListener(type, listener));
      cancelAnimationFrame(frame.current);
      clearTimeout(saveTimer.current);
    };
  }, []);

  return { viewportRef, stageRef, zoomRef, ...controls };
}
