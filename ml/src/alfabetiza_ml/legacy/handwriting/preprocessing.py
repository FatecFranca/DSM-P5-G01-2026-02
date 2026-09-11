from __future__ import annotations

import numpy as np
from PIL import Image, ImageOps


def preprocess_image(image: np.ndarray | Image.Image, size: int = 16) -> np.ndarray:
    """Normaliza fundo, orientação EXIF, escala, centralização e espessura.

    A saída tem traço branco (1) em fundo preto (0), formato ``size x size``.
    """
    if isinstance(image, Image.Image):
        image = ImageOps.exif_transpose(image)
    values = np.asarray(image)
    if values.ndim == 3:
        values = values[..., :3].mean(axis=2)
    if values.ndim != 2 or values.size == 0:
        raise ValueError("image must be a non-empty 2D or RGB array")
    values = values.astype(np.float32)
    peak = float(values.max())
    if peak > 1:
        values /= 255.0
    values = np.clip(values, 0, 1)
    # Bordas representam o fundo; inverte imagens com fundo claro.
    border = np.concatenate((values[0], values[-1], values[:, 0], values[:, -1]))
    if float(np.median(border)) > 0.5:
        values = 1.0 - values
    mask = values > 0.15
    if not mask.any():
        return np.zeros((size, size), dtype=np.float32)
    ys, xs = np.where(mask)
    crop = values[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]
    inner = max(1, size - 4)
    scale = min(inner / crop.shape[1], inner / crop.shape[0])
    target = (max(1, round(crop.shape[1] * scale)), max(1, round(crop.shape[0] * scale)))
    pil = Image.fromarray(np.uint8(crop * 255), mode="L").resize(target, Image.Resampling.BILINEAR)
    # MaxFilter estabiliza traços muito finos sem alterar o canvas final.
    if min(target) >= 3:
        pil = pil.filter(__import__("PIL.ImageFilter", fromlist=["MaxFilter"]).MaxFilter(3))
    canvas = Image.new("L", (size, size), 0)
    canvas.paste(pil, ((size - target[0]) // 2, (size - target[1]) // 2))
    return np.asarray(canvas, dtype=np.float32) / 255.0


def flatten_images(images: np.ndarray, size: int = 16) -> np.ndarray:
    return np.stack([preprocess_image(image, size).reshape(-1) for image in images])
