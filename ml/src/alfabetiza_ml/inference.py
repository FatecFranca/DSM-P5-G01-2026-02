from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from .preprocessing import preprocess_image


def infer_onnx(image: np.ndarray, artifact_dir: Path, uncertainty_threshold: float = 0.65) -> dict:
    """Executa o mesmo contrato consumido pelo mobile, para smoke tests em Python."""
    try:
        import onnxruntime as ort
    except ImportError as exc:
        raise RuntimeError("onnxruntime is required for ONNX inference") from exc
    manifest = json.loads((artifact_dir / "manifest.json").read_text(encoding="utf-8"))
    session = ort.InferenceSession(str(artifact_dir / manifest["export"]["path"]), providers=["CPUExecutionProvider"])
    values = preprocess_image(image).reshape(1, -1).astype(np.float32)
    label, probabilities = session.run(None, {session.get_inputs()[0].name: values})
    confidence = float(np.max(probabilities[0]))
    return {"className": str(label[0]), "confidence": confidence, "uncertain": confidence < uncertainty_threshold,
            "modelVersion": manifest["modelVersion"]}
