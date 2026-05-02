import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

export function AdminJournals() {
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchJournals = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/journals");
      const fetched = Array.isArray(res.data) ? res.data : [];
      setJournals(fetched);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load journals from BigCommerce");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJournals(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const data = {
      title: fd.get("title") as string,
      content: fd.get("content") as string,
      imageUrl: fd.get("imageUrl") as string,
    };

    try {
      if (editingId) {
        await axios.put(`/api/admin/journals/${editingId}`, data);
        toast.success("Journal updated");
      } else {
        await axios.post("/api/admin/journals", data);
        toast.success("Journal created");
      }
      setEditingId(null);
      fetchJournals();
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save journal");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete journal?")) return;
    try {
      await axios.delete(`/api/admin/journals/${id}`);
      toast.success("Deleted");
      fetchJournals();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to delete journal");
    }
  };

  if (loading) return <div>Loading...</div>;

  const editingJournal = journals.find(j => j.id === editingId);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-8 space-y-12">
      <div>
        <h2 className="font-headline font-black italic uppercase text-2xl mb-8">{editingId ? "Edit Journal" : "New Journal"}</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <input name="title" defaultValue={editingJournal?.title} placeholder="Title" required className="w-full p-4 border border-gray-200 rounded-xl" />
          <input name="imageUrl" defaultValue={editingJournal?.imageUrl} placeholder="Image URL (Optional)" className="w-full p-4 border border-gray-200 rounded-xl" />
          <textarea name="content" defaultValue={editingJournal?.content} placeholder="Content (HTML supported)" rows={6} required className="w-full p-4 border border-gray-200 rounded-xl" />
          <div className="flex gap-4">
            <button type="submit" className="bg-primary text-white px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors">
              Save Journal
            </button>
            {editingId && (
              <button type="button" onClick={() => setEditingId(null)} className="px-8 py-3 bg-gray-100 rounded-xl text-xs font-bold">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div>
        <h3 className="font-headline font-black uppercase text-xl mb-6">Existing Journals</h3>
        <div className="space-y-4">
          {journals.map(j => (
            <div key={j.id} className="flex justify-between items-center p-4 border border-gray-100 rounded-xl">
              <span className="font-bold">{j.title}</span>
              <div className="flex gap-2">
                <button onClick={() => { setEditingId(j.id); window.scrollTo(0, 0); }} className="px-4 py-2 bg-gray-50 rounded-lg text-xs font-bold">Edit</button>
                <button onClick={() => handleDelete(j.id)} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
