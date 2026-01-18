import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Input, Button } from '../atoms';
import { materialDesignTokens } from '../tokens';

interface MaterialSearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  onFilter?: () => void;
  showFilters?: boolean;
  suggestions?: string[];
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
}

const MaterialSearchBar: React.FC<MaterialSearchBarProps> = ({
  placeholder = 'Buscar...',
  onSearch,
  onFilter,
  showFilters = false,
  suggestions = [],
  className = '',
  value: controlledValue,
  onChange
}) => {
  const { state } = useAppContext();
  const { darkMode } = state;
  const tokens = materialDesignTokens;

  const [internalValue, setInternalValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const value = controlledValue !== undefined ? controlledValue : internalValue;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
    setShowSuggestions(newValue.length > 0 && suggestions.length > 0);
  };

  const handleSearch = () => {
    onSearch?.(value);
    setShowSuggestions(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (controlledValue === undefined) {
      setInternalValue(suggestion);
    }
    onChange?.(suggestion);
    onSearch?.(suggestion);
    setShowSuggestions(false);
  };

  const handleClear = () => {
    if (controlledValue === undefined) {
      setInternalValue('');
    }
    onChange?.('');
    setShowSuggestions(false);
  };

  const filteredSuggestions = suggestions.filter(suggestion =>
    suggestion.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center space-x-2">
        <div className="flex-1 relative">
          <Input
            type="search"
            placeholder={placeholder}
            value={value}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            onFocus={() => setShowSuggestions(value.length > 0 && suggestions.length > 0)}
            onBlur={() => {
              // Delay para permitir clicks en sugerencias
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            icon={Search}
            className="w-full"
          />

          {value && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 transition-colors"
              icon={X}
              aria-label="Limpiar búsqueda"
            />
          )}

          {/* Sugerencias */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div
              className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
              style={{
                backgroundColor: darkMode ? tokens.colors.surface.dark : tokens.colors.surface.light,
                borderColor: darkMode ? tokens.colors.surface.variant.dark : tokens.colors.surface.variant.light,
                boxShadow: tokens.elevation[4]
              }}
            >
              {filteredSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors first:rounded-t-lg last:rounded-b-lg cursor-pointer"
                  style={{
                    color: darkMode ? tokens.colors.text.primary.dark : tokens.colors.text.primary.light,
                    fontSize: tokens.typography.fontSize.body2,
                    fontFamily: tokens.typography.fontFamily.primary
                  }}
                  role="button"
                  tabIndex={0}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>

        <Button
          variant="primary"
          onClick={handleSearch}
          disabled={!value.trim()}
        >
          Buscar
        </Button>

        {showFilters && (
          <Button
            variant="outline"
            icon={Filter}
            onClick={onFilter}
          >
            Filtros
          </Button>
        )}
      </div>
    </div>
  );
};

export default MaterialSearchBar;
