"use client";

import { useEffect, useState } from "react";
import { useHub } from "../lib/useHub";

type Row = { name: string; ticker: string; price: number; changePct: number };
type Tape = {
  equities: Row[];
  crypto: Row[];
  commodities: Row[];
  hasKey?: boolean;
  updatedAt?: number;
};

function fmtPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function Group({ title, rows, loading }: { title: string; rows: Row[]; loading: boolean }) {
  return (
    <div className="tape-group">
      <div className="tape-group-head">
        <span className="tape-group-title">{title}</span>
        <span className="tape-group-cols">
          <span>Price</span>
          <span>24H</span>
        </span>
      </div>
      <div className="tape-rows">
        {loading
          ? Array.from({ length: title === "Crypto" ? 6 : title === "Equities" ? 4 : 3 }).map((_, i) => (
              <div className="tape-row tape-row-skel" key={i}>
                <span className="tape-name" />
                <span className="tape-price" />
                <span className="tape-chg" />
              </div>
            ))
          : rows.map((r) => {
              const up = r.changePct >= 0;
              return (
                <div className="tape-row" key={r.ticker}>
                  <span className="tape-name">
                    {r.name}
                    <span className="tape-ticker">{r.ticker}</span>
                  </span>
                  <span className="tape-price">${fmtPrice(r.price)}</span>
                  <span className={`tape-chg ${up ? "up" : "down"}`}>
                    {up ? "▲" : "▼"} {Math.abs(r.changePct).toFixed(2)}%
                  </span>
                </div>
              );
            })}
        {!loading && !rows.length && <div className="tape-empty">Awaiting data</div>}
      </div>
    </div>
  );
}

// "The Tape" — live markets as a print-style ledger (equities / crypto /
// commodities). Data from the hub /markets route; refreshes every 60s.
export function MarketTape() {
  const { hubHttpUrl } = useHub();
  const [data, setData] = useState<Tape | null>(null);

  useEffect(() => {
    if (!hubHttpUrl) return;
    let alive = true;
    const load = () =>
      fetch(`${hubHttpUrl}/markets`)
        .then((r) => r.json())
        .then((d) => alive && setData(d))
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [hubHttpUrl]);

  const loading = !data;

  return (
    <div className="tape">
      <div className="tape-masthead">
        <span className="tape-mast-kicker">The Tape</span>
        <span className="tape-mast-note">Live markets · refreshed each minute</span>
      </div>
      <div className="tape-grid">
        <Group title="Equities" rows={data?.equities || []} loading={loading} />
        <Group title="Crypto" rows={data?.crypto || []} loading={loading} />
        <Group title="Commodities" rows={data?.commodities || []} loading={loading} />
      </div>
    </div>
  );
}
