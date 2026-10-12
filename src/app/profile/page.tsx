"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialogProvider";
import {
  Lock,
  Shield,
  User,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  Building2,
  CreditCard,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  Clock,
  RotateCcw,
  Trash2,
  HelpCircle,
  QrCode,
  ShieldAlert,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

const POPULAR_BANKS = [
  { code: "MB", name: "MBBank (Ngân hàng Quân đội)" },
  { code: "VCB", name: "Vietcombank (Ngân hàng Ngoại thương)" },
  { code: "TCB", name: "Techcombank (Ngân hàng Kỹ thương)" },
  { code: "CTG", name: "VietinBank (Ngân hàng Công thương)" },
  { code: "BIDV", name: "BIDV (Ngân hàng Đầu tư & Phát triển)" },
  { code: "ACB", name: "ACB (Ngân hàng Á Châu)" },
  { code: "VPB", name: "VPBank (Ngân hàng Việt Nam Thịnh Vượng)" },
  { code: "TPB", name: "TPBank (Ngân hàng Tiên Phong)" },
  { code: "STB", name: "Sacombank (Ngân hàng Sài Gòn Thương Tín)" },
  { code: "VIB", name: "VIB (Ngân hàng Quốc tế)" },
  { code: "HDB", name: "HDBank (Ngân hàng Phát triển TP.HCM)" },
  { code: "SHB", name: "SHB (Ngân hàng Sài Gòn - Hà Nội)" },
  { code: "MSB", name: "MSB (Ngân hàng Hàng Hải)" },
  { code: "OCB", name: "OCB (Ngân hàng Phương Đông)" },
  { code: "LPB", name: "LPBank (Ngân hàng Lộc Phát)" },
  { code: "TIMO", name: "Timo by BVBank" },
  { code: "CAKE", name: "Cake by VPBank" },
];

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mustChange = searchParams.get("mustChange") === "true";
  const { success, error } = useToast();
  const { confirm } = useConfirm();

  const [activeTab, setActiveTab] = useState<"password" | "vault-pin" | "payment">("password");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1. Password change fields
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // 2. Vault PIN Security fields
  const [pinStatus, setPinStatus] = useState<{
    hasPin: boolean;
    pinLength: number | null;
    isLocked: boolean;
    remainingLockSeconds: number;
    failedAttempts: number;
  }>({
    hasPin: false,
    pinLength: null,
    isLocked: false,
    remainingLockSeconds: 0,
    failedAttempts: 0,
  });
  const [pinLengthChoice, setPinLengthChoice] = useState<4 | 6>(6);
  const [initialPin, setInitialPin] = useState("");
  const [initialConfirmPin, setInitialConfirmPin] = useState("");
  const [settingPin, setSettingPin] = useState(false);

  // Change PIN fields
  const [currentPin, setCurrentPin] = useState("");
  const [changeNewPin, setChangeNewPin] = useState("");
  const [changeConfirmPin, setChangeConfirmPin] = useState("");
  const [changingPin, setChangingPin] = useState(false);

  // Reset PIN fields
  const [showResetPinModal, setShowResetPinModal] = useState(false);
  const [resetAccountPassword, setResetAccountPassword] = useState("");
  const [resetNewPin, setResetNewPin] = useState("");
  const [resetConfirmPin, setResetConfirmPin] = useState("");
  const [resettingPin, setResettingPin] = useState(false);

  // 3. Payment Profile fields
  const [paymentProfile, setPaymentProfile] = useState<any>(null);
  const [bankCode, setBankCode] = useState("MB");
  const [customBankCode, setCustomBankCode] = useState("");
  const [bankName, setBankName] = useState("MBBank (Ngân hàng Quân đội)");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [branch, setBranch] = useState("");
  const [defaultContent, setDefaultContent] = useState("ORDER");
  const [savingPayment, setSavingPayment] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState(false);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const json = await res.json();
        if (json.success) setUser(json.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPinStatus = async () => {
    try {
      const res = await fetch("/api/me/vault-pin/status");
      const json = await res.json();
      if (json.success && json.data) {
        setPinStatus(json.data);
        if (json.data.pinLength) {
          setPinLengthChoice(json.data.pinLength as 4 | 6);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPaymentProfile = async () => {
    try {
      const res = await fetch("/api/me/payment-profile");
      const json = await res.json();
      if (json.success && json.data) {
        setPaymentProfile(json.data);
        setBankCode(json.data.bankCode || "MB");
        setBankName(json.data.bankName || "");
        setAccountNumber(json.data.accountNumber || "");
        setAccountHolderName(json.data.accountHolderName || json.data.accountName || "");
        setBranch(json.data.branch || "");
        setDefaultContent(json.data.defaultContent || "ORDER");
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    Promise.all([fetchUser(), fetchPinStatus(), fetchPaymentProfile()]).finally(() => {
      setLoading(false);
    });
  }, []);

  // Lock countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (pinStatus.isLocked && pinStatus.remainingLockSeconds > 0) {
      timer = setInterval(() => {
        setPinStatus((prev) => {
          if (prev.remainingLockSeconds <= 1) {
            return { ...prev, isLocked: false, remainingLockSeconds: 0 };
          }
          return { ...prev, remainingLockSeconds: prev.remainingLockSeconds - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [pinStatus.isLocked, pinStatus.remainingLockSeconds]);

  // Handlers for Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!oldPassword || !newPassword || !confirmPassword) {
      error("Vui lòng điền đầy đủ 3 trường mật khẩu.");
      return;
    }

    if (newPassword !== confirmPassword) {
      error("Mật khẩu xác nhận không khớp với mật khẩu mới.");
      return;
    }

    if (newPassword.length < 8) {
      error("Mật khẩu mới phải có tối thiểu 8 ký tự.");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword, confirmPassword }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        error(json.error?.message || "Đổi mật khẩu thất bại.");
        setSavingPassword(false);
        return;
      }

      success("Đổi mật khẩu thành công! Hãy ghi nhớ mật khẩu mới của bạn.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");

      if (mustChange) {
        router.push("/");
      }
    } catch {
      error("Lỗi khi kết nối đến máy chủ.");
    } finally {
      setSavingPassword(false);
    }
  };

  // Handlers for Vault PIN
  const handleSetupPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialPin || !initialConfirmPin) {
      error("Vui lòng nhập đầy đủ mã PIN và xác nhận PIN.");
      return;
    }

    if (initialPin.length !== pinLengthChoice) {
      error(`Mã PIN phải có đúng ${pinLengthChoice} chữ số.`);
      return;
    }

    if (initialPin !== initialConfirmPin) {
      error("Mã PIN xác nhận không khớp.");
      return;
    }

    setSettingPin(true);
    try {
      const res = await fetch("/api/me/vault-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: initialPin, confirmPin: initialConfirmPin }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        error(json.error?.message || "Lỗi thiết lập mã PIN.");
        return;
      }

      success(json.message || "Thiết lập mã PIN bảo vệ Két thành công!");
      setInitialPin("");
      setInitialConfirmPin("");
      fetchPinStatus();
    } catch {
      error("Lỗi kết nối máy chủ.");
    } finally {
      setSettingPin(false);
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPin || !changeNewPin || !changeConfirmPin) {
      error("Vui lòng nhập đầy đủ PIN hiện tại và PIN mới.");
      return;
    }

    if (!/^\d{4}$|^\d{6}$/.test(changeNewPin)) {
      error("Mã PIN mới phải có độ dài 4 hoặc 6 chữ số.");
      return;
    }

    if (changeNewPin !== changeConfirmPin) {
      error("Mã PIN mới xác nhận không khớp.");
      return;
    }

    setChangingPin(true);
    try {
      const res = await fetch("/api/me/vault-pin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPin,
          newPin: changeNewPin,
          confirmPin: changeConfirmPin,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        error(json.error?.message || "Đổi mã PIN thất bại.");
        fetchPinStatus();
        return;
      }

      success(json.message || "Đổi mã PIN bảo mật thành công!");
      setCurrentPin("");
      setChangeNewPin("");
      setChangeConfirmPin("");
      fetchPinStatus();
    } catch {
      error("Lỗi kết nối máy chủ.");
    } finally {
      setChangingPin(false);
    }
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetAccountPassword || !resetNewPin || !resetConfirmPin) {
      error("Vui lòng điền đầy đủ mật khẩu hệ thống và mã PIN mới.");
      return;
    }

    if (!/^\d{4}$|^\d{6}$/.test(resetNewPin)) {
      error("Mã PIN mới phải gồm 4 hoặc 6 chữ số.");
      return;
    }

    if (resetNewPin !== resetConfirmPin) {
      error("Mã PIN mới và xác nhận không khớp.");
      return;
    }

    setResettingPin(true);
    try {
      const res = await fetch("/api/me/vault-pin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: resetAccountPassword,
          newPin: resetNewPin,
          confirmPin: resetConfirmPin,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        error(json.error?.message || "Đặt lại PIN thất bại.");
        return;
      }

      success(json.message || "Đặt lại mã PIN thành công!");
      setResetAccountPassword("");
      setResetNewPin("");
      setResetConfirmPin("");
      setShowResetPinModal(false);
      fetchPinStatus();
    } catch {
      error("Lỗi kết nối máy chủ.");
    } finally {
      setResettingPin(false);
    }
  };

  // Handlers for Payment Profile
  const handleBankSelect = (code: string) => {
    setBankCode(code);
    if (code !== "OTHER") {
      const found = POPULAR_BANKS.find((b) => b.code === code);
      if (found) setBankName(found.name);
    } else {
      setBankName("");
    }
  };

  const handleSavePaymentProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveBankCode = bankCode === "OTHER" ? customBankCode.trim().toUpperCase() : bankCode;

    if (!effectiveBankCode) {
      error("Vui lòng chọn hoặc nhập mã ngân hàng.");
      return;
    }

    if (!accountNumber.trim()) {
      error("Số tài khoản không được để trống.");
      return;
    }

    if (!accountHolderName.trim()) {
      error("Tên chủ tài khoản không được để trống.");
      return;
    }

    setSavingPayment(true);
    try {
      const res = await fetch("/api/me/payment-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankCode: effectiveBankCode,
          bankName: bankName.trim() || effectiveBankCode,
          accountNumber: accountNumber.trim(),
          accountHolderName: accountHolderName.trim(),
          branch: branch.trim(),
          defaultContent: defaultContent.trim() || "ORDER",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        error(json.error?.message || "Lỗi lưu thông tin thanh toán.");
        return;
      }

      success("Đã lưu thông tin tài khoản ngân hàng mặc định thành công!");
      fetchPaymentProfile();
    } catch {
      error("Lỗi kết nối máy chủ.");
    } finally {
      setSavingPayment(false);
    }
  };

  const handleDeletePaymentProfile = async () => {
    const ok = await confirm({
      title: "Xóa tài khoản ngân hàng?",
      message: "Bạn có chắc chắn muốn xóa thông tin tài khoản ngân hàng cá nhân? Sau khi xóa, bạn sẽ cần thiết lập lại khi tham gia các đơn đặt nhóm.",
      confirmText: "Xóa thông tin",
      variant: "danger",
    });
    if (!ok) return;

    setDeletingPayment(true);
    try {
      const res = await fetch("/api/me/payment-profile", { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        success("Đã xóa thông tin tài khoản thanh toán.");
        setPaymentProfile(null);
        setAccountNumber("");
        setAccountHolderName("");
        setBranch("");
      } else {
        error(json.error?.message || "Lỗi xóa thông tin.");
      }
    } catch {
      error("Lỗi kết nối máy chủ.");
    } finally {
      setDeletingPayment(false);
    }
  };

  // Password Strength Evaluation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: "Chưa nhập", color: "bg-slate-700" };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { score: 1, label: "Yếu", color: "bg-rose-500" };
    if (score <= 4) return { score: 2, label: "Trung bình", color: "bg-amber-500" };
    return { score: 3, label: "Rất mạnh", color: "bg-emerald-500" };
  };

  const strength = getPasswordStrength(newPassword);

  const formatLockMinutes = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s < 10 ? "0" : ""}${s}s`;
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F1F3F6] min-h-screen">
      <Header
        title="Hồ sơ Cá nhân & Bảo mật"
        subtitle="Quản trị mật khẩu đăng nhập, mã PIN bảo vệ Két tài khoản và cấu hình ngân hàng thụ hưởng VietQR"
      />

      <div className="p-6 md:p-8 space-y-5 max-w-6xl w-full mx-auto">
        {mustChange && (
          <div className="p-4 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] text-xs flex items-start gap-3 shadow-xs">
            <div className="w-8 h-8 rounded-md bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs text-[#92400E]">Yêu cầu Đổi Mật khẩu Bắt buộc</div>
              <p className="mt-0.5 leading-relaxed">
                Tài khoản của bạn vừa được cấp mới hoặc đặt lại bởi Quản trị viên. Vì lý do an toàn thông tin, vui lòng đổi sang mật khẩu cá nhân trước khi tiếp tục thao tác trên hệ thống.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* User Info Card (1 col) */}
          <div className="p-5 rounded-lg bg-white border border-[#DDE2E9] shadow-xs space-y-4 h-fit">
            <div className="text-center pb-4 border-b border-[#EDF1F5]">
              <div className="w-16 h-16 rounded-lg bg-[#E5EDFA] text-[#2457A7] border border-[#CBD5E1] flex items-center justify-center font-bold text-xl uppercase mx-auto mb-3 shadow-xs">
                {user?.staff?.fullName ? user.staff.fullName.charAt(0) : user?.username?.charAt(0) || "U"}
              </div>
              <h2 className="font-bold text-base text-[#172033]">
                {user?.staff?.fullName || user?.username}
              </h2>
              <div className="text-xs font-mono text-[#64748B] mt-0.5">
                @{user?.username}
              </div>
              <div className="mt-2.5">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                    user?.role === "admin"
                      ? "bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]"
                      : user?.role === "pm"
                      ? "bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]"
                      : "bg-[#E5EDFA] text-[#2457A7] border border-[#CBD5E1]"
                  }`}
                >
                  {user?.roleName || (user?.role === "admin" ? "Quản trị viên (ADMIN)" : user?.role === "pm" ? "Quản lý dự án (PM)" : "Nhân viên dự án")}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-md bg-[#F8FAFC] border border-[#EDF1F5] space-y-0.5">
                <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Email công ty:</span>
                <div className="text-[#172033] font-medium truncate">{user?.staff?.corporateEmail || "Chưa cập nhật"}</div>
              </div>

              <div className="p-2.5 rounded-md bg-[#F8FAFC] border border-[#EDF1F5] space-y-0.5">
                <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Số điện thoại:</span>
                <div className="text-[#172033] font-medium">{user?.staff?.phoneNumber || "Chưa cập nhật"}</div>
              </div>

              <div className="p-2.5 rounded-md bg-[#F8FAFC] border border-[#EDF1F5] space-y-0.5">
                <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Phòng ban:</span>
                <div className="text-[#172033] font-medium">{user?.staff?.department || "Chưa cập nhật"}</div>
              </div>

              {/* Status summary pill */}
              <div className="pt-2 border-t border-[#EDF1F5] space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#64748B]">PIN Két:</span>
                  {pinStatus.hasPin ? (
                    <span className="text-[#15803D] font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#15803D]" />
                      Đã kích hoạt ({pinStatus.pinLength} số)
                    </span>
                  ) : (
                    <span className="text-[#B45309] font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#B45309]" />
                      Chưa thiết lập
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#64748B]">Tài khoản Ngân hàng:</span>
                  {paymentProfile?.accountNumber ? (
                    <span className="text-[#2457A7] font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-[#2457A7]" />
                      {paymentProfile.bankCode}
                    </span>
                  ) : (
                    <span className="text-[#94A3B8] italic">Chưa cấu hình</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Tabs Container (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Navigation Tabs Header */}
            <div className="p-1 rounded-lg bg-white border border-[#DDE2E9] shadow-xs grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("password")}
                className={`py-2 px-3 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === "password"
                    ? "bg-[#2457A7] text-white shadow-xs"
                    : "text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC]"
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mật khẩu Tool</span>
                <span className="sm:hidden">Mật khẩu</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("vault-pin")}
                className={`py-2 px-3 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === "vault-pin"
                    ? "bg-[#2457A7] text-white shadow-xs"
                    : "text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC]"
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Bảo mật PIN Két</span>
                <span className="sm:hidden">PIN Két</span>
                {pinStatus.hasPin && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("payment")}
                className={`py-2 px-3 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === "payment"
                    ? "bg-[#2457A7] text-white shadow-xs"
                    : "text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC]"
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Thông tin Thanh toán</span>
                <span className="sm:hidden">Ngân hàng</span>
              </button>
            </div>

            {/* TAB 1: CHANGE TOOL PASSWORD */}
            {activeTab === "password" && (
              <div className="p-5 sm:p-6 rounded-lg bg-white border border-[#DDE2E9] shadow-xs space-y-5">
                <div className="flex items-center gap-2.5 pb-3 border-b border-[#EDF1F5]">
                  <div className="w-8 h-8 rounded-md bg-[#E5EDFA] text-[#2457A7] border border-[#CBD5E1] flex items-center justify-center">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#172033]">Thay đổi Mật khẩu Đăng nhập</h3>
                    <p className="text-xs text-[#64748B]">
                      Mật khẩu đăng nhập hệ thống (tối thiểu 8 ký tự, khuyến nghị bao gồm chữ hoa, số và ký tự đặc biệt)
                    </p>
                  </div>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#172033] uppercase tracking-wider">
                      Mật khẩu hiện tại <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="Nhập mật khẩu hiện tại..."
                        className="w-full px-3 py-1.5 pr-10 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7] font-mono transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2 text-[#94A3B8] hover:text-[#172033]"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#172033] uppercase tracking-wider flex items-center justify-between">
                      <span>Mật khẩu mới <span className="text-rose-500">*</span></span>
                      {newPassword && (
                        <span className="text-[11px] font-medium text-[#64748B]">
                          Độ mạnh: <strong className={strength.score === 3 ? "text-[#15803D]" : strength.score === 2 ? "text-[#B45309]" : "text-[#B91C1C]"}>{strength.label}</strong>
                        </span>
                      )}
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)..."
                      className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7] font-mono transition-colors"
                    />

                    {newPassword && (
                      <div className="grid grid-cols-3 gap-1 pt-0.5">
                        <div className={`h-1 rounded-full transition-all ${strength.score >= 1 ? strength.color : "bg-slate-200"}`} />
                        <div className={`h-1 rounded-full transition-all ${strength.score >= 2 ? strength.color : "bg-slate-200"}`} />
                        <div className={`h-1 rounded-full transition-all ${strength.score >= 3 ? strength.color : "bg-slate-200"}`} />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#172033] uppercase tracking-wider">
                      Xác nhận Mật khẩu mới <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới..."
                      className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7] font-mono transition-colors"
                    />
                  </div>

                  <div className="pt-2 border-t border-[#EDF1F5] flex justify-end">
                    <button
                      type="submit"
                      disabled={savingPassword}
                      className="px-4 py-1.5 rounded-md text-xs font-semibold bg-[#2457A7] hover:bg-[#1C4585] text-white shadow-xs disabled:opacity-50 transition-colors"
                    >
                      {savingPassword ? "Đang cập nhật..." : "Cập nhật Mật khẩu"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: VAULT PIN SECURITY */}
            {activeTab === "vault-pin" && (
              <div className="p-5 sm:p-6 rounded-lg bg-white border border-[#DDE2E9] shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#EDF1F5]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-md bg-[#E5EDFA] text-[#2457A7] border border-[#CBD5E1] flex items-center justify-center">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#172033]">Bảo mật Két (Mã PIN Cá nhân)</h3>
                      <p className="text-xs text-[#64748B]">
                        Mã PIN chỉ dùng để xác thực quyền khi xem mật khẩu tài khoản riêng tư trong Két
                      </p>
                    </div>
                  </div>

                  {pinStatus.hasPin ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0] flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Đã kích hoạt ({pinStatus.pinLength} số)
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Chưa thiết lập
                    </span>
                  )}
                </div>

                {/* Lock banner if locked */}
                {pinStatus.isLocked && (
                  <div className="p-3 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-xs flex items-center gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-[#B91C1C] shrink-0" />
                    <div>
                      <div className="font-semibold text-[#991B1B]">Xác thực PIN đang bị tạm khóa</div>
                      <div className="text-[11px] text-[#B91C1C]">
                        Bạn đã nhập sai PIN 5 lần liên tiếp. Thời gian mở khóa tự động: <strong>{formatLockMinutes(pinStatus.remainingLockSeconds)}</strong>.
                      </div>
                    </div>
                  </div>
                )}

                {/* SCENARIO A: Chưa thiết lập PIN lần đầu */}
                {!pinStatus.hasPin ? (
                  <form onSubmit={handleSetupPin} className="space-y-4 text-xs">
                    <div className="p-3 rounded-md bg-[#F8FAFC] border border-[#DDE2E9] text-[#172033] space-y-1">
                      <div className="font-semibold text-[#172033] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#2457A7]" />
                        Thiết lập mã PIN bảo vệ Két lần đầu
                      </div>
                      <p className="text-[11px] leading-relaxed text-[#64748B]">
                        Bạn có thể chọn độ dài <strong>4 hoặc 6 chữ số</strong> (0-9). Sau khi tạo, mã PIN được mã hóa an toàn và chỉ mình bạn biết.
                      </p>
                    </div>

                    {/* Choice 4 or 6 digits */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-[#172033] uppercase tracking-wider">
                        Chọn độ dài mã PIN:
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setPinLengthChoice(4);
                            setInitialPin("");
                            setInitialConfirmPin("");
                          }}
                          className={`p-2.5 rounded-md border text-center transition-all ${
                            pinLengthChoice === 4
                              ? "bg-[#E5EDFA] border-[#2457A7] text-[#2457A7] font-semibold shadow-xs"
                              : "bg-white border-[#DDE2E9] text-[#64748B] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <div className="text-sm font-bold">4 Chữ số</div>
                          <div className="text-[10px] text-[#64748B] mt-0.5">Tiện lợi, thao tác nhanh</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setPinLengthChoice(6);
                            setInitialPin("");
                            setInitialConfirmPin("");
                          }}
                          className={`p-2.5 rounded-md border text-center transition-all ${
                            pinLengthChoice === 6
                              ? "bg-[#E5EDFA] border-[#2457A7] text-[#2457A7] font-semibold shadow-xs"
                              : "bg-white border-[#DDE2E9] text-[#64748B] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <div className="text-sm font-bold">6 Chữ số</div>
                          <div className="text-[10px] text-[#64748B] mt-0.5">Bảo mật nâng cao (Khuyên dùng)</div>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-[#172033] uppercase tracking-wider">
                          Mã PIN ({pinLengthChoice} số) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="password"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={pinLengthChoice}
                          required
                          value={initialPin}
                          onChange={(e) => setInitialPin(e.target.value.replace(/\D/g, ""))}
                          placeholder={pinLengthChoice === 4 ? "••••" : "••••••"}
                          className="w-full px-3 py-2 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-center text-base tracking-[0.4em] font-mono focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-[#172033] uppercase tracking-wider">
                          Xác nhận lại mã PIN <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="password"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={pinLengthChoice}
                          required
                          value={initialConfirmPin}
                          onChange={(e) => setInitialConfirmPin(e.target.value.replace(/\D/g, ""))}
                          placeholder={pinLengthChoice === 4 ? "••••" : "••••••"}
                          className="w-full px-3 py-2 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-center text-base tracking-[0.4em] font-mono focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7]"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#EDF1F5] flex justify-end">
                      <button
                        type="submit"
                        disabled={settingPin || initialPin.length !== pinLengthChoice}
                        className="px-4 py-1.5 rounded-md text-xs font-semibold bg-[#2457A7] hover:bg-[#1C4585] text-white shadow-xs disabled:opacity-50 transition-colors"
                      >
                        {settingPin ? "Đang lưu PIN..." : "Kích hoạt Bảo vệ PIN"}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* SCENARIO B: Đã thiết lập PIN -> Đổi PIN hoặc Đặt lại PIN */
                  <div className="space-y-4">
                    <form onSubmit={handleChangePin} className="space-y-4 text-xs">
                      <div className="text-xs font-bold text-[#172033] uppercase tracking-wider flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5 text-[#2457A7]" />
                        Đổi mã PIN bảo mật
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-[#172033] uppercase tracking-wider">
                          Mã PIN hiện tại <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="password"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          required
                          value={currentPin}
                          onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
                          placeholder="Nhập mã PIN hiện tại..."
                          className="w-full sm:max-w-xs px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-center text-sm tracking-[0.3em] font-mono focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7]"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-[#172033] uppercase tracking-wider">
                            Mã PIN mới (4 hoặc 6 số) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="password"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            required
                            value={changeNewPin}
                            onChange={(e) => setChangeNewPin(e.target.value.replace(/\D/g, ""))}
                            placeholder="Nhập PIN mới..."
                            className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-center text-sm tracking-[0.3em] font-mono focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-[#172033] uppercase tracking-wider">
                            Xác nhận PIN mới <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="password"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            required
                            value={changeConfirmPin}
                            onChange={(e) => setChangeConfirmPin(e.target.value.replace(/\D/g, ""))}
                            placeholder="Xác nhận PIN mới..."
                            className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-center text-sm tracking-[0.3em] font-mono focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7]"
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-[#EDF1F5]">
                        <button
                          type="button"
                          onClick={() => setShowResetPinModal(true)}
                          className="text-xs font-semibold text-[#2457A7] hover:underline flex items-center gap-1"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Quên mã PIN? Đặt lại bằng Mật khẩu</span>
                        </button>

                        <button
                          type="submit"
                          disabled={changingPin || !currentPin || !changeNewPin}
                          className="px-4 py-1.5 rounded-md text-xs font-semibold bg-[#2457A7] hover:bg-[#1C4585] text-white shadow-xs transition-colors disabled:opacity-50"
                        >
                          {changingPin ? "Đang đổi PIN..." : "Cập nhật mã PIN"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: PAYMENT PROFILE (NGÂN HÀNG MẶC ĐỊNH) */}
            {activeTab === "payment" && (
              <div className="p-5 sm:p-6 rounded-lg bg-white border border-[#DDE2E9] shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#EDF1F5]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-md bg-[#E5EDFA] text-[#2457A7] border border-[#CBD5E1] flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#172033]">Tài khoản Ngân hàng Mặc định</h3>
                      <p className="text-xs text-[#64748B]">
                        Tự động điền khi tạo lời nhắc thanh toán đơn hàng nhóm cho bạn
                      </p>
                    </div>
                  </div>

                  {paymentProfile?.accountNumber ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0] flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Đã cấu hình
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#F8FAFC] text-[#64748B] border border-[#DDE2E9] flex items-center gap-1">
                      Chưa cấu hình
                    </span>
                  )}
                </div>

                <form onSubmit={handleSavePaymentProfile} className="space-y-4 text-xs">
                  {/* Bank Select */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#172033] uppercase tracking-wider">
                      Ngân hàng thụ hưởng <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={bankCode}
                      onChange={(e) => handleBankSelect(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7]"
                    >
                      {POPULAR_BANKS.map((b) => (
                        <option key={b.code} value={b.code}>
                          {b.code} — {b.name}
                        </option>
                      ))}
                      <option value="OTHER">Ngân hàng khác (Tự nhập)</option>
                    </select>
                  </div>

                  {bankCode === "OTHER" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-[#172033] uppercase tracking-wider">
                          Mã ngân hàng (VietQR / Napas) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={customBankCode}
                          onChange={(e) => setCustomBankCode(e.target.value.toUpperCase())}
                          placeholder="VD: VAB, NAB..."
                          className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs font-mono uppercase focus:ring-1 focus:ring-[#2457A7]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-[#172033] uppercase tracking-wider">
                          Tên ngân hàng
                        </label>
                        <input
                          type="text"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          placeholder="Tên ngân hàng..."
                          className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs focus:ring-1 focus:ring-[#2457A7]"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Account Number */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#172033] uppercase tracking-wider">
                        Số tài khoản <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value.replace(/\s+/g, ""))}
                        placeholder="VD: 001234567890 (giữ số 0 đầu)"
                        className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#2457A7]"
                      />
                    </div>

                    {/* Account Holder Name */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#172033] uppercase tracking-wider">
                        Tên chủ tài khoản (In hoa) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={accountHolderName}
                        onChange={(e) => setAccountHolderName(e.target.value.toUpperCase())}
                        placeholder="VD: NGUYEN VAN A"
                        className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-[#2457A7]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Branch */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#172033] uppercase tracking-wider">
                        Chi nhánh ngân hàng (Tùy chọn)
                      </label>
                      <input
                        type="text"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        placeholder="VD: Chi nhánh Ba Đình, TP.HCM..."
                        className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7]"
                      />
                    </div>

                    {/* Default Content */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#172033] uppercase tracking-wider">
                        Cú pháp CK mặc định
                      </label>
                      <input
                        type="text"
                        value={defaultContent}
                        onChange={(e) => setDefaultContent(e.target.value)}
                        placeholder="VD: ORDER"
                        className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#2457A7]"
                      />
                    </div>
                  </div>

                  {/* VietQR Preview Box */}
                  {accountNumber && (
                    <div className="p-3.5 rounded-md bg-[#F8FAFC] border border-[#DDE2E9] flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Xem trước thông tin hiển thị</div>
                        <div className="font-mono font-bold text-xs text-[#172033]">{accountNumber}</div>
                        <div className="text-xs font-semibold text-[#172033]">{accountHolderName || "CHỦ TÀI KHOẢN"}</div>
                        <div className="text-[11px] text-[#64748B]">{bankName || bankCode} {branch ? `• ${branch}` : ""}</div>
                      </div>
                      <div className="w-10 h-10 rounded-md bg-[#E5EDFA] text-[#2457A7] border border-[#CBD5E1] flex items-center justify-center">
                        <QrCode className="w-5 h-5" />
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#EDF1F5] flex items-center justify-between">
                    {paymentProfile?.accountNumber ? (
                      <button
                        type="button"
                        disabled={deletingPayment}
                        onClick={handleDeletePaymentProfile}
                        className="px-3 py-1.5 rounded-md text-xs font-medium text-[#B91C1C] hover:text-red-700 hover:bg-[#FEF2F2] border border-[#FECACA] transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa thông tin</span>
                      </button>
                    ) : <div />}

                    <button
                      type="submit"
                      disabled={savingPayment}
                      className="px-4 py-1.5 rounded-md text-xs font-semibold bg-[#2457A7] hover:bg-[#1C4585] text-white shadow-xs disabled:opacity-50 transition-colors flex items-center gap-1.5"
                    >
                      {savingPayment ? "Đang lưu..." : "Lưu thông tin Thanh toán"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Đặt lại PIN bằng mật khẩu */}
      {showResetPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md p-5 rounded-lg bg-white border border-[#DDE2E9] shadow-lg space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#EDF1F5]">
              <div className="w-8 h-8 rounded-md bg-[#E5EDFA] text-[#2457A7] border border-[#CBD5E1] flex items-center justify-center">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-[#172033]">Đặt lại mã PIN bảo mật</h3>
                <p className="text-[11px] text-[#64748B]">Xác thực danh tính bằng mật khẩu đăng nhập hệ thống</p>
              </div>
            </div>

            <form onSubmit={handleResetPin} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#172033] uppercase tracking-wider">
                  Mật khẩu tài khoản Tool của bạn <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={resetAccountPassword}
                  onChange={(e) => setResetAccountPassword(e.target.value)}
                  placeholder="Nhập mật khẩu tài khoản hệ thống..."
                  className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7] font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#172033] uppercase tracking-wider">
                    PIN mới (4 hoặc 6 số) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    value={resetNewPin}
                    onChange={(e) => setResetNewPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••••"
                    className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-center text-sm font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-[#2457A7]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#172033] uppercase tracking-wider">
                    Xác nhận PIN mới <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    value={resetConfirmPin}
                    onChange={(e) => setResetConfirmPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••••"
                    className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-center text-sm font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-[#2457A7]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EDF1F5]">
                <button
                  type="button"
                  onClick={() => setShowResetPinModal(false)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC] border border-[#DDE2E9] transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={resettingPin}
                  className="px-4 py-1.5 rounded-md text-xs font-semibold bg-[#2457A7] hover:bg-[#1C4585] text-white shadow-xs transition-colors disabled:opacity-50"
                >
                  {resettingPin ? "Đang đặt lại..." : "Xác nhận Đặt lại PIN"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
