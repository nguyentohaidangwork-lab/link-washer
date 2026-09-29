"use client";

import { useEffect, useRef, useState } from "react";

const NET_RULES = {
  uppromote: { label: "UpPromote", configured: true },
  goaffpro: { label: "GoAffPro", configured: true },
  snowball: { label: "Snowball", configured: true },
};

const PLATFORM_OPTIONS = {
  tiktok: { label: "TikTok", url: "https://www.tiktok.com" },
  facebook: { label: "Facebook", url: "https://www.facebook.com" },
  project: { label: "Chính dự án", url: null },
  custom: { label: "Tuỳ chọn", url: null },
};

const HISTORY_KEY = "kNetworkLinkHistory";
const MAX_HISTORY_STORED = 8;
const HISTORY_COLLAPSED_COUNT = 3;

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const temp = document.createElement("textarea");
    temp.value = text;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    document.body.removeChild(temp);
  }
}

function formatDomain(link) {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return link;
  }
}

function formatRelative(ts) {
  const d = new Date(ts);
  const now = new Date();
  const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  const hhmm = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
  if (diffDays === 0) return hhmm + " hôm nay";
  if (diffDays === 1) return "Hôm qua";
  if (diffDays > 1 && diffDays < 7) return diffDays + " ngày trước";
  return d.toLocaleDateString("vi-VN");
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function updateRulePreview(key) {
  if (key === "uppromote") {
    return "Quy tắc: cần sca_ref=AFFILIATE_ID.HASH_CODE → tạo sca_ref mới + sca_rib (mã hoá link gốc).";
  }
  if (key === "goaffpro") {
    return "Quy tắc: chỉ cần link hợp lệ → nhập mã coupon + ref mới → tạo /discount/{coupon}?ref={ref}.";
  }
  if (key === "snowball") {
    return "Quy tắc: cần ?snowball=linkref → chọn nền tảng → thêm &snowball_referrer={nền tảng đã mã hoá}.";
  }
  return "";
}

export default function LinkWasher() {
  const [rawLink, setRawLink] = useState("");
  const [activeNet, setActiveNet] = useState(null);
  const [activePlatform, setActivePlatform] = useState(null);

  const [showUppromoteStep, setShowUppromoteStep] = useState(false);
  const [newAffiliateId, setNewAffiliateId] = useState("");
  const [newHashCode, setNewHashCode] = useState("");

  const [showGoaffproStep, setShowGoaffproStep] = useState(false);
  const [goaffproCoupon, setGoaffproCoupon] = useState("");
  const [goaffproRef, setGoaffproRef] = useState("");

  const [showSnowballStep, setShowSnowballStep] = useState(false);
  const [showCustomPlatform, setShowCustomPlatform] = useState(false);
  const [customPlatformUrl, setCustomPlatformUrl] = useState("");

  const [result, setResult] = useState({ visible: false, message: "", tone: "ok", link: "" });
  const [copied, setCopied] = useState(false);

  const [helpOpen, setHelpOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [copiedHistoryLink, setCopiedHistoryLink] = useState(null);

  const pendingOriginalLink = useRef("");
  const pendingBase = useRef("");
  const pendingProjectOrigin = useRef("");
  const pendingSnowballRef = useRef("");

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  function hideDynamicSteps() {
    setShowUppromoteStep(false);
    setShowGoaffproStep(false);
    setShowSnowballStep(false);
  }

  function selectNet(key) {
    setActiveNet(key);
    setResult((prev) => ({ ...prev, visible: false }));
    hideDynamicSteps();
  }

  function handleRawLinkChange(e) {
    setRawLink(e.target.value);
    setResult((prev) => ({ ...prev, visible: false }));
    hideDynamicSteps();
  }

  function addHistory(link, netLabel) {
    setHistory((prev) => {
      const items = prev.filter((item) => item.link !== link);
      items.unshift({ link, netLabel, ts: Date.now() });
      const trimmed = items.slice(0, MAX_HISTORY_STORED);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
      return trimmed;
    });
  }

  function showResult(message, tone, link, netKey) {
    setResult({ visible: true, message, tone, link });
    setCopied(false);
    if (link) {
      addHistory(link, NET_RULES[netKey].label);
    }
  }

  function washLink() {
    const raw = rawLink.trim();
    hideDynamicSteps();

    if (!raw) {
      showResult("Nhập link gốc trước đã.", "danger", "", activeNet);
      return;
    }
    if (!activeNet) {
      showResult("Chọn 1 net ở bước 2 trước đã.", "danger", "", activeNet);
      return;
    }

    let urlObj;
    try {
      urlObj = new URL(raw);
    } catch {
      showResult("Link không hợp lệ — kiểm tra lại xem có thiếu https:// không.", "danger", "", activeNet);
      return;
    }

    if (activeNet === "uppromote") {
      handleUppromoteCheck(raw, urlObj);
      return;
    }
    if (activeNet === "goaffpro") {
      handleGoaffproCheck(urlObj);
      return;
    }
    if (activeNet === "snowball") {
      handleSnowballCheck(urlObj);
      return;
    }
  }

  function handleUppromoteCheck(raw, urlObj) {
    const scaRef = urlObj.searchParams.get("sca_ref");
    const dotIndex = scaRef ? scaRef.indexOf(".") : -1;

    if (!scaRef || dotIndex <= 0 || dotIndex === scaRef.length - 1) {
      showResult(
        "Link chưa đúng định dạng sca_ref=AFFILIATE_ID.HASH_CODE — không đủ điều kiện rửa theo UpPromote.",
        "danger",
        "",
        "uppromote"
      );
      return;
    }

    pendingOriginalLink.current = raw;
    pendingBase.current = urlObj.origin + urlObj.pathname;
    setNewAffiliateId(scaRef.slice(0, dotIndex));
    setNewHashCode(scaRef.slice(dotIndex + 1));
    setShowUppromoteStep(true);
    setResult((prev) => ({ ...prev, visible: false }));
  }

  function applyUppromote() {
    const idEdited = newAffiliateId.trim();
    const hashEdited = newHashCode.trim();

    if (!idEdited || !hashEdited) {
      showResult("Điền đủ Affiliate ID mới và Hash code mới trước đã.", "danger", "", "uppromote");
      return;
    }

    const encodedOriginal = encodeURIComponent(pendingOriginalLink.current);
    const finalLink = pendingBase.current + "?sca_ref=" + idEdited + "." + hashEdited + "&sca_rib=" + encodedOriginal;
    showResult("Đã tạo link UpPromote kèm sca_rib.", "ok", finalLink, "uppromote");
  }

  function handleGoaffproCheck(urlObj) {
    const isStandardWebsite =
      (urlObj.protocol === "http:" || urlObj.protocol === "https:") && Boolean(urlObj.hostname);

    if (!isStandardWebsite) {
      showResult("Link chưa đúng định dạng website chuẩn (http/https + tên miền).", "danger", "", "goaffpro");
      return;
    }

    pendingBase.current = urlObj.origin;
    setGoaffproCoupon("");
    setGoaffproRef(urlObj.searchParams.get("ref") || "");
    setShowGoaffproStep(true);
    setResult((prev) => ({ ...prev, visible: false }));
  }

  function applyGoaffpro() {
    const coupon = goaffproCoupon.trim();
    const newRef = goaffproRef.trim();

    if (!coupon || !newRef) {
      showResult("Điền đủ mã coupon và mã ref mới trước đã.", "danger", "", "goaffpro");
      return;
    }

    const finalLink = pendingBase.current + "/discount/" + encodeURIComponent(coupon) + "?ref=" + encodeURIComponent(newRef);
    showResult("Đã tạo link GoAffPro.", "ok", finalLink, "goaffpro");
  }

  function handleSnowballCheck(urlObj) {
    const snowballRef = urlObj.searchParams.get("snowball");

    if (!snowballRef) {
      showResult(
        "Sai định dạng Snowball — link phải có dạng https://duan.com/?snowball=linkref.",
        "danger",
        "",
        "snowball"
      );
      return;
    }

    pendingSnowballRef.current = snowballRef;
    pendingBase.current = urlObj.origin + urlObj.pathname;
    pendingProjectOrigin.current = urlObj.origin;
    setActivePlatform(null);
    setShowCustomPlatform(false);
    setCustomPlatformUrl("");
    setShowSnowballStep(true);
    setResult((prev) => ({ ...prev, visible: false }));
  }

  function selectPlatform(key) {
    setActivePlatform(key);
    setShowCustomPlatform(key === "custom");
  }

  function applySnowball() {
    if (!activePlatform) {
      showResult("Chọn 1 nền tảng trước đã.", "danger", "", "snowball");
      return;
    }

    let referrerUrl;
    if (activePlatform === "project") {
      referrerUrl = pendingProjectOrigin.current;
    } else if (activePlatform === "custom") {
      const raw = customPlatformUrl.trim();
      let refUrlObj;
      try {
        refUrlObj = new URL(raw);
      } catch {
        showResult("Link nền tảng tuỳ chọn không hợp lệ — kiểm tra lại xem có thiếu https:// không.", "danger", "", "snowball");
        return;
      }
      if (refUrlObj.protocol !== "http:" && refUrlObj.protocol !== "https:") {
        showResult("Link nền tảng tuỳ chọn phải là http hoặc https.", "danger", "", "snowball");
        return;
      }
      referrerUrl = refUrlObj.toString();
    } else {
      referrerUrl = PLATFORM_OPTIONS[activePlatform].url;
    }

    const finalLink =
      pendingBase.current +
      "?snowball=" +
      encodeURIComponent(pendingSnowballRef.current) +
      "&snowball_referrer=" +
      encodeURIComponent(referrerUrl);
    showResult("Đã tạo link Snowball.", "ok", finalLink, "snowball");
  }

  async function handleCopy() {
    if (!result.link) return;
    await copyText(result.link);
    setCopied(true);
  }

  function handleCheckLink() {
    if (!result.link) return;
    window.open(result.link, "_blank", "noopener");
  }

  async function handleHistoryCopy(link) {
    await copyText(link);
    setCopiedHistoryLink(link);
    setTimeout(() => setCopiedHistoryLink((current) => (current === link ? null : current)), 1500);
  }

  const washBtnLabel = activeNet ? "Kiểm tra link →" : "Rửa link →";
  const visibleHistory = historyExpanded ? history : history.slice(0, HISTORY_COLLAPSED_COUNT);
  const noticeIcon = result.tone === "warn" ? "⚠" : result.tone === "danger" ? "✕" : "✓";

  return (
    <div className="page">
      <div className="masthead">
        <button type="button" className="help-toggle" onClick={() => setHelpOpen((v) => !v)}>
          {helpOpen ? "Đóng" : "Hướng dẫn"}
        </button>
        <div className="eyebrow">✦ K-NETWORK</div>
        <h1>Link Washer</h1>
        <p className="subtitle">
          Dán link dự án, chọn Affiliate Network
          <br />
          và nhận link đã xử lý.
        </p>
      </div>

      {helpOpen && (
        <div className="help-panel">
          Dán link dự án cung cấp, chọn net mà dự án đó thuộc về, chọn referral cần sửa và nhận link cuối cùng để triển khai.
        </div>
      )}

      <div className="term-box">
        <div className="step">
          <div className="step-head">
            <span className="step-num">01</span> Link dự án
          </div>
          <input
            type="text"
            className="mono"
            placeholder="https://vi-du.com/san-pham/abc"
            value={rawLink}
            onChange={handleRawLinkChange}
          />
        </div>

        <div className="step">
          <div className="step-head">
            <span className="step-num">02</span> Chọn Affiliate Network
          </div>
          <div className="net-row" role="group" aria-label="Chọn net affiliate">
            {Object.entries(NET_RULES).map(([key, rule]) => (
              <button
                key={key}
                type="button"
                className={"net-pill" + (activeNet === key ? " active" : "")}
                onClick={() => selectNet(key)}
              >
                {rule.label + (activeNet === key ? " ✓" : "")}
              </button>
            ))}
          </div>
          <div className="rule-comment mono">{updateRulePreview(activeNet)}</div>
        </div>

        <button type="button" className="primary-btn" onClick={washLink}>
          {washBtnLabel}
        </button>

        {showUppromoteStep && (
          <div className="step">
            <div className="step-head">
              <span className="step-num">03</span> Sửa Affiliate ID &amp; Hash code
            </div>
            <div className="field-grid">
              <label className="field-label">
                Affiliate ID mới
                <input
                  type="text"
                  className="mono"
                  value={newAffiliateId}
                  onChange={(e) => setNewAffiliateId(e.target.value)}
                />
              </label>
              <label className="field-label">
                Hash code mới
                <input
                  type="text"
                  className="mono"
                  value={newHashCode}
                  onChange={(e) => setNewHashCode(e.target.value)}
                />
              </label>
            </div>
            <p className="hint">Sửa 2 ô này để đẩy dự án — tránh để dự án nhận nhầm ref gốc của chính nó.</p>
            <button type="button" className="primary-btn" onClick={applyUppromote}>
              Tạo link cuối cùng →
            </button>
          </div>
        )}

        {showGoaffproStep && (
          <div className="step">
            <div className="step-head">
              <span className="step-num">03</span> Mã coupon &amp; ref mới
            </div>
            <div className="field-grid">
              <label className="field-label">
                Mã coupon / discount
                <input
                  type="text"
                  className="mono"
                  value={goaffproCoupon}
                  onChange={(e) => setGoaffproCoupon(e.target.value)}
                />
              </label>
              <label className="field-label">
                Mã ref mới
                <input
                  type="text"
                  className="mono"
                  value={goaffproRef}
                  onChange={(e) => setGoaffproRef(e.target.value)}
                />
              </label>
            </div>
            <p className="hint">Sửa mã ref để đánh lừa dự án — tránh để dự án nhận nhầm ref gốc của chính nó.</p>
            <button type="button" className="primary-btn" onClick={applyGoaffpro}>
              Tạo link cuối cùng →
            </button>
          </div>
        )}

        {showSnowballStep && (
          <div className="step">
            <div className="step-head">
              <span className="step-num">03</span> Chọn nền tảng
            </div>
            <div className="net-row" role="group" aria-label="Chọn nền tảng">
              {Object.entries(PLATFORM_OPTIONS).map(([key, option]) => (
                <button
                  key={key}
                  type="button"
                  className={"net-pill" + (activePlatform === key ? " active" : "")}
                  onClick={() => selectPlatform(key)}
                >
                  {option.label + (activePlatform === key ? " ✓" : "")}
                </button>
              ))}
            </div>
            {showCustomPlatform && (
              <label className="field-label">
                Link nền tảng tuỳ chọn
                <input
                  type="text"
                  className="mono"
                  placeholder="https://vi-du.com"
                  value={customPlatformUrl}
                  onChange={(e) => setCustomPlatformUrl(e.target.value)}
                />
              </label>
            )}
            <button type="button" className="primary-btn" onClick={applySnowball}>
              Tạo link cuối cùng →
            </button>
          </div>
        )}

        <div className={"result" + (result.visible ? " visible" : "")}>
          <div className={"notice" + (result.tone === "warn" ? " warn" : result.tone === "danger" ? " danger" : " ok")}>
            {noticeIcon} {result.message}
          </div>
          {result.link && (
            <>
              <input type="text" className="mono" readOnly value={result.link} />
              <div className="result-actions">
                <button type="button" className={"action-btn" + (copied ? " copied" : "")} onClick={handleCopy}>
                  {copied ? "✓ Đã sao chép" : "📋 Sao chép"}
                </button>
                <button type="button" className="action-btn" onClick={handleCheckLink}>
                  🔗 Kiểm tra link
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {history.length > 0 && (
        <div className="term-box history-box">
          <div className="history-head">
            <span className="history-title">Lịch sử gần đây</span>
            {history.length > HISTORY_COLLAPSED_COUNT && (
              <button type="button" className="text-link" onClick={() => setHistoryExpanded((v) => !v)}>
                {historyExpanded ? "Thu gọn" : "Xem tất cả"}
              </button>
            )}
          </div>
          <div className="history-list">
            {visibleHistory.map((item) => (
              <div className="history-entry" key={item.link + item.ts}>
                <div className="history-domain mono" title={item.link}>
                  {formatDomain(item.link)}
                </div>
                <div className="history-meta">
                  <span>
                    {item.netLabel} · {formatRelative(item.ts)}
                  </span>
                  <button
                    type="button"
                    className={"history-copy" + (copiedHistoryLink === item.link ? " copied" : "")}
                    onClick={() => handleHistoryCopy(item.link)}
                  >
                    {copiedHistoryLink === item.link ? "[ Đã copy ]" : "[ Copy ]"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <footer>Quy tắc rửa link cấu hình trong file — Báo ATHAN nếu như không hiểu.</footer>
    </div>
  );
}
