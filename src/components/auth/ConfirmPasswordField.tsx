import { FormField } from '@/components/ui/FormField';

interface ConfirmPasswordFieldProps {
  password: string;
  confirmPassword: string;
  onChange: (value: string) => void;
}

export function ConfirmPasswordField({ password, confirmPassword, onChange }: ConfirmPasswordFieldProps) {
  return (
    <div className="pt-2">
      <FormField
        id="confirmPassword"
        label="Confirmar senha"
        type="password"
        value={confirmPassword}
        onChange={(e) => onChange(e.target.value)}
        required
        autoComplete="new-password"
      />
      {confirmPassword && password !== confirmPassword && (
        <p className="text-xs text-destructive mt-1">As senhas não coincidem</p>
      )}
      {confirmPassword && password === confirmPassword && password.length > 0 && (
        <p className="text-xs text-success mt-1">✓ Senhas coincidem</p>
      )}
    </div>
  );
}
