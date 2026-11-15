import type { FormState } from "@/app/actions";

export default function FormMessage({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-red-600">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-emerald-600">{state.ok}</p>;
  return null;
}
