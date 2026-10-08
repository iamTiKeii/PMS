"use client";

import React, { useRef, useEffect } from "react";
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Table as TableIcon,
  Undo,
  Redo,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Nhập nội dung chi tiết...",
  minHeight = "200px",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    if (editorRef.current && !isUpdatingRef.current) {
      if (editorRef.current.innerHTML !== (value || "")) {
        editorRef.current.innerHTML = value || "";
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      isUpdatingRef.current = true;
      const html = editorRef.current.innerHTML;
      onChange(html === "<p><br></p>" || html === "<br>" ? "" : html);
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 50);
    }
  };

  const executeCommand = (command: string, arg: string | undefined = undefined) => {
    if (typeof document !== "undefined") {
      document.execCommand(command, false, arg);
      handleInput();
      editorRef.current?.focus();
    }
  };

  const handleInsertLink = () => {
    const url = prompt("Nhập đường dẫn URL (bắt đầu bằng https:// hoặc http://):");
    if (url) {
      executeCommand("createLink", url);
    }
  };

  const handleInsertTable = () => {
    const rows = prompt("Nhập số dòng của bảng:", "3");
    const cols = prompt("Nhập số cột của bảng:", "3");
    const r = parseInt(rows || "3", 10);
    const c = parseInt(cols || "3", 10);
    if (r > 0 && c > 0) {
      let tableHtml = `<table style="width:100%; border-collapse:collapse; margin:12px 0; border:1px solid #334155;">`;
      tableHtml += `<thead><tr>`;
      for (let j = 0; j < c; j++) {
        tableHtml += `<th style="border:1px solid #334155; padding:8px; background-color:#1e293b; color:#93c5fd; text-align:left;">Tiêu đề ${j + 1}</th>`;
      }
      tableHtml += `</tr></thead><tbody>`;
      for (let i = 0; i < r - 1; i++) {
        tableHtml += `<tr>`;
        for (let j = 0; j < c; j++) {
          tableHtml += `<td style="border:1px solid #334155; padding:8px; color:#e2e8f0;">Dữ liệu ${i + 1}-${j + 1}</td>`;
        }
        tableHtml += `</tr>`;
      }
      tableHtml += `</tbody></table><p><br></p>`;
      executeCommand("insertHTML", tableHtml);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-700/80 bg-slate-950 overflow-hidden focus-within:border-blue-500/80 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all shadow-inner">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-900/90 border-b border-slate-800 text-slate-300">
        <button
          type="button"
          onClick={() => executeCommand("bold")}
          className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
          title="In đậm (Bold - Ctrl+B)"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("italic")}
          className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
          title="In nghiêng (Italic - Ctrl+I)"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("underline")}
          className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
          title="Gạch chân (Underline - Ctrl+U)"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-slate-700 mx-1" />

        <button
          type="button"
          onClick={() => executeCommand("formatBlock", "<h1>")}
          className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
          title="Tiêu đề 1 (Heading 1)"
        >
          <Heading1 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("formatBlock", "<h2>")}
          className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
          title="Tiêu đề 2 (Heading 2)"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-slate-700 mx-1" />

        <button
          type="button"
          onClick={() => executeCommand("insertUnorderedList")}
          className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
          title="Danh sách dấu đầu dòng"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("insertOrderedList")}
          className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
          title="Danh sách số"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-slate-700 mx-1" />

        <button
          type="button"
          onClick={() => executeCommand("formatBlock", "<blockquote>")}
          className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
          title="Trích dẫn (Quote)"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("formatBlock", "<pre>")}
          className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
          title="Khối mã (Code block)"
        >
          <Code className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleInsertLink}
          className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
          title="Chèn liên kết URL"
        >
          <LinkIcon className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleInsertTable}
          className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
          title="Chèn bảng dữ liệu"
        >
          <TableIcon className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-slate-700 mx-1 ml-auto" />

        <button
          type="button"
          onClick={() => executeCommand("undo")}
          className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
          title="Hoàn tác (Undo)"
        >
          <Undo className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("redo")}
          className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
          title="Làm lại (Redo)"
        >
          <Redo className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Editable Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        style={{ minHeight }}
        data-placeholder={placeholder}
        className="p-4 text-sm text-slate-100 outline-none overflow-y-auto max-h-[420px] prose prose-invert prose-sm max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-slate-500 empty:before:pointer-events-none"
      />
    </div>
  );
}
