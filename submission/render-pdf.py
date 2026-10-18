"""Assemble actual artifact-tool slide renders; the PPTX remains editable."""
import io
import json
import pathlib
import sys
from PIL import Image
from pypdf import PdfReader
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

render_dir = pathlib.Path(sys.argv[1]).resolve()
output = pathlib.Path(sys.argv[2]).resolve()
count = int(sys.argv[3])
source_dir = pathlib.Path(__file__).resolve().parent
team = json.loads((source_dir / "team.json").read_text(encoding="utf-8"))
status = json.loads((source_dir / "status.json").read_text(encoding="utf-8"))
pages = [render_dir / f"slide-{index:02d}.png" for index in range(1, count + 1)]
for page in pages:
    if not page.is_file():
        raise FileNotFoundError(page)

pdf = canvas.Canvas(str(output), pagesize=(720, 405), pageCompression=1)
pdf.setTitle("Namma Civic - AI Builder Cup - Review snapshot")
pdf.setAuthor(team["registeredTeamName"])
pdf.setSubject(f"{team['problemStatementSelection']}. Namma Civic by {team['registeredTeamName']}. Firebase Hosting Spark device demo live 18 October 2026: {status['productUrl']} Billing disabled. Connected backend, Cloud Run and live Gemini unavailable. Video URL and selected screenshots remain pending.")
pdf.setKeywords(f"Namma Civic; AI Builder Cup; {team['problemStatementSelection']}; Challenge: {team['challengeDescription']}; Project problem: {team['projectProblemStatement']}")
for page_index, page in enumerate(pages, start=1):
    image = Image.open(page).convert("RGB")
    encoded = io.BytesIO()
    image.save(encoded, format="JPEG", quality=92, optimize=True, subsampling=0)
    encoded.seek(0)
    pdf.drawImage(ImageReader(encoded), 0, 0, width=720, height=405)
    if page_index == 13:
        for row, url in enumerate([status.get("repositoryUrl"), status.get("videoUrl"), status.get("productUrl")]):
            if url:
                top = 155 + row * 96 + 38
                pdf.linkURL(url, (39, (540 - top - 42) * .75, 676.5, (540 - top) * .75), relative=0, thickness=0)
    pdf.showPage()
pdf.save()
reader = PdfReader(output)
assert len(reader.pages) == count
assert all(abs(float(page.mediabox.width) - 720) < .01 and abs(float(page.mediabox.height) - 405) < .01 for page in reader.pages)
assert output.stat().st_size < 5_000_000, "Submission PDF exceeds the 5 MB portal limit"
link_uris = [str(annotation.get_object().get("/A", {}).get("/URI", ""))
             for annotation in reader.pages[12].get("/Annots", [])]
assert status["productUrl"] in link_uris, "The Firebase product link must be clickable"
report = {"pages": count, "bytes": output.stat().st_size, "under5MB": True,
          "pageSizePt": [720, 405], "source": "Actual final artifact-tool slide renders",
          "pdfType": "Image pages; editable text and shapes remain in the PPTX",
          "textCompanion": "content.md", "problemStatementSelection": team["problemStatementSelection"],
          "productUrl": status["productUrl"], "cloudStatus": status["cloudStatus"],
          "linksSlide": 13, "clickableLinkUris": link_uris}
output.with_suffix(".pdf.validation.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report))
