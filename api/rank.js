export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const API_KEY = process.env.RIOT_API_KEY;
  const GAME_NAME = process.env.RIOT_GAME_NAME;
  const TAGLINE = process.env.RIOT_TAGLINE;
  const REGION = process.env.RIOT_REGION || "europe";
  const PLATFORM = process.env.RIOT_PLATFORM || "euw1";
  const DAY_START_LP = Number(process.env.RIOT_DAY_START_LP || 0);

  try {
    const accountRes = await fetch(
      `https://${REGION}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(GAME_NAME)}/${encodeURIComponent(TAGLINE)}`,
      { headers: { "X-Riot-Token": API_KEY } }
    );
    const account = await accountRes.json();

    const leagueRes = await fetch(
      `https://${PLATFORM}.api.riotgames.com/lol/league/v4/entries/by-puuid/${account.puuid}`,
      { headers: { "X-Riot-Token": API_KEY } }
    );
    const leagues = await leagueRes.json();
    const soloq = leagues.find(q => q.queueType === "RANKED_SOLO_5x5");

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0,0,0,0);

    const matchIdsRes = await fetch(
      `https://${REGION}.api.riotgames.com/lol/match/v5/matches/by-puuid/${account.puuid}/ids?queue=420&startTime=${Math.floor(startOfDay.getTime()/1000)}&count=10`,
      { headers: { "X-Riot-Token": API_KEY } }
    );
    const matchIds = await matchIdsRes.json();

    let last5 = [];
    let todayWins = 0;
    let todayLosses = 0;

    for (let id of matchIds.slice(0,5)) {
      const matchRes = await fetch(
        `https://${REGION}.api.riotgames.com/lol/match/v5/matches/${id}`,
        { headers: { "X-Riot-Token": API_KEY } }
      );
      const match = await matchRes.json();
      const player = match.info.participants.find(p => p.puuid === account.puuid);
      if (!player) continue;

      if (player.win) todayWins++;
      else todayLosses++;

      last5.push({
        champion: player.championName,
        win: player.win,
        icon: `https://ddragon.leagueoflegends.com/cdn/15.1.1/img/champion/${player.championName}.png`
      });
    }

    if (!soloq) {
      return res.status(200).json({
        tier:"UNRANKED",
        rank:"",
        lp:0,
        dailyLp:0,
        todayWL:`${todayWins}W / ${todayLosses}L`,
        last5
      });
    }

    const dailyLp = soloq.leaguePoints - DAY_START_LP;

    return res.status(200).json({
      tier: soloq.tier,
      rank: soloq.rank,
      lp: soloq.leaguePoints,
      dailyLp,
      todayWL:`${todayWins}W / ${todayLosses}L`,
      last5
    });

  } catch (e) {
    return res.status(200).json({ error: e.message });
  }
}
