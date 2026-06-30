export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const API_KEY = process.env.RIOT_API_KEY;
  const GAME_NAME = process.env.RIOT_GAME_NAME;
  const TAGLINE = process.env.RIOT_TAGLINE;
  const REGION = process.env.RIOT_REGION || "europe";
  const PLATFORM = process.env.RIOT_PLATFORM || "euw1";

  try {
    if (!API_KEY) throw new Error("RIOT_API_KEY fehlt");
    if (!GAME_NAME) throw new Error("RIOT_GAME_NAME fehlt");
    if (!TAGLINE) throw new Error("RIOT_TAGLINE fehlt");

    const accountUrl = `https://${REGION}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(GAME_NAME)}/${encodeURIComponent(TAGLINE)}`;

    const accountRes = await fetch(accountUrl, {
      headers: { "X-Riot-Token": API_KEY }
    });

    const account = await accountRes.json();

    if (!accountRes.ok) {
      return res.status(200).json({
        step: "account",
        status: accountRes.status,
        message: account
      });
    }

    const leagueUrl = `https://${PLATFORM}.api.riotgames.com/lol/league/v4/entries/by-puuid/${account.puuid}`;

    const leagueRes = await fetch(leagueUrl, {
      headers: { "X-Riot-Token": API_KEY }
    });

    const leagues = await leagueRes.json();

    if (!leagueRes.ok) {
      return res.status(200).json({
        step: "league",
        status: leagueRes.status,
        message: leagues
      });
    }

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

    return res.status(200).json({
      tier: soloq.tier,
      rank: soloq.rank,
      lp: soloq.leaguePoints,
      wins,
      losses,
      winrate
    });

  } catch (error) {
    return res.status(200).json({
      error: error.message
    });
  }
}
