'use client';

import { I18nProvider, DatePicker, DateField, Calendar, Label, FieldError } from '@heroui/react';
import { parseDate } from '@internationalized/date';

interface DateFieldPickerProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  isDisabled: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
}

export function DateFieldPicker({
  label,
  value,
  onChange,
  isDisabled,
  isRequired,
  isInvalid,
  errorMessage,
}: DateFieldPickerProps) {
  return (
    <I18nProvider locale="id-ID">
      <DatePicker
        className="w-full"
        value={value ? parseDate(value) : null}
        onChange={(d) => onChange(d ? d.toString() : '')}
        isDisabled={isDisabled}
        isRequired={isRequired}
        isInvalid={isInvalid}
      >
        <Label>{label}</Label>
        <DateField.Group fullWidth variant="secondary">
          <DateField.Input>
            {(s) => <DateField.Segment segment={s} />}
          </DateField.Input>
          <DateField.Suffix>
            <DatePicker.Trigger>
              <DatePicker.TriggerIndicator />
            </DatePicker.Trigger>
          </DateField.Suffix>
        </DateField.Group>
        {errorMessage && <FieldError>{errorMessage}</FieldError>}
        <DatePicker.Popover>
          <Calendar aria-label={`Pilih ${label.toLowerCase()}`}>
            <Calendar.Header>
              <Calendar.YearPickerTrigger>
                <Calendar.YearPickerTriggerHeading />
                <Calendar.YearPickerTriggerIndicator />
              </Calendar.YearPickerTrigger>
              <Calendar.NavButton slot="previous" />
              <Calendar.NavButton slot="next" />
            </Calendar.Header>
            <Calendar.Grid>
              <Calendar.GridHeader>
                {(d) => <Calendar.HeaderCell>{d}</Calendar.HeaderCell>}
              </Calendar.GridHeader>
              <Calendar.GridBody>
                {(d) => <Calendar.Cell date={d} />}
              </Calendar.GridBody>
            </Calendar.Grid>
            <Calendar.YearPickerGrid>
              <Calendar.YearPickerGridBody>
                {({ year }) => <Calendar.YearPickerCell year={year} />}
              </Calendar.YearPickerGridBody>
            </Calendar.YearPickerGrid>
          </Calendar>
        </DatePicker.Popover>
      </DatePicker>
    </I18nProvider>
  );
}
