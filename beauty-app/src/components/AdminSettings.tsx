"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Settings, Plus, Trash2, Edit2, Power, Loader2, Save, Palette, Store, MessageCircle, Upload, Image as ImageIcon, X, CreditCard, Lock, Wallet, Landmark } from "lucide-react"
import { toast } from "sonner"

// --- CONFIGURAÇÃO DO SUPABASE ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Service {
  id: string;
  title: string;
  price: number;
  duration: number;
  description: string;
  imageUrl: string;
  active: boolean;
}

interface AdminSettingsProps {
  config: any;
  setConfig: (c: any) => void;
  handleUpdateSettings: () => void;
}

export default function AdminSettings({ config, setConfig, handleUpdateSettings }: AdminSettingsProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'geral' | 'pagamento' | 'servicos'>('geral');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const params = useParams(); 
  const slug = params?.slug as string;

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // --- ESTADOS PARA O BANCO INTER ---
  const [certFile, setCertFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  
  // Serviços
  const [services, setServices] = useState<Service[]>([]);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [formData, setFormData] = useState({ title: "", price: "", duration: "", description: "", imageUrl: "" });

  useEffect(() => {
    if (open && activeTab === 'servicos' && slug) {
        fetchServices();
    }
  }, [open, activeTab, slug]);

  const fetchServices = async () => {
      setLoadingServices(true);
      try {
        const res = await fetch(`/api/admin/services?slug=${slug}`);
        const data = await res.json();
        if (Array.isArray(data)) setServices(data);
      } catch (error) {
        toast.error("Erro ao carregar serviços");
      } finally {
        setLoadingServices(false);
      }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${slug}-logo-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('images')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('images')
            .getPublicUrl(filePath);

        setConfig({ ...config, logoUrl: publicUrl });
        toast.success("Logo carregada! Salve as configurações.");

    } catch (error) {
        console.error(error);
        toast.error("Erro ao fazer upload.");
    } finally {
        setUploadingLogo(false);
    }
  };

  const removeLogo = () => {
      setConfig({ ...config, logoUrl: "" });
  };

  // --- FUNÇÃO INTELIGENTE PARA LER ARQUIVOS DO INTER ---
  const readFileContent = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsText(file); // Lê como texto puro
      });
  };

  const saveGeneralConfig = async () => {
    if (!slug) {
        toast.error("Erro: Loja não identificada.");
        return;
    }

    setLoading(true);
    try {
      // Prepara os dados normais (incluindo Asaas e PagBank)
      let payload = { 
          slug: slug, 
          ...config,
          porcentagemSinal: Number(config.porcentagemSinal)
      };

      // Se tiver arquivos do Inter selecionados, lê o conteúdo e anexa
      if (config.provedor === 'INTER') {
          if (certFile) {
              const certContent = await readFileContent(certFile);
              payload.interCert = certContent; // Manda o texto do arquivo
          }
          if (keyFile) {
              const keyContent = await readFileContent(keyFile);
              payload.interKey = keyContent; // Manda o texto do arquivo
          }
      }

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Configurações salvas!", { duration: 1500 });
        if (handleUpdateSettings) handleUpdateSettings();
        router.refresh(); 
        setCertFile(null); // Limpa seleção
        setKeyFile(null);
      } else {
        toast.error("Erro ao salvar.");
      }
    } catch (error) {
      toast.error("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  // ... (Funções de Serviço mantidas iguais)
  const handleSaveService = async () => {
      if (!formData.title || !formData.price || !formData.duration) {
          toast.error("Preencha Nome, Preço e Duração.");
          return;
      }
      setLoading(true);
      try {
          const method = editingService ? 'PUT' : 'POST';
          const body = editingService 
            ? { ...formData, id: editingService.id, action: 'update', slug } 
            : { ...formData, slug };

          const res = await fetch("/api/admin/services", {
              method: method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
          });

          if (res.ok) {
              toast.success(editingService ? "Serviço atualizado!" : "Serviço criado!");
              fetchServices();
              setIsAdding(false);
              setEditingService(null);
              setFormData({ title: "", price: "", duration: "", description: "", imageUrl: "" });
          } else {
              toast.error("Erro ao salvar serviço.");
          }
      } catch {
          toast.error("Erro no servidor.");
      } finally {
          setLoading(false);
      }
  };

  const handleDeleteService = async (id: string) => {
      if (!confirm("Tem certeza que deseja excluir?")) return;
      try {
        const res = await fetch("/api/admin/services", { 
            method: 'PUT', 
            body: JSON.stringify({ id, action: 'delete', slug }) 
        });
        if (res.ok) {
            fetchServices();
            toast.success("Serviço removido.");
        }
      } catch {
        toast.error("Erro ao remover.");
      }
  };

  const handleToggleService = async (id: string) => {
    try {
        const res = await fetch("/api/admin/services", { 
            method: 'PUT', 
            body: JSON.stringify({ id, action: 'toggle', slug }) 
        });
        if (res.ok) {
            fetchServices();
            toast.success("Status alterado.");
        }
    } catch {
        toast.error("Erro ao alterar status.");
    }
  };

  const startEditing = (s: Service) => {
    setEditingService(s);
    setFormData({
        title: s.title,
        price: String(s.price),
        duration: String(s.duration),
        description: s.description || "",
        imageUrl: s.imageUrl || ""
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9 border-zinc-800 bg-black/20 text-zinc-400 hover:text-white hover:bg-zinc-800" title="Configurações">
          <Settings size={18} />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="bg-[#09090b] border-zinc-800 text-white w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar p-0 gap-0">
        
        <div className="p-6 border-b border-zinc-800">
            <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Settings className="text-emerald-500" /> Painel de Controle
            </DialogTitle>
            </DialogHeader>

            <div className="flex gap-2 mt-6 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50">
                <button onClick={() => setActiveTab('geral')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'geral' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}>Geral</button>
                <button onClick={() => setActiveTab('pagamento')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'pagamento' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}>Pagamento</button>
                <button onClick={() => setActiveTab('servicos')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'servicos' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}>Serviços</button>
            </div>
        </div>

        <div className="p-6">
            
            {/* === ABA GERAL === */}
            {activeTab === 'geral' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
                    <div className="space-y-4 border-b border-zinc-800 pb-6">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Palette size={16} className="text-emerald-500"/> Identidade Visual</h3>
                        <div className="grid gap-4">
                            <div>
                                <Label className="text-zinc-400 text-xs mb-2 block">Logo da Loja</Label>
                                <div className="flex items-start gap-4">
                                    <div className="w-20 h-20 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden relative group">
                                        {config.logoUrl ? (
                                            <>
                                                <img src={config.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                                <button onClick={removeLogo} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X size={16} className="text-white" /></button>
                                            </>
                                        ) : (<ImageIcon size={24} className="text-zinc-600" />)}
                                    </div>
                                    <div className="flex-1">
                                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                            <Button onClick={() => fileInputRef.current?.click()} variant="outline" disabled={uploadingLogo} className="w-full border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-zinc-300 h-20 flex flex-col gap-1 items-center justify-center border-dashed">
                                                {uploadingLogo ? <Loader2 className="animate-spin text-emerald-500" /> : <><Upload size={18} className="mb-1" /><span className="text-xs">Enviar nova logo</span></>}
                                            </Button>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <Label className="text-zinc-400 text-xs">Nome do Estabelecimento</Label>
                                <div className="flex items-center gap-2 mt-1 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3">
                                    <Store size={16} className="text-zinc-500"/>
                                    <Input value={config.nomeEstabelecimento || ""} onChange={(e) => setConfig({...config, nomeEstabelecimento: e.target.value})} className="border-0 bg-transparent focus-visible:ring-0 h-10 px-0" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-zinc-400 text-xs">Cor Principal</Label>
                                    <div className="flex items-center gap-3 mt-1 bg-zinc-900/50 border border-zinc-800 rounded-lg p-2 h-10">
                                        <input type="color" value={config.corPrincipal || "#10b981"} onChange={(e) => setConfig({...config, corPrincipal: e.target.value})} className="h-6 w-8 rounded cursor-pointer bg-transparent border-0 p-0" />
                                        <span className="text-xs text-zinc-500 font-mono">{config.corPrincipal}</span>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-zinc-400 text-xs">WhatsApp</Label>
                                    <div className="flex items-center gap-2 mt-1 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3">
                                        <MessageCircle size={16} className="text-zinc-500"/>
                                        <Input value={config.telefoneWhatsApp || ""} onChange={(e) => setConfig({...config, telefoneWhatsApp: e.target.value})} placeholder="Ex: 11999999999" className="border-0 bg-transparent focus-visible:ring-0 h-10 px-0" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="pt-4 border-t border-zinc-800">
                        <Button onClick={saveGeneralConfig} disabled={loading} className="w-full h-12 font-bold text-white shadow-lg transition-all" style={{ backgroundColor: config.corPrincipal || '#10b981' }}>
                            {loading ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 w-4 h-4"/>} {loading ? "Salvando..." : "Salvar Configurações"}
                        </Button>
                    </div>
                </div>
            )}

            {/* === ABA PAGAMENTO (MULTI-BANK) === */}
            {activeTab === 'pagamento' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    
                    {/* Seletor de Banco (Grid 2x2) */}
                    <div className="space-y-4">
                        <Label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Selecione o Banco Principal</Label>
                        <div className="grid grid-cols-2 gap-3">
                            {/* Mercado Pago */}
                            <div onClick={() => setConfig({...config, provedor: 'MERCADOPAGO'})}
                                className={`cursor-pointer p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${config.provedor === 'MERCADOPAGO' ? 'bg-blue-500/10 border-blue-500 text-blue-500' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                                <CreditCard size={24} />
                                <span className="text-xs font-bold">Mercado Pago</span>
                            </div>

                            {/* Banco Inter */}
                            <div onClick={() => setConfig({...config, provedor: 'INTER'})}
                                className={`cursor-pointer p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${config.provedor === 'INTER' ? 'bg-orange-500/10 border-orange-500 text-orange-500' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                                <Landmark size={24} />
                                <span className="text-xs font-bold">Banco Inter</span>
                            </div>

                            {/* Asaas */}
                            <div onClick={() => setConfig({...config, provedor: 'ASAAS'})}
                                className={`cursor-pointer p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${config.provedor === 'ASAAS' ? 'bg-slate-500/10 border-slate-500 text-slate-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                                <Wallet size={24} />
                                <span className="text-xs font-bold">Asaas</span>
                            </div>

                            {/* PagBank */}
                            <div onClick={() => setConfig({...config, provedor: 'PAGBANK'})}
                                className={`cursor-pointer p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${config.provedor === 'PAGBANK' ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                                <CreditCard size={24} />
                                <span className="text-xs font-bold">PagBank</span>
                            </div>
                        </div>
                    </div>

                    {/* --- FORMULÁRIOS DINÂMICOS --- */}

                    {/* 1. Mercado Pago */}
                    {config.provedor === 'MERCADOPAGO' && (
                        <div className="space-y-4 bg-blue-900/10 p-4 rounded-xl border border-blue-900/30 animate-in slide-in-from-top-2">
                             <Label className="text-blue-400 text-xs font-bold">Token de Acesso (Access Token)</Label>
                             <div className="flex items-center gap-2 bg-black/40 border border-blue-500/20 rounded-lg px-3">
                                <Lock size={14} className="text-blue-500"/>
                                <Input type="password" value={config.mercadoPagoToken || ""} onChange={(e) => setConfig({...config, mercadoPagoToken: e.target.value})} placeholder="APP_USR-xxxx..." className="border-0 bg-transparent focus-visible:ring-0 h-10 px-0 text-white" />
                             </div>
                             <p className="text-[10px] text-zinc-500">Cole aqui o token de produção do Mercado Pago.</p>
                        </div>
                    )}

                    {/* 2. Banco Inter */}
                    {config.provedor === 'INTER' && (
                        <div className="space-y-4 bg-orange-900/10 p-4 rounded-xl border border-orange-900/30 animate-in slide-in-from-top-2">
                             <div className="grid gap-4">
                                <div>
                                    <Label className="text-orange-400 text-xs font-bold">Client ID</Label>
                                    <Input value={config.interClientId || ""} onChange={(e) => setConfig({...config, interClientId: e.target.value})} className="bg-black/40 border-orange-500/20 text-white mt-1" />
                                </div>
                                <div>
                                    <Label className="text-orange-400 text-xs font-bold">Client Secret</Label>
                                    <Input value={config.interClientSecret || ""} onChange={(e) => setConfig({...config, interClientSecret: e.target.value})} className="bg-black/40 border-orange-500/20 text-white mt-1" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-orange-400 text-xs font-bold mb-1 block">Certificado (.crt)</Label>
                                        <div className="relative">
                                            <input type="file" onChange={(e) => setCertFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" accept=".crt,.pem" />
                                            <div className={`h-12 border border-dashed rounded-lg flex items-center justify-center text-xs ${certFile ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10' : 'border-orange-500/30 text-zinc-400'}`}>{certFile ? certFile.name : config.interCert ? "Já Enviado ✅" : "Upload .crt"}</div>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-orange-400 text-xs font-bold mb-1 block">Chave Privada (.key)</Label>
                                        <div className="relative">
                                            <input type="file" onChange={(e) => setKeyFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" accept=".key" />
                                            <div className={`h-12 border border-dashed rounded-lg flex items-center justify-center text-xs ${keyFile ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10' : 'border-orange-500/30 text-zinc-400'}`}>{keyFile ? keyFile.name : config.interKey ? "Já Enviado ✅" : "Upload .key"}</div>
                                        </div>
                                    </div>
                                </div>
                             </div>
                             <p className="text-[10px] text-zinc-500">Faça o upload dos arquivos gerados no Internet Banking PJ.</p>
                        </div>
                    )}

                    {/* 3. Asaas */}
                    {config.provedor === 'ASAAS' && (
                        <div className="space-y-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700 animate-in slide-in-from-top-2">
                             <Label className="text-slate-300 text-xs font-bold">API Key (Chave de API)</Label>
                             <div className="flex items-center gap-2 bg-black/40 border border-slate-600 rounded-lg px-3">
                                <Lock size={14} className="text-slate-400"/>
                                <Input type="password" value={config.asaasToken || ""} onChange={(e) => setConfig({...config, asaasToken: e.target.value})} placeholder="$aact_..." className="border-0 bg-transparent focus-visible:ring-0 h-10 px-0 text-white" />
                             </div>
                             <p className="text-[10px] text-zinc-500">Cole a chave de API gerada no painel do Asaas.</p>
                        </div>
                    )}

                    {/* 4. PagBank */}
                    {config.provedor === 'PAGBANK' && (
                        <div className="space-y-4 bg-yellow-900/10 p-4 rounded-xl border border-yellow-500/20 animate-in slide-in-from-top-2">
                             <Label className="text-yellow-500 text-xs font-bold">Token de Acesso</Label>
                             <div className="flex items-center gap-2 bg-black/40 border border-yellow-500/20 rounded-lg px-3">
                                <Lock size={14} className="text-yellow-500"/>
                                <Input type="password" value={config.pagbankToken || ""} onChange={(e) => setConfig({...config, pagbankToken: e.target.value})} placeholder="Token do PagSeguro..." className="border-0 bg-transparent focus-visible:ring-0 h-10 px-0 text-white" />
                             </div>
                             <p className="text-[10px] text-zinc-500">Token gerado no painel PagSeguro Developer.</p>
                        </div>
                    )}

                    {/* Configuração de Sinal */}
                    <div className="space-y-2 pt-4 border-t border-zinc-800">
                        <Label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Valor do Sinal (Reserva)</Label>
                        <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors">
                            <select 
                                className="w-full bg-transparent text-white outline-none font-medium cursor-pointer text-sm"
                                value={config.porcentagemSinal}
                                onChange={(e) => setConfig({ ...config, porcentagemSinal: e.target.value })}
                            >
                                <option className="bg-zinc-900" value="10">10% do valor</option>
                                <option className="bg-zinc-900" value="20">20% do valor</option>
                                <option className="bg-zinc-900" value="30">30% do valor</option>
                                <option className="bg-zinc-900" value="40">40% do valor</option>
                                <option className="bg-zinc-900" value="50">50% do valor (Padrão)</option>
                                <option className="bg-zinc-900" value="60">60% do valor</option>
                                <option className="bg-zinc-900" value="70">70% do valor</option>
                                <option className="bg-zinc-900" value="80">80% do valor</option>
                                <option className="bg-zinc-900" value="90">90% do valor</option>
                            </select>
                        </div>
                        <p className="text-[10px] text-zinc-500 px-1">
                            Define a porcentagem cobrada na opção "Reservar Vaga". O restante é pago no local.
                        </p>
                    </div>

                    <Button onClick={saveGeneralConfig} disabled={loading} className="w-full h-12 font-bold text-white shadow-lg mt-4" style={{ backgroundColor: config.corPrincipal || '#10b981' }}>
                        {loading ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 w-4 h-4"/>} Salvar Configurações
                    </Button>
                </div>
            )}

            {/* === ABA SERVIÇOS === */}
            {activeTab === 'servicos' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    {!isAdding && !editingService && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <p className="text-zinc-400 text-xs font-medium">Gerencie seus serviços.</p>
                                <Button size="sm" onClick={() => setIsAdding(true)} className="bg-emerald-600 hover:bg-emerald-500 text-xs font-bold">
                                    <Plus size={14} className="mr-1"/> Novo Serviço
                                </Button>
                            </div>
                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {loadingServices && <div className="flex justify-center py-10"><Loader2 className="animate-spin text-zinc-500"/></div>}
                                {!loadingServices && services.length === 0 && (
                                    <div className="text-center py-10 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
                                        <p className="text-zinc-500 text-sm">Nenhum serviço cadastrado.</p>
                                    </div>
                                )}
                                {services.map(s => (
                                    <div key={s.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${s.active ? 'bg-zinc-900/50 border-zinc-800' : 'bg-red-900/5 border-red-900/20 opacity-70'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px] ${s.active ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-red-500 shadow-red-500/50'}`} />
                                            <div>
                                                <p className="font-bold text-sm text-white leading-tight">{s.title}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs text-zinc-400 bg-zinc-800 px-1.5 rounded">R$ {s.price.toFixed(2)}</span>
                                                    <span className="text-xs text-zinc-500">• {s.duration} min</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => handleToggleService(s.id)} className="h-8 w-8 flex items-center justify-center hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors">
                                                <Power size={14} className={s.active ? "text-emerald-500" : "text-zinc-600"} />
                                            </button>
                                            <button onClick={() => startEditing(s)} className="h-8 w-8 flex items-center justify-center hover:bg-zinc-800 rounded-lg text-blue-400 transition-colors">
                                                <Edit2 size={14} />
                                            </button>
                                            <button onClick={() => handleDeleteService(s.id)} className="h-8 w-8 flex items-center justify-center hover:bg-zinc-800 rounded-lg text-red-400 transition-colors">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {(isAdding || editingService) && (
                        <div className="space-y-4 bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800 animate-in zoom-in-95">
                            <div className="flex justify-between items-center mb-2">
                                <p className="font-bold text-white text-sm">{isAdding ? "Adicionar Novo Serviço" : "Editar Serviço"}</p>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-xs text-zinc-400 mb-1.5 block">Nome do Serviço</Label>
                                    <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="bg-black border-zinc-700 h-10 text-sm focus:border-emerald-500" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-xs text-zinc-400 mb-1.5 block">Preço (R$)</Label>
                                        <Input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="bg-black border-zinc-700 h-10 text-sm" />
                                    </div>
                                    <div>
                                        <Label className="text-xs text-zinc-400 mb-1.5 block">Duração (min)</Label>
                                        <Input type="number" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} className="bg-black border-zinc-700 h-10 text-sm" />
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs text-zinc-400 mb-1.5 block">Descrição (Opcional)</Label>
                                    <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="bg-black border-zinc-700 h-10 text-sm" />
                                </div>
                                <div>
                                    <Label className="text-xs text-zinc-400 mb-1.5 block">URL da Imagem (Opcional)</Label>
                                    <Input value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className="bg-black border-zinc-700 h-10 text-sm" />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button onClick={() => { setIsAdding(false); setEditingService(null); }} variant="outline" className="flex-1 border-zinc-700 bg-transparent hover:bg-zinc-800 text-zinc-300">Cancelar</Button>
                                <Button onClick={handleSaveService} disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                                    {loading ? <Loader2 className="animate-spin mr-2 w-4 h-4"/> : <Save className="mr-2 w-4 h-4"/>} Salvar
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  )
}