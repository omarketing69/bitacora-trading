import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { EMOCIONES } from "./constants";

interface EmotionPickerProps {
  emocion: string;
  intensidad: number;
  onChange: (emocion: string, intensidad: number) => void;
  label?: string;
}

export function EmotionPicker({ emocion, intensidad, onChange, label = "¿Cómo te sientes ahora?" }: EmotionPickerProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{label}</p>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {EMOCIONES.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => onChange(e.id, intensidad)}
            className={cn(
              "rounded-lg border px-2 py-2 text-xs flex flex-col items-center gap-1 transition-colors",
              emocion === e.id ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            <span className="text-lg" aria-hidden>
              {e.emoji}
            </span>
            {e.label}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Intensidad</span>
          <span className="font-mono text-foreground">{intensidad} / 5</span>
        </div>
        <Slider min={1} max={5} step={1} value={[intensidad]} onValueChange={([v]) => onChange(emocion, v)} />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Leve</span>
          <span>Muy intensa</span>
        </div>
      </div>
    </div>
  );
}
