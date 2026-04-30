import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Play, CheckCircle2 } from "lucide-react";

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
  paragraph1: "Founded in 2024, Print Society Co. was built on a simple observation: ordering custom stickers was either too expensive or unnecessarily complicated. We knew there had to be a better way.",
  paragraph2: "We believe printing is more than just production—it's craftsmanship. Every project we touch is treated as a piece of art, with careful attention to quality, detail, and customer experience.",
  videoUrl: "https://www.youtube.com/embed/MJ9JaM7tI3w",
  thumbnailUrl: "https://picsum.photos/seed/about-vid/1200/800",
  highlights: ["PRINT SHOP", "MADE IN USA", "STAIN RESISTANT"]
};

export function About() {
  const [content, setContent] = useState<AboutContent>(DEFAULT_CONTENT);

  useEffect(() => {
    const saved = localStorage.getItem("about_us_content");
    if (saved) {
      setContent(JSON.parse(saved));
    }
  }, []);

  return (
    <div className="min-h-screen bg-white pt-32 pb-20 px-6">
      <div className="max-w-[1200px] mx-auto">
        
        {/* Story Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8 pr-0 lg:pr-8"
          >
            <div>
              <h2 className="text-4xl md:text-5xl font-headline font-black uppercase italic tracking-tighter text-black mb-3">
                {content.missionTitle}
              </h2>
              <p className="text-lg md:text-xl text-gray-500 font-medium">
                {content.missionTagline}
              </p>
            </div>

            <div className="space-y-6 text-gray-600 text-sm md:text-base leading-relaxed">
              <p>{content.paragraph1}</p>
              <p>{content.paragraph2}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              {content.highlights.map((h, i) => (
                <div key={i} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white shadow-sm">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-black">{h}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Video Player Section */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative w-full aspect-video rounded-[32px] overflow-hidden group shadow-2xl border-[6px] border-white ring-1 ring-black/5 bg-black"
          >
            <iframe 
              src={`${content.videoUrl}${content.videoUrl.includes('?') ? '&' : '?'}autoplay=0&controls=1`}
              className="absolute inset-0 w-full h-full"
              title="About Video"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </motion.div>

        </div>

      </div>

      {/* Contact Section */}
      <div className="max-w-[1200px] mx-auto mt-32 bg-gray-50 rounded-3xl p-8 lg:p-16 border border-gray-100">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div>
            <h2 className="text-3xl font-headline font-black italic uppercase tracking-tighter mb-4">
              Get in Touch
            </h2>
            <p className="text-gray-500 font-medium mb-8">
              Want to start a new project or have a question about an order? 
              Reach out to us. We try to respond to all inquiries within 24 hours.
            </p>
            <div className="space-y-6 text-sm font-bold text-gray-900">
              <div className="flex gap-4 items-center">
                <span className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-black uppercase text-xs">PS</span>
                <p>Hello@printsociety.co</p>
              </div>
              <div className="flex gap-4 items-center">
                <span className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-black uppercase text-xs">PS</span>
                <p>+1 (800) 555-1234</p>
              </div>
            </div>
          </div>
          <div>
            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-2">First Name</label>
                  <input type="text" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary outline-none transition-all placeholder:text-gray-300" placeholder="JANE" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-2">Last Name</label>
                  <input type="text" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary outline-none transition-all placeholder:text-gray-300" placeholder="DOE" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-2">Email Address</label>
                <input type="email" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary outline-none transition-all placeholder:text-gray-300" placeholder="JANE@EXAMPLE.COM" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-2">Message</label>
                <textarea rows={4} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary outline-none transition-all placeholder:text-gray-300 resize-none" placeholder="HOW CAN WE HELP YOU?"></textarea>
              </div>
              <button type="button" className="w-full bg-black text-white py-4 rounded-xl font-headline font-black uppercase tracking-[0.2em] italic text-[13px] hover:bg-gray-800 transition-all">
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>

    </div>
  );
}
