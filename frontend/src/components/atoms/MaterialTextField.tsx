import React, { useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { materialDesignTokens } from '../tokens';

interface MaterialTextFieldProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url';
  label?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  errorMessage?: string;
  helperText?: string;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  size?: 'small' | 'medium';
  variant?: 'outlined' | 'filled' | 'standard';
  multiline?: boolean;
  rows?: number;
  className?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

const MaterialTextField: React.FC<MaterialTextFieldProps> = ({
  type = 'text',
  label,
  placeholder,
  value,
  defaultValue,
  disabled = false,
  required = false,
  error = false,
  errorMessage,
  helperText,
  icon: Icon,
  iconPosition = 'left',
  size = 'medium',
  variant = 'outlined',
  multiline = false,
  rows = 4,
  className = '',
  onChange,
  onFocus,
  onBlur,
}) => {
  const tokens = materialDesignTokens;
  const [focused, setFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!(value || defaultValue));

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFocused(false);
    setHasValue(!!e.target.value);
    onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setHasValue(!!e.target.value);
    onChange?.(e);
  };

  const baseClasses = 'w-full transition-all duration-200 focus:outline-none';
  
  const sizeClasses = {
    small: 'px-3 py-2 text-sm',
    medium: 'px-3 py-3 text-base'
  };

  const variantClasses = {
    outlined: {
      container: 'relative border-2 rounded-lg',
      input: 'border-gray-300 focus:border-blue-500',
      inputError: 'border-red-500 focus:border-red-500',
      inputFocused: 'border-blue-500',
      label: 'absolute left-3 -top-2 bg-white px-1 text-sm transition-all duration-200',
      labelFocused: 'text-blue-500',
      labelError: 'text-red-500',
      labelFloating: 'text-xs'
    },
    filled: {
      container: 'relative border-b-2 rounded-t-lg bg-gray-100',
      input: 'border-gray-300 focus:border-blue-500 bg-transparent',
      inputError: 'border-red-500 focus:border-red-500',
      inputFocused: 'border-blue-500',
      label: 'absolute left-3 top-3 text-gray-600 transition-all duration-200 pointer-events-none',
      labelFocused: 'text-blue-500',
      labelError: 'text-red-500',
      labelFloating: 'text-xs -top-2 bg-white px-1'
    },
    standard: {
      container: 'relative border-b-2',
      input: 'border-gray-300 focus:border-blue-500 bg-transparent',
      inputError: 'border-red-500 focus:border-red-500',
      inputFocused: 'border-blue-500',
      label: 'absolute left-0 top-3 text-gray-600 transition-all duration-200 pointer-events-none',
      labelFocused: 'text-blue-500',
      labelError: 'text-red-500',
      labelFloating: 'text-xs -top-2'
    }
  };

  const currentVariant = variantClasses[variant];
  const isFloating = focused || hasValue;
  const hasError = error || !!errorMessage;

  const inputClasses = `
    ${baseClasses}
    ${sizeClasses[size]}
    ${currentVariant.input}
    ${hasError ? currentVariant.inputError : ''}
    ${focused ? currentVariant.inputFocused : ''}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${Icon && iconPosition === 'left' ? 'pl-10' : ''}
    ${Icon && iconPosition === 'right' ? 'pr-10' : ''}
  `;

  const labelClasses = `
    ${currentVariant.label}
    ${isFloating ? currentVariant.labelFloating : ''}
    ${focused ? currentVariant.labelFocused : ''}
    ${hasError ? currentVariant.labelError : ''}
    ${disabled ? 'opacity-50' : ''}
  `;

  const containerClasses = `
    ${currentVariant.container}
    ${className}
  `;

  const InputComponent = multiline ? 'textarea' : 'input';

  return (
    <div className={containerClasses}>
      {label && (
        <label className={labelClasses}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {Icon && iconPosition === 'left' && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className={`w-5 h-5 ${hasError ? 'text-red-500' : 'text-gray-400'}`} />
          </div>
        )}
        
        <InputComponent
          type={multiline ? undefined : type}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          required={required}
          rows={multiline ? rows : undefined}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={inputClasses}
          style={{
            fontFamily: tokens.typography.fontFamily.primary,
            transition: `all ${tokens.transitions.duration.standard} ${tokens.transitions.easing.standard}`
          }}
        />
        
        {Icon && iconPosition === 'right' && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Icon className={`w-5 h-5 ${hasError ? 'text-red-500' : 'text-gray-400'}`} />
          </div>
        )}
      </div>
      
      {(errorMessage || helperText) && (
        <p className={`mt-1 text-sm ${hasError ? 'text-red-600' : 'text-gray-500'}`}>
          {errorMessage || helperText}
        </p>
      )}
    </div>
  );
};

export default MaterialTextField;
