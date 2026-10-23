import { NativeSelect } from "@/components/ui/native-select";
import { DIMENSION_LABELS, type UnitDimension, type UnitInfo } from "@/domain/units/units";

export function UnitSelect({
  units,
  dimensions,
  ...props
}: React.ComponentProps<"select"> & {
  units: (UnitInfo & { name: string })[];
  dimensions?: UnitDimension[];
}) {
  const groups = new Map<UnitDimension, (UnitInfo & { name: string })[]>();
  for (const u of units) {
    if (dimensions && !dimensions.includes(u.dimension)) continue;
    if (!groups.has(u.dimension)) groups.set(u.dimension, []);
    groups.get(u.dimension)!.push(u);
  }
  return (
    <NativeSelect {...props}>
      <option value="">Selecione…</option>
      {[...groups.entries()].map(([dimension, list]) => (
        <optgroup key={dimension} label={DIMENSION_LABELS[dimension]}>
          {list.map((u) => (
            <option key={u.code} value={u.code}>
              {u.name} ({u.symbol})
            </option>
          ))}
        </optgroup>
      ))}
    </NativeSelect>
  );
}
