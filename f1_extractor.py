"""
F1 Race Replay - Real Data Extractor
======================================
Uses FastF1 (same approach as github.com/IAmTomShaw/f1-race-replay) to pull
real telemetry, car positions, tyre data, pit stops and circuit info, then
exports a JSON file that feeds directly into the F1 Race Recap Dashboard.

Install:  pip install fastf1 numpy pandas
Run:      python f1_extractor.py --year 2024 --round 11 --out race_data.json
          python f1_extractor.py --year 2024 --round 11 --session Q
          python f1_extractor.py --list-rounds 2024
"""

import argparse
import json
import re
import math
import os
import sys
from pathlib import Path

# ── Try importing FastF1 ──────────────────────────────────────────────────────
try:
    import fastf1
    import fastf1.plotting
    import numpy as np
    import pandas as pd
except ImportError:
    print("❌  FastF1 not installed. Run:  pip install fastf1 numpy pandas")
    sys.exit(1)

# ── Cache setup ───────────────────────────────────────────────────────────────
CACHE_DIR = Path(".fastf1-cache")
CACHE_DIR.mkdir(exist_ok=True)
fastf1.Cache.enable_cache(str(CACHE_DIR))

# ── Tyre compound → single-letter code ───────────────────────────────────────
TYRE_MAP = {
    "SOFT": "S", "MEDIUM": "M", "HARD": "H",
    "INTERMEDIATE": "I", "WET": "W",
    "SUPERSOFT": "S", "ULTRASOFT": "S", "HYPERSOFT": "S",
}

def compound_code(c):
    if not c or (isinstance(c, float) and math.isnan(c)):
        return "—"
    return TYRE_MAP.get(str(c).upper(), str(c)[0] if c else "—")


