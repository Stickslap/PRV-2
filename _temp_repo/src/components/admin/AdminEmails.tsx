import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { 
  Mail, 
  Edit2, 
  Save, 
  X, 
  RotateCcw, 
  Eye, 
  ChevronRight, 
  Info, 
  Search, 
  Plus, 
  Send, 
  MoreHorizontal,
  FileText,
  Settings2,
  Clock,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface EmailTemplate {
  type_id: string;
  type_name: string;
  subject: string;
  body: string;
  is_enabled: boolean;
  updated_at?: string;
}

export function AdminEmails() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"list" | "edit">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [testEmail, setTestEmail] = useState("hello@printsocietyco.com");
  const [isSendingTest, setIsSendingTest] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/admin/email-templates");
      setTemplates(data.data || []);
    } catch (err) {
      console.error("Failed to fetch templates:", err);
      toast.error("Could not sync with BigCommerce emails");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (template: EmailTemplate) => {
    try {
      await axios.put(`/api/admin/email-templates/${template.type_id}`, {
        is_enabled: !template.is_enabled
      });
      setTemplates(prev => prev.map(t => 
        t.type_id === template.type_id ? { ...t, is_enabled: !t.is_enabled } : t
      ));
      toast.success(`${template.type_name} status updated`);
    } catch (err: any) {
      const details = err.response?.data?.details?.title || err.response?.data?.details?.errors || "Update rejected";
      toast.error(`BigCommerce: ${details}`);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail) return;
    setIsSendingTest(true);
    try {
      await axios.post("/api/admin/email-templates/test", { email: testEmail });
      toast.success(`Test dispatch transmitted to ${testEmail}`);
    } catch (err: any) {
      const msg = err.response?.data?.error || "Transmission failed";
      if (msg.includes("not configured")) {
        // Fallback simulation for demo purposes if key is missing
        setTimeout(() => {
          setIsSendingTest(false);
          toast.success(`Simulation: Test dispatch sent to ${testEmail}`);
        }, 1000);
        return;
      }
      toast.error(msg);
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate({ ...template });
    setView("edit");
  };

  const handleSave = async () => {
    if (!editingTemplate) return;
    setSaving(true);
    try {
      await axios.put(`/api/admin/email-templates/${editingTemplate.type_id}`, {
        subject: editingTemplate.subject,
        body: editingTemplate.body,
        is_enabled: editingTemplate.is_enabled
      });
      toast.success("BigCommerce template updated live");
      fetchTemplates();
      setView("list");
      setEditingTemplate(null);
    } catch (err: any) {
      const data = err.response?.data;
      const details = data?.details?.title || data?.details?.errors 
        ? JSON.stringify(data.details.errors || data.details.title) 
        : data?.error || "Payload rejected by BigCommerce";
      
      console.error("Failed to update template:", data);
      toast.error(`BigCommerce: ${details}`);
    } finally {
      setSaving(false);
    }
  };

  const filteredTemplates = (templates || []).filter(t => 
    (t.type_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) || 
    (t.subject?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  if (loading && view === "list") {
    return (
      <div className="p-20 text-center font-headline font-black uppercase italic tracking-widest text-xs animate-pulse text-gray-400">
        Syncing Communication Network...
      </div>
    );
  }

  return (
    <div className="max-w-[1240px] mx-auto space-y-12 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 bg-[#F3E8FF] px-4 py-1.5 rounded-full mb-6 border border-primary/20">
            <Settings2 className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Automation Registry</span>
          </div>
          <h1 className="text-6xl font-headline font-black italic tracking-tighter uppercase leading-none mb-4">
            Email <span className="text-primary">Templates</span>
          </h1>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] max-w-xl">
            Manage the visual identity and logic of automated shop communications.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={fetchTemplates}
            className="px-8 py-5 bg-white border border-gray-100 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center gap-3 shadow-sm"
          >
            <RotateCcw className="w-4 h-4" /> Seed Defaults —
          </button>
          <button className="px-8 py-5 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-primary/20 flex items-center gap-3">
            <Plus className="w-4 h-4" /> Build Template —
          </button>
        </div>
      </div>

      {view === "list" ? (
        <>
          {/* Diagnostic Console */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#F6F2FF] border border-primary/10 rounded-[44px] p-10 flex flex-col lg:flex-row items-center justify-between gap-10 shadow-sm relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full translate-x-1/2 -translate-y-1/2" />
            
            <div className="flex items-center gap-8 relative z-10">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/30">
                <Send className="w-8 h-8 text-white -rotate-12" />
              </div>
              <div>
                <h3 className="text-2xl font-headline font-black italic uppercase tracking-tight leading-none mb-1 text-black">Diagnostic Console</h3>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest opacity-60">Verify Resend API Connectivity</p>
              </div>
            </div>
            
            <div className="flex flex-1 max-w-2xl w-full gap-4 relative z-10">
              <div className="flex-1 bg-white rounded-2xl flex items-center px-6 border border-white shadow-sm focus-within:ring-4 focus-within:ring-primary/5 transition-all">
                <input 
                  type="email" 
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full py-4 text-xs font-bold text-gray-600 focus:outline-none"
                  placeholder="hello@printsocietyco.com"
                />
              </div>
              <button 
                onClick={handleSendTest}
                disabled={isSendingTest}
                className="px-10 py-4 bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-900 transition-all active:scale-95 disabled:opacity-50 shadow-xl"
              >
                {isSendingTest ? 'Sending...' : 'Send Test Dispatch —'}
              </button>
            </div>
          </motion.div>

          {/* Table Container */}
          <div className="bg-white border border-gray-100 rounded-[48px] overflow-hidden shadow-sm">
            <div className="p-10 border-b border-gray-50 bg-white flex items-center gap-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or trigger event..."
                  className="w-full bg-gray-50 border border-gray-50 rounded-2xl pl-14 pr-6 py-4 text-xs font-bold focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/30">
                    <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Template Profile</th>
                    <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Event Trigger</th>
                    <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Lifecycle</th>
                    <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Automation Status</th>
                    <th className="px-10 py-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredTemplates.map((template) => (
                    <tr key={template.type_id} className="hover:bg-gray-50/30 transition-all group">
                      <td className="px-10 py-10">
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-primary/5 group-hover:text-primary transition-all border border-transparent group-hover:border-primary/10">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black uppercase font-headline italic tracking-tight mb-0.5">{template.type_name}</h4>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic leading-none">
                              Design Authorized: <span className="text-gray-300 font-medium">#&#123;&#123;order_id&#125;&#125;</span>
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-10">
                        <span className="bg-primary/5 text-primary text-[9px] font-black px-4 py-2 rounded-full uppercase border border-primary/10">
                          {template.type_id.toUpperCase().replace('-', '_')}
                        </span>
                      </td>
                      <td className="px-10 py-10">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest italic">{new Date().toLocaleDateString()}</span>
                      </td>
                      <td className="px-10 py-10">
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => handleToggleStatus(template)}
                            className="relative focus:outline-none"
                          >
                            <div className={`w-14 h-7 rounded-full transition-all duration-300 ${template.is_enabled ? 'bg-primary' : 'bg-gray-200'}`}>
                              <motion.div 
                                animate={{ x: template.is_enabled ? 28 : 4 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg"
                              />
                            </div>
                          </button>
                          <span className={`text-[10px] font-black uppercase tracking-widest italic ${template.is_enabled ? 'text-primary' : 'text-gray-300'}`}>
                            {template.is_enabled ? 'Live' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="px-10 py-10 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <button className="p-3 text-gray-300 hover:text-gray-600 transition-colors">
                            <MoreHorizontal className="w-6 h-6" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredTemplates.length === 0 && (
              <div className="p-32 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-[30px] flex items-center justify-center mx-auto mb-6">
                  <Info className="w-8 h-8 text-gray-200" />
                </div>
                <h3 className="text-lg font-headline font-black italic uppercase tracking-tight text-gray-400 mb-2">Registry Silent</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300 italic">No communication protocols detected matching your query.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white border border-gray-100 rounded-[56px] shadow-2xl p-20"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-10 mb-20">
            <div className="flex items-center gap-8">
              <button 
                onClick={() => setView("list")}
                className="w-16 h-16 border border-gray-100 rounded-3xl flex items-center justify-center hover:bg-gray-50 transition-all group shadow-sm"
              >
                <X className="w-7 h-7 text-gray-300 group-hover:text-black transition-colors" />
              </button>
              <div>
                <h2 className="text-4xl font-headline font-black italic uppercase tracking-tighter leading-none mb-2">
                  Refine <span className="text-primary">Payload</span>
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">Target Protocol:</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 px-4 py-1.5 rounded-full font-headline italic">{editingTemplate?.type_name}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="px-10 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-100 transition-all">Preview Simulation —</button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="px-12 py-5 bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-primary/10 flex items-center gap-4 disabled:opacity-50"
              >
                {saving ? (
                   <RotateCcw className="w-4 h-4 animate-spin" />
                ) : (
                   <Save className="w-4 h-4" />
                )}
                {saving ? 'Transmitting...' : 'Commit Changes —'}
              </button>
            </div>
          </div>

          <div className="space-y-12">
            <div className="space-y-4">
              <label className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-400 block px-4 opacity-50 italic">Transmission Subject Reference</label>
              <input 
                type="text"
                value={editingTemplate?.subject}
                onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, subject: e.target.value } : null)}
                className="w-full bg-gray-50 border border-transparent rounded-[32px] px-10 py-8 text-3xl font-headline font-black italic uppercase tracking-tight focus:outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary/20 transition-all shadow-inner"
                placeholder="Protocol Subject..."
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-4">
                <label className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-400 flex items-center gap-3 opacity-50 italic">
                  <FileText className="w-4 h-4" /> Payload Skeleton (HTML Architecture)
                </label>
                <div className="hidden lg:flex items-center gap-5 text-[10px] font-black text-primary tracking-widest uppercase italic">
                  <span className="bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/5 shadow-sm">&#123;&nbsp;&#123;order_id&#125;&nbsp;&#125;</span>
                  <span className="bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/5 shadow-sm">&#123;&nbsp;&#123;customer_name&#125;&nbsp;&#125;</span>
                </div>
              </div>
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 to-transparent rounded-[48px] blur-xl opacity-50 group-focus-within:opacity-100 transition-opacity" />
                <textarea 
                  rows={25}
                  value={editingTemplate?.body}
                  onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, body: e.target.value } : null)}
                  className="relative w-full bg-[#0D0D0D] text-emerald-400 font-mono text-[13px] leading-[1.8] border-0 rounded-[48px] p-16 focus:ring-0 focus:outline-none transition-all resize-none shadow-2xl selection:bg-primary/40 scrollbar-hide"
                  spellCheck={false}
                />
              </div>
            </div>
          </div>

          <div className="mt-20 pt-16 border-t border-gray-50 flex flex-col sm:flex-row items-center justify-between gap-10">
            <div className="flex items-start gap-5 max-w-lg">
               <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center shrink-0">
                 <Info className="w-6 h-6 text-primary" />
               </div>
               <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 italic leading-relaxed">
                 Warning: Changes to the payload skeleton will affect live customer communications immediately across all active storefront instances.
               </p>
            </div>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto px-20 py-7 bg-primary text-white rounded-[32px] text-sm font-black uppercase tracking-[0.4em] hover:bg-black transition-all shadow-[0_20px_50px_rgba(139,92,246,0.3)] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-4"
            >
              {saving ? 'Transmitting Data...' : 'Deploy Global Payload'}
              <ChevronRight className={`w-5 h-5 transition-transform ${saving ? 'hidden' : 'group-hover:translate-x-1'}`} />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

