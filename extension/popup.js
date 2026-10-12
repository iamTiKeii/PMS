// ISOFH Support Extension - Side Panel & Popup Controller (Manifest V3)
// Tuân thủ toàn diện đặc tả SRS v0.3: M7 Ghi nhận hỗ trợ, EXT Extension, REST API 8D

// ============================================================================
// 1. CONSTANTS & STORAGE KEYS
// ============================================================================
const STORAGE_KEYS = {
  HOST: "pms_hub_host",
  SESSION: "pms_auth_session", // { token, refreshToken, user, savedAt }
  LAST_PROJECT: "pms_last_project_id",
  LAST_DATE: "pms_last_date",
  ACTIVE_VIEW: "pms_active_view", // "view-login" | "view-dashboard" | "view-form"
  FORM_DRAFT_PREFIX: "pms_draft_", // key: pms_draft_{userId}_{projectId}_{date}
};

// ============================================================================
// 2. STORAGE ADAPTER (chrome.storage.local với fallback localStorage)
// ============================================================================
const Storage = {
  async get(key) {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.get([key], (res) => resolve(res ? res[key] : null));
      });
    }
    const val = localStorage.getItem(key);
    if (!val) return null;
    try { return JSON.parse(val); } catch { return val; }
  },

  async set(key, value) {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, resolve);
      });
    }
    localStorage.setItem(key, typeof value === "object" ? JSON.stringify(value) : String(value));
  },

  async remove(key) {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.remove([key], resolve);
      });
    }
    localStorage.removeItem(key);
  },
};

// ============================================================================
// 3. APPLICATION STATE
// ============================================================================
const appState = {
  serverUrl: "http://localhost:3000",
  token: null,
  refreshToken: null,
  user: null,
  clockSkewMs: 0, // Độ lệch giờ giữa máy chủ Hub và đồng hồ máy khách (BR-49)
  projects: [],
  selectedProjectId: "",
  selectedDate: new Date().toISOString().slice(0, 10),
  activeTickets: [],
  ticketsFilter: "mine", // "mine" | "all"
  currentTicketId: null, // null nếu đang tạo mới, có string nếu đang sửa ca
  currentTicketVersion: 1,
  formIdempotencyKey: null,
  totalIsManual: false,
  autoSaveTimer: null,
  masterData: null,
  usersList: [],
};

// Sinh UUID v4 cho Idempotency-Key
function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "ext-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
}

// ============================================================================
// 4. TOAST (SNACKBAR) SYSTEM - WAI-ARIA (role="status", aria-live="polite")
// NameThatUI Toast Specification
// ============================================================================
const toast = (() => {
  let viewport = null;

  function getViewport() {
    if (!viewport) {
      viewport = document.getElementById("toaster-viewport");
      if (!viewport) {
        viewport = document.createElement("div");
        viewport.id = "toaster-viewport";
        viewport.className = "toaster-viewport";
        viewport.setAttribute("role", "region");
        viewport.setAttribute("aria-label", "Thông báo hệ thống");
        document.body.appendChild(viewport);
      }
    }
    return viewport;
  }

  function show(message, options = {}) {
    const {
      type = "info", // "success" | "error" | "warning" | "info"
      duration = 3500,
      action = null, // { label: string, onClick: function }
    } = typeof options === "string" ? { type: options } : options;

    const vp = getViewport();
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");

    const icons = {
      success: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
      error: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
      warning: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
      info: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
    };

    let actionBtnHtml = "";
    if (action && action.label) {
      actionBtnHtml = `<button type="button" class="toast-action">${action.label}</button>`;
    }

    el.innerHTML = `
      ${icons[type] || icons.info}
      <div class="toast-content">
        <span class="toast-message">${message}</span>
        ${actionBtnHtml}
      </div>
      <button type="button" class="toast-close" aria-label="Đóng thông báo">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    `;

    let timer = null;
    let remainingTime = duration;
    let startTime = Date.now();

    function startTimer() {
      if (duration > 0) {
        startTime = Date.now();
        timer = setTimeout(dismiss, remainingTime);
      }
    }

    function pauseTimer() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
        remainingTime -= Date.now() - startTime;
        if (remainingTime < 500) remainingTime = 500;
      }
    }

    function dismiss() {
      if (timer) clearTimeout(timer);
      el.classList.add("toast-closing");
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 200);
    }

    // Tạm dừng khi rê chuột hoặc nhận keyboard focus (NameThatUI Toast specification)
    el.addEventListener("mouseenter", pauseTimer);
    el.addEventListener("mouseleave", startTimer);
    el.addEventListener("focusin", pauseTimer);
    el.addEventListener("focusout", startTimer);

    // Nút đóng
    el.querySelector(".toast-close").addEventListener("click", dismiss);

    // Nút Toast Action
    if (action && action.onClick) {
      const actBtn = el.querySelector(".toast-action");
      if (actBtn) {
        actBtn.addEventListener("click", (e) => {
          action.onClick(e);
          dismiss();
        });
      }
    }

    vp.appendChild(el);
    startTimer();

    return { dismiss };
  }

  return {
    show,
    success: (msg, opts) => show(msg, { ...(typeof opts === "object" ? opts : {}), type: "success" }),
    error: (msg, opts) => show(msg, { ...(typeof opts === "object" ? opts : {}), type: "error" }),
    warning: (msg, opts) => show(msg, { ...(typeof opts === "object" ? opts : {}), type: "warning" }),
    info: (msg, opts) => show(msg, { ...(typeof opts === "object" ? opts : {}), type: "info" }),
  };
})();

// ============================================================================
// 5. MODAL DIALOG (<dialog>) HELPER - HTMLDialogElement.showModal()
// NameThatUI Dialog Specification (native top-layer, backdrop, inert, Escape key)
// ============================================================================
function showConfirmDialog({
  title = "Xác nhận",
  message = "Bạn có chắc chắn muốn thực hiện hành động này?",
  icon = "⚠️",
  okText = "Đồng ý",
  cancelText = "Hủy bỏ",
  isDanger = false,
}) {
  return new Promise((resolve) => {
    const dialog = document.getElementById("app-dialog");
    if (!dialog || typeof dialog.showModal !== "function") {
      const confirmed = window.confirm(`${title}\n\n${message}`);
      return resolve(confirmed);
    }

    document.getElementById("dialog-title").textContent = title;
    document.getElementById("dialog-message").textContent = message;
    document.getElementById("dialog-icon").textContent = icon;

    const okBtn = document.getElementById("btn-dialog-confirm");
    const cancelBtn = document.getElementById("btn-dialog-cancel");

    okBtn.textContent = okText;
    cancelBtn.textContent = cancelText;

    if (isDanger) {
      okBtn.classList.add("danger");
    } else {
      okBtn.classList.remove("danger");
    }

    const cleanup = () => {
      dialog.removeEventListener("close", onClose);
      okBtn.onclick = null;
      cancelBtn.onclick = null;
    };

    const onClose = () => {
      cleanup();
      resolve(false);
    };

    okBtn.onclick = () => {
      cleanup();
      dialog.close();
      resolve(true);
    };

    cancelBtn.onclick = () => {
      cleanup();
      dialog.close();
      resolve(false);
    };

    dialog.addEventListener("close", onClose);

    try {
      dialog.showModal();
    } catch (e) {
      resolve(false);
    }
  });
}

// Backward compatibility alias
function showConfirmModal({ title, message, okText, onConfirm, icon }) {
  showConfirmDialog({ title, message, okText, icon }).then((res) => {
    if (res && onConfirm) onConfirm();
  });
}

