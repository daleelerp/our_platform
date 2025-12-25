"use client";

import { useState, useRef, useEffect } from "react";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
};

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your content here...",
  rows = 12,
  className = "",
}: RichTextEditorProps) {
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isList, setIsList] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyFormat = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const beforeText = value.substring(0, start);
    const afterText = value.substring(end);

    let formattedText = "";
    let newCursorPos = start;

    switch (tag) {
      case "bold":
        formattedText = `**${selectedText || "bold text"}**`;
        newCursorPos = start + (selectedText ? selectedText.length + 4 : 10);
        break;
      case "italic":
        formattedText = `*${selectedText || "italic text"}*`;
        newCursorPos = start + (selectedText ? selectedText.length + 2 : 11);
        break;
      case "list":
        const lines = selectedText.split("\n").filter((l) => l.trim());
        if (lines.length > 0) {
          formattedText = lines.map((line) => `- ${line}`).join("\n");
        } else {
          formattedText = "- List item";
          newCursorPos = start + 12;
        }
        break;
      case "heading":
        formattedText = `## ${selectedText || "Heading"}`;
        newCursorPos = start + (selectedText ? selectedText.length + 3 : 9);
        break;
      case "link":
        formattedText = `[${selectedText || "link text"}](url)`;
        newCursorPos = start + (selectedText ? selectedText.length + 3 : 9);
        break;
    }

    const newValue = beforeText + formattedText + afterText;
    onChange(newValue);

    // Set cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <div className={`border border-slate-300 rounded-lg overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-slate-50 border-b border-slate-200">
        <button
          type="button"
          onClick={() => applyFormat("bold")}
          className="px-2 py-1 text-xs font-bold hover:bg-slate-200 rounded transition-colors"
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => applyFormat("italic")}
          className="px-2 py-1 text-xs italic hover:bg-slate-200 rounded transition-colors"
          title="Italic"
        >
          <em>I</em>
        </button>
        <div className="w-px h-4 bg-slate-300 mx-1" />
        <button
          type="button"
          onClick={() => applyFormat("heading")}
          className="px-2 py-1 text-xs hover:bg-slate-200 rounded transition-colors"
          title="Heading"
        >
          H
        </button>
        <button
          type="button"
          onClick={() => applyFormat("list")}
          className="px-2 py-1 text-xs hover:bg-slate-200 rounded transition-colors"
          title="List"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => applyFormat("link")}
          className="px-2 py-1 text-xs hover:bg-slate-200 rounded transition-colors"
          title="Link"
        >
          🔗
        </button>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none outline-none"
        style={{ minHeight: `${rows * 1.5}rem` }}
      />

      {/* Preview hint */}
      <div className="px-3 py-1 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-500">
        Supports Markdown: **bold**, *italic*, ## heading, - list, [link](url)
      </div>
    </div>
  );
}

