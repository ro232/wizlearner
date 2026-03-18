'use client';

import { useState } from 'react';
import { Shield, Key, Copy, Check, Hash, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/layout/navbar';

const ADMIN_PASSWORD = 'worksheetwiz2026';

interface AccessCode {
  id: string;
  code: string;
  tier: 'starter' | 'full';
  status: 'available' | 'used';
  usedBy?: string;
  createdAt: string;
}

interface CodeHistoryItem {
  id: string;
  code: string;
  tier: 'starter' | 'full';
  status: 'used' | 'available';
  usedBy?: string;
  createdAt: string;
}

const MOCK_HISTORY: CodeHistoryItem[] = [
  {
    id: '1',
    code: 'WIZ-A1B2-C3D4',
    tier: 'starter',
    status: 'used',
    usedBy: 'john.doe@example.com',
    createdAt: '2026-03-15',
  },
  {
    id: '2',
    code: 'WIZ-E5F6-G7H8',
    tier: 'full',
    status: 'used',
    usedBy: 'jane.smith@example.com',
    createdAt: '2026-03-14',
  },
  {
    id: '3',
    code: 'WIZ-I9J0-K1L2',
    tier: 'starter',
    status: 'available',
    createdAt: '2026-03-12',
  },
  {
    id: '4',
    code: 'WIZ-M3N4-O5P6',
    tier: 'full',
    status: 'used',
    usedBy: 'mike.wilson@example.com',
    createdAt: '2026-03-10',
  },
  {
    id: '5',
    code: 'WIZ-Q7R8-S9T0',
    tier: 'starter',
    status: 'available',
    createdAt: '2026-03-08',
  },
];

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [generatedCodes, setGeneratedCodes] = useState<AccessCode[]>([]);
  const [selectedTier, setSelectedTier] = useState<'starter' | 'full'>('starter');
  const [selectedQuantity, setSelectedQuantity] = useState(10);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAuth = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPassword('');
    } else {
      alert('Incorrect password');
      setPassword('');
    }
  };

  const generateCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'WIZ-';
    for (let i = 0; i < 8; i++) {
      if (i === 4) code += '-';
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleGenerateCodes = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const newCodes: AccessCode[] = Array.from({ length: selectedQuantity }, (_, i) => ({
        id: `code-${Date.now()}-${i}`,
        code: generateCode(),
        tier: selectedTier,
        status: 'available',
        createdAt: new Date().toISOString().split('T')[0],
      }));
      setGeneratedCodes([...newCodes, ...generatedCodes]);
      setIsGenerating(false);
    }, 500);
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const stats = [
    {
      title: 'Total Codes Generated',
      value: (generatedCodes.length + MOCK_HISTORY.length).toString(),
      icon: Hash,
      color: 'from-blue-400 to-blue-600',
    },
    {
      title: 'Used Codes',
      value: (generatedCodes.filter(c => c.status === 'used').length + MOCK_HISTORY.filter(c => c.status === 'used').length).toString(),
      icon: Key,
      color: 'from-orange-400 to-orange-600',
    },
    {
      title: 'Starter Codes',
      value: (generatedCodes.filter(c => c.tier === 'starter').length + MOCK_HISTORY.filter(c => c.tier === 'starter').length).toString(),
      icon: Users,
      color: 'from-green-400 to-green-600',
    },
    {
      title: 'Full Codes',
      value: (generatedCodes.filter(c => c.tier === 'full').length + MOCK_HISTORY.filter(c => c.tier === 'full').length).toString(),
      icon: Shield,
      color: 'from-purple-400 to-purple-600',
    },
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Navbar />
        <div className="max-w-md mx-auto px-4 py-20">
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <div className="flex justify-center mb-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #2E5C8A, #1e40af)' }}
                >
                  <Shield className="w-7 h-7 text-white" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-slate-900">Admin Access</h1>
              <p className="text-slate-600">Enter the admin password to continue</p>
            </div>

            <Card className="border-slate-200 shadow-lg">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-900">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                      placeholder="Enter admin password"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <Button
                    onClick={handleAuth}
                    className="w-full text-white rounded-xl py-2.5 font-medium"
                    style={{ background: 'linear-gradient(135deg, #2E5C8A, #1e40af)' }}
                  >
                    Unlock Admin Panel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8 space-y-2">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
              style={{ background: 'linear-gradient(135deg, #2E5C8A, #1e40af)' }}
            >
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Access Code Manager</h1>
          </div>
          <p className="text-slate-600 ml-13">Generate and manage WorksheetWiz access codes</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            const colorMap: Record<string, string> = {
              'from-blue-400 to-blue-600': 'linear-gradient(135deg, #60a5fa, #2563eb)',
              'from-orange-400 to-orange-600': 'linear-gradient(135deg, #fb923c, #ea580c)',
              'from-green-400 to-green-600': 'linear-gradient(135deg, #4ade80, #22c55e)',
              'from-purple-400 to-purple-600': 'linear-gradient(135deg, #c084fc, #a855f7)',
            };
            return (
              <Card key={idx} className="border-slate-200 shadow-md hover-lift">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-slate-600 font-medium mb-1">{stat.title}</p>
                      <p className="text-3xl font-bold gradient-text">{stat.value}</p>
                    </div>
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                      style={{ background: colorMap[stat.color] }}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Generate Codes Section */}
        <Card className="border-slate-200 shadow-lg mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-blue-600" />
              Generate New Codes
            </CardTitle>
            <CardDescription>Create access codes for users to upgrade their tier</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Tier Selector */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-900">Select Tier</label>
                <div className="space-y-2">
                  {(['starter', 'full'] as const).map((tier) => (
                    <button
                      key={tier}
                      onClick={() => setSelectedTier(tier)}
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
                        selectedTier === tier
                          ? 'border-blue-500 bg-blue-50 text-blue-900'
                          : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300'
                      }`}
                    >
                      {tier === 'starter' ? 'Starter Tier' : 'Full Access Tier'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-900">Quantity</label>
                <div className="space-y-2">
                  {[10, 50, 100].map((qty) => (
                    <button
                      key={qty}
                      onClick={() => setSelectedQuantity(qty)}
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
                        selectedQuantity === qty
                          ? 'border-blue-500 bg-blue-50 text-blue-900'
                          : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300'
                      }`}
                    >
                      {qty} Codes
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <div className="flex flex-col justify-end">
                <Button
                  onClick={handleGenerateCodes}
                  disabled={isGenerating}
                  className="w-full text-white rounded-xl py-3 font-medium"
                  style={{ background: 'linear-gradient(135deg, #E8913A, #d97706)' }}
                >
                  {isGenerating ? 'Generating...' : 'Generate Codes'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Generated Codes */}
        {generatedCodes.length > 0 && (
          <Card className="border-slate-200 shadow-lg mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="w-5 h-5 text-green-600" />
                Generated Codes ({generatedCodes.length})
              </CardTitle>
              <CardDescription>Newly generated codes ready to distribute</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                {generatedCodes.map((codeItem) => (
                  <div
                    key={codeItem.id}
                    className="px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono font-bold text-slate-900 truncate">{codeItem.code}</p>
                      <Badge
                        variant="outline"
                        className={`text-xs mt-1 ${
                          codeItem.tier === 'starter'
                            ? 'border-green-200 text-green-700 bg-green-50'
                            : 'border-orange-200 text-orange-700 bg-orange-50'
                        }`}
                      >
                        {codeItem.tier === 'starter' ? 'Starter' : 'Full'}
                      </Badge>
                    </div>
                    <button
                      onClick={() => handleCopyCode(codeItem.code, codeItem.id)}
                      className="ml-2 p-2 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedId === codeItem.id ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Code History */}
        <Card className="border-slate-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Code History
            </CardTitle>
            <CardDescription>All generated codes and their usage status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 text-left font-semibold text-slate-900">Code</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-900">Tier</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-900">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-900">Used By</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-900">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {[...generatedCodes, ...MOCK_HISTORY]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((item) => (
                      <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <code className="font-mono font-bold text-slate-900">{item.code}</code>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              item.tier === 'starter'
                                ? 'border-green-200 text-green-700 bg-green-50'
                                : 'border-orange-200 text-orange-700 bg-orange-50'
                            }`}
                          >
                            {item.tier === 'starter' ? 'Starter' : 'Full'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              item.status === 'used'
                                ? 'border-blue-200 text-blue-700 bg-blue-50'
                                : 'border-green-200 text-green-700 bg-green-50'
                            }`}
                          >
                            {item.status === 'used' ? 'Used' : 'Available'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {item.usedBy ? (
                            <span className="text-xs">{item.usedBy}</span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{item.createdAt}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
