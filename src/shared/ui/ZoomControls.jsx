// SPDX-License-Identifier: MPL-2.0
// Zoom toolbar controls (− / live level / + / Fit / 100%) shared across diagram views.
import { t } from "../../i18n/index.js";
import { Button } from "./Button.jsx";

/** @param {{ viewport: { zoomOut: () => void, zoomIn: () => void, fit: () => void, start: () => void, zoomRef: any } }} props */
export function ZoomControls({ viewport }) {
  return (
    <span className="ofu-zoom" role="group" aria-label={t("channelFlow.zoom")}>
      <Button label={t("channelFlow.zoomOut")} aria-label={t("channelFlow.zoomOut")} onClick={viewport.zoomOut}>−</Button>
      <output ref={viewport.zoomRef} className="ofu-zoom__level" aria-live="polite">100%</output>
      <Button label={t("channelFlow.zoomIn")} aria-label={t("channelFlow.zoomIn")} onClick={viewport.zoomIn}>+</Button>
      <Button label={t("channelFlow.fitTitle")} onClick={viewport.fit}>{t("channelFlow.fit")}</Button>
      <Button label={t("channelFlow.startTitle")} onClick={viewport.start}>100%</Button>
    </span>
  );
}
