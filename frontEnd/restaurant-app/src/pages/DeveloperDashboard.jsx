import { useState, useCallback, useEffect } from "react";
import { Wrench, Key, Settings, ScrollText, Activity, LogOut, Cpu, Eye, EyeOff } from "lucide-react";
import * as devService from "../services/developer.js";

const TABS = [
  { key: "settings", label: "Settings", icon: Settings },
  { key: "logs", label: "Audit Log", icon: ScrollText },
  { key: "diagnostics", label: "Diagnostics", icon: Cpu },
  { key: "env", label: "Environment", icon: Activity },
];

export default function DeveloperDashboard() {
  const [token, setToken] = useState(() => devService.getStoredDevToken());
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState("settings");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [settings, setSettings] = useState([]);
  const [logs, setLogs] = useState([]);
  const [logsMeta, setLogsMeta] = useState({});
  const [logActions, setLogActions] = useState([]);
  const [logsFilter, setLogsFilter] = useState({ page: 1, action: "", severity: "" });
  const [diagnostics, setDiagnostics] = useState(null);
  const [env, setEnv] = useState(null);
  const [actionLog, setActionLog] = useState([]);
  const [newSettingKey, setNewSettingKey] = useState("");
  const [newSettingValue, setNewSettingValue] = useState("");
  const [newSettingCategory, setNewSettingCategory] = useState("system");
  const [showSensitive, setShowSensitive] = useState({});

  useEffect(() => {
    if (!token) {
      setChecking(false);
      return;
    }
    devService.verifyDeveloper(token)
      .then((ok) => {
        setVerified(ok);
        if (ok) loadSettings();
        else devService.clearDevToken();
      })
      .catch(() => {
        setVerified(false);
        devService.clearDevToken();
      })
      .finally(() => setChecking(false));
  }, [token]);

  useEffect(() => {
    if (verified && token) loadLogs();
  }, [verified, token, logsFilter]);

  const addActionLog = useCallback((msg) => {
    setActionLog((prev) => [{ time: new Date().toISOString(), msg }, ...prev].slice(0, 50));
  }, []);

  const loadSettings = async () => {
    if (!token) return;
    try {
      const s = await devService.getDeveloperSettings(token);
      setSettings(s);
      addActionLog("Settings loaded");
    } catch {
      addActionLog("Failed to load settings");
    }
  };

  const loadLogs = async () => {
    if (!token) return;
    try {
      const result = await devService.getDeveloperLogs(token, logsFilter);
      setLogs(result.items || []);
      setLogsMeta(result.meta || {});
      const actions = await devService.getDeveloperLogActions(token);
      setLogActions(actions);
      addActionLog("Logs loaded");
    } catch {
      addActionLog("Failed to load logs");
    }
  };

  const loadDiagnostics = async () => {
    if (!token) return;
    try {
      const d = await devService.getSystemDiagnostics(token);
      setDiagnostics(d);
      addActionLog("Diagnostics loaded");
    } catch {
      addActionLog("Failed to load diagnostics");
    }
  };

  const loadEnv = async () => {
    if (!token) return;
    try {
      const e = await devService.getSystemEnv(token);
      setEnv(e);
      addActionLog("Environment loaded");
    } catch {
      addActionLog("Failed to load environment");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      const t = await devService.developerLogin(loginForm.email, loginForm.password);
      devService.storeDevToken(t);
      setToken(t);
      setVerified(true);
      addActionLog("Developer login successful");
      loadSettings();
    } catch (err) {
      setLoginError(err.message || "Login failed");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    devService.clearDevToken();
    setToken("");
    setVerified(false);
    setSettings([]);
    setLogs([]);
    setDiagnostics(null);
    setEnv(null);
    setActionLog([]);
    addActionLog("Logged out");
  };

  const handleUpdateSetting = async (key, value) => {
    if (!token) return;
    try {
      await devService.updateDeveloperSetting(token, key, { value });
      addActionLog(`Setting "${key}" updated`);
      loadSettings();
    } catch {
      addActionLog(`Failed to update setting "${key}"`);
    }
  };

  const handleDeleteSetting = async (key) => {
    if (!token || !window.confirm(`Delete setting "${key}"?`)) return;
    try {
      await devService.deleteDeveloperSetting(token, key);
      addActionLog(`Setting "${key}" deleted`);
      loadSettings();
    } catch {
      addActionLog(`Failed to delete setting "${key}"`);
    }
  };

  const handleAddSetting = async () => {
    if (!token || !newSettingKey.trim()) return;
    try {
      await devService.updateDeveloperSetting(token, newSettingKey.trim(), {
        value: newSettingValue,
        category: newSettingCategory,
      });
      setNewSettingKey("");
      setNewSettingValue("");
      addActionLog(`Setting "${newSettingKey}" created`);
      loadSettings();
    } catch {
      addActionLog(`Failed to create setting`);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="animate-pulse text-[#A9805F] text-sm">Authenticating...</div>
      </div>
    );
  }

  if (!verified) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <form onSubmit={handleLogin} className="bg-[#1A1A1A] rounded-3xl p-8 ring-1 ring-[#2A2A2A] shadow-xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#2A2A2A] flex items-center justify-center">
                <Wrench size={22} className="text-[#A9805F]" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">Developer Console</h1>
                <p className="text-xs text-[#666]">Restricted Access</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#888] mb-1.5">Email</label>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#A9805F]"
                  placeholder="dev@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#888] mb-1.5">Password</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#A9805F]"
                  placeholder="••••••••"
                  required
                />
              </div>
              {loginError && (
                <p className="text-xs text-rose-400 bg-rose-900/20 rounded-lg px-3 py-2">{loginError}</p>
              )}
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-[#A9805F] hover:bg-[#90704A] text-white rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loginLoading ? "Authenticating..." : "Authenticate"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#2A2A2A] flex items-center justify-center">
              <Wrench size={20} className="text-[#A9805F]" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Developer Console</h1>
              <p className="text-xs text-[#666]">Internal System Tools</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A1A1A] hover:bg-[#2A2A2A] text-sm text-[#888] transition-colors"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => {
                  setTab(t.key);
                  if (t.key === "diagnostics" && !diagnostics) loadDiagnostics();
                  if (t.key === "env" && !env) loadEnv();
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  tab === t.key ? "bg-[#A9805F] text-white" : "bg-[#1A1A1A] text-[#888] hover:bg-[#2A2A2A]"
                }`}
              >
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>

        {tab === "settings" && (
          <div className="space-y-4">
            <div className="bg-[#1A1A1A] rounded-2xl p-6 ring-1 ring-[#2A2A2A]">
              <h2 className="text-sm font-semibold text-[#A9805F] mb-4">Developer Settings</h2>
              <div className="space-y-3">
                {settings.length === 0 && <p className="text-xs text-[#666]">No settings configured.</p>}
                {settings.map((s) => (
                  <div key={s.key} className="bg-[#0A0A0A] rounded-xl p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-medium text-white">{s.key}</span>
                        {s.description && <p className="text-[10px] text-[#666] mt-0.5">{s.description}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wider text-[#555] bg-[#1A1A1A] px-2 py-0.5 rounded">{s.category}</span>
                        <button
                          onClick={() => handleDeleteSetting(s.key)}
                          className="text-[10px] text-rose-500 hover:text-rose-400"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.sensitive ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type={showSensitive[s.key] ? "text" : "password"}
                            defaultValue="***"
                            className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#A9805F]"
                            onBlur={(e) => {
                              if (e.target.value && e.target.value !== "***") handleUpdateSetting(s.key, e.target.value);
                            }}
                          />
                          <button
                            onClick={() => setShowSensitive((p) => ({ ...p, [s.key]: !p[s.key] }))}
                            className="text-[#666] hover:text-white"
                          >
                            {showSensitive[s.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      ) : (
                        <input
                          defaultValue={typeof s.value === "object" ? JSON.stringify(s.value) : String(s.value ?? "")}
                          className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#A9805F]"
                          onBlur={(e) => {
                            if (e.target.value !== String(s.value ?? "")) handleUpdateSetting(s.key, e.target.value);
                          }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[#1A1A1A] rounded-2xl p-6 ring-1 ring-[#2A2A2A]">
              <h2 className="text-sm font-semibold text-[#A9805F] mb-4">Add Setting</h2>
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-[10px] text-[#666] mb-1">Key</label>
                  <input
                    value={newSettingKey}
                    onChange={(e) => setNewSettingKey(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#A9805F]"
                    placeholder="e.g. feature.flag.newUI"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-[10px] text-[#666] mb-1">Value</label>
                  <input
                    value={newSettingValue}
                    onChange={(e) => setNewSettingValue(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#A9805F]"
                    placeholder="value"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#666] mb-1">Category</label>
                  <select
                    value={newSettingCategory}
                    onChange={(e) => setNewSettingCategory(e.target.value)}
                    className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#A9805F]"
                  >
                    <option value="system">system</option>
                    <option value="security">security</option>
                    <option value="performance">performance</option>
                    <option value="debug">debug</option>
                    <option value="maintenance">maintenance</option>
                    <option value="integration">integration</option>
                  </select>
                </div>
                <button
                  onClick={handleAddSetting}
                  className="bg-[#A9805F] hover:bg-[#90704A] text-white rounded-xl px-6 py-2 text-xs font-medium transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "logs" && (
          <div className="bg-[#1A1A1A] rounded-2xl p-6 ring-1 ring-[#2A2A2A] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#A9805F]">Developer Audit Log</h2>
              <button onClick={loadLogs} className="text-xs text-[#666] hover:text-white">Refresh</button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <select
                value={logsFilter.action}
                onChange={(e) => setLogsFilter({ ...logsFilter, action: e.target.value, page: 1 })}
                className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
              >
                <option value="">All Actions</option>
                {logActions.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <select
                value={logsFilter.severity}
                onChange={(e) => setLogsFilter({ ...logsFilter, severity: e.target.value, page: 1 })}
                className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
              >
                <option value="">All Severities</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {logs.length === 0 && <p className="text-xs text-[#666] text-center py-8">No log entries found.</p>}
              {logs.map((log) => (
                <div key={log._id} className="bg-[#0A0A0A] rounded-xl p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={`font-mono font-medium ${
                      log.severity === "critical" ? "text-rose-400" :
                      log.severity === "error" ? "text-orange-400" :
                      log.severity === "warning" ? "text-amber-400" : "text-[#888]"
                    }`}>
                      {log.action}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded ${
                      log.severity === "critical" ? "bg-rose-900/30 text-rose-400" :
                      log.severity === "error" ? "bg-orange-900/30 text-orange-400" :
                      log.severity === "warning" ? "bg-amber-900/30 text-amber-400" :
                      "bg-[#2A2A2A] text-[#666]"
                    }`}>
                      {log.severity}
                    </span>
                  </div>
                  <div className="text-[#666]">
                    {log.userEmail && <span>{log.userEmail}</span>}
                    <span className="ml-2">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                  {log.metadata && <div className="text-[#555] font-mono">{JSON.stringify(log.metadata)}</div>}
                  {log.ip && <div className="text-[#555]">IP: {log.ip}</div>}
                </div>
              ))}
            </div>
            {logsMeta.pages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <button
                  disabled={logsFilter.page <= 1}
                  onClick={() => setLogsFilter({ ...logsFilter, page: logsFilter.page - 1 })}
                  className="text-xs text-[#666] hover:text-white disabled:opacity-30"
                >
                  Previous
                </button>
                <span className="text-xs text-[#666]">Page {logsMeta.page} of {logsMeta.pages}</span>
                <button
                  disabled={logsFilter.page >= logsMeta.pages}
                  onClick={() => setLogsFilter({ ...logsFilter, page: logsFilter.page + 1 })}
                  className="text-xs text-[#666] hover:text-white disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {tab === "diagnostics" && (
          <div className="bg-[#1A1A1A] rounded-2xl p-6 ring-1 ring-[#2A2A2A] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#A9805F]">System Diagnostics</h2>
              <button onClick={loadDiagnostics} className="text-xs text-[#666] hover:text-white">Refresh</button>
            </div>
            {diagnostics ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#0A0A0A] rounded-xl p-4 space-y-2">
                  <h3 className="text-xs font-medium text-[#888]">Process</h3>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-[#666]">PID</span><span className="font-mono text-white">{diagnostics.pid}</span></div>
                    <div className="flex justify-between"><span className="text-[#666]">Uptime</span><span className="font-mono text-white">{Math.round(diagnostics.uptime)}s</span></div>
                    <div className="flex justify-between"><span className="text-[#666]">Node</span><span className="font-mono text-white">{diagnostics.nodeVersion}</span></div>
                    <div className="flex justify-between"><span className="text-[#666]">Platform</span><span className="font-mono text-white">{diagnostics.platform}</span></div>
                  </div>
                </div>
                <div className="bg-[#0A0A0A] rounded-xl p-4 space-y-2">
                  <h3 className="text-xs font-medium text-[#888]">Memory</h3>
                  {diagnostics.memory && (
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-[#666]">RSS</span><span className="font-mono text-white">{(diagnostics.memory.rss / 1024 / 1024).toFixed(1)} MB</span></div>
                      <div className="flex justify-between"><span className="text-[#666]">Heap Total</span><span className="font-mono text-white">{(diagnostics.memory.heapTotal / 1024 / 1024).toFixed(1)} MB</span></div>
                      <div className="flex justify-between"><span className="text-[#666]">Heap Used</span><span className="font-mono text-white">{(diagnostics.memory.heapUsed / 1024 / 1024).toFixed(1)} MB</span></div>
                      <div className="flex justify-between"><span className="text-[#666]">External</span><span className="font-mono text-white">{(diagnostics.memory.external / 1024 / 1024).toFixed(1)} MB</span></div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#666] text-center py-8">Click Diagnostics tab to load data.</p>
            )}
          </div>
        )}

        {tab === "env" && (
          <div className="bg-[#1A1A1A] rounded-2xl p-6 ring-1 ring-[#2A2A2A] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#A9805F]">Environment Variables</h2>
              <button onClick={loadEnv} className="text-xs text-[#666] hover:text-white">Refresh</button>
            </div>
            {env ? (
              <div className="space-y-1">
                {Object.entries(env).map(([key, value]) => (
                  <div key={key} className="bg-[#0A0A0A] rounded-lg px-4 py-2 text-xs font-mono flex items-center justify-between">
                    <span className="text-[#888]">{key}</span>
                    <span className="text-white">{value}</span>
                  </div>
                ))}
                {Object.keys(env).length === 0 && <p className="text-xs text-[#666] text-center py-4">No environment variables accessible.</p>}
              </div>
            ) : (
              <p className="text-xs text-[#666] text-center py-8">Click Environment tab to load data.</p>
            )}
          </div>
        )}

        <div className="mt-8 bg-[#1A1A1A] rounded-2xl p-6 ring-1 ring-[#2A2A2A]">
          <h2 className="text-sm font-semibold text-[#A9805F] mb-3">Action Log</h2>
          <div className="max-h-[200px] overflow-y-auto space-y-1">
            {actionLog.length === 0 && <p className="text-xs text-[#666]">No actions recorded this session.</p>}
            {actionLog.slice(0, 20).map((entry, i) => (
              <div key={i} className="text-[10px] text-[#555] font-mono flex gap-2">
                <span className="text-[#444] shrink-0">{new Date(entry.time).toLocaleTimeString()}</span>
                <span>{entry.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