// ============================================================================
// 6. COMBOBOX (AUTOCOMPLETE / TYPEAHEAD) ENGINE - WAI-ARIA 1.2
// NameThatUI Combobox Specification (role="combobox", role="listbox", Arrow keys, Escape)
// ============================================================================
function removeVietnameseTones(str) {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function setupCombobox(selectEl, options = {}) {
  if (!selectEl || selectEl.dataset.comboboxInitialized === "true") return null;
  selectEl.dataset.comboboxInitialized = "true";

  const placeholder = options.placeholder || selectEl.getAttribute("placeholder") || "-- Tìm hoặc chọn --";
  const ariaLabel = options.ariaLabel || selectEl.getAttribute("aria-label") || "Lựa chọn";
  const id = selectEl.id || ("cb-" + Math.random().toString(36).slice(2, 7));

  // 1. Tạo container bọc ngoài
  const container = document.createElement("div");
  container.className = "combobox-container";
  selectEl.parentNode.insertBefore(container, selectEl);
  container.appendChild(selectEl);

  // Ẩn select gốc an toàn (gỡ bỏ required để tránh Chrome chặn submit form vô hình)
  selectEl.removeAttribute("required");
  selectEl.style.display = "none";
  selectEl.tabIndex = -1;

  // 2. Tạo input combobox & chevron
  const inputWrapper = document.createElement("div");
  inputWrapper.className = "combobox-input-wrapper";

  const input = document.createElement("input");
  input.type = "text";
  input.id = `combobox-input-${id}`;
  input.className = "combobox-input";
  input.placeholder = placeholder;
  input.autocomplete = "off";
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-haspopup", "listbox");
  input.setAttribute("aria-controls", `listbox-${id}`);
  input.setAttribute("aria-label", ariaLabel);

  const chevron = document.createElement("span");
  chevron.className = "combobox-chevron";
  chevron.setAttribute("aria-hidden", "true");
  chevron.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

  inputWrapper.appendChild(input);
  inputWrapper.appendChild(chevron);
  container.appendChild(inputWrapper);

  // 3. Tạo listbox dropdown
  const listbox = document.createElement("ul");
  listbox.id = `listbox-${id}`;
  listbox.className = "combobox-listbox hidden";
  listbox.setAttribute("role", "listbox");
  listbox.setAttribute("aria-label", ariaLabel);
  container.appendChild(listbox);

  // Chuyển hướng thẻ <label for="..."> sang ID của input combobox
  if (selectEl.id) {
    const labels = document.querySelectorAll(`label[for="${selectEl.id}"]`);
    labels.forEach((lbl) => {
      lbl.setAttribute("for", input.id);
    });
  }

  let activeIndex = -1;
  let items = [];

  function getSelectOptions() {
    return Array.from(selectEl.options).map((opt) => ({
      value: opt.value,
      text: (opt.textContent || "").trim(),
    }));
  }

  function syncInputFromSelect() {
    const selectedOpt = selectEl.options[selectEl.selectedIndex];
    if (selectedOpt && selectedOpt.value) {
      input.value = selectedOpt.textContent.trim();
    } else {
      input.value = "";
    }
  }

  function highlightOption(index) {
    const optionEls = listbox.querySelectorAll(".combobox-option");
    if (optionEls.length === 0) {
      activeIndex = -1;
      return;
    }

    if (index < 0) index = 0;
    if (index >= optionEls.length) index = optionEls.length - 1;
    activeIndex = index;

    optionEls.forEach((opt, idx) => {
      if (idx === index) {
        opt.classList.add("is-active");
        opt.scrollIntoView({ block: "nearest" });
        input.setAttribute("aria-activedescendant", opt.id);
      } else {
        opt.classList.remove("is-active");
      }
    });
  }

  function renderListbox(filterQuery = "") {
    listbox.innerHTML = "";
    activeIndex = -1;
    input.removeAttribute("aria-activedescendant");

    const rawQuery = (filterQuery || "").trim().toLowerCase();
    const normQuery = removeVietnameseTones(rawQuery);
    const allOptions = getSelectOptions();

    items = allOptions.filter((opt) => {
      if (!opt.value && allOptions.length > 1) return false;
      if (!rawQuery) return true;
      const rawText = opt.text.toLowerCase();
      const normText = removeVietnameseTones(rawText);
      return normText.includes(normQuery) || rawText.includes(rawQuery) || opt.value.toLowerCase().includes(rawQuery);
    });

    if (items.length === 0) {
      const empty = document.createElement("li");
      empty.className = "combobox-empty";
      empty.textContent = "Không tìm thấy kết quả phù hợp";
      listbox.appendChild(empty);
      return;
    }

    // Xác định item ban đầu để highlight:
    // Nếu đang tìm kiếm: tự động active kết quả đầu tiên (index 0)
    // Nếu mở toàn bộ: active kết quả đang được chọn hiện tại
    let targetActive = -1;
    items.forEach((item, index) => {
      if (selectEl.value && selectEl.value === item.value) {
        targetActive = index;
      }
    });
    if (targetActive === -1 && rawQuery) {
      targetActive = 0;
    }

    items.forEach((item, index) => {
      const li = document.createElement("li");
      li.id = `opt-${id}-${index}`;
      li.className = "combobox-option";
      li.setAttribute("role", "option");
      const isSelected = selectEl.value === item.value;
      li.setAttribute("aria-selected", isSelected ? "true" : "false");

      li.innerHTML = `
        <span class="truncate">${item.text}</span>
        <span class="combobox-check">✓</span>
      `;

      // Chọn ngay khi nhấn chuột
      li.addEventListener("mousedown", (e) => {
        e.preventDefault();
        selectItem(item);
      });

      listbox.appendChild(li);
    });

    if (targetActive >= 0) {
      highlightOption(targetActive);
    }
  }

  function openListbox(showAll = true) {
    renderListbox(showAll ? "" : input.value);
    listbox.classList.remove("hidden");
    container.classList.add("is-expanded");
    input.setAttribute("aria-expanded", "true");
  }

  function closeListbox() {
    listbox.classList.add("hidden");
    container.classList.remove("is-expanded");
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    activeIndex = -1;
    syncInputFromSelect();
  }

  function selectItem(item) {
    selectEl.value = item.value;
    input.value = item.text;
    selectEl.dispatchEvent(new Event("change", { bubbles: true }));
    closeListbox();
  }

  // Tương tác Click trên Input: Toggle mở/đóng dropdown mượt mà
  input.addEventListener("click", () => {
    const isExpanded = input.getAttribute("aria-expanded") === "true";
    if (isExpanded) {
      closeListbox();
    } else {
      openListbox(true);
      input.select();
    }
  });

  // Tương tác Focus trên Input: Mở dropdown và bôi đen toàn bộ text để gõ đè nhanh
  input.addEventListener("focus", () => {
    const isExpanded = input.getAttribute("aria-expanded") === "true";
    if (!isExpanded) {
      openListbox(true);
      input.select();
    }
  });

  // Tương tác Chevron toggle
  chevron.addEventListener("click", (e) => {
    e.stopPropagation();
    const isExpanded = input.getAttribute("aria-expanded") === "true";
    if (isExpanded) {
      closeListbox();
    } else {
      input.focus();
      openListbox(true);
      input.select();
    }
  });

  // Tương tác Gõ chữ tìm kiếm (Input Event)
  input.addEventListener("input", () => {
    openListbox(false);
  });

  // Điều hướng bàn phím hoàn chỉnh (WAI-ARIA 1.2 Combobox)
  input.addEventListener("keydown", (e) => {
    const isExpanded = input.getAttribute("aria-expanded") === "true";

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isExpanded) {
        openListbox(true);
      } else {
        const optionEls = listbox.querySelectorAll(".combobox-option");
        if (optionEls.length > 0) {
          highlightOption((activeIndex + 1) % optionEls.length);
        }
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isExpanded) {
        openListbox(true);
      } else {
        const optionEls = listbox.querySelectorAll(".combobox-option");
        if (optionEls.length > 0) {
          highlightOption((activeIndex - 1 + optionEls.length) % optionEls.length);
        }
      }
    } else if (e.key === "Enter") {
      if (isExpanded) {
        e.preventDefault();
        if (activeIndex >= 0 && items[activeIndex]) {
          selectItem(items[activeIndex]);
        } else if (items.length > 0) {
          selectItem(items[0]);
        }
      }
    } else if (e.key === "Escape") {
      if (isExpanded) {
        e.preventDefault();
        closeListbox();
      }
    } else if (e.key === "Tab") {
      if (isExpanded) {
        if (activeIndex >= 0 && items[activeIndex]) {
          selectItem(items[activeIndex]);
        } else {
          closeListbox();
        }
      }
    }
  });

  // Click ra ngoài vùng container thì tự động đóng dropdown
  document.addEventListener("click", (e) => {
    if (!container.contains(e.target)) {
      closeListbox();
    }
  });

  // Đồng bộ hai chiều với thẻ <select> gốc
  selectEl.addEventListener("change", syncInputFromSelect);

  const observer = new MutationObserver(() => {
    syncInputFromSelect();
  });
  observer.observe(selectEl, { childList: true, subtree: true });

  syncInputFromSelect();

  return {
    sync: syncInputFromSelect,
    refresh: () => renderListbox(""),
    input,
    listbox,
  };
}

