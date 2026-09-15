import { Constants, RiotApi, TftApi, LolApi } from "twisted";

// Twisted exposes its constants and DTO classes only as runtime values
// through `Constants` and `Dto`, but TypeScript cannot resolve types
// through `Constants.AccountAPIRegionGroups` or `Dto.AccountDto` because
// the upstream .d.ts uses a pattern where `declare const X: typeof ns`
// hides the inner types from the `typeof` view of `X`.
//
// Workaround: derive every type we need from the public method
// signatures (ReturnType / Parameters) and from the enum consts
// (`typeof X.Y[keyof typeof X.Y]`). This file is the single source of
// truth for twisted types in the project; everything else imports from
// here.

// --- Region / cluster enums -----------------------------------------

export type RegionGroup = typeof Constants.RegionGroups[keyof typeof Constants.RegionGroups];
export type AccountCluster = ReturnType<typeof Constants.regionToRegionGroupForAccountAPI>;
export type Region = typeof Constants.Regions[keyof typeof Constants.Regions];

// --- DTOs (League V5) -----------------------------------------------

const _leagueApi = new LolApi({ key: "x" });
const _accountLeague = new RiotApi({ key: "x" });

export type AccountDto = Awaited<ReturnType<typeof _accountLeague.Account.getByRiotId>>["response"];
export type MatchV5MatchDto = Awaited<ReturnType<typeof _leagueApi.MatchV5.get>>["response"];
export type SummonerLeagueDto = Awaited<ReturnType<typeof _leagueApi.League.byPUUID>>["response"][number];
export type MatchQueryV5Query = Parameters<typeof _leagueApi.MatchV5.list>[2];

// MatchV5DTOs.MatchDto.info.participants is the V5 League participant.
// We can't access MatchV5DTOs directly through `Dto`, so we walk through
// the MatchDto shape to grab the ParticipantDto type.
export type V5ParticipantDto = MatchV5MatchDto["info"]["participants"][number];

// --- DTOs (TFT) -----------------------------------------------------

const _tftApi = new TftApi({ key: "x" });
const _accountTft = new RiotApi({ key: "x" });

export type MatchTFTDto = Awaited<ReturnType<typeof _tftApi.Match.get>>["response"];
export type TFTParticipantDto = MatchTFTDto["info"]["participants"][number];
export type TFTTraitDto = TFTParticipantDto["traits"][number];
export type TFTUnitDto = TFTParticipantDto["units"][number];
export type TFTLeagueEntryDto = Awaited<ReturnType<typeof _tftApi.League.getByPUUID>>["response"][number];
export type TFTAccountDto = Awaited<ReturnType<typeof _accountTft.Account.getByRiotId>>["response"];
