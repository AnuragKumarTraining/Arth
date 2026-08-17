import type { ChangeEvent } from "react";

interface CommonInputProps {
  label: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  value: string | number | undefined;
  placeholder?: string;
  id: string;
  name: string;
  type?: string;
  autoComplete?: string;
  disabled?: boolean;
  required?: boolean;
}

export default function CommonInput({
  label,
  onChange,
  value,
  placeholder,
  id,
  name,
  type = "text",
  autoComplete,
  disabled = false,
  required = false,
}: CommonInputProps) {
  return (
    <div className="flex flex-col w-full mb-4">
      <label htmlFor={id} className="mb-1 text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <input
        name={name}
        id={id}
        placeholder={placeholder || "Enter the value"}
        value={value ?? ""}
        onChange={onChange}
        type={type}
        autoComplete={autoComplete}
        disabled={disabled}
        required={required}
        className="w-full px-4 py-2 border border-slate-300 rounded-md outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 bg-white transition-colors disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
      />
    </div>
  );
}