import * as Slider from "@radix-ui/react-slider";

export function RadiusSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (km: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="font-medium">रेंज</span>
        <span className="font-display text-3xl tabular-nums text-saffron">{value} किमी</span>
      </div>
      <Slider.Root
        min={1}
        max={10}
        step={1}
        value={[value]}
        onValueChange={(next) => onChange(next[0] ?? 1)}
        className="relative flex h-11 w-full touch-none items-center"
        aria-label="रेंज किलोमीटर"
      >
        <Slider.Track className="relative h-1.5 grow rounded-full bg-line">
          <Slider.Range className="absolute h-full rounded-full bg-saffron" />
        </Slider.Track>
        <Slider.Thumb className="block size-8 rounded-full border-2 border-ink bg-card" />
      </Slider.Root>
      <div className="mt-1 flex justify-between text-xs text-muted">
        <span>1 किमी</span>
        <span>10 किमी</span>
      </div>
      <p className="mt-2 text-sm text-muted">
        नंबर तभी खुलता है जब दूरी आपकी रेंज और मकान मालिक की रेंज, दोनों से कम हो।
      </p>
    </div>
  );
}
