import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { motion } from "motion/react";
import { Calendar, ArrowRight } from "lucide-react";

interface JournalPost {
  id: string;
  title: string;
  excerpt?: string;
  content: string;
  imageUrl?: string;
  createdAt: any;
}

export function Journal() {
  const [posts, setPosts] = useState<JournalPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const q = query(collection(db, "journals"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const fetchedPosts: JournalPost[] = [];
        querySnapshot.forEach((doc) => {
          fetchedPosts.push({ id: doc.id, ...doc.data() } as JournalPost);
        });
        setPosts(fetchedPosts);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, "journals");
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const formatDate = (ts: any) => {
    if (!ts) return "Recently";
    if (ts.toDate) return ts.toDate().toLocaleDateString();
    return new Date(ts).toLocaleDateString();
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-6">
      <div className="max-w-[1200px] mx-auto">
        <header className="mb-16">
          <h1 className="text-4xl md:text-6xl font-headline font-black italic uppercase tracking-tighter mb-4">
            The Journal
          </h1>
          <p className="text-gray-500 font-medium max-w-xl">
            Thoughts, updates, and deep dives into our process.
          </p>
        </header>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <span className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-black animate-spin" />
          </div>
        ) : posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post, i) => (
              <motion.article 
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group cursor-pointer"
              >
                <div className="aspect-[4/3] bg-gray-100 rounded-2xl overflow-hidden mb-6 relative">
                  {post.imageUrl ? (
                    <img 
                      src={post.imageUrl} 
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                      No Image Provided
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(post.createdAt)}</span>
                </div>
                <h2 className="text-xl font-headline font-black italic uppercase tracking-tight mb-2 group-hover:text-primary transition-colors">
                  {post.title}
                </h2>
                <p className="text-sm text-gray-500 font-medium mb-4 line-clamp-3">
                  {post.excerpt || post.content}
                </p>
                <div className="flex items-center gap-2 text-xs font-bold text-black group-hover:text-primary transition-colors uppercase tracking-widest">
                  Read More <ArrowRight className="w-4 h-4" />
                </div>
              </motion.article>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center bg-gray-50 rounded-3xl border border-gray-100">
            <p className="text-gray-500 font-medium mb-2 font-bold uppercase tracking-widest text-xs">No journal entries found</p>
            <p className="text-[10px] uppercase font-bold text-gray-400">Check back soon for updates</p>
          </div>
        )}
      </div>
    </div>
  );
}
