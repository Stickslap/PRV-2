import { useState, useEffect } from "react";
import { 
  Save, 
  RotateCcw, 
  Type, 
  FileText, 
  Video, 
  Image as ImageIcon,
  Layout,
  CheckCircle2,
  ExternalLink,
  Upload
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AboutContent {
  heroTitle: string;
  heroSubtitle: string;
  missionTitle: string;
  missionTagline: string;
  paragraph1: string;
  paragraph2: string;
  videoUrl: string;
  thumbnailUrl: string;
  highlights: string[];
}

const DEFAULT_CONTENT: AboutContent = {
  heroTitle: "DEFINING THE PRINT SOCIETY",
  heroSubtitle: "We aren't just a sticker shop. We are a collective of designers and printers dedicated to the art of the perfect adhesive.",
  missionTitle: "OUR MISSION",
  missionTagline: "Stick to Greatness.",
  paragraph1: "Founded in 2024, Print Society .co was built on a simple observation: ordering custom stickers was either too expensive or unnecessarily complicated. We knew there had to be a better way.",
  paragraph2: "We believe printing is more than just production—it's craftsmanship. Every project we touch is treated as a piece of art, with careful attention to quality, detail, and customer experience.",
  videoUrl: "https://www.youtube.com/embed/MJ9JaM7tI3w",
  thumbnailUrl: "https://picsum.photos/seed/about-vid/1200/800",
  highlights: ["PRINT SHOP", "MADE IN USA", "STAIN RESISTANT"]
};

export function AdminAbout() {
  const [content, setContent] = useState<AboutContent>(DEFAULT_CONTENT);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"narrative" | "media" | "highlights">("narrative");

  useEffect(() => {
    const saved = localStorage.getItem("about_us_content");
    if (saved) {
      setContent(JSON.parse(saved));
    }
  }, []);

  const handleSave = () => {
    setSaving(true);
    localStorage.setItem("about_us_content", JSON.stringify(content));
    setTimeout(() => {
      setSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 800);
  };

  const handleReset = () => {
    if (confirm("Revert to default manifest? All unsaved changes will be lost.")) {
      setContent(DEFAULT_CONTENT);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-headline font-black uppercase tracking-tighter italic text-gray-900">About Us <span className="text-primary italic">Admin</span></h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Manage mission narrative and collaborator showcase.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-3 bg-primary text-white px-8 py-4 rounded-2xl font-headline font-black uppercase italic text-[11px] hover:shadow-[0_8px_30px_rgba(87,25,211,0.3)] transition-all disabled:opacity-50"
        >
          {saving ? (
            <RotateCcw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? "SYNCING..." : "Sync Changes —"}
        </button>
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700 font-bold text-[10px] uppercase tracking-widest"
          >
            <CheckCircle2 className="w-4 h-4" /> Content Protocol Synchronized Successfully
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white border border-gray-100 rounded-[40px] shadow-sm overflow-hidden">
        <div className="flex bg-gray-50/50 border-b border-gray-100">
           {(["narrative", "media", "highlights"] as const).map(tab => (
             <button
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={`px-8 py-5 text-[10px] font-black uppercase tracking-widest transition-all ${
                 activeTab === tab ? "text-primary border-b-2 border-primary bg-white" : "text-gray-400 hover:text-gray-900"
               }`}
             >
               {tab}
             </button>
           ))}
        </div>

        <div className="p-10 space-y-12">
          {activeTab === "narrative" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Main Header Title</label>
                  <div className="relative">
                    <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input 
                      type="text" 
                      value={content.heroTitle}
                      onChange={e => setContent({...content, heroTitle: e.target.value.toUpperCase()})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-black italic uppercase outline-none focus:bg-white focus:border-primary transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Hero Subtitle</label>
                  <textarea 
                    value={content.heroSubtitle}
                    onChange={e => setContent({...content, heroSubtitle: e.target.value})}
                    rows={2}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 text-sm font-medium outline-none focus:bg-white focus:border-primary transition-all resize-none leading-relaxed"
                  />
                </div>
              </div>

              <div className="pt-8 border-t border-dashed border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Mission Header</label>
                  <input 
                    type="text" 
                    value={content.missionTitle}
                    onChange={e => setContent({...content, missionTitle: e.target.value.toUpperCase()})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 text-sm font-black italic uppercase outline-none focus:bg-white focus:border-primary transition-all"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Mission Tagline</label>
                  <input 
                    type="text" 
                    value={content.missionTagline}
                    onChange={e => setContent({...content, missionTagline: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all text-gray-600"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Paragraph 1 (The Story)</label>
                <textarea 
                  value={content.paragraph1}
                  onChange={e => setContent({...content, paragraph1: e.target.value})}
                  rows={4}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-5 text-sm font-medium outline-none focus:bg-white focus:border-primary transition-all resize-none leading-relaxed text-gray-500"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Paragraph 2 (The Craft)</label>
                <textarea 
                  value={content.paragraph2}
                  onChange={e => setContent({...content, paragraph2: e.target.value})}
                  rows={4}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-5 text-sm font-medium outline-none focus:bg-white focus:border-primary transition-all resize-none leading-relaxed text-gray-500"
                />
              </div>
            </motion.div>
          )}

          {activeTab === "media" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">YouTube Embed URL</label>
                      <div className="relative">
                        <Video className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input 
                          type="text" 
                          value={content.videoUrl}
                          onChange={e => setContent({...content, videoUrl: e.target.value})}
                          placeholder="https://www.youtube.com/embed/..."
                          className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-[11px] font-bold outline-none focus:bg-white focus:border-primary transition-all"
                        />
                      </div>
                    </div>
                    <div className="aspect-video bg-black rounded-3xl overflow-hidden border border-gray-200 shadow-inner group relative">
                       <iframe 
                         src={content.videoUrl} 
                         className="w-full h-full grayscale opacity-50 contrast-125"
                         title="Preview"
                       />
                       <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-[10px] font-black text-white uppercase tracking-widest">Live Narrative Preview</p>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Thumbnail Asset URL</label>
                      <div className="relative">
                        <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input 
                          type="text" 
                          value={content.thumbnailUrl}
                          onChange={e => setContent({...content, thumbnailUrl: e.target.value})}
                          className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-[11px] font-bold outline-none focus:bg-white focus:border-primary transition-all"
                        />
                      </div>
                    </div>
                    <div className="aspect-video rounded-3xl overflow-hidden border border-gray-200 shadow-inner hover:shadow-xl transition-shadow cursor-pointer">
                      <img src={content.thumbnailUrl} className="w-full h-full object-cover" alt="Thumbnail Preview" />
                    </div>
                  </div>
               </div>

               <div className="p-8 bg-black rounded-[32px] flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-headline font-black italic uppercase tracking-tighter text-lg leading-none">External Asset Vault</h4>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Upload directly to your cloud storage providers.</p>
                  </div>
                  <div className="flex gap-4">
                     <button className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                        <Upload className="w-3.5 h-3.5" /> Media Engine
                     </button>
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === "highlights" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
               <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Mission Credentials (Comma Separated)</label>
                  <input 
                    type="text" 
                    placeholder="E.G., PRINT SHOP, MADE IN USA, HAND INSPECTED"
                    value={content.highlights.join(", ")}
                    onChange={e => setContent({...content, highlights: e.target.value.split(",").map(s => s.trim().toUpperCase()).filter(s => s !== "")})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-5 text-sm font-black italic uppercase tracking-tighter outline-none focus:bg-white focus:border-primary transition-all shadow-sm"
                  />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                  {content.highlights.map((h, i) => (
                    <div key={i} className="p-6 bg-gray-50 border border-gray-100 rounded-3xl flex flex-col items-center justify-center text-center group hover:bg-white hover:border-primary transition-all">
                       <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-4 group-hover:scale-110 transition-transform" />
                       <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-900">{h}</span>
                    </div>
                  ))}
               </div>

               <div className="mt-12 p-10 bg-gray-50 rounded-[40px] border border-dashed border-gray-200 flex flex-col items-center">
                  <Layout className="w-10 h-10 text-gray-300 mb-4" />
                  <p className="text-sm font-bold text-gray-400 text-center max-w-sm uppercase tracking-tight">These credentials will appear as verified badges next to your mission statement on the public About page.</p>
               </div>
            </motion.div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
           <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase tracking-widest">
              <ExternalLink className="w-3.5 h-3.5" /> Preview public manifest
           </div>
           <button 
             onClick={handleReset}
             className="flex items-center gap-2 text-gray-400 hover:text-red-500 text-[10px] font-black uppercase tracking-widest transition-colors"
           >
             <RotateCcw className="w-3.5 h-3.5" /> Revert Prototype
           </button>
        </div>
      </div>
    </div>
  );
}
