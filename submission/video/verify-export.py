"""Independently decode and check the completed Namma Civic export.

Run only after the render process has reported success:
    python verify-export.py --render-complete
No composition, capture, narration, or MP4 input is modified.
"""

from __future__ import annotations

import argparse
from array import array
from datetime import datetime, timezone
from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys
import uuid

from PIL import Image, ImageDraw, ImageFont, ImageStat


ROOT = Path(__file__).resolve().parent
REVIEW_ROOT = ROOT / "output" / "final-review"
FFMPEG = ROOT / "runtime" / "ffmpeg-9.0.2-essentials_build" / "bin" / "ffmpeg.exe"
FFPROBE = FFMPEG.with_name("ffprobe.exe")
EXPECTED_SECONDS = 215.0
EXPECTED_FPS = 24
EXPECTED_FRAMES = 5160
SCENES = [
    {"id": "01-problem", "start": 0.0, "end": 18.0, "voice_start": 0.4, "voice_duration": 15.2795},
    {"id": "02-introduction", "start": 18.0, "end": 32.0, "voice_start": 18.4, "voice_duration": 12.9471},
    {"id": "03-capture", "start": 32.0, "end": 67.0, "voice_start": 32.4, "voice_duration": 27.9945},
    {"id": "04-community", "start": 67.0, "end": 98.0, "voice_start": 67.4, "voice_duration": 21.4545},
    {"id": "05-accountability", "start": 98.0, "end": 131.0, "voice_start": 98.4, "voice_duration": 29.4495},
    {"id": "06-google", "start": 131.0, "end": 183.0, "voice_start": 131.4, "voice_duration": 47.4184},
    {"id": "07-next", "start": 183.0, "end": 204.0, "voice_start": 183.4, "voice_duration": 19.5195},
    {"id": "08-team", "start": 204.0, "end": 215.0, "voice_start": 204.4, "voice_duration": 9.6068},
]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def invoke(args: list[str], stderr_path: Path, timeout: int = 600) -> bytes:
    result = subprocess.run(args, capture_output=True, timeout=timeout, check=False)
    stderr_path.write_bytes(result.stderr)
    if result.returncode != 0:
        raise RuntimeError(f"{Path(args[0]).name} exited {result.returncode}; see {stderr_path.name}")
    if result.stderr.strip():
        raise RuntimeError(f"Decoder reported errors; see {stderr_path.name}")
    return result.stdout


def number(value: object, default: float = 0.0) -> float:
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def rate(value: object) -> float:
    try:
        return float(Fraction(str(value)))
    except (ValueError, ZeroDivisionError):
        return 0.0


