// SPDX-License-Identifier: MPL-2.0
// Overview map in the corner of large or zoomed-in diagrams: shows the scene in
// miniature with the visible viewport lens, and pans on click or drag.
import { useLayoutEffect } from "../host/react.js";
import { t } from "../i18n/index.js";
import { cx } from "../shared/ui/Button.jsx";
import { Icon } from "../shared/ui/Icon.jsx";
import { minimapLayout } from "./viewport/minimap.js";

/** @param {{ scene: any, viewport: any, onClose: () => void }} props */
export function Minimap({ scene, viewport, onClose }) {
  const map = minimapLayout(scene);

  // Sync the lens when mounted (e.g. re-enabled from settings) or when the scene size changes.
  useLayoutEffect(() => {
    viewport.syncMinimap();
  }, [scene.width, scene.height]);

  const pointInCanvas = event => {
    const rect = viewport.minimapCanvasRef.current.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  };

  const onPointerDown = event => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.classList.add("ofu-minimap__body--dragging");
    const [mx, my] = pointInCanvas(event);
    viewport.minimapStart(mx, my);
  };

  const onPointerMove = event => {
    const [mx, my] = pointInCanvas(event);
    viewport.minimapMove(mx, my);
  };

  const onPointerUp = event => {
    event.currentTarget.classList.remove("ofu-minimap__body--dragging");
    viewport.minimapEnd();
  };

  return (
    <aside ref={viewport.minimapRef} className="ofu-minimap" aria-label={t("channelFlow.minimap.label")}>
      <div className="ofu-minimap__head">
        <span className="ofu-minimap__title">{t("channelFlow.minimap.label")}</span>
        <button type="button" className="ofu-minimap__toggle" aria-label={t("channelFlow.minimap.hide")}
          title={t("channelFlow.minimap.hide")} onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      <div className="ofu-minimap__body" title={t("channelFlow.minimap.navigate")}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        <div ref={viewport.minimapCanvasRef} className="ofu-minimap__canvas"
          style={{ width: map.width, height: map.height }}>
          <svg className="ofu-minimap__svg" viewBox={`0 0 ${scene.width} ${scene.height}`}
            width={map.width} height={map.height} aria-hidden="true">
            {scene.bands.map(band => (
              <rect key={band.key} className={`ofu-minimap__band ofu-minimap__band--${band.key}`}
                x={band.box.x} y={band.box.y} width={band.box.width} height={band.box.height} rx={24} />
            ))}
            {scene.edges.map((edge, index) => (
              <polyline key={index} className={`ofu-minimap__edge ofu-minimap__edge--${edge.kind}`}
                points={edge.points.map(point => point.join(",")).join(" ")} />
            ))}
            <rect className="ofu-minimap__emitter"
              x={scene.emitter.x} y={scene.emitter.y} width={scene.emitter.width} height={scene.emitter.height} rx={14} />
            {scene.blocks.map(({ block, box }) => (
              <rect key={block.id}
                className={cx("ofu-minimap__block", `ofu-minimap__block--${block.kind}`, block.off && "ofu-minimap__block--off")}
                x={box.x} y={box.y} width={box.width} height={box.height} rx={18} />
            ))}
          </svg>
          <div ref={viewport.minimapLensRef} className="ofu-minimap__lens" />
        </div>
      </div>
    </aside>
  );
}
