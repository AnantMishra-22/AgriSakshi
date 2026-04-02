// src/components/tabs/ProfileTab.tsx
// Connected to Supabase auth + user_profiles table.
// Falls back gracefully when user is not signed in (anonymous mode).

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { User, MapPin, Tractor, Sprout, LogIn, LogOut, Loader2, CheckCircle } from 'lucide-react';
import { LanguageService } from '@/services/languageService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileForm {
  full_name: string;
  phone: string;
  district: string;
  state: string;
  farm_size_acres: string;
  primary_crops: string[];
  language_pref: string;
}

const EMPTY_FORM: ProfileForm = {
  full_name: '',
  phone: '',
  district: '',
  state: 'Telangana',
  farm_size_acres: '',
  primary_crops: [],
  language_pref: 'en',
};

const INDIAN_STATES = [
  'Andhra Pradesh', 'Telangana', 'Karnataka', 'Tamil Nadu', 'Kerala',
  'Maharashtra', 'Gujarat', 'Rajasthan', 'Madhya Pradesh', 'Uttar Pradesh',
  'Punjab', 'Haryana', 'Bihar', 'West Bengal', 'Odisha', 'Assam', 'Other',
];

const CROP_OPTIONS = [
  'Rice', 'Wheat', 'Maize', 'Cotton', 'Sugarcane',
  'Groundnut', 'Soybean', 'Sunflower', 'Jowar', 'Bajra',
  'Tomato', 'Chilli', 'Onion', 'Potato', 'Turmeric',
];

// ─── Component ────────────────────────────────────────────────────────────────

