import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listTrades from "./tools/list-trades";
import getTradeStats from "./tools/get-trade-stats";
import updateTradeNotes from "./tools/update-trade-notes";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "trade-journal-pro",
  title: "Trade Journal Pro",
  version: "0.1.0",
  instructions:
    "Trading journal for the signed-in user. List trades, get performance stats, and annotate trades (asset type, direction, entry/exit reasons, notes). Note: on synthetic indices, 'X500'/'X1000' in the instrument is leverage; the real asset is in tipo_activo (Boom = upward spikes, Crash = downward spikes).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listTrades, getTradeStats, updateTradeNotes],
});