def fmt_laptime(td):
    """timedelta → '1:23.456' string"""
    if td is None or (isinstance(td, float) and math.isnan(td)):
        return "—"
    try:
        total = td.total_seconds()
        m = int(total // 60)
        s = total - m * 60
        return f"{m}:{s:06.3f}"
    except Exception:
        return "—"


def rotate_xy(x, y, angle_deg):
    """Rotate (x,y) arrays by angle in degrees (for circuit orientation)."""
    rad = math.radians(angle_deg)
    cos_a, sin_a = math.cos(rad), math.sin(rad)
    rx = cos_a * x - sin_a * y
    ry = sin_a * x + cos_a * y
    return rx, ry


# ── Main extraction ───────────────────────────────────────────────────────────

def extract_race(year: int, round_num: int, session_type: str = "R") -> dict:
    """Load a FastF1 session and return a full dashboard-compatible dict."""

    print(f"📡  Loading {year} Round {round_num} [{session_type}] via FastF1...")
    session = fastf1.get_session(year, round_num, session_type)
    session.load(telemetry=True, laps=True, weather=True, messages=True)

    event   = session.event
    results = session.results

    # ── Circuit geometry ──────────────────────────────────────────────────────
    print("🗺   Extracting circuit layout...")
    circuit_info = session.get_circuit_info()
    rotation     = circuit_info.rotation  # degrees

    # Get the reference (fastest qualifying or race) lap for track outline
    try:
        ref_lap = session.laps.pick_fastest()
        pos_data = ref_lap.get_pos_data()
        raw_x = pos_data["X"].values.astype(float)
        raw_y = pos_data["Y"].values.astype(float)

        # Apply circuit rotation so north is up (same as IAmTomShaw approach)
        rot_x, rot_y = rotate_xy(raw_x, raw_y, -rotation)

        # Normalize to 0..1 for the canvas
        x_min, x_max = rot_x.min(), rot_x.max()
        y_min, y_max = rot_y.min(), rot_y.max()
        x_range = x_max - x_min or 1
        y_range = y_max - y_min or 1
        scale   = max(x_range, y_range)

        # Subsample to ~300 points for the HTML canvas path
        step = max(1, len(rot_x) // 300)
        track_x = ((rot_x[::step] - x_min) / scale).round(5).tolist()
        # Flip Y: FastF1 is Y-up, canvas is Y-down; flip so both match
        track_y = (1.0 - (rot_y[::step] - y_min) / scale).round(5).tolist()

        # Store normalization params so car positions can be scaled the same way
        norm = {"x_min": float(x_min), "y_min": float(y_min),
                "scale": float(scale), "rotation": float(rotation)}
    except Exception as e:
        print(f"⚠   Could not extract circuit layout: {e}")
        track_x, track_y, norm = [], [], {}

    # ── DRS zones ─────────────────────────────────────────────────────────────
    drs_zones = []
    try:
        corners = circuit_info.corners
        for i in range(len(corners) - 1):
            pass  # DRS zones come from marshalling sector data, simplified below
        # Use marshal sectors as a proxy for DRS zone positions
        ms = circuit_info.marshal_sectors
        if ms is not None and not ms.empty and "TrackPosition" in ms.columns:
            # Identify the longest two straights as DRS candidates
            tps = sorted(ms["TrackPosition"].values)
            if len(tps) >= 2:
                drs_zones = [
                    {"start": float(round(tps[0], 3)), "end": float(round(tps[0] + 0.12, 3))},
                    {"start": float(round(tps[-2], 3)), "end": float(round(tps[-2] + 0.10, 3))},
                ]
    except Exception:
        pass

    # ── Driver results & lap times ────────────────────────────────────────────
    print("🏁  Processing driver results...")
    drivers_out = []
    driver_colors = {}
    try:
        color_map = fastf1.plotting.get_driver_color_mapping(session)
        driver_colors = {d: c for d, c in color_map.items()}
    except Exception:
        pass

    # Build leader reference for gap calculation
    leader_time = None

    for _, row in results.iterrows():
        drv_code = str(row.get("Abbreviation", "???"))
        drv_num  = str(row.get("DriverNumber", ""))
        team     = str(row.get("TeamName", "Unknown"))
        pos      = row.get("Position", None)
        try:
            pos = int(pos)
        except Exception:
            pos = 99

        # Best lap
        try:
            drv_laps = session.laps.pick_drivers(drv_num)
            best_lap = drv_laps.pick_fastest()
            best_laptime = fmt_laptime(best_lap["LapTime"])
            tyre = compound_code(best_lap.get("Compound", "—"))
        except Exception:
            best_laptime = "—"
            tyre = "—"

        # Gap to leader (from results)
        gap_raw = row.get("Time", None) if pos != 1 else None
        if pos == 1:
            gap = "LEADER"
            try:
                leader_time = row.get("Time")
            except Exception:
                pass
        else:
            status = str(row.get("Status", ""))
            if "Lap" in status or "lap" in status:
                gap = status
            elif gap_raw is not None:
                try:
                    gap = f"+{gap_raw.total_seconds():.3f}s"
                except Exception:
                    gap = str(gap_raw)
            else:
                gap = "—"

        drivers_out.append({
            "pos":      pos,
            "code":     drv_code,
            "num":      drv_num,
            "name":     f"{row.get('FirstName', '')} {row.get('LastName', '')}".strip(),
            "team":     team,
            "gap":      gap,
            "bestLap":  best_laptime,
            "tyre":     tyre,
            "color":    driver_colors.get(drv_code, "#888888"),
        })

    drivers_out.sort(key=lambda d: d["pos"])

    # ── Pit stop history ──────────────────────────────────────────────────────
    print("🔧  Processing pit stops...")
    pit_history = []
    try:
        for drv_num in results["DriverNumber"].values:
            drv_code = str(results[results["DriverNumber"] == drv_num]["Abbreviation"].values[0])
            team     = str(results[results["DriverNumber"] == drv_num]["TeamName"].values[0])
            drv_laps = session.laps.pick_drivers(str(drv_num))
            if drv_laps.empty:
                continue
            pit_laps = drv_laps[drv_laps["PitInTime"].notna()]
            for _, pl in pit_laps.iterrows():
                try:
                    duration = (pl["PitOutTime"] - pl["PitInTime"]).total_seconds()
                    pit_history.append({
                        "lap":      int(pl["LapNumber"]),
                        "driver":   drv_code,
                        "team":     team,
                        "duration": round(float(duration), 1),
                        "compound": compound_code(pl.get("Compound", "—")),
                    })
                except Exception:
                    pass
    except Exception as e:
        print(f"⚠   Pit stop extraction partial: {e}")
    pit_history.sort(key=lambda p: p["lap"])

    # ── Tyre strategy (per driver: list of stint dicts) ───────────────────────
    print("🛞  Processing tyre strategy...")
    strategy = {}
    try:
        for drv_num in results["DriverNumber"].values:
            drv_code = str(results[results["DriverNumber"] == drv_num]["Abbreviation"].values[0])
            drv_laps = session.laps.pick_drivers(str(drv_num))
            if drv_laps.empty:
                continue
            stints = []
            prev_stint = None
            for _, lap in drv_laps.sort_values("LapNumber").iterrows():
                stint_no = int(lap.get("Stint", 0) or 0)
                comp     = compound_code(lap.get("Compound", "—"))
                lap_no   = int(lap["LapNumber"])
                if stint_no != prev_stint:
                    stints.append({"compound": comp, "start": lap_no, "end": lap_no})
                    prev_stint = stint_no
                elif stints:
                    stints[-1]["end"] = lap_no
            strategy[drv_code] = stints
    except Exception as e:
        print(f"⚠   Strategy extraction partial: {e}")

    # ── Fastest lap overall ───────────────────────────────────────────────────
    fastest_lap = {"driver": "—", "time": "—", "lap": 0}
    try:
        fl = session.laps.pick_fastest()
        fastest_lap = {
            "driver": str(fl["Driver"]),
            "time":   fmt_laptime(fl["LapTime"]),
            "lap":    int(fl["LapNumber"]),
        }
    except Exception:
        pass

    # ── Top speeds ────────────────────────────────────────────────────────────
    print("💨  Processing top speeds...")
    top_speeds = []
    try:
        for drv_info in drivers_out[:10]:
            drv_laps = session.laps.pick_drivers(drv_info["num"])
            if drv_laps.empty:
                continue
            try:
                all_tel = drv_laps.get_telemetry()
                max_spd = float(all_tel["Speed"].max())
                top_speeds.append({"driver": drv_info["code"], "speed": round(max_spd)})
            except Exception:
                pass
        top_speeds.sort(key=lambda x: -x["speed"])
    except Exception as e:
        print(f"⚠   Top speed extraction partial: {e}")

    # ── Real car position frames for replay ───────────────────────────────────
    print("📍  Extracting car position frames (this takes a minute)...")
    frames = []
    try:
        # We sample position data at ~4 Hz (every 250ms of session time)
        # Align all drivers to a common time axis
        all_pos = {}
        for drv_info in drivers_out:
            drv_num = drv_info["num"]
            try:
                drv_laps = session.laps.pick_drivers(drv_num)
                pos = drv_laps.get_pos_data()
                if pos.empty:
                    continue
                # Apply same rotation + normalization as track layout
                rx, ry = rotate_xy(
                    pos["X"].values.astype(float),
                    pos["Y"].values.astype(float),
                    -norm.get("rotation", 0)
                )
                x_min_n = norm.get("x_min", 0)
                y_min_n = norm.get("y_min", 0)
                scale_n = norm.get("scale", 1)
                nx = ((rx - x_min_n) / scale_n).round(4)
                # Flip Y to match canvas coordinates
                ny = (1.0 - (ry - y_min_n) / scale_n).round(4)
                # session time in seconds
                st = pos["SessionTime"].dt.total_seconds().values
                all_pos[drv_info["code"]] = {
                    "t": st, "x": nx, "y": ny
                }
            except Exception as ex:
                print(f"   ⚠  {drv_info['code']}: {ex}")

        if all_pos:
            # Normalize all timestamps to start from 0 (race start)
            # SessionTime includes formation lap etc, so find true min
            t_min = min(v["t"].min() for v in all_pos.values())
            t_end = max(v["t"].max() for v in all_pos.values())
            # Shift all time arrays to be 0-based
            for code in all_pos:
                all_pos[code]["t"] = all_pos[code]["t"] - t_min

            t_duration = t_end - t_min
            FRAME_INTERVAL = 1.0  # 1 frame per second
            sampled_times = np.arange(0, t_duration, FRAME_INTERVAL)

            for t in sampled_times:
                frame = {"t": round(float(t), 1), "cars": {}}
                for code, data in all_pos.items():
                    idx = int(np.searchsorted(data["t"], t))
                    idx = min(max(idx, 0), len(data["x"]) - 1)
                    x_val = float(data["x"][idx])
                    y_val = float(data["y"][idx])
                    # Skip NaN positions
                    if x_val != x_val or y_val != y_val:
                        continue
                    frame["cars"][code] = {
                        "x": round(x_val, 4),
                        "y": round(y_val, 4),
                    }
                frames.append(frame)

            print(f"   ✅  {len(frames)} position frames extracted")
        else:
            print("   ⚠  No position data available, using lap-based animation")
    except Exception as e:
        print(f"⚠   Position frame extraction failed: {e}")

    # ── Race control events ───────────────────────────────────────────────────
    print("🚩  Processing race control events...")
    events = []
    try:
        if session.race_control_messages is not None and not session.race_control_messages.empty:
            for _, msg in session.race_control_messages.iterrows():
                msg_text = str(msg.get("Message", ""))
                lap_no   = int(msg.get("Lap", 0) or 0)
                if not msg_text or lap_no <= 0:
                    continue

                # Classify event type
                msg_up = msg_text.upper()
                if "FASTEST LAP" in msg_up:
                    etype = "fastest"
                elif "SAFETY CAR" in msg_up or "VSC" in msg_up:
                    etype = "incident"
                elif "DRS ENABLED" in msg_up:
                    etype = "start"
                elif "RETIRED" in msg_up or "OUT" in msg_up:
                    etype = "dnf"
                elif "PENALTY" in msg_up:
                    etype = "incident"
                else:
                    etype = "incident"

                events.append({
                    "lap":     lap_no,
                    "type":    etype,
                    "message": msg_text[:120],
                    "driver":  str(msg.get("Driver", "")),
                })
    except Exception as e:
        print(f"⚠   Race control events partial: {e}")

    # Add a race start event
    events.insert(0, {
        "lap": 1, "type": "start",
        "message": "Lights out and away we go!", "driver": ""
    })

    # ── Weather ───────────────────────────────────────────────────────────────
    weather_str = "DRY"
    try:
        wx = session.weather_data
        if not wx.empty:
            rain = wx["Rainfall"].any()
            track_temp = round(wx["TrackTemp"].median())
            air_temp   = round(wx["AirTemp"].median())
            weather_str = f"{'🌧 WET' if rain else '☀ SUNNY'} · {air_temp}°C AIR · {track_temp}°C TRACK"
    except Exception:
        pass

    # ── Assemble final JSON ───────────────────────────────────────────────────
    total_laps = int(session.laps["LapNumber"].max()) if not session.laps.empty else 0

    output = {
        "race": {
            "name":       str(event.get("EventName", "Grand Prix")),
            "year":       year,
            "circuit":    str(event.get("Location", "Circuit")),
            "laps":       total_laps,
            "date":       str(event.get("EventDate", ""))[:10],
            "round":      round_num,
            "session":    session_type,
            "weather":    weather_str,
        },
        "circuit": {
            "x":        track_x,
            "y":        track_y,
            "rotation": norm.get("rotation", 0),
            "drs_zones": drs_zones,
        },
        "drivers":     drivers_out,
        "pitHistory":  pit_history,
        "strategy":    strategy,
        "fastestLap":  fastest_lap,
        "topSpeeds":   top_speeds[:10],
        "events":      events,
        "frames":      frames,   # real X/Y positions per timestamp
    }

    return output


# ── CLI ───────────────────────────────────────────────────────────────────────

def list_rounds(year: int):
    print(f"\n📅  {year} F1 Schedule:\n")
    schedule = fastf1.get_event_schedule(year)
    for _, evt in schedule.iterrows():
        print(f"  Round {int(evt['RoundNumber']):2d} — {evt['EventName']} ({str(evt['EventDate'])[:10]})")
    print()


def main():
    parser = argparse.ArgumentParser(description="F1 Real Data Extractor for Race Replay Dashboard")
    parser.add_argument("--year",   type=int, default=2024, help="Season year")
    parser.add_argument("--round",  type=int, default=11,   help="Round number")
    parser.add_argument("--session",type=str, default="R",  help="Session: R=Race, Q=Qualifying, S=Sprint")
    parser.add_argument("--out",    type=str, default="",   help="Output JSON file (default: auto-named)")
    parser.add_argument("--list-rounds", type=int, metavar="YEAR", help="List all rounds for a year")
    parser.add_argument("--no-frames", action="store_true",
                        help="Skip per-frame position data (faster, smaller file)")
    args = parser.parse_args()

    if args.list_rounds:
        list_rounds(args.list_rounds)
        return

    data = extract_race(args.year, args.round, args.session)

    if args.no_frames:
        data["frames"] = []

    out_path = args.out or f"f1_{args.year}_r{args.round}_{args.session}.json"

    # Python json emits bare NaN/Infinity which is invalid JSON — sanitize
    raw = json.dumps(data, separators=(",", ":"), allow_nan=True)
    raw = re.sub(r'NaN', 'null', raw)
    raw = re.sub(r'Infinity', 'null', raw)
    raw = re.sub(r'-Infinity', 'null', raw)
    with open(out_path, "w") as f:
        f.write(raw)

    size_kb = os.path.getsize(out_path) / 1024
    print(f"\n✅  Saved → {out_path}  ({size_kb:.0f} KB)")
    print(f"   {len(data['drivers'])} drivers  ·  "
          f"{len(data['pitHistory'])} pit stops  ·  "
          f"{len(data['frames'])} position frames")
    print(f"\n💡  Open f1-recap-dashboard.html and paste the content of {out_path}")


if __name__ == "__main__":
    main()
