'use client';

import React, { useMemo } from 'react';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { Card } from '@/components/ui/card';
import { EMOJI_MAP } from '@/lib/constants';

const ITEMS_PER_ROW: Record<string, number> = {
  small: 8,
  medium: 5,
  large: 3,
};

export const SheetContentBar = () => {
  const config = useWorksheetStore((state) => state.config);
  const toggleItem = useWorksheetStore((state) => state.toggleItem);

  const { totalRows, estimatedPages } = useMemo(() => {
    const itemsPerRow = ITEMS_PER_ROW[config.letterSize] || 5;
    const selectedCount = config.selectedItems.length;
    const totalRows = selectedCount === 0 ? 0 : Math.ceil(selectedCount / itemsPerRow);
    const estimatedPages = Math.max(1, Math.ceil(totalRows / config.rowsPerPage));

    return { totalRows, estimatedPages };
  }, [config.letterSize, config.selectedItems.length, config.rowsPerPage]);

  const isEmpty = config.selectedItems.length === 0;

  const sizeName = {
    small: 'Small',
    medium: 'Medium',
    large: 'Large',
  }[config.letterSize] || 'Medium';

  return (
    <Card className="border-0 shadow-md bg-gradient-to-r from-blue-50 to-indigo-50">
      <div className="p-6">
        {/* Header with icon and title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="text-2xl">📄</div>
          <h3 className="text-lg font-semibold text-gray-800">Sheet Content</h3>
        </div>

        {/* Content summary or empty state */}
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            {isEmpty ? (
              <p className="text-gray-500 italic text-sm">Your sheet is empty. Pick items above!</p>
            ) : (
              <div>
                <p className="text-gray-700 font-medium text-sm">
                  {config.selectedItems.length} item{config.selectedItems.length !== 1 ? 's' : ''} ~ {estimatedPages} page{estimatedPages !== 1 ? 's' : ''} ({sizeName}, {totalRows} row{totalRows !== 1 ? 's' : ''}/page)
                </p>

                {/* Item tags/pills */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {config.selectedItems.map((item) => {
                    const emoji = EMOJI_MAP[item] || '✨';
                    return (
                      <button
                        key={item}
                        onClick={() => toggleItem(item)}
                        className="group inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:border-red-400 hover:bg-red-50 transition-all duration-200"
                        title={`Remove ${item}`}
                      >
                        <span className="text-base">{emoji}</span>
                        <span>{item}</span>
                        <span className="text-gray-400 group-hover:text-red-500 transition-colors">×</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Page count on the right */}
          {!isEmpty && (
            <div className="flex flex-col items-center justify-center min-w-24">
              <div className="text-5xl font-bold bg-gradient-to-br from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {estimatedPages}
              </div>
              <p className="text-xs font-medium text-gray-600 mt-1">pages</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
