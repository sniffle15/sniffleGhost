import { useRef } from "react";
import { cn } from "@/lib/utils";
import { Input, type InputProps } from "@/components/ui/input";
import { Textarea, type TextareaProps } from "@/components/ui/textarea";
import { VariablePicker } from "./variable-picker";

interface VariableInputProps extends Omit<InputProps, "value" | "onChange"> {
  value: string;
  onValueChange: (value: string) => void;
}

interface VariableTextareaProps extends Omit<TextareaProps, "value" | "onChange"> {
  value: string;
  onValueChange: (value: string) => void;
}

export function VariableInput({ value, onValueChange, className, ...props }: VariableInputProps) {
  const ref = useRef<HTMLInputElement>(null);

  function insertToken(token: string) {
    const current = value ?? "";
    const input = ref.current;
    const start = input?.selectionStart ?? current.length;
    const end = input?.selectionEnd ?? current.length;
    const next = `${current.slice(0, start)}${token}${current.slice(end)}`;
    onValueChange(next);
    requestAnimationFrame(() => {
      input?.focus();
      const pos = start + token.length;
      input?.setSelectionRange(pos, pos);
    });
  }

  return (
    <div className="relative">
      <Input
        ref={ref}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn("pr-11", className)}
        {...props}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2">
        <VariablePicker onSelect={insertToken} />
      </div>
    </div>
  );
}

export function VariableTextarea({ value, onValueChange, className, ...props }: VariableTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function insertToken(token: string) {
    const current = value ?? "";
    const input = ref.current;
    const start = input?.selectionStart ?? current.length;
    const end = input?.selectionEnd ?? current.length;
    const next = `${current.slice(0, start)}${token}${current.slice(end)}`;
    onValueChange(next);
    requestAnimationFrame(() => {
      input?.focus();
      const pos = start + token.length;
      input?.setSelectionRange(pos, pos);
    });
  }

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn("pr-11", className)}
        {...props}
      />
      <div className="absolute right-2 top-2">
        <VariablePicker onSelect={insertToken} />
      </div>
    </div>
  );
}
