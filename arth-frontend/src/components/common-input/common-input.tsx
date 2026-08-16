import  type { ChangeEvent } from "react";

// Define strict types for the props passed from CommonForm
interface CommonInputProps {
    label: string;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
    value: string | number;
    placeholder?: string;
    id: string;
    name: string;
    type?: string;
}

export default function CommonInput({
    label,
    onChange,
    value,
    placeholder,
    id,
    name,
    type = "text"
}: CommonInputProps) {
    return (
        <div className="flex flex-col w-full mb-4">
            <label htmlFor={id} className="mb-1 text-sm font-medium text-slate-700">
                {label}
            </label>

            <input
                name={name}
                id={id}
                placeholder={placeholder || "Enter the value"}
                value={value}
                onChange={onChange}
                type={type}
                className="w-full px-4 py-2 border border-slate-300 rounded-md outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 bg-white transition-colors"
            />
        </div>
    );
}