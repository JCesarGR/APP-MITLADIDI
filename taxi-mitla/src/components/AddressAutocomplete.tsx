import { useState, useRef, useEffect } from 'react';
import { useAddressAutocomplete, AddressResult } from '../hooks/useAddressAutocomplete';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: AddressResult) => void;
  placeholder?: string;
  label?: string;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Escribe una dirección...',
  label = 'Destino',
}: AddressAutocompleteProps) {
  const { results, loading, error, search, clear } = useAddressAutocomplete();
  const [showDropdown, setShowDropdown] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    // Cerrar dropdown al hacer clic fuera
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    search(newValue);
    setShowDropdown(true);
  };

  const handleSelect = (result: AddressResult) => {
    setInputValue(result.mainText);
    onChange(result.mainText);
    onSelect(result);
    clear();
    setShowDropdown(false);
    inputRef.current?.blur();
  };

  const handleFocus = () => {
    if (results.length > 0) {
      setShowDropdown(true);
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="block text-gray-700 font-medium mb-2">{label}</label>

      <div className="relative">
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
          <span className="text-gray-400 text-xl">🔍</span>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-10 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          autoComplete="off"
        />

        {loading && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {inputValue && !loading && (
          <button
            onClick={() => {
              setInputValue('');
              onChange('');
              clear();
            }}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <span className="text-xl">✕</span>
          </button>
        )}
      </div>

      {/* Dropdown de resultados */}
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-lg border border-gray-200 max-h-64 overflow-y-auto">
          <div className="p-2 text-xs text-gray-500 border-b bg-gray-50">
            📍 Lugares en Mitla y alrededores
          </div>
          {results.map((result, index) => (
            <button
              key={result.placeId}
              onClick={() => handleSelect(result)}
              className={`w-full px-4 py-3 text-left hover:bg-primary-50 transition-colors ${
                index !== results.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <div className="flex items-start">
                <span className="text-lg mr-3 mt-0.5">📍</span>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{result.mainText}</p>
                  <p className="text-sm text-gray-500">{result.secondaryText}</p>
                </div>
              </div>
            </button>
          ))}
          <div className="p-2 text-xs text-gray-400 bg-gray-50 text-center">
            Selecciona un lugar para continuar
          </div>
        </div>
      )}

      {/* Sin resultados */}
      {showDropdown && inputValue.length >= 3 && results.length === 0 && !loading && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-lg border border-gray-200 p-4">
          <p className="text-center text-gray-500">
            No encontramos lugares con "{inputValue}"
          </p>
          <p className="text-center text-sm text-gray-400 mt-1">
            Prueba con otro nombre o selecciona una zona
          </p>
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );
}
