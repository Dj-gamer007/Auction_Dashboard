-- Create teams table
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_name text NOT NULL UNIQUE,
  color text NOT NULL,
  total_budget numeric NOT NULL DEFAULT 120,
  spent_budget numeric NOT NULL DEFAULT 0,
  player_slots int NOT NULL DEFAULT 25,
  overseas_slots int NOT NULL DEFAULT 8,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teams are viewable by everyone" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Teams can be updated by anyone" ON public.teams FOR UPDATE USING (true);

-- Create retained_players table
CREATE TABLE public.retained_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  player_name text NOT NULL,
  role text,
  nationality text DEFAULT 'India',
  retention_price numeric DEFAULT 0
);

ALTER TABLE public.retained_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Retained players viewable by everyone" ON public.retained_players FOR SELECT USING (true);

-- Create auction_players table
CREATE TABLE public.auction_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_number int,
  set_name text,
  player_name text NOT NULL,
  country text DEFAULT 'India',
  age int,
  role text,
  batting_style text,
  bowling_style text,
  base_price numeric NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold', 'unsold', 'current')),
  sold_to_team uuid REFERENCES public.teams(id),
  sold_price numeric,
  ipl_caps int DEFAULT 0,
  is_capped boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.auction_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auction players viewable by everyone" ON public.auction_players FOR SELECT USING (true);
CREATE POLICY "Auction players can be updated by anyone" ON public.auction_players FOR UPDATE USING (true);

-- Create auction_log table
CREATE TABLE public.auction_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES public.auction_players(id),
  team_id uuid REFERENCES public.teams(id),
  player_name text NOT NULL,
  team_name text,
  sold_price numeric,
  action text NOT NULL CHECK (action IN ('sold', 'unsold', 'rtm_used')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.auction_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auction log viewable by everyone" ON public.auction_log FOR SELECT USING (true);
CREATE POLICY "Auction log can be inserted by anyone" ON public.auction_log FOR INSERT WITH CHECK (true);
CREATE POLICY "Auction log can be deleted by anyone" ON public.auction_log FOR DELETE USING (true);

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.retained_players;

-- Seed teams
INSERT INTO public.teams (name, short_name, color, total_budget, spent_budget) VALUES
  ('Chennai Super Kings', 'CSK', '#F5A623', 120, 0),
  ('Delhi Capitals', 'DC', '#004C93', 120, 0),
  ('Gujarat Titans', 'GT', '#1C4B9C', 120, 0),
  ('Kolkata Knight Riders', 'KKR', '#3A1F6D', 120, 0),
  ('Lucknow Super Giants', 'LSG', '#A72056', 120, 0),
  ('Mumbai Indians', 'MI', '#004BA0', 120, 0),
  ('Punjab Kings', 'PBKS', '#ED1C24', 120, 0),
  ('Rajasthan Royals', 'RR', '#EA1A85', 120, 0),
  ('Royal Challengers Bengaluru', 'RCB', '#9B1C1C', 120, 0),
  ('Sunrisers Hyderabad', 'SRH', '#F7941D', 120, 0);

-- Seed retained players
INSERT INTO public.retained_players (team_id, player_name, role, nationality) VALUES
  ((SELECT id FROM public.teams WHERE short_name = 'MI'), 'Jasprit Bumrah', 'BOWLER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'MI'), 'Suryakumar Yadav', 'BATTER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'MI'), 'Hardik Pandya', 'ALL-ROUNDER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'MI'), 'Rohit Sharma', 'BATTER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'MI'), 'Tilak Varma', 'BATTER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'CSK'), 'Ruturaj Gaikwad', 'BATTER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'CSK'), 'Matheesha Pathirana', 'BOWLER', 'Sri Lanka'),
  ((SELECT id FROM public.teams WHERE short_name = 'CSK'), 'Shivam Dube', 'ALL-ROUNDER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'CSK'), 'Ravindra Jadeja', 'ALL-ROUNDER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'CSK'), 'MS Dhoni', 'WICKETKEEPER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'GT'), 'Rashid Khan', 'BOWLER', 'Afghanistan'),
  ((SELECT id FROM public.teams WHERE short_name = 'GT'), 'Shubman Gill', 'BATTER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'GT'), 'Sai Sudarshan', 'BATTER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'GT'), 'Rahul Tewatia', 'ALL-ROUNDER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'GT'), 'Shahrukh Khan', 'BATTER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'LSG'), 'Nicholas Pooran', 'WICKETKEEPER', 'West Indies'),
  ((SELECT id FROM public.teams WHERE short_name = 'LSG'), 'Ravi Bishnoi', 'BOWLER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'LSG'), 'Mayank Yadav', 'BOWLER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'LSG'), 'Mohsin Khan', 'BOWLER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'LSG'), 'Ayush Badoni', 'ALL-ROUNDER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'SRH'), 'Pat Cummins', 'BOWLER', 'Australia'),
  ((SELECT id FROM public.teams WHERE short_name = 'SRH'), 'Nitish Kumar Reddy', 'ALL-ROUNDER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'SRH'), 'Heinrich Klaasen', 'WICKETKEEPER', 'South Africa'),
  ((SELECT id FROM public.teams WHERE short_name = 'SRH'), 'Travis Head', 'BATTER', 'Australia'),
  ((SELECT id FROM public.teams WHERE short_name = 'SRH'), 'Abhishek Sharma', 'ALL-ROUNDER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'KKR'), 'Andre Russell', 'ALL-ROUNDER', 'West Indies'),
  ((SELECT id FROM public.teams WHERE short_name = 'KKR'), 'Sunil Narine', 'ALL-ROUNDER', 'West Indies'),
  ((SELECT id FROM public.teams WHERE short_name = 'KKR'), 'Rinku Singh', 'BATTER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'KKR'), 'Varun Chakaravarthy', 'BOWLER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'KKR'), 'Harshit Rana', 'BOWLER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'KKR'), 'Ramandeep Singh', 'ALL-ROUNDER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'RCB'), 'Virat Kohli', 'BATTER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'RCB'), 'Rajat Patidar', 'BATTER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'RCB'), 'Yash Dayal', 'BOWLER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'DC'), 'Axar Patel', 'ALL-ROUNDER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'DC'), 'Kuldeep Yadav', 'BOWLER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'DC'), 'Tristan Stubbs', 'BATTER', 'South Africa'),
  ((SELECT id FROM public.teams WHERE short_name = 'DC'), 'Abhishek Porel', 'WICKETKEEPER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'RR'), 'Sanju Samson', 'WICKETKEEPER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'RR'), 'Yashasvi Jaiswal', 'BATTER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'RR'), 'Riyan Parag', 'ALL-ROUNDER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'RR'), 'Dhruv Jurel', 'WICKETKEEPER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'RR'), 'Shimron Hetmyer', 'BATTER', 'West Indies'),
  ((SELECT id FROM public.teams WHERE short_name = 'RR'), 'Sandeep Sharma', 'BOWLER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'PBKS'), 'Prabhsimran Singh', 'WICKETKEEPER', 'India'),
  ((SELECT id FROM public.teams WHERE short_name = 'PBKS'), 'Shashank Singh', 'ALL-ROUNDER', 'India');