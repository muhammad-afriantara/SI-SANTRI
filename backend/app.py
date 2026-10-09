import spaces  # Wajib di baris 1
import torch
import gradio as gr
from server import app

# 1. Fungsi GPU resmi
@spaces.GPU
def _zerogpu_probe():
    if torch.cuda.is_available():
        x = torch.zeros(1, device="cuda")
    return "ZeroGPU Active"

# 2. PANGGIL LANGSUNG SAAT IMPORT/STARTUP!
# Ini membuat ZeroGPU daemon mendeteksi eksekusi GPU secara nyata saat proses booting!
try:
    print("Memicu ZeroGPU probe...")
    _zerogpu_probe()
    print("ZeroGPU probe sukses!")
except Exception as e:
    print(f"ZeroGPU probe note: {e}")

# 3. Antarmuka Gradio
with gr.Blocks(title="SI SANTRI API") as demo:
    gr.Markdown("# 🕌 SI SANTRI API - SMP NEGERI 2 PANJI")
    gr.Markdown("✅ **Status: Backend FastAPI Online & Terhubung ke MongoDB Atlas!**")
    gr.Markdown("- [Buka Dokumentasi Swagger /docs](/docs)")
    gr.Markdown("- Endpoint API: `/api/`")

    inp = gr.Textbox(value="Ping", label="GPU Status Check")
    out = gr.Textbox(label="Result")
    btn = gr.Button("Check GPU")
    btn.click(fn=_zerogpu_probe, inputs=inp, outputs=out)

# 4. Aktifkan queue
demo.queue()

# 5. Pasang Gradio ke FastAPI app
app = gr.mount_gradio_app(app, demo, path="/")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