// ============================================================================
// 5. VIEW NAVIGATION & PERSISTENCE
// ============================================================================
async function switchView(viewId, saveState = true) {
  const allViews = ["view-login", "view-dashboard", "view-form"];
  allViews.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add("hidden");
      el.classList.remove("flex");
    }
  });

  const target = document.getElementById(viewId);
  if (target) {
    target.classList.remove("hidden");
    target.classList.add("flex");
    if (saveState) {
      await Storage.set(STORAGE_KEYS.ACTIVE_VIEW, viewId);
    }
  }

  if (viewId === "view-dashboard") {
    const curDateEl = document.getElementById("current-date");
    if (!curDateEl.value) {
      curDateEl.value = appState.selectedDate;
    }
    await loadDayTickets();
  }
}
window.switchView = switchView;

// ============================================================================
// 6. DATE & TIME UTILITIES (Chuẩn ISO / UTC+7 / Asia/Ho_Chi_Minh)
// ============================================================================

/**
 * Lấy giờ máy chủ đã hiệu chỉnh độ lệch (BR-49)
 */
function getCorrectedNow() {
  return new Date(Date.now() + (appState.clockSkewMs || 0));
}

function formatCurrentTime(dateObj = getCorrectedNow()) {
  const h = String(dateObj.getHours()).padStart(2, "0");
  const m = String(dateObj.getMinutes()).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  const mo = String(dateObj.getMonth() + 1).padStart(2, "0");
  const y = dateObj.getFullYear();
  return `${h}:${m} ${d}/${mo}/${y}`;
}

function parseCustomDate(dateStr) {
  if (!dateStr || !dateStr.trim()) return null;
  try {
    const trimmed = dateStr.trim();
    // Chấp nhận hh:mm dd/mm/yyyy
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) return null;
    
    const timeParts = parts[0].split(":");
    const dateParts = parts[1].split("/");
    if (timeParts.length < 2 || dateParts.length < 3) return null;

    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const year = parseInt(dateParts[2], 10);

    if (isNaN(hours) || hours < 0 || hours > 23) return null;
    if (isNaN(minutes) || minutes < 0 || minutes > 59) return null;
    if (isNaN(day) || day < 1 || day > 31) return null;
    if (isNaN(month) || month < 0 || month > 11) return null;
    if (isNaN(year) || year < 2000 || year > 2100) return null;

    const d = new Date(year, month, day, hours, minutes, 0, 0);
    // Kiểm tra tính hợp lệ số ngày trong tháng (ví dụ 31/02)
    if (d.getDate() !== day || d.getMonth() !== month) return null;
    return d;
  } catch (e) {
    return null;
  }
}

/**
 * Tính toán Tổng thời gian xử lý và Nhóm thời gian (BR-39, BR-40)
 */
function calcTotalTime() {
  const t1Str = document.getElementById("time-sent").value;
  const t2Str = document.getElementById("time-received").value;
  const t3Str = document.getElementById("time-resolved").value;

  const baseStart = t2Str ? parseCustomDate(t2Str) : parseCustomDate(t1Str);
  const end = parseCustomDate(t3Str);

  if (baseStart && end) {
    const diffMs = end.getTime() - baseStart.getTime();
    const diffMins = Math.round(diffMs / 60000);

    if (diffMins >= 0 && !appState.totalIsManual) {
      document.getElementById("time-total").value = diffMins;
      updateTimeGroupSelect(diffMins);
    }
  } else if (!appState.totalIsManual) {
    document.getElementById("time-total").value = "";
    document.getElementById("time-group").value = "";
  }
}

function updateTimeGroupSelect(mins) {
  const groupSelect = document.getElementById("time-group");
  if (mins === null || mins === undefined || isNaN(mins) || mins === "") {
    groupSelect.value = "";
    return;
  }
  const m = Number(mins);
  if (m < 15) {
    groupSelect.value = "LT15";
  } else if (m < 30) {
    groupSelect.value = "LT30";
  } else {
    groupSelect.value = "GT30";
  }
}

