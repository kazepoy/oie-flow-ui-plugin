// SPDX-License-Identifier: MPL-2.0
// Message counters: the four of a connector card, and the totals of a group or
// of the whole page. Colours come from the status (see tokens.css).
import { formatNumber, t } from "../i18n/index.js";
import { cx } from "../shared/ui/Button.jsx";
import { STATUSES } from "../shared/model/stats.js";

/**
 * The counters of one connector. With `onOpen` they are buttons that open the
 * connector's messages; without (no right to see messages) plain figures.
 * @param {{ stats: any, keys: string[], where: string, onOpen?: () => void }} props
 */
export function ConnectorCounters({ stats, keys, where, onOpen }) {
  return (
    <div className="ofu-counters">
      {keys.map(key => {
        const count = stats[key];
        const title = onOpen
          ? t("flows.counter.open", { where, status: t(`status.${key}`), count })
          : t("flows.counter.value", { status: t(`status.${key}`), count });
        const content = (
          <>
            <b>{formatNumber(count)}</b>
            <span>{t(`status.${key}`)}</span>
          </>
        );
        const className = cx("ofu-counter", `ofu-status-${key}`, count === 0 && "ofu-counter--zero");
        return onOpen
          ? <button key={key} type="button" className={className} title={title} onClick={onOpen}>{content}</button>
          : <span key={key} className={className} title={title}>{content}</span>;
      })}
    </div>
  );
}

/** Totals in the order of the engine's statuses. @param {{ stats: any, label?: string }} props */
export function Totals({ stats, label }) {
  return (
    <span className="ofu-totals" role="group" aria-label={label}>
      {STATUSES.map(key => (
        <span key={key} className={cx("ofu-total", `ofu-status-${key}`, stats[key] > 0 && "ofu-total--set")}
          title={t(`flows.totals.${key}`)}>
          <b>{formatNumber(stats[key] || 0)}</b> {t(`flows.totals.${key}`)}
        </span>
      ))}
    </span>
  );
}
