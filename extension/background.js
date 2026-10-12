// ISOFH Support Extension - Background Service Worker (Manifest V3)
// Đăng ký hành vi mở thanh bên Side Panel trên Google Chrome & Microsoft Edge (SRS 8C)

// 1. Cấu hình tự động mở Side Panel khi click vào Action Icon trên Toolbar
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.warn("Lỗi cấu hình setPanelBehavior:", error));
  }
});

// 2. Fallback sự kiện click action icon nếu setPanelBehavior chưa kích hoạt
chrome.action.onClicked.addListener(async (tab) => {
  if (chrome.sidePanel && chrome.sidePanel.open) {
    try {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    } catch (err) {
      console.warn("Không mở được side panel qua open():", err);
    }
  }
});
