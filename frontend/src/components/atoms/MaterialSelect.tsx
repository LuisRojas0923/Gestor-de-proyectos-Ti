import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { materialDesignTokens } from '../tokens';

interface MaterialSelectOption {
  value: string;
  label: string;
}

interface MaterialSelectOptionGroup {
  label: string;
  options: MaterialSelectOption[];
}

interface MaterialSelectProps {
  label?: string;
  placeholder?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  errorMessage?: string;
  helperText?: string;
  className?: string;
  darkMode?: boolean;
  options?: MaterialSelectOption[];
  optionGroups?: MaterialSelectOptionGroup[];
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLSelectElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void;
}

const MaterialSelect: React.FC<MaterialSelectProps> = ({
  label,
  placeholder,
  name,
  value,
  defaultValue,
  disabled = false,
  required = false,
  error = false,
  errorMessage,
  helperText,
  className = '',
  darkMode = false,
  options = [],
  optionGroups = [],
  onChange,
  onFocus,
  onBlur,
}) => {
  const tokens = materialDesignTokens;
  const [focused, setFocused] = useState(false);

  const handleFocus = (e: React.FocusEvent<HTMLSelectElement>) => {
    setFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLSelectElement>) => {
    setFocused(false);
    onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange?.(e);
  };

  const hasError = error || !!errorMessage;

  // Diseño esbelto y moderno
  const getSelectClasses = () => {
    const baseClasses = 'w-full p-2 rounded transition-colors focus:outline-none appearance-none';
    
    if (disabled) {
      return `${baseClasses} opacity-50 cursor-not-allowed ${
        darkMode ? 'bg-neutral-700 text-neutral-400' : 'bg-gray-100 text-gray-400'
      }`;
    }

    if (hasError) {
      return `${baseClasses} border border-red-400 focus:border-red-400 ${
        darkMode ? 'bg-neutral-700 text-white' : 'bg-white text-gray-900'
      }`;
    }

    if (focused) {
      return `${baseClasses} border ${
        darkMode 
          ? 'bg-neutral-700 text-white border-blue-400' 
          : 'bg-white text-gray-900 border-blue-500'
      }`;
    }

    return `${baseClasses} border ${
      darkMode 
        ? 'bg-neutral-700 text-white border-neutral-600' 
        : 'bg-white text-gray-900 border-gray-300'
    }`;
  };

  const getLabelClasses = () => {
    const baseClasses = 'block text-sm font-medium mb-1';
    
    if (disabled) {
      return `${baseClasses} ${
        darkMode ? 'text-neutral-500' : 'text-gray-400'
      }`;
    }

    if (hasError) {
      return `${baseClasses} ${
        darkMode ? 'text-red-400' : 'text-red-500'
      }`;
    }

    if (focused) {
      return `${baseClasses} ${
        darkMode ? 'text-blue-400' : 'text-blue-500'
      }`;
    }

    return `${baseClasses} ${
      darkMode ? 'text-neutral-300' : 'text-gray-700'
    }`;
  };

  const renderOptions = () => {
    if (optionGroups.length > 0) {
      return optionGroups.map((group, groupIndex) => (
        <optgroup key={groupIndex} label={group.label}>
          {group.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </optgroup>
      ));
    }

    return options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ));
  };

  return (
    <div className={className}>
      {label && (
        <label className={getLabelClasses()}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <select
          name={name}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          required={required}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={getSelectClasses()}
          style={{
            fontFamily: tokens.typography.fontFamily.primary,
            transition: `all ${tokens.transitions.duration.standard} ${tokens.transitions.easing.standard}`
          }}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {renderOptions()}
        </select>
        
        {/* Icono de dropdown */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <ChevronDown className={`w-5 h-5 ${
            hasError 
              ? (darkMode ? 'text-red-400' : 'text-red-500') 
              : (darkMode ? 'text-neutral-400' : 'text-gray-400')
          }`} />
        </div>
      </div>
      
      {(errorMessage || helperText) && (
        <p className={`mt-1 text-sm ${
          hasError 
            ? (darkMode ? 'text-red-400' : 'text-red-600') 
            : (darkMode ? 'text-neutral-400' : 'text-gray-500')
        }`}>
          {errorMessage || helperText}
        </p>
      )}
    </div>
  );
};

export default MaterialSelect;