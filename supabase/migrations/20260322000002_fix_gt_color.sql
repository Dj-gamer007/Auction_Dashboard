-- Fix Gujarat Titans color to a bright visible blue/teal that works in both dark and light mode
UPDATE public.teams SET color = '#0EA5E9' WHERE short_name = 'GT';
