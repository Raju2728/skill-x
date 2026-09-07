import { useState } from 'react';
import { Plus, Trash2, Clock, Globe } from 'lucide-react';
import Button from '../../components/ui/Button';
import './AvailabilityPicker.css';

const days = [
  { index: 0, label: 'Sunday', short: 'Sun' },
  { index: 1, label: 'Monday', short: 'Mon' },
  { index: 2, label: 'Tuesday', short: 'Tue' },
  { index: 3, label: 'Wednesday', short: 'Wed' },
  { index: 4, label: 'Thursday', short: 'Thu' },
  { index: 5, label: 'Friday', short: 'Fri' },
  { index: 6, label: 'Saturday', short: 'Sat' },
];

const timeOptions = [];
for (let h = 6; h <= 23; h++) {
  const hh = h.toString().padStart(2, '0');
  timeOptions.push(`${hh}:00`);
  timeOptions.push(`${hh}:30`);
}

export default function AvailabilityPicker({
  slots = [],
  onChange,
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  onTimezoneChange,
}) {
  const [activeDay, setActiveDay] = useState(1); // Default to Monday

  const daySlots = slots.filter(s => s.dayOfWeek === activeDay);

  const addSlot = () => {
    const newSlot = {
      dayOfWeek: activeDay,
      startTime: '09:00',
      endTime: '12:00',
    };
    onChange([...slots, newSlot]);
  };

  const updateSlot = (indexInDay, field, value) => {
    // Find absolute index in all slots
    let dayCount = 0;
    const nextSlots = slots.map(s => {
      if (s.dayOfWeek === activeDay) {
        if (dayCount === indexInDay) {
          dayCount++;
          return { ...s, [field]: value };
        }
        dayCount++;
      }
      return s;
    });
    onChange(nextSlots);
  };

  const removeSlot = (indexInDay) => {
    let dayCount = 0;
    const nextSlots = slots.filter(s => {
      if (s.dayOfWeek === activeDay) {
        if (dayCount === indexInDay) {
          dayCount++;
          return false;
        }
        dayCount++;
      }
      return true;
    });
    onChange(nextSlots);
  };

  return (
    <div className="availability-picker">
      <div className="avail-header">
        <div className="avail-tz-info">
          <Globe size={16} className="text-accent" />
          <span>Timezone: <strong>{timezone}</strong></span>
        </div>
        <span className="avail-total-slots">
          {slots.length} total active time slots
        </span>
      </div>

      {/* Days navigation */}
      <div className="avail-days-nav">
        {days.map(d => {
          const count = slots.filter(s => s.dayOfWeek === d.index).length;
          const isActive = activeDay === d.index;
          return (
            <button
              key={d.index}
              type="button"
              className={`avail-day-btn ${isActive ? 'avail-day-active' : ''}`}
              onClick={() => setActiveDay(d.index)}
            >
              <span className="avail-day-name">{d.short}</span>
              {count > 0 && <span className="avail-day-dot">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Slots for active day */}
      <div className="avail-day-content">
        <div className="avail-day-title-row">
          <h4>{days.find(d => d.index === activeDay)?.label} Availability</h4>
          <Button variant="secondary" size="sm" icon={Plus} onClick={addSlot}>
            Add Slot
          </Button>
        </div>

        {daySlots.length === 0 ? (
          <div className="avail-empty-day">
            <Clock size={24} className="text-tertiary mb-2" />
            <p>No availability added for {days.find(d => d.index === activeDay)?.label}.</p>
            <p className="text-xs text-tertiary">Partners won't be able to request sessions on this day.</p>
          </div>
        ) : (
          <div className="avail-slots-list">
            {daySlots.map((slot, idx) => (
              <div key={idx} className="avail-slot-row animate-fade-in">
                <div className="avail-time-inputs">
                  <div className="avail-time-col">
                    <label>From</label>
                    <select
                      value={slot.startTime}
                      onChange={(e) => updateSlot(idx, 'startTime', e.target.value)}
                      className="avail-select"
                    >
                      {timeOptions.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <span className="avail-time-sep">to</span>
                  <div className="avail-time-col">
                    <label>To</label>
                    <select
                      value={slot.endTime}
                      onChange={(e) => updateSlot(idx, 'endTime', e.target.value)}
                      className="avail-select"
                    >
                      {timeOptions.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  className="avail-remove-btn"
                  onClick={() => removeSlot(idx)}
                  aria-label="Remove slot"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
