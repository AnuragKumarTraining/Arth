import type {ChangeEvent, FormEvent } from "react";
import CommonInput from "../common-input/common-input";

// 1. Constants
const formTypes = {
    INPUT: 'input',
    SELECT: 'select',
    TEXTAREA: 'textarea'
} as const;

export interface OptionItem {
  id: string | number;
  label: string;
  value?: string | number;
}

export interface FormElement {
  name: string;
  id: string;
  placeholder?: string;
  label: string;
  componentType: 'input' | 'select' | 'textarea';
  type?: string;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
  options?: OptionItem[]; // Used specifically when componentType is 'select'
}

interface CommonFormProps {
    formControls: FormElement[];
    formData: Record<string, any>;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
    buttonText?: string;
    onHandleSubmit: (event) => void;
}

// 3. Component Implementation
export default function CommonForm({ 
    formControls = [], 
    formData, 
    setFormData, 
    buttonText, 
    onHandleSubmit 
}: CommonFormProps) {

    // Helper function to handle state updates efficiently
    const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [event.target.name]: event.target.value
        });
    };

    function renderFormElement(getCurrentElement: FormElement) {
        if (!getCurrentElement) return null;

        let content = null;

        switch (getCurrentElement.componentType) {
            case formTypes.INPUT:
                content = (
                    <CommonInput
                        label={getCurrentElement.label}
                        value={formData[getCurrentElement.name] || ''}
                        placeholder={getCurrentElement.placeholder}
                        id={getCurrentElement.id}
                        name={getCurrentElement.name}
                        type={getCurrentElement.type}
                        onChange={handleInputChange}
                    />
                );
                break;

            case formTypes.SELECT:
                content = (
                    <div className="flex flex-col w-full mb-4">
                        <label htmlFor={getCurrentElement.id} className="mb-1 text-sm font-medium text-slate-700">
                            {getCurrentElement.label}
                        </label>
                        <select
                            id={getCurrentElement.id}
                            name={getCurrentElement.name}
                            value={formData[getCurrentElement.name] || ''}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 border border-slate-300 rounded-md outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 bg-white transition-colors"
                        >
                            <option value="" disabled>
                                {getCurrentElement.placeholder || 'Select...'}
                            </option>
                            
                            {getCurrentElement.options && getCurrentElement.options.length > 0
                                ? getCurrentElement.options.map((optionItem) => (
                                    <option key={optionItem.id} value={optionItem.id}>
                                        {optionItem.label}
                                    </option>
                                ))
                                : null}
                        </select>
                    </div>
                );
                break;

            default:
                break;
        }

        return (
            <div className="form-field w-full" key={getCurrentElement.id}>
                {content}
            </div>
        );
    }

    return (
        <form className="w-full max-w-md mx-auto" onSubmit={onHandleSubmit} noValidate>
            
            {/* Render all mapped form elements */}
            {formControls && formControls.length > 0
                ? formControls.map((singleFormElementItem) =>
                    renderFormElement(singleFormElementItem)
                )
                : null}

            {/* Submit Button */}
            <div className="mt-6">
                <button 
                    type="submit" 
                    className="w-full px-4 py-2 text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors font-medium disabled:bg-blue-400"
                >
                    {buttonText || 'Submit'}
                </button>
            </div>
            
        </form>
    );
}