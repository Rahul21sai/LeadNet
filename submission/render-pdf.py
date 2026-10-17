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
pages = [render_dir / f"slide-{index:02d}.png" for index in range(1, count + 1)]
for page in pages:
    if not page.is_file():
        raise FileNotFoundError(page)

pdf = canvas.Canvas(str(output), pagesize=(720, 405), pageCompression=1)
pdf.setTitle("LeadNet - AI Builder Cup - Review snapshot")
pdf.setAuthor("LeadNet")
pdf.setSubject("Template-based review deck. Team details, screenshots, public links and live evaluation remain pending.")
for page in pages:
    image = Image.open(page).convert("RGB")
    encoded = io.BytesIO()
    image.save(encoded, format="JPEG", quality=92, optimize=True, subsampling=0)
    encoded.seek(0)
    pdf.drawImage(ImageReader(encoded), 0, 0, width=720, height=405)
    pdf.showPage()
pdf.save()
reader = PdfReader(output)
assert len(reader.pages) == count
assert all(abs(float(page.mediabox.width) - 720) < .01 and abs(float(page.mediabox.height) - 405) < .01 for page in reader.pages)
assert output.stat().st_size < 5_000_000, "Submission PDF exceeds the 5 MB portal limit"
report = {"pages": count, "bytes": output.stat().st_size, "under5MB": True,
          "pageSizePt": [720, 405], "source": "Actual final artifact-tool slide renders",
          "pdfType": "Image pages; editable text and shapes remain in the PPTX",
          "textCompanion": "content.md"}
output.with_suffix(".pdf.validation.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report))