// ============================================================================
// 7. SECURE API REQUEST HELPER & TOKEN REFRESH
// ============================================================================
async function apiRequest(endpoint, method = "GET", body = null, headers = {}) {
  const cleanServer = appState.serverUrl.replace(/\/$/, "");
  const url = `${cleanServer}${endpoint}`;
  
  const reqHeaders = {
    "Content-Type": "application/json",
    "X-Client": "isofh-ext",
    "X-Client-Version": "1.0.0",
    ...headers,
  };
  if (appState.token) {
    reqHeaders["Authorization"] = `Bearer ${appState.token}`;
  }

  const options = {
    method,
    headers: reqHeaders,
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, options);
  } catch (netErr) {
    throw new Error(`Không thể kết nối đến máy chủ Hub (${cleanServer}). Vui lòng kiểm tra địa chỉ Host hoặc đường truyền.`);
  }

  // Token hết hạn -> Thử tự làm mới 1 lần (BR-45, UC-48)
  if (res.status === 401 && appState.refreshToken) {
    try {
      const refreshRes = await fetch(`${cleanServer}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: appState.refreshToken }),
      });
      const refreshJson = await refreshRes.json();
      if (refreshJson.success && refreshJson.data.access_token) {
        appState.token = refreshJson.data.access_token;
        if (refreshJson.data.refresh_token) {
          appState.refreshToken = refreshJson.data.refresh_token;
        }
        await Storage.set(STORAGE_KEYS.SESSION, {
          token: appState.token,
          refreshToken: appState.refreshToken,
          user: appState.user,
          savedAt: new Date().toISOString(),
        });

        // Gửi lại request ban đầu với token mới
        reqHeaders["Authorization"] = `Bearer ${appState.token}`;
        const retryRes = await fetch(url, { ...options, headers: reqHeaders });
        return await retryRes.json();
      }
    } catch (refErr) {
      console.warn("Lỗi tự làm mới token:", refErr);
    }

    // Refresh thất bại -> Chuyển về màn hình đăng nhập
    await handleSessionExpired();
    throw new Error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
  }

  if (res.status === 401) {
    await handleSessionExpired();
    throw new Error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
  }

  return await res.json();
}

async function handleSessionExpired() {
  appState.token = null;
  appState.refreshToken = null;
  appState.user = null;
  await Storage.remove(STORAGE_KEYS.SESSION);
  const errorEl = document.getElementById("login-error");
  if (errorEl) {
    errorEl.textContent = "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.";
    errorEl.classList.remove("hidden");
  }
  switchView("view-login", false);
}

// Đồng bộ giờ máy chủ (UC-50, BR-49)
async function syncServerTime() {
  try {
    const res = await apiRequest("/api/v1/time");
    if (res.success && res.data && res.data.now) {
      const serverTimeMs = new Date(res.data.now).getTime();
      const localTimeMs = Date.now();
      appState.clockSkewMs = serverTimeMs - localTimeMs;
    }
  } catch (e) {
    console.warn("Không đồng bộ được giờ máy chủ:", e.message);
  }
}

// ============================================================================
// 8. MASTER DATA & UI BINDING
// ============================================================================
async function loadMasterData() {
  try {
    const res = await apiRequest("/api/v1/master-data?categories=BUSINESS,CHANNEL,DECLARATION,TIME_GROUP");
    if (res.success && res.data && res.data.categories) {
      appState.masterData = res.data.categories;

      // Populate dropdown Nghiệp vụ
      const selectBusiness = document.getElementById("select-business");
      if (selectBusiness && appState.masterData.BUSINESS) {
        selectBusiness.innerHTML = '<option value="">-- Chọn nghiệp vụ --</option>';
        appState.masterData.BUSINESS.forEach((b) => {
          if (b.is_active) {
            const opt = document.createElement("option");
            opt.value = b.id || b.code;
            opt.textContent = b.name;
            selectBusiness.appendChild(opt);
          }
        });
        selectBusiness.dispatchEvent(new Event("change"));
      }

      // Populate dropdown Hỗ trợ khai báo
      const selectType = document.getElementById("select-support-type");
      if (selectType && appState.masterData.DECLARATION) {
        selectType.innerHTML = '<option value="">-- Chọn loại hỗ trợ --</option>';
        appState.masterData.DECLARATION.forEach((d) => {
          if (d.is_active) {
            const opt = document.createElement("option");
            opt.value = d.id || d.code;
            opt.textContent = d.name;
            selectType.appendChild(opt);
          }
        });
        selectType.dispatchEvent(new Event("change"));
      }

      // Populate Method Tags
      const methodContainer = document.getElementById("method-tags-container");
      if (methodContainer && appState.masterData.CHANNEL) {
        methodContainer.innerHTML = "";
        appState.masterData.CHANNEL.forEach((c, idx) => {
          if (c.is_active) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = `method-tag-pill ${idx === 0 ? "active" : ""}`;
            btn.setAttribute("data-id", c.id);
            btn.setAttribute("data-code", c.code);
            btn.innerHTML = `<span class="tag-check">✓</span> ${c.name}`;
            btn.addEventListener("click", () => {
              btn.classList.toggle("active");
              const actives = methodContainer.querySelectorAll(".method-tag-pill.active");
              if (actives.length === 0) btn.classList.add("active");
              scheduleAutoSaveDraft();
            });
            methodContainer.appendChild(btn);
          }
        });
      }
    }
  } catch (err) {
    console.warn("Không tải được MasterData từ Hub, dùng danh mục sẵn có:", err.message);
  }
}

function getSelectedMethodIds() {
  const container = document.getElementById("method-tags-container");
  if (!container) return [];
  const activeBtns = container.querySelectorAll(".method-tag-pill.active");
  const ids = [];
  activeBtns.forEach((btn) => {
    const id = btn.getAttribute("data-id") || btn.getAttribute("data-code");
    if (id) ids.push(id);
  });
  return ids;
}

function setSelectedMethodIds(ids) {
  if (!ids) return;
  const arr = Array.isArray(ids) ? ids : [ids];
  const container = document.getElementById("method-tags-container");
  if (!container) return;
  container.querySelectorAll(".method-tag-pill").forEach((btn) => {
    const id = btn.getAttribute("data-id");
    const code = btn.getAttribute("data-code");
    if (arr.includes(id) || arr.includes(code)) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

// ============================================================================
// 9. DRAFT MANAGEMENT (BR-52: Khóa theo userId, projectId, supportDate)
// ============================================================================
function getDraftStorageKey() {
  const uId = appState.user?.id || "guest";
  const pId = appState.selectedProjectId || "p0";
  const dStr = appState.selectedDate || "today";
  return `${STORAGE_KEYS.FORM_DRAFT_PREFIX}${uId}_${pId}_${dStr}`;
}

function setDraftStatus(state, timeStr = "") {
  const dot = document.getElementById("draft-dot");
  const text = document.getElementById("draft-text");
  const time = document.getElementById("draft-time");
  if (!dot || !text || !time) return;

  dot.className = "draft-dot";
  if (state === "saving") {
    dot.classList.add("dot-saving");
    text.textContent = "Đang lưu nháp...";
    time.textContent = "";
  } else if (state === "saved") {
    dot.classList.add("dot-saved");
    text.textContent = "Đã lưu nháp tự động";
    time.textContent = timeStr || new Date().toLocaleTimeString("vi-VN");
  } else if (state === "restored") {
    dot.classList.add("dot-saved");
    text.textContent = "Đã khôi phục bản nháp (MSG-103)";
    time.textContent = timeStr || "Vừa xong";
  }
}

function collectFormData() {
  const isDone = document.getElementById("status-done").checked;
  return {
    requester: document.getElementById("input-requester").value,
    business: document.getElementById("select-business").value,
    methods: getSelectedMethodIds(),
    supportType: document.getElementById("select-support-type").value,
    description: document.getElementById("input-description").value,
    cause: document.getElementById("input-cause").value,
    resolution: document.getElementById("input-resolution").value,
    timeSent: document.getElementById("time-sent").value,
    timeReceived: document.getElementById("time-received").value,
    timeResolved: document.getElementById("time-resolved").value,
    timeTotal: document.getElementById("time-total").value,
    timeGroup: document.getElementById("time-group").value,
    totalIsManual: appState.totalIsManual,
    status: isDone ? "done" : "pending",
  };
}

function isFormEmpty(data) {
  if (!data) return true;
  return (
    !data.requester?.trim() &&
    !data.description?.trim() &&
    !data.cause?.trim() &&
    !data.resolution?.trim() &&
    !data.timeSent?.trim() &&
    !data.timeReceived?.trim() &&
    !data.timeResolved?.trim()
  );
}

function scheduleAutoSaveDraft() {
  if (appState.currentTicketId) return; // Đang sửa ca cũ -> không đè lên nháp tạo mới
  setDraftStatus("saving");
  if (appState.autoSaveTimer) clearTimeout(appState.autoSaveTimer);

  appState.autoSaveTimer = setTimeout(async () => {
    try {
      const data = collectFormData();
      const key = getDraftStorageKey();
      if (!isFormEmpty(data)) {
        await Storage.set(key, {
          data,
          updatedAt: new Date().toISOString(),
        });
        setDraftStatus("saved");
      } else {
        await Storage.remove(key);
      }
    } catch (e) {
      console.error("Lỗi tự động lưu nháp:", e);
    }
  }, 500);
}

function populateFormFromDraft(draftData) {
  if (!draftData) return;
  if (draftData.requester !== undefined) document.getElementById("input-requester").value = draftData.requester;
  if (draftData.business !== undefined) document.getElementById("select-business").value = draftData.business;
  if (draftData.methods) setSelectedMethodIds(draftData.methods);
  if (draftData.supportType !== undefined) document.getElementById("select-support-type").value = draftData.supportType;
  if (draftData.description !== undefined) document.getElementById("input-description").value = draftData.description;
  if (draftData.cause !== undefined) document.getElementById("input-cause").value = draftData.cause;
  if (draftData.resolution !== undefined) document.getElementById("input-resolution").value = draftData.resolution;
  if (draftData.timeSent !== undefined) document.getElementById("time-sent").value = draftData.timeSent;
  if (draftData.timeReceived !== undefined) document.getElementById("time-received").value = draftData.timeReceived;
  if (draftData.timeResolved !== undefined) document.getElementById("time-resolved").value = draftData.timeResolved;
  if (draftData.timeTotal !== undefined) document.getElementById("time-total").value = draftData.timeTotal;
  if (draftData.timeGroup !== undefined) document.getElementById("time-group").value = draftData.timeGroup;
  if (draftData.totalIsManual !== undefined) appState.totalIsManual = draftData.totalIsManual;

  if (draftData.status === "done") {
    document.getElementById("status-done").checked = true;
    document.getElementById("req-resolution").classList.remove("hidden");
  } else {
    document.getElementById("status-pending").checked = true;
    document.getElementById("req-resolution").classList.add("hidden");
  }

  setDraftStatus("restored");
}

async function clearFormAndDraft() {
  document.getElementById("input-requester").value = "";
  document.getElementById("select-business").selectedIndex = 0;
  document.getElementById("select-support-type").selectedIndex = 0;
  document.getElementById("input-description").value = "";
  document.getElementById("input-cause").value = "";
  document.getElementById("input-resolution").value = "";
  document.getElementById("time-sent").value = "";
  document.getElementById("time-received").value = "";
  document.getElementById("time-resolved").value = "";
  document.getElementById("time-total").value = "";
  document.getElementById("time-group").value = "";
  document.getElementById("status-pending").checked = true;
  document.getElementById("req-resolution").classList.add("hidden");
  document.getElementById("patient-data-warning").classList.add("hidden");

  appState.totalIsManual = false;
  appState.currentTicketId = null;
  appState.formIdempotencyKey = generateUUID();

  // Reset tag đầu tiên
  const container = document.getElementById("method-tags-container");
  if (container) {
    const pills = container.querySelectorAll(".method-tag-pill");
    pills.forEach((p, idx) => {
      if (idx === 0) p.classList.add("active");
      else p.classList.remove("active");
    });
  }

  await Storage.remove(getDraftStorageKey());
  document.getElementById("box-draft-alert").classList.add("hidden");
}

// ============================================================================
// 10. AUTHENTICATION & LOGIN
// ============================================================================
document.getElementById("form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const rawServer = document.getElementById("login-server").value.trim();
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;
  const remember = document.getElementById("login-remember").checked;
  const errorEl = document.getElementById("login-error");
  const btnLogin = document.getElementById("btn-login");

  if (!rawServer || !username || !password) {
    errorEl.textContent = "Vui lòng nhập đầy đủ các trường bắt buộc (MSG-01).";
    errorEl.classList.remove("hidden");
    return;
  }

  // Chuẩn hóa server url
  let server = rawServer.replace(/\/+$/, "");
  if (!server.startsWith("http://") && !server.startsWith("https://")) {
    server = `http://${server}`;
  }
  appState.serverUrl = server;

  errorEl.classList.add("hidden");
  btnLogin.disabled = true;
  btnLogin.textContent = "Đang đăng nhập...";

  try {
    // Gọi POST /api/v1/auth/token theo SRS 8D.2 (fallback /api/v1/auth/login)
    let json;
    try {
      json = await apiRequest("/api/v1/auth/token", "POST", {
        username,
        password,
        client: { name: "isofh-ext", version: "1.0.0", device_label: "Side Panel" },
      });
    } catch (err1) {
      json = await apiRequest("/api/v1/auth/login", "POST", { username, password });
    }

    if (json.success && (json.data.access_token || json.data.token)) {
      appState.token = json.data.access_token || json.data.token;
      appState.refreshToken = json.data.refresh_token || null;
      appState.user = json.data.user;

      // Xóa mật khẩu khỏi form & RAM ngay sau khi đăng nhập thành công (BR-46)
      document.getElementById("login-password").value = "";

      // Lưu Host và phiên làm việc
      await Storage.set(STORAGE_KEYS.HOST, appState.serverUrl);
      if (remember) {
        await Storage.set(STORAGE_KEYS.SESSION, {
          token: appState.token,
          refreshToken: appState.refreshToken,
          user: appState.user,
          savedAt: new Date().toISOString(),
        });
      }

      await syncServerTime();
      await loadMasterData();
      updateUserUI();
      await loadProjects();
      await switchView("view-dashboard");
    } else {
      errorEl.textContent = json.error?.message || "Tên đăng nhập hoặc mật khẩu không đúng (MSG-02).";
      errorEl.classList.remove("hidden");
    }
  } catch (err) {
    errorEl.textContent = err.message || "Không thể kết nối đến máy chủ Hub.";
    errorEl.classList.remove("hidden");
  } finally {
    btnLogin.disabled = false;
    btnLogin.textContent = "Đăng nhập";
  }
});

