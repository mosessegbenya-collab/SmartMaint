import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import {
  Button,
  Card,
  Icon,
  IconButton,
  Row,
  Select,
  Txt,
  usePalette,
} from "./ui";

export function DateTimeField({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  const p = usePalette();
  const initial = Number.isFinite(Date.parse(value))
    ? new Date(value)
    : new Date();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(initial);
  const [month, setMonth] = useState(
    new Date(initial.getFullYear(), initial.getMonth(), 1),
  );
  const first = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const count = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const choose = (day: number) =>
    setDate(
      (current) =>
        new Date(
          month.getFullYear(),
          month.getMonth(),
          day,
          current.getHours(),
          current.getMinutes(),
        ),
    );
  const show = () => {
    const current = Number.isFinite(Date.parse(value))
      ? new Date(value)
      : new Date();
    setDate(current);
    setMonth(new Date(current.getFullYear(), current.getMonth(), 1));
    setOpen(true);
  };
  return (
    <View style={{ gap: 6 }}>
      <Txt size={13} weight="600">
        {label}
      </Txt>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? initial.toLocaleString() : "Choose date and time"}`}
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={show}
        style={{
          minHeight: 48,
          borderWidth: 1,
          borderColor: p.border,
          backgroundColor: p.input,
          borderRadius: 10,
          padding: 12,
        }}
      >
        <Row>
          <Icon name="calendar-outline" size={19} />
          <Txt style={{ flex: 1 }}>
            {value ? initial.toLocaleString() : "Choose date and time"}
          </Txt>
          <Icon name="chevron-down" size={16} />
        </Row>
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(8,20,40,0.35)",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <Card
            style={{
              gap: 12,
              maxWidth: 430,
              width: "100%",
              alignSelf: "center",
            }}
          >
            <Txt size={19} weight="700">
              {label}
            </Txt>
            <Row style={{ justifyContent: "space-between" }}>
              <IconButton
                name="chevron-back"
                label="Previous month"
                onPress={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() - 1, 1),
                  )
                }
              />
              <Txt weight="600">
                {month.toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </Txt>
              <IconButton
                name="chevron-forward"
                label="Next month"
                onPress={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() + 1, 1),
                  )
                }
              />
            </Row>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                <View
                  key={day}
                  style={{
                    width: "14.285%",
                    alignItems: "center",
                    paddingVertical: 8,
                  }}
                >
                  <Txt size={11} muted>
                    {day}
                  </Txt>
                </View>
              ))}
              {Array.from({ length: first + count }, (_, i) => {
                const day = i - first + 1;
                const selected =
                  day === date.getDate() &&
                  month.getMonth() === date.getMonth() &&
                  month.getFullYear() === date.getFullYear();
                return day < 1 ? (
                  <View
                    key={`blank-${i}`}
                    style={{ width: "14.285%", height: 44 }}
                  />
                ) : (
                  <Pressable
                    key={day}
                    accessibilityRole="button"
                    accessibilityLabel={new Date(
                      month.getFullYear(),
                      month.getMonth(),
                      day,
                    ).toDateString()}
                    accessibilityState={{ selected }}
                    onPress={() => choose(day)}
                    style={{
                      width: "14.285%",
                      minHeight: 44,
                      borderRadius: 22,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: selected ? "#0866E8" : "transparent",
                    }}
                  >
                    <Txt color={selected ? "#fff" : p.text}>{day}</Txt>
                  </Pressable>
                );
              })}
            </View>
            <Row style={{ alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <Select
                  label="Hour"
                  values={Array.from({ length: 24 }, (_, i) =>
                    String(i).padStart(2, "0"),
                  )}
                  value={String(date.getHours()).padStart(2, "0")}
                  onChange={(hour) =>
                    setDate(
                      (d) =>
                        new Date(
                          d.getFullYear(),
                          d.getMonth(),
                          d.getDate(),
                          Number(hour),
                          d.getMinutes(),
                        ),
                    )
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Select
                  label="Minute"
                  values={Array.from({ length: 60 }, (_, i) =>
                    String(i).padStart(2, "0"),
                  )}
                  value={String(date.getMinutes()).padStart(2, "0")}
                  onChange={(minute) =>
                    setDate(
                      (d) =>
                        new Date(
                          d.getFullYear(),
                          d.getMonth(),
                          d.getDate(),
                          d.getHours(),
                          Number(minute),
                        ),
                    )
                  }
                />
              </View>
            </Row>
            <Txt size={11} muted>
              Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </Txt>
            <Button
              label="Use Selected Date"
              disabled={disabled}
              onPress={() => {
                if (!disabled) onChange(date.toISOString());
                setOpen(false);
              }}
            />
            {!required && (
              <Button
                label="Clear Date"
                disabled={disabled}
                variant="secondary"
                onPress={() => {
                  if (!disabled) onChange("");
                  setOpen(false);
                }}
              />
            )}
            <Button
              label="Cancel"
              variant="secondary"
              onPress={() => setOpen(false)}
            />
          </Card>
        </View>
      </Modal>
    </View>
  );
}
