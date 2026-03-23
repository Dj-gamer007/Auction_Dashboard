import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type AuctionPlayer = Database['public']['Tables']['auction_players']['Row'];

interface Props {
  player: AuctionPlayer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export function EditPlayerModal({ player, open, onOpenChange, onUpdated }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    player_name: '',
    country: '',
    age: '',
    role: '',
    batting_style: '',
    bowling_style: '',
    base_price: '',
    set_number: '',
    set_name: '',
    ipl_caps: '',
    is_capped: false,
  });

  useEffect(() => {
    if (open && player) {
      setForm({
        player_name: player.player_name,
        country: player.country || 'India',
        age: player.age != null ? String(player.age) : '',
        role: player.role || '',
        batting_style: player.batting_style || '',
        bowling_style: player.bowling_style || '',
        base_price: String(player.base_price),
        set_number: player.set_number != null ? String(player.set_number) : '',
        set_name: player.set_name || '',
        ipl_caps: player.ipl_caps != null ? String(player.ipl_caps) : '',
        is_capped: player.is_capped ?? false,
      });
      setImagePreview(player.image_url || null);
      setImageFile(null);
    }
  }, [open, player]);

  const update = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Image must be under 5MB', variant: 'destructive' });
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadImage = async (playerName: string): Promise<string | null> => {
    if (!imageFile) return null;
    const ext = imageFile.name.split('.').pop() || 'jpg';
    const path = `${Date.now()}-${playerName.replace(/\s+/g, '_')}.${ext}`;
    const { error } = await supabase.storage.from('player-images').upload(path, imageFile);
    if (error) {
      console.error('Upload error:', error);
      return null;
    }
    const { data } = supabase.storage.from('player-images').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!form.player_name.trim()) {
      toast({ title: 'Player name is required', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      let imageUrl: string | null | undefined = undefined;
      if (imageFile) {
        imageUrl = await uploadImage(form.player_name.trim());
      } else if (!imagePreview) {
        imageUrl = null; // cleared
      }

      const payload: Record<string, any> = {
        player_name: form.player_name.trim(),
        country: form.country || 'India',
        age: form.age ? parseInt(form.age) : null,
        role: form.role || null,
        batting_style: form.batting_style || null,
        bowling_style: form.bowling_style || null,
        base_price: parseInt(form.base_price) || player.base_price,
        set_number: form.set_number ? parseInt(form.set_number) : null,
        set_name: form.set_name || null,
        ipl_caps: form.ipl_caps ? parseInt(form.ipl_caps) : 0,
        is_capped: form.is_capped,
      };
      if (imageUrl !== undefined) payload.image_url = imageUrl;

      const { error } = await supabase.from('auction_players').update(payload).eq('id', player.id);
      if (error) {
        toast({ title: 'Failed to update', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: `✅ ${form.player_name} updated` });
      onOpenChange(false);
      onUpdated();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Edit Player</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {/* Photo */}
          <div>
            <label className="text-xs text-muted-foreground">Player Photo</label>
            <div className="mt-1">
              {imagePreview ? (
                <div className="relative w-24 h-24">
                  <img src={imagePreview} alt="Preview" className="w-24 h-24 rounded-lg object-cover border border-border" />
                  <button type="button" onClick={clearImage} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-24 h-24 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors">
                  <Upload className="w-5 h-5" />
                  <span className="text-[10px]">Upload</span>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Player Name *</label>
            <Input value={form.player_name} onChange={e => update('player_name', e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Country</label>
              <Input value={form.country} onChange={e => update('country', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Age</label>
              <Input type="number" value={form.age} onChange={e => update('age', e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Role</label>
              <Select value={form.role} onValueChange={v => update('role', v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Batsman">Batsman</SelectItem>
                  <SelectItem value="Wicketkeeper-Batter">Wicketkeeper-Batter</SelectItem>
                  <SelectItem value="All-Rounder">All-Rounder</SelectItem>
                  <SelectItem value="Fast Bowler">Fast Bowler</SelectItem>
                  <SelectItem value="Spin Bowler">Spin Bowler</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Base Price (₹ Lakh)</label>
              <Input type="number" value={form.base_price} onChange={e => update('base_price', e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Batting Style</label>
              <Input value={form.batting_style} onChange={e => update('batting_style', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Bowling Style</label>
              <Input value={form.bowling_style} onChange={e => update('bowling_style', e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Set Number</label>
              <Input type="number" value={form.set_number} onChange={e => update('set_number', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Set Name</label>
              <Input value={form.set_name} onChange={e => update('set_name', e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">IPL Caps</label>
              <Input type="number" value={form.ipl_caps} onChange={e => update('ipl_caps', e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Switch checked={form.is_capped} onCheckedChange={v => update('is_capped', v)} />
              <label className="text-xs text-muted-foreground">Capped Player</label>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSubmit} className="flex-1" disabled={loading}>
              {loading && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              Save Changes
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
