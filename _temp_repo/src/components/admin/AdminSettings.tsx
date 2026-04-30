import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import toast from "react-hot-toast";
import axios from "axios";
import { ShieldCheck, ShieldAlert, Wifi, RefreshCcw } from "lucide-react";

export function AdminSettings() {
  const [settings, setSettings] = useState<any>({
    contactEmail: "print@printsocietyco.com",
    contactPhone: "405-510-8669",
    contactAddress: "HQ & Lab",
    officeHoursMonFri: "9:00 AM — 6:00 PM PST",
    officeHoursSat: "10:00 AM — 2:00 PM PST",
    officeHoursSun: "Closed",
    instagramUrl: "#",
    twitterUrl: "#",
    megaMenu: "",
    footerLinks: "",
    notificationEmail: "alerts@printsocietyco.com"
  });
  const [loading, setLoading] = useState(true);
  const [bcStatus, setBcStatus] = useState<{connected: boolean, message: string, storeName?: string, testing?: boolean}>({ connected: false, message: "Testing connection..." });

  const testBCConnection = async () => {
    setBcStatus(prev => ({ ...prev, testing: true }));
    try {
      const { data } = await axios.get("/api/health/bigcommerce");
      setBcStatus({ 
        connected: data.connected, 
        message: data.message || "Connection verified.",
        storeName: data.storeName,
        testing: false
      });
    } catch (err) {
      setBcStatus({ connected: false, message: "Server unreachable.", testing: false });
    }
  };

  useEffect(() => {
    testBCConnection();
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "global"));
        if (snap.exists()) {
          const data = JSON.parse(snap.data().content || "{}");
          setSettings((prev: any) => ({ ...prev, ...data }));
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, "settings");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const newSettings = {
      contactEmail: fd.get("contactEmail"),
      contactPhone: fd.get("contactPhone"),
      contactAddress: fd.get("contactAddress"),
      officeHoursMonFri: fd.get("officeHoursMonFri"),
      officeHoursSat: fd.get("officeHoursSat"),
      officeHoursSun: fd.get("officeHoursSun"),
      instagramUrl: fd.get("instagramUrl"),
      twitterUrl: fd.get("twitterUrl"),
      megaMenu: fd.get("megaMenu"),
      footerLinks: fd.get("footerLinks"),
      notificationEmail: fd.get("notificationEmail"),
    };

    try {
      await setDoc(doc(db, "settings", "global"), {
        type: "global",
        content: JSON.stringify(newSettings),
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });
      toast.success("Settings saved");
      setSettings(newSettings);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "settings");
      toast.error("Failed to save settings");
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* BigCommerce Connection Status */}
      <div className={`border rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 transition-all ${bcStatus.connected ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'}`}>
        <div className="flex items-center gap-4 text-center md:text-left">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${bcStatus.connected ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
            {bcStatus.connected ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="font-headline font-black italic uppercase text-lg tracking-tight leading-none">
              BigCommerce: {bcStatus.connected ? 'Live' : 'Disconnected'}
            </h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-1">
              {bcStatus.connected ? (
                <span>Linked Store: {bcStatus.storeName} <span className="mx-2 opacity-30">|</span> <span className="opacity-60">{bcStatus.message}</span></span>
              ) : bcStatus.message}
            </p>
          </div>
        </div>

        <button 
          onClick={testBCConnection}
          disabled={bcStatus.testing}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${bcStatus.testing ? 'animate-spin' : ''}`} />
          {bcStatus.testing ? 'Syncing...' : 'Run Diagnostics'}
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-8">
        <h2 className="font-headline font-black italic uppercase text-2xl mb-8">Global Site Settings</h2>
      <form onSubmit={handleSave} className="space-y-6">
        <h3 className="font-bold uppercase tracking-widest text-sm border-b pb-2 mb-4">Contact Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Public Display Email</label>
            <input name="contactEmail" defaultValue={settings.contactEmail} className="w-full p-3 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Notification Email (Admin Alerts)</label>
            <input name="notificationEmail" defaultValue={settings.notificationEmail} className="w-full p-3 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Phone</label>
            <input name="contactPhone" defaultValue={settings.contactPhone} className="w-full p-3 border border-gray-200 rounded-xl text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">HQ / Address Details</label>
          <input name="contactAddress" defaultValue={settings.contactAddress} className="w-full p-3 border border-gray-200 rounded-xl text-sm" />
        </div>
        
        <h3 className="font-bold uppercase tracking-widest text-sm border-b pb-2 mb-4 mt-6">Office Hours</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Mon - Fri</label>
            <input name="officeHoursMonFri" defaultValue={settings.officeHoursMonFri} className="w-full p-3 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Saturday</label>
            <input name="officeHoursSat" defaultValue={settings.officeHoursSat} className="w-full p-3 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Sunday</label>
            <input name="officeHoursSun" defaultValue={settings.officeHoursSun} className="w-full p-3 border border-gray-200 rounded-xl text-sm" />
          </div>
        </div>

        <h3 className="font-bold uppercase tracking-widest text-sm border-b pb-2 mb-4 mt-6">Socials</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Instagram URL</label>
            <input name="instagramUrl" defaultValue={settings.instagramUrl} className="w-full p-3 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Twitter URL</label>
            <input name="twitterUrl" defaultValue={settings.twitterUrl} className="w-full p-3 border border-gray-200 rounded-xl text-sm" />
          </div>
        </div>

        <h3 className="font-bold uppercase tracking-widest text-sm border-b pb-2 mb-4 mt-6">Menus</h3>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Mega Menu external Links</label>
          <textarea
            name="megaMenu"
            defaultValue={settings.megaMenu}
            placeholder="Format: Label, URL (one per line)"
            rows={3}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Footer Links</label>
          <textarea
            name="footerLinks"
            defaultValue={settings.footerLinks}
            placeholder="Format: Label, URL (one per line)"
            rows={3}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm"
          />
        </div>
        
        <button type="submit" className="bg-primary text-white px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors w-full mt-4">
          Save All Settings
        </button>
      </form>
    </div>
  </div>
);
}
