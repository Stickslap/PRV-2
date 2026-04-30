import { motion } from "motion/react";
import { Flag, Maximize, Flame, Zap, CheckCircle2 } from "lucide-react";

interface Feature {
  id: string;
  label: string;
  icon: string;
}

interface ProductFeaturesBarProps {
  productId: string;
  features?: Feature[];
}

const ICON_MAP: Record<string, any> = {
  flag: Flag,
  maximize: Maximize,
  flame: Flame,
  zap: Zap,
  check: CheckCircle2,
};

export function ProductFeaturesBar({ productId, features: propFeatures }: ProductFeaturesBarProps) {
  // Try to load from localStorage if not provided as props
  const savedFeatures = localStorage.getItem(`product_features_${productId}`);
  const features = propFeatures || (savedFeatures ? JSON.parse(savedFeatures) : [
    { id: '1', label: 'MADE IN THE U.S.A', icon: 'flag' },
    { id: '2', label: 'CAST VINYL', icon: 'maximize' },
    { id: '3', label: 'BRIGHTEST COLOR', icon: 'flame' },
    { id: '4', label: 'FLO™ TECHNOLOGY', icon: 'zap' },
  ]);

  if (features.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full my-12">
      {features.map((feature: Feature, index: number) => {
        const IconComponent = ICON_MAP[feature.icon] || CheckCircle2;
        return (
          <motion.div
            key={feature.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            viewport={{ once: true }}
            className="group relative bg-[#151619] border border-white/5 rounded-2xl p-6 flex items-center gap-4 hover:bg-[#1c1d21] transition-all hover:border-white/10 shadow-2xl"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/40 group-hover:text-white/100 group-hover:border-white/20 transition-all">
              <IconComponent className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90 group-hover:text-white transition-colors font-mono">
                {feature.label}
              </span>
            </div>
            {/* Subtle light effect on hover */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </motion.div>
        );
      })}
    </div>
  );
}