export const ProfileTab = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Auth UI state
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const { toast } = useToast();
  const t = (key: string) => LanguageService.getTranslation(key);

  // ── Auth listener ──────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      if (data.session?.user) loadProfile(data.session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else { setForm(EMPTY_FORM); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Load profile from Supabase ─────────────────────────────────────────────

  const loadProfile = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found, that's fine

      if (data) {
        setForm({
          full_name: data.full_name ?? '',
          phone: data.phone ?? '',
          district: data.district ?? '',
          state: data.state ?? 'Telangana',
          farm_size_acres: data.farm_size_acres?.toString() ?? '',
          primary_crops: data.primary_crops ?? [],
          language_pref: data.language_pref ?? 'en',
        });
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Save profile to Supabase ───────────────────────────────────────────────

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        id: user.id,
        full_name: form.full_name || null,
        phone: form.phone || null,
        district: form.district || null,
        state: form.state || null,
        farm_size_acres: form.farm_size_acres ? parseFloat(form.farm_size_acres) : null,
        primary_crops: form.primary_crops.length ? form.primary_crops : null,
        language_pref: form.language_pref,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('user_profiles')
        .upsert(payload, { onConflict: 'id' });

      if (error) throw error;

      setIsEditing(false);
      toast({ title: '✅ Profile saved', description: 'Your profile has been updated.' });
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ── Auth handlers ──────────────────────────────────────────────────────────

  const handleAuth = async () => {
    if (!authEmail || !authPassword) return;
    setAuthLoading(true);
    try {
      const { error } =
        authMode === 'signup'
          ? await supabase.auth.signUp({ email: authEmail, password: authPassword })
          : await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });

      if (error) throw error;

      if (authMode === 'signup') {
        toast({ title: 'Check your email', description: 'Confirm your account to continue.' });
      }
      setAuthEmail('');
      setAuthPassword('');
    } catch (err: any) {
      toast({ title: 'Auth failed', description: err.message, variant: 'destructive' });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setForm(EMPTY_FORM);
    toast({ title: 'Signed out', description: 'You have been signed out.' });
  };

  const toggleCrop = (crop: string) => {
    setForm(prev => ({
      ...prev,
      primary_crops: prev.primary_crops.includes(crop)
        ? prev.primary_crops.filter(c => c !== crop)
        : [...prev.primary_crops, crop],
    }));
  };

  // ── Render: not signed in ──────────────────────────────────────────────────

  if (!user) {
    return (
      <div className="p-4 space-y-6 pb-20 min-h-screen bg-cover bg-center bg-fixed"
        style={{ backgroundImage: `url('/src/components/images/op.jpg')` }}>
        <div className="p-4 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
              <User className="w-6 h-6 text-primary" />
              {t('farmerProfile')}
            </h1>
            <p className="text-muted-foreground">Sign in to save and sync your profile</p>
          </div>

          <Card className="p-6 space-y-4">
            <div className="flex gap-2 mb-2">
              <Button
                variant={authMode === 'login' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setAuthMode('login')}
              >
                Sign In
              </Button>
              <Button
                variant={authMode === 'signup' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setAuthMode('signup')}
              >
                Sign Up
              </Button>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={authEmail}
                onChange={e => setAuthEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAuth()}
              />
            </div>

            <Button onClick={handleAuth} className="w-full" disabled={authLoading}>
              {authLoading
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                : <LogIn className="w-4 h-4 mr-2" />}
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </Card>

          <Card className="p-4 bg-muted/30">
            <p className="text-sm text-muted-foreground text-center">
              Your profile is stored securely in Supabase and synced across all your devices.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  // ── Render: loading ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Render: signed-in profile form ────────────────────────────────────────

  return (
    <div
      className="p-4 space-y-6 pb-20 min-h-screen bg-cover bg-center bg-fixed"
      style={{ backgroundImage: `url('/src/components/images/op.jpg')` }}
    >
      <div className="p-4 space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
            <User className="w-6 h-6 text-primary" />
            {t('farmerProfile')}
          </h1>
          <div className="flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-1" /> Sign Out
            </Button>
          </div>
        </div>

        {/* Personal Details */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center">
              <User className="w-5 h-5 mr-2 text-primary" />
              {t('personalDetails')}
            </h3>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">Edit</Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label>{t('name')}</Label>
              <Input
                value={form.full_name}
                onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                disabled={!isEditing}
                placeholder="Your full name"
              />
            </div>
            <div>
              <Label>{t('phoneNumber')}</Label>
              <Input
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                disabled={!isEditing}
                placeholder="+91 XXXXX XXXXX"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>District</Label>
                <Input
                  value={form.district}
                  onChange={e => setForm(p => ({ ...p, district: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="e.g. Warangal"
                />
              </div>
              <div>
                <Label>State</Label>
                <Select
                  value={form.state}
                  onValueChange={v => setForm(p => ({ ...p, state: v }))}
                  disabled={!isEditing}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Preferred Language</Label>
              <Select
                value={form.language_pref}
                onValueChange={v => setForm(p => ({ ...p, language_pref: v }))}
                disabled={!isEditing}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="te">Telugu (తెలుగు)</SelectItem>
                  <SelectItem value="hi">Hindi (हिंदी)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Farm Details */}
        <Card className="p-4">
          <h3 className="font-semibold flex items-center mb-4">
            <Tractor className="w-5 h-5 mr-2 text-success" />
            {t('farmDetails')}
          </h3>

          <div className="space-y-4">
            <div>
              <Label>{t('farmSize')} (acres)</Label>
              <Input
                type="number"
                value={form.farm_size_acres}
                onChange={e => setForm(p => ({ ...p, farm_size_acres: e.target.value }))}
                disabled={!isEditing}
                placeholder="e.g. 5.5"
              />
            </div>

            <div>
              <Label>Primary Crops</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {CROP_OPTIONS.map(crop => (
                  <Badge
                    key={crop}
                    variant={form.primary_crops.includes(crop) ? 'default' : 'outline'}
                    className={`cursor-pointer transition-colors ${!isEditing ? 'opacity-60 pointer-events-none' : ''}`}
                    onClick={() => isEditing && toggleCrop(crop)}
                  >
                    {crop}
                  </Badge>
                ))}
              </div>
              {form.primary_crops.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">Tap crops to select</p>
              )}
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        {isEditing && (
          <div className="flex gap-2">
            <Button onClick={saveProfile} className="flex-1" disabled={saving}>
              {saving
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                : <Sprout className="w-4 h-4 mr-2" />}
              {t('save')} Profile
            </Button>
            <Button
              onClick={() => { setIsEditing(false); loadProfile(user.id); }}
              variant="outline"
              disabled={saving}
            >
              {t('cancel')}
            </Button>
          </div>
        )}

        {/* Sync indicator */}
        <Card className="p-3 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle className="w-4 h-4" />
            Profile synced to Supabase — available on all your devices
          </div>
        </Card>

      </div>
    </div>
  );
};
