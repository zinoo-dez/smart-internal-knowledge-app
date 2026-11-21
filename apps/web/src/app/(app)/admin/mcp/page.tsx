'use client';

import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Plus,
  RefreshCw,
  Server,
  Zap,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Database,
  GitBranch,
  Ticket,
  Lock,
  Radio,
  Sliders,
  Check,
  X,
} from 'lucide-react';
import {
  McpServerSummary,
  McpStatus,
  McpTransport,
} from '@knowledge/shared';
import {
  createMcpServer,
  deleteMcpServer,
  fetchMcpServers,
  testMcpConnection,
  toggleMcpTool,
} from '@/lib/api-client';
import { useLanguage } from '@/context/language-context';

export default function AdminMcpPage() {
  const { t, isMyanmar } = useLanguage();
  const [servers, setServers] = useState<McpServerSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedServers, setExpandedServers] = useState<Record<string, boolean>>({
    'mcp-neon-postgres': true,
  });

  // Custom MCP Wizard Form State
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTransport, setFormTransport] = useState<McpTransport>(McpTransport.SSE);
  const [formEndpointUrl, setFormEndpointUrl] = useState('');
  const [formCommand, setFormCommand] = useState('');
  const [formHeaders, setFormHeaders] = useState('{\n  "Authorization": "Bearer sec_token_example"\n}');

  // Discovery testing state
  const [isTesting, setIsTesting] = useState(false);
  const [testLatency, setTestLatency] = useState<number | null>(null);
  const [discoveredTools, setDiscoveredTools] = useState<
    Array<{ name: string; description?: string; inputSchema: Record<string, unknown> }>
  >([]);
  const [isSaving, setIsSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadServers = async () => {
    setIsLoading(true);
    try {
      const data = await fetchMcpServers();
      setServers(data);
    } catch (err) {
      console.error('Failed to load MCP servers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadServers();
  }, []);

  const totalTools = servers.reduce((acc, s) => acc + (s.tools ? s.tools.filter((t) => t.isEnabled).length : 0), 0);
  const avgLatency =
    servers.length > 0
      ? Math.round(servers.reduce((acc, s) => acc + (s.latencyMs || 25), 0) / servers.length)
      : 0;

  const toggleExpand = (id: string) => {
    setExpandedServers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setActionMessage(null);
    try {
      let parsedHeaders: Record<string, string> = {};
      try {
        if (formHeaders.trim()) {
          parsedHeaders = JSON.parse(formHeaders);
        }
      } catch {
        // Ignore JSON parse errors for headers
      }

      const res = await testMcpConnection({
        transport: formTransport,
        endpointUrl: formEndpointUrl || undefined,
        command: formCommand || undefined,
        headers: parsedHeaders,
      });

      setTestLatency(res.latencyMs);
      setDiscoveredTools(res.tools);
      setWizardStep(3);
    } catch (err: any) {
      setActionMessage(`Test failed: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleCreateServer = async () => {
    if (!formName.trim()) {
      alert('Please enter a server name.');
      return;
    }
    setIsSaving(true);
    try {
      let parsedHeaders: Record<string, string> = {};
      try {
        if (formHeaders.trim()) {
          parsedHeaders = JSON.parse(formHeaders);
        }
      } catch {
        // Fallback empty
      }

      const newServer = await createMcpServer({
        name: formName,
        description: formDescription,
        transport: formTransport,
        endpointUrl: formEndpointUrl || undefined,
        command: formCommand || undefined,
        headers: parsedHeaders,
      });

      setServers((prev) => [newServer, ...prev]);
      setIsModalOpen(false);
      resetWizard();
      setActionMessage(`MCP Server "${formName}" successfully connected!`);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      alert(`Error creating MCP server: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (serverId: string) => {
    if (!confirm('Are you sure you want to disconnect this MCP server?')) return;
    try {
      await deleteMcpServer(serverId);
      setServers((prev) => prev.filter((s) => s.id !== serverId));
    } catch (err: any) {
      alert(`Failed to delete server: ${err.message}`);
    }
  };

  const handleToggleTool = async (
    serverId: string,
    toolId: string,
    updates: { isEnabled?: boolean; requireApproval?: boolean },
  ) => {
    try {
      const updated = await toggleMcpTool(serverId, toolId, updates);
      setServers((prev) =>
        prev.map((s) => {
          if (s.id !== serverId) return s;
          return {
            ...s,
            tools: s.tools.map((t) => (t.id === toolId ? updated : t)),
          };
        }),
      );
    } catch (err: any) {
      console.error('Failed to toggle tool:', err);
    }
  };

  const resetWizard = () => {
    setWizardStep(1);
    setFormName('');
    setFormDescription('');
    setFormTransport(McpTransport.SSE);
    setFormEndpointUrl('');
    setFormCommand('');
    setDiscoveredTools([]);
    setTestLatency(null);
  };

  return (
    <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Cpu className="w-5 h-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              {t.mcpHubTitle}
            </h1>
          </div>
          <p className="text-sm text-slate-600 mt-1.5 max-w-2xl">
            {t.mcpHubSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadServers}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm min-h-[40px]"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isMyanmar ? 'ပြန်စစ်မည်' : 'Refresh'}</span>
          </button>
          <button
            onClick={() => {
              resetWizard();
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span>{t.mcpConnectCustom}</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t.mcpActiveServers}
            </span>
            <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {servers.length}
          </div>
          <div className="text-xs text-slate-600 mt-1">
            {isMyanmar ? 'ချိတ်ဆက်ထားပြီး ဖြစ်ပါသည်' : 'Fully operational endpoints'}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t.mcpEnabledTools}
            </span>
            <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {totalTools}
          </div>
          <div className="text-xs text-emerald-700 font-medium mt-1">
            {isMyanmar ? 'AI မှ ခေါ်ယူသုံးစွဲနိုင်သည်' : 'Active in LLM tool prompt'}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t.mcpAvgLatency}
            </span>
            <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {avgLatency} ms
          </div>
          <div className="text-xs text-slate-600 mt-1">
            {isMyanmar ? 'အမြန်ဆုံး တုံ့ပြန်မှုနှုန်း' : 'Real-time tool execution roundtrip'}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t.mcpHealthStatus}
            </span>
            <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-lg font-bold text-slate-900">
              {isMyanmar ? 'ပုံမှန်လည်ပတ်နေသည်' : 'Healthy (SSE / Stdio)'}
            </span>
          </div>
          <div className="text-xs text-slate-600 mt-1">
            {isMyanmar ? 'SSRF ကာကွယ်မှု တပ်ဆင်ထားသည်' : 'Encrypted with AES-256-GCM'}
          </div>
        </div>
      </div>

      {/* Featured 1-Click Connectors Marketplace */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              {isMyanmar ? 'လူသုံးများသော MCP ချိတ်ဆက်မှုများ' : 'Popular 1-Click MCP Connectors'}
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            {isMyanmar ? 'တရားဝင် MCP စံနှုန်းများနှင့် ကိုက်ညီသည်' : 'Model Context Protocol 1.0 Compliant'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="border border-slate-200 rounded-lg p-4 hover:border-blue-400 transition-colors bg-slate-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Neon PostgreSQL</h3>
                  <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                    Connected (Active)
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mt-2">
                Direct read-only parameterized SQL queries and schema reflection on serverless Postgres.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-mono">
              <span>Transport: SSE</span>
              <span>2 tools active</span>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg p-4 hover:border-blue-400 transition-colors bg-slate-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded bg-slate-200 text-slate-900 flex items-center justify-center font-bold text-xs">
                  <GitBranch className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">GitHub Enterprise</h3>
                  <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                    Connected (Active)
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mt-2">
                Query repository issues, review pull request diffs, and inspect workflow statuses.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-mono">
              <span>Transport: Stdio</span>
              <span>2 tools active</span>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg p-4 hover:border-blue-400 transition-colors bg-slate-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                  <Ticket className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Jira Service Desk</h3>
                  <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                    Connected (Active)
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mt-2">
                Look up incident tickets, verify SLA commitments, and check workplace IT tickets.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-mono">
              <span>Transport: SSE</span>
              <span>1 tool active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active MCP Servers List */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 md:p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isMyanmar ? 'ချိတ်ဆက်ထားသော MCP Servers များ' : 'Configured MCP Servers & Tool Schemas'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isMyanmar
                ? 'Tool တစ်ခုချင်းစီအလိုက် ဖွင့်/ပိတ်နိုင်ပြီး အရေးကြီး action များအတွက် အတည်ပြုချက် သတ်မှတ်နိုင်ပါသည်'
                : 'Toggle tool availability and enforce Human-in-the-Loop approval for mutating operations'}
            </p>
          </div>
          <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
            {servers.length} {isMyanmar ? 'ခု' : 'configured'}
          </span>
        </div>

        <div className="divide-y divide-slate-200">
          {servers.map((server) => {
            const isExpanded = !!expandedServers[server.id];
            return (
              <div key={server.id} className="p-4 md:p-5 hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleExpand(server.id)}
                      className="mt-1 p-1 rounded hover:bg-slate-200 text-slate-500 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 text-sm">{server.name}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            server.status === McpStatus.CONNECTED
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          ● {server.status}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                          {server.transport}
                        </span>
                        {server.latencyMs !== undefined && (
                          <span className="text-xs text-slate-500 font-mono">
                            {server.latencyMs} ms
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                        {server.description || 'No description provided.'}
                      </p>
                      {server.endpointUrl && (
                        <div className="text-xs font-mono text-slate-500 mt-1 flex items-center gap-1.5">
                          <span>Endpoint:</span>
                          <span className="text-blue-600">{server.endpointUrl}</span>
                        </div>
                      )}
                      {server.command && (
                        <div className="text-xs font-mono text-slate-500 mt-1 flex items-center gap-1.5">
                          <span>Command:</span>
                          <span className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{server.command}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => toggleExpand(server.id)}
                      className="px-3 py-1.5 rounded border border-slate-200 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm min-h-[36px]"
                    >
                      {isExpanded
                        ? isMyanmar
                          ? 'Tools သိမ်းမည်'
                          : 'Collapse Tools'
                        : isMyanmar
                        ? `Tools ကြည့်မည် (${server.tools.length})`
                        : `View Tools (${server.tools.length})`}
                    </button>
                    <button
                      onClick={() => handleDelete(server.id)}
                      className="p-2 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title="Disconnect MCP Server"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Collapsible Tools Accordion Drawer */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-200 pl-4 md:pl-8 space-y-3">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {isMyanmar ? 'အသုံးပြုနိုင်သော Tools များ' : 'Available Discovered Tools'} ({server.tools.length})
                    </div>
                    {server.tools.length === 0 ? (
                      <div className="text-xs text-slate-500 italic">No tools discovered yet.</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {server.tools.map((tool) => (
                          <div
                            key={tool.id}
                            className={`p-3 rounded-lg border text-xs transition-colors ${
                              tool.isEnabled
                                ? 'bg-white border-slate-200'
                                : 'bg-slate-50/70 border-slate-200 text-slate-400'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-mono font-bold text-slate-900 block">
                                  {tool.name}
                                </span>
                                <p className="text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                                  {tool.description || 'Executes custom MCP action.'}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={tool.isEnabled}
                                    onChange={(e) =>
                                      handleToggleTool(server.id, tool.id, {
                                        isEnabled: e.target.checked,
                                      })
                                    }
                                    className="sr-only peer"
                                  />
                                  <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                              </div>
                            </div>

                            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={tool.requireApproval}
                                  onChange={(e) =>
                                    handleToggleTool(server.id, tool.id, {
                                      requireApproval: e.target.checked,
                                    })
                                  }
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                />
                                <span
                                  className={`text-[11px] ${
                                    tool.requireApproval
                                      ? 'text-amber-800 font-semibold'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  {isMyanmar ? 'မလုပ်ဆောင်မီ အတည်ပြုချက်တောင်းရန်' : 'Require User Approval (HITL)'}
                                </span>
                              </label>
                              <span className="text-[10px] font-mono text-slate-400">
                                JSON Schema
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3-Step Custom MCP Connection Modal Dialog */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="mcp-wizard-title"
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 id="mcp-wizard-title" className="text-base font-bold text-slate-900">
                  {t.mcpConnectCustom}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isMyanmar
                    ? 'အဆင့် ၃ ဆင့်ဖြင့် custom MCP server အား စမ်းသပ်ချိတ်ဆက်ပါ'
                    : 'Configure remote SSE endpoint or local containerized MCP tool in 3 simple steps'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                aria-label="Close dialog"
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 min-h-[36px] min-w-[36px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Stepper Tabs */}
            <div role="tablist" aria-label="MCP configuration steps" className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3 text-xs font-medium">
              <button
                type="button"
                role="tab"
                aria-selected={wizardStep === 1}
                onClick={() => setWizardStep(1)}
                className={`pb-1 text-center border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  wizardStep === 1
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-slate-500'
                }`}
              >
                {t.mcpStepGeneral}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={wizardStep === 2}
                onClick={() => setWizardStep(2)}
                className={`pb-1 text-center border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  wizardStep === 2
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-slate-500'
                }`}
              >
                {t.mcpStepAuth}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={wizardStep === 3}
                onClick={() => setWizardStep(3)}
                className={`pb-1 text-center border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  wizardStep === 3
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-slate-500'
                }`}
              >
                {t.mcpStepTools}
              </button>
            </div>

            {/* Step 1: General & Transport */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="mcp-server-name-input" className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.mcpServerName} *
                  </label>
                  <input
                    id="mcp-server-name-input"
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Acme Inventory Service"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[40px]"
                  />
                </div>

                <div>
                  <label htmlFor="mcp-description-input" className="block text-xs font-semibold text-slate-700 mb-1">
                    {isMyanmar ? 'ဖော်ပြချက်' : 'Description'}
                  </label>
                  <input
                    id="mcp-description-input"
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="e.g. Query stock levels and warehouse inventory"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[40px]"
                  />
                </div>

                <div>
                  <span className="block text-xs font-semibold text-slate-700 mb-2">
                    {t.mcpTransport}
                  </span>
                  <div role="radiogroup" aria-label="Transport type" className="grid grid-cols-2 gap-3">
                    <div
                      role="radio"
                      aria-checked={formTransport === McpTransport.SSE}
                      tabIndex={0}
                      onClick={() => setFormTransport(McpTransport.SSE)}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') setFormTransport(McpTransport.SSE);
                      }}
                      className={`p-3 rounded-lg border text-xs cursor-pointer flex items-center gap-2.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                        formTransport === McpTransport.SSE
                          ? 'border-blue-600 bg-blue-50/40 text-blue-900 font-semibold shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      <Radio className="w-4 h-4 text-blue-600" aria-hidden="true" />
                      <div>
                        <div>SSE / Remote HTTP</div>
                        <div className="text-[11px] text-slate-500 font-normal">Cloud & Microservices</div>
                      </div>
                    </div>

                    <div
                      role="radio"
                      aria-checked={formTransport === McpTransport.STDIO}
                      tabIndex={0}
                      onClick={() => setFormTransport(McpTransport.STDIO)}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') setFormTransport(McpTransport.STDIO);
                      }}
                      className={`p-3 rounded-lg border text-xs cursor-pointer flex items-center gap-2.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                        formTransport === McpTransport.STDIO
                          ? 'border-blue-600 bg-blue-50/40 text-blue-900 font-semibold shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      <Radio className="w-4 h-4 text-blue-600" aria-hidden="true" />
                      <div>
                        <div>Stdio / Container</div>
                        <div className="text-[11px] text-slate-500 font-normal">Local CLI & Docker</div>
                      </div>
                    </div>
                  </div>
                </div>

                {formTransport === McpTransport.SSE ? (
                  <div>
                    <label htmlFor="mcp-endpoint-url-input" className="block text-xs font-semibold text-slate-700 mb-1">
                      {t.mcpEndpointUrl} *
                    </label>
                    <input
                      id="mcp-endpoint-url-input"
                      type="url"
                      value={formEndpointUrl}
                      onChange={(e) => setFormEndpointUrl(e.target.value)}
                      placeholder="https://mcp.internal.acme.com/sse"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[40px]"
                    />
                  </div>
                ) : (
                  <div>
                    <label htmlFor="mcp-command-input" className="block text-xs font-semibold text-slate-700 mb-1">
                      {isMyanmar ? 'Docker / Shell Command' : 'Command execution line'} *
                    </label>
                    <input
                      id="mcp-command-input"
                      type="text"
                      value={formCommand}
                      onChange={(e) => setFormCommand(e.target.value)}
                      placeholder="docker run -i --rm mcp/my-tool:latest"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[40px]"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Authentication & Encrypted Secrets */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>
                    {isMyanmar
                      ? 'လုံခြုံရေး Tokens များကို AES-256-GCM ဖြင့် လုံခြုံစွာ ကုဒ်ဝှက်သိမ်းဆည်းပေးမည် ဖြစ်ပါသည်'
                      : 'All headers and API tokens are encrypted at rest using tenant-derived AES-256-GCM keys.'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.mcpAuthHeaders}
                  </label>
                  <textarea
                    rows={4}
                    value={formHeaders}
                    onChange={(e) => setFormHeaders(e.target.value)}
                    placeholder='{ "Authorization": "Bearer token", "x-api-key": "secret" }'
                    className="w-full p-3 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[11px] text-slate-500 block mt-1">
                    Standard JSON key-value format for authorization headers.
                  </span>
                </div>
              </div>
            )}

            {/* Step 3: Test & Discovered Tools */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-semibold text-slate-900">
                      {isMyanmar ? 'ချိတ်ဆက်မှု အောင်မြင်ပါသည်' : 'Connection handshake successful!'}
                    </span>
                  </div>
                  {testLatency !== null && (
                    <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
                      {testLatency} ms
                    </span>
                  )}
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-700 mb-2">
                    {isMyanmar ? 'ရှာဖွေတွေ့ရှိသော Tools များ' : 'Discovered Tools'} ({discoveredTools.length})
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {discoveredTools.map((t, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded border border-slate-200 bg-slate-50/50 text-xs flex items-center justify-between"
                      >
                        <div>
                          <span className="font-mono font-bold text-slate-900 block">{t.name}</span>
                          <span className="text-slate-600 text-[11px]">{t.description}</span>
                        </div>
                        <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded">
                          Enabled
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              {wizardStep > 1 ? (
                <button
                  onClick={() => setWizardStep((prev) => (prev - 1) as any)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 min-h-[38px]"
                >
                  {isMyanmar ? 'နောက်သို့' : 'Back'}
                </button>
              ) : (
                <div></div>
              )}

              <div className="flex items-center gap-2">
                {wizardStep === 1 && (
                  <button
                    onClick={() => setWizardStep(2)}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 min-h-[38px]"
                  >
                    {isMyanmar ? 'ရှေ့သို့' : 'Next: Auth'}
                  </button>
                )}

                {wizardStep === 2 && (
                  <button
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 min-h-[38px]"
                  >
                    {isTesting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5" />
                    )}
                    <span>{isMyanmar ? 'စမ်းသပ်ပြီး Tools ရှာမည်' : 'Test & Discover'}</span>
                  </button>
                )}

                {wizardStep === 3 && (
                  <button
                    onClick={handleCreateServer}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 min-h-[38px]"
                  >
                    {isSaving ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>{t.mcpSaveAndActivate}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
