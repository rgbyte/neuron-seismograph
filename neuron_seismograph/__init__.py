"""
Neuron Seismograph: 3D Circuit Hunter & Activation Steering Observatory
Companion toolkit for `lyramakesmusic/neuron-explorer`.
"""

from .client import NeuronExplorerClient
from .hunter import hunt_circuit, scan_transcript_seismograph
from .metrics import score_reply

__all__ = [
    "NeuronExplorerClient",
    "hunt_circuit",
    "scan_transcript_seismograph",
    "score_reply",
]
__version__ = "0.2.0"
