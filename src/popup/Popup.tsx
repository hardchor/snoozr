import React, { useEffect, useState } from 'react';

import { SnoozeOption } from '../types';

// Using function declaration per ESLint rule
function Popup(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<chrome.tabs.Tab | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getCurrentTab = async (): Promise<void> => {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      setActiveTab(tab);
      setLoading(false);
    };
    getCurrentTab();
  }, []);

  const snoozeOptions: SnoozeOption[] = [
    { id: 'later_today', label: 'Later Today', hours: 3 },
    { id: 'tonight', label: 'Tonight', hours: 8 },
    { id: 'tomorrow', label: 'Tomorrow', hours: 24 },
    { id: 'weekend', label: 'This Weekend', days: 2 },
    { id: 'next_week', label: 'Next Week', days: 7 },
    { id: 'custom', label: 'Pick a Date/Time', custom: true },
  ];

  const [customDate, setCustomDate] = useState<string>(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [showCustom, setShowCustom] = useState(false);

  const handleSnooze = async (option: SnoozeOption): Promise<void> => {
    if (!activeTab || !activeTab.id) return;

    let wakeTime: number;
    if (option.custom && showCustom) {
      wakeTime = new Date(customDate).getTime();
    } else {
      const now = Date.now();
      wakeTime =
        now +
        (option.hours ? option.hours * 60 * 60 * 1000 : 0) +
        (option.days ? option.days * 24 * 60 * 60 * 1000 : 0);
    }

    const tabInfo = {
      id: activeTab.id,
      url: activeTab.url,
      title: activeTab.title,
      favicon: activeTab.favIconUrl,
      createdAt: Date.now(),
      wakeTime,
    };

    // Save snoozed tab info to storage
    await chrome.storage.local.get({ snoozedTabs: [] }, async (data) => {
      const { snoozedTabs } = data;
      snoozedTabs.push(tabInfo);
      await chrome.storage.local.set({ snoozedTabs });

      // Create alarm for this tab
      await chrome.alarms.create(`snoozed-tab-${tabInfo.id}`, {
        when: wakeTime,
      });

      // Close the tab
      await chrome.tabs.remove(tabInfo.id);

      // Close the popup
      window.close();
    });
  };

  if (loading) {
    return (
      <div className='flex min-h-[300px] items-center justify-center'>
        <div className='flex flex-col items-center'>
          <div className='mb-3 h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500' />
          <p className='font-medium text-gray-600'>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='w-80 rounded-lg bg-gradient-to-b from-white to-gray-50 p-5 shadow-lg'>
      <h1 className='mb-5 flex items-center justify-center text-center text-2xl font-bold text-blue-600'>
        <svg
          className='mr-2 h-6 w-6'
          viewBox='0 0 24 24'
          fill='none'
          xmlns='http://www.w3.org/2000/svg'
        >
          <circle cx='12' cy='12' r='9' stroke='currentColor' strokeWidth='2' />
          <path
            d='M12 7V12L15 15'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
          />
        </svg>
        Snooze Tab
      </h1>

      {activeTab && (
        <div className='mb-5 flex items-center rounded-lg border border-gray-100 bg-white p-3 shadow-md'>
          {activeTab.favIconUrl && (
            <img
              src={activeTab.favIconUrl}
              alt='Tab favicon'
              className='mr-3 h-5 w-5'
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          <div className='truncate text-sm font-medium'>{activeTab.title}</div>
        </div>
      )}

      <div className='space-y-3'>
        {snoozeOptions.map((option) => (
          <div key={option.id}>
            {option.custom ? (
              <div>
                <button
                  type='button'
                  className='flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 font-medium shadow-sm transition-all duration-200 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600'
                  onClick={() => setShowCustom(!showCustom)}
                >
                  <span className='flex items-center'>
                    <svg
                      className='mr-2 h-5 w-5 text-blue-500'
                      viewBox='0 0 24 24'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <rect
                        x='3'
                        y='4'
                        width='18'
                        height='16'
                        rx='2'
                        stroke='currentColor'
                        strokeWidth='2'
                      />
                      <path
                        d='M3 10H21'
                        stroke='currentColor'
                        strokeWidth='2'
                      />
                      <path
                        d='M8 2L8 6'
                        stroke='currentColor'
                        strokeWidth='2'
                        strokeLinecap='round'
                      />
                      <path
                        d='M16 2L16 6'
                        stroke='currentColor'
                        strokeWidth='2'
                        strokeLinecap='round'
                      />
                    </svg>
                    {option.label}
                  </span>
                  <span className='text-gray-400'>
                    {showCustom ? '▲' : '▼'}
                  </span>
                </button>

                {showCustom && (
                  <div className='mt-3 rounded-lg border border-blue-100 bg-blue-50 p-4 shadow-inner transition-all duration-300'>
                    <p className='mb-2 text-xs text-gray-600'>
                      Select when to bring this tab back
                    </p>
                    <input
                      type='datetime-local'
                      className='w-full rounded-lg border border-gray-300 bg-white p-2 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-200'
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                    />
                    <button
                      type='button'
                      className='mt-3 w-full transform rounded-lg bg-blue-600 py-2 font-medium text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700'
                      onClick={() => handleSnooze(option)}
                    >
                      Snooze until selected time
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type='button'
                className='flex w-full items-center rounded-lg border border-gray-200 bg-white px-4 py-3 font-medium shadow-sm transition-all duration-200 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600'
                onClick={() => handleSnooze(option)}
              >
                <svg
                  className='mr-3 h-5 w-5 text-blue-500'
                  viewBox='0 0 24 24'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <circle
                    cx='12'
                    cy='12'
                    r='9'
                    stroke='currentColor'
                    strokeWidth='2'
                  />
                  <path
                    d='M12 7V12L15 15'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                  />
                </svg>
                {option.label}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className='mt-5 text-center'>
        <a
          href='options.html'
          target='_blank'
          className='inline-flex items-center text-sm text-blue-600 transition-colors duration-200 hover:text-blue-800 hover:underline'
        >
          <svg
            className='mr-1 h-4 w-4'
            viewBox='0 0 24 24'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path
              d='M10.3246 4.31731C10.751 2.5609 13.249 2.5609 13.6754 4.31731C13.9508 5.45193 15.2507 5.99038 16.2478 5.38285C17.7913 4.44239 19.5576 6.2087 18.6172 7.75218C18.0096 8.74925 18.5481 10.0492 19.6827 10.3246C21.4391 10.751 21.4391 13.249 19.6827 13.6754C18.5481 13.9508 18.0096 15.2507 18.6172 16.2478C19.5576 17.7913 17.7913 19.5576 16.2478 18.6172C15.2507 18.0096 13.9508 18.5481 13.6754 19.6827C13.249 21.4391 10.751 21.4391 10.3246 19.6827C10.0492 18.5481 8.74926 18.0096 7.75219 18.6172C6.2087 19.5576 4.44239 17.7913 5.38285 16.2478C5.99038 15.2507 5.45193 13.9508 4.31731 13.6754C2.5609 13.249 2.5609 10.751 4.31731 10.3246C5.45193 10.0492 5.99037 8.74926 5.38285 7.75218C4.44239 6.2087 6.2087 4.44239 7.75219 5.38285C8.74926 5.99037 10.0492 5.45193 10.3246 4.31731Z'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <path
              d='M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
          Manage snoozed tabs
        </a>
      </div>
    </div>
  );
}

export default Popup;
