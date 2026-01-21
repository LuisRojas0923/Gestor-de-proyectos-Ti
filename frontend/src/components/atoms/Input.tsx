import { LucideIcon, Eye, EyeOff } from 'lucide-react';
import React, { useState } from 'react';
import { Text, Icon, Button } from './index';

interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'search' | 'date' | 'url' | 'range' | 'file';
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  errorMessage?: string;
  label?: string;
  helperText?: string;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  name?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  maxLength?: number;
  fullWidth?: boolean;
  id?: string;
  accept?: string;
  style?: React.CSSProperties;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  type = 'text',
  placeholder,
  value,
  defaultValue,
  disabled = false,
  required = false,
  error = false,
  errorMessage,
  label,
  helperText,
  icon: IconComponent,
  iconPosition = 'left',
  size = 'md',
  className = '',
  name,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  onKeyPress,
  maxLength,
  fullWidth = true,
  id,
  accept,
  style,
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordType = type === 'password';
  const inputType = isPasswordType ? (showPassword ? 'text' : 'password') : type;

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const baseClasses = 'w-full border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-4 py-3 text-base',
  };

  const stateClasses = error
    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
    : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500 dark:border-neutral-600 dark:focus:border-primary-500';

  const backgroundClasses = 'bg-white text-neutral-900 placeholder-neutral-500 dark:bg-neutral-800 dark:text-white dark:placeholder-neutral-400';

  const iconPaddingClasses = {
    sm: IconComponent && iconPosition === 'left' ? 'pl-10' : (IconComponent && iconPosition === 'right') || isPasswordType ? 'pr-10' : '',
    md: IconComponent && iconPosition === 'left' ? 'pl-10' : (IconComponent && iconPosition === 'right') || isPasswordType ? 'pr-10' : '',
    lg: IconComponent && iconPosition === 'left' ? 'pl-12' : (IconComponent && iconPosition === 'right') || isPasswordType ? 'pr-12' : '',
  };

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <Text as="label" variant="body2" weight="medium" color="text-primary" className="mb-1 block">
          {label}
          {required && <Text as="span" color="error" className="ml-1">*</Text>}
        </Text>
      )}

      <div className="relative">
        {IconComponent && iconPosition === 'left' && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon
              name={IconComponent}
              size={size}
              color="text-secondary"
            />
          </div>
        )}

        <input
          ref={ref}
          id={id}
          type={inputType}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          required={required}
          name={name}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          onKeyPress={onKeyPress}
          maxLength={maxLength}
          accept={accept}
          className={`${baseClasses} ${sizeClasses[size]} ${stateClasses} ${backgroundClasses} ${iconPaddingClasses[size]}`}
          style={style}
        />

        {IconComponent && iconPosition === 'right' && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Icon
              name={IconComponent}
              size={size}
              color="text-secondary"
            />
          </div>
        )}

        {isPasswordType && (
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={togglePasswordVisibility}
              className="!p-1.5 min-w-0 h-auto text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
              tabIndex={-1}
              icon={showPassword ? EyeOff : Eye}
            />
          </div>
        )}
      </div>

      {error && errorMessage && (
        <Text variant="caption" color="error" className="mt-1">{errorMessage}</Text>
      )}

      {!error && helperText && (
        <Text variant="caption" color="text-secondary" className="mt-1">{helperText}</Text>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
