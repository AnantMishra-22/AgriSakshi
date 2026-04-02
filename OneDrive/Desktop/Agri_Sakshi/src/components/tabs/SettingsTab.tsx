// src/components/tabs/SettingsTab.tsx
// Persists settings to Supabase user_settings table when signed in.
// Falls back to localStorage when user is anonymous.

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Settings, Globe, Bell, MapPin, Thermometer,
  Smartphone, Database, HelpCircle, Loader2, CloudOff, Cloud,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/services/languageService';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppSettings {
  language: string;
  temperature_unit: string;
  price_unit: string;
  notifications_on: boolean;
  dark_mode: boolean;
  // local-only extras
  locationSharing: boolean;
  pincode: string;
}

const DEFAULTS: AppSettings = {
  language: 'en',
  temperature_unit: 'celsius',
  price_unit: 'quintal',
  notifications_on: true,
  dark_mode: false,
  locationSharing: true,
  pincode: '',
};

const LS_KEY = 'agrisakshi_settings';

// ─── Component ────────────────────────────────────────────────────────────────

export const SettingsTab = () => {
  const { changeLanguage, t } = useLanguage();
  const { toast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Auth listener ────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      loadSettings(data.session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      loadSettings(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Load: Supabase first, fallback to localStorage ───────────────────────

  const loadSettings = async (currentUser: User | null) => {
    setLoading(true);
    try {
      // Always load local extras first
      const local = localStorage.getItem(LS_KEY);
      const localParsed = local ? JSON.parse(local) : {};

      if (currentUser) {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', currentUser.id)
          .single();

        if (!error && data) {
          setSettings({
            language: data.language ?? DEFAULTS.language,
            temperature_unit: data.temperature_unit ?? DEFAULTS.temperature_unit,
            price_unit: data.price_unit ?? DEFAULTS.price_unit,
            notifications_on: data.notifications_on ?? DEFAULTS.notifications_on,
            dark_mode: data.dark_mode ?? DEFAULTS.dark_mode,
            locationSharing: localParsed.locationSharing ?? DEFAULTS.locationSharing,
            pincode: localParsed.pincode ?? DEFAULTS.pincode,
          });
          return;
        }
      }

      // Fallback: use localStorage entirely
      setSettings({ ...DEFAULTS, ...localParsed });
    } catch (err) {
      console.error('Failed to load settings:', err);
      setSettings(DEFAULTS);
    } finally {
      setLoading(false);
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Apply language change immediately
      changeLanguage(settings.language as any);

      // Always persist local-only extras
      const local = {
        language: settings.language,
        temperature_unit: settings.temperature_unit,
        locationSharing: settings.locationSharing,
        pincode: settings.pincode,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(LS_KEY, JSON.stringify(local));

      // Persist rest to Supabase if signed in
      if (user) {
        const { error } = await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            language: settings.language,
            temperature_unit: settings.temperature_unit,
            price_unit: settings.price_unit,
            notifications_on: settings.notifications_on,
            dark_mode: settings.dark_mode,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        if (error) throw error;
      }

      toast({
        title: t('success'),
        description: user ? 'Settings saved to cloud ☁️' : 'Settings saved locally 📱',
      });
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const clearData = async () => {
    localStorage.clear();
    if (user) await supabase.auth.signOut();
    toast({ title: 'Data cleared', description: 'All app data has been cleared.' });
    setSettings(DEFAULTS);
  };

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    setSettings(prev => ({ ...prev, [key]: value }));

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-20">

      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold flex items-center justify-center">
          <Settings className="w-6 h-6 mr-2 text-primary" />
          {t('settings')}
        </h2>
        <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
          {user
            ? <><Cloud className="w-3 h-3 text-green-500" /> Syncing to cloud</>
            : <><CloudOff className="w-3 h-3" /> Local only — sign in to sync</>}
        </div>
      </div>

      {/* Language & Region */}
      <Card className="p-4 shadow-soft">
        <h3 className="font-semibold mb-4 flex items-center">
          <Globe className="w-5 h-5 mr-2 text-info" />
          Language & Region
        </h3>
        <div className="space-y-4">
          <div>
            <Label>{t('language')}</Label>
            <Select value={settings.language} onValueChange={v => set('language', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[
                  { code: 'en', name: 'English', native: 'English' },
                  { code: 'hi', name: 'Hindi', native: 'हिंदी' },
                  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
                  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
                  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
                  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
                  { code: 'gu', name: 'Gujarati', native: 'ગુજरাती' },
                  { code: 'mr', name: 'Marathi', native: 'मराठी' },
                  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
                  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
                ].map(lang => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name} ({lang.native})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Temperature Unit</Label>
            <Select value={settings.temperature_unit} onValueChange={v => set('temperature_unit', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="celsius">Celsius (°C)</SelectItem>
                <SelectItem value="fahrenheit">Fahrenheit (°F)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Price Unit</Label>
            <Select value={settings.price_unit} onValueChange={v => set('price_unit', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="quintal">Per Quintal (₹/q)</SelectItem>
                <SelectItem value="kg">Per Kg (₹/kg)</SelectItem>
                <SelectItem value="tonne">Per Tonne (₹/t)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Location */}
      <Card className="p-4 shadow-soft">
        <h3 className="font-semibold mb-4 flex items-center">
          <MapPin className="w-5 h-5 mr-2 text-warning" />
          Location Settings
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-detect Location</Label>
              <p className="text-sm text-muted-foreground">Use GPS for weather and soil data</p>
            </div>
            <Switch
              checked={settings.locationSharing}
              onCheckedChange={v => set('locationSharing', v)}
            />
          </div>
          <div>
            <Label>Backup PIN Code</Label>
            <Input
              type="text"
              placeholder="Enter your area PIN code"
              value={settings.pincode}
              onChange={e => set('pincode', e.target.value)}
              maxLength={6}
            />
            <p className="text-xs text-muted-foreground mt-1">Used when GPS is unavailable</p>
          </div>
        </div>
      </Card>

      {/* Notifications */}
      <Card className="p-4 shadow-soft">
        <h3 className="font-semibold mb-4 flex items-center">
          <Bell className="w-5 h-5 mr-2 text-accent" />
          Notifications
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Weather Alerts</Label>
              <p className="text-sm text-muted-foreground">Warnings and advisories</p>
            </div>
            <Switch
              checked={settings.notifications_on}
              onCheckedChange={v => set('notifications_on', v)}
            />
          </div>
        </div>
      </Card>

      {/* Data & Privacy */}
      <Card className="p-4 shadow-soft">
        <h3 className="font-semibold mb-4 flex items-center">
          <Database className="w-5 h-5 mr-2 text-destructive" />
          Data & Privacy
        </h3>
        <div className="space-y-4">
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-sm">
              {user
                ? 'Your settings are encrypted and stored in Supabase. They sync across all your devices.'
                : 'Settings are stored locally. Sign in to sync across devices.'}
            </p>
          </div>
          <Button variant="outline" onClick={clearData} className="w-full text-destructive">
            Clear All Data & Sign Out
          </Button>
        </div>
      </Card>

      {/* App Info */}
      <Card className="p-4 shadow-soft">
        <h3 className="font-semibold mb-4 flex items-center">
          <Smartphone className="w-5 h-5 mr-2 text-info" />
          App Information
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Version:</span>
            <span>1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Session:</span>
            <span>{user ? '🔐 Signed in' : '👤 Anonymous'}</span>
          </div>
        </div>
      </Card>

      {/* Save */}
      <Button onClick={saveSettings} className="w-full" disabled={saving}>
        {saving
          ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          : null}
        {t('save')} {t('settings')}
      </Button>

      <div className="text-center pt-2">
        <p className="text-xs text-muted-foreground">AgriSakshi — Made with ❤️ for farmers</p>
      </div>
    </div>
  );
};