function updateUserUI() {
  if (appState.user) {
    const name = appState.user.full_name || appState.user.fullName || appState.user.username;
    document.getElementById("logged-in-user").textContent = name;
    document.getElementById("user-avatar").textContent = name.charAt(0).toUpperCase();

    const inputAssigned = document.getElementById("input-assigned-user");
    inputAssigned.value = name;
  }
}

document.getElementById("btn-logout").addEventListener("click", async () => {
  const confirmed = await showConfirmDialog({
    title: "Đăng xuất tiện ích",
    message: "Bạn có chắc chắn muốn đăng xuất khỏi ISOFH Support?",
    icon: "🚪",
    okText: "Đăng xuất",
    cancelText: "Hủy bỏ",
    isDanger: true,
  });

  if (!confirmed) return;

  try {
    await apiRequest("/api/v1/auth/revoke", "POST");
  } catch (e) {
    // ignore
  }
  appState.token = null;
  appState.refreshToken = null;
  appState.user = null;
  await Storage.remove(STORAGE_KEYS.SESSION);
  await Storage.remove(STORAGE_KEYS.ACTIVE_VIEW);
  toast.info("Đã đăng xuất khỏi tiện ích.");
  switchView("view-login", false);
});

// ============================================================================
// 11. PROJECTS & DATES
// ============================================================================
async function loadProjects() {
  try {
    let res = await apiRequest("/api/v1/projects/options");
    if (!res.success || !Array.isArray(res.data)) {
      res = await apiRequest("/api/v1/me/projects");
    }

    if (res.success && Array.isArray(res.data)) {
      appState.projects = res.data;
      const select = document.getElementById("select-project");
      select.innerHTML = '<option value="">-- Chọn dự án --</option>';

      appState.projects.forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.name || p.projectName || p.code || p.projectCode;
        select.appendChild(opt);
      });

      const savedProjectId = await Storage.get(STORAGE_KEYS.LAST_PROJECT);
      const matched = appState.projects.find((p) => p.id === savedProjectId);
      if (matched) {
        appState.selectedProjectId = matched.id;
      } else if (appState.projects.length > 0) {
        appState.selectedProjectId = appState.projects[0].id;
      }

      select.value = appState.selectedProjectId;
      select.dispatchEvent(new Event("change"));
    }
  } catch (err) {
    console.error("Lỗi tải danh mục dự án:", err);
  }
}

document.getElementById("select-project").addEventListener("change", async (e) => {
  appState.selectedProjectId = e.target.value;
  await Storage.set(STORAGE_KEYS.LAST_PROJECT, appState.selectedProjectId);
  await checkDraftAlert();
  await loadDayTickets();
});

document.getElementById("current-date").addEventListener("change", async (e) => {
  const chosen = e.target.value;
  // Kiểm tra không cho chọn ngày tương lai hoặc quá 30 ngày trước (BR-36, MSG-110)
  const now = getCorrectedNow();
  const todayStr = now.toISOString().slice(0, 10);
  const minDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  if (chosen > todayStr || chosen < minDate) {
    toast.warning("Ngày trực không được ở tương lai hoặc quá 30 ngày trước (MSG-110).");
    e.target.value = appState.selectedDate;
    return;
  }

  appState.selectedDate = chosen;
  await Storage.set(STORAGE_KEYS.LAST_DATE, appState.selectedDate);
  await checkDraftAlert();
  await loadDayTickets();
});

async function checkDraftAlert() {
  const key = getDraftStorageKey();
  const draft = await Storage.get(key);
  const alertEl = document.getElementById("box-draft-alert");
  if (draft && draft.data && !isFormEmpty(draft.data)) {
    alertEl.classList.remove("hidden");
  } else {
    alertEl.classList.add("hidden");
  }
}

