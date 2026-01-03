import React, { useState } from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './DateRangePicker.css';

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onChange: (startDate: Date, endDate: Date) => void;
  minDate?: Date;
  className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  minDate = new Date(),
  className = ''
}) => {
  const [localStartDate, setLocalStartDate] = useState<Date | null>(startDate);
  const [localEndDate, setLocalEndDate] = useState<Date | null>(endDate);

  const handleDateChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    setLocalStartDate(start);
    setLocalEndDate(end);

    if (start && end) {
      onChange(start, end);
    }
  };

  return (
    <div className={`date-range-picker-wrapper ${className}`}>
      <ReactDatePicker
        selectsRange
        startDate={localStartDate}
        endDate={localEndDate}
        onChange={handleDateChange}
        minDate={minDate}
        monthsShown={2}
        inline
        calendarClassName="custom-calendar"
      />
    </div>
  );
};
