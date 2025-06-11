import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSearch = (value: string) => {
    setQuery(value);
    onSearch(value);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
    setIsExpanded(false);
  };

  return (
    <div className={`flex items-center transition-all duration-200 ${
      isExpanded ? 'w-64' : 'w-8'
    }`}>
      {isExpanded ? (
        <div className="relative w-full">
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search notes..."
            className="w-full pl-8 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            autoFocus
            onBlur={() => !query && setIsExpanded(false)}
          />
          <Search size={16} className="absolute left-2.5 top-2.5 text-gray-400" />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={() => setIsExpanded(true)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Search size={16} />
        </button>
      )}
    </div>
  );
};
