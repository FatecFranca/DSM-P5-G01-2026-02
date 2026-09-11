from __future__ import annotations

import numpy as np

LETTERS = tuple("ABCDEFGHIJKLMNOPQRSTUVWXYZ")


def make_demo_dataset(writers: int = 12, samples_per_letter: int = 3, size: int = 16, seed: int = 20260910):
    """Gera dados sintéticos apenas para CI/demonstração, nunca para promoção."""
    rng = np.random.default_rng(seed)
    prototypes = rng.uniform(0, 1, (len(LETTERS), size, size)) > 0.78
    rows, labels, writer_ids = [], [], []
    for writer in range(writers):
        shift = (writer % 3 - 1, (writer // 3) % 3 - 1)
        for label_index, label in enumerate(LETTERS):
            for _ in range(samples_per_letter):
                image = np.roll(prototypes[label_index], shift, axis=(0, 1)).astype(np.float32)
                flips = rng.random((size, size)) < 0.025
                rows.append(np.logical_xor(image > 0, flips).astype(np.float32))
                labels.append(label)
                writer_ids.append(f"demo-writer-{writer:02d}")
    return np.stack(rows), np.asarray(labels), np.asarray(writer_ids)
