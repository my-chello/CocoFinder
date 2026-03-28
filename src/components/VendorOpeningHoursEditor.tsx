import { useState } from 'react';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  createEmptyVendorOpeningHoursRow,
  formatVendorTimeValue,
  getDateFromVendorTimeValue,
  type VendorOpeningHoursRow,
  VENDOR_OPENING_DAY_OPTIONS,
} from '../lib/vendorOpeningHours';

type ActiveTimePicker =
  | {
      rowId: string;
      field: 'openTime' | 'closeTime';
    }
  | null;

export function VendorOpeningHoursEditor({
  rows,
  onChange,
  addButtonLabel = '+ Add opening time',
}: {
  rows: VendorOpeningHoursRow[];
  onChange: (rows: VendorOpeningHoursRow[]) => void;
  addButtonLabel?: string;
}) {
  const [activeTimePicker, setActiveTimePicker] = useState<ActiveTimePicker>(null);

  function updateRow(rowId: string, updates: Partial<VendorOpeningHoursRow>) {
    onChange(rows.map((row) => (row.id === rowId ? { ...row, ...updates } : row)));
  }

  function addRow() {
    onChange([...rows, createEmptyVendorOpeningHoursRow()]);
  }

  function removeRow(rowId: string) {
    onChange(rows.filter((row) => row.id !== rowId));

    if (activeTimePicker?.rowId === rowId) {
      setActiveTimePicker(null);
    }
  }

  function handleTimeChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (!activeTimePicker) {
      return;
    }

    if (Platform.OS !== 'ios') {
      setActiveTimePicker(null);
    }

    if (event.type === 'dismissed' || !selectedDate) {
      return;
    }

    updateRow(activeTimePicker.rowId, {
      [activeTimePicker.field]: formatVendorTimeValue(selectedDate),
    });
  }

  function normalizeTimeInput(value: string) {
    const digits = value.replace(/[^\d]/g, '').slice(0, 4);

    if (digits.length <= 2) {
      return digits;
    }

    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  }

  return (
    <View style={styles.stack}>
      {rows.map((row) => {
        const isPickerActive = activeTimePicker?.rowId === row.id;
        return (
          <View key={row.id} style={styles.rowCard}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowTitle}>Opening time</Text>
              {rows.length > 1 ? (
                <Pressable onPress={() => removeRow(row.id)} hitSlop={10}>
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={row.dayGroup}
                onValueChange={(value) =>
                  updateRow(row.id, { dayGroup: String(value) as VendorOpeningHoursRow['dayGroup'] })
                }
                style={styles.picker}
              >
                <Picker.Item label="Choose days" value="" />
                {VENDOR_OPENING_DAY_OPTIONS.map((option) => (
                  <Picker.Item key={option} label={option} value={option} />
                ))}
              </Picker>
            </View>

            <View style={styles.timeRow}>
              {Platform.OS === 'web' ? (
                <>
                  <View style={styles.timeField}>
                    <Text style={styles.timeLabel}>Open from</Text>
                    <TextInput
                      value={row.openTime}
                      onChangeText={(value) =>
                        updateRow(row.id, { openTime: normalizeTimeInput(value) })
                      }
                      placeholder="08:00"
                      placeholderTextColor="#94A3B8"
                      style={styles.timeInput}
                    />
                  </View>

                  <View style={styles.timeField}>
                    <Text style={styles.timeLabel}>Until</Text>
                    <TextInput
                      value={row.closeTime}
                      onChangeText={(value) =>
                        updateRow(row.id, { closeTime: normalizeTimeInput(value) })
                      }
                      placeholder="17:00"
                      placeholderTextColor="#94A3B8"
                      style={styles.timeInput}
                    />
                  </View>
                </>
              ) : (
                <>
                  <Pressable
                    style={styles.timeField}
                    onPress={() => setActiveTimePicker({ rowId: row.id, field: 'openTime' })}
                  >
                    <Text style={styles.timeLabel}>Open from</Text>
                    <Text style={styles.timeValue}>{row.openTime || '08:00'}</Text>
                  </Pressable>

                  <Pressable
                    style={styles.timeField}
                    onPress={() => setActiveTimePicker({ rowId: row.id, field: 'closeTime' })}
                  >
                    <Text style={styles.timeLabel}>Until</Text>
                    <Text style={styles.timeValue}>{row.closeTime || '17:00'}</Text>
                  </Pressable>
                </>
              )}
            </View>

            {isPickerActive ? (
              <View style={styles.timePickerWrap}>
                <DateTimePicker
                  value={getDateFromVendorTimeValue(
                    activeTimePicker?.field === 'openTime' ? row.openTime : row.closeTime
                  )}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleTimeChange}
                />
                {Platform.OS === 'ios' ? (
                  <Pressable style={styles.doneButton} onPress={() => setActiveTimePicker(null)}>
                    <Text style={styles.doneButtonText}>Done</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}

      <Pressable style={styles.addButton} onPress={addRow}>
        <Text style={styles.addButtonText}>{addButtonLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 12,
  },
  rowCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D8DEE8',
    backgroundColor: '#F8FAFC',
    padding: 14,
    gap: 12,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  removeText: {
    color: '#B42318',
    fontSize: 13,
    fontWeight: '700',
  },
  pickerWrap: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  picker: {
    color: '#0F172A',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  timeField: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  timeLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  timeValue: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
  },
  timeInput: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 0,
  },
  timePickerWrap: {
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingTop: 8,
    alignItems: 'center',
  },
  doneButton: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  doneButtonText: {
    color: '#176B5C',
    fontSize: 15,
    fontWeight: '700',
  },
  addButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  addButtonText: {
    color: '#176B5C',
    fontSize: 14,
    fontWeight: '800',
  },
});
