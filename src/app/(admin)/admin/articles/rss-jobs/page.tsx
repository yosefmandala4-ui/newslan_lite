'use client';

import { useState, useEffect } from 'react';
import { 
    Clock, 
    Rss, 
    Plus, 
    Trash2, 
    Edit, 
    Play, 
    Check, 
    AlertCircle, 
    Loader2, 
    Globe, 
    ToggleLeft, 
    ToggleRight, 
    Copy,
    Key,
    Info
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const LANGUAGES = [
    { code: 'id', name: '🇮🇩 Bahasa Indonesia' },
    { code: 'en', name: '🇺🇸 English' },
    { code: 'ms', name: '🇲🇾 Bahasa Melayu' },
    { code: 'es', name: '🇪🇸 Español (Spanish)' },
    { code: 'ar', name: '🇸🇦 العربية (Arabic)' },
    { code: 'ja', name: '🇯🇵 日本語 (Japanese)' },
    { code: 'zh', name: '🇨🇳 中文 (Chinese)' },
];

export default function RSSJobsPage() {
    const supabase = createClient();

    const [jobs, setJobs] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Cron Secret State
    const [cronSecret, setCronSecret] = useState('');
    const [originUrl, setOriginUrl] = useState('');

    // Form State
    const [editingJobId, setEditingJobId] = useState<string | null>(null);
    const [formName, setFormName] = useState('');
    const [formFeedUrl, setFormFeedUrl] = useState('');
    const [formCategoryId, setFormCategoryId] = useState('');
    const [formLanguage, setFormLanguage] = useState('id');
    const [formWritingStyle, setFormWritingStyle] = useState('professional');
    const [formIsActive, setFormIsActive] = useState(true);
    const [formIsPublished, setFormIsPublished] = useState(false);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setOriginUrl(window.location.origin);
        }
        fetchData();
    }, []);

    async function fetchData() {
        try {
            setLoading(true);
            const [jobsRes, catRes, secretRes] = await Promise.all([
                supabase.from('rss_jobs').select('*, categories(name)').order('created_at', { ascending: false }),
                supabase.from('categories').select('*').order('name'),
                supabase.from('site_settings').select('setting_value').eq('setting_key', 'cron_secret').single()
            ]);

            setJobs(jobsRes.data || []);
            setCategories(catRes.data || []);
            
            if (catRes.data && catRes.data.length > 0 && !formCategoryId) {
                setFormCategoryId(catRes.data[0].id);
            }

            if (secretRes.data?.setting_value) {
                setCronSecret(secretRes.data.setting_value);
            } else {
                setCronSecret('newslan_cron_secret'); // Default
            }

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveSecret() {
        try {
            setActionLoading(true);
            const { error } = await supabase
                .from('site_settings')
                .upsert({ setting_key: 'cron_secret', setting_value: cronSecret }, { onConflict: 'setting_key' });

            if (error) throw error;
            setStatus({ type: 'success', message: 'Cron secret berhasil diperbarui!' });
        } catch (error: any) {
            setStatus({ type: 'error', message: error.message || 'Gagal menyimpan secret.' });
        } finally {
            setActionLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!formName || !formFeedUrl || !formCategoryId) {
            setStatus({ type: 'error', message: 'Harap isi semua kolom wajib.' });
            return;
        }

        try {
            setActionLoading(true);
            setStatus(null);

            const jobData = {
                name: formName,
                feed_url: formFeedUrl,
                category_id: formCategoryId,
                language: formLanguage,
                writing_style: formWritingStyle,
                is_active: formIsActive,
                is_published: formIsPublished
            };

            if (editingJobId) {
                const { error } = await supabase
                    .from('rss_jobs')
                    .update(jobData)
                    .eq('id', editingJobId);
                if (error) throw error;
                setStatus({ type: 'success', message: 'Pekerjaan otomatis berhasil diperbarui!' });
            } else {
                const { error } = await supabase
                    .from('rss_jobs')
                    .insert(jobData);
                if (error) throw error;
                setStatus({ type: 'success', message: 'Pekerjaan otomatis baru berhasil ditambahkan!' });
            }

            // Reset form
            resetForm();
            fetchData();
        } catch (error: any) {
            setStatus({ type: 'error', message: error.message || 'Gagal menyimpan Auto Job.' });
        } finally {
            setActionLoading(false);
        }
    }

    function resetForm() {
        setEditingJobId(null);
        setFormName('');
        setFormFeedUrl('');
        setFormLanguage('id');
        setFormWritingStyle('professional');
        setFormIsActive(true);
        setFormIsPublished(false);
        setShowForm(false);
        if (categories.length > 0) setFormCategoryId(categories[0].id);
    }

    function handleEdit(job: any) {
        setEditingJobId(job.id);
        setFormName(job.name);
        setFormFeedUrl(job.feed_url);
        setFormCategoryId(job.category_id);
        setFormLanguage(job.language);
        setFormWritingStyle(job.writing_style || 'professional');
        setFormIsActive(job.is_active);
        setFormIsPublished(job.is_published);
        setShowForm(true);
    }

    async function handleDelete(id: string) {
        if (!confirm('Apakah Anda yakin ingin menghapus Auto Job ini?')) return;

        try {
            setActionLoading(true);
            const { error } = await supabase.from('rss_jobs').delete().eq('id', id);
            if (error) throw error;

            setStatus({ type: 'success', message: 'Auto Job berhasil dihapus.' });
            fetchData();
        } catch (error: any) {
            setStatus({ type: 'error', message: error.message || 'Gagal menghapus Auto Job.' });
        } finally {
            setActionLoading(false);
        }
    }

    async function handleToggleStatus(job: any) {
        try {
            const { error } = await supabase
                .from('rss_jobs')
                .update({ is_active: !job.is_active })
                .eq('id', job.id);
            if (error) throw error;
            fetchData();
        } catch (error: any) {
            setStatus({ type: 'error', message: error.message || 'Gagal mengubah status.' });
        }
    }

    async function handleRunManual(job: any) {
        try {
            setStatus(null);
            // We can target the API directly using fetch
            const targetUrl = `/api/cron/rss-sync?secret=${cronSecret}`;
            
            // For safety we only trigger sync route
            setStatus({ type: 'success', message: `Menjalankan Sync untuk "${job.name}" di latar belakang...` });

            const response = await fetch(targetUrl);
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Cron execution failed.');
            }

            setStatus({ 
                type: 'success', 
                message: `Cron Job selesai! Di-import: ${data.totalImported} artikel baru. Lihat detail Log.` 
            });
            fetchData();
        } catch (error: any) {
            setStatus({ type: 'error', message: `Gagal menjalankan Cron: ${error.message}` });
        }
    }

    const cronUrl = `${originUrl}/api/cron/rss-sync?secret=${cronSecret}`;

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter flex items-center gap-2">
                        <Clock className="w-8 h-8 text-indigo-600" />
                        <span>Auto Cron Jobs (RSS Sync)</span>
                    </h1>
                    <p className="text-gray-500 text-sm">Jadwalkan penarikan artikel berita secara berkala tanpa intervensi manual.</p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setShowForm(!showForm);
                    }}
                    className="bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-gray-800 transition-all shadow-lg"
                >
                    <Plus className="w-5 h-5" />
                    <span>{showForm ? 'Batal' : 'Job Baru'}</span>
                </button>
            </div>

            {/* Status Message */}
            {status && (
                <div className={`p-4 rounded-2xl border flex items-center space-x-3 transition-all ${
                    status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                }`}>
                    {status.type === 'success' ? <Check className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                    <p className="text-sm font-bold">{status.message}</p>
                </div>
            )}

            {/* Cron Secrets Setup Panel */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-8 space-y-2">
                    <h3 className="font-bold flex items-center gap-1.5 text-gray-900">
                        <Key className="w-4 h-4 text-amber-500" />
                        <span>Pengaturan Keamanan Cron</span>
                    </h3>
                    <p className="text-xs text-gray-500 leading-relaxed">
                        Salin URL pemicu di bawah untuk dikonfigurasi pada layanan eksternal cron trigger (seperti <b>cron-job.org</b>).
                    </p>
                    <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 p-3 rounded-xl select-all font-mono text-xs text-gray-600 break-all">
                        <span className="flex-1 truncate">{cronUrl}</span>
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(cronUrl);
                                setStatus({ type: 'success', message: 'URL Cron berhasil disalin!' });
                            }}
                            className="p-1 hover:bg-slate-200 rounded text-gray-500 shrink-0 transition-colors"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="md:col-span-4 space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Token Rahasia (Secret)</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={cronSecret}
                            onChange={(e) => setCronSecret(e.target.value)}
                            placeholder="cron_secret_token"
                            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:ring-1 focus:ring-primary focus:border-transparent outline-none"
                        />
                        <button
                            onClick={handleSaveSecret}
                            disabled={actionLoading}
                            className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors"
                        >
                            Simpan
                        </button>
                    </div>
                </div>
            </div>

            {/* Create / Edit Form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 animate-in fade-in slide-in-from-top-4">
                    <h3 className="text-lg font-bold text-gray-900">
                        {editingJobId ? 'Edit Auto Job' : 'Tambah Auto Job Baru'}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Nama Pekerjaan (Job Name)</label>
                            <input
                                type="text"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                placeholder="Contoh: Google News Sains"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm font-bold"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-400">URL Feed RSS</label>
                            <input
                                type="text"
                                value={formFeedUrl}
                                onChange={(e) => setFormFeedUrl(e.target.value)}
                                placeholder="https://domain.com/rss"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm font-mono"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Target Kategori</label>
                            <select
                                value={formCategoryId}
                                onChange={(e) => setFormCategoryId(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm font-bold"
                            >
                                <option value="">Pilih Kategori</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Bahasa Tujuan AI</label>
                            <select
                                value={formLanguage}
                                onChange={(e) => setFormLanguage(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm font-bold"
                            >
                                {LANGUAGES.map((lang) => (
                                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Gaya Penulisan AI</label>
                            <select
                                value={formWritingStyle}
                                onChange={(e) => setFormWritingStyle(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm font-bold"
                            >
                                <option value="professional">👔 Professional / Jurnalistik</option>
                                <option value="casual">☕ Casual / Santai</option>
                                <option value="clickbait">⚡ Clickbait / Sensasional</option>
                                <option value="investigative">🔍 Investigative / Mendalam</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-6 pt-2">
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100 flex-1 min-w-[200px]">
                            <div className="space-y-0.5">
                                <p className="text-xs font-bold">Pekerjaan Aktif</p>
                                <p className="text-[10px] text-gray-500">Nonaktifkan untuk menjeda tugas cron</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formIsActive}
                                    onChange={(e) => setFormIsActive(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100 flex-1 min-w-[200px]">
                            <div className="space-y-0.5">
                                <p className="text-xs font-bold">Langsung Publikasikan</p>
                                <p className="text-[10px] text-gray-500">Artikel yang masuk akan berstatus 'Publik'</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formIsPublished}
                                    onChange={(e) => setFormIsPublished(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={resetForm}
                            className="px-6 py-3 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={actionLoading}
                            className="bg-black text-white px-6 py-3 rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors flex items-center gap-1.5"
                        >
                            {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            <span>Simpan Pekerjaan</span>
                        </button>
                    </div>
                </form>
            )}

            {/* List Auto Jobs */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="font-bold flex items-center gap-2">
                        <Rss className="w-5 h-5 text-indigo-600" />
                        <span>Daftar RSS Auto Sync</span>
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-400">Nama Job / Target Feed</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-400">Kategori</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-400">Bahasa</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-400">Status</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-400">Terakhir Dijalankan</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-400 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
                                        <span className="text-sm font-bold">Memuat daftar Auto Job...</span>
                                    </td>
                                </tr>
                            ) : jobs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                        <span className="text-sm font-bold">Belum ada Auto Job yang dibuat.</span>
                                    </td>
                                </tr>
                            ) : jobs.map((job) => (
                                <tr key={job.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <div className="flex items-center space-x-2">
                                                <span className="font-bold text-gray-900 leading-snug">{job.name}</span>
                                                <span className="bg-slate-100 text-slate-600 text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">
                                                    {job.writing_style || 'professional'}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-gray-400 truncate max-w-[280px] font-mono mt-0.5">{job.feed_url}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[10px] font-bold">
                                            {job.categories?.name || 'Kategori Kosong'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-bold text-gray-600">
                                        {LANGUAGES.find(l => l.code === job.language)?.name || job.language}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleToggleStatus(job)}
                                            className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                                                job.is_active 
                                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100' 
                                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                            }`}
                                        >
                                            {job.is_active ? 'Aktif' : 'Jeda'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-bold text-gray-500 font-mono">
                                        {job.last_run 
                                            ? new Date(job.last_run).toLocaleString('id-ID', {
                                                day: 'numeric',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })
                                            : 'Belum pernah'
                                        }
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <button
                                                onClick={() => handleRunManual(job)}
                                                title="Trigger Job Manual"
                                                className="p-2 hover:bg-slate-100 rounded-xl transition-all text-indigo-600"
                                            >
                                                <Play className="w-4 h-4 fill-current" />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(job)}
                                                className="p-2 hover:bg-slate-100 rounded-xl transition-all text-gray-400 hover:text-black"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(job.id)}
                                                className="p-2 hover:bg-rose-50 rounded-xl transition-all text-gray-400 hover:text-rose-600"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