def amplitude(samples: array, sample_rate: int) -> dict:
    if not samples:
        return {"samples": 0, "rms_dbfs": -120.0, "peak_dbfs": -120.0, "nonzero_fraction": 0.0, "active_window_fraction": 0.0}
    peak = max(abs(value) for value in samples)
    rms = math.sqrt(sum(value * value for value in samples) / len(samples))
    window = max(1, sample_rate // 4)
    window_rms = []
    for index in range(0, len(samples), window):
        block = samples[index:index + window]
        window_rms.append(math.sqrt(sum(value * value for value in block) / len(block)))
    db = lambda value: 20.0 * math.log10(value / 32768.0) if value else -120.0
    active = sum(db(value) > -50.0 for value in window_rms)
    return {
        "samples": len(samples),
        "seconds": round(len(samples) / sample_rate, 4),
        "rms_dbfs": round(db(rms), 3),
        "peak_dbfs": round(db(peak), 3),
        "nonzero_fraction": round(sum(value != 0 for value in samples) / len(samples), 5),
        "clipped_sample_fraction": round(sum(abs(value) >= 32760 for value in samples) / len(samples), 7),
        "active_window_fraction": round(active / len(window_rms), 5),
        "window_ms": 250,
        "active_window_threshold_dbfs": -50.0,
    }


def frame_schedule(fps: float) -> list[dict]:
    records = []
    for scene in SCENES:
        points = {
            "start": round(scene["start"] * fps),
            "midpoint": round((scene["start"] + scene["end"]) * fps / 2),
            "end": round(scene["end"] * fps) - 1,
        }
        for position, frame in points.items():
            records.append({
                "scene": scene["id"], "position": position, "frame": frame,
                "seconds": round(frame / fps, 6),
                "file": f"{scene['id']}-{position}-{frame:06d}.png",
            })
    return sorted(records, key=lambda item: item["frame"])


def make_contact_sheet(run_dir: Path, frames: list[dict]) -> Path:
    tile_width, tile_height, label_height = 480, 270, 52
    columns = 4
    rows = math.ceil(len(frames) / columns)
    sheet = Image.new("RGB", (columns * tile_width, rows * (tile_height + label_height)), "#e5e5e5")
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 18)
    except OSError:
        font = ImageFont.load_default()
    for index, frame in enumerate(frames):
        x = (index % columns) * tile_width
        y = (index // columns) * (tile_height + label_height)
        with Image.open(run_dir / frame["file"]) as image:
            image = image.convert("RGB").resize((tile_width, tile_height), Image.Resampling.LANCZOS)
            sheet.paste(image, (x, y))
        draw.rectangle((x, y + tile_height, x + tile_width, y + tile_height + label_height), fill="#17212b")
        draw.text((x + 10, y + tile_height + 5), f"{frame['scene']} | {frame['position']}", fill="white", font=font)
        draw.text((x + 10, y + tile_height + 28), f"{frame['seconds']:.3f}s | decoded frame {frame['frame']}", fill="white", font=font)
    destination = run_dir / "decoded-contact-sheet.jpg"
    sheet.save(destination, quality=94, subsampling=0)
    return destination


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=ROOT / "output" / "Namma-Civic-Tri-Fusion-Demo.mp4")
    parser.add_argument("--render-complete", action="store_true", help="Explicitly attest that the render process finished successfully.")
    options = parser.parse_args()
    if not options.render_complete:
        parser.error("Wait for the parent render-complete signal, then pass --render-complete.")
    source = options.input.resolve(strict=True)
    if source.suffix.lower() != ".mp4":
        parser.error("The input must be the completed MP4 export.")
    for executable in (FFMPEG, FFPROBE):
        if not executable.is_file():
            parser.error(f"Required bundled tool is missing: {executable}")
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_dir = REVIEW_ROOT / f"run-{stamp}-{uuid.uuid4().hex[:6]}"
    run_dir.mkdir(parents=True, exist_ok=False)
    initial_stat = source.stat()
    report = {
        "input": str(source), "started_at_utc": stamp, "input_bytes": initial_stat.st_size,
        "expected": {"duration_seconds": EXPECTED_SECONDS, "fps": EXPECTED_FPS, "frames": EXPECTED_FRAMES, "width": 1920, "height": 1080},
        "checks": [], "warnings": [], "manual_visual_review": "pending", "artifacts": {},
    }

    def check(name: str, passed: bool, observed: object) -> None:
        report["checks"].append({"name": name, "passed": bool(passed), "observed": observed})

    try:
        check("nontrivial_file", initial_stat.st_size >= 1024 * 1024, initial_stat.st_size)
        report["input_sha256"] = sha256(source)
        print("Probing and counting every decoded video frame...", flush=True)
        probe_bytes = invoke([
            str(FFPROBE), "-v", "error", "-threads", "2", "-count_frames",
            "-show_format", "-show_streams", "-of", "json", str(source),
        ], run_dir / "ffprobe-errors.txt")
        (run_dir / "ffprobe.json").write_bytes(probe_bytes)
        probe = json.loads(probe_bytes)
        videos = [stream for stream in probe.get("streams", []) if stream.get("codec_type") == "video"]
        audios = [stream for stream in probe.get("streams", []) if stream.get("codec_type") == "audio"]
        check("one_video_stream", len(videos) == 1, len(videos))
        check("audio_stream_present", bool(audios), len(audios))
        if len(videos) != 1 or not audios:
            raise RuntimeError("Required video/audio stream missing; cannot decode review artifacts.")
        video, audio = videos[0], audios[0]
        duration = number(probe.get("format", {}).get("duration"))
        fps = rate(video.get("avg_frame_rate"))
        frame_count = int(video.get("nb_read_frames", 0))
        check("duration_between_3_and_4_minutes", 180 <= duration <= 240, duration)
        check("duration_matches_215_seconds", abs(duration - EXPECTED_SECONDS) <= 0.15, duration)
        check("full_hd_dimensions", (video.get("width"), video.get("height")) == (1920, 1080), [video.get("width"), video.get("height")])
        check("h264_video", video.get("codec_name") == "h264", video.get("codec_name"))
        check("aac_audio", audio.get("codec_name") == "aac", audio.get("codec_name"))
        check("expected_24_fps", abs(fps - EXPECTED_FPS) <= 0.001, video.get("avg_frame_rate"))
        check("expected_decoded_frame_count", abs(frame_count - EXPECTED_FRAMES) <= 2, frame_count)
        check("frame_count_matches_duration", abs(frame_count - duration * fps) <= 3, {"frames": frame_count, "duration_x_fps": duration * fps})
        last_voice_end = max(scene["voice_start"] + scene["voice_duration"] for scene in SCENES)
        check("audio_covers_final_narration", number(audio.get("duration")) >= last_voice_end - 0.15, audio.get("duration"))
        if abs(fps - EXPECTED_FPS) > 0.001 or frame_count < EXPECTED_FRAMES - 2:
            raise RuntimeError("Unexpected frame timing; stop instead of mislabelling decoded frames.")

        print("Extracting scene starts, midpoints, and final frames from the MP4...", flush=True)
        frames = frame_schedule(fps)
        selection = "+".join(f"eq(n\\,{item['frame']})" for item in frames)
        invoke([
            str(FFMPEG), "-hide_banner", "-loglevel", "error", "-threads", "2", "-i", str(source),
            "-map", "0:v:0", "-an", "-vf", f"select={selection}", "-fps_mode", "vfr",
            "-frames:v", str(len(frames)), "-compression_level", "3", str(run_dir / "decoded-%03d.png"),
        ], run_dir / "frame-decode-errors.txt")
        for index, frame in enumerate(frames, 1):
            decoded = run_dir / f"decoded-{index:03d}.png"
            if not decoded.is_file():
                raise RuntimeError(f"Missing decoded review frame {index}.")
            destination = run_dir / frame["file"]
            decoded.rename(destination)
            with Image.open(destination) as image:
                check(f"frame_dimensions:{frame['file']}", image.size == (1920, 1080), list(image.size))
                luminance = image.convert("L")
                stats = ImageStat.Stat(luminance)
                frame["luminance_mean"] = round(stats.mean[0], 3)
                frame["luminance_stddev"] = round(stats.stddev[0], 3)
                frame["near_blank"] = stats.stddev[0] < 1.0 or stats.mean[0] < 2.0
            frame["sha256"] = sha256(destination)
            if frame["near_blank"]:
                report["warnings"].append(f"Visually inspect near-blank {frame['position']} frame: {frame['file']}")
                if frame["position"] == "midpoint":
                    check(f"nonblank_midpoint:{frame['scene']}", False, frame["file"])
        write_json(run_dir / "decoded-frames.json", frames)
        contact = make_contact_sheet(run_dir, frames)
        report["artifacts"].update({"ffprobe": "ffprobe.json", "decoded_frames": "decoded-frames.json", "contact_sheet": contact.name})
        midpoint_hashes = [frame["sha256"] for frame in frames if frame["position"] == "midpoint"]
        check("distinct_scene_midpoints", len(set(midpoint_hashes)) == len(SCENES), len(set(midpoint_hashes)))

        print("Decoding audio and measuring every narrated scene...", flush=True)
        sample_rate = 16000
        pcm_bytes = invoke([
            str(FFMPEG), "-hide_banner", "-loglevel", "error", "-threads", "2", "-i", str(source),
            "-map", "0:a:0", "-vn", "-ac", "1", "-ar", str(sample_rate), "-f", "s16le", "pipe:1",
        ], run_dir / "audio-decode-errors.txt")
        pcm = array("h")
        pcm.frombytes(pcm_bytes[:len(pcm_bytes) - len(pcm_bytes) % 2])
        if sys.byteorder != "little":
            pcm.byteswap()
        global_audio = amplitude(pcm, sample_rate)
        audio_report = {"sample_rate": sample_rate, "channels_measured": 1, "global": global_audio, "narrated_scenes": []}
        check("audio_is_not_all_zero", global_audio["nonzero_fraction"] > 0.01, global_audio)
        for scene in SCENES:
            start = round(scene["voice_start"] * sample_rate)
            end = round((scene["voice_start"] + scene["voice_duration"]) * sample_rate)
            metrics = amplitude(pcm[start:end], sample_rate)
            audible = metrics["rms_dbfs"] > -50 and metrics["peak_dbfs"] > -35 and metrics["active_window_fraction"] >= 0.20
            audio_report["narrated_scenes"].append({"scene": scene["id"], "start": scene["voice_start"], "end": end / sample_rate, "audible": audible, **metrics})
            check(f"audible_narration:{scene['id']}", audible, metrics)
        if global_audio.get("clipped_sample_fraction", 0) > 0.005:
            report["warnings"].append("More than 0.5% of decoded audio samples approach full scale; listen for clipping.")
        write_json(run_dir / "audio-analysis.json", audio_report)
        report["artifacts"]["audio_analysis"] = "audio-analysis.json"
        final_stat = source.stat()
        check("input_unchanged_during_review", (initial_stat.st_size, initial_stat.st_mtime_ns) == (final_stat.st_size, final_stat.st_mtime_ns) and report["input_sha256"] == sha256(source), {"bytes": final_stat.st_size, "modified_ns": final_stat.st_mtime_ns})
    except Exception as error:
        check("validator_execution", False, f"{type(error).__name__}: {error}")
    report["automated_checks_passed"] = all(item["passed"] for item in report["checks"])
    report["completed_at_utc"] = datetime.now(timezone.utc).isoformat()
    write_json(run_dir / "validation.json", report)
    write_json(REVIEW_ROOT / "latest.json", {"run_directory": str(run_dir), "report": str(run_dir / "validation.json"), "automated_checks_passed": report["automated_checks_passed"], "manual_visual_review": "pending"})
    summary = [
        "# Independent MP4 export validation", "",
        f"Automated checks: {'PASS' if report['automated_checks_passed'] else 'FAIL'}.",
        "Manual visual review remains pending until the decoded PNGs are inspected.", "",
        f"Input SHA-256: `{report.get('input_sha256', 'unavailable')}`.",
        "No browser or composition snapshot was used as export evidence.", "",
        "Content truth must be checked manually: screenshots demonstrate the public device sandbox; they do not establish live Google deployment or model verification.", "",
    ]
    for item in report["checks"]:
        if not item["passed"]:
            summary.append(f"- FAIL {item['name']}: {item['observed']}")
    for warning in report["warnings"]:
        summary.append(f"- Warning: {warning}")
    (run_dir / "summary.md").write_text("\n".join(summary) + "\n", encoding="utf-8")
    print(json.dumps({"automated_checks_passed": report["automated_checks_passed"], "manual_visual_review": "pending", "run_directory": str(run_dir)}, indent=2), flush=True)
    return 0 if report["automated_checks_passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
