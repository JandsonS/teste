"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Settings, Plus, Trash2, Edit2, Power, Loader2, Save } from "lucide-react"
import { toast } from "sonner"

// Definição do Tipo de Serviço
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
  const [activeTab, setActiveTab] = useState<'geral' | 'servicos'>('geral');
  const [loading, setLoading] = useState(false);
  
  // Estado dos Serviços
  const [services, setServices] = useState<Service[]>([]);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);

  // Form para Adicionar/Editar
  const [formData, setFormData] = useState({
      title: "", price: "", duration: "", description: "", imageUrl: ""
  });

  // Carregar serviços ao abrir a aba
  useEffect(() => {
    if (open && activeTab === 'servicos') {
        fetchServices();
    }
  }, [open, activeTab]);

  const fetchServices = async () => {
      setLoadingServices(true);
      try {
        const res = await fetch("/api/admin/services");
        const data = await res.json();
        if (Array.isArray(data)) setServices(data);
      } catch (error) {
        toast.error("Erro ao carregar serviços");
      } finally {
        setLoadingServices(false);
      }
  };

  // --- LÓGICA DA ABA GERAL (Sinal) ---
  const saveGeneralConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ porcentagemSinal: Number(config.porcentagemSinal) }),
      });
      if (res.ok) {
        toast.success("Configurações salvas!");
        handleUpdateSettings();
      } else {
        toast.error("Erro ao salvar.");
      }
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DA ABA SERVIÇOS ---
  const handleSaveService = async () => {
      if (!formData.title || !formData.price || !formData.duration) {
          toast.error("Preencha Nome, Preço e Duração.");
          return;
      }
      
      setLoading(true);
      try {
          const method = editingService ? 'PUT' : 'POST';
          // Se for editar, manda action: 'update'
          const body = editingService 
            ? { ...formData, id: editingService.id, action: 'update' } 
            : formData;

          const res = await fetch("/api/admin/services", {
              method: method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
          });

          if (res.ok) {
              toast.success(editingService ? "Serviço atualizado!" : "Serviço criado!");
              fetchServices(); // Recarrega a lista
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
      if (!confirm("Tem certeza? Se houver agendamentos futuros para este serviço, eles podem ficar sem nome.")) return;
      
      try {
        const res = await fetch("/api/admin/services", { 
            method: 'PUT', 
            body: JSON.stringify({ id, action: 'delete' }) 
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
        await fetch("/api/admin/services", { 
            method: 'PUT', 
            body: JSON.stringify({ id, action: 'toggle' }) 
        });
        fetchServices();
        toast.success("Status alterado.");
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
        <Button variant="outline" size="icon" className="h-9 w-9 border-zinc-800 bg-black/20 text-zinc-400 hover:text-white hover:bg-zinc-800" title="Abrir Configurações" aria-label="Abrir Configurações">
          <Settings size={18} />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="bg-[#09090b] border-zinc-800 text-white w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar p-0 gap-0">
        
        {/* HEADER DO MODAL */}
        <div className="p-6 border-b border-zinc-800">
            <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Settings className="text-emerald-500" /> Configurações do Sistema
            </DialogTitle>
            </DialogHeader>

            {/* ABAS DE NAVEGAÇÃO */}
            <div className="flex gap-2 mt-6 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50">
                <button 
                    onClick={() => setActiveTab('geral')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'geral' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    Geral & Financeiro
                </button>
                <button 
                    onClick={() => setActiveTab('servicos')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'servicos' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    Meus Serviços
                </button>
            </div>
        </div>

        {/* CORPO DO MODAL */}
        <div className="p-6">
            
            {/* === ABA GERAL === */}
            {activeTab === 'geral' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
                    <div className="space-y-4">
                        <Label htmlFor="sinal-select" className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Valor do Sinal (Reserva)</Label>
                        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors">
                            {/* AQUI ESTAVA O ERRO DE ACESSIBILIDADE - CORRIGIDO COM ID e ARIA-LABEL */}
                            <select 
                                id="sinal-select"
                                aria-label="Selecione a porcentagem do sinal"
                                className="w-full bg-transparent text-white outline-none font-medium cursor-pointer"
                                value={config.porcentagemSinal}
                                onChange={(e) => setConfig({ ...config, porcentagemSinal: e.target.value })}
                            >
                                <option className="bg-zinc-900" value="0">Sem sinal (Pagamento Integral na Loja)</option>
                                <option className="bg-zinc-900" value="20">20% do valor total</option>
                                <option className="bg-zinc-900" value="30">30% do valor total</option>
                                <option className="bg-zinc-900" value="40">40% do valor total</option>
                                <option className="bg-zinc-900" value="50">50% do valor total (Recomendado)</option>
                                <option className="bg-zinc-900" value="100">100% (Pagamento Total Antecipado)</option>
                            </select>
                        </div>
                        <p className="text-xs text-zinc-500 flex items-center gap-2">
                            Isso define quanto o cliente paga online para reservar o horário.
                        </p>
                    </div>

                    <div className="pt-4 border-t border-zinc-800">
                        <Button onClick={saveGeneralConfig} disabled={loading} className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 font-bold text-white shadow-[0_0_15px_rgba(5,150,105,0.4)]">
                            {loading ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 w-4 h-4"/>}
                            {loading ? "Salvando..." : "Salvar Alterações Gerais"}
                        </Button>
                    </div>
                </div>
            )}

            {/* === ABA SERVIÇOS === */}
            {activeTab === 'servicos' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    
                    {/* LISTA DE SERVIÇOS */}
                    {!isAdding && !editingService && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <p className="text-zinc-400 text-xs font-medium">Gerencie os preços e nomes.</p>
                                <Button size="sm" onClick={() => setIsAdding(true)} className="bg-emerald-600 hover:bg-emerald-500 text-xs font-bold">
                                    <Plus size={14} className="mr-1"/> Novo Serviço
                                </Button>
                            </div>

                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {loadingServices && (
                                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-zinc-500"/></div>
                                )}

                                {!loadingServices && services.length === 0 && (
                                    <div className="text-center py-10 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
                                        <p className="text-zinc-500 text-sm">Nenhum serviço cadastrado.</p>
                                        <p className="text-zinc-600 text-xs mt-1">Clique em "Novo Serviço" para começar.</p>
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
                                            {/* BOTÕES CORRIGIDOS COM TITLE E ARIA-LABEL */}
                                            <button 
                                                onClick={() => handleToggleService(s.id)} 
                                                title={s.active ? "Desativar serviço" : "Ativar serviço"}
                                                aria-label={s.active ? "Desativar serviço" : "Ativar serviço"}
                                                className="h-8 w-8 flex items-center justify-center hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"
                                            >
                                                <Power size={14} className={s.active ? "text-emerald-500" : "text-zinc-600"} />
                                            </button>
                                            <button 
                                                onClick={() => startEditing(s)} 
                                                title="Editar serviço"
                                                aria-label="Editar serviço"
                                                className="h-8 w-8 flex items-center justify-center hover:bg-zinc-800 rounded-lg text-blue-400 transition-colors"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteService(s.id)} 
                                                title="Excluir serviço"
                                                aria-label="Excluir serviço"
                                                className="h-8 w-8 flex items-center justify-center hover:bg-zinc-800 rounded-lg text-red-400 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* FORMULÁRIO DE ADIÇÃO/EDIÇÃO */}
                    {(isAdding || editingService) && (
                        <div className="space-y-4 bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800 animate-in zoom-in-95">
                            <div className="flex justify-between items-center mb-2">
                                <p className="font-bold text-white text-sm">{isAdding ? "Adicionar Novo Serviço" : "Editar Serviço"}</p>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-xs text-zinc-400 mb-1.5 block">Nome do Serviço</Label>
                                    <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="bg-black border-zinc-700 h-10 text-sm focus:border-emerald-500 transition-colors" placeholder="Ex: Corte Degrade" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-xs text-zinc-400 mb-1.5 block">Preço (R$)</Label>
                                        <Input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="bg-black border-zinc-700 h-10 text-sm focus:border-emerald-500 transition-colors" placeholder="30.00" />
                                    </div>
                                    <div>
                                        <Label className="text-xs text-zinc-400 mb-1.5 block">Duração (min)</Label>
                                        <Input type="number" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} className="bg-black border-zinc-700 h-10 text-sm focus:border-emerald-500 transition-colors" placeholder="45" />
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs text-zinc-400 mb-1.5 block">Descrição (Opcional)</Label>
                                    <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="bg-black border-zinc-700 h-10 text-sm focus:border-emerald-500 transition-colors" placeholder="Detalhes do serviço..." />
                                </div>
                                <div>
                                    <Label className="text-xs text-zinc-400 mb-1.5 block">URL da Imagem (Opcional)</Label>
                                    <Input value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className="bg-black border-zinc-700 h-10 text-sm focus:border-emerald-500 transition-colors" placeholder="https://..." />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button onClick={() => { setIsAdding(false); setEditingService(null); }} variant="outline" className="flex-1 border-zinc-700 bg-transparent hover:bg-zinc-800 text-zinc-300">
                                    Cancelar
                                </Button>
                                <Button onClick={handleSaveService} disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                                    {loading ? <Loader2 className="animate-spin mr-2 w-4 h-4"/> : <Save className="mr-2 w-4 h-4"/>}
                                    Salvar
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