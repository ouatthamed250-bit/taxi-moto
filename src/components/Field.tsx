import type { FC } from 'react';
import { COLORS } from '../theme';

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: 'text' | 'tel' | 'numeric';
}

export const Field: FC<FieldProps> = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  inputMode,
}) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ fontSize: 13, fontWeight: 700, color: COLORS.navy }}>{label}</label>
    <input
      type={type}
      inputMode={inputMode}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        padding: '15px',
        marginTop: 8,
        fontSize: 16,
        borderRadius: 16,
        border: `1.5px solid ${COLORS.grayLight}`,
        backgroundColor: COLORS.grayLight,
        outline: 'none',
        fontFamily: 'inherit',
      }}
    />
  </div>
);
