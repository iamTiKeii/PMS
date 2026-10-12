"use client";

import React, { useState, useRef, useEffect, useId, useCallback } from "react";
import { Check, ChevronDown, X, Search, Loader2 } from "lucide-react";

export interface ComboboxOption {
  value: string;
  label: string;
  subLabel?: string;
  badge?: string;
  disabled?: boolean;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string, selectedOption?: ComboboxOption) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
  disabled?: boolean;
  required?: boolean;
  clearable?: boolean;
  allowCustomValue?: boolean;
  onCustomValueCommit?: (text: string) => void;
  loading?: boolean;
  emptyText?: string;
  className?: string;
  id?: string;
  name?: string;
  autoFocus?: boolean;
}

/**
 * Enterprise WAI-ARIA Combobox Component (Searchable Dropdown)
 * Conforms to W3C ARIA 1.2 Combobox pattern:
 * - role="combobox", role="listbox", role="option"
 * - aria-expanded, aria-controls, aria-activedescendant, aria-selected
 * - Keyboard navigation: ArrowUp, ArrowDown, Enter, Escape, Home, End
 * - Type-to-filter with instant highlight
 * - Focus remains on input while navigating listbox
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Chọn giá trị...",
  searchPlaceholder = "Tìm kiếm...",
  label,
  disabled = false,
  required = false,
  clearable = true,
  allowCustomValue = false,
  onCustomValueCommit,
  loading = false,
  emptyText = "Không tìm thấy kết quả phù hợp",
  className = "",
  id: propId,
  autoFocus = false,
}: ComboboxProps) {
  const generatedId = useId();
  const baseId = propId || generatedId;
  const listboxId = `${baseId}-listbox`;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  // Find currently selected option
  const selectedOption = options.find((opt) => opt.value === value);

  // Filter options based on query
  const filteredOptions = options.filter((opt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      opt.label.toLowerCase().includes(q) ||
      (opt.subLabel && opt.subLabel.toLowerCase().includes(q)) ||
      (opt.badge && opt.badge.toLowerCase().includes(q))
    );
  });

  // Keep active index in bounds
  useEffect(() => {
    if (activeIndex >= filteredOptions.length) {
      setActiveIndex(filteredOptions.length > 0 ? 0 : -1);
    }
  }, [filteredOptions.length, activeIndex]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll active option into view
  useEffect(() => {
    if (isOpen && activeIndex >= 0 && listboxRef.current) {
      const activeElement = listboxRef.current.children[activeIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [isOpen, activeIndex]);

  // Handle select option
  const selectOption = useCallback(
    (opt: ComboboxOption) => {
      if (opt.disabled) return;
      onChange(opt.value, opt);
      setIsOpen(false);
      setSearchQuery("");
      setActiveIndex(-1);
      inputRef.current?.focus();
    },
    [onChange]
  );

  // Handle clear value
  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange("");
      setSearchQuery("");
      setActiveIndex(-1);
      inputRef.current?.focus();
    },
    [onChange]
  );

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
        // Set initial active index to selected item or first item
        const idx = filteredOptions.findIndex((opt) => opt.value === value);
        setActiveIndex(idx >= 0 ? idx : 0);
        return;
      }
    }

    if (isOpen) {
      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          setActiveIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
          break;
        }
        case "Home": {
          e.preventDefault();
          setActiveIndex(0);
          break;
        }
        case "End": {
          e.preventDefault();
          setActiveIndex(filteredOptions.length - 1);
          break;
        }
        case "Enter": {
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
            selectOption(filteredOptions[activeIndex]);
          } else if (allowCustomValue && searchQuery.trim()) {
            if (onCustomValueCommit) {
              onCustomValueCommit(searchQuery.trim());
            } else {
              onChange(searchQuery.trim());
            }
            setIsOpen(false);
            setSearchQuery("");
          }
          break;
        }
        case "Escape": {
          e.preventDefault();
          setIsOpen(false);
          setSearchQuery("");
          setActiveIndex(-1);
          break;
        }
        case "Tab": {
          setIsOpen(false);
          setSearchQuery("");
          setActiveIndex(-1);
          break;
        }
      }
    }
  };

  const activeOptionId =
    isOpen && activeIndex >= 0 && filteredOptions[activeIndex]
      ? `${baseId}-opt-${activeIndex}`
      : undefined;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={`${baseId}-input`}
          className="block text-xs font-semibold text-[#172033] mb-1"
        >
          {label}
          {required && <span className="text-[#B91C1C] ml-0.5">*</span>}
        </label>
      )}

      {/* Input wrapper */}
      <div
        className={`relative flex items-center w-full rounded-md border bg-white transition-all ${
          disabled
            ? "bg-[#F8FAFC] border-[#E2E8F0] cursor-not-allowed text-[#94A3B8]"
            : isOpen
            ? "border-[#2457A7] ring-1 ring-[#2457A7] shadow-xs"
            : "border-[#DDE2E9] hover:border-[#CBD5E1]"
        }`}
      >
        <input
          id={`${baseId}-input`}
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          aria-required={required}
          aria-disabled={disabled}
          disabled={disabled}
          autoFocus={autoFocus}
          value={isOpen ? searchQuery : selectedOption ? selectedOption.label : value || ""}
          placeholder={selectedOption ? selectedOption.label : placeholder}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
              setSearchQuery("");
            }
          }}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          className="w-full py-1.5 pl-3 pr-14 text-xs text-[#172033] placeholder-[#94A3B8] bg-transparent focus:outline-none"
        />

        {/* Clear & Dropdown Chevron */}
        <div className="absolute right-2 flex items-center gap-1 shrink-0">
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2457A7]" />}

          {!loading && clearable && (value || searchQuery) && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              tabIndex={-1}
              className="p-0.5 rounded text-[#94A3B8] hover:text-[#172033] transition-colors cursor-pointer"
              title="Xóa lựa chọn"
              aria-label="Xóa lựa chọn"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                if (isOpen) {
                  setIsOpen(false);
                } else {
                  inputRef.current?.focus();
                  setIsOpen(true);
                }
              }
            }}
            className="p-0.5 rounded text-[#64748B] hover:text-[#172033] transition-transform cursor-pointer"
            aria-label={isOpen ? "Đóng danh sách" : "Mở danh sách"}
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-150 ${
                isOpen ? "rotate-180 text-[#2457A7]" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Listbox Popup */}
      {isOpen && (
        <ul
          id={listboxId}
          ref={listboxRef}
          role="listbox"
          tabIndex={-1}
          aria-label={label || placeholder}
          className="absolute left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto rounded-md bg-white border border-[#DDE2E9] shadow-lg py-1 z-50 text-xs text-[#172033] animate-in fade-in zoom-in-95 duration-100"
        >
          {filteredOptions.length === 0 ? (
            <li className="px-3 py-3 text-center text-[#64748B] text-xs space-y-1">
              <Search className="w-4 h-4 text-[#94A3B8] mx-auto opacity-60" />
              <p>{emptyText}</p>
              {allowCustomValue && searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    if (onCustomValueCommit) {
                      onCustomValueCommit(searchQuery.trim());
                    } else {
                      onChange(searchQuery.trim());
                    }
                    setIsOpen(false);
                    setSearchQuery("");
                  }}
                  className="mt-1 text-[11px] font-semibold text-[#2457A7] hover:underline block mx-auto cursor-pointer"
                >
                  Sử dụng: "{searchQuery.trim()}"
                </button>
              )}
            </li>
          ) : (
            filteredOptions.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isActive = idx === activeIndex;

              return (
                <li
                  key={opt.value}
                  id={`${baseId}-opt-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={opt.disabled}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => selectOption(opt)}
                  className={`px-3 py-2 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                    opt.disabled
                      ? "opacity-40 cursor-not-allowed bg-transparent text-[#94A3B8]"
                      : isActive
                      ? "bg-[#E5EDFA] text-[#2457A7]"
                      : isSelected
                      ? "bg-[#F1F5F9] font-medium text-[#172033]"
                      : "text-[#172033] hover:bg-[#F8FAFC]"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{opt.label}</span>
                      {opt.badge && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-[#E2E8F0] text-[#475569]">
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    {opt.subLabel && (
                      <div className="text-[11px] text-[#64748B] truncate mt-0.5">
                        {opt.subLabel}
                      </div>
                    )}
                  </div>

                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-[#2457A7] shrink-0 font-bold" />
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

/**
 * MultiCombobox Component
 * For multi-select fields (e.g. followers, assignees)
 */
export function MultiCombobox({
  options,
  value = [],
  onChange,
  placeholder = "Chọn các mục...",
  label,
  disabled = false,
  required = false,
  emptyText = "Không tìm thấy kết quả phù hợp",
  className = "",
}: {
  options: ComboboxOption[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  required?: boolean;
  emptyText?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter((opt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      opt.label.toLowerCase().includes(q) ||
      (opt.subLabel && opt.subLabel.toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (optValue: string) => {
    if (value.includes(optValue)) {
      onChange(value.filter((v) => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  };

  const removeValue = (optValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== optValue));
  };

  const selectedOptions = options.filter((opt) => value.includes(opt.value));

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-[#172033] mb-1">
          {label}
          {required && <span className="text-[#B91C1C] ml-0.5">*</span>}
        </label>
      )}

      {/* Selected tags + Input */}
      <div
        onClick={() => {
          if (!disabled) setIsOpen(true);
        }}
        className={`min-h-[34px] p-1 rounded-md border bg-white flex flex-wrap items-center gap-1.5 transition-all cursor-pointer ${
          disabled
            ? "bg-[#F8FAFC] border-[#E2E8F0] cursor-not-allowed"
            : isOpen
            ? "border-[#2457A7] ring-1 ring-[#2457A7]"
            : "border-[#DDE2E9] hover:border-[#CBD5E1]"
        }`}
      >
        {selectedOptions.map((opt) => (
          <span
            key={opt.value}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#E5EDFA] text-[#2457A7] text-[11px] font-medium border border-[#BFD4F7]"
          >
            <span className="truncate max-w-[120px]">{opt.label}</span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => removeValue(opt.value, e)}
                className="hover:text-[#1C4585] p-0.2 cursor-pointer"
                aria-label={`Bỏ chọn ${opt.label}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}

        <input
          type="text"
          value={searchQuery}
          disabled={disabled}
          placeholder={selectedOptions.length === 0 ? placeholder : "Thêm..."}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          className="flex-1 min-w-[80px] bg-transparent py-0.5 px-1 text-xs text-[#172033] placeholder-[#94A3B8] focus:outline-none"
        />

        <div className="ml-auto pr-1">
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#64748B] transition-transform ${
              isOpen ? "rotate-180 text-[#2457A7]" : ""
            }`}
          />
        </div>
      </div>

      {isOpen && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto rounded-md bg-white border border-[#DDE2E9] shadow-lg py-1 z-50 text-xs text-[#172033] animate-in fade-in zoom-in-95 duration-100"
        >
          {filteredOptions.length === 0 ? (
            <li className="px-3 py-2 text-center text-[#64748B]">{emptyText}</li>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = value.includes(opt.value);
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => toggleOption(opt.value)}
                  className={`px-3 py-2 flex items-center justify-between gap-2 cursor-pointer hover:bg-[#F8FAFC] transition-colors ${
                    isSelected ? "bg-[#F1F5F9] font-medium" : ""
                  }`}
                >
                  <div>
                    <span className="block truncate">{opt.label}</span>
                    {opt.subLabel && (
                      <span className="block text-[11px] text-[#64748B]">
                        {opt.subLabel}
                      </span>
                    )}
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#2457A7]" />}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
