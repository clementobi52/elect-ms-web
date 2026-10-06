// components/ui/searchable-select-server.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, ChevronDown, Check, Loader2 } from 'lucide-react';
import { Input } from './input';
import { cn } from '@/lib/utils';
import { debounce } from 'lodash';

interface Option {
  id: string;
  name: string;
}

interface SearchableSelectServerProps {
  value: string;
  onChange: (value: string) => void;
  fetchOptions: (search: string, params?: Record<string, string>) => Promise<Option[]>;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
  label?: string;
  debounceDelay?: number;
  initialOptions?: Option[];
  // Server-side scoping for a cascading chain. A Polling Unit picker can be
  // narrowed to a ward, a Ward picker to a zone: every fetch (open and search)
  // carries these, and a change to them reloads the list so the old options do
  // not survive the filter that produced them.
  fetchParams?: Record<string, string>;
}

export const SearchableSelectServer: React.FC<SearchableSelectServerProps> = ({
  value,
  onChange,
  fetchOptions,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No options found',
  className,
  disabled = false,
  label,
  debounceDelay = 300,
  initialOptions = [],
  fetchParams,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [options, setOptions] = useState<Option[]>(initialOptions);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // A filtered picker must not show the caller's unfiltered initial options, or
  // the first page of every zone/ward would flash up regardless of the filter.
  const paramsKey = JSON.stringify(fetchParams || {});
  const hasFilters = Object.keys(fetchParams || {}).length > 0;

  // fetchParams is a fresh object on every render from its caller; only its
  // serialized key is meaningful. Read it through a ref so the callbacks below
  // can depend on the stable key alone and still fetch against the latest
  // value. Depending on the object would re-run the effects on every render.
  const fetchParamsRef = useRef(fetchParams);
  fetchParamsRef.current = fetchParams;

  // Find selected option
  const selectedOption = options.find(opt => opt.id === value);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce(async (search: string) => {
      if (!search || search.length < 2) {
        setOptions(hasFilters ? [] : initialOptions);
        setHasLoaded(false);
        return;
      }
      
      setLoading(true);
      try {
        const results = await fetchOptions(search, fetchParamsRef.current);
        setOptions(results);
        setHasLoaded(true);
      } catch (error) {
        console.error('Error fetching options:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, debounceDelay),
    [fetchOptions, hasFilters, paramsKey]
  );

  // Load initial options when dropdown opens
  useEffect(() => {
    if (isOpen && !hasLoaded && !searchTerm) {
      // Load first page of options
      fetchOptions('', fetchParamsRef.current).then(results => {
        setOptions(results);
        setHasLoaded(true);
      }).catch(console.error);
    }
  }, [isOpen, fetchOptions, hasLoaded, searchTerm, paramsKey]);

  // A change of filter invalidates the options fetched for the previous one.
  // Clearing hasLoaded lets the on-open load above repopulate, and an open
  // dropdown re-runs it immediately because hasLoaded is in its deps. Guarded
  // by paramsKey so a fresh initialOptions array - created whenever the caller
  // renders - does not count as a filter change and reset this every frame.
  const lastParamsKey = useRef(paramsKey);
  useEffect(() => {
    if (lastParamsKey.current === paramsKey) return;
    lastParamsKey.current = paramsKey;
    setOptions(hasFilters ? [] : initialOptions);
    setHasLoaded(false);
  }, [paramsKey, hasFilters]);

  // Handle search input change
  useEffect(() => {
    if (searchTerm.length >= 2 || searchTerm.length === 0) {
      debouncedSearch(searchTerm);
    }
  }, [searchTerm, debouncedSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: Option) => {
    onChange(option.id);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    onChange('');
    setSearchTerm('');
  };

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {label && (
        <label className="text-sm font-medium mb-1 block">{label}</label>
      )}
      
      {/* Trigger Button */}
      <div
        className={cn(
          "flex items-center justify-between w-full px-3 py-2 bg-background border rounded-md cursor-pointer",
          "hover:border-primary/50 transition-colors",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "border-primary ring-2 ring-primary/20"
        )}
        onClick={toggleDropdown}
      >
        <span className={cn(
          "truncate",
          !selectedOption && "text-muted-foreground"
        )}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {selectedOption && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="hover:bg-muted rounded-full p-1"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
          <ChevronDown className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )} />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-[300px] flex flex-col">
          {/* Search Input */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9"
                onClick={(e) => e.stopPropagation()}
              />
              {loading && (
                <Loader2 className="absolute right-2 top-2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {searchTerm && !loading && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-2 hover:bg-muted rounded-full p-1"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
            {searchTerm.length > 0 && searchTerm.length < 2 && (
              <p className="text-xs text-muted-foreground mt-1">
                Type at least 2 characters to search
              </p>
            )}
          </div>

          {/* Options List */}
          <div className="overflow-y-auto flex-1 p-1">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : options.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                {searchTerm.length >= 2 ? emptyMessage : 'Type to search...'}
              </div>
            ) : (
              options.map((option) => (
                <div
                  key={option.id}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-md cursor-pointer",
                    "hover:bg-accent transition-colors",
                    value === option.id && "bg-accent"
                  )}
                  onClick={() => handleSelect(option)}
                >
                  <span className="text-sm">{option.name}</span>
                  {value === option.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t text-xs text-muted-foreground flex justify-between">
            <span>{options.length} options shown</span>
            {searchTerm.length >= 2 && (
              <span>Search results for "{searchTerm}"</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};