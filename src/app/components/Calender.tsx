'use client';

import React, { useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
} from 'date-fns';

export default function MiniCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [noteInput, setNoteInput] = useState('');

  const renderHeader = () => (
    <div className="flex justify-between items-center mb-2 px-1">
      <button onClick={() => setCurrentMonth(prev => new Date(prev.setMonth(prev.getMonth() - 1)))}>&lt;</button>
      <h2 className="font-semibold text-sm">{format(currentMonth, 'MMMM yyyy')}</h2>
      <button onClick={() => setCurrentMonth(prev => new Date(prev.setMonth(prev.getMonth() + 1)))}>&gt;</button>
    </div>
  );

  const renderDays = () => {
    const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    return (
      <div className="grid grid-cols-7 text-[10px] text-gray-500 mb-1 px-1">
        {days.map(day => (
          <div key={day} className="text-center">{day}</div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(addDays(endOfMonth(monthStart), 7));

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const dateStr = format(day, 'yyyy-MM-dd');
        const isNotePresent = notes[dateStr];
        const isToday = isSameDay(day, new Date());
        const isSelected = selectedDate && isSameDay(day, selectedDate);

        days.push(
          <div
            key={day.toString()}
            className={`text-xs flex items-center justify-center h-8 w-8 mx-auto cursor-pointer rounded-full transition 
              ${!isSameMonth(day, monthStart) ? 'text-gray-300' : ''}
              ${isNotePresent ? 'bg-green-400 text-white' : ''}
              ${isToday && !isNotePresent ? 'bg-blue-100 text-blue-600' : ''}
              ${isSelected ? 'ring-2 ring-blue-400' : ''}
              hover:ring-2 hover:ring-gray-300`}
            onClick={() => {
              setSelectedDate(day);
              setNoteInput(notes[dateStr] || '');
            }}
          >
            {format(day, 'd')}
          </div>
        );
        day = addDays(day, 1);
      }

      rows.push(
        <div className="grid grid-cols-7 gap-y-1" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }

    return <div className="grid gap-y-1">{rows}</div>;
  };

  const handleNoteSave = () => {
    if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      setNotes(prev => ({
        ...prev,
        [dateStr]: noteInput.trim(),
      }));
      setNoteInput('');
      setSelectedDate(null);
    }
  };

  return (
    <div className="relative w-full sm:w-[300px] h-[370px] bg-white rounded-xl shadow p-3 text-gray-800 text-sm overflow-hidden">
      {renderHeader()}
      {renderDays()}
      {renderCells()}

      {selectedDate && (
        <div className="absolute inset-0 bg-white bg-opacity-95 p-4 flex flex-col justify-between rounded-xl">
          <div>
            <div className="text-sm font-semibold mb-2">
              Notes for {format(selectedDate, 'MMMM d, yyyy')}
            </div>
            <textarea
              className="w-full border rounded p-1 text-sm resize-none"
              rows={3}
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Add a note or todo..."
            />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setSelectedDate(null)}
              className="text-xs text-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={handleNoteSave}
              className="text-xs bg-blue-500 text-white px-3 py-1 rounded"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