// ============================================================================
// 12. DASHBOARD TICKETS LIST (EX-02, UC-49)
// ============================================================================
async function loadDayTickets() {
  const listEl = document.getElementById("dashboard-tickets-list");
  const totalBadge = document.getElementById("badge-total-tickets");

  if (!appState.selectedProjectId) {
    listEl.innerHTML = '<div class="empty-placeholder">Vui lòng chọn Dự án</div>';
    totalBadge.textContent = "0 ca";
    return;
  }

  try {
    const curDate = appState.selectedDate;
    let endpoint = `/api/v1/tickets?project_id=${appState.selectedProjectId}&support_date=${curDate}&size=50`;
    if (appState.ticketsFilter === "mine") {
      endpoint += "&mine=1";
    }

    let res = await apiRequest(endpoint);
    if (!res.success) {
      // Fallback endpoint cũ nếu chưa reload
      endpoint = `/api/v1/support-tickets?projectId=${appState.selectedProjectId}&fromDate=${curDate}&toDate=${curDate}&pageSize=50`;
      if (appState.ticketsFilter === "mine" && appState.user) {
        endpoint += `&assignedUserId=${appState.user.id}`;
      }
      res = await apiRequest(endpoint);
    }

    if (res.success) {
      appState.activeTickets = res.data.items || [];
      const pendingCount = appState.activeTickets.filter((t) => t.status === "pending" || t.status === "IN_PROGRESS").length;
      totalBadge.textContent = `${appState.activeTickets.length} ca (${pendingCount} chưa xong)`;

      if (appState.activeTickets.length === 0) {
        listEl.innerHTML = `
          <div class="empty-placeholder">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.6" style="margin-bottom: 6px;">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
            <span>Chưa có ca nào được ghi nhận trong ngày</span>
          </div>`;
        return;
      }

      listEl.innerHTML = "";
      appState.activeTickets.forEach((t) => {
        const item = document.createElement("div");
        const isDone = t.status === "done" || t.status === "COMPLETED";
        item.className = `ticket-item ${isDone ? "is-done" : "is-pending"}`;

        const statusBadge = isDone
          ? '<span style="font-size: 10px; font-weight: 700; color: #065f46; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 1.5px 7px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 4px;"><span style="width: 5px; height: 5px; border-radius: 50%; background: #10b981;"></span>Hoàn thành</span>'
          : '<span style="font-size: 10px; font-weight: 700; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; padding: 1.5px 7px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 4px;"><span style="width: 5px; height: 5px; border-radius: 50%; background: #f59e0b;"></span>Chưa xong</span>';

        const ticketNo = t.ticket_no || t.ticketCode || "HT-TICKET";
        const reqName = t.requester_name || t.requesterName || "Người dùng";
        const procMin = t.total_minutes !== null && t.total_minutes !== undefined ? `${t.total_minutes}p` : "--";

        item.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span class="font-mono" style="font-weight: 700; color: #0284c7; font-size: 11.5px; letter-spacing: -0.01em;">${ticketNo}</span>
            ${statusBadge}
          </div>
          <div style="font-size: 12px; font-weight: 700; color: #1e293b; margin-bottom: 2px;" class="truncate">${reqName}</div>
          <div style="font-size: 11px; color: #64748b; line-height: 1.35; margin-bottom: 6px;" class="truncate">${t.description || "Không có mô tả chi tiết"}</div>
          <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 6px; border-top: 1px solid #f1f5f9;">
            <span style="font-size: 10.5px; font-weight: 600; color: #0369a1; display: flex; align-items: center; gap: 3px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              ${procMin}
            </span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <button type="button" class="link-bold btn-edit-ticket" data-id="${t.id}" style="font-size: 11px;">Sửa</button>
              <button type="button" class="link-bold btn-hub-ticket" data-id="${t.id}" style="font-size: 11px; color: var(--text-muted);">Hub ↗</button>
            </div>
          </div>
        `;

        item.querySelector(".btn-edit-ticket").addEventListener("click", () => openEditTicket(t));
        item.querySelector(".btn-hub-ticket").addEventListener("click", () => {
          const hubUrl = `${appState.serverUrl.replace(/\/$/, "")}/support-tickets`;
          if (typeof chrome !== "undefined" && chrome.tabs) {
            chrome.tabs.create({ url: hubUrl });
          } else {
            window.open(hubUrl, "_blank");
          }
        });

        listEl.appendChild(item);
      });
    }
  } catch (err) {
    listEl.innerHTML = `<div class="empty-placeholder text-red-500">${err.message || "Lỗi tải ca"}</div>`;
  }
}

// Chuyển tab lọc danh sách ca (Của tôi / Tất cả)
document.getElementById("filter-tab-mine").addEventListener("click", () => {
  appState.ticketsFilter = "mine";
  const btnMine = document.getElementById("filter-tab-mine");
  const btnAll = document.getElementById("filter-tab-all");
  btnMine.style.background = "#ffffff";
  btnMine.style.color = "#0284c7";
  btnMine.style.boxShadow = "0 1px 2px rgba(0,0,0,0.05)";
  btnAll.style.background = "transparent";
  btnAll.style.color = "var(--text-muted)";
  btnAll.style.boxShadow = "none";
  loadDayTickets();
});

document.getElementById("filter-tab-all").addEventListener("click", () => {
  appState.ticketsFilter = "all";
  const btnMine = document.getElementById("filter-tab-mine");
  const btnAll = document.getElementById("filter-tab-all");
  btnAll.style.background = "#ffffff";
  btnAll.style.color = "#0284c7";
  btnAll.style.boxShadow = "0 1px 2px rgba(0,0,0,0.05)";
  btnMine.style.background = "transparent";
  btnMine.style.color = "var(--text-muted)";
  btnMine.style.boxShadow = "none";
  loadDayTickets();
});

// Nút mở tiện ích trong tab riêng toàn màn hình
const btnOpenTab = document.getElementById("btn-open-tab");
if (btnOpenTab) {
  btnOpenTab.addEventListener("click", () => {
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.runtime) {
      chrome.tabs.create({ url: chrome.runtime.getURL("sidepanel.html") });
    } else {
      window.open("sidepanel.html", "_blank");
    }
  });
}

// Nút Đồng bộ từ Hub
document.getElementById("btn-sync-hub").addEventListener("click", async () => {
  const syncBtn = document.getElementById("btn-sync-hub");
  syncBtn.disabled = true;
  try {
    await syncServerTime();
    await loadMasterData();
    await loadProjects();
    await loadDayTickets();
    toast.success("Đã đồng bộ dữ liệu mới nhất từ Hub!");
  } catch (err) {
    toast.error("Không thể đồng bộ từ Hub: " + err.message);
  } finally {
    syncBtn.disabled = false;
  }
});

// Nút mở form tạo ca mới từ Dashboard
document.getElementById("btn-open-new-ticket").addEventListener("click", async () => {
  if (!appState.selectedProjectId) {
    toast.warning("Vui lòng chọn Dự án trước khi tạo ca hỗ trợ.");
    const projInput = document.getElementById("combobox-input-select-project");
    if (projInput) projInput.focus();
    else document.getElementById("select-project").focus();
    return;
  }

  appState.currentTicketId = null;
  appState.formIdempotencyKey = generateUUID();
  document.getElementById("form-ticket-title").textContent = "Ghi nhận ca hỗ trợ mới";

  // Khôi phục nháp nếu có
  const key = getDraftStorageKey();
  const draft = await Storage.get(key);
  if (draft && draft.data && !isFormEmpty(draft.data)) {
    populateFormFromDraft(draft.data);
  } else {
    // Giá trị ban đầu mặc định
    document.getElementById("time-sent").value = formatCurrentTime(getCorrectedNow());
    document.getElementById("time-received").value = formatCurrentTime(getCorrectedNow());
    document.getElementById("status-pending").checked = true;
    document.getElementById("req-resolution").classList.add("hidden");
  }

  switchView("view-form");
});

document.getElementById("btn-restore-draft").addEventListener("click", () => {
  document.getElementById("btn-open-new-ticket").click();
});

// ============================================================================
// 13. FORM ACTIONS: TIMESTAMPS, DRAFT, MODALS
// ============================================================================
document.getElementById("btn-back-dashboard").addEventListener("click", () => {
  switchView("view-dashboard");
});

document.getElementById("btn-stamp-t1").addEventListener("click", () => {
  document.getElementById("time-sent").value = formatCurrentTime(getCorrectedNow());
  calcTotalTime();
  scheduleAutoSaveDraft();
});

document.getElementById("btn-stamp-t2").addEventListener("click", () => {
  document.getElementById("time-received").value = formatCurrentTime(getCorrectedNow());
  calcTotalTime();
  scheduleAutoSaveDraft();
});

// Nút "Xong" (T3): Điền thời điểm xử lý xong và tự động chuyển sang "Hoàn thành" (BR-41)
document.getElementById("btn-stamp-t3").addEventListener("click", () => {
  document.getElementById("time-resolved").value = formatCurrentTime(getCorrectedNow());
  document.getElementById("status-done").checked = true;
  document.getElementById("req-resolution").classList.remove("hidden");
  calcTotalTime();
  scheduleAutoSaveDraft();
});

document.getElementById("time-sent").addEventListener("change", calcTotalTime);
document.getElementById("time-received").addEventListener("change", calcTotalTime);
document.getElementById("time-resolved").addEventListener("change", calcTotalTime);

// Sửa tay tổng thời gian
document.getElementById("time-total").addEventListener("input", (e) => {
  appState.totalIsManual = true;
  updateTimeGroupSelect(e.target.value);
  scheduleAutoSaveDraft();
});

document.getElementById("btn-recalc-time").addEventListener("click", () => {
  appState.totalIsManual = false;
  calcTotalTime();
});

// Chuyển đổi trạng thái thủ công
document.getElementById("status-done").addEventListener("change", () => {
  document.getElementById("req-resolution").classList.remove("hidden");
  if (!document.getElementById("time-resolved").value) {
    document.getElementById("time-resolved").value = formatCurrentTime(getCorrectedNow());
    calcTotalTime();
  }
  scheduleAutoSaveDraft();
});

document.getElementById("status-pending").addEventListener("change", () => {
  document.getElementById("req-resolution").classList.add("hidden");
  scheduleAutoSaveDraft();
});

// Kiểm tra thông tin người bệnh thời gian thực (BR-47, MSG-99)
function checkPatientDataWarning() {
  const desc = document.getElementById("input-description").value || "";
  const cause = document.getElementById("input-cause").value || "";
  const res = document.getElementById("input-resolution").value || "";
  const text = `${desc} ${cause} ${res}`;

  const phoneRegex = /\b(0[3|5|7|8|9]\d{8})\b/;
  const idRegex = /\b(\d{9}|\d{12})\b/;
  const dobRegex = /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/;

  const hasPatientData = phoneRegex.test(text) || idRegex.test(text) || dobRegex.test(text);
  const warnEl = document.getElementById("patient-data-warning");
  if (hasPatientData) {
    warnEl.classList.remove("hidden");
  } else {
    warnEl.classList.add("hidden");
  }
  return hasPatientData;
}

// Gắn sự kiện auto-save trên toàn bộ input của form
function attachFormListeners() {
  const formEl = document.getElementById("view-form");
  formEl.querySelectorAll("input, select, textarea").forEach((el) => {
    el.addEventListener("input", () => {
      checkPatientDataWarning();
      scheduleAutoSaveDraft();
    });
    el.addEventListener("change", () => {
      checkPatientDataWarning();
      scheduleAutoSaveDraft();
    });
  });
}

document.getElementById("btn-reset-form").addEventListener("click", async () => {
  const confirmed = await showConfirmDialog({
    title: "Làm mới biểu mẫu?",
    message: "Bạn có chắc chắn muốn xóa sạch nội dung chưa lưu để nhập ca mới?",
    icon: "🔄",
    okText: "Làm mới",
    cancelText: "Quay lại",
    isDanger: true,
  });

  if (confirmed) {
    await clearFormAndDraft();
    toast.info("Đã làm mới biểu mẫu thành công.");
  }
});

// Mở form chỉnh sửa ca cũ
function openEditTicket(ticket) {
  appState.currentTicketId = ticket.id;
  appState.currentTicketVersion = ticket.version || 1;
  document.getElementById("form-ticket-title").textContent = `Chỉnh sửa: ${ticket.ticket_no || ticket.ticketCode}`;

  document.getElementById("input-requester").value = ticket.requester_name || ticket.requesterName || "";
  if (ticket.business?.id || ticket.businessId) {
    document.getElementById("select-business").value = ticket.business?.id || ticket.businessId;
  }
  if (ticket.channels || ticket.methods) {
    const ids = (ticket.channels || ticket.methods || []).map((m) => m.id);
    setSelectedMethodIds(ids);
  }
  if (ticket.declaration_type?.id || ticket.supportTypeId) {
    document.getElementById("select-support-type").value = ticket.declaration_type?.id || ticket.supportTypeId;
  }
  document.getElementById("input-description").value = ticket.description || "";
  document.getElementById("input-cause").value = ticket.cause || "";
  document.getElementById("input-resolution").value = ticket.resolution || "";

  if (ticket.sent_at || ticket.sentAt) {
    document.getElementById("time-sent").value = formatCurrentTime(new Date(ticket.sent_at || ticket.sentAt));
  }
  if (ticket.received_at || ticket.receivedAt) {
    document.getElementById("time-received").value = formatCurrentTime(new Date(ticket.received_at || ticket.receivedAt));
  }
  if (ticket.resolved_at || ticket.resolvedAt) {
    document.getElementById("time-resolved").value = formatCurrentTime(new Date(ticket.resolved_at || ticket.resolvedAt));
  }

  const isDone = ticket.status === "done" || ticket.status === "COMPLETED";
  if (isDone) {
    document.getElementById("status-done").checked = true;
    document.getElementById("req-resolution").classList.remove("hidden");
  } else {
    document.getElementById("status-pending").checked = true;
    document.getElementById("req-resolution").classList.add("hidden");
  }

  calcTotalTime();
  switchView("view-form", false);
}

// ============================================================================
// 14. SUBMIT / SAVE TICKET (UC-42, UC-43, BR-38 -> BR-44)
// ============================================================================
document.getElementById("btn-save-ticket").addEventListener("click", async () => {
  const requester = document.getElementById("input-requester").value.trim();
  const businessId = document.getElementById("select-business").value;
  const methodIds = getSelectedMethodIds();
  const supportTypeId = document.getElementById("select-support-type").value;
  const description = document.getElementById("input-description").value.trim();
  const cause = document.getElementById("input-cause").value.trim();
  const resolution = document.getElementById("input-resolution").value.trim();
  const timeSentStr = document.getElementById("time-sent").value.trim();
  const timeReceivedStr = document.getElementById("time-received").value.trim();
  const timeResolvedStr = document.getElementById("time-resolved").value.trim();
  const isDone = document.getElementById("status-done").checked;

  // 1. Kiểm tra bắt buộc (MSG-01)
  if (!requester) {
    toast.warning("Vui lòng nhập Người dùng yêu cầu hỗ trợ (MSG-01).");
    document.getElementById("input-requester").focus();
    return;
  }
  if (!businessId) {
    toast.warning("Vui lòng chọn Nghiệp vụ cần hỗ trợ (MSG-01).");
    const cbBusinessInput = document.getElementById("combobox-input-select-business");
    if (cbBusinessInput) cbBusinessInput.focus();
    else document.getElementById("select-business").focus();
    return;
  }
  if (!methodIds || methodIds.length === 0) {
    toast.warning("Vui lòng chọn ít nhất một Phương thức hỗ trợ (MSG-01).");
    return;
  }
  if (!description) {
    toast.warning("Vui lòng nhập Mô tả vấn đề cần hỗ trợ (MSG-01).");
    document.getElementById("input-description").focus();
    return;
  }
  if (!timeSentStr) {
    toast.warning("Vui lòng nhập Thời gian người dùng gửi ca T1 (MSG-01).");
    document.getElementById("time-sent").focus();
    return;
  }

  // 2. Parse thời gian & kiểm tra cú pháp (MSG-93)
  const sentDate = parseCustomDate(timeSentStr);
  if (!sentDate) {
    toast.error("Định dạng thời gian gửi không hợp lệ. Vui lòng nhập: hh:mm dd/mm/yyyy (MSG-93).");
    document.getElementById("time-sent").focus();
    return;
  }

  const receivedDate = timeReceivedStr ? parseCustomDate(timeReceivedStr) : sentDate;
  if (timeReceivedStr && !receivedDate) {
    toast.error("Định dạng thời điểm nhận ca không hợp lệ. Vui lòng nhập: hh:mm dd/mm/yyyy (MSG-93).");
    document.getElementById("time-received").focus();
    return;
  }

  const resolvedDate = timeResolvedStr ? parseCustomDate(timeResolvedStr) : null;
  if (timeResolvedStr && !resolvedDate) {
    toast.error("Định dạng thời điểm xử lý xong không hợp lệ. Vui lòng nhập: hh:mm dd/mm/yyyy (MSG-93).");
    document.getElementById("time-resolved").focus();
    return;
  }

  // 3. Kiểm tra thứ tự thời gian (BR-38: T1 <= T2 <= T3)
  if (receivedDate.getTime() < sentDate.getTime() - 60000) {
    toast.error("Thời điểm nhận ca không được trước thời gian người dùng gửi ca (MSG-91).");
    document.getElementById("time-received").focus();
    return;
  }

  if (resolvedDate && resolvedDate.getTime() < receivedDate.getTime() - 60000) {
    toast.error("Thời điểm xử lý xong không được trước thời điểm nhận ca (MSG-92).");
    document.getElementById("time-resolved").focus();
    return;
  }

  // 4. Không ở tương lai quá 5 phút so với máy chủ (MSG-94)
  const serverNowMs = getCorrectedNow().getTime();
  if (sentDate.getTime() > serverNowMs + 5 * 60 * 1000) {
    toast.error("Thời gian gửi ca không được ở tương lai (MSG-94).");
    return;
  }

  // 5. Cảnh báo nếu ngày T1 khác Ngày trực (MSG-95)
  const t1DayStr = sentDate.toISOString().slice(0, 10);
  if (t1DayStr !== appState.selectedDate) {
    const confirmDate = await showConfirmDialog({
      title: "Cảnh báo ngày gửi ca (MSG-95)",
      message: `Thời gian gửi ca (${t1DayStr}) khác Ngày trực đã chọn (${appState.selectedDate}). Bạn vẫn muốn lưu ca này?`,
      icon: "⚠️",
      okText: "Tiếp tục lưu",
      cancelText: "Kiểm tra lại",
    });
    if (!confirmDate) return;
  }

  // 6. Kiểm tra điều kiện Hoàn thành (BR-41, MSG-96)
  if (isDone) {
    if (!resolvedDate) {
      toast.warning("Ca hoàn thành cần có thời điểm xử lý xong (MSG-96).");
      document.getElementById("time-resolved").focus();
      return;
    }
    if (!resolution) {
      toast.warning("Ca hoàn thành cần có Cách xử lý (MSG-96).");
      document.getElementById("input-resolution").focus();
      return;
    }
  }

  // 7. Cảnh báo dữ liệu người bệnh (BR-47, MSG-99)
  if (checkPatientDataWarning()) {
    const confirmPatient = await showConfirmDialog({
      title: "Cảnh báo thông tin người bệnh (MSG-99)",
      message: "Nội dung có vẻ chứa dữ liệu người bệnh (SĐT, CMND/CCCD, ngày sinh). Bạn có chắc chắn muốn lưu nội dung này?",
      icon: "🛡️",
      okText: "Xác nhận lưu",
      cancelText: "Để tôi sửa lại",
      isDanger: true,
    });
    if (!confirmPatient) return;
  }

  // 8. Đóng gói payload chuẩn theo SRS 8D.4
  const payload = {
    project_id: appState.selectedProjectId,
    projectId: appState.selectedProjectId,
    support_date: appState.selectedDate,
    requester_name: requester,
    requesterName: requester,
    business_id: businessId,
    businessId: businessId,
    channel_id: methodIds[0],
    supportMethodIds: methodIds,
    declaration_type_id: supportTypeId || null,
    supportTypeId: supportTypeId || null,
    description,
    cause: cause || null,
    resolution: resolution || null,
    sent_at: sentDate.toISOString(),
    sentAt: sentDate.toISOString(),
    received_at: receivedDate ? receivedDate.toISOString() : null,
    receivedAt: receivedDate ? receivedDate.toISOString() : null,
    resolved_at: resolvedDate ? resolvedDate.toISOString() : null,
    resolvedAt: resolvedDate ? resolvedDate.toISOString() : null,
    status: isDone ? "done" : "pending",
  };

  const btnSave = document.getElementById("btn-save-ticket");
  const saveLabel = document.getElementById("btn-save-label");
  btnSave.disabled = true;
  saveLabel.textContent = "Đang lưu lên Hub...";

  try {
    let res;
    if (appState.currentTicketId) {
      // Sửa ca cũ (PUT kèm version, BR-51)
      payload.version = appState.currentTicketVersion;
      res = await apiRequest(`/api/v1/tickets/${appState.currentTicketId}`, "PUT", payload);
      if (!res.success) {
        res = await apiRequest(`/api/v1/support-tickets/${appState.currentTicketId}`, "PUT", payload);
      }
    } else {
      // Tạo ca mới (POST kèm Idempotency-Key, BR-44)
      const idempotencyKey = appState.formIdempotencyKey || generateUUID();
      res = await apiRequest("/api/v1/tickets", "POST", payload, {
        "Idempotency-Key": idempotencyKey,
      });
      if (!res.success) {
        res = await apiRequest("/api/v1/support-tickets", "POST", payload, {
          "Idempotency-Key": idempotencyKey,
        });
      }
    }

    if (res.success) {
      const ticketNo = res.data?.ticket_no || res.data?.ticketCode || "thành công";
      toast.success(`Đã lưu ca hỗ trợ ${ticketNo} thành công (MSG-90)!`);

      // Xóa nháp khi lưu thành công (BR-52)
      await clearFormAndDraft();
      await switchView("view-dashboard");
    } else {
      toast.error(res.error?.message || "Không thể lưu ca hỗ trợ. Dữ liệu được giữ lại để thử lại.");
    }
  } catch (err) {
    // Mất kết nối Hub: Giữ nguyên form và lưu bản nháp an toàn (MSG-102)
    scheduleAutoSaveDraft();
    toast.error(`Không kết nối được máy chủ Hub (MSG-102): ${err.message}. Dữ liệu được giữ lại an toàn.`);
  } finally {
    btnSave.disabled = false;
    saveLabel.textContent = "Lưu ca hỗ trợ";
  }
});

// ============================================================================
// 15. INITIALIZATION LIFECYCLE
// ============================================================================
(async function init() {
  attachFormListeners();

  // Khởi tạo các bộ chọn Combobox (Autocomplete / Typeahead) theo WAI-ARIA 1.2 & NameThatUI
  setupCombobox(document.getElementById("select-project"), {
    placeholder: "-- Tìm hoặc chọn dự án --",
    ariaLabel: "Dự án trực ca",
  });
  setupCombobox(document.getElementById("select-business"), {
    placeholder: "-- Tìm hoặc chọn nghiệp vụ --",
    ariaLabel: "Nghiệp vụ hỗ trợ",
  });
  setupCombobox(document.getElementById("select-support-type"), {
    placeholder: "-- Tìm hoặc chọn loại hỗ trợ --",
    ariaLabel: "Loại hỗ trợ khai báo",
  });

  // 1. Khôi phục Host đã cấu hình
  const savedHost = await Storage.get(STORAGE_KEYS.HOST);
  if (savedHost) {
    appState.serverUrl = savedHost;
    document.getElementById("login-server").value = savedHost;
  }

  // 2. Khôi phục Ngày đã chọn gần nhất
  const savedDate = await Storage.get(STORAGE_KEYS.LAST_DATE);
  if (savedDate) {
    appState.selectedDate = savedDate;
  }
  document.getElementById("current-date").value = appState.selectedDate;

  // 3. Khôi phục Phiên đăng nhập
  const savedSession = await Storage.get(STORAGE_KEYS.SESSION);
  if (savedSession && savedSession.token) {
    appState.token = savedSession.token;
    appState.refreshToken = savedSession.refreshToken || null;
    appState.user = savedSession.user;

    try {
      const meRes = await apiRequest("/api/v1/me");
      if (meRes.success && meRes.data) {
        appState.user = meRes.data;
        updateUserUI();

        await syncServerTime();
        await loadMasterData();
        await loadProjects();
        await checkDraftAlert();

        const savedView = await Storage.get(STORAGE_KEYS.ACTIVE_VIEW);
        if (savedView === "view-form") {
          await switchView("view-form", false);
        } else {
          await switchView("view-dashboard", false);
        }
        return;
      }
    } catch (err) {
      console.warn("Kiểm tra phiên đăng nhập khởi động:", err.message);
      if (err.message && err.message.includes("Không thể kết nối")) {
        updateUserUI();
        await switchView("view-dashboard", false);
        return;
      }
    }
  }

  // Mặc định: Hiển thị màn hình đăng nhập
  switchView("view-login", false);
})();
