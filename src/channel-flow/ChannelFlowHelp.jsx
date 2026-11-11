// SPDX-License-Identifier: MPL-2.0
// The "?" of Channel Flow: how to read the diagram, and how to move around it.
import { t } from "../i18n/index.js";
import { PopoverButton } from "../shared/ui/Popover.jsx";

const Arrow = ({ kind }) => (
  <svg className={`ofu-edge ofu-edge--${kind}`} width="40" height="12" aria-hidden="true">
    <path className="ofu-edge__line" d="M2,6 L30,6" />
    <path className="ofu-edge__head" d="M38,6 L28,1 L28,11Z" />
  </svg>
);

const Keys = ({ keys }) => keys.map(key => <kbd key={key} className="ofu-kbd">{key}</kbd>);

export function ChannelFlowHelp() {
  const gestures = [
    ["trackpadMove", []], ["pinch", []], ["wheel", []], ["drag", []],
    ["arrows", ["←", "→", "↑", "↓"]], ["zoomKeys", ["+", "−"]], ["fitKey", ["0"]], ["startKey", ["1"]]
  ];
  return (
    <PopoverButton icon="help" label={t("common.help")}>
      {() => (
        <>
          <h3>{t("channelFlow.help.reading")}</h3>
          <p>{t("channelFlow.help.blocks")}</p>
          <dl className="ofu-legend">
            {["message", "wait", "reply", "off"].map(kind => (
              <Row key={kind} sample={<Arrow kind={kind} />} text={t(`channelFlow.help.arrow.${kind}`)} />
            ))}
          </dl>
          <p className="ofu-muted">{t("channelFlow.help.saved")}</p>
          <h3>{t("channelFlow.help.moving")}</h3>
          <dl className="ofu-legend ofu-legend--wide">
            {gestures.map(([key, keys]) => (
              <Row key={key} sample={keys.length ? <Keys keys={keys} /> : <span className="ofu-muted">{t(`channelFlow.help.device.${key}`)}</span>}
                text={t(`channelFlow.help.gesture.${key}`)} />
            ))}
          </dl>
          <h3>{t("channelFlow.help.clicks")}</h3>
          <p>{t("channelFlow.help.clickOpen")}</p>
          <p className="ofu-muted">{t("channelFlow.help.clickLimits")}</p>
        </>
      )}
    </PopoverButton>
  );
}

const Row = ({ sample, text }) => (
  <>
    <dt>{sample}</dt>
    <dd>{text}</dd>
  </>
);
