ALTER TABLE public.teams ADD COLUMN logo_url text;

UPDATE public.teams SET logo_url = CASE short_name
  WHEN 'CSK' THEN 'https://documents.iplt20.com/ipl/CSK/Logos/Roundbig/CSKroundbig.png'
  WHEN 'DC' THEN 'https://documents.iplt20.com/ipl/DC/Logos/Roundbig/DCroundbig.png'
  WHEN 'GT' THEN 'https://documents.iplt20.com/ipl/GT/Logos/Roundbig/GTroundbig.png'
  WHEN 'KKR' THEN 'https://documents.iplt20.com/ipl/KKR/Logos/Roundbig/KKRroundbig.png'
  WHEN 'LSG' THEN 'https://documents.iplt20.com/ipl/LSG/Logos/Roundbig/LSgroundbig.png'
  WHEN 'MI' THEN 'https://documents.iplt20.com/ipl/MI/Logos/Roundbig/MIroundbig.png'
  WHEN 'PBKS' THEN 'https://documents.iplt20.com/ipl/PBKS/Logos/Roundbig/PBKSroundbig.png'
  WHEN 'RCB' THEN 'https://documents.iplt20.com/ipl/RCB/Logos/Roundbig/RCBroundbig.png'
  WHEN 'RR' THEN 'https://documents.iplt20.com/ipl/RR/Logos/Roundbig/RRroundbig.png'
  WHEN 'SRH' THEN 'https://documents.iplt20.com/ipl/SRH/Logos/Roundbig/SRHroundbig.png'
END;