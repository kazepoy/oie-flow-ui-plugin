// SPDX-License-Identifier: MPL-2.0
// The "?" of Flows Monitoring: view-specific help for Rows and Links map.
import { t } from "../i18n/index.js";
import { Icon } from "../shared/ui/Icon.jsx";
import { PopoverButton } from "../shared/ui/Popover.jsx";

const Sample = ({ className }) => <span className={`ofu-sample ${className}`} aria-hidden="true" />;

const LegendArrow = ({ back = false }) => (
  <svg className={back ? "ofu-edge ofu-links-edge ofu-links-edge--back ofu-edge--message" : "ofu-edge ofu-edge--message"}
    width="40" height="12" aria-hidden="true">
    <path className="ofu-edge__line" d="M2,6 L30,6" />
    <path className="ofu-edge__head" d="M38,6 L28,1 L28,11Z" />
  </svg>
);

const FragmentRow = ({ sample, text }) => (
  <>
    <dt>{sample}</dt>
    <dd>{text}</dd>
  </>
);

function StatusAndCardsLegend() {
  return (
    <>
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
    </>
  );
}

function RowsHelp() {
  return (
    <>
      <h3>{t("flows.help.reading")}</h3>
      <p>{t("flows.help.row")}</p>
      <dl className="ofu-legend">
        <dt><Sample className="ofu-sample--then" /></dt><dd>{t("flows.help.then")}</dd>
        <dt><Sample className="ofu-sample--fork" /></dt><dd>{t("flows.help.parallel")}</dd>
        <dt><span className="ofu-link" aria-hidden="true">→</span></dt><dd>{t("flows.help.links")}</dd>
        <dt><span className="ofu-detail" aria-hidden="true">·</span></dt><dd>{t("flows.help.details")}</dd>
      </dl>
      <StatusAndCardsLegend />
      <h3>{t("flows.help.clicks")}</h3>
      <p>{t("flows.help.clickCounter")}</p>
      <p className="ofu-muted">{t("flows.help.noStatusFilter")}</p>
    </>
  );
}

function LinksHelp() {
  return (
    <>
      <h3>{t("flows.linksGraph.help.reading")}</h3>
      <p>{t("flows.linksGraph.help.intro")}</p>
      <dl className="ofu-legend">
        <dt><LegendArrow /></dt><dd>{t("flows.linksGraph.help.forwardEdge")}</dd>
        <dt><LegendArrow back /></dt><dd>{t("flows.linksGraph.help.backEdge")}</dd>
        <dt><span className="ofu-links-edge-label ofu-sample-pill" aria-hidden="true">D1</span></dt>
        <dd>{t("flows.linksGraph.help.edgeLabel")}</dd>
        <dt className="ofu-legend__icons"><Icon name="rows" /><Icon name="flow" /></dt>
        <dd>{t("flows.linksGraph.help.cardActions")}</dd>
        <dt><span className="ofu-detail" aria-hidden="true">·</span></dt>
        <dd>{t("flows.linksGraph.help.details")}</dd>
      </dl>
      <StatusAndCardsLegend />
      <h3>{t("flows.linksGraph.help.moving")}</h3>
      <p>{t("flows.linksGraph.help.wheel")}</p>
      <p>{t("flows.linksGraph.help.drag")}</p>
      <h3>{t("flows.linksGraph.help.clicks")}</h3>
      <p>{t("flows.linksGraph.help.clickBody")}</p>
      <p className="ofu-muted">{t("flows.help.noStatusFilter")}</p>
    </>
  );
}

/** @param {{ mode?: "rows" | "links" }} [props] */
export function FlowsHelp({ mode = "rows" } = {}) {
  return (
    <PopoverButton icon="help" label={t("common.help")}>
      {() => mode === "links" ? <LinksHelp /> : <RowsHelp />}
    </PopoverButton>
  );
}
