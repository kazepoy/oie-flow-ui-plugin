// SPDX-License-Identifier: MPL-2.0
// The "?" of Flows Monitoring: how to read a row and what a click does.
import { t } from "../i18n/index.js";
import { PopoverButton } from "../shared/ui/Popover.jsx";

const Sample = ({ className }) => <span className={`ofu-sample ${className}`} aria-hidden="true" />;

export function FlowsHelp() {
  return (
    <PopoverButton icon="help" label={t("common.help")}>
      {() => (
        <>
          <h3>{t("flows.help.reading")}</h3>
          <p>{t("flows.help.row")}</p>
          <dl className="ofu-legend">
            <dt><Sample className="ofu-sample--then" /></dt><dd>{t("flows.help.then")}</dd>
            <dt><Sample className="ofu-sample--fork" /></dt><dd>{t("flows.help.parallel")}</dd>
            <dt><span className="ofu-link" aria-hidden="true">→</span></dt><dd>{t("flows.help.links")}</dd>
          </dl>
          <h3>{t("flows.help.counters")}</h3>
          <dl className="ofu-legend">
            {["RECEIVED", "FILTERED", "QUEUED", "ERROR"].map(key => (
              <FragmentRow key={key} sample={<span className={`ofu-sample ofu-sample--status ofu-status-${key}`} />}
                text={t(`flows.help.status.${key}`)} />
            ))}
          </dl>
          <h3>{t("flows.help.cards")}</h3>
          <dl className="ofu-legend">
            <dt><Sample className="ofu-sample--card-error" /></dt><dd>{t("flows.help.cardError")}</dd>
            <dt><Sample className="ofu-sample--card-queued" /></dt><dd>{t("flows.help.cardQueued")}</dd>
            <dt><Sample className="ofu-sample--card-stopped" /></dt><dd>{t("flows.help.cardStopped")}</dd>
          </dl>
          <h3>{t("flows.help.clicks")}</h3>
          <p>{t("flows.help.clickCounter")}</p>
          <p className="ofu-muted">{t("flows.help.noStatusFilter")}</p>
        </>
      )}
    </PopoverButton>
  );
}

const FragmentRow = ({ sample, text }) => (
  <>
    <dt>{sample}</dt>
    <dd>{text}</dd>
  </>
);
