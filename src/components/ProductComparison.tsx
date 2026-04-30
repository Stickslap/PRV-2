import { Check } from "lucide-react";

interface ComparisonData {
  durabilityLabel: string;
  durabilityValue: string;
  compatibilityLabel: string;
  compatibilityValue: string;
  adhesiveLabel: string;
  adhesiveValue: string;
  materialLabel: string;
  materialValue: string;
}

export function ProductComparison({ data }: { data: ComparisonData }) {
  if (!data) return null;
  
  const rows = [
    { label: data.durabilityLabel || 'Durability', value: data.durabilityValue || 'N/A' },
    { label: data.compatibilityLabel || 'Compatibility', value: data.compatibilityValue || 'N/A' },
    { label: data.adhesiveLabel || 'Adhesive Logic', value: data.adhesiveValue || 'N/A' },
    { label: data.materialLabel || 'Material Specs', value: data.materialValue || 'N/A' }
  ];

  return (
    <div className="bg-white border border-gray-100 rounded-[32px] p-6 md:p-10 mt-12 mb-12 shadow-sm">
      <h3 className="text-2xl font-headline font-black uppercase italic tracking-tighter mb-8">
        Material Intelligence <span className="text-primary disabled:opacity-50">Matrix</span>
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {rows.map((row, idx) => (
          <div key={idx} className="bg-[#FCFCFD] border border-gray-100 p-6 rounded-2xl flex flex-col hover:border-gray-200 transition-colors">
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">
              {row.label}
            </span>
            <div className="flex items-start gap-3 mt-auto">
              <div className="mt-1 w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3" />
              </div>
              <span className="text-sm font-bold text-gray-900 leading-tight">
                {row.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
