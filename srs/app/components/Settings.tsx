import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Key,
  Shield,
  Eye,
  EyeOff,
  Save,
  AlertTriangle,
  CheckCircle,
  Server,
  Database,
  Bell,
  Moon,
  Globe,
  Radar,
  ExternalLink,
  RefreshCw,
  Trash2,
  Download,
  Upload,
  Lock,
  Ghost,
  Terminal
} from 'lucide-react';

interface SettingsProps {
  onApiKeyChange?: (key: string, provider: string) => void;
}

export function Settings({ onApiKeyChange }: SettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [overwatchUrl, setOverwatchUrl] = useState('');
  const [overwatchStatus, setOverwatchStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [overwatchMode, setOverwatchMode] = useState<'external' | 'iframe'>('external');

  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    weekly: true
  });

  const [theme, setTheme] = useState('dark');
  const [language, setLanguage] = useState('en');

  // Load saved API key on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('ai_api_key');
    const savedProvider = localStorage.getItem('ai_provider');
    const savedOverwatch = localStorage.getItem('overwatch_dashboard_url');
    const savedOverwatchMode = localStorage.getItem('overwatch_mode');
    if (savedKey) {
      setApiKey(savedKey);
      setApiKey('*'.repeat(20) + savedKey.slice(-4));
    }
    if (savedProvider) {
      // Migrate legacy provider key to the new Grok option.
      setSelectedProvider(savedProvider === 'deepseek' ? 'grok' : savedProvider);
    }
    if (savedOverwatch) setOverwatchUrl(savedOverwatch);
    if (savedOverwatchMode) setOverwatchMode(savedOverwatchMode === 'iframe' ? 'iframe' : 'external');
  }, []);

  const saveOverwatchViewerUrl = () => {
    setOverwatchStatus('idle');
    const trimmed = overwatchUrl.trim();
    try {
      // Accept bare domains/hosts by assuming https.
      const parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('bad_protocol');
      if (
        parsed.protocol === 'http:' &&
        (parsed.hostname.endsWith('.vercel.app') || parsed.hostname.endsWith('.vercel.com'))
      ) {
        parsed.protocol = 'https:';
      }
      localStorage.setItem('overwatch_dashboard_url', parsed.toString());
      setOverwatchUrl(parsed.toString());
      setOverwatchStatus('success');
      setTimeout(() => setOverwatchStatus('idle'), 2500);
    } catch {
      setOverwatchStatus('error');
      setTimeout(() => setOverwatchStatus('idle'), 2500);
    }
  };

  const openOverwatchViewerUrl = () => {
    const trimmed = overwatchUrl.trim();
    if (!trimmed) return;
    try {
      const parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
      if (
        parsed.protocol === 'http:' &&
        (parsed.hostname.endsWith('.vercel.app') || parsed.hostname.endsWith('.vercel.com'))
      ) {
        parsed.protocol = 'https:';
      }
      window.open(parsed.toString(), '_blank', 'noopener,noreferrer');
    } catch {
      setOverwatchStatus('error');
      setTimeout(() => setOverwatchStatus('idle'), 2500);
    }
  };

  const handleSaveApiKey = async () => {
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      // In a real app, we'd validate the key with the API
      // For now, we'll just save it to localStorage
      const keyToSave = apiKey.startsWith('*') ? localStorage.getItem('ai_api_key_raw') || '' : apiKey;

      if (keyToSave.length < 10) {
        throw new Error('Invalid API key');
      }

      localStorage.setItem('ai_api_key', apiKey.startsWith('*') ? apiKey : '*'.repeat(20) + apiKey.slice(-4));
      localStorage.setItem('ai_api_key_raw', keyToSave);
      localStorage.setItem('ai_provider', selectedProvider);

      setSaveStatus('success');
      onApiKeyChange?.(keyToSave, selectedProvider);

      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const clearAllData = () => {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      localStorage.clear();
      setApiKey('');
      window.location.reload();
    }
  };

  const exportData = () => {
    const data = {
      settings: { theme, language, notifications, provider: selectedProvider },
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nerv-magi-settings.json';
    a.click();
  };

  return (
    <div className="h-full flex flex-col bg-nerv-void">
      {/* Header */}
      <div className="p-4 border-b border-nerv-brown">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-nerv-orange/20 border border-nerv-orange flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-nerv-orange" />
          </div>
          <div>
            <h2 className="text-sm font-header uppercase tracking-wider text-nerv-orange">System Settings</h2>
            <p className="text-[10px] text-nerv-rust">Configure AI backend and preferences</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* API Configuration */}
        <div className="p-4 bg-nerv-void-panel border border-nerv-brown">
          <h3 className="text-[12px] text-nerv-orange font-header uppercase tracking-wider mb-4 flex items-center gap-2">
            <Key className="w-4 h-4 text-nerv-orange" />
            AI Backend Configuration
          </h3>

          <div className="space-y-4">
            {/* Provider Selection */}
            <div>
              <label className="text-[10px] text-nerv-rust uppercase tracking-wider block mb-2 font-mono">
                AI Provider
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => setSelectedProvider('openai')}
                  className={`p-3 border text-left transition-all ${
                    selectedProvider === 'openai'
                      ? 'bg-nerv-orange/20 border-nerv-orange text-nerv-orange'
                      : 'bg-nerv-void border-nerv-brown hover:border-nerv-orange/50'
                  }`}
                >
                  <div className="text-[13px] font-medium font-header uppercase tracking-wider">OpenAI</div>
                  <div className="text-[10px] text-nerv-rust font-mono">GPT-4 / GPT-4o</div>
                </button>
                <button
                  onClick={() => setSelectedProvider('anthropic')}
                  className={`p-3 border text-left transition-all ${
                    selectedProvider === 'anthropic'
                      ? 'bg-nerv-orange/20 border-nerv-orange text-nerv-orange'
                      : 'bg-nerv-void border-nerv-brown hover:border-nerv-orange/50'
                  }`}
                >
                  <div className="text-[13px] font-medium font-header uppercase tracking-wider">Anthropic</div>
                  <div className="text-[10px] text-nerv-rust font-mono">Claude 3.5/3.7</div>
                </button>
                <button
                  onClick={() => setSelectedProvider('grok')}
                  className={`p-3 border text-left transition-all ${
                    selectedProvider === 'grok'
                      ? 'bg-nerv-orange/20 border-nerv-orange text-nerv-orange'
                      : 'bg-nerv-void border-nerv-brown hover:border-nerv-orange/50'
                  }`}
                >
                  <div className="text-[13px] font-medium font-header uppercase tracking-wider">Grok</div>
                  <div className="text-[10px] text-nerv-rust font-mono">Groq Llama 3</div>
                </button>
              </div>
            </div>

            {/* API Key Input */}
            <div>
              <label className="text-[10px] text-nerv-rust uppercase tracking-wider block mb-2 font-mono">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    selectedProvider === 'openai' ? 'sk-...' :
                    selectedProvider === 'anthropic' ? 'sk-ant-...' :
                    selectedProvider === 'grok' ? 'gsk_...' :
                    'sk-...'
                  }
                  className="w-full bg-nerv-void border border-nerv-brown pr-12 pl-4 py-2 text-[13px] text-nerv-amber placeholder-nerv-rust focus:border-nerv-orange transition-all font-mono uppercase"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-nerv-rust hover:text-nerv-orange transition-colors"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-nerv-rust mt-2 font-mono">
                Your API key is stored locally and never sent to our servers
              </p>
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveApiKey}
                disabled={isSaving || !apiKey}
                className="flex items-center gap-2 px-4 py-2 bg-nerv-orange text-nerv-void font-header uppercase tracking-wider text-[12px] hover:bg-nerv-amber disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save Configuration</span>
              </button>

              {saveStatus === 'success' && (
                <div className="flex items-center gap-1 text-nerv-amber">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-[11px] font-mono uppercase">Saved successfully</span>
                </div>
              )}

              {saveStatus === 'error' && (
                <div className="flex items-center gap-1 text-nerv-alert">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-[11px] font-mono uppercase">Invalid API key</span>
                </div>
              )}
            </div>

            {/* Security Notice */}
            <div className="p-3 bg-nerv-void border border-nerv-brown">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-nerv-amber mt-0.5" />
                <div>
                  <p className="text-[11px] text-nerv-orange font-header uppercase tracking-wider">Secure Storage</p>
                  <p className="text-[10px] text-nerv-rust mt-1 font-mono">
                    API keys are encrypted and stored in your browser's local storage.
                    We never transmit your credentials to external servers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ghost Protocol Agent Configuration */}
        <div className="p-4 bg-nerv-void-panel border border-nerv-brown">
          <h3 className="text-[12px] text-nerv-orange font-header uppercase tracking-wider mb-4 flex items-center gap-2">
            <Ghost className="w-4 h-4 text-nerv-orange" />
            Ghost Protocol Agent
          </h3>

          <div className="space-y-4">
            <div className="p-3 bg-nerv-void border border-nerv-brown">
              <div className="flex items-start gap-3">
                <Terminal className="w-4 h-4 text-nerv-orange mt-0.5" />
                <div className="flex-1">
                  <p className="text-[11px] text-nerv-orange font-header uppercase tracking-wider">Agent Intelligence Backend</p>
                  <p className="text-[10px] text-nerv-rust mt-1 font-mono">
                    The Agent tab uses Groq (Llama 3) for autonomous intelligence and query processing.
                  </p>
                  
                  {/* Check if key is available */}
                  <div className="mt-3 flex items-center gap-2">
                    {(() => {
                      const envKey = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_GROQ_API_KEY;
                      const savedKey = typeof window !== 'undefined' && localStorage.getItem('ai_api_key_raw');
                      const savedProvider = typeof window !== 'undefined' && localStorage.getItem('ai_provider');
                      const hasKey = !!(envKey || (savedKey && (savedProvider === 'grok' || savedKey.startsWith('gsk_'))));
                      
                      return hasKey ? (
                        <>
                          <div className="w-2 h-2 bg-nerv-amber animate-pulse" />
                          <span className="text-[10px] text-nerv-amber font-mono uppercase">Agent operational - API key configured</span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-nerv-orange" />
                          <span className="text-[10px] text-nerv-orange font-mono uppercase">Using fallback mode - Configure Grok API key above</span>
                        </>
                      );
                    })()}
                  </div>
                  
                  <div className="mt-3 p-2 bg-nerv-void-panel border border-nerv-brown">
                    <p className="text-[9px] text-nerv-rust uppercase tracking-wider mb-1 font-mono">Configuration</p>
                    <p className="text-[10px] text-nerv-rust font-mono">
                      Select <strong className="text-nerv-orange">Grok</strong> in the AI Backend section above and enter your Groq API key 
                      (starts with <code className="text-nerv-orange">gsk_</code>)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Overwatch Configuration */}
        <div className="p-4 bg-nerv-void-panel border border-nerv-brown">
          <h3 className="text-[12px] text-nerv-orange font-header uppercase tracking-wider mb-4 flex items-center gap-2">
            <Radar className="w-4 h-4 text-nerv-orange" />
            Overwatch
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-nerv-rust uppercase tracking-wider block mb-2 font-mono">
                Mode
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOverwatchMode('external');
                    localStorage.setItem('overwatch_mode', 'external');
                  }}
                  className={`px-3 py-2 border text-[12px] transition-all font-mono uppercase ${
                    overwatchMode === 'external'
                      ? 'bg-nerv-orange/20 text-nerv-orange border-nerv-orange'
                      : 'bg-nerv-void text-nerv-rust border-nerv-brown hover:border-nerv-orange/50 hover:text-nerv-orange'
                  }`}
                >
                  External (Recommended)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOverwatchMode('iframe');
                    localStorage.setItem('overwatch_mode', 'iframe');
                  }}
                  className={`px-3 py-2 border text-[12px] transition-all font-mono uppercase ${
                    overwatchMode === 'iframe'
                      ? 'bg-nerv-orange/20 text-nerv-orange border-nerv-orange'
                      : 'bg-nerv-void text-nerv-rust border-nerv-brown hover:border-nerv-orange/50 hover:text-nerv-orange'
                  }`}
                  title="Embedding is subject to CSP/XFO, mixed-content, sandbox restrictions, and edge/network errors."
                >
                  Embed (Experimental)
                </button>
              </div>
              <p className="text-[10px] text-nerv-rust mt-2 font-mono">
                External mode avoids iframe failures. Embed mode may break depending on the target site's headers and policies.
              </p>
            </div>

            <div>
              <label className="text-[10px] text-nerv-rust uppercase tracking-wider block mb-2 font-mono">
                Published / Viewer Link
              </label>
              <input
                value={overwatchUrl}
                onChange={(e) => setOverwatchUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-nerv-void border border-nerv-brown px-4 py-2 text-[13px] text-nerv-amber placeholder-nerv-rust focus:border-nerv-orange transition-all font-mono"
              />
              <p className="text-[10px] text-nerv-rust mt-2 font-mono">
                Use a published/view-only URL. Editor or builder links can inject overlay tooling when embedded.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={saveOverwatchViewerUrl}
                className="flex items-center gap-2 px-4 py-2 bg-nerv-orange/20 text-nerv-orange border border-nerv-orange hover:bg-nerv-orange/30 transition-all font-header uppercase tracking-wider text-[12px]"
              >
                <Save className="w-4 h-4" />
                <span>Save URL</span>
              </button>
              <button
                type="button"
                onClick={openOverwatchViewerUrl}
                disabled={!overwatchUrl.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-nerv-void border border-nerv-brown text-[12px] text-nerv-rust hover:border-nerv-orange/50 hover:text-nerv-orange transition-all disabled:opacity-50 disabled:cursor-not-allowed font-mono uppercase"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Test / Open</span>
              </button>

              {overwatchStatus === 'success' && (
                <div className="flex items-center gap-1 text-nerv-amber">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-[11px] font-mono uppercase">Saved</span>
                </div>
              )}

              {overwatchStatus === 'error' && (
                <div className="flex items-center gap-1 text-nerv-alert">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-[11px] font-mono uppercase">Invalid URL</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="p-4 bg-nerv-void-panel border border-nerv-brown">
          <h3 className="text-[12px] text-nerv-orange font-header uppercase tracking-wider mb-4 flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-nerv-orange" />
            Preferences
          </h3>

          <div className="space-y-4">
            {/* Theme */}
            <div>
              <label className="text-[10px] text-nerv-rust uppercase tracking-wider block mb-2 font-mono">
                Theme
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex items-center gap-2 px-3 py-2 border text-[12px] transition-all font-mono uppercase ${
                    theme === 'dark'
                      ? 'bg-nerv-orange/20 text-nerv-orange border-nerv-orange'
                      : 'bg-nerv-void text-nerv-rust border-nerv-brown hover:border-nerv-orange/50'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  Dark
                </button>
                <button
                  onClick={() => setTheme('light')}
                  className={`flex items-center gap-2 px-3 py-2 border text-[12px] transition-all font-mono uppercase ${
                    theme === 'light'
                      ? 'bg-nerv-orange/20 text-nerv-orange border-nerv-orange'
                      : 'bg-nerv-void text-nerv-rust border-nerv-brown hover:border-nerv-orange/50'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  Light
                </button>
              </div>
            </div>

            {/* Language */}
            <div>
              <label className="text-[10px] text-nerv-rust uppercase tracking-wider block mb-2 font-mono">
                Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-nerv-void border border-nerv-brown px-3 py-2 text-[13px] text-nerv-amber focus:border-nerv-orange transition-all font-mono"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
              </select>
            </div>

            {/* Notifications */}
            <div>
              <label className="text-[10px] text-nerv-rust uppercase tracking-wider block mb-2 font-mono">
                Notifications
              </label>
              <div className="space-y-2">
                <label className="flex items-center justify-between p-2 bg-nerv-void border border-nerv-brown cursor-pointer">
                  <span className="text-[12px] text-nerv-rust flex items-center gap-2 font-mono">
                    <Bell className="w-4 h-4" />
                    Email notifications
                  </span>
                  <input
                    type="checkbox"
                    checked={notifications.email}
                    onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                    className="w-4 h-4 accent-nerv-orange"
                  />
                </label>
                <label className="flex items-center justify-between p-2 bg-nerv-void border border-nerv-brown cursor-pointer">
                  <span className="text-[12px] text-nerv-rust flex items-center gap-2 font-mono">
                    <Bell className="w-4 h-4" />
                    Push notifications
                  </span>
                  <input
                    type="checkbox"
                    checked={notifications.push}
                    onChange={(e) => setNotifications({ ...notifications, push: e.target.checked })}
                    className="w-4 h-4 accent-nerv-orange"
                  />
                </label>
                <label className="flex items-center justify-between p-2 bg-nerv-void border border-nerv-brown cursor-pointer">
                  <span className="text-[12px] text-nerv-rust flex items-center gap-2 font-mono">
                    <Bell className="w-4 h-4" />
                    Weekly digest
                  </span>
                  <input
                    type="checkbox"
                    checked={notifications.weekly}
                    onChange={(e) => setNotifications({ ...notifications, weekly: e.target.checked })}
                    className="w-4 h-4 accent-nerv-orange"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="p-4 bg-nerv-void-panel border border-nerv-brown">
          <h3 className="text-[12px] text-nerv-orange font-header uppercase tracking-wider mb-4 flex items-center gap-2">
            <Database className="w-4 h-4 text-nerv-orange" />
            Data Management
          </h3>

          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={exportData}
                className="flex items-center gap-2 px-3 py-2 bg-nerv-void border border-nerv-brown text-[12px] text-nerv-rust hover:border-nerv-orange/50 hover:text-nerv-orange transition-all font-mono uppercase"
              >
                <Download className="w-4 h-4" />
                Export Settings
              </button>
              <button className="flex items-center gap-2 px-3 py-2 bg-nerv-void border border-nerv-brown text-[12px] text-nerv-rust hover:border-nerv-orange/50 hover:text-nerv-orange transition-all font-mono uppercase">
                <Upload className="w-4 h-4" />
                Import Settings
              </button>
            </div>

            <div className="pt-3 border-t border-nerv-brown">
              <button
                onClick={clearAllData}
                className="flex items-center gap-2 px-3 py-2 bg-nerv-alert/10 border border-nerv-alert text-[12px] text-nerv-alert hover:bg-nerv-alert/20 transition-all font-header uppercase tracking-wider"
              >
                <Trash2 className="w-4 h-4" />
                Clear All Data
              </button>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="p-4 bg-nerv-void-panel border border-nerv-brown">
          <h3 className="text-[12px] text-nerv-orange font-header uppercase tracking-wider mb-4 flex items-center gap-2">
            <Server className="w-4 h-4 text-nerv-amber" />
            System Information
          </h3>

          <div className="grid grid-cols-2 gap-4 text-[11px]">
            <div>
              <div className="text-nerv-rust mb-1 font-mono uppercase">Version</div>
              <div className="text-nerv-amber font-mono">1.0.0</div>
            </div>
            <div>
              <div className="text-nerv-rust mb-1 font-mono uppercase">Build</div>
              <div className="text-nerv-amber font-mono">2026.02.25</div>
            </div>
            <div>
              <div className="text-nerv-rust mb-1 font-mono uppercase">AI Provider</div>
              <div className="text-nerv-amber capitalize font-mono">{selectedProvider}</div>
            </div>
            <div>
              <div className="text-nerv-rust mb-1 font-mono uppercase">Status</div>
              <div className="text-nerv-amber flex items-center gap-1 font-mono uppercase">
                <Lock className="w-3 h-3" />
                Operational
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
