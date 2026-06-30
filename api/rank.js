export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const API_KEY = process.env.RIOT_API_KEY;
  const GAME_NAME = process.env.RIOT_GAME_NAME;
  const TAGLINE = process.env.RIOT_TAGLINE;
  const REGION = process.env.RIOT_REGION || "europe";
  const PLATFORM = process.env.RIOT_PLATFORM || "euw1";

  try {
    const accountRes = await fetch(
      `https://${REGION}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(GAME_NAME)}/${encodeURIComponent(TAGLINE)}`,
      { headers: { "X-Riot-Token": API_KEY } }
    );

    const account = await accountRes.json();

    const summonerRes = await fetch(
      `https://${PLATFORM}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${account.puuid}`,
      { headers: { "X-Riot-Token": API_KEY } }
    );

    const summoner = await summonerRes.json();

    const leagueRes = await fetch(
      `https://${PLATFORM}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summoner.id}`,
      { headers: { "X-Riot-Token": API_KEY } }
    );

    const leagues = await leagueRes.json();

    const soloq = leagues.find(q => q.queueType === "RANKED_SOLO_5x5");

    if (!soloq) {
      return res.status(200).json({
        tier: "UNRANKED",
        rank: "",
        lp: 0,
        wins: 0,
        losses: 0,
        winrate: 0
      });
    }

    const wins = soloq.wins;
    const losses = soloq.losses;
    const winrate = Math.round((wins / (wins + losses)) * 100);

    res.status(200).json({
      tier: soloq.tier,
      rank: soloq.rank,
      lp: soloq.leaguePoints,
      wins,
      losses,
      winrate
    });

  } catch (error) {
    res.status(500).json({ error: "Rank konnte nicht geladen werden." });
  }
}
